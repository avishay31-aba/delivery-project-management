import { expect, test, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { openHash, readSystemSnapshot, businessLinks, hrefRoute } from '../helpers/ris-certification'

const seedPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/data/seed.json')
const fixturePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/ris-run2-document.txt')
const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8')) as {
  reusedInternalSystems?: Array<{ machineId?: string; purpose?: string }>
  systems?: Array<{ id: string; sid?: string; source?: string; machineId?: string }>
  tenants?: Array<{ tid?: string; systemId?: string; hostedSystemId?: string; operationalStatus?: string }>
  projectSystems?: Array<{ systemId?: string; sourceMachineId?: string | null; allocationStatus?: string }>
  activityEvents?: Array<{ primaryObject?: { objectType?: string; businessId?: string } }>
}

function seedMidsForPurpose(purpose: string): string[] {
  return (seed.reusedInternalSystems ?? [])
    .filter((system) => String(system.purpose ?? '').toLocaleLowerCase() === purpose.toLocaleLowerCase())
    .map((system) => String(system.machineId ?? ''))
    .filter(Boolean)
}

function productionSystemWithAtLeastTwoTenants(): { sid: string; tids: [string, string] } {
  for (const system of seed.systems ?? []) {
    if (system.source && system.source !== 'Production') continue
    const tids = (seed.tenants ?? [])
      .filter((tenant) =>
        (tenant.hostedSystemId === system.id || tenant.systemId === system.id) &&
        !String(tenant.operationalStatus ?? '').toLocaleLowerCase().includes('deleted') &&
        !String(tenant.operationalStatus ?? '').toLocaleLowerCase().includes('cancel'),
      )
      .map((tenant) => String(tenant.tid ?? ''))
      .filter(Boolean)
    if (system.sid && tids.length >= 2) return { sid: system.sid, tids: [tids[0], tids[1]] }
  }
  throw new Error('Expected seed data to contain a Production System with at least two active Tenants.')
}

function activeTenantIdFromSeed(): string {
  const tid = (seed.tenants ?? []).find((tenant) =>
    tenant.tid &&
    !String(tenant.operationalStatus ?? '').toLocaleLowerCase().includes('deleted') &&
    !String(tenant.operationalStatus ?? '').toLocaleLowerCase().includes('cancel'),
  )?.tid
  expect(tid).toMatch(/^T\d{6}$/)
  return tid!
}

async function activeRisPair(page: Page): Promise<{ mid: string; sid: string }> {
  await openHash(page, '/systems')
  const links = await businessLinks(page)
  const sid = links.find((link) => /^S\d{6}$/.test(link.text))?.text
  const mid = links.find((link) => /^M\d{6}$/.test(link.text))?.text
  expect(sid, 'allocated systems dashboard should expose active SID').toBeTruthy()
  expect(mid, 'allocated systems dashboard should expose active MID').toBeTruthy()
  return { mid: mid!, sid: sid! }
}

function historicalRisPairFromSeed(): { mid: string; sid: string } {
  const historicalLink = (seed.projectSystems ?? []).find((link) =>
    link.allocationStatus === 'DEALLOCATED' &&
    /^M?\d+$/i.test(String(link.sourceMachineId ?? '')),
  )
  const historicalSystem = (seed.systems ?? []).find((system) => system.id === historicalLink?.systemId)
  const sourceMachineId = String(historicalLink?.sourceMachineId ?? historicalSystem?.machineId ?? '')
  const normalized = sourceMachineId.replace(/^M/i, '').padStart(6, '0')
  const mid = `M${normalized}`
  const sid = String(historicalSystem?.sid ?? '')
  expect(mid).toMatch(/^M\d{6}$/)
  expect(sid).toMatch(/^S\d{6}$/)
  return { mid, sid }
}

function productionSidWithLinkedProjectsFromSeed(): string {
  const linkedSystemIds = new Set((seed.projectSystems ?? []).map((link) => link.systemId).filter(Boolean))
  const sid = (seed.systems ?? []).find((system) =>
    system.source === 'Production' &&
    system.sid &&
    linkedSystemIds.has(system.id),
  )?.sid
  expect(sid).toMatch(/^S\d{6}$/)
  return sid!
}

