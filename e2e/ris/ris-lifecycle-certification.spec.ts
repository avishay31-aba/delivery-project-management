import { expect, test, type BrowserContext, type Dialog, type Locator, type Page } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  businessLinks,
  clickEditIfPresent,
  hrefRoute,
  openHash,
  readSystemSnapshot,
  RisQaRun,
} from '../helpers/ris-certification'

interface GeneratedLifecycleIds {
  runId: string
  opportunityId: string
  projectId: string
  requirementId: string
  mid: string
  sid1: string
  tid1?: string
  sharedProjectId?: string
  sharedRequirementId?: string
  projectId2?: string
  requirementId2?: string
  sid2?: string
  tid2?: string
  prePocTid?: string
  prePocRequirementId?: string
  obsoleteMid?: string
}

const fixturePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/ris-run2-document.txt')

test.describe('DPM RIS browser lifecycle certification - QA Run #2', () => {
  test.setTimeout(300_000)

  test('generated RIS lifecycle through Opportunity, Project, RIS allocation, Tenant, artifacts, release, and reuse', async ({ page, context }, testInfo) => {
    const qa = new RisQaRun(page, testInfo)
    let report: Awaited<ReturnType<RisQaRun['attachReport']>>['report'] | undefined

    try {
      const ids = await createPocOpportunityProjectThroughUi(page, qa)
      await allocateGeneratedRisThroughUi(page, qa, ids)

      await certifyGeneratedRouting(page, qa, ids, context)
      await certifyGeneratedActiveMidSidHeaders(page, qa, ids)
      await createTenantThroughSidUi(page, qa, ids)
      await certifyGeneratedTenantReflection(page, qa, ids)
      await certifyRemarksAndDocuments(page, qa, ids)
      await certifySidToMidSynchronization(page, qa, ids)
      await certifyVersionUpdateWorkflow(page, qa, ids)
      await createSecondPocSharedSidThroughUi(page, qa, ids)
      const sid1Snapshot = await captureSidOperationalSnapshot(page, ids.sid1)
      await completePocAndVerifyMidState(page, qa, ids, ids.projectId, {
        rule: 'QA Run #2 completing first POC keeps SID1 active while second POC still uses it',
        expectedPurpose: 'POC',
        expectedAvailability: 'Occupied',
        expectedCurrentSid: ids.sid1,
      })
      await completePocAndVerifyMidState(page, qa, ids, ids.sharedProjectId ?? '', {
        rule: 'QA Run #2 completing final active POC releases generated MID',
        expectedPurpose: 'None',
        expectedAvailability: 'Available',
        expectedCurrentSid: '',
      })
      await certifyHistoricalSidFreeze(page, qa, ids, sid1Snapshot)
      await recordRemainingPurposeStateCoverage(page, qa, ids)
      await createDemoTenantBeforeSecondPoc(page, qa, ids)
      await createSecondPocReuseThroughUi(page, qa, ids)
      await certifyPrePocTenantCleanup(page, qa, ids)
      await certifySid2AndHistoricalSidIsolation(page, qa, ids, sid1Snapshot)
      await certifyObsoleteMidAndCancelEligibility(page, qa, ids)
    } finally {
      ;({ report } = await qa.attachReport())
    }

    qa.assertNoFailures()
    expect.soft(report?.statusCounts.BLOCKED, `${report?.statusCounts.BLOCKED ?? 0} RIS browser QA scenario(s) blocked`).toBe(0)
  })
})

async function createPocOpportunityProjectThroughUi(page: Page, qa: RisQaRun): Promise<GeneratedLifecycleIds> {
  const runId = `QA-RUN2-${Date.now()}`
  await openHash(page, '/opportunities/new')
  await field(page, 'Opportunity name').locator('input').fill(runId)
  await field(page, 'Account (end user)').locator('select').selectOption({ label: 'APAC Final QA Customer 01' })
  await field(page, 'Stage').locator('select').selectOption('POC')
  await page.waitForTimeout(200)
  await field(page, 'Delivery date').locator('input').fill('2026-10-19')
  await field(page, 'Start Date').locator('input').fill('2026-10-20')
  await field(page, 'End Date').locator('input').fill('2026-11-10')
  await page.getByRole('button', { name: /Add Tenant Requirement/ }).click()
  const requirementId = (await page.getByTestId('opportunity-requirement-A-0-requirementId').innerText()).trim()
  await page.getByTestId('opportunity-requirement-A-0-apiEnabled').locator('select').selectOption('YES')
  await page.getByTitle('Save actions').click()
  await page.getByRole('menuitem', { name: 'Apply Changes' }).click()
  await page.getByRole('button', { name: 'Create New POC' }).click()
  await page.waitForTimeout(1_000)

  const body = await page.locator('body').innerText()
  const opportunityId = body.match(/Opportunity (OPP\d{6})/)?.[1] ?? ''
  await page.getByRole('button', { name: 'Related Projects' }).click()
  await page.waitForTimeout(300)
  const relatedBody = await page.locator('body').innerText()
  const projectId = maxBusinessId(relatedBody.match(/\bP\d{6}\b/g) ?? [])
  await qa.check(
    Boolean(opportunityId && projectId && requirementId),
    'QA Run #2 creates Opportunity and POC Project through UI',
    'Critical',
    {
      state: 'Generated lifecycle',
      form: 'Opportunity Workspace',
      expected: 'New OPP, PID, and Grid A Requirement are generated by normal Opportunity save / Create New POC workflow.',
      actual: `${opportunityId || '<missing>'} / ${projectId || '<missing>'} / ${requirementId || '<missing>'}`,
      generatedIds: { OPP: opportunityId, PID1: projectId, requirementId },
    },
    [
      'Open Opportunities > New Opportunity',
      'Populate POC header and Grid A New Tenant Requirement',
      'Apply Changes',
      'Confirm Create New POC',
      'Read generated Opportunity and Project identifiers',
    ],
    'OpportunityLifecycle / ProjectLifecycle UI handoff',
  )
  return { runId, opportunityId, projectId, requirementId, mid: '', sid1: '' }
}

async function createSecondPocSharedSidThroughUi(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  const runId = `${ids.runId}-SHARED`
  await openHash(page, '/opportunities/new')
  await field(page, 'Opportunity name').locator('input').fill(runId)
  await field(page, 'Account (end user)').locator('select').selectOption({ label: 'APAC Final QA Customer 01' })
  await field(page, 'Stage').locator('select').selectOption('POC')
  await page.waitForTimeout(200)
  await field(page, 'Delivery date').locator('input').fill('2026-10-22')
  await field(page, 'Start Date').locator('input').fill('2026-10-23')
  await field(page, 'End Date').locator('input').fill('2026-11-14')
  await page.getByRole('button', { name: /Add Tenant Requirement/ }).click()
  ids.sharedRequirementId = (await page.getByTestId('opportunity-requirement-A-0-requirementId').innerText()).trim()
  await page.getByTestId('opportunity-requirement-A-0-deployTarget').locator('select').selectOption('EXISTING_SID')
  const existingSidSelect = page.getByTestId('opportunity-requirement-A-0-existingSystemId').locator('select')
  const sidOptionValue = await optionValueContaining(existingSidSelect, ids.sid1)
  await qa.check(Boolean(sidOptionValue), 'QA Run #2 second POC can request active SID1 as Existing System', 'Critical', {
    state: 'Generated second active POC',
    form: 'Opportunity Grid A',
    fieldOrTab: 'Existing System',
    expected: ids.sid1,
    actual: sidOptionValue ? ids.sid1 : 'SID1 not present in eligible Existing System options',
    generatedIds: idsForEvidence(ids),
  }, [
    'Open new POC Opportunity',
    'Add Grid A New Tenant Requirement',
    'Select Deploy Target = Existing System',
    `Inspect Existing System options for ${ids.sid1}`,
  ], 'Opportunity existing SID request eligibility')
  if (!sidOptionValue) return
  await existingSidSelect.selectOption(sidOptionValue)
  await page.getByTitle('Save actions').click()
  await page.getByRole('menuitem', { name: 'Apply Changes' }).click()
  await page.getByRole('button', { name: 'Create New POC' }).click()
  await page.waitForTimeout(1_000)
  await page.getByRole('button', { name: 'Related Projects' }).click()
  await page.waitForTimeout(300)
  const relatedBody = await page.locator('body').innerText()
  ids.sharedProjectId = maxBusinessId((relatedBody.match(/\bP\d{6}\b/g) ?? []).filter((pid) => pid !== ids.projectId))

  await openHash(page, `/projects/${ids.sharedProjectId}?mode=edit`)
  await page.getByRole('button', { name: 'Systems / Tenants' }).click()
  await page.getByRole('button', { name: 'Allocate System' }).click()
  await page.getByRole('button', { name: 'Allocate Requested Existing System' }).click()
  await page.waitForTimeout(300)
  await page.getByTestId(`system-candidate-select-${ids.sid1}`).check()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await page.waitForTimeout(1_000)
  const projectBody = await page.locator('body').innerText()
  await qa.check(Boolean(ids.sharedProjectId && projectBody.includes(ids.sid1) && !/\bS\d{6}\b/g.test(projectBody.replaceAll(ids.sid1, ''))), 'QA Run #2 second active POC links to existing SID1 without creating SID2', 'Critical', {
    state: 'Generated second active POC',
    form: 'Project Systems / Tenants',
    fieldOrTab: 'Allocated Systems',
    expected: `PID ${ids.sharedProjectId}; existing SID ${ids.sid1}; no new SID while SID1 is active`,
    actual: `PID ${ids.sharedProjectId || '<missing>'}; SID1=${projectBody.includes(ids.sid1)}; SIDs=${Array.from(new Set(projectBody.match(/\bS\d{6}\b/g) ?? [])).join(', ') || '<none>'}`,
    generatedIds: idsForEvidence(ids),
  }, [
    `Open generated Project ${ids.sharedProjectId}`,
    'Open Systems / Tenants',
    'Open Allocate System',
    'Switch to Allocate Requested Existing System',
    `Select active SID1 ${ids.sid1}`,
    'Confirm allocation',
  ], 'Project existing SID allocation lifecycle')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  const snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.fields.Purpose === 'POC' && snapshot.fields['Availability Status'] === 'Occupied' && snapshot.fields['Current SID'] === ids.sid1, 'QA Run #2 shared active POC keeps MID occupied by SID1', 'Critical', {
    state: 'Generated Active POC MID shared by two POCs',
    form: snapshot.title,
    fieldOrTab: 'Purpose / Availability / Current SID',
    expected: `Purpose=POC; Availability=Occupied; Current SID=${ids.sid1}`,
    actual: `Purpose=${snapshot.fields.Purpose || '<missing>'}; Availability=${snapshot.fields['Availability Status'] || '<missing>'}; Current SID=${snapshot.fields['Current SID'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open MID ${ids.mid} after linking second POC`, 'Read lifecycle fields'], 'Shared active SID lifecycle')
}

