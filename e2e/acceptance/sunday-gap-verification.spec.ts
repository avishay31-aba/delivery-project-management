import { expect, test, type Page } from '@playwright/test'
import { businessLinks, hrefRoute, openHash, readSystemSnapshot } from '../helpers/ris-certification'

const groupByDashboardRoutes = [
  '/customers',
  '/opportunities',
  '/projects',
  '/systems',
  '/systems/production-inventory',
  '/systems/reused-internal',
  '/tenants',
  '/infrastructure',
  '/notifications-alerts',
  '/reminders',
  '/version-upgrades',
  '/admin/countries',
  '/admin/us-states',
  '/admin/time-groups',
]

const systemDashboardRoutes = [
  '/systems',
  '/systems/production-inventory',
  '/systems/reused-internal',
]

async function waitForApp(page: Page) {
  await page.waitForLoadState('networkidle')
  await expect(page.locator('body')).not.toContainText('Loading...')
}

async function setRecordsPerPage(page: Page, value: string) {
  const select = page.locator('label').filter({ hasText: /^Records per page/ }).locator('select').first()
  if (await select.isVisible().catch(() => false)) {
    await select.selectOption(value)
    await page.waitForTimeout(200)
  }
}

async function dashboardHeaderLabels(page: Page): Promise<string[]> {
  return page.locator('thead th').evaluateAll((headers) => headers
    .map((header) => {
      const menuTitle = header.querySelector('button[title$=" column menu"]')?.getAttribute('title') ?? ''
      if (menuTitle) return menuTitle.replace(/ column menu$/, '').trim()
      return (header.textContent ?? '').replace(/[▾▦↑↓]/g, '').replace(/\s+/g, ' ').trim()
    })
    .filter(Boolean))
}

async function openFirstGroupableHeaderMenu(page: Page): Promise<string> {
  const labels = await dashboardHeaderLabels(page)
  for (const label of labels) {
    const menu = page.locator(`button[title="${label} column menu"]`).first()
    if (!(await menu.isVisible().catch(() => false))) continue
    await menu.click()
    const groupAscending = page.locator('button').filter({ hasText: /^Group ascending$/ }).first()
    const enabled = await groupAscending.isEnabled().catch(() => false)
    if (enabled) return label
    await page.keyboard.press('Escape')
  }
  throw new Error(`No groupable column header found. Headers: ${labels.join(', ')}`)
}

async function clickButtonByText(page: Page, pattern: RegExp) {
  const button = page.locator('button').filter({ hasText: pattern }).first()
  await expect(button).toBeVisible()
  await button.evaluate((element) => (element as HTMLButtonElement).click())
}

async function groupBy(page: Page, headerLabel: string, direction: 'ascending' | 'descending' = 'ascending') {
  await page.locator(`button[title="${headerLabel} column menu"]`).first().click()
  await clickButtonByText(page, new RegExp(`^Group ${direction}$`))
  await page.waitForTimeout(300)
}

async function selectAllocationRegionFilter(page: Page, value: string) {
  const dialog = page.getByRole('dialog')
  const selectIndex = await dialog.locator('select').evaluateAll((selects) =>
    selects.findIndex((select) => {
      const optionValues = Array.from((select as HTMLSelectElement).options).map((option) => option.value)
      return ['EMEA', 'APAC', 'LATAM', 'NA'].every((region) => optionValues.includes(region))
    }),
  )
  expect(selectIndex, 'allocation dialog should expose a Region filter select').toBeGreaterThanOrEqual(0)
  await dialog.locator('select').nth(selectIndex).selectOption(value)
}

async function groupTexts(page: Page): Promise<string[]> {
  return page.getByRole('button', { name: /Count: \d+/ }).evaluateAll((buttons) =>
    buttons.map((button) => (button.textContent ?? '').replace(/\s+/g, ' ').trim()),
  )
}

async function visibleColumnValues(page: Page, headerLabel: string): Promise<string[]> {
  const headers = await dashboardHeaderLabels(page)
  const columnIndex = headers.indexOf(headerLabel)
  expect(columnIndex, `${headerLabel} column should be visible`).toBeGreaterThanOrEqual(0)
  return page.locator('tbody tr:not(:has(button[aria-expanded]))').evaluateAll((rows, index) =>
    rows
      .map((row) => (row.querySelectorAll('td')[index]?.textContent ?? '').replace(/\s+/g, ' ').trim())
      .filter((_, rowIndex) => rows[rowIndex].querySelectorAll('td').length > index),
    columnIndex,
  )
}

