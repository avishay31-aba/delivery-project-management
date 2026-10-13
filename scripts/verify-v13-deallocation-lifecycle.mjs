import process from 'node:process'
import { createServer } from 'vite'

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 deallocation lifecycle verification failed: ${message}`)
    process.exitCode = 1
  }
}

function storageAdapter(map) {
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    },
  }
}

function createProject(useAppStore, opportunityAdapters, type, subType, stage, name, patch = {}) {
  const state = useAppStore.getState()
  const draft = opportunityAdapters.createOpportunityDraft(
    state.accounts,
    state.salesManagers,
    '2026-10-08T08:00:00.000Z',
    type,
    subType,
  )
  const saved = useAppStore.getState().saveOpportunityWithProjectSync({
    ...draft,
    opportunityName: name,
    stage,
    type,
    subType,
    country: 'Singapore',
    state: '',
    ...patch,
  }, undefined, stage === 'POC' ? { pocAction: 'CREATE_NEW_POC' } : undefined, { preserveNewState: true })
  const project = useAppStore.getState().projects.find((candidate) => candidate.id === saved.projectChanges[0]?.projectId)
  assert(Boolean(project), `${name} Project must be created.`)
  return project
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const storageMap = new Map()
  globalThis.localStorage = storageAdapter(storageMap)
  globalThis.sessionStorage = storageAdapter(new Map())

  const repository = await server.ssrLoadModule('/src/platform/persistence/app-state-repository.ts')
  const migration = await server.ssrLoadModule('/src/platform/persistence/app-state-migration.ts')
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const opportunityAdapters = await server.ssrLoadModule('/src/domain/opportunity-lifecycle/adapters.ts')
  const allocationContext = await server.ssrLoadModule('/src/domain/allocation-context/service.ts')
  const allocationValidation = await server.ssrLoadModule('/src/domain/allocation-context/validation.ts')
  const projectLifecycle = await server.ssrLoadModule('/src/domain/project-lifecycle/service.ts')
  const systemInventory = await server.ssrLoadModule('/src/domain/system-inventory/service.ts')
  const systemMetadata = await server.ssrLoadModule('/src/domain/system-inventory/metadata.ts')
  const { useAppStore } = storeModule

  function currentProjectSystemLinks(projectId) {
    return allocationContext.activeSystemLinksForProject(projectId, useAppStore.getState().projectSystems)
  }

  function currentProjectSystems(project) {
    const state = useAppStore.getState()
    return projectLifecycle.linkedSystemsForProject(
      project,
      state.systems,
      currentProjectSystemLinks(project.id),
      state.opportunities.find((opportunity) => opportunity.opportunityId === project.opportunityId),
      state.tenants,
      state.projectSystems,
    )
  }

  function assertNoCurrentProjectSystems(project, label) {
    assert(currentProjectSystemLinks(project.id).length === 0, `${label}: Project must have zero active project-system links.`)
    assert(currentProjectSystems(project).length === 0, `${label}: Project current Allocated Systems projection must have zero rows.`)
  }

  function reloadStoreFromStorage() {
    const loaded = repository.loadAppDataStateFromStorage(localStorage)
    assert(Boolean(loaded), 'Persisted app state must reload.')
    useAppStore.setState(loaded)
  }

  useAppStore.getState().resetToSeed()

  const pocProject = createProject(
    useAppStore,
    opportunityAdapters,
    'POC',
    'PAID',
    'POC',
    'Deallocation lifecycle POC',
    { pocStartDate: '2026-10-09', pocEndDate: '2026-10-23' },
  )
  const mid = useAppStore.getState().createReusedInternalSystem('999904')

  for (let cycle = 1; cycle <= 3; cycle += 1) {
    const allocationResult = useAppStore.getState().allocateReusedInternalSystemToProject(pocProject.id, mid.id)
    assert(allocationResult.ok, `RIS cycle ${cycle}: allocation must succeed: ${allocationResult.message}`)
    const allocatedLink = useAppStore.getState().projectSystems.find((link) => link.id === allocationResult.allocationId)
    const sid = useAppStore.getState().systems.find((system) => system.id === allocatedLink?.systemId)
    assert(Boolean(allocatedLink), `RIS cycle ${cycle}: allocation link must exist.`)
    assert(Boolean(sid), `RIS cycle ${cycle}: active SID must exist.`)
    assert(currentProjectSystemLinks(pocProject.id).length === 1, `RIS cycle ${cycle}: Project must have one active allocation after allocation.`)

    const deallocationResult = useAppStore.getState().deallocateProjectSystem(allocationResult.allocationId)
    assert(deallocationResult.ok, `RIS cycle ${cycle}: deallocation must succeed: ${deallocationResult.message}`)
    assertNoCurrentProjectSystems(pocProject, `RIS cycle ${cycle}`)

    const state = useAppStore.getState()
    const currentMid = state.reusedInternalSystems.find((system) => system.id === mid.id)
    assert(currentMid?.purpose === systemMetadata.REUSED_INTERNAL_PURPOSE_NONE, `RIS cycle ${cycle}: MID Purpose must return to None.`)
    assert(currentMid?.status === systemMetadata.REUSED_INTERNAL_STATUS_AVAILABLE, `RIS cycle ${cycle}: MID Availability must return to Available.`)
    assert((currentMid?.currentProjectIds ?? []).length === 0, `RIS cycle ${cycle}: MID current Project allocation list must be empty.`)
    assert(systemInventory.currentSidForSystemRecord(currentMid, state.systems, state.projectSystems) === '', `RIS cycle ${cycle}: MID Current SID must be empty.`)
    assert(allocationContext.availableReusedInternalCandidates(state.reusedInternalSystems, state.projectSystems, state.projects, state.systems).some((system) => system.id === mid.id), `RIS cycle ${cycle}: MID must return to available RIS inventory.`)
    assert(state.projectSystems.filter((link) => link.projectId === pocProject.id && link.allocationType === 'REUSED_INTERNAL').length === cycle, `RIS cycle ${cycle}: historical RIS allocation links must be retained.`)
    assert(state.projectSystems.filter((link) => link.projectId === pocProject.id && link.allocationType === 'REUSED_INTERNAL').every((link) => link.allocationStatus === 'DEALLOCATED' && Boolean(link.deallocatedAt)), `RIS cycle ${cycle}: retained RIS allocation links must be historical/deallocated.`)

    reloadStoreFromStorage()
    assertNoCurrentProjectSystems(pocProject, `RIS cycle ${cycle} after reload`)
  }

  const productionProject = createProject(
    useAppStore,
    opportunityAdapters,
    'DELIVERY',
    'NEW',
    'WON',
    'Deallocation lifecycle Delivery',
    { deliveryDate: '2026-11-01' },
  )
  const productionInventoryItem = useAppStore.getState().createProductionSystemInventoryItem()
  const productionAllocationResult = useAppStore.getState().allocateProductionSystemToProject(productionProject.id, productionInventoryItem.id)
  assert(productionAllocationResult.ok, `Production allocation must succeed: ${productionAllocationResult.message}`)
  assert(currentProjectSystemLinks(productionProject.id).length === 1, 'Production Project must have one active allocation after allocation.')
  const productionDeallocationResult = useAppStore.getState().deallocateProjectSystem(productionAllocationResult.allocationId)
  assert(productionDeallocationResult.ok, `Production deallocation must succeed: ${productionDeallocationResult.message}`)
  assertNoCurrentProjectSystems(productionProject, 'Production cycle')
  const returnedProductionItem = useAppStore.getState().productionSystemInventory.find((system) => system.id === productionInventoryItem.id)
  assert(Boolean(returnedProductionItem), 'Production system must return to Production Inventory after deallocation.')
  assert(returnedProductionItem?.availability === systemMetadata.SYSTEM_AVAILABILITY_AVAILABLE, 'Returned Production system Availability must be Available.')
  assert(!useAppStore.getState().systems.some((system) => system.id === productionInventoryItem.id), 'Returned Production system must be removed from current allocated Systems.')
  assert(useAppStore.getState().projectSystems.some((link) => link.projectId === productionProject.id && link.systemId === productionInventoryItem.id && link.allocationStatus === 'DEALLOCATED'), 'Production historical allocation link must be retained separately.')

  reloadStoreFromStorage()
  assertNoCurrentProjectSystems(productionProject, 'Production cycle after reload')
  assert(useAppStore.getState().productionSystemInventory.some((system) => system.id === productionInventoryItem.id && system.availability === systemMetadata.SYSTEM_AVAILABILITY_AVAILABLE), 'Reloaded Production Inventory must retain returned Available system.')

  const staleState = useAppStore.getState()
  const historicalRisLink = staleState.projectSystems.find((link) => link.projectId === pocProject.id && link.allocationType === 'REUSED_INTERNAL')
  assert(Boolean(historicalRisLink), 'Historical RIS allocation link must exist for stale normalization check.')
  const staleNormalized = migration.normalizeAppDataState({
    ...staleState,
    projectSystems: staleState.projectSystems.map((link) =>
      link.id === historicalRisLink.id
        ? { ...link, allocationStatus: 'ALLOCATED', deallocatedAt: link.deallocatedAt ?? '2026-10-08T09:00:00.000Z' }
        : link,
    ),
  })
  assert(staleNormalized.projectSystems.find((link) => link.id === historicalRisLink.id)?.allocationStatus === 'DEALLOCATED', 'Persisted links with deallocatedAt must normalize retroactively to DEALLOCATED.')

  console.log('V1.3 deallocation lifecycle verification passed.')
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