async function allocateGeneratedRisThroughUi(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/projects/${ids.projectId}?mode=edit`)
  await page.getByRole('button', { name: 'Systems / Tenants' }).click()
  await page.getByRole('button', { name: 'Allocate System' }).click()
  await page.waitForTimeout(300)
  if (!(await page.locator('[data-testid^="system-candidate-M"]').count()) && await page.getByRole('button', { name: 'Clear filters' }).count()) {
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await page.waitForTimeout(300)
  }
  const firstCandidate = page
    .locator('[data-testid^="system-candidate-M"]')
    .filter({ hasText: 'Available' })
    .first()
  ids.mid = ((await firstCandidate.getAttribute('data-testid')) ?? '').replace('system-candidate-', '')
  await page.getByTestId(`system-candidate-select-${ids.mid}`).check()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await page.waitForTimeout(1_000)
  const body = await page.locator('body').innerText()
  ids.sid1 = body.match(/\bS\d{6}\b/)?.[0] ?? ''

  await qa.check(
    Boolean(ids.mid && ids.sid1 && ids.mid !== ids.sid1),
    'QA Run #2 allocates available RIS through Project UI and creates SID1',
    'Critical',
    {
      state: 'Generated lifecycle',
      form: 'Project Systems / Tenants',
      expected: 'Project allocation creates a MID-backed SID allocation through the Allocate System dialog.',
      actual: `${ids.mid || '<missing>'} / ${ids.sid1 || '<missing>'}`,
      generatedIds: { OPP: ids.opportunityId, PID1: ids.projectId, MID: ids.mid, SID1: ids.sid1 },
    },
    [
      `Open Project ${ids.projectId} in edit mode`,
      'Open Systems / Tenants',
      'Open Allocate System',
      'Select available RIS candidate',
      'Confirm allocation',
      'Read generated MID and SID',
    ],
    'ProjectFormPage allocation dialog / AllocationContext',
  )
}

async function certifyGeneratedRouting(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds, context: BrowserContext) {
  await openHash(page, `/projects/${ids.projectId}?mode=view`)
  await page.getByRole('button', { name: 'Systems / Tenants' }).click()
  const links = await businessLinks(page)
  const midLink = links.find((link) => link.text === ids.mid)
  const sidLink = links.find((link) => link.text === ids.sid1)
  await qa.check(
    hrefRoute(midLink?.href) === `/systems/reused-internal/${ids.mid}?mode=view`,
    'QA Run #2 generated Project MID link opens MID route',
    'Critical',
    {
      state: 'Generated POC Project',
      form: 'Project Systems / Tenants',
      fieldOrTab: 'MID link',
      expected: `/systems/reused-internal/${ids.mid}?mode=view`,
      actual: hrefRoute(midLink?.href),
      generatedIds: idsForEvidence(ids),
    },
    [`Open generated Project ${ids.projectId}`, 'Open Systems / Tenants', `Inspect MID ${ids.mid} link`],
    'ProjectFormPage/SystemDeliveryTable MID link rendering',
  )

  if (midLink) {
    await page.locator(`a:has-text("${ids.mid}")`).first().click()
    await page.waitForTimeout(500)
    const snapshot = await readSystemSnapshot(page)
    await qa.check(
      snapshot.title === `MID ${ids.mid}`,
      'QA Run #2 clicking generated Project MID link opens MID form identity',
      'Critical',
      {
        state: 'Generated POC Project',
        form: snapshot.title,
        fieldOrTab: 'MID link click',
        expected: `MID ${ids.mid}`,
        actual: snapshot.title || page.url(),
        generatedIds: idsForEvidence(ids),
      },
      [`Open generated Project ${ids.projectId}`, 'Click generated MID link', 'Read rendered System form identity'],
      'ProjectFormPage/SystemDeliveryTable MID link rendering',
    )
  }

  await openHash(page, `/projects/${ids.projectId}?mode=view`)
  await page.getByRole('button', { name: 'Systems / Tenants' }).click()
  await qa.check(
    hrefRoute(sidLink?.href) === `/systems/${ids.sid1}?mode=view`,
    'QA Run #2 generated Project SID link opens SID route',
    'High',
    {
      state: 'Generated POC Project',
      form: 'Project Systems / Tenants',
      fieldOrTab: 'SID link',
      expected: `/systems/${ids.sid1}?mode=view`,
      actual: hrefRoute(sidLink?.href),
      generatedIds: idsForEvidence(ids),
    },
    [`Open generated Project ${ids.projectId}`, 'Open Systems / Tenants', `Inspect SID ${ids.sid1} link`],
    'ProjectFormPage/SystemDeliveryTable SID link rendering',
  )

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  await page.reload({ waitUntil: 'networkidle' })
  let snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.title === `MID ${ids.mid}`, 'QA Run #2 direct generated MID URL refresh resolves MID', 'Critical', {
    state: 'Generated Active POC MID',
    form: snapshot.title,
    expected: `MID ${ids.mid}`,
    actual: snapshot.title,
    generatedIds: idsForEvidence(ids),
  }, [`Open direct MID URL for ${ids.mid}`, 'Reload', 'Read identity'], 'Route reconstruction/hydration')

  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  await page.reload({ waitUntil: 'networkidle' })
  snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.title === `SID ${ids.sid1}`, 'QA Run #2 direct generated SID1 URL refresh resolves SID1', 'Critical', {
    state: 'Generated Active SID1',
    form: snapshot.title,
    expected: `SID ${ids.sid1}`,
    actual: snapshot.title,
    generatedIds: idsForEvidence(ids),
  }, [`Open direct SID URL for ${ids.sid1}`, 'Reload', 'Read identity'], 'Route reconstruction/hydration')

  const secondPage = await context.newPage()
  await secondPage.goto(`/#/systems/${ids.sid1}?mode=view`, { waitUntil: 'networkidle' })
  const secondTitle = (await secondPage.locator('body').innerText()).match(/SID S\d{6}/)?.[0] ?? ''
  await qa.check(secondTitle === `SID ${ids.sid1}`, 'QA Run #2 generated SID1 opens in a second browser page', 'High', {
    state: 'Generated Active SID1',
    form: secondTitle,
    expected: `SID ${ids.sid1}`,
    actual: secondTitle,
    generatedIds: idsForEvidence(ids),
  }, [`Open SID ${ids.sid1} in a second page`, 'Read identity'], 'Route reconstruction/new page hydration')
  await secondPage.close()
}

