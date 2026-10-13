import process from 'node:process'
import { createServer } from 'vite'

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 deterministic baseline delta verification failed: ${message}`)
    process.exitCode = 1
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function stableJson(value) {
  return JSON.stringify(value)
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

function payloadLength(map, key) {
  return map.get(key)?.length ?? 0
}

function changedCollections(projection) {
  return projection.collections.filter((collection) =>
    collection.upsertCount > 0 || collection.deletedCount > 0 || collection.fullCount > 0
  )
}

function summarizeProjection(projection) {
  const changed = changedCollections(projection)
  return {
    fullStateLength: projection.fullStateLength,
    rawDeltaLength: projection.rawDeltaLength,
    keyedDeltaLength: projection.keyedDeltaLength,
    compressedPayloadLength: projection.compressedPayloadLength,
    serializedPayloadLength: projection.serializedPayloadLength,
    totalUpserts: changed.reduce((sum, collection) => sum + collection.upsertCount, 0),
    totalDeletes: changed.reduce((sum, collection) => sum + collection.deletedCount, 0),
    totalFullRecords: changed.reduce((sum, collection) => sum + collection.fullCount, 0),
    collections: changed.map((collection) => ({
      key: collection.key,
      currentCount: collection.currentCount,
      baselineCount: collection.baselineCount,
      upsertCount: collection.upsertCount,
      deletedCount: collection.deletedCount,
      fullCount: collection.fullCount,
      serializedLength: collection.serializedLength,
      sampleDiffPaths: collection.sampleDiffPaths,
    })),
  }
}

function assertNoBusinessDelta(projection, label) {
  const changed = changedCollections(projection)
  assert(
    changed.length === 0,
    `${label} must not materialize unchanged baseline collections; found ${changed
      .map((collection) => `${collection.key}:${collection.upsertCount}/${collection.deletedCount}/${collection.fullCount}`)
      .join(', ')}.`,
  )
}

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const storageMap = new Map()
  const storage = storageAdapter(storageMap)
  globalThis.localStorage = storage
  globalThis.sessionStorage = storageAdapter(new Map())

  const repository = await server.ssrLoadModule('/src/platform/persistence/app-state-repository.ts')
  const migration = await server.ssrLoadModule('/src/platform/persistence/app-state-migration.ts')
  const seedModule = await server.ssrLoadModule('/src/data/seed.json')
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const opportunityAdapters = await server.ssrLoadModule('/src/domain/opportunity-lifecycle/adapters.ts')
  const { useAppStore } = storeModule

  const seedState = migration.normalizeAppDataState({
    ...clone(seedModule.default),
    lastPersistedAt: null,
  })
  const normalizedAgain = migration.normalizeAppDataState(clone(seedState))
  assert(
    stableJson(seedState) === stableJson(normalizedAgain),
    'normalize(normalize(seed)) must be idempotent.',
  )

  useAppStore.getState().resetToSeed()
  const zeroMutationProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  assertNoBusinessDelta(zeroMutationProjection, 'Fresh reset-to-seed projection')

  repository.persistAppDataStateToStorage(useAppStore.getState(), storage)
  const firstPersistedPayload = storageMap.get(repository.APP_STATE_STORAGE_KEY)
  const reconstructed = repository.loadAppDataStateFromStorage(storage)
  assert(Boolean(firstPersistedPayload), 'Zero-change baseline state must persist a compact payload envelope.')
  assert(Boolean(reconstructed), 'Zero-change baseline payload must reconstruct.')
  const reconstructedProjection = repository.analyzeAppDataStateStorageProjection(reconstructed)
  assertNoBusinessDelta(reconstructedProjection, 'Reconstructed zero-change projection')
  repository.persistAppDataStateToStorage(reconstructed, storage)
  const secondPersistedPayload = storageMap.get(repository.APP_STATE_STORAGE_KEY)
  assert(
    firstPersistedPayload === secondPersistedPayload,
    'reconstruct -> persist -> reconstruct -> persist must stabilize without changing persisted bytes.',
  )
  assert(
    typeof firstPersistedPayload === 'string' &&
      firstPersistedPayload.includes('dpm-compressed-keyed-seed-delta-v1') &&
      !firstPersistedPayload.includes('b64:'),
    'Zero-change persisted payload must use the current compressed keyed delta format, not base64 wrapping.',
  )

  storageMap.clear()
  useAppStore.getState().resetToSeed()
  useAppStore.getState().saveToStorage()
  const cleanBeforeOpportunityPayload = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const beforeOpportunityProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  assertNoBusinessDelta(beforeOpportunityProjection, 'Before Opportunity business mutation')

  const draft = opportunityAdapters.createOpportunityDraft(
    useAppStore.getState().accounts,
    useAppStore.getState().salesManagers,
    '2026-09-29T08:00:00.000Z',
    'POC',
    'PAID',
  )
  const savedOpportunity = useAppStore.getState().saveOpportunityWithProjectSync({
    ...draft,
    opportunityName: 'Deterministic baseline delta POC control',
    stage: 'POC',
    type: 'POC',
    subType: 'PAID',
    pocStartDate: '2026-10-01',
    pocEndDate: '2026-10-15',
  }, undefined, { pocAction: 'CREATE_NEW_POC' }, { preserveNewState: true })

  const afterOpportunityProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  const afterOpportunityCollections = changedCollections(afterOpportunityProjection)
  const afterOpportunityByKey = new Map(afterOpportunityCollections.map((collection) => [collection.key, collection]))
  const cleanAfterOpportunityPayload = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const createdProject = useAppStore.getState().projects.find((project) => project.id === savedOpportunity.projectChanges[0]?.projectId)
  const createdOpportunity = useAppStore.getState().opportunities.find((opportunity) => opportunity.id === savedOpportunity.opportunity.id)

  assert(!savedOpportunity.messages?.length, 'Clean Opportunity Create New POC must complete without messages.')
  assert(savedOpportunity.projectChanges.length === 1, 'Clean Opportunity Create New POC must create exactly one Project.')
  assert(createdProject?.pid === 'P000391', `Clean Opportunity Create New POC must create P000391; received ${createdProject?.pid}.`)
  assert(createdOpportunity?.opportunityId === 'OPP000391', `Clean Opportunity Create New POC must save OPP000391; received ${createdOpportunity?.opportunityId}.`)
  assert(afterOpportunityCollections.length === 3, `Opportunity/POC Save must only change Projects, Opportunities, and Activity Events; found ${afterOpportunityCollections.map((collection) => collection.key).join(', ')}.`)
  assert(afterOpportunityByKey.get('projects')?.upsertCount === 1, 'Opportunity/POC Save must persist exactly one Project upsert.')
  assert(afterOpportunityByKey.get('opportunities')?.upsertCount === 1, 'Opportunity/POC Save must persist exactly one Opportunity upsert.')
  assert(afterOpportunityByKey.get('activityEvents')?.upsertCount === 2, 'Opportunity/POC Save must persist exactly two Activity Event upserts.')
  assert(
    afterOpportunityCollections.every((collection) => collection.deletedCount === 0 && collection.fullCount === 0),
    'Opportunity/POC Save must not create deletes or full collection fallbacks.',
  )
  assert(cleanAfterOpportunityPayload < 4_500_000, 'Opportunity/POC final persisted payload must remain below common browser quota.')

  const projectBeforeFirstSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const firstProjectSave = useAppStore.getState().updateProject(createdProject.id, {
    projectComments: '<p>Deterministic baseline first Project save.</p>',
  })
  const projectAfterFirstSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const afterFirstProjectProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  const secondProjectSave = useAppStore.getState().updateProject(createdProject.id, {
    projectComments: '<p>Deterministic baseline second Project save.</p>',
  })
  const projectAfterSecondSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const afterSecondProjectProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  assert(firstProjectSave?.id === createdProject.id, 'New Project first Save must commit.')
  assert(secondProjectSave?.id === createdProject.id, 'New Project second Save must commit.')
  assert(
    changedCollections(afterFirstProjectProjection).every((collection) => ['projects', 'opportunities', 'activityEvents'].includes(collection.key)),
    'New Project first Save must not materialize unrelated baseline collections.',
  )
  assert(
    changedCollections(afterSecondProjectProjection).every((collection) => ['projects', 'opportunities', 'activityEvents'].includes(collection.key)),
    'New Project second Save must not materialize unrelated baseline collections.',
  )
  assert(projectAfterSecondSave < 4_500_000, 'New Project repeated Save payload must remain below common browser quota.')

  const p000390 = useAppStore.getState().projects.find((project) => project.pid === 'P000390')
  assert(Boolean(p000390), 'P000390 must exist for save regression coverage.')
  const p000390BeforeSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const savedP000390 = useAppStore.getState().updateProject(p000390.id, {
    projectComments: '<p>Deterministic baseline P000390 Project save.</p>',
  })
  const p000390AfterSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const afterP000390Projection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  assert(savedP000390?.pid === 'P000390', 'P000390 Save must commit.')
  assert(
    changedCollections(afterP000390Projection).every((collection) => ['projects', 'opportunities', 'activityEvents'].includes(collection.key)),
    'P000390 Save must not materialize unrelated baseline collections.',
  )
  assert(p000390AfterSave < 4_500_000, 'P000390 Save payload must remain below common browser quota.')

  console.log(JSON.stringify({
    zeroMutation: summarizeProjection(zeroMutationProjection),
    reconstructedZeroMutation: summarizeProjection(reconstructedProjection),
    persistenceStability: {
      firstPayloadLength: firstPersistedPayload?.length ?? 0,
      secondPayloadLength: secondPersistedPayload?.length ?? 0,
      byteStable: firstPersistedPayload === secondPersistedPayload,
      format: 'dpm-compressed-keyed-seed-delta-v1',
    },
    opportunityPocMutation: {
      opportunityId: createdOpportunity?.opportunityId,
      projectId: createdProject?.pid,
      cleanBeforeOpportunityPayload,
      cleanAfterOpportunityPayload,
      projection: summarizeProjection(afterOpportunityProjection),
    },
    projectSavePayloads: {
      newProjectBeforeFirstSave: projectBeforeFirstSave,
      newProjectAfterFirstSave: projectAfterFirstSave,
      newProjectAfterSecondSave: projectAfterSecondSave,
      p000390BeforeSave,
      p000390AfterSave,
    },
  }, null, 2))

  if (!process.exitCode) {
    console.log('V1.3 deterministic baseline delta verification passed')
  }
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
