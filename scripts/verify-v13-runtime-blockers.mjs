import fs from 'node:fs'
import { createServer } from 'vite'

function read(path) {
  return fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 runtime blocker verification failed: ${message}`)
    process.exitCode = 1
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

function storageAdapter(map, quota = Number.POSITIVE_INFINITY) {
  const usedCharsAfterWrite = (key, value) =>
    Array.from(map.entries()).reduce(
      (sum, [entryKey, entryValue]) => sum + (entryKey === key ? String(value).length : String(entryValue).length),
      map.has(key) ? 0 : String(value).length,
    )
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      const nextValue = String(value)
      if (usedCharsAfterWrite(key, nextValue) > quota) {
        throw new DOMException(
          `Setting the value of '${key}' exceeded the quota.`,
          'QuotaExceededError',
        )
      }
      map.set(key, nextValue)
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

function routeLookup(state, route) {
  if (route.startsWith('/projects/')) return state.projects.find((project) => project.pid === route.split('/').at(-1))
  if (route.startsWith('/tenants/')) return state.tenants.find((tenant) => tenant.tid === route.split('/').at(-1))
  if (route.startsWith('/systems/production-inventory/')) return state.productionSystemInventory.find((system) => system.sid === route.split('/').at(-1))
  if (route.startsWith('/systems/reused-internal/')) {
    const mid = route.split('/').at(-1)?.replace(/^M/i, '').padStart(6, '0')
    return state.reusedInternalSystems.find((system) => String(system.machineId).replace(/^M/i, '').padStart(6, '0') === mid)
  }
  if (route.startsWith('/opportunities/')) return state.opportunities.find((opportunity) => opportunity.opportunityId === route.split('/').at(-1))
  return undefined
}

const opportunityForm = read('src/pages/opportunities/OpportunityFormPage.tsx')
const projectForm = read('src/pages/projects/ProjectFormPage.tsx')
const systemForm = read('src/pages/systems/SystemInventoryFormPages.tsx')
const storeSource = read('src/store/useAppStore.ts')
const repositorySource = read('src/platform/persistence/app-state-repository.ts')
const packageJson = JSON.parse(read('package.json'))

assert(
  opportunityForm.includes('if (isViewMode || isSaving) return') &&
    opportunityForm.includes('catch (error)') &&
    opportunityForm.includes('Opportunity could not be saved.') &&
    opportunityForm.includes('setPendingPocSave(null)') &&
    opportunityForm.includes('disabled={isSaving}'),
  'Opportunity POC flow must prevent duplicate execution, catch persistence failure, keep failed decisions open, and close only after successful Save.',
)

assert(
  storeSource.includes('saveOpportunityWithProjectSync: (opportunity, savedOpportunity, options, timestampOptions) => {') &&
    storeSource.includes('} catch (error) {\n      set(state)\n      throw error\n    }') &&
    storeSource.includes('updateProject: (id, patch, options) => {') &&
    storeSource.includes('const previousState = get()') &&
    storeSource.includes('set(previousState)'),
  'Opportunity and Project Save paths must roll back in-memory state when persistence fails.',
)

assert(
  repositorySource.includes('LEGACY_FULL_STATE_MAX_SAFE_CHARS') &&
    repositorySource.includes('CROSS_TAB_NOTIFICATION_STORAGE_KEY') &&
    repositorySource.includes('LEGACY_MIGRATION_TEMP_STORAGE_KEY') &&
    repositorySource.includes('inspectDpmStorage') &&
    repositorySource.includes('quota-before-retry') &&
    repositorySource.includes('removeObsoleteDpmStorage(storage)') &&
    repositorySource.includes('migrateLegacyFullStateToCompressedStorage') &&
    repositorySource.includes('decodeCompressedAppDataState') &&
    repositorySource.includes('raw.length > LEGACY_FULL_STATE_MAX_SAFE_CHARS'),
  'Oversized valid legacy full-state browser payloads must migrate transactionally into current compact delta persistence.',
)

assert(
  systemForm.includes('const hasActiveCurrentSid = isReusedInternalInventoryRecord') &&
    systemForm.includes("const hasMidAllocationLock = field.key === 'machineId' && hasActiveCurrentSid") &&
    systemForm.includes('!hasMidAllocationLock'),
  'RIS MID must be read-only when the inventory record has an active allocation with a current SID.',
)

assert(
  packageJson.scripts['verify:v13-runtime-blockers'] === 'node scripts/verify-v13-runtime-blockers.mjs',
  'package.json must expose verify:v13-runtime-blockers.',
)

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'silent',
})

try {
  const storageMap = new Map()
  globalThis.localStorage = storageAdapter(storageMap)

  const repository = await server.ssrLoadModule('/src/platform/persistence/app-state-repository.ts')
  const migration = await server.ssrLoadModule('/src/platform/persistence/app-state-migration.ts')
  const seedModule = await server.ssrLoadModule('/src/data/seed.json')
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const opportunityAdapters = await server.ssrLoadModule('/src/domain/opportunity-lifecycle/adapters.ts')
  const businessReferences = await server.ssrLoadModule('/src/domain/business-reference/service.ts')
  const { useAppStore } = storeModule
  const seedState = migration.normalizeAppDataState({ ...clone(seedModule.default), lastPersistedAt: null })

  const oldFullMap = new Map()
  const oldFullStorage = storageAdapter(oldFullMap)
  oldFullStorage.setItem(repository.APP_STATE_STORAGE_KEY, JSON.stringify({ ...seedState, lastPersistedAt: '2026-09-20T00:00:00.000Z' }))
  const oldFullBefore = payloadLength(oldFullMap, repository.APP_STATE_STORAGE_KEY)
  const migratedOldFull = repository.loadAppDataStateFromStorage(oldFullStorage)
  const oldFullAfter = payloadLength(oldFullMap, repository.APP_STATE_STORAGE_KEY)
  const oldFullAfterRaw = oldFullMap.get(repository.APP_STATE_STORAGE_KEY) ?? ''
  assert(oldFullBefore > 4_500_000, 'Simulated old full browser payload must exceed the previous safety threshold.')
  assert(migratedOldFull?.projects?.length === seedState.projects.length, 'Oversized valid legacy full browser payload must hydrate without data loss.')
  assert(oldFullAfter > 0 && oldFullAfter < oldFullBefore, 'Oversized valid legacy full browser payload must be compacted instead of removed.')
  assert(oldFullAfterRaw.includes('dpm-compressed-keyed-seed-delta-v1'), 'Migrated oversized legacy payload must use compressed keyed delta format.')
  assert(!oldFullMap.has('delivery-erp-legacy-state-migration-v1'), 'Temporary legacy migration payload must be cleaned up after verified migration.')

  const staleNotificationMap = new Map()
  const staleNotificationStorage = storageAdapter(staleNotificationMap, 4_500_000)
  staleNotificationMap.set('delivery-erp-state-sync-notification', JSON.stringify({
    type: 'STATE_SNAPSHOT',
    sourceId: 'legacy-tab',
    version: '2026-09-20T00:00:00.000Z',
    state: { ...seedState, filler: 'x'.repeat(1_000_000) },
  }))
  staleNotificationMap.set('dpm-dashboard-views-v1', JSON.stringify([{ id: 'valid-small-dashboard-preference' }]))
  repository.persistAppDataStateToStorage(seedState, staleNotificationStorage)
  const staleNotificationDiagnostics = repository.inspectDpmStorage(staleNotificationStorage)
  assert(payloadLength(staleNotificationMap, repository.APP_STATE_STORAGE_KEY) > 0, 'Quota recovery must persist compact app state after removing obsolete stale notification.')
  assert(payloadLength(staleNotificationMap, 'delivery-erp-state-sync-notification') === 0, 'Quota recovery must remove obsolete cross-tab STATE_SNAPSHOT notification.')
  assert(payloadLength(staleNotificationMap, 'dpm-dashboard-views-v1') > 0, 'Quota recovery must preserve valid small DPM storage entries.')
  assert(
    staleNotificationDiagnostics.some((entry) => entry.key === repository.APP_STATE_STORAGE_KEY && entry.format === 'dpm-compressed-keyed-seed-delta-v1'),
    'Recovered app state must be stored in the current compressed keyed seed-delta format.',
  )

  storageMap.clear()
  useAppStore.getState().resetToSeed()
  useAppStore.getState().saveToStorage()
  const baselineProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  const cleanBefore = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const draft = opportunityAdapters.createOpportunityDraft(
    useAppStore.getState().accounts,
    useAppStore.getState().salesManagers,
    '2026-09-29T08:00:00.000Z',
    'POC',
    'PAID',
  )
  const opportunityDraft = {
    ...draft,
    opportunityName: 'Runtime blocker clean POC control',
    stage: 'POC',
    type: 'POC',
    subType: 'PAID',
    pocStartDate: '2026-10-01',
    pocEndDate: '2026-10-15',
  }
  const beforeBusinessMutationProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  const created = useAppStore.getState().saveOpportunityWithProjectSync(opportunityDraft, undefined, { pocAction: 'CREATE_NEW_POC' }, { preserveNewState: true })
  const afterBusinessMutationProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  const cleanAfterOpportunity = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const growthRatio = cleanBefore > 0 ? cleanAfterOpportunity / cleanBefore : Number.POSITIVE_INFINITY
  const materializedCollections = afterBusinessMutationProjection.collections.filter((collection) => (
    collection.fullCount > 0 ||
    collection.upsertCount > Math.max(50, (baselineProjection.collections.find((candidate) => candidate.key === collection.key)?.upsertCount ?? 0) + 50)
  ))
  assert(!created.messages?.length, 'Clean Opportunity Create New POC must complete without messages.')
  assert(created.projectChanges.length === 1 && created.projectChanges[0].changeStatus === 'New', 'Create New POC must create exactly one Project.')
  assert(cleanBefore > 0, 'Baseline compact persisted payload must exist before Opportunity Save growth regression.')
  assert(cleanAfterOpportunity < 25_000, `Isolated Opportunity/POC Save must remain absolutely bounded; payload is ${cleanAfterOpportunity} chars.`)
  assert(afterBusinessMutationProjection.serializedPayloadLength < afterBusinessMutationProjection.fullStateLength / 4, 'Opportunity/POC Save must not materialize baseline-scale/full-state persistence payload.')
  assert(materializedCollections.length === 0, `Opportunity/POC Save unexpectedly materialized broad collection deltas: ${materializedCollections.map((collection) => `${collection.key}:${collection.upsertCount}/${collection.fullCount}`).join(', ')}.`)
  const createdProjectId = created.projectChanges[0].projectId
  const createdProject = useAppStore.getState().projects.find((project) => project.id === createdProjectId)
  const createdOpportunity = useAppStore.getState().opportunities.find((opportunity) => opportunity.id === created.opportunity.id)
  assert(Boolean(createdProject), 'Created POC Project must exist in the current SPA store.')
  assert(createdProject?.pid === 'P000391', `Clean control Project must be P000391 from current seed counters; received ${createdProject?.pid}.`)
  assert(createdOpportunity?.opportunityId === 'OPP000391', `Clean control Opportunity must be OPP000391; received ${createdOpportunity?.opportunityId}.`)
  assert(createdOpportunity?.pocProjectIds.includes(createdProjectId), 'Created Opportunity must link the new POC Project.')
  assert(useAppStore.getState().projects.filter((project) => project.opportunityId === createdOpportunity?.opportunityId && project.projectSource === 'POC').length === 1, 'Create New POC must not create duplicate Projects.')

  const projectBeforeFirstSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const firstSavedProject = useAppStore.getState().updateProject(createdProjectId, {
    projectComments: '<p>Runtime blocker first Project save.</p>',
  })
  const projectAfterFirstSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const secondSavedProject = useAppStore.getState().updateProject(createdProjectId, {
    projectComments: '<p>Runtime blocker second Project save.</p>',
  })
  const projectAfterSecondSave = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  assert(firstSavedProject?.id === createdProjectId, 'Fresh workflow Project first Save must commit.')
  assert(secondSavedProject?.id === createdProjectId, 'Fresh workflow Project second Save must commit.')
  assert(projectAfterSecondSave < 4_500_000, 'Fresh workflow Project repeated Save payload must remain below common browser quota.')
  assert(projectAfterSecondSave < projectAfterFirstSave + 25_000, 'Fresh workflow Project repeated Save must not grow unbounded.')

  const tenantAllocation = useAppStore.getState().projectSystems.find((link) =>
    link.allocationStatus !== 'DEALLOCATED' &&
    useAppStore.getState().systems.some((system) => system.id === link.systemId),
  )
  assert(Boolean(tenantAllocation), 'An active Project/System allocation must exist for authoritative Tenant creation.')
  let tenantResult = useAppStore.getState().createInternalTenantForSystem(tenantAllocation.projectId, tenantAllocation.systemId)
  if (tenantResult.requiresTimeGroupOverride) {
    tenantResult = useAppStore.getState().createInternalTenantForSystem(tenantAllocation.projectId, tenantAllocation.systemId, { timeGroupMismatchDecision: 'preserve' })
  }
  const createdTenant = useAppStore.getState().tenants.find((tenant) => tenant.id === tenantResult.tenantId)
  assert(tenantResult.ok, `Authoritative System Create Tenant operation must succeed: ${tenantResult.message}`)
  assert(createdTenant?.tid === 'T000581', `Runtime-created Tenant must be T000581; received ${createdTenant?.tid}.`)

  const createdProduction = useAppStore.getState().createProductionSystemInventoryItem()
  const savedProduction = useAppStore.getState().saveSystemFormTransaction('production', createdProduction.id, {
    ...createdProduction,
    usedInRegion: 'EMEA',
    cognitoRegion: 'EMEA',
    mapCenter: 'Runtime blocker route control',
  })
  assert(savedProduction?.sid === 'S000301', `Runtime-created affected System route control must be S000301; received ${savedProduction?.sid}.`)

  const p390 = useAppStore.getState().projects.find((project) => project.pid === 'P000390')
  assert(Boolean(p390), 'P000390 must exist for quota regression.')
  const p390Before = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  const savedP390 = useAppStore.getState().updateProject(p390.id, {
    projectComments: '<p>Runtime blocker P000390 Project save.</p>',
  })
  const p390After = payloadLength(storageMap, repository.APP_STATE_STORAGE_KEY)
  assert(savedP390?.pid === 'P000390', 'P000390 Save must commit under compact current storage.')
  assert(p390After < 4_500_000, 'P000390 Save payload must remain below common browser quota.')

  const freshState = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  assert(Boolean(freshState), 'Fresh/new-tab reconstruction must load current compact persisted payload.')
  const projectRoute = businessReferences.routePathForBusinessReference('PROJECT', createdProject?.pid)
  const opportunityRoute = businessReferences.routePathForBusinessReference('OPPORTUNITY', createdOpportunity?.opportunityId)
  assert(Boolean(routeLookup(freshState, projectRoute)), 'Clean workflow Project direct route must resolve after fresh reconstruction.')
  assert(Boolean(routeLookup(freshState, opportunityRoute)), 'Clean workflow Opportunity direct route must resolve after fresh reconstruction.')
  assert(Boolean(routeLookup(freshState, '/projects/P000391')), 'P000391 direct route must resolve after fresh reconstruction.')

  const tenant581 = freshState.tenants.find((tenant) => tenant.tid === 'T000581')
  const production301 = freshState.productionSystemInventory.find((system) => system.sid === 'S000301')
  assert(Boolean(tenant581), 'T000581 must exist in fresh persisted state after authoritative Tenant creation.')
  assert(Boolean(production301), 'S000301 must exist in fresh persisted state after authoritative System creation.')
  assert(Boolean(routeLookup(freshState, '/tenants/T000581')), 'T000581 direct route must resolve after fresh reconstruction.')
  assert(Boolean(routeLookup(freshState, '/systems/production-inventory/S000301')), 'S000301 direct route must resolve after fresh reconstruction.')

  const allocatedRis = useAppStore.getState().reusedInternalSystems.find((system) =>
    useAppStore.getState().projectSystems.some((link) =>
      link.allocationStatus !== 'DEALLOCATED' &&
      String(link.sourceMachineId ?? '').replace(/^M/i, '').padStart(6, '0') === String(system.machineId).replace(/^M/i, '').padStart(6, '0') &&
      useAppStore.getState().systems.some((allocated) => allocated.id === link.systemId && allocated.sid),
    ),
  )
  const releasedRis = useAppStore.getState().reusedInternalSystems.find((system) =>
    system.purpose === 'None' &&
    !useAppStore.getState().projectSystems.some((link) =>
      link.allocationStatus !== 'DEALLOCATED' &&
      String(link.sourceMachineId ?? '').replace(/^M/i, '').padStart(6, '0') === String(system.machineId).replace(/^M/i, '').padStart(6, '0'),
    ),
  )
  assert(Boolean(allocatedRis), 'Allocated RIS with current SID must exist for MID read-only verification.')
  assert(Boolean(releasedRis), 'Released Available/None RIS must exist for MID editable verification.')
  assert(allocatedRis?.machineId, 'Allocated RIS MID must be preserved.')
  assert(releasedRis?.machineId, 'Released RIS MID must be preserved.')

  const noBlankRisPurpose = useAppStore.getState().reusedInternalSystems.every((system) => typeof system.purpose === 'string' && system.purpose.trim())
  assert(noBlankRisPurpose, 'No RIS may have blank/null/undefined Purpose.')

  console.log(JSON.stringify({
    opportunityPocExactlyOnce: {
      opportunityId: createdOpportunity?.opportunityId,
      projectId: createdProject?.pid,
      projectChanges: created.projectChanges.length,
      linkedPocProjectIds: createdOpportunity?.pocProjectIds.length,
    },
    payloadChars: {
      cleanBefore,
      cleanAfterOpportunity,
      freshProjectBeforeFirstSave: projectBeforeFirstSave,
      freshProjectAfterFirstSave: projectAfterFirstSave,
      freshProjectAfterSecondSave: projectAfterSecondSave,
      p000390Before: p390Before,
      p000390After: p390After,
      oldFullBeforeMigration: oldFullBefore,
      oldFullAfterMigration: oldFullAfter,
    },
    storageProjection: {
      storedCurrentStateFromChromeQa: 364720,
      failingChromeProposedPayload: 5386831,
      baseline: {
        fullStateLength: baselineProjection.fullStateLength,
        rawDeltaLength: baselineProjection.rawDeltaLength,
        keyedDeltaLength: baselineProjection.keyedDeltaLength,
        compressedPayloadLength: baselineProjection.compressedPayloadLength,
        serializedPayloadLength: baselineProjection.serializedPayloadLength,
      },
      beforeBusinessMutation: {
        fullStateLength: beforeBusinessMutationProjection.fullStateLength,
        rawDeltaLength: beforeBusinessMutationProjection.rawDeltaLength,
        keyedDeltaLength: beforeBusinessMutationProjection.keyedDeltaLength,
        compressedPayloadLength: beforeBusinessMutationProjection.compressedPayloadLength,
        serializedPayloadLength: beforeBusinessMutationProjection.serializedPayloadLength,
      },
      afterBusinessMutation: {
        fullStateLength: afterBusinessMutationProjection.fullStateLength,
        rawDeltaLength: afterBusinessMutationProjection.rawDeltaLength,
        keyedDeltaLength: afterBusinessMutationProjection.keyedDeltaLength,
        compressedPayloadLength: afterBusinessMutationProjection.compressedPayloadLength,
        serializedPayloadLength: afterBusinessMutationProjection.serializedPayloadLength,
      },
      opportunityGrowthRatio: Number(growthRatio.toFixed(3)),
      largestCollectionDeltas: afterBusinessMutationProjection.collections.slice(0, 12),
    },
    directRoutes: {
      opportunity: opportunityRoute,
      project: projectRoute,
      p000391: '/projects/P000391',
      t000581: '/tenants/T000581',
      affectedSystem: '/systems/production-inventory/S000301',
    },
    risMid: {
      allocatedMidPreserved: allocatedRis?.machineId,
      releasedMidPreserved: releasedRis?.machineId,
      sourceContract: 'allocated/current-SID MID read-only; released/no-current-allocation MID editable',
    },
  }, null, 2))

  if (!process.exitCode) {
    console.log('V1.3 runtime blocker verification passed')
  }
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