async function certifyGeneratedActiveMidSidHeaders(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  let snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.fields.Purpose === 'POC', 'QA Run #2 generated active MID Purpose is POC', 'High', {
    state: 'Generated Active POC MID',
    form: snapshot.title,
    fieldOrTab: 'Purpose',
    expected: 'POC',
    actual: snapshot.fields.Purpose || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated MID ${ids.mid}`, 'Read Purpose'], 'SystemInventory active MID lifecycle')
  await qa.check(snapshot.fields['Availability Status'] === 'Occupied', 'QA Run #2 generated active MID Availability is Occupied', 'High', {
    state: 'Generated Active POC MID',
    form: snapshot.title,
    fieldOrTab: 'Availability Status',
    expected: 'Occupied',
    actual: snapshot.fields['Availability Status'] || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated MID ${ids.mid}`, 'Read Availability Status'], 'SystemInventory active MID lifecycle')
  await qa.check(snapshot.fields['Current SID'] === ids.sid1, 'QA Run #2 generated active MID Current SID is SID1', 'High', {
    state: 'Generated Active POC MID',
    form: snapshot.title,
    fieldOrTab: 'Current SID',
    expected: ids.sid1,
    actual: snapshot.fields['Current SID'] || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated MID ${ids.mid}`, 'Read Current SID'], 'SystemInventory active MID lifecycle')

  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.fields.MID === ids.mid, 'QA Run #2 generated active SID1 MID header value', 'High', {
    state: 'Generated Active SID1',
    form: snapshot.title,
    fieldOrTab: 'MID',
    expected: ids.mid,
    actual: snapshot.fields.MID || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated SID1 ${ids.sid1}`, 'Read MID header field'], 'SystemInventoryFormPages active SID header rendering')
  await qa.check(snapshot.fields.Purpose === 'POC', 'QA Run #2 generated active SID1 Purpose header value', 'High', {
    state: 'Generated Active SID1',
    form: snapshot.title,
    fieldOrTab: 'Purpose',
    expected: 'POC',
    actual: snapshot.fields.Purpose || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated SID1 ${ids.sid1}`, 'Read Purpose header field'], 'SystemInventoryFormPages active SID header rendering')
  await clickEditIfPresent(page)
  snapshot = await readSystemSnapshot(page)
  const sidLinks = await businessLinks(page)
  const sidMidLink = sidLinks.find((link) => link.text === ids.mid)
  await qa.check(hrefRoute(sidMidLink?.href) === `/systems/reused-internal/${ids.mid}?mode=view`, 'QA Run #2 generated active SID1 MID header links to MID', 'High', {
    state: 'Generated Active SID1',
    form: snapshot.title,
    fieldOrTab: 'MID link',
    expected: `/systems/reused-internal/${ids.mid}?mode=view`,
    actual: hrefRoute(sidMidLink?.href),
    generatedIds: idsForEvidence(ids),
  }, [`Open generated SID1 ${ids.sid1}`, 'Enter edit mode', 'Inspect MID header link'], 'SystemInventoryFormPages active SID MID reference')
  const midInput = snapshot.controls.find((control) => control.tag === 'INPUT' && (control.value === ids.mid || control.value === ids.mid.replace(/^M/, '')))
  const purposeSelect = snapshot.controls.find((control) => control.tag === 'SELECT' && control.text.includes('Demo') && control.text.includes('Support'))
  await qa.check(!midInput || Boolean(midInput.disabled || midInput.readOnly), 'QA Run #2 generated active SID1 MID field is read-only', 'High', {
    state: 'Generated Active SID1',
    form: snapshot.title,
    fieldOrTab: 'MID editability',
    expected: 'MID disabled/readOnly',
    actual: midInput ? `disabled=${midInput.disabled}; readOnly=${midInput.readOnly}; value=${midInput.value}` : 'No editable MID input found',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated SID1 ${ids.sid1}`, 'Enter edit mode', 'Inspect MID control'], 'SystemInventoryFormPages active SID editability')
  await qa.check(!purposeSelect || Boolean(purposeSelect.disabled), 'QA Run #2 generated active SID1 Purpose field is read-only', 'High', {
    state: 'Generated Active SID1',
    form: snapshot.title,
    fieldOrTab: 'Purpose editability',
    expected: 'Purpose=P0C disabled/readOnly',
    actual: purposeSelect ? `disabled=${purposeSelect.disabled}; value=${purposeSelect.value}; options=${purposeSelect.text}` : 'No Purpose select found',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated SID1 ${ids.sid1}`, 'Enter edit mode', 'Inspect Purpose control'], 'SystemInventoryFormPages active SID editability')
}

async function createTenantThroughSidUi(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/systems/${ids.sid1}?mode=edit`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  await page.getByRole('button', { name: 'Add Tenant' }).click()
  await field(page, 'Tenant Requirement ID').locator('select').selectOption(ids.requirementId)
  await page.getByRole('button', { name: 'Create Tenant' }).click()
  await page.waitForTimeout(1_000)
  const body = await page.locator('body').innerText()
  ids.tid1 = body.match(/\bT\d{6}\b/)?.[0] ?? ''
  await qa.check(Boolean(ids.tid1), 'QA Run #2 creates first Tenant through active SID1 UI', 'Critical', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Tenant',
    expected: 'Tenant created from linked Project new tenant requirement.',
    actual: ids.tid1 || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open generated SID1 ${ids.sid1}`, 'Tenant tab', 'Add Tenant', `Select Requirement ${ids.requirementId}`, 'Create Tenant'], 'TenantOperations create-from-System workflow')
}

async function certifyGeneratedTenantReflection(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  let body = await page.locator('body').innerText()
  await qa.check(Boolean(ids.tid1 && body.includes(ids.tid1)), 'QA Run #2 SID1 shows created TID1', 'High', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Tenant',
    expected: ids.tid1,
    actual: ids.tid1 && body.includes(ids.tid1) ? ids.tid1 : '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open SID1 ${ids.sid1}`, 'Open Tenant tab', `Find ${ids.tid1}`], 'System Tenant table')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  body = await page.locator('body').innerText()
  const snapshot = await readSystemSnapshot(page)
  await qa.check(Boolean(ids.tid1 && body.includes(ids.tid1)), 'QA Run #2 active MID reflects current physical Tenant from SID1', 'High', {
    state: 'Generated Active POC MID',
    form: `MID ${ids.mid}`,
    fieldOrTab: 'Tenant',
    expected: ids.tid1,
    actual: ids.tid1 && body.includes(ids.tid1) ? ids.tid1 : '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open MID ${ids.mid}`, 'Open Tenant tab', `Find ${ids.tid1}`], 'MID/SID physical Tenant synchronization')
  await qa.check(snapshot.fields['Number of Tenants'] === '1', 'QA Run #2 active MID Number of Tenants updates after SID Tenant creation', 'High', {
    state: 'Generated Active POC MID',
    form: snapshot.title,
    fieldOrTab: 'Number of Tenants',
    expected: '1',
    actual: snapshot.fields['Number of Tenants'] || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open MID ${ids.mid}`, 'Read Number of Tenants after TID creation'], 'MID/SID physical Tenant synchronization')
}

async function certifyRemarksAndDocuments(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  const midRemark = `QA-MID-REMARK-${ids.runId}`
  const sidRemark = `QA-SID1-REMARK-${ids.runId}`
  await addRemark(page, `/systems/reused-internal/${ids.mid}?mode=edit`, midRemark)
  await addRemark(page, `/systems/${ids.sid1}?mode=edit`, sidRemark)
  await uploadDocument(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  await uploadDocument(page, `/systems/${ids.sid1}?mode=edit`)

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  let body = await page.locator('body').innerText()
  await qa.check(body.includes(midRemark) && !body.includes(sidRemark), 'QA Run #2 MID Remark remains form-local', 'High', {
    state: 'Generated Active POC MID',
    form: `MID ${ids.mid}`,
    fieldOrTab: 'Remarks',
    expected: `Contains ${midRemark}; excludes ${sidRemark}`,
    actual: `MID=${body.includes(midRemark)}; SID=${body.includes(sidRemark)}`,
    generatedIds: idsForEvidence(ids),
  }, ['Create unique MID Remark', 'Create unique SID1 Remark', 'Reopen MID', 'Compare rendered Remarks'], 'Remarks form-local ownership')
  await page.getByRole('button', { name: 'Documents', exact: true }).click()
  body = await page.locator('body').innerText()
  await qa.check(body.includes('ris-run2-document.txt'), 'QA Run #2 MID Document upload persists through UI', 'Medium', {
    state: 'Generated Active POC MID',
    form: `MID ${ids.mid}`,
    fieldOrTab: 'Documents',
    expected: 'ris-run2-document.txt',
    actual: body.includes('ris-run2-document.txt') ? 'ris-run2-document.txt' : '<missing>',
    generatedIds: idsForEvidence(ids),
  }, ['Open MID Documents tab', 'Upload deterministic file fixture', 'Reopen Documents tab'], 'DocumentCollection/System parent persistence')

  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  body = await page.locator('body').innerText()
  await qa.check(body.includes(sidRemark) && !body.includes(midRemark), 'QA Run #2 SID1 Remark remains form-local', 'High', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Remarks',
    expected: `Contains ${sidRemark}; excludes ${midRemark}`,
    actual: `SID=${body.includes(sidRemark)}; MID=${body.includes(midRemark)}`,
    generatedIds: idsForEvidence(ids),
  }, ['Create unique MID Remark', 'Create unique SID1 Remark', 'Reopen SID1', 'Compare rendered Remarks'], 'Remarks form-local ownership')
  await page.getByRole('button', { name: 'Documents', exact: true }).click()
  body = await page.locator('body').innerText()
  await qa.check(body.includes('ris-run2-document.txt'), 'QA Run #2 SID1 Document upload persists through UI', 'Medium', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Documents',
    expected: 'ris-run2-document.txt',
    actual: body.includes('ris-run2-document.txt') ? 'ris-run2-document.txt' : '<missing>',
    generatedIds: idsForEvidence(ids),
  }, ['Open SID1 Documents tab', 'Upload deterministic file fixture', 'Reopen Documents tab'], 'DocumentCollection/System parent persistence')
}

async function certifySidToMidSynchronization(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/systems/${ids.sid1}?mode=edit`)
  const before = await readSystemSnapshot(page)
  const current = before.fields['Operational Status']
  const next = current === 'Service Blocked' ? 'On' : 'Service Blocked'
  const statusButton = page.getByRole('button', { name: 'Operational Status' }).first()
  if (!(await statusButton.count()) || !(await statusButton.isEnabled())) {
    await qa.fail('QA Run #2 SID1 Operational Status can be edited for synchronization test', 'High', {
      state: 'Generated Active SID1',
      form: `SID ${ids.sid1}`,
      fieldOrTab: 'Operational Status',
      expected: 'Enabled Operational Status dropdown in active SID edit mode.',
      actual: (await statusButton.count()) ? 'Operational Status dropdown is disabled.' : 'Operational Status dropdown not found.',
      generatedIds: idsForEvidence(ids),
    }, [`Open SID1 ${ids.sid1} in edit mode`, 'Inspect Operational Status control'], 'Active SID -> MID synchronization')
    return
  }
  await statusButton.click()
  await page.getByRole('button', { name: new RegExp(`^${escapeRegex(next)}$`) }).last().click()
  await qa.check((await page.getByRole('button', { name: 'Operational Status' }).first().innerText()).includes(next), 'QA Run #2 SID1 Operational Status picker accepts edit before save', 'High', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Operational Status',
    expected: next,
    actual: await page.getByRole('button', { name: 'Operational Status' }).first().innerText(),
    generatedIds: idsForEvidence(ids),
  }, [`Open SID1 ${ids.sid1} in edit mode`, `Select ${next} from Operational Status picker`], 'Active SID Operational Status editability')
  const saveButton = page.getByRole('button', { name: /^Save$/ }).first()
  await expect(saveButton).toBeEnabled()
  page.once('dialog', (dialog) => dialog.accept())
  await saveButton.click()
  await page.waitForTimeout(800)

  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  const sidSnapshot = await readSystemSnapshot(page)
  await qa.check(sameStatus(sidSnapshot.fields['Operational Status'], next), 'QA Run #2 SID1 Operational Status edit persists on SID1', 'High', {
    state: 'Generated Active SID1',
    form: sidSnapshot.title,
    fieldOrTab: 'Operational Status',
    expected: next,
    actual: sidSnapshot.fields['Operational Status'] || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Edit SID1 ${ids.sid1} Operational Status`, 'Apply Changes', 'Reopen SID1', 'Read Operational Status'], 'Active SID Operational Status persistence')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  await page.reload({ waitUntil: 'networkidle' })
  const snapshot = await readSystemSnapshot(page)
  await qa.check(sameStatus(snapshot.fields['Operational Status'], next), 'QA Run #2 SID1 Operational Status synchronizes to active MID', 'High', {
    state: 'Generated Active POC MID',
    form: snapshot.title,
    fieldOrTab: 'Operational Status',
    expected: next,
    actual: snapshot.fields['Operational Status'] || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Edit SID1 ${ids.sid1} Operational Status`, 'Apply Changes', `Open MID ${ids.mid}`, 'Reload', 'Read Operational Status'], 'Active SID -> MID synchronization')
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sameStatus(actual: string | undefined, expected: string) {
  return normalizeStatus(actual) === normalizeStatus(expected)
}

function normalizeStatus(value: string | undefined) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

async function certifyVersionUpdateWorkflow(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  const scheduler = await createSchedulerVersionUpgradeThroughUi(page, qa, ids)
  await openHash(page, `/systems/${ids.sid1}?mode=edit`)
  await page.getByRole('button', { name: 'Version update', exact: true }).click()
  if (!(await page.getByRole('button', { name: 'Add Version' }).count())) {
    qa.blocked('QA Run #2 Version Update workflow unavailable on active SID1', {
      state: 'Generated Active SID1',
      form: `SID ${ids.sid1}`,
      fieldOrTab: 'Version Update',
      expected: 'Add Version action available.',
      actual: 'Add Version action not rendered.',
      generatedIds: idsForEvidence(ids),
      notes: 'FEATURE NOT IMPLEMENTED / FUTURE SCOPE',
    })
    return
  }
  await page.getByRole('button', { name: 'Add Version' }).click()
  await page.waitForTimeout(300)
  const versionOptions = await page.locator('#version-update-versionNumber option').evaluateAll((options) => options.map((option) => ({ value: (option as HTMLOptionElement).value, label: option.textContent ?? '' })).filter((option) => option.value))
  if (versionOptions.length === 0) {
    await qa.fail('QA Run #2 Version Update workflow has scheduler-backed version options after scheduler UI setup', 'High', {
      state: 'Generated Active SID1',
      form: `SID ${ids.sid1}`,
      fieldOrTab: 'Version Update',
      expected: `Scheduler-backed Version option ${scheduler.versionLabel}.`,
      actual: 'No selectable version options rendered in Add Version dialog.',
      generatedIds: idsForEvidence(ids),
    }, [
      'Create Version Upgrade Scheduler record through /version-upgrades/new',
      `Open active SID ${ids.sid1}`,
      'Open Version update tab',
      'Click Add Version',
      'Inspect Version Number options',
    ], 'Version Upgrade Scheduler -> System Version Update integration')
    await page.getByRole('button', { name: 'Cancel' }).last().click()
    return
  }
  await qa.check(versionOptions.some((option) => option.label.trim() === scheduler.versionLabel), 'QA Run #2 Version Update dialog exposes generated scheduler Version', 'High', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Version Update',
    expected: scheduler.versionLabel,
    actual: versionOptions.map((option) => option.label).join('; '),
    generatedIds: idsForEvidence(ids),
  }, [
    'Create Version Upgrade Scheduler record through normal UI',
    `Open active SID ${ids.sid1}`,
    'Open Version update tab',
    'Click Add Version',
    'Inspect Version Number dropdown',
  ], 'Version Upgrade Scheduler -> System Version Update integration')

  await page.locator('#version-update-versionNumber').selectOption({ label: scheduler.versionLabel })
  await page.locator('#version-update-buildNumber').selectOption({ label: scheduler.buildLabel })
  await page.locator('#version-update-CONFIG').setInputFiles(fixturePath)
  await page.locator('#version-update-ATP').setInputFiles(fixturePath)
  await page.locator('#version-update-CHECKLIST').setInputFiles(fixturePath)
  await page.locator('.ProseMirror').last().fill(`RIS certification Version Update for ${ids.runId}`)
  await page.getByRole('button', { name: /^Save$/ }).last().click()
  await page.waitForTimeout(1_000)

  const sidBody = await page.locator('body').innerText()
  await qa.check(sidBody.includes(scheduler.versionLabel) && sidBody.includes(scheduler.buildLabel), 'QA Run #2 active SID1 commits scheduler-backed Version Update', 'Critical', {
    state: 'Generated Active SID1',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Version Update',
    expected: `${scheduler.versionLabel} / ${scheduler.buildLabel}`,
    actual: [sidBody.includes(scheduler.versionLabel) ? scheduler.versionLabel : '<missing version>', sidBody.includes(scheduler.buildLabel) ? scheduler.buildLabel : '<missing build>'].join(' / '),
    generatedIds: idsForEvidence(ids),
  }, [
    'Select generated scheduler Version Number',
    'Select generated scheduler Build Number',
    'Upload Config, ATP, and Checklist attachments',
    'Save Version Update',
    'Read Version Updates table',
  ], 'System Version Update save')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  const midSnapshot = await readSystemSnapshot(page)
  await qa.check(midSnapshot.fields['Current Version'] === scheduler.versionLabel && midSnapshot.fields['Current Build'] === scheduler.buildLabel, 'QA Run #2 active SID1 Version Update synchronizes to active MID', 'Critical', {
    state: 'Generated Active POC MID',
    form: midSnapshot.title,
    fieldOrTab: 'Current Version / Current Build',
    expected: `${scheduler.versionLabel} / ${scheduler.buildLabel}`,
    actual: `${midSnapshot.fields['Current Version'] || '<missing>'} / ${midSnapshot.fields['Current Build'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [
    `Commit Version Update on active SID1 ${ids.sid1}`,
    `Open active MID ${ids.mid}`,
    'Read Current Version and Current Build',
  ], 'Active SID -> MID Version Update synchronization')
}

async function createSchedulerVersionUpgradeThroughUi(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  const suffix = ids.runId.replace(/^QA-RUN2-/, '')
  const versionLabel = `RIS-QA-${suffix}`
  const buildLabel = `RIS-QA-${suffix}.001`
  await openHash(page, '/version-upgrades/new')
  await field(page, 'Version Number').locator('input').fill(versionLabel)
  await field(page, 'Build Number').locator('input').fill(buildLabel)
  await field(page, 'Release Date').locator('input').fill('2026-10-21')
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await page.waitForTimeout(800)
  const body = await page.locator('body').innerText()
  await qa.check(body.includes('Version Upgrade record saved.') && body.includes(versionLabel) && body.includes(buildLabel), 'QA Run #2 creates scheduler Version/Build prerequisite through UI', 'High', {
    state: 'Generated lifecycle prerequisite',
    form: 'Version Upgrade Scheduler',
    fieldOrTab: 'Version Number / Build Number',
    expected: `${versionLabel} / ${buildLabel}`,
    actual: body.includes(versionLabel) || body.includes(buildLabel) ? `${body.includes(versionLabel) ? versionLabel : '<missing version>'} / ${body.includes(buildLabel) ? buildLabel : '<missing build>'}` : 'Scheduler save confirmation or generated labels not found',
    generatedIds: idsForEvidence(ids),
  }, [
    'Open Version Upgrade Scheduler new form',
    'Populate Version Number and Build Number',
    'Apply Changes',
    'Read saved scheduler form',
  ], 'Version Upgrade Scheduler prerequisite data')
  return { versionLabel, buildLabel }
}

async function captureSidOperationalSnapshot(page: Page, sid: string) {
  await openHash(page, `/systems/${sid}?mode=view`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  const tenantText = await page.locator('body').innerText()
  await page.getByRole('button', { name: 'Platform', exact: true }).click()
  const platformText = await page.locator('body').innerText()
  await page.getByRole('button', { name: 'Version update', exact: true }).click()
  const versionText = await page.locator('body').innerText()
  const header = await readSystemSnapshot(page)
  return { header: header.fields, tenantText, platformText, versionText }
}

async function completePocAndVerifyMidState(
  page: Page,
  qa: RisQaRun,
  ids: GeneratedLifecycleIds,
  projectId: string,
  expected: {
    rule: string
    expectedPurpose: string
    expectedAvailability: string
    expectedCurrentSid: string
  },
) {
  if (!projectId) {
    await qa.fail(expected.rule, 'Critical', {
      state: 'Generated POC completion',
      form: 'Project',
      expected: 'Project ID available for completion.',
      actual: 'Project ID is missing.',
      generatedIds: idsForEvidence(ids),
    }, ['Attempt to complete generated POC Project'], 'Project lifecycle test setup')
    return
  }
  await openHash(page, `/projects/${projectId}?mode=edit`)
  await page.getByRole('button', { name: 'Tasks' }).click()
  const checkboxes = await page.locator('input[type="checkbox"][aria-label^="Mark "]').all()
  for (const checkbox of checkboxes) {
    if (!(await checkbox.isChecked())) await checkbox.check()
  }
  await page.getByLabel('More save actions').click()
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await page.waitForTimeout(1_000)
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  const snapshot = await readSystemSnapshot(page)
  const currentSidMatches = expected.expectedCurrentSid
    ? snapshot.fields['Current SID'] === expected.expectedCurrentSid
    : !snapshot.fields['Current SID'] || snapshot.fields['Current SID'] === '-'
  await qa.check(
    snapshot.fields.Purpose === expected.expectedPurpose &&
      snapshot.fields['Availability Status'] === expected.expectedAvailability &&
      currentSidMatches,
    expected.rule,
    'Critical',
    {
    state: expected.expectedPurpose === 'POC' ? 'Generated MID with remaining active POC' : 'Generated Released MID',
    form: snapshot.title,
    fieldOrTab: 'Purpose / Availability / Current SID',
    expected: `Purpose=${expected.expectedPurpose}; Availability=${expected.expectedAvailability}; Current SID=${expected.expectedCurrentSid || '<blank>'}`,
    actual: `Purpose=${snapshot.fields.Purpose}; Availability=${snapshot.fields['Availability Status']}; Current SID=${snapshot.fields['Current SID']}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open Project ${projectId}`, 'Mark all tasks Done through UI', 'Apply Changes', `Open MID ${ids.mid}`, 'Read lifecycle fields'], 'Project completion / RIS release lifecycle')
}

async function certifyHistoricalSidFreeze(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds, beforeRelease: Awaited<ReturnType<typeof captureSidOperationalSnapshot>>) {
  await openHash(page, `/systems/${ids.sid1}?mode=edit`)
  await clickEditIfPresent(page)
  const snapshot = await readSystemSnapshot(page)
  const editableOperationalControls = snapshot.controls.filter((control) =>
    !control.disabled &&
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(control.tag) &&
    !['Records per page', 'Search / Filter', 'Remark Created Date From Date', 'Remark Created Date To Date', 'Activity From Date', 'Activity To Date'].includes(control.aria) &&
    control.text !== 'NoYes',
  )
  await qa.check(editableOperationalControls.length === 0, 'QA Run #2 historical SID1 operational/configuration controls are frozen', 'High', {
    state: 'Generated Historical SID1',
    form: snapshot.title,
    expected: 'No editable operational/configuration controls after POC release.',
    actual: editableOperationalControls.map((control) => `${control.tag}:${control.aria || control.text || control.value}`).join('; ') || 'No editable operational controls observed.',
    generatedIds: idsForEvidence(ids),
  }, [`Release Project ${ids.projectId}`, `Open SID1 ${ids.sid1} in edit mode`, 'Inspect controls'], 'Historical SID freeze')
  await qa.check(snapshot.fields['Operational Status'] === beforeRelease.header['Operational Status'], 'QA Run #2 historical SID1 retains release Operational Status', 'High', {
    state: 'Generated Historical SID1',
    form: snapshot.title,
    fieldOrTab: 'Operational Status',
    expected: beforeRelease.header['Operational Status'],
    actual: snapshot.fields['Operational Status'] || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Capture SID1 ${ids.sid1} before release`, 'Release Project', 'Reopen SID1', 'Compare Operational Status'], 'Historical SID snapshot retention')
}

async function createDemoTenantBeforeSecondPoc(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  await field(page, 'Purpose').locator('select').selectOption('Demo')
  await field(page, 'Occupation Start Date').locator('input').fill('2026-10-24')
  await field(page, 'Occupation End Date').locator('input').fill('2026-11-20')
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByLabel('More save actions').click()
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await page.waitForTimeout(900)
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)

  let snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.fields.Purpose === 'Demo' && snapshot.fields['Availability Status'] === 'Occupied', 'QA Run #2 released MID can be transitioned to Demo through UI before POC reuse', 'High', {
    state: 'Generated Demo MID before POC reuse',
    form: snapshot.title,
    fieldOrTab: 'Purpose / Availability',
    expected: 'Purpose=Demo; Availability=Occupied',
    actual: `Purpose=${snapshot.fields.Purpose || '<missing>'}; Availability=${snapshot.fields['Availability Status'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open released MID ${ids.mid}`, 'Set Purpose Demo and occupation dates', 'Apply Changes'], 'RIS manual purpose lifecycle')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  await page.getByRole('button', { name: 'Add Tenant' }).click()
  const requirementSelect = field(page, 'Tenant Requirement ID').locator('select')
  const nonInternalRequirement = await requirementSelect.locator('option').evaluateAll((options) => {
    const option = options.find((candidate) => (candidate as HTMLOptionElement).value !== 'INTERNAL' && !(candidate as HTMLOptionElement).disabled)
    return option ? (option as HTMLOptionElement).value : ''
  })
  ids.prePocRequirementId = nonInternalRequirement || 'INTERNAL'
  if (nonInternalRequirement) await requirementSelect.selectOption(nonInternalRequirement)
  await page.getByRole('button', { name: 'Create Tenant' }).click()
  await page.waitForTimeout(1_000)
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  const body = await page.locator('body').innerText()
  ids.prePocTid = maxBusinessId(body.match(/\bT\d{6}\b/g) ?? [])
  snapshot = await readSystemSnapshot(page)
  await qa.check(Boolean(ids.prePocTid) && snapshot.fields['Number of Tenants'] === '1', 'QA Run #2 creates pre-POC Demo Tenant through MID UI', 'Critical', {
    state: 'Generated Demo MID before POC reuse',
    form: snapshot.title,
    fieldOrTab: 'Tenant / Number of Tenants',
    expected: 'One current pre-POC Tenant exists on Demo MID.',
    actual: `TID=${ids.prePocTid || '<missing>'}; Number of Tenants=${snapshot.fields['Number of Tenants'] || '<missing>'}; Requirement=${ids.prePocRequirementId}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open Demo MID ${ids.mid}`, 'Add Tenant', 'Create Tenant', 'Read TID and tenant count'], 'Pre-POC Tenant setup')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  await clickEditIfPresent(page)
  await field(page, 'Purpose').locator('select').selectOption('None')
  let purposeDialogCount = 0
  const purposeDialogHandler = async (dialog: Dialog) => {
    purposeDialogCount += 1
    if (purposeDialogCount === 1) await dialog.accept()
    else await dialog.dismiss()
  }
  page.on('dialog', purposeDialogHandler)
  await page.getByLabel('More save actions').click()
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  page.off('dialog', purposeDialogHandler)
  await page.waitForTimeout(900)
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.fields.Purpose === 'None' && snapshot.fields['Availability Status'] === 'Available', 'QA Run #2 pre-POC Demo MID can be returned to None before later POC allocation', 'High', {
    state: 'Generated None MID after Demo Tenant setup',
    form: snapshot.title,
    fieldOrTab: 'Purpose / Availability',
    expected: 'Purpose=None; Availability=Available before later POC allocation.',
    actual: `Purpose=${snapshot.fields.Purpose || '<missing>'}; Availability=${snapshot.fields['Availability Status'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open Demo MID ${ids.mid}`, 'Set Purpose None through UI', 'Apply Changes', 'Read header'], 'RIS manual purpose lifecycle')
}