function groupValues(groups: string[]): string[] {
  return groups.map((group) => group.replace(/^.*? - /, '').replace(/, Count:.*$/, ''))
}

async function firstVisibleSearchToken(page: Page): Promise<string> {
  const bodyText = await page.locator('tbody').first().innerText()
  const businessId = bodyText.match(/\b(?:C|OPP|P|S|M|T|INF|VU|ACT|REM|NR|ALERT)\d{6}\b/)?.[0]
  if (businessId) return businessId

  const cellTexts = await page.locator('tbody tr:not(:has(button[aria-expanded])) td').evaluateAll((cells) =>
    cells.map((cell) => (cell.textContent ?? '').replace(/\s+/g, ' ').trim()).filter(Boolean),
  )
  const token = cellTexts.find((value) => value.length >= 2 && !/^[-–—]$/.test(value))
  if (!token) throw new Error(`No visible searchable token found in dashboard body: ${bodyText.slice(0, 250)}`)
  return token
}

async function createDashboardVersionUpgrade(page: Page): Promise<string> {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1000)}`
  const versionLabel = `DASH-GROUP-${suffix}`
  await openHash(page, '/version-upgrades/new')
  await page.locator('label').filter({ hasText: /^Version Number/ }).locator('input').fill(versionLabel)
  await page.locator('label').filter({ hasText: /^Build Number/ }).locator('input').fill(`${versionLabel}.001`)
  await page.locator('label').filter({ hasText: /^Release Date/ }).locator('input').fill('2026-10-21')
  await page.getByRole('button', { name: 'Apply Changes' }).click()
  await expect(page.locator('body')).toContainText('Version Upgrade record saved.')
  return versionLabel
}

async function prepareDashboardRoute(page: Page, route: string) {
  if (route === '/version-upgrades') await createDashboardVersionUpgrade(page)
}

async function createMidThroughUi(page: Page): Promise<string> {
  const machineId = String(970000 + Math.floor(Math.random() * 9000))
  const mid = `M${machineId}`
  await openHash(page, '/systems/reused-internal')
  await page.getByRole('button', { name: '+ New Reused Internal System' }).click()
  await waitForApp(page)
  await page.locator('label').filter({ hasText: /^MID/ }).locator('input').first().fill(machineId)
  const usedInRegionControl = page.locator('label').filter({ hasText: /^Used In Region/ }).locator('select,input').first()
  if (await usedInRegionControl.isVisible().catch(() => false)) {
    const tagName = await usedInRegionControl.evaluate((element) => element.tagName.toLowerCase())
    if (tagName === 'select') await usedInRegionControl.selectOption('APAC')
    else await usedInRegionControl.fill('APAC')
  }
  const cognitoRegionControl = page.locator('label').filter({ hasText: /^Cognito Region/ }).locator('select,input').first()
  if (await cognitoRegionControl.isVisible().catch(() => false)) {
    const tagName = await cognitoRegionControl.evaluate((element) => element.tagName.toLowerCase())
    if (tagName === 'select') await cognitoRegionControl.selectOption('APAC')
    else await cognitoRegionControl.fill('APAC')
  }
  const saveButton = page.locator('main').getByRole('button', { name: /^Save$/ })
  await expect(saveButton).toBeEnabled()
  page.once('dialog', async (dialog) => dialog.accept())
  await saveButton.click()
  await waitForApp(page)
  await expect(page.locator('body')).toContainText(`MID ${mid}`)
  await expect.poll(async () => page.evaluate(async (expectedMid) => {
    const { useAppStore } = await import('/src/store/useAppStore.ts')
    return useAppStore.getState().reusedInternalSystems.some((system) => {
      const normalizedMid = 'M' + String(system.machineId).replace(/^M/i, '').padStart(6, '0')
      return normalizedMid === expectedMid
    })
  }, mid), { message: 'creator page store should contain created MID' }).toBe(true)
  await expect.poll(async () => page.evaluate(async (expectedMid) => {
    const { loadPersistedState } = await import('/src/store/persistence.ts')
    return loadPersistedState()?.reusedInternalSystems.some((system) => {
      const normalizedMid = 'M' + String(system.machineId).replace(/^M/i, '').padStart(6, '0')
      return normalizedMid === expectedMid
    }) ?? false
  }, mid), { message: 'creator page persisted state should contain created MID' }).toBe(true)
  return mid
}

async function openSystemsTenants(page: Page, pid = 'P000390') {
  await openHash(page, `/projects/${pid}?mode=edit`)
  await page.getByRole('button', { name: 'Systems / Tenants' }).click()
}

async function projectWithActiveSystem(page: Page): Promise<{ pid: string; sid: string }> {
  await openHash(page, '/projects')
  await waitForApp(page)
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts')
    const state = useAppStore.getState()
    for (const link of state.projectSystems) {
      if (String(link.allocationStatus ?? '').toUpperCase() === 'DEALLOCATED') continue
      const project = state.projects.find((candidate) => candidate.id === link.projectId)
      if (!project || String(project.progressStatus ?? '').toLowerCase() === 'done') continue
      const system = state.systems.find((candidate) => candidate.id === link.systemId)
      if (project.pid && system?.sid && system.source === 'Reused Internal Systems') return { pid: project.pid, sid: system.sid }
    }
    throw new Error('No active non-Done Project/SID pair found.')
  })
}

async function activeRisPair(page: Page): Promise<{ mid: string; sid: string }> {
  await openHash(page, '/systems')
  await waitForApp(page)
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts')
    const state = useAppStore.getState()
    for (const link of state.projectSystems) {
      if (String(link.allocationStatus ?? '').toUpperCase() === 'DEALLOCATED') continue
      const system = state.systems.find((candidate) => candidate.id === link.systemId)
      if (!system?.sid || system.source !== 'Reused Internal Systems') continue
      const machineId = String(system.machineId ?? link.sourceMachineId ?? '').replace(/^M/i, '').padStart(6, '0')
      if (/^\d{6}$/.test(machineId)) return { mid: `M${machineId}`, sid: system.sid }
    }
    throw new Error('No active RIS SID/MID pair found.')
  })
}

async function availableProductionFixture(page: Page): Promise<{ pid: string; sid: string }> {
  await openHash(page, '/projects')
  await waitForApp(page)
  return page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts')
    const state = useAppStore.getState()
    const productionSystem = state.productionSystemInventory.find((system) =>
      system.sid &&
      system.operationalStatus !== 'Canceled' &&
      system.operationalStatus !== 'Deleted' &&
      String(system.availability ?? '').toLowerCase() === 'available')
    const project = state.projects.find((candidate) =>
      candidate.pid &&
      candidate.mainType !== 'POC' &&
      String(candidate.progressStatus ?? '').toLowerCase() === 'open')
    if (!project?.pid || !productionSystem?.sid) throw new Error('No open non-POC Project and available Production System fixture found.')
    return { pid: project.pid, sid: productionSystem.sid }
  })
}

async function allocateProductionSystem(page: Page, fixture: { pid: string; sid: string }) {
  await openSystemsTenants(page, fixture.pid)
  await page.getByRole('button', { name: 'Allocate System' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  const regionFilter = page.getByRole('dialog').locator('label').filter({ hasText: /^Region$/ }).locator('select').first()
  if (await regionFilter.isVisible().catch(() => false)) await regionFilter.selectOption('')
  await page.getByPlaceholder('Search candidates').fill(fixture.sid)
  await page.getByTestId(`system-candidate-select-${fixture.sid}`).check()
  await page.getByRole('button', { name: /^Confirm$/ }).click()
  await expect(page.locator('body')).toContainText('1 system allocated.')
  await expect(page.locator('body')).toContainText(fixture.sid)
}

async function deallocateSystemFromProject(page: Page, sid: string) {
  const allocatedRow = page.locator('tr').filter({ hasText: sid }).first()
  await allocatedRow.getByRole('button', { name: /Deallocate/ }).click()
  await expect(page.locator('body')).toContainText('System deallocated from project.')
  await expect(allocatedRow).toHaveCount(0)
}

async function allocateReusedMidToProject(page: Page, pid: string, mid: string): Promise<string> {
  await openSystemsTenants(page, pid)
  const before = new Set((await page.locator('body').innerText()).match(/\bS\d{6}\b/g) ?? [])
  await page.getByRole('button', { name: 'Allocate System' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByPlaceholder('Search candidates').fill(mid)
  await page.getByTestId(`system-candidate-select-${mid}`).check()
  await page.getByRole('button', { name: /^Confirm$/ }).click()
  await expect(page.locator('body')).toContainText('1 system allocated.')
  await expect(page.locator('body')).toContainText(mid)
  const after = (await page.locator('body').innerText()).match(/\bS\d{6}\b/g) ?? []
  const sid = after.find((candidate) => !before.has(candidate)) ?? after[0]
  if (!sid) throw new Error(`Allocating ${mid} to ${pid} did not expose an SID.`)
  return sid
}

async function saveSystemForm(page: Page) {
  const saveButton = page.locator('main').getByRole('button', { name: /^Save$/ }).first()
  await expect(saveButton).toBeEnabled()
  page.once('dialog', async (dialog) => dialog.accept())
  await saveButton.click()
  await waitForApp(page)
}

async function createTenantThroughSystemUi(page: Page, sid: string): Promise<string> {
  const before = new Set((await page.locator('body').innerText()).match(/\bT\d{6}\b/g) ?? [])
  await openHash(page, `/systems/${sid}?mode=edit`)
  await page.getByRole('button', { name: /^Tenant$/ }).click()
  await page.getByRole('button', { name: 'Add Tenant' }).first().click()
  await page.getByRole('button', { name: 'Create Tenant' }).click()
  await page.waitForTimeout(800)
  const after = (await page.locator('body').innerText()).match(/\bT\d{6}\b/g) ?? []
  const created = after.find((tid) => !before.has(tid)) ?? after[0]
  if (!created) throw new Error(`Tenant creation did not expose a TID on SID ${sid}.`)
  return created
}

async function createProductionHistoryThroughUi(page: Page): Promise<{ pid: string; sid: string }> {
  const fixture = await availableProductionFixture(page)
  await allocateProductionSystem(page, fixture)
  await deallocateSystemFromProject(page, fixture.sid)
  return fixture
}
test.describe('Sunday baseline acceptance gap verification', () => {
  for (const route of groupByDashboardRoutes) {
    test(`DataDashboard Group By survives search, sorting, pagination, and preserves column position on ${route}`, async ({ page }) => {
      await prepareDashboardRoute(page, route)
      await openHash(page, route)
      await waitForApp(page)
      await setRecordsPerPage(page, '10')
      const headersBefore = await dashboardHeaderLabels(page)
      expect(headersBefore.length, `${route} should render dashboard headers`).toBeGreaterThan(1)
      const groupHeader = await openFirstGroupableHeaderMenu(page)
      const originalIndex = headersBefore.indexOf(groupHeader)

      await clickButtonByText(page, /^Group ascending$/)
      await page.waitForTimeout(300)
      const groupsAsc = await groupTexts(page)
      expect(groupsAsc.length, `${route} should render grouped rows with counters`).toBeGreaterThan(0)
      expect(groupsAsc[0], `${route} group row should show Count`).toMatch(/Count: \d+/)
      const headersAfterGroup = await dashboardHeaderLabels(page)
      expect(headersAfterGroup.indexOf(groupHeader), `${route} grouped column should stay in its original position`).toBe(originalIndex)
      const groupedColumnValues = await visibleColumnValues(page, groupHeader)
      expect(groupedColumnValues.length, `${route} grouped ${groupHeader} column should keep record cell values`).toBeGreaterThan(0)
      expect(groupedColumnValues.every((value) => value.length > 0), `${route} grouped ${groupHeader} cells must not be blank`).toBe(true)

      const groupToggle = page.getByRole('button', { name: /Count: \d+/ }).first()
      await expect(groupToggle).toHaveAttribute('aria-expanded', 'true')
      await groupToggle.click()
      await expect(groupToggle).toHaveAttribute('aria-expanded', 'false')
      await groupToggle.click()
      await expect(groupToggle).toHaveAttribute('aria-expanded', 'true')

      const searchToken = await firstVisibleSearchToken(page)
      await page.getByPlaceholder('Search').fill(searchToken)
      await expect(page.locator('body'), `${route} search should retain matching row`).toContainText(searchToken)
      await expect(page.locator('body'), `${route} search should keep grouped counter visible`).toContainText(/Count: \d+/)
      const clearSearch = page.getByLabel('Clear search')
      await expect(clearSearch).toBeVisible()
      await clearSearch.evaluate((element) => (element as HTMLButtonElement).click())
      await expect(page.getByPlaceholder('Search')).toHaveValue('')
      await expect(page.locator('body'), `${route} grouping should survive clearing search`).toContainText(/Count: \d+/)

      await groupBy(page, groupHeader, 'descending')
      const valuesDesc = groupValues(await groupTexts(page)).slice(0, 4)
      const sortedDesc = [...valuesDesc].sort((first, second) => second.localeCompare(first, undefined, { numeric: true }))
      expect(valuesDesc, `${route} descending group order should sort group values`).toEqual(sortedDesc)
    })
  }

  test('Projects Group By keeps grouped Type cell values visible in record rows', async ({ page }) => {
    await openHash(page, '/projects')
    await waitForApp(page)
    await setRecordsPerPage(page, '25')
    await groupBy(page, 'Type', 'ascending')
    await expect(page.locator('body')).toContainText(/Type - .+, Count: \d+/)
    const typeValues = await visibleColumnValues(page, 'Type')
    expect(typeValues.length, 'grouped Project record rows should expose Type values').toBeGreaterThan(0)
    expect(typeValues.every((value) => value.length > 0), 'grouped Project Type cells must not be blank').toBe(true)
    expect(new Set(typeValues).size, 'grouped Project Type cells should contain actual Type values').toBeGreaterThan(0)
  })

  test('System dashboards expose clickable linked Project IDs that navigate to exact Project forms', async ({ page }) => {
    const productionHistory = await createProductionHistoryThroughUi(page)
    for (const route of systemDashboardRoutes) {
      await openHash(page, route)
      await waitForApp(page)
      await setRecordsPerPage(page, 'all')
      const projectLinks = (await businessLinks(page)).filter((link) => /^P\d{6}$/.test(link.text))
      expect(projectLinks.length, `${route} should expose linked Project ID anchors`).toBeGreaterThan(0)
      const link = route === '/systems/production-inventory'
        ? projectLinks.find((candidate) => candidate.text === productionHistory.pid) ?? projectLinks[0]
        : projectLinks[0]
      expect(hrefRoute(link.href), `${route} linked PID href`).toBe(`/projects/${link.text}?mode=view`)
      await page.locator(`a[href="#/projects/${link.text}?mode=view"]`).first().click()
      await expect(page.locator('body')).toContainText(`Project ${link.text}`)
      await page.reload({ waitUntil: 'networkidle' })
      await expect(page.locator('body')).toContainText(`Project ${link.text}`)
    }
  })

  test('already-open Project allocation dialog receives newly created RIS-MID candidates without browser refresh', async ({ page, context }) => {
    await openSystemsTenants(page)
    await page.getByRole('button', { name: 'Allocate System' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const creator = await context.newPage()
    const mid = await createMidThroughUi(creator)
    await expect.poll(async () => page.evaluate(async (expectedMid) => {
      const { loadPersistedState } = await import('/src/store/persistence.ts')
      return loadPersistedState()?.reusedInternalSystems.some((system) => {
        const normalizedMid = 'M' + String(system.machineId).replace(/^M/i, '').padStart(6, '0')
        return normalizedMid === expectedMid
      }) ?? false
    }, mid), { message: 'persisted state should contain created MID' }).toBe(true)
    await expect.poll(async () => page.evaluate(async (expectedMid) => {
      const { useAppStore } = await import('/src/store/useAppStore.ts')
      return useAppStore.getState().reusedInternalSystems.some((system) => {
        const normalizedMid = 'M' + String(system.machineId).replace(/^M/i, '').padStart(6, '0')
        return normalizedMid === expectedMid
      })
    }, mid), { message: 'already-open page store should receive created MID' }).toBe(true)
    await expect(page.locator('body'), `allocation dialog should receive ${mid} without reload`).toContainText(mid, { timeout: 15_000 })
    await creator.close()
  })

  test('already-open APAC-filtered Project allocation dialog receives newly created eligible APAC RIS-MID without browser refresh', async ({ page, context }) => {
    await openSystemsTenants(page)
    await page.getByRole('button', { name: 'Allocate System' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await selectAllocationRegionFilter(page, 'APAC')

    const creator = await context.newPage()
    const mid = await createMidThroughUi(creator)
    await expect(page.locator('body'), `APAC-filtered allocation dialog should receive ${mid} without reload`).toContainText(mid, { timeout: 15_000 })
    await creator.close()
  })

  test('already-open Project form receives newly added Tenant from linked System without browser refresh', async ({ page, context }) => {
    const active = await projectWithActiveSystem(page)
    await openSystemsTenants(page, active.pid)
    await expect(page.locator('body')).toContainText(active.sid)

    const systemPage = await context.newPage()
    const tid = await createTenantThroughSystemUi(systemPage, active.sid)
    await expect(page.locator('body'), `project form should receive ${tid} without reload`).toContainText(tid, { timeout: 15_000 })
    await systemPage.close()
  })

  test('already-open Project and System views receive allocation and deallocation changes without browser refresh', async ({ page, context }) => {
    const pid = 'P000390'
    const setup = await context.newPage()
    const mid = await createMidThroughUi(setup)
    await setup.close()
    await openSystemsTenants(page, pid)
    const systemPage = await context.newPage()
    await openHash(systemPage, `/systems/reused-internal/${mid}?mode=view`)
    await expect(systemPage.locator('body')).toContainText('Available')

    const operator = await context.newPage()
    const sid = await allocateReusedMidToProject(operator, pid, mid)
    await expect(page.locator('body'), `project view should receive allocated ${sid} without reload`).toContainText(sid, { timeout: 15_000 })
    await expect(systemPage.locator('body'), `MID ${mid} should become Occupied without reload`).toContainText('Occupied', { timeout: 15_000 })
    await expect(systemPage.locator('body'), `MID ${mid} should show current SID ${sid} without reload`).toContainText(sid, { timeout: 15_000 })

    await deallocateSystemFromProject(operator, sid)
    await expect(page.locator('tr').filter({ hasText: sid }), `project current allocation row for ${sid} should disappear without reload`).toHaveCount(0, { timeout: 15_000 })
    await expect(systemPage.locator('body'), `MID ${mid} should return to Available without reload`).toContainText('Available', { timeout: 15_000 })
    await operator.close()
    await systemPage.close()
  })

  test('already-open RIS-MID reflects active SID physical field edits without browser refresh', async ({ page, context }) => {
    const { mid, sid } = await activeRisPair(page)
    await openHash(page, `/systems/reused-internal/${mid}?mode=view`)
    const sidPage = await context.newPage()
    await openHash(sidPage, `/systems/${sid}?mode=edit`)
    const region = sidPage.locator('label').filter({ hasText: /^Used In Region/ }).locator('select').first()
    const currentRegion = await region.inputValue()
    const options = await region.locator('option').evaluateAll((items) => items
      .map((item) => ({
        value: (item as HTMLOptionElement).value,
        label: (item as HTMLOptionElement).label || item.textContent?.trim() || (item as HTMLOptionElement).value,
      }))
      .filter((item) => item.value))
    const nextRegion = options.find((item) => item.value !== currentRegion) ?? options[0]
    expect(nextRegion, 'active SID should expose at least one Used In Region option').toBeTruthy()
    await region.selectOption(nextRegion.value)
    await saveSystemForm(sidPage)

    await expect.poll(async () => (await readSystemSnapshot(page)).fields['Used in Region'] ?? '', {
      message: `already-open MID ${mid} should reflect SID ${sid} Used In Region without reload`,
      timeout: 15_000,
    }).toBe(nextRegion.label)
    await expect(page.locator('body')).toContainText(`MID ${mid}`)
    await sidPage.close()
  })

  test('already-open System dashboards receive linked Project updates without browser refresh', async ({ page, context }) => {
    const pid = 'P000390'
    const setup = await context.newPage()
    const mid = await createMidThroughUi(setup)
    await setup.close()
    await openHash(page, '/systems')
    await setRecordsPerPage(page, 'all')
    await page.getByPlaceholder('Search').fill(mid)
    await expect(page.locator('body')).toContainText('Showing 0 records')

    const operator = await context.newPage()
    const sid = await allocateReusedMidToProject(operator, pid, mid)
    await expect(page.locator('body'), `allocated systems dashboard should receive ${sid} without reload`).toContainText(sid, { timeout: 15_000 })
    await expect(page.locator('body'), `allocated systems dashboard should receive linked ${pid} without reload`).toContainText(pid, { timeout: 15_000 })
    await page.locator(`a[href="#/projects/${pid}?mode=view"]`).first().click()
    await expect(page.locator('body')).toContainText(`Project ${pid}`)
    await operator.close()
  })
})
