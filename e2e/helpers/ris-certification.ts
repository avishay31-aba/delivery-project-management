import { expect, type Page, type TestInfo } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

export type QaStatus = 'PASS' | 'FAIL' | 'BLOCKED' | 'N/A'

export interface QaEvidence {
  state?: string
  form?: string
  fieldOrTab?: string
  expected?: string
  actual?: string
  generatedIds?: Record<string, string>
  url?: string
  screenshot?: string
  trace?: string
  consoleErrors?: string[]
  notes?: string
}

export interface QaResult extends QaEvidence {
  rule: string
  status: QaStatus
}

export interface QaDefect extends QaResult {
  id: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  steps: string[]
  likelyArea?: string
}

export class RisQaRun {
  readonly results: QaResult[] = []
  readonly defects: QaDefect[] = []
  readonly consoleErrors: string[] = []
  private defectSequence = 1

  constructor(private readonly page: Page, private readonly testInfo: TestInfo) {
    page.on('console', (message) => {
      if (message.type() === 'error') this.consoleErrors.push(message.text())
    })
    page.on('pageerror', (error) => this.consoleErrors.push(error.message))
  }

  pass(rule: string, evidence: QaEvidence = {}) {
    this.results.push({ rule, status: 'PASS', ...evidence, url: evidence.url ?? this.page.url() })
    console.log(`PASS ${rule}`)
  }

  blocked(rule: string, evidence: QaEvidence = {}) {
    this.results.push({ rule, status: 'BLOCKED', ...evidence, url: evidence.url ?? this.page.url() })
    console.log(`BLOCKED ${rule}: ${evidence.actual ?? evidence.notes ?? ''}`)
  }

  notApplicable(rule: string, evidence: QaEvidence = {}) {
    this.results.push({ rule, status: 'N/A', ...evidence, url: evidence.url ?? this.page.url() })
    console.log(`N/A ${rule}: ${evidence.actual ?? evidence.notes ?? ''}`)
  }

  async fail(
    rule: string,
    severity: QaDefect['severity'],
    evidence: QaEvidence,
    steps: string[],
    likelyArea?: string,
  ) {
    const id = `RIS-E2E-${String(this.defectSequence++).padStart(3, '0')}`
    const screenshot = await this.capture(`${id}.png`)
    const defect: QaDefect = {
      id,
      rule,
      status: 'FAIL',
      severity,
      ...evidence,
      url: evidence.url ?? this.page.url(),
      screenshot,
      consoleErrors: [...this.consoleErrors],
      steps,
      likelyArea,
    }
    this.defects.push(defect)
    this.results.push(defect)
    console.log(`FAIL ${rule}`)
    console.log(`     Expected: ${evidence.expected ?? '-'}`)
    console.log(`     Actual:   ${evidence.actual ?? '-'}`)
  }

  async check(
    condition: boolean,
    rule: string,
    severity: QaDefect['severity'],
    evidence: QaEvidence,
    steps: string[],
    likelyArea?: string,
  ) {
    if (condition) {
      this.pass(rule, evidence)
      return
    }
    await this.fail(rule, severity, evidence, steps, likelyArea)
  }

  async attachReport() {
    const report = {
      generatedAt: new Date().toISOString(),
      browser: this.testInfo.project.name,
      statusCounts: this.results.reduce<Record<QaStatus, number>>(
        (counts, result) => {
          counts[result.status] += 1
          return counts
        },
        { PASS: 0, FAIL: 0, BLOCKED: 0, 'N/A': 0 },
      ),
      results: this.results,
      defects: this.defects,
      consoleErrors: this.consoleErrors,
    }
    const json = JSON.stringify(report, null, 2)
    const markdown = this.toMarkdown(report)
    const reportDir = this.testInfo.outputPath('ris-certification-report')
    fs.mkdirSync(reportDir, { recursive: true })
    const jsonPath = path.join(reportDir, 'report.json')
    const mdPath = path.join(reportDir, 'report.md')
    fs.writeFileSync(jsonPath, json)
    fs.writeFileSync(mdPath, markdown)
    await this.testInfo.attach('RIS certification report JSON', { path: jsonPath, contentType: 'application/json' })
    await this.testInfo.attach('RIS certification report Markdown', { path: mdPath, contentType: 'text/markdown' })
    return { jsonPath, mdPath, report }
  }

  assertNoFailures() {
    expect.soft(this.defects, `${this.defects.length} RIS browser QA defect(s) discovered`).toHaveLength(0)
  }

  private async capture(name: string) {
    const filePath = this.testInfo.outputPath(name)
    await this.page.screenshot({ path: filePath, fullPage: true })
    return filePath
  }

