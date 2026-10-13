import { performance } from 'node:perf_hooks'
import process from 'node:process'
import { createServer } from 'vite'

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 performance profile verification failed: ${message}`)
    process.exitCode = 1
  }
}

function storageAdapter(map, metrics) {
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      const startedAt = performance.now()
      map.set(key, String(value))
      metrics.localStorageWrites += 1
      metrics.localStorageWriteMs += performance.now() - startedAt
    },
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    key: (index) => Array.from(map.keys())[index] ?? null,
    get length() {
      return map.size
    },
  }
}

function payloadLength(map, key) {
  return map.get(key)?.length ?? 0
}

function completeProjectTasks(project) {
  return {
    tasks: (project.tasks ?? []).map((task) => ({ ...task, status: 'DONE' })),
    milestones: (project.milestones ?? []).map((milestone) => ({ ...milestone, status: 'DONE' })),
  }
}

function changedCollectionSummary(projection) {
  return projection.collections
    .filter((collection) => collection.upsertCount || collection.deletedCount || collection.fullCount)
    .map((collection) => ({
      key: collection.key,
      upserts: collection.upsertCount,
      deletes: collection.deletedCount,
      full: collection.fullCount,
      serializedLength: collection.serializedLength,
    }))
}

function nowMs() {
  return performance.now()
}

function duration(startedAt) {
  return Number((performance.now() - startedAt).toFixed(3))
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const metrics = { localStorageWrites: 0, localStorageWriteMs: 0 }
  const storageMap = new Map()
  globalThis.localStorage = storageAdapter(storageMap, metrics)
  globalThis.sessionStorage = storageAdapter(new Map(), { localStorageWrites: 0, localStorageWriteMs: 0 })

  const repository = await server.ssrLoadModule('/src/platform/persistence/app-state-repository.ts')
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const opportunityAdapters = await server.ssrLoadModule('/src/domain/opportunity-lifecycle/adapters.ts')
  const allocationContext = await server.ssrLoadModule('/src/domain/allocation-context/service.ts')
  const allocationValidation = await server.ssrLoadModule('/src/domain/allocation-context/validation.ts')
  const { useAppStore } = storeModule

  function operation(name, fn) {
    const beforeWrites = metrics.localStorageWrites
    const beforeWriteMs = metrics.localStorageWriteMs
    const beforePayload = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
    const startedAt = nowMs()
    const result = fn()
    const totalMs = duration(startedAt)
    const projectionStartedAt = nowMs()
    const projection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
    const projectionMs = duration(projectionStartedAt)
    const profile = repository.profileAppDataStateStorageProjection(useAppStore.getState())
    const afterPayload = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
    return {
      name,
      totalMs,
      projectionMs,
      persistenceProfileMs: Object.fromEntries(
        Object.entries(profile.timingsMs).map(([key, value]) => [key, Number(value.toFixed(3))]),
      ),
      localStorageWrites: metrics.localStorageWrites - beforeWrites,
      localStorageWriteMs: Number((metrics.localStorageWriteMs - beforeWriteMs).toFixed(3)),
      payloadBefore: beforePayload,
      payloadAfter: afterPayload,
      changedCollections: changedCollectionSummary(projection),
      result,
    }
  }

  useAppStore.getState().resetToSeed()
  const idleProfile = repository.profileAppDataStateStorageProjection(useAppStore.getState())
  const zeroProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  assert(changedCollectionSummary(zeroProjection).length === 0, 'Idle zero-change projection must remain free of business deltas.')

  const baselineSave = operation('baseline saveToStorage', () => {
    useAppStore.getState().saveToStorage()
    return { ok: true }
  })

  const ordinaryNavigationClick = operation('ordinary navigation/click read-model sample', () => {
    const state = useAppStore.getState()
    const project = state.projects.find((candidate) => candidate.pid === 'P000390') ?? state.projects[0]
    return {
      projectFound: Boolean(project),
      linkedSystems: state.projectSystems.filter((link) => link.projectId === project?.id).length,
      linkedTenants: state.projectTenants.filter((link) => link.projectId === project?.id).length,
    }
  })

  function createPocProject(name, startDate, endDate) {
    const state = useAppStore.getState()
    const draft = opportunityAdapters.createOpportunityDraft(
      state.accounts,
      state.salesManagers,
      '2026-09-29T08:00:00.000Z',
      'POC',
      'PAID',
    )
    const saved = useAppStore.getState().saveOpportunityWithProjectSync({
      ...draft,
      opportunityName: name,
      stage: 'POC',
      type: 'POC',
      subType: 'PAID',
      country: 'Singapore',
      state: '',
      pocStartDate: startDate,
      pocEndDate: endDate,
    }, undefined, { pocAction: 'CREATE_NEW_POC' }, { preserveNewState: true })
    const project = useAppStore.getState().projects.find((candidate) => candidate.id === saved.projectChanges[0]?.projectId)
    return { saved, project }
  }

  const opportunitySave = operation('Opportunity Save -> Create New POC', () => createPocProject('Performance profile POC', '2026-10-01', '2026-10-15'))
  const firstProject = opportunitySave.result.project
  assert(Boolean(firstProject), 'Performance profile POC Project must exist.')

  const projectSave = operation('Project Save', () =>
    useAppStore.getState().updateProject(firstProject.id, {
      projectComments: '<p>Performance profile Project save.</p>',
    }),
  )

  const availableMid = allocationContext.availableReusedInternalCandidates(
    useAppStore.getState().reusedInternalSystems,
    useAppStore.getState().projectSystems,
    useAppStore.getState().projects,
    useAppStore.getState().systems,
  ).find((system) => !allocationValidation.validateReusedInternalAllocation({ projectId: firstProject.id, systemId: system.id }, useAppStore.getState()))
  assert(Boolean(availableMid), 'Performance profile requires an available RIS MID.')
  const risAllocation = operation('RIS allocation', () =>
    useAppStore.getState().allocateReusedInternalSystemToProject(firstProject.id, availableMid.id),
  )
  assert(risAllocation.result.ok, `RIS allocation must succeed: ${risAllocation.result.message}`)
  const allocation = useAppStore.getState().projectSystems.find((link) => link.id === risAllocation.result.allocationId)
  const allocatedSystem = useAppStore.getState().systems.find((system) => system.id === allocation?.systemId)
  assert(Boolean(allocatedSystem), 'Allocated RIS System must exist for profiling.')

  const tenantCreation = operation('Tenant creation', () => {
    let result = useAppStore.getState().createInternalTenantForSystem(firstProject.id, allocatedSystem.id)
    if (result.requiresTimeGroupOverride) {
      result = useAppStore.getState().createInternalTenantForSystem(firstProject.id, allocatedSystem.id, { timeGroupMismatchDecision: 'preserve' })
    }
    return result
  })
  assert(tenantCreation.result.ok, `Tenant creation must succeed: ${tenantCreation.result.message}`)

  const systemSave = operation('System Save', () =>
    useAppStore.getState().saveSystemFormTransaction('allocated', allocatedSystem.id, {
      ...allocatedSystem,
      mapCenter: 'Performance profile map center',
    }),
  )
  assert(Boolean(systemSave.result), 'System Save must commit.')

  const tenant = useAppStore.getState().tenants.find((candidate) => candidate.id === tenantCreation.result.tenantId)
  const tenantSave = operation('Tenant Save', () =>
    useAppStore.getState().updateTenant(tenant.id, {
      mapCenter: 'Performance profile tenant map center',
    }),
  )
  assert(Boolean(tenantSave.result), 'Tenant Save must commit.')

  const completionRelease = operation('Project completion / RIS release', () =>
    useAppStore.getState().updateProject(firstProject.id, completeProjectTasks(useAppStore.getState().projects.find((project) => project.id === firstProject.id))),
  )
  assert(completionRelease.result?.progressStatus === 'DONE', 'Project completion / RIS release must mark Project Done.')

  const repeatedProjectionStartedAt = nowMs()
  const repeatedProfiles = Array.from({ length: 3 }, () => repository.profileAppDataStateStorageProjection(useAppStore.getState()))
  const repeatedProjectionMs = duration(repeatedProjectionStartedAt)
  const finalProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())

  const operations = [
    baselineSave,
    ordinaryNavigationClick,
    opportunitySave,
    projectSave,
    risAllocation,
    tenantCreation,
    systemSave,
    tenantSave,
    completionRelease,
  ]

  operations.forEach((entry) => {
    assert(entry.localStorageWrites <= 2, `${entry.name} should not trigger repeated localStorage writes; observed ${entry.localStorageWrites}.`)
    assert(entry.payloadAfter < 4_500_000, `${entry.name} payload must stay below common browser quota.`)
  })
  assert(ordinaryNavigationClick.localStorageWrites === 0, 'Ordinary navigation/click read-model sample must not write persistence.')

  console.log(JSON.stringify({
    environment: 'Node/Vite SSR timing profile; React render and real Chrome DevTools timings still need browser capture for UI-thread attribution.',
    idleZeroChange: {
      rawDeltaLength: zeroProjection.rawDeltaLength,
      keyedDeltaLength: zeroProjection.keyedDeltaLength,
      compressedPayloadLength: zeroProjection.compressedPayloadLength,
      serializedPayloadLength: zeroProjection.serializedPayloadLength,
      persistenceProfileMs: Object.fromEntries(Object.entries(idleProfile.timingsMs).map(([key, value]) => [key, Number(value.toFixed(3))])),
    },
    operations: operations.map(({ result, ...entry }) => ({
      ...entry,
      result: typeof result === 'object' && result
        ? {
            ok: 'ok' in result ? result.ok : undefined,
            message: 'message' in result ? result.message : undefined,
            pid: 'pid' in result ? result.pid : undefined,
            sid: 'sid' in result ? result.sid : undefined,
            tid: 'tid' in result ? result.tid : undefined,
          }
        : result,
    })),
    repeatedGlobalWorkSample: {
      threeProjectionProfilesTotalMs: repeatedProjectionMs,
      individualTotalsMs: repeatedProfiles.map((profile) => Number(profile.timingsMs.total.toFixed(3))),
      finalChangedCollections: changedCollectionSummary(finalProjection),
    },
    counters: {
      totalLocalStorageWrites: metrics.localStorageWrites,
      totalLocalStorageWriteMs: Number(metrics.localStorageWriteMs.toFixed(3)),
    },
    observations: {
      idle: 'No timer or storage write was triggered by the idle zero-change measurement itself.',
      typing: 'No keystroke-level browser event loop is exercised by this Node/Vite verifier; use Chrome Performance panel for React render attribution.',
      crossTab: 'This single-tab harness verifies write counts only. Multi-tab STATE_SNAPSHOT processing needs browser-level profiling with multiple tabs open.',
    },
  }, null, 2))

  if (!process.exitCode) {
    console.log('V1.3 performance profile verification passed')
  }
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
