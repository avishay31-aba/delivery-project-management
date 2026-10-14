import { expect, test, type BrowserContext, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const APP_STATE_STORAGE_KEY = 'dpm-mvp-v1'
const LEGACY_MIGRATION_TEMP_STORAGE_KEY = 'delivery-erp-legacy-state-migration-v1'

const seed = JSON.parse(readFileSync(resolve(process.cwd(), 'src/data/seed.json'), 'utf8'))

type MockStorageMode = 'normal' | 'temp-quota-failure' | 'corrupt-main-write'

interface LegacyMigrationMetrics {
  setCalls: Array<{ key: string; length: number; prefix: string }>
  removeCalls: string[]
  errors: string[]
}

declare global {
  interface Window {
    __legacyMigrationMetrics?: LegacyMigrationMetrics
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function buildLegacyState() {
  const state = clone(seed)
  state.lastPersistedAt = '2026-10-01T12:00:00.000Z'
  state.accounts[0].accountName = 'LEGACY QA CUSTOMER PRESERVED'
  state.opportunities[0].opportunityName = 'LEGACY QA OPPORTUNITY PRESERVED'
  state.projects[0].projectName = 'LEGACY QA PROJECT PRESERVED'
  state.projects[0].opportunityName = 'LEGACY QA PROJECT PRESERVED'
  state.projects[0].projectComments = '<p>LEGACY QA PROJECT HISTORY PRESERVED</p>'
  state.systems[0].url = 'https://legacy-production-system.example.invalid'
  state.systems[0].remarks[0].content = 'LEGACY QA PRODUCTION SYSTEM PRESERVED'
  state.reusedInternalSystems[0].url = 'https://legacy-ris-mid.example.invalid'
  state.reusedInternalSystems[0].remarks[0].content = 'LEGACY QA RIS MID PRESERVED'
  state.tenants[0].accountName = 'LEGACY QA TENANT PRESERVED'
  return state
}

function buildSmallLegacyState() {
  const state = buildLegacyState()
  const projectIds = new Set(state.projects.slice(0, 3).map((project: { id: string }) => project.id))
  const systemIds = new Set(state.systems.slice(0, 3).map((system: { id: string }) => system.id))
  const tenantIds = new Set(state.tenants.slice(0, 3).map((tenant: { id: string }) => tenant.id))
  return {
    ...state,
    accounts: state.accounts.slice(0, 3),
    opportunities: state.opportunities.slice(0, 3),
    projects: state.projects.slice(0, 3),
    productionSystemInventory: state.productionSystemInventory.slice(0, 3),
    reusedInternalSystems: state.reusedInternalSystems.slice(0, 3),
    systems: state.systems.slice(0, 3),
    tenants: state.tenants.slice(0, 3),
    warrantyRecords: state.warrantyRecords.slice(0, 3),
    versionUpdates: state.versionUpdates.slice(0, 3),
    infrastructureItems: state.infrastructureItems.slice(0, 3),
    activityEvents: state.activityEvents.slice(0, 3),
    projectSystems: state.projectSystems
      .filter((link: { projectId: string; systemId: string }) => projectIds.has(link.projectId) || systemIds.has(link.systemId))
      .slice(0, 6),
    projectTenants: state.projectTenants
      .filter((link: { projectId: string; tenantId: string }) => projectIds.has(link.projectId) || tenantIds.has(link.tenantId))
      .slice(0, 6),
  }
}

function oversizedLegacyStateRaw() {
  return JSON.stringify({
    ...buildLegacyState(),
    __legacyPadding: 'X'.repeat(1_500_000),
  })
}

async function installMockStorage(context: BrowserContext, raw: string, mode: MockStorageMode = 'normal') {
  await context.addInitScript(({ appStateKey, tempKey, raw, mode }) => {
    const store = new Map<string, string>([[appStateKey, raw]])
    const originalConsoleError = console.error
    window.__legacyMigrationMetrics = { setCalls: [], removeCalls: [], errors: [] }

    console.error = (...args: unknown[]) => {
      window.__legacyMigrationMetrics?.errors.push(args.map(String).join(' '))
      originalConsoleError.apply(console, args)
    }

    Object.defineProperty(Storage.prototype, 'length', {
      configurable: true,
      get() {
        return store.size
      },
    })

    Storage.prototype.getItem = function getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    }

    Storage.prototype.setItem = function setItem(key: string, value: string) {
      window.__legacyMigrationMetrics?.setCalls.push({ key, length: String(value).length, prefix: String(value).slice(0, 120) })
      if (mode === 'temp-quota-failure' && key === tempKey) {
        throw new DOMException('Synthetic quota failure while preserving original legacy data.', 'QuotaExceededError')
      }
      const nextValue = String(value)
      const shouldCorruptMainWrite = mode === 'corrupt-main-write' &&
        key === appStateKey &&
        nextValue.includes('dpm-compressed-keyed-seed-delta-v1')
      store.set(key, shouldCorruptMainWrite ? '{"corrupted":true}' : nextValue)
    }

    Storage.prototype.removeItem = function removeItem(key: string) {
      window.__legacyMigrationMetrics?.removeCalls.push(key)
      store.delete(key)
    }

    Storage.prototype.key = function key(index: number) {
      return Array.from(store.keys())[index] ?? null
    }
  }, { appStateKey: APP_STATE_STORAGE_KEY, tempKey: LEGACY_MIGRATION_TEMP_STORAGE_KEY, raw, mode })
}

async function openApp(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2_500)
}

async function storageSnapshot(page: Page) {
  return page.evaluate((appStateKey) => {
    const raw = localStorage.getItem(appStateKey)
    return {
      rawLength: raw?.length ?? 0,
      rawPrefix: raw?.slice(0, 160) ?? null,
      metrics: window.__legacyMigrationMetrics ?? { setCalls: [], removeCalls: [], errors: [] },
      body: document.body.innerText,
    }
  }, APP_STATE_STORAGE_KEY)
}

async function expectLegacyRecordsVisible(page: Page) {
  await page.goto(`/#/projects/${seed.projects[0].pid}?mode=view`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('textbox', { name: 'Project name*' })).toHaveValue('LEGACY QA PROJECT PRESERVED')
  await expect(page.locator('body')).toContainText('LEGACY QA PROJECT HISTORY PRESERVED')
  await page.goto(`/#/customers/${seed.accounts[0].accountCode}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toContainText('LEGACY QA CUSTOMER PRESERVED')
  await page.goto(`/#/systems/${seed.systems[0].sid}?mode=edit`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toContainText('LEGACY QA PRODUCTION SYSTEM PRESERVED')
  await page.goto(`/#/systems/reused-internal/${seed.reusedInternalSystems[0].machineId}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toContainText('LEGACY QA RIS MID PRESERVED')
  await page.goto(`/#/tenants/${seed.tenants[0].tid}?mode=view`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toContainText('LEGACY QA TENANT PRESERVED')
}

test.describe('V1.3.1 legacy full-state migration', () => {
  test('migrates oversized valid legacy full-state data to compressed keyed delta without data loss', async ({ browser }) => {
    const context = await browser.newContext()
    const raw = oversizedLegacyStateRaw()
    expect(raw.length).toBeGreaterThan(4_500_000)
    await installMockStorage(context, raw)
    const page = await context.newPage()

    await openApp(page)
    const snapshot = await storageSnapshot(page)

    expect(snapshot.rawLength).toBeLessThan(raw.length)
    expect(snapshot.rawPrefix).toContain('dpm-compressed-keyed-seed-delta-v1')
    expect(snapshot.metrics.setCalls.some((call) => call.key === LEGACY_MIGRATION_TEMP_STORAGE_KEY)).toBe(true)
    expect(snapshot.metrics.setCalls.some((call) => call.key === APP_STATE_STORAGE_KEY && call.prefix.includes('dpm-compressed-keyed-seed-delta-v1'))).toBe(true)
    expect(snapshot.metrics.removeCalls).toContain(LEGACY_MIGRATION_TEMP_STORAGE_KEY)
    expect(snapshot.metrics.removeCalls).not.toContain(APP_STATE_STORAGE_KEY)
    await expectLegacyRecordsVisible(page)

    await context.close()
  })

  test('loads valid under-threshold legacy full-state data without forced migration', async ({ browser }) => {
    const context = await browser.newContext()
    const raw = JSON.stringify(buildSmallLegacyState())
    expect(raw.length).toBeLessThan(4_500_000)
    await installMockStorage(context, raw)
    const page = await context.newPage()

    await openApp(page)
    const snapshot = await storageSnapshot(page)

    expect(snapshot.rawLength).toBe(raw.length)
    expect(snapshot.rawPrefix).toContain('"version":1')
    expect(snapshot.metrics.setCalls.some((call) => call.key === LEGACY_MIGRATION_TEMP_STORAGE_KEY)).toBe(false)
    await expectLegacyRecordsVisible(page)

    await context.close()
  })

  test('preserves original legacy payload and visible data if temporary migration write hits quota', async ({ browser }) => {
    const context = await browser.newContext()
    const raw = oversizedLegacyStateRaw()
    await installMockStorage(context, raw, 'temp-quota-failure')
    const page = await context.newPage()

    await openApp(page)
    const snapshot = await storageSnapshot(page)

    expect(snapshot.rawLength).toBe(raw.length)
    expect(snapshot.rawPrefix).toContain('"version":1')
    expect(snapshot.metrics.removeCalls).not.toContain(APP_STATE_STORAGE_KEY)
    expect(snapshot.metrics.errors.join('\n')).toContain('legacy browser data migration failed')
    await expectLegacyRecordsVisible(page)

    await context.close()
  })

  test('restores original legacy payload if migration verification is interrupted', async ({ browser }) => {
    const context = await browser.newContext()
    const raw = oversizedLegacyStateRaw()
    await installMockStorage(context, raw, 'corrupt-main-write')
    const page = await context.newPage()

    await openApp(page)
    const snapshot = await storageSnapshot(page)

    expect(snapshot.rawLength).toBe(raw.length)
    expect(snapshot.rawPrefix).toContain('"version":1')
    expect(snapshot.metrics.removeCalls).not.toContain(APP_STATE_STORAGE_KEY)
    await expectLegacyRecordsVisible(page)

    await context.close()
  })

  test('keeps invalid oversized data untouched while falling back to seed for the session', async ({ browser }) => {
    const context = await browser.newContext()
    const raw = `{"version":1,"projects":${'"invalid"'.repeat(700_000)}}`
    expect(raw.length).toBeGreaterThan(4_500_000)
    await installMockStorage(context, raw)
    const page = await context.newPage()

    await openApp(page)
    const snapshot = await storageSnapshot(page)

    expect(snapshot.rawLength).toBe(raw.length)
    expect(snapshot.metrics.removeCalls).not.toContain(APP_STATE_STORAGE_KEY)
    expect(snapshot.body).toContain('Active Projects')
    expect(snapshot.body).not.toContain('LEGACY QA PROJECT PRESERVED')

    await context.close()
  })

  test('preserves existing compact keyed-delta storage', async ({ browser }) => {
    const producer = await browser.newContext()
    const producerPage = await producer.newPage()
    await openApp(producerPage)
    await producerPage.getByRole('button', { name: 'Save to browser' }).click()
    await expect(producerPage.getByRole('status')).toContainText('Browser data saved.')
    const compactRaw = await producerPage.evaluate((key) => localStorage.getItem(key), APP_STATE_STORAGE_KEY)
    await producer.close()
    expect(compactRaw).toContain('dpm-compressed-keyed-seed-delta-v1')

    const context = await browser.newContext()
    await installMockStorage(context, compactRaw!)
    const page = await context.newPage()
    await openApp(page)
    const snapshot = await storageSnapshot(page)

    expect(snapshot.rawPrefix).toContain('dpm-compressed-keyed-seed-delta-v1')
    expect(snapshot.metrics.setCalls.some((call) => call.key === LEGACY_MIGRATION_TEMP_STORAGE_KEY)).toBe(false)
    await expect(page.locator('body')).toContainText('Active Projects')

    await context.close()
  })
})