  private toMarkdown(report: {
    generatedAt: string
    browser: string
    statusCounts: Record<QaStatus, number>
    results: QaResult[]
    defects: QaDefect[]
    consoleErrors: string[]
  }) {
    const rows = report.results.map((result) =>
      `| ${escapeCell(result.state ?? '')} | ${escapeCell(result.form ?? '')} | ${escapeCell(result.fieldOrTab ?? result.rule)} | ${result.status} | ${escapeCell(result.expected ?? '')} | ${escapeCell(result.actual ?? '')} |`,
    )
    const defectRows = report.defects.map((defect) =>
      `| ${defect.id} | ${defect.severity} | ${escapeCell(defect.rule)} | ${escapeCell(defect.expected ?? '')} | ${escapeCell(defect.actual ?? '')} | ${escapeCell(defect.url ?? '')} | ${escapeCell(defect.screenshot ?? '')} |`,
    )
    return [
      '# RIS Browser Certification Report',
      '',
      `Generated: ${report.generatedAt}`,
      `Browser: ${report.browser}`,
      `Counts: PASS ${report.statusCounts.PASS}, FAIL ${report.statusCounts.FAIL}, BLOCKED ${report.statusCounts.BLOCKED}, N/A ${report.statusCounts['N/A']}`,
      '',
      '## Results',
      '',
      '| State | Form | Field/Tab/Rule | Status | Expected | Actual |',
      '|---|---|---|---|---|---|',
      ...rows,
      '',
      '## Defects',
      '',
      '| Defect | Severity | Rule | Expected | Actual | URL | Screenshot |',
      '|---|---|---|---|---|---|---|',
      ...(defectRows.length ? defectRows : ['| - | - | No defects recorded | - | - | - | - |']),
      '',
      '## Console Errors',
      '',
      ...(report.consoleErrors.length ? report.consoleErrors.map((error) => `- ${error}`) : ['- None']),
      '',
    ].join('\n')
  }
}

export interface HeaderSnapshot {
  title: string
  fields: Record<string, string>
  tabs: string[]
  url: string
  body: string
  controls: Array<{
    tag: string
    text: string
    aria: string
    value: string
    disabled: boolean
    readOnly?: boolean
  }>
}

const HEADER_FIELDS = [
  'MID',
  'Purpose',
  'Availability Status',
  'Operational Status',
  'Alerts',
  'Product',
  'Logo',
  'Number of Tenants',
  'Current Version',
  'Current Build',
  'Cognito Region',
  'Used in Region',
  'Time Group',
  'Time Group Alert',
  'Current SID',
  'Occupation Start Date',
  'Occupation End Date',
  'Cancel System',
]

const HEADER_FIELD_ALIASES = new Map(
  HEADER_FIELDS.flatMap((field) => [
    [normalizeLabel(field), field],
    [normalizeLabel(field.replace(' in ', ' In ')), field],
  ]),
)

const SYSTEM_TABS = ['Tenant', 'Platform', 'Version update', 'Linked Projects', 'Usage', 'Documents', 'Owner', 'Activity Log']

export async function gotoApp(page: Page, path: string) {
  await page.goto(path.startsWith('http') ? path : `${path}`, { waitUntil: 'networkidle' })
  await page.waitForLoadState('networkidle')
}

export async function openHash(page: Page, hashPath: string) {
  await page.goto(`/#${hashPath.startsWith('/') ? hashPath : `/${hashPath}`}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(500)
}

export async function readSystemSnapshot(page: Page): Promise<HeaderSnapshot> {
  const body = await page.locator('body').innerText()
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  const title = lines.find((line) => /^(MID|SID) [MS]\d{6}$/.test(line)) ?? ''
  const headerStart = lines.findIndex((line) => line === 'System header')
  const tabsStart = lines.findIndex((line) => line === 'System tabs')
  const headerLines = headerStart >= 0 && tabsStart > headerStart ? lines.slice(headerStart, tabsStart) : lines
  const fields: Record<string, string> = {}
  headerLines.forEach((line, index) => {
    const field = HEADER_FIELD_ALIASES.get(normalizeLabel(line))
    if (field && !fields[field]) fields[field] = headerLines[index + 1] ?? ''
  })
  const tabs = SYSTEM_TABS.filter((tab) => lines.includes(tab))
  const controls = await page.locator('input,select,textarea,button').evaluateAll((elements) =>
    elements.map((element) => ({
      tag: element.tagName,
      text: element.textContent?.trim() ?? '',
      aria: element.getAttribute('aria-label') ?? '',
      value: 'value' in element ? String((element as HTMLInputElement).value ?? '') : '',
      disabled: (element as HTMLInputElement).disabled,
      readOnly: 'readOnly' in element ? (element as HTMLInputElement).readOnly : undefined,
    })),
  )
  return { title, fields, tabs, url: page.url(), body, controls }
}

export async function clickEditIfPresent(page: Page) {
  const edit = page.getByLabel('Edit').first()
  if (await edit.count()) {
    await edit.click()
    await page.waitForTimeout(300)
  }
}

export function hrefRoute(href: string | null | undefined) {
  if (!href) return ''
  const hashIndex = href.indexOf('#')
  return hashIndex >= 0 ? href.slice(hashIndex + 1) : href
}

export async function businessLinks(page: Page) {
  return page.locator('a').evaluateAll((anchors) =>
    anchors
      .map((anchor) => ({
        text: anchor.textContent?.trim() ?? '',
        href: anchor.getAttribute('href') ?? '',
      }))
      .filter((link) => link.text),
  )
}

export async function setRecordsPerPageAll(page: Page) {
  const selector = page.locator('select[aria-label="Records per page"]').first()
  if (!(await selector.count())) return false
  await selector.selectOption('all')
  await page.waitForTimeout(500)
  return true
}

export function escapeCell(value: string) {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function normalizeLabel(value: string) {
  return value.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase()
}
