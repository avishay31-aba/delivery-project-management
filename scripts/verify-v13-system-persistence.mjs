import { createServer } from 'vite'

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 System persistence verification failed: ${message}`)
    process.exitCode = 1
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function routeKey(value) {
  return String(value ?? '').replace(/^M/i, '')
}

function findRequired(items, predicate, label) {
  const item = items.find(predicate)
  assert(Boolean(item), `${label} must exist.`)
  return item
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const storeStorageMap = new Map()
  globalThis.localStorage = {
    getItem: (key) => storeStorageMap.get(key) ?? null,
    setItem: (key, value) => storeStorageMap.set(key, String(value)),
    removeItem: (key) => storeStorageMap.delete(key),
    clear: () => storeStorageMap.clear(),
    key: (index) => Array.from(storeStorageMap.keys())[index] ?? null,
    get length() {
      return storeStorageMap.size
    },
  }

  const repository = await server.ssrLoadModule('/src/platform/persistence/app-state-repository.ts')
  const migration = await server.ssrLoadModule('/src/platform/persistence/app-state-migration.ts')
  const seedModule = await server.ssrLoadModule('/src/data/seed.json')
  const seedState = migration.normalizeAppDataState({
    ...clone(seedModule.default),
    lastPersistedAt: null,
  })

  function roundTrip(state) {
    const storageMap = new Map()
    const storage = {
      getItem: (key) => storageMap.get(key) ?? null,
      setItem: (key, value) => storageMap.set(key, value),
      removeItem: (key) => storageMap.delete(key),
    }
    repository.persistAppDataStateToStorage(state, storage)
    const raw = storageMap.get(repository.APP_STATE_STORAGE_KEY)
    const loaded = repository.loadAppDataStateFromStorage(storage)
    return { raw, loaded }
  }

  const seededRis = findRequired(
    seedState.reusedInternalSystems,
    (system) => routeKey(system.machineId) === '000058' || system.id === 'M000058',
    'Seeded RIS M000058',
  )
  const seededProduction = findRequired(seedState.productionSystemInventory, (system) => Boolean(system.sid), 'Seeded Production Inventory System')
  const allocatedProduction = findRequired(seedState.systems, (system) => system.source !== 'Reused Internal Systems', 'Seeded allocated Production System')
  const allocatedRis = findRequired(seedState.systems, (system) => system.source === 'Reused Internal Systems', 'Seeded allocated RIS System')
  const seededProject = findRequired(seedState.projects, (project) => Boolean(project.pid), 'Seeded Project')
  const seededTenant = findRequired(seedState.tenants, (tenant) => Boolean(tenant.tid), 'Seeded Tenant')
  const seededInfrastructure = findRequired(seedState.infrastructureItems, (item) => Boolean(item.infrastructureId), 'Seeded Infrastructure Item')

  const timestamp = '2026-09-25T00:00:00.000Z'
  const editedState = {
    ...seedState,
    lastPersistedAt: timestamp,
    reusedInternalSystems: seedState.reusedInternalSystems.map((system) =>
      system.id === seededRis.id
        ? { ...system, usedInRegion: 'EMEA', mapCenter: 'Berlin', updatedAt: timestamp }
        : system,
    ),
    productionSystemInventory: seedState.productionSystemInventory.map((system) =>
      system.id === seededProduction.id
        ? { ...system, region: 'LATAM', mapCenter: 'Sao Paulo', updatedAt: timestamp }
        : system,
    ),
    systems: seedState.systems.map((system) =>
      system.id === allocatedProduction.id
        ? { ...system, region: 'NA', mapCenter: 'New York', updatedAt: timestamp }
        : system.id === allocatedRis.id
          ? { ...system, region: 'APAC', mapCenter: 'Singapore', updatedAt: timestamp }
          : system,
    ),
    projects: seedState.projects.map((project) =>
      project.id === seededProject.id ? { ...project, opportunityName: `${project.opportunityName} persistence smoke`, updatedAt: timestamp } : project,
    ),
    tenants: seedState.tenants.map((tenant) =>
      tenant.id === seededTenant.id ? { ...tenant, cancellationReason: 'Tenant persistence smoke', updatedAt: timestamp } : tenant,
    ),
    infrastructureItems: seedState.infrastructureItems.map((item) =>
      item.id === seededInfrastructure.id ? { ...item, owner: 'Persistence Smoke Owner', updatedAt: timestamp } : item,
    ),
  }

  const editedRoundTrip = roundTrip(editedState)
  assert(Boolean(editedRoundTrip.raw), 'Edited state must write a durable dpm-mvp-v1 payload.')
  assert(editedRoundTrip.raw.includes('dpm-compressed-keyed-seed-delta-v1') && !editedRoundTrip.raw.includes('b64:'), 'New compressed keyed seed-delta payload must use real compression rather than base64 wrapping.')
  assert(Boolean(editedRoundTrip.loaded), 'Edited state must hydrate after durable persistence.')

  const loadedEditedRis = editedRoundTrip.loaded?.reusedInternalSystems.find((system) => system.id === seededRis.id)
  const loadedEditedProduction = editedRoundTrip.loaded?.productionSystemInventory.find((system) => system.id === seededProduction.id)
  const loadedAllocatedProduction = editedRoundTrip.loaded?.systems.find((system) => system.id === allocatedProduction.id)
  const loadedAllocatedRis = editedRoundTrip.loaded?.systems.find((system) => system.id === allocatedRis.id)
  const loadedProject = editedRoundTrip.loaded?.projects.find((project) => project.id === seededProject.id)
  const loadedTenant = editedRoundTrip.loaded?.tenants.find((tenant) => tenant.id === seededTenant.id)
  const loadedInfrastructure = editedRoundTrip.loaded?.infrastructureItems.find((item) => item.id === seededInfrastructure.id)

  assert(loadedEditedRis?.usedInRegion === 'EMEA', 'Seeded RIS Used In Region edit must survive hydrate.')
  assert(loadedEditedRis?.mapCenter === 'Berlin', 'Seeded RIS ordinary editable field must survive hydrate.')
  assert(loadedEditedProduction?.region === 'LATAM', 'Seeded Production Inventory region edit must survive hydrate.')
  assert(loadedEditedProduction?.mapCenter === 'Sao Paulo', 'Seeded Production Inventory ordinary editable field must survive hydrate.')
  assert(loadedAllocatedProduction?.region === 'NA', 'Allocated Production System edit must survive hydrate.')
  assert(loadedAllocatedRis?.region === 'APAC', 'Allocated RIS System edit must survive hydrate.')
  assert(loadedProject?.opportunityName.endsWith('persistence smoke'), 'Project persistence smoke edit must survive hydrate.')
  assert(loadedTenant?.cancellationReason === 'Tenant persistence smoke', 'Tenant persistence smoke edit must survive hydrate.')
  assert(loadedInfrastructure?.owner === 'Persistence Smoke Owner', 'Infrastructure persistence smoke edit must survive hydrate.')

  const manualProduction = {
    ...seededProduction,
    id: 'prod-sys-persistence-smoke',
    sid: 'S999901',
    region: 'EMEA',
    mapCenter: 'Berlin',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const manualRis = {
    ...seededRis,
    id: 'reused-sys-persistence-smoke',
    machineId: '999901',
    purpose: 'None',
    status: 'Available',
    usedInRegion: 'NA',
    mapCenter: 'New York',
    currentProjectIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  const manualState = {
    ...editedState,
    lastPersistedAt: '2026-09-25T00:01:00.000Z',
    productionSystemInventory: [manualProduction, ...editedState.productionSystemInventory],
    reusedInternalSystems: [manualRis, ...editedState.reusedInternalSystems],
    projectSystems: [
      {
        id: 'project-system-persistence-smoke',
        projectId: seededProject.id,
        systemId: allocatedProduction.id,
        tenantIds: [],
        allocationStatus: 'ALLOCATED',
        allocationType: 'EXISTING_SYSTEM',
        allocationSources: ['MANUAL'],
        sourceMachineId: null,
        allocatedAt: timestamp,
        deallocatedAt: null,
      },
      ...editedState.projectSystems,
    ],
  }
  const manualRoundTrip = roundTrip(manualState)
  const loadedManualProduction = manualRoundTrip.loaded?.productionSystemInventory.find((system) => system.sid === manualProduction.sid)
  const loadedManualRis = manualRoundTrip.loaded?.reusedInternalSystems.find((system) => system.machineId === manualRis.machineId)
  const loadedRelationship = manualRoundTrip.loaded?.projectSystems.find((link) => link.id === 'project-system-persistence-smoke')

  assert(loadedManualProduction?.region === 'EMEA', 'Manually created Production Inventory System must survive hydrate.')
  assert(loadedManualRis?.usedInRegion === 'NA', 'Manually created RIS must survive hydrate.')
  assert(loadedManualRis?.status === 'Available', 'Manually created RIS derived availability state must reconstruct after hydrate.')
  assert(loadedRelationship?.systemId === allocatedProduction.id, 'System allocation relationship must survive hydrate.')

  storeStorageMap.clear()
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const store = storeModule.useAppStore
  store.getState().resetToSeed()
  const createdProduction = store.getState().createProductionSystemInventoryItem()
  const createdRis = store.getState().createReusedInternalSystem('999902')
  const savedProduction = store.getState().saveSystemFormTransaction('production', createdProduction.id, {
    ...createdProduction,
    usedInRegion: 'EMEA',
    cognitoRegion: 'EMEA',
    mapCenter: 'Berlin',
  })
  const savedRis = store.getState().saveSystemFormTransaction('reused', createdRis.id, {
    ...createdRis,
    usedInRegion: 'APAC',
    cognitoRegion: 'APAC',
    mapCenter: 'Singapore',
  })
  const storeHydrated = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  const storeHydratedProduction = storeHydrated?.productionSystemInventory.find((system) => system.id === createdProduction.id)
  const storeHydratedRis = storeHydrated?.reusedInternalSystems.find((system) => system.id === createdRis.id)

  assert(savedProduction?.usedInRegion === 'EMEA', 'Store Production System save transaction must return the committed edit.')
  assert(savedRis?.usedInRegion === 'APAC', 'Store RIS save transaction must return the committed edit.')
  assert(storeHydratedProduction?.mapCenter === 'Berlin', 'Store-created Production System must hydrate after normal create/save APIs.')
  assert(storeHydratedRis?.mapCenter === 'Singapore', 'Store-created RIS must hydrate after normal create/save APIs.')

  const sequentialRisMachineIds = ['000058', '000057', '000056', '000055', '000054']
  const sequentialRisResults = []
  for (const machineId of sequentialRisMachineIds) {
    const currentState = store.getState()
    const system = findRequired(
      currentState.reusedInternalSystems,
      (candidate) => routeKey(candidate.machineId) === machineId,
      `Sequential RIS ${machineId}`,
    )
    const nextRegion = system.usedInRegion === 'NA' ? 'EMEA' : 'NA'
    const committed = store.getState().saveSystemFormTransaction('reused', system.id, {
      ...system,
      cognitoRegion: nextRegion,
      usedInRegion: nextRegion,
    })
    sequentialRisResults.push({ machineId: `M${machineId}`, region: committed?.usedInRegion })
  }

  const sequentialProduction = findRequired(
    store.getState().productionSystemInventory,
    (system) => system.operationalStatus !== 'Canceled' && system.operationalStatus !== 'Cancelled',
    'Sequential Production Inventory System',
  )
  const sequentialProductionRegion = sequentialProduction.usedInRegion === 'NA' ? 'EMEA' : 'NA'
  const sequentialProductionCommitted = store.getState().saveSystemFormTransaction('production', sequentialProduction.id, {
    ...sequentialProduction,
    cognitoRegion: sequentialProductionRegion,
    usedInRegion: sequentialProductionRegion,
  })

  const sequentialHydrated = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  for (const result of sequentialRisResults) {
    const hydratedSystem = sequentialHydrated?.reusedInternalSystems.find((system) => `M${routeKey(system.machineId)}` === result.machineId)
    assert(hydratedSystem?.usedInRegion === result.region, `Sequential save for ${result.machineId} must survive hydrate.`)
  }
  const sequentialProductionHydrated = sequentialHydrated?.productionSystemInventory.find((system) => system.id === sequentialProduction.id)
  assert(
    sequentialProductionHydrated?.usedInRegion === sequentialProductionCommitted?.usedInRegion,
    'Sequential mixed Production System save must survive hydrate.',
  )

  console.log(JSON.stringify({
    persistenceFormat: 'dpm-compressed-keyed-seed-delta-v1',
    safePayloadEncoding: 'compressed-string',
    seededSystemTypes: {
      reusedInternalSystem: {
        id: seededRis.id,
        machineId: seededRis.machineId,
        usedInRegionAfterHydrate: loadedEditedRis?.usedInRegion,
        mapCenterAfterHydrate: loadedEditedRis?.mapCenter,
      },
      productionInventorySystem: {
        id: seededProduction.id,
        sid: seededProduction.sid,
        regionAfterHydrate: loadedEditedProduction?.region,
        mapCenterAfterHydrate: loadedEditedProduction?.mapCenter,
      },
      allocatedProductionSystem: {
        id: allocatedProduction.id,
        sid: allocatedProduction.sid,
        regionAfterHydrate: loadedAllocatedProduction?.region,
      },
      allocatedReusedInternalSystem: {
        id: allocatedRis.id,
        sid: allocatedRis.sid,
        machineId: allocatedRis.machineId,
        regionAfterHydrate: loadedAllocatedRis?.region,
      },
    },
    manuallyCreatedSystems: {
      productionInventorySystem: loadedManualProduction ? loadedManualProduction.sid : null,
      reusedInternalSystem: loadedManualRis ? `M${loadedManualRis.machineId}` : null,
    },
    normalStoreCreateSaveApis: {
      productionInventorySystem: storeHydratedProduction?.sid ?? null,
      reusedInternalSystem: storeHydratedRis ? `M${storeHydratedRis.machineId}` : null,
    },
    consecutiveStoreSaves: {
      reusedInternalSystems: sequentialRisResults,
      productionInventorySystem: {
        sid: sequentialProductionCommitted?.sid,
        region: sequentialProductionCommitted?.usedInRegion,
      },
    },
    relationshipPersistence: {
      projectSystemLink: Boolean(loadedRelationship),
    },
    rootObjectSmoke: {
      project: Boolean(loadedProject?.opportunityName.endsWith('persistence smoke')),
      tenant: loadedTenant?.cancellationReason === 'Tenant persistence smoke',
      infrastructure: loadedInfrastructure?.owner === 'Persistence Smoke Owner',
    },
  }, null, 2))

  if (!process.exitCode) {
    console.log('V1.3 System persistence verification passed')
  }
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