function projectWithActivityFromSeed(): string {
  const pid = (seed.activityEvents ?? []).find((event) =>
    event.primaryObject?.objectType === 'Project' &&
    /^P\d{6}$/.test(String(event.primaryObject.businessId ?? '')),
  )?.primaryObject?.businessId
  expect(pid).toMatch(/^P\d{6}$/)
  return pid!
}

let machineSequence = 0

async function createMid(page: Page): Promise<string> {
  machineSequence += 1
  const machineId = String(930000 + machineSequence)
  const mid = `M${machineId}`
  await openHash(page, '/systems/reused-internal/new?mode=edit')
  await page.locator('label').filter({ hasText: /^MID/ }).locator('input').first().fill(machineId)
  await applyChanges(page)
  await expect(page.locator('body')).toContainText(`MID ${mid}`)
  return mid
}

async function purposeSelect(page: Page) {
  return page.locator('label').filter({ hasText: /^Purpose/ }).locator('select').first()
}

async function dateInput(page: Page, label: string) {
  return page.locator('label').filter({ hasText: new RegExp(`^${label}`) }).locator('input').first()
}

async function ensureSystemEditMode(page: Page) {
  const editButton = page.getByRole('button', { name: 'Edit' }).first()
  if (await editButton.isVisible().catch(() => false)) {
    await editButton.click()
    await page.waitForTimeout(500)
  }
}

async function applyChanges(page: Page) {
  await page.getByLabel('More save actions').click()
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await page.waitForTimeout(700)
}

async function applyTenantChanges(page: Page) {
  await page.locator('main').getByRole('button', { name: 'Save', exact: true }).click()
  await page.waitForTimeout(900)
}

async function addTenantButton(page: Page) {
  await page.getByRole('button', { name: /^Tenant$/ }).click()
  return page.getByRole('button', { name: 'Add Tenant' }).first()
}

async function createInternalTenant(page: Page) {
  const before = tenantIdsFromText(await page.locator('body').innerText())
  const addTenant = await addTenantButton(page)
  await expect(addTenant).toBeEnabled()
  await addTenant.click()
  await page.getByRole('button', { name: 'Create Tenant' }).click()
  await page.waitForTimeout(900)
  const after = tenantIdsFromText(await page.locator('body').innerText())
  return after.find((tid) => !before.includes(tid)) ?? after[0] ?? ''
}

function rgbIsGreyish(rgb: string) {
  const values = rgb.match(/\d+/g)?.slice(0, 3).map(Number) ?? []
  if (values.length < 3) return false
  return Math.max(...values) - Math.min(...values) < 12
}

async function actionStyle(page: Page, buttonName: string | RegExp) {
  const button = page.getByRole('button', { name: buttonName }).first()
  await expect(button).toBeVisible()
  return button.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      fontWeight: style.fontWeight,
      paddingLeft: style.paddingLeft,
      paddingTop: style.paddingTop,
    }
  })
}

function expectMatchingActionStyle(actual: Awaited<ReturnType<typeof actionStyle>>, expected: Awaited<ReturnType<typeof actionStyle>>) {
  expect(actual.color).toBe(expected.color)
  expect(actual.backgroundColor).toBe(expected.backgroundColor)
  expect(actual.borderColor).toBe(expected.borderColor)
  expect(actual.fontWeight).toBe(expected.fontWeight)
  expect(actual.paddingLeft).toBe(expected.paddingLeft)
  expect(actual.paddingTop).toBe(expected.paddingTop)
}

function tenantIdsFromText(text: string): string[] {
  return Array.from(new Set(text.match(/\bT\d{6}\b/g) ?? []))
}

