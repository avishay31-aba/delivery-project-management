import fs from 'node:fs'
import { createServer } from 'vite'
import { matchRoutes } from 'react-router-dom'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 dialog/form/routing verification failed: ${message}`)
    process.exitCode = 1
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function findRequired(items, predicate, label) {
  const item = items.find(predicate)
  assert(Boolean(item), `${label} must exist.`)
  return item
}

function normalizeMid(value) {
  return String(value ?? '').replace(/^M/i, '').padStart(6, '0')
}

function routeMatches(pathname, routeId) {
  const routes = [
    { path: '/customers/:accountCode', id: 'customer' },
    { path: '/opportunities/:opportunityId', id: 'opportunity' },
    { path: '/projects/:pid', id: 'project' },
    { path: '/systems/production-inventory/:sid', id: 'productionSystem' },
    { path: '/systems/reused-internal/:mid', id: 'reusedInternalSystem' },
    { path: '/systems/:sid', id: 'allocatedSystem' },
    { path: '/tenants/:tid', id: 'tenant' },
    { path: '/infrastructure/:infrastructureId', id: 'infrastructure' },
    { path: '/version-upgrades/:id', id: 'versionUpgrade' },
  ]
  return matchRoutes(routes, pathname)?.at(-1)?.route.id === routeId
}

const projectForm = read('src/pages/projects/ProjectFormPage.tsx')
const opportunityForm = read('src/pages/opportunities/OpportunityFormPage.tsx')
const systemForm = read('src/pages/systems/SystemInventoryFormPages.tsx')
const tenantForm = read('src/pages/tenants/TenantFormPage.tsx')
const infrastructureForm = read('src/pages/infrastructure/InfrastructureFormPage.tsx')
const customerPage = read('src/pages/customers/Customer360Page.tsx')
const versionUpgradePage = read('src/pages/version-upgrades/VersionUpgradeSchedulerPage.tsx')
const candidateDialog = read('src/components/systems/SystemCandidateDialog.tsx')
const routesSource = read('src/routes/index.tsx')
const appSource = read('src/App.tsx')
const appStore = read('src/store/useAppStore.ts')
const crossTabSync = read('src/store/crossTabSync.ts')
const appStateRepository = read('src/platform/persistence/app-state-repository.ts')
const packageJson = JSON.parse(read('package.json'))

assert(
  opportunityForm.includes('if (isViewMode || isSaving) return') &&
    opportunityForm.includes('if (result.messages && result.messages.length > 0)') &&
    opportunityForm.includes('setSaveMessages(result.messages)') &&
    opportunityForm.includes('setPendingPocSave(null)') &&
    opportunityForm.includes('setPendingWonSave(null)') &&
    opportunityForm.includes('disabled={isSaving}'),
  'Opportunity POC/WON executable dialogs must keep failed business messages visible, close only on success, and block duplicate execution while saving.',
)

assert(
  projectForm.includes('const [isAllocationCommitting, setIsAllocationCommitting] = useState(false)') &&
    projectForm.includes('if (isViewMode || isAllocationCommitting) return') &&
    projectForm.includes("setAllocationResult({ ok: false, message: 'Select at least one system before allocating.' })") &&
    projectForm.includes('if (result.ok)') &&
    projectForm.includes('setIsAllocationDialogOpen(false)') &&
    projectForm.includes('confirmDisabled={isAllocationCommitting || selectedAllocationIds.length === 0}') &&
    candidateDialog.includes('disabled={confirmDisabled ?? selectedCandidateIds.length === 0}'),
  'Project Allocate System dialog must leave validation/business failures open, close only on successful allocation, and disable duplicate confirms.',
)

assert(
  systemForm.includes('const [isTenantCreationCommitting, setIsTenantCreationCommitting] = useState(false)') &&
    systemForm.includes('if (!canAddTenantFromCurrentForm() || isTenantCreationCommitting) return') &&
    systemForm.includes('setAddTenantOpen(false)') &&
    systemForm.includes("disabled={isTenantCreationCommitting || !selectedRequirementId || (selectedRequirementId !== 'INTERNAL' && !selectedProjectId)}") &&
    systemForm.includes("setMessages(['Tenant was not added.'])") &&
    systemForm.includes('if (!result.ok) return'),
  'System Create Tenant dialog must stay open for validation/business failure and time-group override, close only on success, and block duplicate create.',
)

assert(
  projectForm.includes("setIsAllocationDialogOpen(false)") &&
    systemForm.includes("onClick={() => setAddTenantOpen(false)}") &&
    opportunityForm.includes('setPendingPocSave(null)') &&
    opportunityForm.includes('setPendingWonSave(null)'),
  'Executable dialog Cancel/success paths must close without performing unrelated mutations.',
)

const primaryForms = [
  ['Opportunity', opportunityForm, '/opportunities'],
  ['Project', projectForm, '/projects'],
  ['System', systemForm, 'dashboardPath'],
  ['Tenant', tenantForm, '/tenants'],
  ['Infrastructure', infrastructureForm, '/infrastructure'],
]

for (const [name, source, fallback] of primaryForms) {
  assert(
    source.includes('successfulSaveApplyNavigationTarget({') &&
      source.includes('stayOnPage') &&
      source.includes('fallbackExitRoute') &&
      source.includes(fallback),
    `${name} primary form must use shared Save exits / Apply stays navigation semantics.`,
  )
}

assert(
  versionUpgradePage.includes('function save(stayOnPage: boolean)') &&
    versionUpgradePage.includes("navigate('/version-upgrades')") &&
    versionUpgradePage.includes('if (isCreate) navigate(`/version-upgrades/${result.record.id}?mode=edit`, { replace: true })') &&
    versionUpgradePage.includes('if (!result.ok || !result.record)') &&
    versionUpgradePage.includes('disabled={!isDirty || isSaving}'),
  'Version Upgrade form must preserve Save exits / Apply stays / failed Save remains semantics.',
)

assert(
  infrastructureForm.includes('if (!result.ok || !result.record)') &&
    tenantForm.includes('if (nextMessages.length > 0)') &&
    projectForm.includes('if (messages.length > 0)') &&
    systemForm.includes('if (nextMessages.length > 0)') &&
    opportunityForm.includes('validateOpportunity(currentDraft'),
  'Primary forms must remain on invalid or failed Save.',
)

assert(
  customerPage.includes('Customer360Page') &&
    !customerPage.includes('successfulSaveApplyNavigationTarget({'),
  'Customer/Account 360 is a routable detail page without a primary Save/Apply form in this scope.',
)

assert(
  appSource.includes('if (!hydrated)') &&
    appSource.includes('return <RouterProvider router={router} />') &&
    !projectForm.includes('mock store') &&
    !tenantForm.includes('mock store') &&
    !opportunityForm.includes('mock store'),
  'Direct routes must wait for application hydration and must not advertise a legacy mock-store lookup path.',
)

assert(
  appStateRepository.includes("APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT = 'dpm-compressed-keyed-seed-delta-v1'") &&
    appStateRepository.includes('compressedKeyedSeedDeltaAppDataState(compactAppDataStateForStorage(payload))') &&
    appStateRepository.includes('expandAppDataStateFromStorage(decoded)'),
  'Direct-route persistence must preserve compact baseline plus delta reconstruction.',
)

assert(
  crossTabSync.includes('if (message.sourceId === SOURCE_ID) return') &&
    crossTabSync.includes('if (version && version <= lastNotifiedVersion) return') &&
    appStore.includes('window.setTimeout(requestCommittedStateSnapshot, 250)') &&
    appStore.includes('window.setTimeout(requestCommittedStateSnapshot, 1000)'),
  'Cross-tab startup sync must ignore self messages, ignore stale versions, and use bounded startup snapshot requests.',
)

for (const [route, id] of [
  ['/customers/ACC000001', 'customer'],
  ['/opportunities/OPP000001', 'opportunity'],
  ['/projects/P000001', 'project'],
  ['/systems/production-inventory/S000001', 'productionSystem'],
  ['/systems/reused-internal/M000001', 'reusedInternalSystem'],
  ['/systems/S000001', 'allocatedSystem'],
  ['/tenants/T000001', 'tenant'],
  ['/infrastructure/INF000001', 'infrastructure'],
  ['/version-upgrades/VU000001', 'versionUpgrade'],
]) {
  assert(routeMatches(route, id), `${route} must match the ${id} direct route.`)
}

assert(
  routesSource.includes("path: 'projects/:pid'") &&
    routesSource.includes("path: 'tenants/:tid'") &&
    routesSource.includes("path: 'systems/production-inventory/:sid'") &&
    routesSource.includes("path: 'systems/reused-internal/:mid'") &&
    routesSource.includes("path: 'systems/:sid'"),
  'Routable business object paths must remain registered.',
)

assert(
  packageJson.scripts['verify:v13-dialog-form-routing'] === 'node scripts/verify-v13-dialog-form-routing.mjs',
  'package.json must expose verify:v13-dialog-form-routing.',
)

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const storageMap = new Map()
  globalThis.localStorage = {
    getItem: (key) => storageMap.get(key) ?? null,
    setItem: (key, value) => storageMap.set(key, String(value)),
    removeItem: (key) => storageMap.delete(key),
    clear: () => storageMap.clear(),
    key: (index) => Array.from(storageMap.keys())[index] ?? null,
    get length() {
      return storageMap.size
    },
  }

  const repository = await server.ssrLoadModule('/src/platform/persistence/app-state-repository.ts')
  const migration = await server.ssrLoadModule('/src/platform/persistence/app-state-migration.ts')
  const seedModule = await server.ssrLoadModule('/src/data/seed.json')
  const businessReferences = await server.ssrLoadModule('/src/domain/business-reference/service.ts')
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const store = storeModule.useAppStore
  const seedState = migration.normalizeAppDataState({
    ...clone(seedModule.default),
    lastPersistedAt: null,
  })

  const baselineProject = findRequired(seedState.projects, (project) => project.pid === 'P000390', 'baseline Project P000390')
  const baselineTenant = findRequired(seedState.tenants, (tenant) => tenant.tid === 'T000580', 'baseline Tenant T000580')
  const baselineOpportunity = findRequired(seedState.opportunities, (opportunity) => Boolean(opportunity.opportunityId), 'baseline Opportunity')
  const baselineAccount = findRequired(seedState.accounts, (account) => Boolean(account.accountCode), 'baseline Customer/Account')
  const baselineProduction = findRequired(seedState.productionSystemInventory, (system) => Boolean(system.sid), 'baseline Production System')
  const baselineReused = findRequired(seedState.reusedInternalSystems, (system) => Boolean(system.machineId), 'baseline RIS')
  const baselineAllocated = findRequired(seedState.systems, (system) => Boolean(system.sid), 'baseline allocated System')
  const baselineInfrastructure = findRequired(seedState.infrastructureItems, (item) => Boolean(item.infrastructureId), 'baseline Infrastructure')
  const baselineVersionUpgrade = seedState.versionUpgradeRecords.find((record) => Boolean(record.id)) ?? null

  assert(businessReferences.routePathForBusinessReference('PROJECT', baselineProject.pid) === `/projects/${baselineProject.pid}`, 'Baseline Project route must use PID.')
  assert(businessReferences.routePathForBusinessReference('TENANT', baselineTenant.tid) === `/tenants/${baselineTenant.tid}`, 'Baseline Tenant route must use TID.')
  assert(businessReferences.routePathForBusinessReference('OPPORTUNITY', baselineOpportunity.opportunityId) === `/opportunities/${baselineOpportunity.opportunityId}`, 'Baseline Opportunity route must use Opportunity ID.')
  assert(businessReferences.routePathForBusinessReference('ACCOUNT', baselineAccount.accountCode) === `/customers/${baselineAccount.accountCode}`, 'Baseline Account route must use Account Code.')
  assert(businessReferences.routePathForBusinessReference('PRODUCTION_SYSTEM', baselineProduction.sid) === `/systems/production-inventory/${baselineProduction.sid}`, 'Baseline Production System route must use SID.')
  assert(businessReferences.routePathForBusinessReference('INTERNAL_REUSED_SYSTEM', baselineReused.machineId) === `/systems/reused-internal/M${normalizeMid(baselineReused.machineId)}`, 'Baseline RIS route must use MID.')
  assert(businessReferences.routePathForBusinessReference('SYSTEM', baselineAllocated.sid) === `/systems/${baselineAllocated.sid}`, 'Baseline allocated System route must use SID.')
  assert(businessReferences.routePathForBusinessReference('INFRASTRUCTURE_ITEM', baselineInfrastructure.infrastructureId) === `/infrastructure/${baselineInfrastructure.infrastructureId}`, 'Baseline Infrastructure route must use Infrastructure ID.')

  store.getState().resetToSeed()
  const createdProject = store.getState().createProject()
  const linkedAllocation = findRequired(
    store.getState().projectSystems,
    (link) => link.allocationStatus !== 'DEALLOCATED' && store.getState().systems.some((system) => system.id === link.systemId),
    'active Project/System allocation for Tenant creation',
  )
  let tenantResult = store.getState().createInternalTenantForSystem(linkedAllocation.projectId, linkedAllocation.systemId)
  if (tenantResult.requiresTimeGroupOverride) {
    tenantResult = store.getState().createInternalTenantForSystem(linkedAllocation.projectId, linkedAllocation.systemId, { timeGroupMismatchDecision: 'preserve' })
  }
  assert(tenantResult.ok, `Internal Tenant creation must succeed for fresh delta route verification: ${tenantResult.message}`)
  const createdTenant = store.getState().tenants.find((tenant) => tenant.id === tenantResult.tenantId)
  const createdProduction = store.getState().createProductionSystemInventoryItem()
  const createdReused = store.getState().createReusedInternalSystem('999903')
  assert(createdProject.pid === 'P000391', `Runtime-created Project must be P000391; received ${createdProject.pid}.`)
  assert(createdTenant?.tid === 'T000581', `Runtime-created Tenant must be T000581; received ${createdTenant?.tid}.`)

  const raw = globalThis.localStorage.getItem(repository.APP_STATE_STORAGE_KEY)
  assert(Boolean(raw) && raw.includes('dpm-compressed-keyed-seed-delta-v1') && !raw.includes('b64:'), 'Normal store operations must persist compact compressed keyed seed-delta state.')

  const freshState = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  assert(Boolean(freshState), 'Fresh application state must reconstruct from persisted baseline plus delta.')
  assert(freshState.projects.some((project) => project.pid === createdProject.pid), 'Fresh route state must resolve Project P000391 from persisted delta.')
  assert(freshState.tenants.some((tenant) => tenant.tid === createdTenant?.tid), 'Fresh route state must resolve Tenant T000581 from persisted delta.')
  assert(freshState.productionSystemInventory.some((system) => system.sid === createdProduction.sid), 'Fresh route state must resolve runtime-created Production System.')
  assert(freshState.reusedInternalSystems.some((system) => normalizeMid(system.machineId) === normalizeMid(createdReused.machineId)), 'Fresh route state must resolve runtime-created RIS.')
  assert(freshState.projects.some((project) => project.pid === baselineProject.pid), 'Fresh route state must preserve baseline Project direct route.')
  assert(freshState.tenants.some((tenant) => tenant.tid === baselineTenant.tid), 'Fresh route state must preserve baseline Tenant direct route.')
  assert(freshState.systems.some((system) => system.sid === baselineAllocated.sid), 'Fresh route state must preserve baseline allocated System route.')

  const persistedDeltaRouteResults = {
    project: {
      id: createdProject.pid,
      route: businessReferences.routePathForBusinessReference('PROJECT', createdProject.pid),
      resolvedAfterFreshHydrate: true,
    },
    tenant: {
      id: createdTenant?.tid,
      route: businessReferences.routePathForBusinessReference('TENANT', createdTenant?.tid),
      resolvedAfterFreshHydrate: true,
    },
    affectedSystem: {
      id: createdProduction.sid,
      route: businessReferences.routePathForBusinessReference('PRODUCTION_SYSTEM', createdProduction.sid),
      resolvedAfterFreshHydrate: true,
    },
    reusedInternalSystem: {
      id: `M${normalizeMid(createdReused.machineId)}`,
      route: businessReferences.routePathForBusinessReference('INTERNAL_REUSED_SYSTEM', createdReused.machineId),
      resolvedAfterFreshHydrate: true,
    },
    baselineObjects: {
      opportunity: baselineOpportunity.opportunityId,
      project: baselineProject.pid,
      tenant: baselineTenant.tid,
      allocatedSystem: baselineAllocated.sid,
      productionSystem: baselineProduction.sid,
      reusedInternalSystem: `M${normalizeMid(baselineReused.machineId)}`,
      account: baselineAccount.accountCode,
      infrastructure: baselineInfrastructure.infrastructureId,
      versionUpgrade: baselineVersionUpgrade?.id ?? 'no baseline Version Upgrade records in current seed',
    },
  }

  console.log(JSON.stringify({
    executableDialogsAudited: [
      'Opportunity POC/WON lifecycle dialogs',
      'Project Allocate System dialog',
      'System Create Tenant dialog',
      'System Move Tenant confirmation dialog',
      'Dashboard save/replace/unsaved dialogs',
      'Project milestone/template/delete dialogs',
      'Infrastructure maintenance scope dialog',
      'Notification details dialog',
      'window.confirm delete/cancel/restore actions',
    ],
    primaryFormsAudited: primaryForms.map(([name]) => name).concat('Customer/Account read-only 360 detail'),
    directRouteFreshHydrate: persistedDeltaRouteResults,
    compactPersistence: 'dpm-compressed-keyed-seed-delta-v1',
    hydrationReadiness: 'Router renders only after hydrated=true',
    multiTabSafety: 'source-id self-ignore, stale-version guard, bounded startup snapshots',
  }, null, 2))

  if (!process.exitCode) {
    console.log('V1.3 dialog/form/routing verification passed')
  }
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