async function createSecondPocReuseThroughUi(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  const second = await createPocOpportunityProjectThroughUi(page, qa)
  ids.projectId2 = second.projectId
  ids.requirementId2 = second.requirementId
  await openHash(page, `/projects/${ids.projectId2}?mode=edit`)
  await page.getByRole('button', { name: 'Systems / Tenants' }).click()
  await page.getByRole('button', { name: 'Allocate System' }).click()
  await page.waitForTimeout(300)
  if (!(await page.getByTestId(`system-candidate-select-${ids.mid}`).count()) && await page.getByRole('button', { name: 'Clear filters' }).count()) {
    await page.getByRole('button', { name: 'Clear filters' }).click()
    await page.waitForTimeout(300)
  }
  const candidate = page.getByTestId(`system-candidate-select-${ids.mid}`)
  if (!(await candidate.count())) {
    qa.blocked('QA Run #2 released MID is unavailable for second POC allocation', {
      state: 'Generated Reused MID / SID2',
      form: 'Project allocation dialog',
      expected: `${ids.mid} available as candidate after release.`,
      actual: `${ids.mid} candidate not rendered.`,
      generatedIds: idsForEvidence(ids),
      notes: 'PRODUCT DEFECT or release lifecycle blocker',
    })
    return
  }
  await candidate.check()
  await page.getByRole('button', { name: 'Confirm' }).click()
  await page.waitForTimeout(1_000)
  const body = await page.locator('body').innerText()
  ids.sid2 = Array.from(new Set(body.match(/\bS\d{6}\b/g) ?? [])).find((sid) => sid !== ids.sid1)
  await qa.check(Boolean(ids.sid2 && ids.sid2 !== ids.sid1), 'QA Run #2 second POC creates SID2 for same MID', 'Critical', {
    state: 'Generated Reused MID / SID2',
    form: 'Project Systems / Tenants',
    expected: `New SID2 for ${ids.mid}, different from ${ids.sid1}.`,
    actual: ids.sid2 || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Create second POC Project ${ids.projectId2}`, `Allocate released MID ${ids.mid}`, 'Read generated SID2'], 'RIS reuse lifecycle')
}

async function certifyPrePocTenantCleanup(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  if (!ids.prePocTid || !ids.sid2) {
    await qa.fail('QA Run #2 pre-POC Tenant cleanup prerequisites exist', 'Critical', {
      state: 'Generated SID2 lifecycle',
      form: 'Browser lifecycle',
      expected: 'Pre-POC TID and SID2 are generated.',
      actual: `prePocTid=${ids.prePocTid || '<missing>'}; SID2=${ids.sid2 || '<missing>'}`,
      generatedIds: idsForEvidence(ids),
    }, ['Create Demo tenant', 'Allocate Demo MID into later POC'], 'Pre-POC Tenant cleanup setup')
    return
  }

  await openHash(page, `/tenants/${ids.prePocTid}?mode=view`)
  const tenantBody = await page.locator('body').innerText()
  await qa.check(tenantBody.includes(ids.prePocTid) && tenantBody.includes('Cancelled') && !tenantBody.includes('Deleted'), 'QA Run #2 pre-POC Tenant is retained as Cancelled, not Deleted', 'Critical', {
    state: 'Pre-POC Tenant after POC allocation',
    form: `Tenant ${ids.prePocTid}`,
    fieldOrTab: 'Operational Status',
    expected: 'Cancelled and not Deleted',
    actual: `hasTID=${tenantBody.includes(ids.prePocTid)}; Cancelled=${tenantBody.includes('Cancelled')}; Deleted=${tenantBody.includes('Deleted')}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open Tenant ${ids.prePocTid}`, 'Read lifecycle status'], 'Tenant lifecycle cancellation retention')
  await qa.check(ids.prePocRequirementId === 'INTERNAL' || tenantBody.includes(ids.prePocRequirementId ?? ''), 'QA Run #2 pre-POC Tenant historical Requirement context is retained', 'High', {
    state: 'Pre-POC Tenant after POC allocation',
    form: `Tenant ${ids.prePocTid}`,
    fieldOrTab: 'Requirement History',
    expected: ids.prePocRequirementId === 'INTERNAL' ? 'Internal Tenant has no external Requirement ID.' : ids.prePocRequirementId,
    actual: ids.prePocRequirementId === 'INTERNAL' ? 'Internal Tenant cancellation retained.' : `Requirement visible=${tenantBody.includes(ids.prePocRequirementId ?? '')}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open Tenant ${ids.prePocTid}`, 'Read retained requirement/history fields'], 'Tenant requirement release retention')

  await openHash(page, `/systems/${ids.sid2}?mode=view`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  let body = await page.locator('body').innerText()
  let snapshot = await readSystemSnapshot(page)
  await qa.check(!body.includes(ids.prePocTid) && snapshot.fields['Number of Tenants'] === '0', 'QA Run #2 new SID2 Tenant scope starts clean after pre-POC cleanup', 'Critical', {
    state: 'Generated Active SID2',
    form: snapshot.title,
    fieldOrTab: 'Tenant / Number of Tenants',
    expected: `No ${ids.prePocTid}; Number of Tenants=0`,
    actual: `oldTenantVisible=${body.includes(ids.prePocTid)}; Number of Tenants=${snapshot.fields['Number of Tenants'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open SID2 ${ids.sid2}`, 'Open Tenant tab', 'Read Tenant table and count'], 'SID2 clean Tenant scope')
  await page.getByRole('button', { name: 'Platform', exact: true }).click()
  body = await page.locator('body').innerText()
  await qa.check(body.includes('Records 0-0 of 0') || body.includes('No configuration history has been recorded'), 'QA Run #2 SID2 Configuration History is empty before first SID2 Tenant', 'High', {
    state: 'Generated Active SID2',
    form: `SID ${ids.sid2}`,
    fieldOrTab: 'Configuration History',
    expected: 'No configuration history before first SID2 Tenant.',
    actual: body.includes('Records 0-0 of 0') ? 'Records 0-0 of 0' : body.slice(0, 400),
    generatedIds: idsForEvidence(ids),
  }, [`Open SID2 ${ids.sid2}`, 'Open Platform tab before first Tenant', 'Read Configuration History'], 'SID2 configuration lifecycle')

  await openHash(page, `/systems/${ids.sid2}?mode=edit`)
  await page.getByRole('button', { name: 'Tenant', exact: true }).click()
  await page.getByRole('button', { name: 'Add Tenant' }).click()
  await field(page, 'Tenant Requirement ID').locator('select').selectOption(ids.requirementId2 ?? '')
  await page.getByRole('button', { name: 'Create Tenant' }).click()
  await page.waitForTimeout(1_000)
  body = await page.locator('body').innerText()
  ids.tid2 = Array.from(new Set(body.match(/\bT\d{6}\b/g) ?? [])).find((tid) => tid !== ids.prePocTid && tid !== ids.tid1)
  snapshot = await readSystemSnapshot(page)
  await qa.check(Boolean(ids.tid2) && !body.includes(ids.prePocTid) && snapshot.fields['Number of Tenants'] === '1', 'QA Run #2 new SID2 Tenant becomes current and cancelled pre-POC Tenant does not reappear', 'Critical', {
    state: 'Generated Active SID2',
    form: snapshot.title,
    fieldOrTab: 'Tenant / Number of Tenants',
    expected: `New TID2 current; ${ids.prePocTid} absent; Number of Tenants=1`,
    actual: `TID2=${ids.tid2 || '<missing>'}; oldTenantVisible=${body.includes(ids.prePocTid)}; Number of Tenants=${snapshot.fields['Number of Tenants'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open SID2 ${ids.sid2}`, 'Create first SID2 Tenant', 'Read Tenant tab and count'], 'SID2 Tenant lifecycle')
}

async function certifySid2AndHistoricalSidIsolation(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds, sid1BeforeRelease: Awaited<ReturnType<typeof captureSidOperationalSnapshot>>) {
  if (!ids.sid2 || !ids.projectId2) {
    await qa.fail('QA Run #2 SID2 lifecycle prerequisites are available for isolation certification', 'Critical', {
      state: 'Generated Reused MID / SID2',
      form: 'Browser lifecycle',
      expected: 'SID2 and PID2 generated by later POC lifecycle.',
      actual: `SID2=${ids.sid2 || '<missing>'}; PID2=${ids.projectId2 || '<missing>'}`,
      generatedIds: idsForEvidence(ids),
    }, ['Create later POC', 'Allocate released MID', 'Read SID2 and PID2'], 'RIS reuse lifecycle')
    return
  }

  await openHash(page, `/systems/${ids.sid2}?mode=view`)
  const sid2Snapshot = await readSystemSnapshot(page)
  await qa.check(sid2Snapshot.title === `SID ${ids.sid2}` && sid2Snapshot.fields.MID === ids.mid && sid2Snapshot.fields.Purpose === 'POC', 'QA Run #2 active SID2 opens as current POC SID for same MID', 'Critical', {
    state: 'Generated Active SID2',
    form: sid2Snapshot.title,
    fieldOrTab: 'MID / Purpose',
    expected: `SID ${ids.sid2}; MID=${ids.mid}; Purpose=POC`,
    actual: `${sid2Snapshot.title}; MID=${sid2Snapshot.fields.MID || '<missing>'}; Purpose=${sid2Snapshot.fields.Purpose || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open SID2 ${ids.sid2}`, 'Read header fields'], 'RIS reuse lifecycle')

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  const midBody = await page.locator('body').innerText()
  await qa.check(midBody.includes(ids.sid1) && midBody.includes(ids.sid2) && midBody.includes(ids.projectId) && midBody.includes(ids.projectId2), 'QA Run #2 MID Purpose History is cumulative across SID1 and SID2 lifecycles', 'High', {
    state: 'Generated Reused MID / SID2',
    form: `MID ${ids.mid}`,
    fieldOrTab: 'Purpose History',
    expected: `Purpose History includes ${ids.sid1}/${ids.projectId} and ${ids.sid2}/${ids.projectId2}.`,
    actual: `SID1=${midBody.includes(ids.sid1)}; PID1=${midBody.includes(ids.projectId)}; SID2=${midBody.includes(ids.sid2)}; PID2=${midBody.includes(ids.projectId2)}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open MID ${ids.mid} after SID2 allocation`, 'Read Purpose History section'], 'MID cumulative Purpose History')

  const historicalSidRemark = `QA-HIST-SID1-REMARK-${ids.runId}`
  await addRemark(page, `/systems/${ids.sid1}?mode=edit`, historicalSidRemark)
  await uploadDocument(page, `/systems/${ids.sid1}?mode=edit`)
  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  let sid1Body = await page.locator('body').innerText()
  await qa.check(sid1Body.includes(historicalSidRemark), 'QA Run #2 historical SID1 Remarks remain SID-local editable after SID2 exists', 'High', {
    state: 'Generated Historical SID1 after SID2',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Remarks',
    expected: historicalSidRemark,
    actual: sid1Body.includes(historicalSidRemark) ? historicalSidRemark : '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open historical SID1 ${ids.sid1}`, 'Add SID1-local Remark after SID2 exists', 'Reopen SID1', 'Read Remarks'], 'Historical SID local child objects')
  await page.getByRole('button', { name: 'Documents', exact: true }).click()
  sid1Body = await page.locator('body').innerText()
  await qa.check(sid1Body.includes('ris-run2-document.txt'), 'QA Run #2 historical SID1 Documents remain SID-local editable after SID2 exists', 'High', {
    state: 'Generated Historical SID1 after SID2',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Documents',
    expected: 'ris-run2-document.txt',
    actual: sid1Body.includes('ris-run2-document.txt') ? 'ris-run2-document.txt' : '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open historical SID1 ${ids.sid1}`, 'Upload document after SID2 exists', 'Reopen Documents tab'], 'Historical SID local child objects')

  await openHash(page, `/systems/${ids.sid1}?mode=view`)
  await page.getByRole('button', { name: 'Platform', exact: true }).click()
  const sid1PlatformAfterSid2 = await page.locator('body').innerText()
  await qa.check(!sid1PlatformAfterSid2.includes(ids.sid2) && !sid1PlatformAfterSid2.includes(ids.projectId2), 'QA Run #2 historical SID1 Platform/Configuration History receives no SID2 lifecycle events', 'High', {
    state: 'Generated Historical SID1 after SID2',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Platform / Configuration History',
    expected: `No ${ids.sid2} or ${ids.projectId2} references on historical SID1 Platform tab.`,
    actual: `SID2=${sid1PlatformAfterSid2.includes(ids.sid2)}; PID2=${sid1PlatformAfterSid2.includes(ids.projectId2)}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open historical SID1 ${ids.sid1}`, 'Open Platform tab after SID2 allocation', 'Search for SID2/PID2'], 'Historical SID configuration isolation')

  await page.getByRole('button', { name: 'Version update', exact: true }).click()
  const sid1VersionAfterSid2 = await page.locator('body').innerText()
  await qa.check(sid1VersionAfterSid2.includes(sid1BeforeRelease.header['Current Version']) && !sid1VersionAfterSid2.includes(ids.sid2), 'QA Run #2 historical SID1 Version Update history remains frozen after SID2 exists', 'High', {
    state: 'Generated Historical SID1 after SID2',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Version update',
    expected: `Retains release version context; no ${ids.sid2}.`,
    actual: `releaseVersionPresent=${sid1VersionAfterSid2.includes(sid1BeforeRelease.header['Current Version'])}; SID2=${sid1VersionAfterSid2.includes(ids.sid2)}`,
    generatedIds: idsForEvidence(ids),
  }, [`Capture SID1 before release`, `Open historical SID1 ${ids.sid1} after SID2`, 'Open Version update tab'], 'Historical SID version isolation')

  await page.getByRole('button', { name: 'Activity Log', exact: true }).click()
  const sid1ActivityAfterSid2 = await page.locator('body').innerText()
  await qa.check(!sid1ActivityAfterSid2.includes(ids.sid2) && !sid1ActivityAfterSid2.includes(ids.projectId2), 'QA Run #2 historical SID1 Activity Log receives no SID2 events', 'High', {
    state: 'Generated Historical SID1 after SID2',
    form: `SID ${ids.sid1}`,
    fieldOrTab: 'Activity Log',
    expected: `No ${ids.sid2} or ${ids.projectId2} events on SID1 Activity Log.`,
    actual: `SID2=${sid1ActivityAfterSid2.includes(ids.sid2)}; PID2=${sid1ActivityAfterSid2.includes(ids.projectId2)}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open historical SID1 ${ids.sid1}`, 'Open Activity Log after SID2 allocation', 'Search for SID2/PID2'], 'Activity Log form-local isolation')

  await openHash(page, `/systems/${ids.sid2}?mode=view`)
  const sid2RevisitSnapshot = await readSystemSnapshot(page)
  await qa.check(sid2RevisitSnapshot.title === `SID ${ids.sid2}`, 'QA Run #2 direct SID2 route remains stable after revisiting historical SID1', 'High', {
    state: 'Generated Active SID2 after SID1 revisit',
    form: sid2RevisitSnapshot.title || '<missing>',
    fieldOrTab: 'Routing',
    expected: `SID ${ids.sid2}`,
    actual: sid2RevisitSnapshot.title || '<missing>',
    generatedIds: idsForEvidence(ids),
  }, [`Open historical SID1 ${ids.sid1}`, `Navigate directly to SID2 ${ids.sid2}`, 'Read form heading'], 'SID2 route stability')
  if (sid2RevisitSnapshot.title !== `SID ${ids.sid2}`) return
  await page.getByRole('button', { name: 'Platform', exact: true }).click()
  const sid2Platform = await page.locator('body').innerText()
  await qa.check(!sid2Platform.includes(ids.tid1 ?? '') && !sid2Platform.includes(ids.sid1), 'QA Run #2 active SID2 starts without SID1 Tenant/Configuration History content', 'High', {
    state: 'Generated Active SID2',
    form: `SID ${ids.sid2}`,
    fieldOrTab: 'Platform / Configuration History',
    expected: `No SID1 ${ids.sid1} or TID1 ${ids.tid1 ?? '<none>'} content on SID2 Platform tab.`,
    actual: `SID1=${sid2Platform.includes(ids.sid1)}; TID1=${ids.tid1 ? sid2Platform.includes(ids.tid1) : false}`,
    generatedIds: idsForEvidence(ids),
  }, [`Open active SID2 ${ids.sid2}`, 'Open Platform tab', 'Search for SID1/TID1'], 'SID2 clean lifecycle start')
}

async function recordRemainingPurposeStateCoverage(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  const snapshot = await readSystemSnapshot(page)
  const cancelControl = snapshot.controls.find((control) => control.text === 'NoYes')
  qa.notApplicable('QA Run #2 Usage tab is future-growth functionality', {
    state: 'Generated lifecycle',
    form: `MID ${ids.mid}`,
    fieldOrTab: 'Usage',
    expected: 'Usage business implementation when defined.',
    actual: 'Usage is rendered as future-growth/empty implementation in current product scope.',
    generatedIds: idsForEvidence(ids),
    notes: 'FEATURE NOT IMPLEMENTED / FUTURE SCOPE',
  })
  await qa.check(Boolean(cancelControl && !cancelControl.disabled), 'QA Run #2 released available MID exposes Cancel System control', 'Medium', {
    state: 'Generated Released MID',
    form: snapshot.title,
    fieldOrTab: 'Cancel System',
    expected: 'Cancel System available for MID None + Available.',
    actual: cancelControl ? `disabled=${cancelControl.disabled}; value=${cancelControl.value}` : 'Cancel System control not found',
    generatedIds: idsForEvidence(ids),
  }, [`Open released MID ${ids.mid} in edit mode`, 'Inspect Cancel System control'], 'RIS Cancel System availability')
}

async function certifyObsoleteMidAndCancelEligibility(page: Page, qa: RisQaRun, ids: GeneratedLifecycleIds) {
  if (ids.projectId2) {
    await completePocAndVerifyMidState(page, qa, ids, ids.projectId2, {
      rule: 'QA Run #2 completing SID2 POC releases generated MID before Obsolete transition',
      expectedPurpose: 'None',
      expectedAvailability: 'Available',
      expectedCurrentSid: '',
    })
  }
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  const obsoletePurposeSelect = field(page, 'Purpose').locator('select')
  await expect(obsoletePurposeSelect).toHaveValue('None')
  await obsoletePurposeSelect.selectOption('OBSOLETE')
  await expect(obsoletePurposeSelect).toHaveValue('OBSOLETE')
  await page.getByLabel('More save actions').click()
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await page.waitForTimeout(1_500)
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  ids.obsoleteMid = ids.mid

  let snapshot = await readSystemSnapshot(page)
  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=edit`)
  const editSnapshot = await readSystemSnapshot(page)
  const cancelControl = editSnapshot.controls.find((control) => control.text === 'NoYes')
  await qa.check(
      snapshot.title === `MID ${ids.mid}` &&
      snapshot.fields.Purpose === 'OBSOLETE' &&
      snapshot.fields['Availability Status'] === 'Occupied' &&
      (!snapshot.fields['Current SID'] || snapshot.fields['Current SID'] === '-') &&
      !(cancelControl && !cancelControl.disabled),
    'QA Run #2 Obsolete MID is browser-created and occupied with Cancel System unavailable',
    'Critical',
    {
      state: 'Generated Obsolete MID',
      form: snapshot.title,
      fieldOrTab: 'Purpose / Availability / Current SID / Cancel System',
      expected: 'MID identity; Purpose=OBSOLETE; Availability=Occupied; Current SID empty; Cancel System unavailable',
      actual: `title=${snapshot.title}; Purpose=${snapshot.fields.Purpose || '<missing>'}; Availability=${snapshot.fields['Availability Status'] || '<missing>'}; Current SID=${snapshot.fields['Current SID'] || '<missing>'}; Cancel disabled=${cancelControl?.disabled}`,
      generatedIds: idsForEvidence(ids),
    },
    [`Open released MID ${ids.mid}`, 'Set Purpose OBSOLETE through UI', 'Apply Changes', 'Inspect view header and edit Cancel System control'],
    'Obsolete MID lifecycle / Cancel System ineligibility',
  )

  await openHash(page, `/systems/reused-internal/${ids.mid}?mode=view`)
  await page.reload({ waitUntil: 'networkidle' })
  snapshot = await readSystemSnapshot(page)
  await qa.check(snapshot.title === `MID ${ids.mid}` && snapshot.fields.Purpose === 'OBSOLETE' && snapshot.fields['Availability Status'] === 'Occupied', 'QA Run #2 Obsolete MID persists after reload', 'High', {
    state: 'Generated Obsolete MID',
    form: snapshot.title,
    fieldOrTab: 'Reload / persistence',
    expected: 'MID OBSOLETE Occupied after reload.',
    actual: `title=${snapshot.title}; Purpose=${snapshot.fields.Purpose || '<missing>'}; Availability=${snapshot.fields['Availability Status'] || '<missing>'}`,
    generatedIds: idsForEvidence(ids),
  }, [`Reload Obsolete MID ${ids.mid}`, 'Read header'], 'Obsolete MID persistence')

  for (const sid of [ids.sid1, ids.sid2].filter(Boolean)) {
    await openHash(page, `/systems/${sid}?mode=edit`)
    const sidSnapshot = await readSystemSnapshot(page)
    await qa.check(!sidSnapshot.fields['Cancel System'] && !sidSnapshot.controls.some((control) => control.text === 'NoYes'), `QA Run #2 Cancel System is unavailable on SID ${sid}`, 'High', {
      state: sid === ids.sid2 ? 'Generated Historical SID2' : 'Generated Historical SID1',
      form: sidSnapshot.title,
      fieldOrTab: 'Cancel System',
      expected: 'Cancel System absent/unavailable on every SID.',
      actual: `field=${sidSnapshot.fields['Cancel System'] || '<absent>'}; control=${sidSnapshot.controls.some((control) => control.text === 'NoYes')}`,
      generatedIds: idsForEvidence(ids),
    }, [`Open SID ${sid} in edit mode`, 'Inspect Cancel System field/control'], 'Cancel System SID ineligibility')
  }
}

async function addRemark(page: Page, route: string, content: string) {
  await openHash(page, route)
  await page.getByRole('button', { name: 'Add Remark' }).evaluate((element) => (element as HTMLButtonElement).click())
  await page.waitForTimeout(300)
  await page.locator('.ProseMirror').last().fill(content)
  await page.getByRole('button', { name: /^Save$/ }).last().evaluate((element) => (element as HTMLButtonElement).click())
  await page.waitForTimeout(500)
}

async function uploadDocument(page: Page, route: string) {
  await openHash(page, route)
  await page.getByRole('button', { name: 'Documents', exact: true }).click()
  await page.getByTestId('documents-upload-input').setInputFiles(fixturePath)
  await page.waitForTimeout(500)
}

function field(page: Page, label: string): Locator {
  return page.locator('label').filter({ hasText: label }).first()
}

async function optionValueContaining(select: Locator, text: string): Promise<string> {
  return select.locator('option').evaluateAll((options, expectedText) => {
    const option = options.find((candidate) => (candidate.textContent ?? '').includes(String(expectedText)))
    return option ? (option as HTMLOptionElement).value : ''
  }, text)
}

function idsForEvidence(ids: GeneratedLifecycleIds): Record<string, string> {
  return {
    OPP: ids.opportunityId,
    PID1: ids.projectId,
    PID_SHARED: ids.sharedProjectId ?? '',
    MID: ids.mid,
    SID1: ids.sid1,
    TID1: ids.tid1 ?? '',
    PID2: ids.projectId2 ?? '',
    requirementId2: ids.requirementId2 ?? '',
    SID2: ids.sid2 ?? '',
    TID2: ids.tid2 ?? '',
    prePocTID: ids.prePocTid ?? '',
    prePocRequirementId: ids.prePocRequirementId ?? '',
    requirementId: ids.requirementId,
  }
}

function maxBusinessId(ids: string[]): string {
  return [...new Set(ids)].sort((first, second) => Number(second.slice(1)) - Number(first.slice(1)))[0] ?? ''
}