async function tableRowsByHeader(page: Page, tableLocator: ReturnType<Page['locator']>) {
  void page
  const headers = await tableLocator.locator('thead th').evaluateAll((headers) =>
    headers.map((header) => (header.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
  return tableLocator.locator('tbody tr').evaluateAll((rows, headers) =>
    rows.map((row) => {
      const values = Array.from(row.querySelectorAll('td')).map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim())
      return Object.fromEntries((headers as string[]).map((header, index) => [header, values[index] ?? '']))
    }),
  headers)
}

async function tableRowsInSection(page: Page, heading: string) {
  const section = page.getByRole('heading', { name: heading }).first().locator('xpath=ancestor::section[1]')
  return tableRowsByHeader(page, section.locator('table').first())
}

async function clickTableHeaderInSection(page: Page, heading: string, header: string | RegExp) {
  const section = page.getByRole('heading', { name: heading }).first().locator('xpath=ancestor::section[1]')
  await section.locator('table').first().getByRole('button', { name: header }).click()
}

async function tableRowsInTabPanel(page: Page, tab: string) {
  return tableRowsByHeader(page, page.getByRole('tabpanel', { name: tab }).locator('table').first())
}

async function systemSummary(page: Page) {
  const rows = await tableRowsByHeader(page, page.getByRole('table', { name: 'System Application Configuration Summary' }))
  return rows[0] ?? {}
}

async function configurationHistoryRows(page: Page) {
  const heading = page.getByRole('heading', { name: 'Configuration History' }).first()
  const table = heading.locator('xpath=ancestor::section[1]').locator('table').first()
  return tableRowsByHeader(page, table)
}

function valueFor(row: Record<string, string>, label: string) {
  const key = Object.keys(row).find((candidate) => candidate === label || candidate.startsWith(`${label} `) || candidate.includes(label))
  return key ? row[key] : ''
}

async function setTenantConfiguration(page: Page, values: { users: number; licenses: number }) {
  await page.getByRole('button', { name: 'Tenant Configuration' }).click()
  const table = page.getByRole('table', { name: 'Tenant Application Configuration' })
  const headers = await table.locator('thead th').evaluateAll((headers) =>
    headers.map((header) => (header.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
  async function fillColumn(label: string, value: number) {
    const index = headers.findIndex((header) => header === label || header.startsWith(`${label} `) || header.includes(label))
    expect(index, `${label} column should exist`).toBeGreaterThanOrEqual(0)
    await table.locator('tbody tr').first().locator('td').nth(index).locator('input').fill(String(value))
  }
  await fillColumn('Users', values.users)
  await fillColumn('License', values.licenses)
  await fillColumn('Concurrent Searches', 0)
  await fillColumn('Concurrent Analyses', 0)
  await fillColumn('Tangles', 1)
  await applyTenantChanges(page)
}

async function latestSystemConfigurationHistoryRow(page: Page, systemRoute: string) {
  await openHash(page, `${systemRoute}?mode=view`)
  await page.getByRole('button', { name: 'Tenant' }).click()
  const summary = await systemSummary(page)
  await page.getByRole('button', { name: 'Platform' }).click()
  const history = await configurationHistoryRows(page)
  expect(history.length).toBeGreaterThan(0)
  return { summary, latest: history[0], history }
}

async function openSystemLinkedProjectsTab(page: Page, route: string) {
  await openHash(page, `${route}?mode=view`)
  await page.getByRole('button', { name: 'Linked Projects' }).click()
  return businessLinks(page)
}

async function platformYesNoValue(page: Page, label: string) {
  await page.getByRole('button', { name: 'Platform' }).click()
  const checked = page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator('input[type="radio"]:checked')
    .first()
  await expect(checked).toHaveCount(1)
  return checked.inputValue()
}

async function addRemark(page: Page, content: string) {
  await page.getByRole('button', { name: 'Add Remark' }).click()
  await page.locator('.ProseMirror').last().fill(content)
  await page.getByRole('button', { name: /^Save$/ }).last().click()
  await expect(page.locator('body')).toContainText(content)
}

async function createSchedulerVersionUpgrade(page: Page, sequence: number) {
  const suffix = `${Date.now()}-${sequence}`
  const versionLabel = `RIS-MANUAL-QA-${suffix}`
  const buildLabel = `RIS-MANUAL-QA-${suffix}.001`
  await openHash(page, '/version-upgrades/new')
  await page.locator('label').filter({ hasText: /^Version Number/ }).locator('input').fill(versionLabel)
  await page.locator('label').filter({ hasText: /^Build Number/ }).locator('input').fill(buildLabel)
  await page.locator('label').filter({ hasText: /^Release Date/ }).locator('input').fill('2026-10-21')
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await expect(page.locator('body')).toContainText('Version Upgrade record saved.')
  await expect(page.locator('body')).toContainText(versionLabel)
  await expect(page.locator('body')).toContainText(buildLabel)
  return { versionLabel, buildLabel }
}

async function addVersionUpdate(page: Page, scheduler: { versionLabel: string; buildLabel: string }) {
  await page.getByRole('button', { name: 'Add Version' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  const versionSelect = page.locator('#version-update-versionNumber')
  const buildSelect = page.locator('#version-update-buildNumber')
  await versionSelect.selectOption({ label: scheduler.versionLabel })
  await buildSelect.selectOption({ label: scheduler.buildLabel })
  await page.locator('#version-update-CONFIG').setInputFiles(fixturePath)
  await page.locator('#version-update-ATP').setInputFiles(fixturePath)
  await page.locator('#version-update-CHECKLIST').setInputFiles(fixturePath)
  await dialog.getByRole('button', { name: /^Save$/ }).click()
  await expect(dialog).toHaveCount(0)
  await page.waitForTimeout(1100)
}

function idsFromRows(rows: Array<Record<string, string>>) {
  return rows.map((row) => row.ID).filter(Boolean)
}

function expectIdsDescending(ids: string[]) {
  const sorted = [...ids].sort((first, second) => second.localeCompare(first, undefined, { numeric: true, sensitivity: 'base' }))
  expect(ids).toEqual(sorted)
}

function expectIdsAscending(ids: string[]) {
  const sorted = [...ids].sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
  expect(ids).toEqual(sorted)
}

test.describe('RIS manual QA corrections browser regression', () => {
  test('System Linked Projects renders separate SID and MID business links for active and historical RIS allocations', async ({ page, context }) => {
    const { mid, sid } = await activeRisPair(page)
    await openSystemLinkedProjectsTab(page, `/systems/${sid}`)
    await expect(page.getByRole('columnheader', { name: /Allocated Systems/ })).toHaveCount(0)

    const activeMidLinks = await openSystemLinkedProjectsTab(page, `/systems/reused-internal/${mid}`)
    await expect(page.getByRole('columnheader', { name: /Allocated Systems/ })).toHaveCount(1)
    const activeSidLink = activeMidLinks.find((link) => link.text === sid)
    const activeMidLink = activeMidLinks.find((link) => link.text === mid)
    expect(activeSidLink?.href).toBeTruthy()
    expect(activeMidLink?.href).toBeTruthy()
    expect(activeSidLink?.href).not.toBe(activeMidLink?.href)
    expect(hrefRoute(activeSidLink?.href)).toBe(`/systems/${sid}?mode=view`)
    expect(hrefRoute(activeMidLink?.href)).toBe(`/systems/reused-internal/${mid}?mode=view`)

    await page.locator(`a[href="#/systems/reused-internal/${mid}?mode=view"]`).first().click()
    await page.waitForTimeout(500)
    await expect(page.locator('body')).toContainText(`MID ${mid}`)
    await page.reload({ waitUntil: 'networkidle' })
    await expect(page.locator('body')).toContainText(`MID ${mid}`)

    await openSystemLinkedProjectsTab(page, `/systems/reused-internal/${mid}`)
    const [sidPopup] = await Promise.all([
      context.waitForEvent('page'),
      page.locator(`a[href="#/systems/${sid}?mode=view"]`).first().click({ modifiers: ['Control'] }),
    ])
    await sidPopup.waitForLoadState('networkidle')
    await expect(sidPopup.locator('body')).toContainText(`SID ${sid}`)
    await sidPopup.close()

    const historical = historicalRisPairFromSeed()
    await openSystemLinkedProjectsTab(page, `/systems/${historical.sid}`)
    await expect(page.getByRole('columnheader', { name: /Allocated Systems/ })).toHaveCount(0)
    const historicalLinks = await openSystemLinkedProjectsTab(page, `/systems/reused-internal/${historical.mid}`)
    const historicalSidLink = historicalLinks.find((link) => link.text === historical.sid)
    const historicalMidLink = historicalLinks.find((link) => link.text === historical.mid)
    expect(hrefRoute(historicalSidLink?.href)).toBe(`/systems/${historical.sid}?mode=view`)
    expect(hrefRoute(historicalMidLink?.href)).toBe(`/systems/reused-internal/${historical.mid}?mode=view`)

    await openSystemLinkedProjectsTab(page, `/systems/${productionSidWithLinkedProjectsFromSeed()}`)
    await expect(page.getByRole('columnheader', { name: /Allocated Systems/ })).toHaveCount(0)
  })

  test('Version Updates and representative record tables default newest first and support header sorting', async ({ page }) => {
    const demoMid = seedMidsForPurpose('Demo')[0]
    expect(demoMid).toBeTruthy()
    const schedulerRecords = [
      await createSchedulerVersionUpgrade(page, 1),
      await createSchedulerVersionUpgrade(page, 2),
      await createSchedulerVersionUpgrade(page, 3),
    ]
    await openHash(page, `/systems/reused-internal/${demoMid}?mode=edit`)
    await page.getByRole('button', { name: 'Version update' }).click()
    await addVersionUpdate(page, schedulerRecords[0])
    await addVersionUpdate(page, schedulerRecords[1])
    await addVersionUpdate(page, schedulerRecords[2])

    let rows = await tableRowsInSection(page, 'Version Updates')
    expect(rows.length).toBeGreaterThanOrEqual(3)
    expectIdsDescending(idsFromRows(rows).slice(0, 3))

    await clickTableHeaderInSection(page, 'Version Updates', /Creation Date/)
    rows = await tableRowsInSection(page, 'Version Updates')
    expectIdsAscending(idsFromRows(rows).slice(0, 3))

    await clickTableHeaderInSection(page, 'Version Updates', /Creation Date/)
    rows = await tableRowsInSection(page, 'Version Updates')
    expectIdsDescending(idsFromRows(rows).slice(0, 3))

    await page.reload({ waitUntil: 'networkidle' })
    await page.getByRole('button', { name: 'Version update' }).click()
    rows = await tableRowsInSection(page, 'Version Updates')
    expectIdsDescending(idsFromRows(rows).slice(0, 3))

    await clickTableHeaderInSection(page, 'Version Updates', /^ID$/)
    rows = await tableRowsInSection(page, 'Version Updates')
    expectIdsAscending(idsFromRows(rows).slice(0, 3))

    await page.getByRole('button', { name: 'Documents' }).click()
    await page.getByTestId('documents-upload-input').setInputFiles(fixturePath)
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: /Uploaded At/ })).toBeVisible()

    await openHash(page, `/projects/${projectWithActivityFromSeed()}?mode=view`)
    await page.getByRole('button', { name: 'Activity Log' }).click()
    const activityRows = await tableRowsInTabPanel(page, 'Activity Log')
    expect(activityRows.length).toBeGreaterThan(0)
    expect(activityRows[0]['Activity ID']).toMatch(/^ACT\d{6}$/)
  })

  test('RIS purpose availability, manual occupation defaults, Add Tenant eligibility, and action styling', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })
    const noneMids = seedMidsForPurpose('None')
    expect(noneMids.length).toBeGreaterThanOrEqual(4)
    const noneMid = noneMids[0]
    await openHash(page, `/systems/reused-internal/${noneMid}?mode=edit`)

    let snapshot = await readSystemSnapshot(page)
    expect(snapshot.fields.Purpose).toBe('None')
    expect(snapshot.fields['Availability Status']).toBe('Available')
    let addTenant = await addTenantButton(page)
    await expect(addTenant).toBeDisabled()
    const disabledStyle = await addTenant.evaluate((element) => getComputedStyle(element).color)
    expect(rgbIsGreyish(disabledStyle), `disabled Add Tenant should look disabled; color=${disabledStyle}`).toBeTruthy()

    for (const purpose of ['Demo', 'Training', 'Support']) {
      const manualMid = noneMids[['Demo', 'Training', 'Support'].indexOf(purpose) + 1]
      await openHash(page, `/systems/reused-internal/${manualMid}?mode=edit`)
      await (await purposeSelect(page)).selectOption(purpose)
      const startDate = await dateInput(page, 'Occupation Start Date')
      await expect(startDate).toHaveValue(new Date().toISOString().slice(0, 10))
      await expect(startDate).toBeEditable()
      await startDate.fill('2026-01-15')
      await (await dateInput(page, 'Occupation End Date')).fill('2026-12-31')
      await applyChanges(page)
      await openHash(page, `/systems/reused-internal/${manualMid}?mode=edit`)
      await ensureSystemEditMode(page)
      await expect(await dateInput(page, 'Occupation Start Date')).toHaveValue('2026-01-15')
      await expect(await dateInput(page, 'Occupation Start Date')).toBeEditable()
      await (await dateInput(page, 'Occupation End Date')).fill('2027-01-31')
      await applyChanges(page)
      await openHash(page, `/systems/reused-internal/${manualMid}?mode=edit`)
      await ensureSystemEditMode(page)
      await expect(await dateInput(page, 'Occupation Start Date')).toHaveValue('2026-01-15')
      await openHash(page, `/systems/reused-internal/${manualMid}?mode=view`)
      snapshot = await readSystemSnapshot(page)
      expect(snapshot.fields.Purpose).toBe(purpose)
      expect(snapshot.fields['Availability Status']).toBe('Occupied')
      expect(snapshot.fields['Occupation Start Date']).toContain('2026')
      await openHash(page, `/systems/reused-internal/${manualMid}?mode=edit`)
      addTenant = await addTenantButton(page)
      await expect(addTenant).toBeEnabled()
      const enabledStyle = await addTenant.evaluate((element) => getComputedStyle(element).color)
      expect(rgbIsGreyish(enabledStyle), `enabled Add Tenant should not look disabled; color=${enabledStyle}`).toBeFalsy()
    }

    const obsoleteMid = noneMids[4] ?? await createMid(page)
    await openHash(page, `/systems/reused-internal/${obsoleteMid}?mode=edit`)
    await (await purposeSelect(page)).selectOption('OBSOLETE')
    await applyChanges(page)
    await openHash(page, `/systems/reused-internal/${obsoleteMid}?mode=view`)
    snapshot = await readSystemSnapshot(page)
    expect(snapshot.fields.Purpose).toBe('OBSOLETE')
    expect(snapshot.fields['Availability Status']).toBe('Occupied')
    await openHash(page, `/systems/reused-internal/${obsoleteMid}?mode=edit`)
    addTenant = await addTenantButton(page)
    await expect(addTenant).toBeDisabled()
  })

  test('generic form action buttons share enabled and disabled visual states across major modules', async ({ page }) => {
    const { mid } = await activeRisPair(page)
    await openHash(page, `/systems/reused-internal/${mid}?mode=view`)
    const reference = await actionStyle(page, 'Add Remark')

    await page.getByRole('button', { name: 'Documents' }).click()
    expectMatchingActionStyle(await actionStyle(page, 'Upload'), reference)

    const demoMid = seedMidsForPurpose('Demo')[0]
    await openHash(page, `/systems/reused-internal/${demoMid}?mode=edit`)
    await page.getByRole('button', { name: 'Version update' }).click()
    expectMatchingActionStyle(await actionStyle(page, 'Add Version'), reference)

    await openHash(page, `/tenants/${activeTenantIdFromSeed()}?mode=edit`)
    expectMatchingActionStyle(await actionStyle(page, 'Add warranty'), reference)
  })

  test('Tenant creation writes generic configuration history with TID aggregate snapshot and POC local artifacts remain editable', async ({ page }) => {
    const demoMid = seedMidsForPurpose('Demo')[0]
    expect(demoMid).toBeTruthy()
    await openHash(page, `/systems/reused-internal/${demoMid}?mode=edit`)
    await createInternalTenant(page)
    const midBody = await page.locator('body').innerText()
    const tid = midBody.match(/\bT\d{6}\b/)?.[0]
    expect(tid, 'created tenant TID should render in browser').toBeTruthy()
    expect(midBody).toContain('Configuration History')
    expect(midBody).toContain(tid!)
    expect(midBody).not.toContain(`TID\n${demoMid}`)

    const { mid, sid } = await activeRisPair(page)
    const midRemark = `active MID local remark ${Date.now()}`
    await openHash(page, `/systems/reused-internal/${mid}?mode=view`)
    await page.getByRole('button', { name: 'Documents' }).click()
    await expect(page.getByTestId('documents-upload-button')).toBeEnabled()
    await page.getByTestId('documents-upload-input').setInputFiles(fixturePath)
    await expect(page.locator('body')).toContainText('ris-run2-document.txt')
    await expect(page.getByRole('button', { name: 'Add Remark' })).toBeEnabled()
    await addRemark(page, midRemark)
    await openHash(page, `/systems/reused-internal/${mid}?mode=view`)
    await expect(page.locator('body')).toContainText(midRemark)
    await openHash(page, `/systems/${sid}?mode=view`)
    await expect(page.locator('body')).not.toContainText(midRemark)

    await openHash(page, `/systems/${sid}?mode=edit`)
    await createInternalTenant(page)
    const sidBody = await page.locator('body').innerText()
    const sidTid = sidBody.match(/\bT\d{6}\b/)?.[0]
    expect(sidTid, 'SID-created tenant TID should render in browser').toBeTruthy()
    expect(sidBody).toContain('Configuration History')
    expect(sidBody).toContain(sidTid!)
  })

  test('Configuration History stores aggregate current System snapshot with triggering TID for RIS and Production', async ({ page }) => {
    const demoMid = seedMidsForPurpose('Demo')[0]
    expect(demoMid).toBeTruthy()
    await openHash(page, `/systems/reused-internal/${demoMid}?mode=edit`)
    const risTidA = await createInternalTenant(page)
    const risTidB = await createInternalTenant(page)
    expect(risTidA).toMatch(/^T\d{6}$/)
    expect(risTidB).toMatch(/^T\d{6}$/)
    expect(risTidB).not.toBe(risTidA)

    await openHash(page, `/tenants/${risTidA}?mode=edit`)
    await setTenantConfiguration(page, { users: 10, licenses: 4 })
    await openHash(page, `/tenants/${risTidB}?mode=edit`)
    await setTenantConfiguration(page, { users: 15, licenses: 6 })
    const risSnapshotAfterB = await latestSystemConfigurationHistoryRow(page, `/systems/reused-internal/${demoMid}`)
    expect(valueFor(risSnapshotAfterB.summary, 'Users')).toBe('25')
    expect(valueFor(risSnapshotAfterB.summary, 'License')).toBe('10')
    expect(valueFor(risSnapshotAfterB.latest, 'TID')).toContain(risTidB)
    expect(valueFor(risSnapshotAfterB.latest, 'Users')).toBe('25')
    expect(valueFor(risSnapshotAfterB.latest, 'License')).toBe('10')
    const risBRecordId = valueFor(risSnapshotAfterB.latest, 'Record ID')

    await openHash(page, `/tenants/${risTidA}?mode=edit`)
    await setTenantConfiguration(page, { users: 11, licenses: 4 })
    const risSnapshotAfterLaterA = await latestSystemConfigurationHistoryRow(page, `/systems/reused-internal/${demoMid}`)
    expect(valueFor(risSnapshotAfterLaterA.latest, 'TID')).toContain(risTidA)
    expect(valueFor(risSnapshotAfterLaterA.latest, 'Users')).toBe('26')
    const retainedRisBRecord = risSnapshotAfterLaterA.history.find((row) => valueFor(row, 'Record ID') === risBRecordId)
    expect(retainedRisBRecord, 'RIS prior Configuration History snapshot should remain present').toBeTruthy()
    expect(valueFor(retainedRisBRecord!, 'TID')).toContain(risTidB)
    expect(valueFor(retainedRisBRecord!, 'Users')).toBe('25')
    expect(valueFor(retainedRisBRecord!, 'License')).toBe('10')

    const production = productionSystemWithAtLeastTwoTenants()
    const [prodTidA, prodTidB] = production.tids
    await openHash(page, `/tenants/${prodTidA}?mode=edit`)
    await setTenantConfiguration(page, { users: 101, licenses: 40 })
    await openHash(page, `/tenants/${prodTidB}?mode=edit`)
    await setTenantConfiguration(page, { users: 102, licenses: 41 })
    const productionSnapshotAfterB = await latestSystemConfigurationHistoryRow(page, `/systems/${production.sid}`)
    expect(valueFor(productionSnapshotAfterB.summary, 'Users')).toBe('203')
    expect(valueFor(productionSnapshotAfterB.summary, 'License')).toBe('81')
    expect(valueFor(productionSnapshotAfterB.latest, 'TID')).toContain(prodTidB)
    expect(valueFor(productionSnapshotAfterB.latest, 'Users')).toBe('203')
    expect(valueFor(productionSnapshotAfterB.latest, 'License')).toBe('81')
    const productionBRecordId = valueFor(productionSnapshotAfterB.latest, 'Record ID')

    await openHash(page, `/tenants/${prodTidA}?mode=edit`)
    await setTenantConfiguration(page, { users: 103, licenses: 40 })
    const productionSnapshotAfterLaterA = await latestSystemConfigurationHistoryRow(page, `/systems/${production.sid}`)
    expect(valueFor(productionSnapshotAfterLaterA.latest, 'TID')).toContain(prodTidA)
    expect(valueFor(productionSnapshotAfterLaterA.latest, 'Users')).toBe('205')
    const retainedProductionBRecord = productionSnapshotAfterLaterA.history.find((row) => valueFor(row, 'Record ID') === productionBRecordId)
    expect(retainedProductionBRecord, 'Production prior Configuration History snapshot should remain present').toBeTruthy()
    expect(valueFor(retainedProductionBRecord!, 'TID')).toContain(prodTidB)
    expect(valueFor(retainedProductionBRecord!, 'Users')).toBe('203')
    expect(valueFor(retainedProductionBRecord!, 'License')).toBe('81')
    await page.goto('about:blank')
  })

  test('active SID synchronizes operational status icon, platform, and product to MID while preserving identity', async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept()
    })
    const { mid, sid } = await activeRisPair(page)
    await openHash(page, `/systems/${sid}?mode=edit`)
    const product = page.locator('label').filter({ hasText: /^Product/ }).locator('select').first()
    const currentProduct = await product.inputValue()
    const productOptions = await product.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean))
    const nextProduct = productOptions.find((option) => option !== currentProduct) ?? currentProduct
    await product.selectOption(nextProduct)
    const usedInRegion = page.locator('label').filter({ hasText: /^Used In Region/ }).locator('select').first()
    const currentRegion = await usedInRegion.inputValue()
    const regionOptions = await usedInRegion.locator('option').evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value).filter(Boolean))
    const nextRegion = regionOptions.find((option) => option !== currentRegion) ?? currentRegion
    if (nextRegion) await usedInRegion.selectOption(nextRegion)
    await page.getByRole('button', { name: 'Platform' }).click()
    const ipRestriction = page.locator('label').filter({ hasText: /^IP Restriction/ }).locator('input[type="radio"]').first()
    const ipRestrictionOptions = await page.locator('label').filter({ hasText: /^IP Restriction/ }).locator('input[type="radio"]').evaluateAll((inputs) =>
      inputs.map((input) => ({
        value: (input as HTMLInputElement).value,
        checked: (input as HTMLInputElement).checked,
      })),
    )
    const currentIpRestriction = ipRestrictionOptions.find((option) => option.checked)?.value ?? ''
    const nextIpRestriction = currentIpRestriction === 'YES' ? 'NO' : 'YES'
    if (await ipRestriction.count()) {
      await page.locator('label').filter({ hasText: /^IP Restriction/ }).locator(`input[type="radio"][value="${nextIpRestriction}"]`).check()
    }
    await applyChanges(page)

    await openHash(page, `/systems/${sid}?mode=view`)
    const sidSnapshot = await readSystemSnapshot(page)
    await openHash(page, `/systems/reused-internal/${mid}?mode=view`)
    const midSnapshot = await readSystemSnapshot(page)
    expect(midSnapshot.title).toBe(`MID ${mid}`)
    expect(sidSnapshot.fields.Product).toBe(nextProduct)
    expect(midSnapshot.fields.Product).toBe(nextProduct)
    expect(sidSnapshot.fields['Used in Region'] || sidSnapshot.fields['Used In Region']).toBe(nextRegion)
    expect(midSnapshot.fields['Used in Region'] || midSnapshot.fields['Used In Region']).toBe(nextRegion)
    await openHash(page, `/systems/${sid}?mode=edit`)
    expect(await platformYesNoValue(page, 'IP Restriction')).toBe(nextIpRestriction)
    await openHash(page, `/systems/reused-internal/${mid}?mode=view`)
    expect(await platformYesNoValue(page, 'IP Restriction')).toBe(nextIpRestriction)
    await page.getByRole('button', { name: 'Activity Log' }).click()
    await expect(page.locator('body')).toContainText(`Automatically synchronized from active SID ${sid}`)
    await expect(page.locator('body')).toContainText('IP Restriction')
    await expect(page.locator('label').filter({ hasText: /^Operational Status/ }).locator('svg').first()).toBeVisible()
  })
})
