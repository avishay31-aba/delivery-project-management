import fs from 'node:fs'
import process from 'node:process'
import { createServer } from 'vite'

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 RIS dual-representation verification failed: ${message}`)
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

function completeProjectTasks(project) {
  return {
    tasks: (project.tasks ?? []).map((task) => ({ ...task, status: 'DONE' })),
    milestones: (project.milestones ?? []).map((milestone) => ({ ...milestone, status: 'DONE' })),
  }
}

function changedCollections(projection) {
  return projection.collections.filter((collection) =>
    collection.upsertCount > 0 || collection.deletedCount > 0 || collection.fullCount > 0
  )
}

const formSource = fs.readFileSync('src/pages/systems/SystemInventoryFormPages.tsx', 'utf8')
const serviceSource = fs.readFileSync('src/domain/system-inventory/service.ts', 'utf8')
const adapterSource = fs.readFileSync('src/domain/system-inventory/adapters.ts', 'utf8')
const businessReferenceSource = fs.readFileSync('src/domain/business-reference/service.ts', 'utf8')

assert(
  formSource.includes("if (isAllocatedReusedInternalRecord && field.key === 'currentSid') return null") &&
    formSource.includes("!(isAllocatedReusedInternalRecord && tab.id === 'owner')") &&
    formSource.includes("metadata.source !== SYSTEM_SOURCE_REUSED_INTERNAL || !('currentProjectIds' in activeRecord)") &&
    formSource.includes('configurationHistoryForSystemRecord(activeRecord, allocatedSystems)') &&
    formSource.includes('isFrozenHistoricalAllocatedReusedSystem') &&
    formSource.includes('isPocMidWithActiveSid') &&
    formSource.includes('canEditFormLocalArtifacts') &&
    formSource.includes("isCurrentRisOccupied() && field.key !== 'operationalStatus'") &&
    formSource.includes('if (metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL && isAllocatedSystem(activeDraft)) return null') &&
    formSource.includes('disabled={!canCancelCurrentSystem()}') &&
    formSource.includes('readOnly={!canEditFormLocalArtifacts}'),
  'RIS form editability must freeze operational data, keep Documents/Remarks editable for POC MID and historical SID exceptions, protect occupied headers except Operational Status, and make Cancel System MID-only.',
)
assert(
  serviceSource.includes('if (!isAllocatedSystem(record) &&') &&
    serviceSource.includes('return `/systems/${record.sid}`') &&
    serviceSource.includes('record.purpose === REUSED_INTERNAL_PURPOSE_NONE') &&
    !serviceSource.includes('purpose: REUSED_INTERNAL_PURPOSE_NONE,\n      availability: SYSTEM_AVAILABILITY_AVAILABLE'),
  'System read model must keep MID linked-project aggregation off allocated SID records, restrict Cancel System to None/Available MID, and must not reset released SID records to pool state.',
)
assert(
  adapterSource.includes('configurationHistory: [],') &&
    adapterSource.includes('documents: [],'),
  'New RIS SID allocation records must start with clean form-local Configuration History and Documents.',
)
assert(
  businessReferenceSource.includes("if (objectType === 'SYSTEM')") &&
    businessReferenceSource.includes("return `/systems/reused-internal/${formattedReusedInternalMachineId(reusedRouteKey)}`"),
  'Shared business-reference routing must route MID-shaped SYSTEM IDs to the RIS-MID form.',
)

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
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const opportunityAdapters = await server.ssrLoadModule('/src/domain/opportunity-lifecycle/adapters.ts')
  const systemInventory = await server.ssrLoadModule('/src/domain/system-inventory/service.ts')
  const businessReferences = await server.ssrLoadModule('/src/domain/business-reference/service.ts')
  const activityLog = await server.ssrLoadModule('/src/domain/activity-log/service.ts')
  const systemVersionUpdate = await server.ssrLoadModule('/src/domain/system-version-update/index.ts')
  const allocationContext = await server.ssrLoadModule('/src/domain/allocation-context/service.ts')
  const allocationValidation = await server.ssrLoadModule('/src/domain/allocation-context/validation.ts')
  const linkedProjects = await server.ssrLoadModule('/src/domain/linked-projects/service.ts')
  const remarks = await server.ssrLoadModule('/src/domain/remarks/service.ts')
  const tenantRequirementAdapters = await server.ssrLoadModule('/src/domain/tenant-requirement/adapters.ts')
  const { useAppStore } = storeModule

  useAppStore.getState().resetToSeed()
  const zeroProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  assert(changedCollections(zeroProjection).length === 0, 'Zero-change business delta must remain empty before RIS lifecycle regression.')

  function createPocProject(name, startDate, endDate, existingSystemId = '') {
    const state = useAppStore.getState()
    const draft = opportunityAdapters.createOpportunityDraft(
      state.accounts,
      state.salesManagers,
      '2026-09-29T08:00:00.000Z',
      'POC',
      'PAID',
    )
    const newTenantRequirements = existingSystemId
      ? [{
          ...tenantRequirementAdapters.createNewTenantRequirement(1, 'QA Existing System', 'Silver', 'REQ-EXISTING-SID'),
          deployTarget: 'EXISTING_SID',
          existingSystemId,
        }]
      : []
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
      newTenantRequirements,
    }, undefined, { pocAction: 'CREATE_NEW_POC' }, { preserveNewState: true })
    const project = useAppStore.getState().projects.find((candidate) => candidate.id === saved.projectChanges[0]?.projectId)
    assert(Boolean(project), `${name} POC Project must be created.`)
    return project
  }

  function fakeVersionAttachment(category, suffix) {
    return {
      category,
      fileName: `${suffix}-${category.toLowerCase()}.txt`,
      mimeType: 'text/plain',
      fileSize: 128,
      storedFileReference: `data:text/plain;base64,${Buffer.from(`${suffix}-${category}`).toString('base64')}`,
    }
  }

  function createVersionCatalog(versionNumber, buildNumber) {
    const result = useAppStore.getState().saveVersionUpgradeRecord(null, {
      versionNumber,
      buildNumber,
      releaseDate: '2026-09-30',
      phaseOutDate: null,
      limitedToCloudPlatform: '',
      remarks: `QA catalog ${versionNumber}/${buildNumber}`,
      schedules: [],
    })
    assert(result.ok, `Version Upgrade Scheduler catalog must accept ${versionNumber}/${buildNumber}: ${result.message}`)
    const record = result.record
    assert(Boolean(record), `Version Upgrade Scheduler record must be returned for ${versionNumber}/${buildNumber}.`)
    return {
      versionNumberRefId: record.versionNumberRefId,
      buildNumberRefId: record.buildNumberRefId,
    }
  }

  function saveVersionForSystem(collection, systemId, versionNumberRefId, buildNumberRefId, suffix) {
    const result = useAppStore.getState().saveVersionUpdate(collection, systemId, {
      versionNumberRefId,
      buildNumberRefId,
      remarks: `QA version update ${suffix}`,
      attachments: ['CONFIG', 'ATP', 'CHECKLIST'].map((category) => fakeVersionAttachment(category, suffix)),
    })
    assert(result.ok, `Version Update ${suffix} must save for ${collection} ${systemId}: ${result.message}`)
    assert(Boolean(result.record), `Version Update ${suffix} must return a committed record.`)
    return result.record
  }

  function activeVersionRows(systemId) {
    return systemVersionUpdate.activeVersionUpdatesForSystem(useAppStore.getState().versionUpdates, systemId)
  }

  function routeResolvedMid(routeKey) {
    const routeMachineId = systemInventory.reusedInternalMachineIdRouteKey(routeKey)
    return useAppStore.getState().reusedInternalSystems.find((system) =>
      systemInventory.reusedInternalMachineIdsEqual(system.machineId, routeMachineId) || system.id === routeKey
    ) ?? useAppStore.getState().systems.find((system) => system.sid === routeKey || system.id === routeKey)
  }

  function routeResolvedSid(routeKey) {
    return useAppStore.getState().systems.find((system) => system.sid === routeKey || system.id === routeKey)
  }

  function formActivityEvents(record) {
    const ids = record.source === 'Reused Internal Systems' && 'sid' in record
      ? [systemInventory.systemIdentity(record), record.sid, record.id]
      : [systemInventory.systemIdentity(record), 'sid' in record ? record.sid : record.machineId, record.id]
    const seen = new Set()
    return ids
      .filter(Boolean)
      .flatMap((id) => activityLog.activityEventsForSystem(useAppStore.getState().activityEvents, id))
      .filter((event) => {
        if (seen.has(event.id)) return false
        seen.add(event.id)
        return true
      })
  }

  const firstProject = createPocProject('RIS dual representation first POC', '2026-10-01', '2026-10-15')
  const availableMid = allocationContext.availableReusedInternalCandidates(
    useAppStore.getState().reusedInternalSystems,
    useAppStore.getState().projectSystems,
    useAppStore.getState().projects,
    useAppStore.getState().systems,
  ).find((system) =>
    system.purpose === 'None' &&
    system.status === 'Available' &&
    !allocationValidation.validateReusedInternalAllocation({ projectId: firstProject.id, systemId: system.id }, useAppStore.getState())
  )
  assert(Boolean(availableMid), 'An available RIS MID inventory record must exist.')
  const originalMidSnapshot = JSON.parse(JSON.stringify(availableMid))
  const midLocalRemark = {
    ...remarks.createRemarkRecord(availableMid.remarks ?? [], '2026-09-30T08:00:00.000Z', 'QA'),
    content: 'R1 MID-local remark',
  }
  const midLocalDocument = {
    id: 'doc-ris-mid-local-qa',
    fileName: 'mid-local-document.pdf',
    category: 'QA',
    uploadedAt: '2026-09-30T08:00:30.000Z',
    uploadedBy: 'QA',
    description: 'D1 MID-local document',
  }
  const midLocalConfig = systemInventory.createSystemConfigurationHistoryRecord(
    { mapCenter: 'C1 MID-local configuration' },
    availableMid.configurationHistory ?? [],
    '2026-09-30T08:01:00.000Z',
    'QA',
  )
  assert(Boolean(midLocalConfig), 'MID-local configuration history record C1 must be created.')
  useAppStore.getState().saveSystemFormTransaction('reused', availableMid.id, {
    remarks: [midLocalRemark],
    documents: [midLocalDocument],
    configurationHistory: [midLocalConfig],
  }, [], { preserveNewState: true })
  const initialVersion = createVersionCatalog('QA-RIS-2026.1', 'QA-RIS-2026.1.100')
  const midInitialVersionUpdate = saveVersionForSystem('reused', availableMid.id, initialVersion.versionNumberRefId, initialVersion.buildNumberRefId, 'mid-initial')
  const midVersionRowsBeforeSid = activeVersionRows(availableMid.id)
  assert(midVersionRowsBeforeSid.some((record) => record.id === midInitialVersionUpdate.id), 'MID existing Version Update history must exist before first SID allocation.')

  const firstAllocation = useAppStore.getState().allocateReusedInternalSystemToProject(firstProject.id, availableMid.id)
  assert(firstAllocation.ok, `First RIS allocation must succeed: ${firstAllocation.message}`)
  if (!firstAllocation.ok) process.exit(1)
  const firstLink = useAppStore.getState().projectSystems.find((link) => link.id === firstAllocation.allocationId)
  const firstSid = useAppStore.getState().systems.find((system) => system.id === firstLink?.systemId)
  const occupiedMid = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  assert(Boolean(firstLink && firstSid && occupiedMid), 'First allocation must create both Project/System link and SID record.')
  assert(firstSid.sid && firstSid.sid.startsWith('S'), 'Allocated RIS representation must have an SID.')
  assert(firstSid.machineId === occupiedMid.machineId, 'Allocated RIS SID must retain MID relationship.')
  assert(occupiedMid.machineId === originalMidSnapshot.machineId, 'MID identity must remain unchanged during allocation.')
  assert(occupiedMid.purpose === 'POC' && occupiedMid.status === 'Occupied', 'MID pool record must show POC/Occupied while actively allocated.')
  assert(systemInventory.currentProjectPidsForSystem(occupiedMid, useAppStore.getState().projects, useAppStore.getState().projectSystems).includes(firstProject.pid), 'MID form linked projects must include first POC.')
  assert(systemInventory.currentProjectPidsForSystem(firstSid, useAppStore.getState().projects, useAppStore.getState().projectSystems).join(';') === firstProject.pid, 'Allocated SID form must show only its own POC Project.')
  assert(systemInventory.reusedInternalPurposeHistory(occupiedMid, useAppStore.getState().projects, useAppStore.getState().projectSystems, useAppStore.getState().systems).some((row) => row.sid === firstSid.sid), 'MID Purpose History must include first SID usage.')
  assert(businessReferences.systemReference(occupiedMid).routePath === `/systems/reused-internal/${systemInventory.formattedReusedInternalMachineId(occupiedMid.machineId)}`, 'MID route must target reused-internal MID form.')
  assert(businessReferences.systemReference(firstSid).routePath === `/systems/${firstSid.sid}`, 'Allocated RIS SID route must target allocated SID form.')
  assert(businessReferences.routePathForBusinessReference('SYSTEM', systemInventory.formattedReusedInternalMachineId(occupiedMid.machineId)) === `/systems/reused-internal/${systemInventory.formattedReusedInternalMachineId(occupiedMid.machineId)}`, 'Generic SYSTEM routing with an MID must still target the reused-internal MID form.')
  assert(businessReferences.routePathForBusinessReference('SYSTEM', firstSid.sid) === `/systems/${firstSid.sid}`, 'Generic SYSTEM routing with an SID must target the SID form.')
  assert((firstSid.documents ?? []).length === 0, 'New SID Documents must start empty and not inherit MID-local Documents.')
  const firstSidInheritedVersionRows = activeVersionRows(firstSid.id)
  assert(firstSidInheritedVersionRows.length === midVersionRowsBeforeSid.length, 'New SID must inherit existing MID Version Update history count.')
  assert(firstSidInheritedVersionRows.every((record) => record.systemId === firstSid.id && record.systemCollection === 'allocated' && record.sidSnapshot === firstSid.sid), 'Inherited SID Version Updates must be SID-local records with SID snapshot.')
  assert(firstSid.currentVersionNumberRefId === initialVersion.versionNumberRefId && firstSid.currentBuildNumberRefId === initialVersion.buildNumberRefId, 'New SID must inherit MID current Version/Build state.')
  assert(firstSid.currentVersionUpdateId !== midInitialVersionUpdate.id, 'New SID current Version Update must be its own local inherited record, not the MID record ID.')

  const sidRemark = {
    ...remarks.createRemarkRecord(firstSid.remarks ?? [], '2026-10-02T08:00:00.000Z', 'QA'),
    content: 'R2 first SID-local remark',
  }
  const sidDocument = {
    id: 'doc-ris-first-sid-local-qa',
    fileName: 'sid-local-document.pdf',
    category: 'QA',
    uploadedAt: '2026-10-02T08:00:30.000Z',
    uploadedBy: 'QA',
    description: 'D2 SID-local document',
  }
  useAppStore.getState().saveSystemFormTransaction('allocated', firstSid.id, {
    remarks: [sidRemark],
    documents: [sidDocument],
  }, [], { preserveNewState: true })
  const firstSidWithLocalChildren = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const occupiedMidWithRollup = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const midRemarks = occupiedMidWithRollup?.remarks ?? []
  const sidRemarks = firstSidWithLocalChildren?.remarks ?? []
  const midDocuments = occupiedMidWithRollup?.documents ?? []
  const sidDocuments = firstSidWithLocalChildren?.documents ?? []
  const midConfigReadModel = systemInventory.configurationHistoryForSystemRecord(occupiedMidWithRollup, useAppStore.getState().systems)
  const sidConfigReadModel = systemInventory.configurationHistoryForSystemRecord(firstSidWithLocalChildren, useAppStore.getState().systems)
  assert(midRemarks.some((remark) => remark.content === 'R1 MID-local remark') && !midRemarks.some((remark) => remark.content === 'R2 first SID-local remark'), 'MID Remarks must stay local and exclude SID remarks.')
  assert(sidRemarks.some((remark) => remark.content === 'R2 first SID-local remark') && !sidRemarks.some((remark) => remark.content === 'R1 MID-local remark'), 'SID Remarks must stay local and exclude MID remarks.')
  assert(midDocuments.some((document) => document.description === 'D1 MID-local document') && !midDocuments.some((document) => document.description === 'D2 SID-local document'), 'MID Documents must stay local and exclude SID documents.')
  assert(sidDocuments.some((document) => document.description === 'D2 SID-local document') && !sidDocuments.some((document) => document.description === 'D1 MID-local document'), 'SID Documents must stay local and exclude MID documents.')
  assert(midConfigReadModel.some((record) => record.configuration.mapCenter === 'C1 MID-local configuration'), 'MID Configuration History must include MID-local C1.')
  assert(sidConfigReadModel.length === 0, 'New SID Configuration History must remain empty before the first Tenant is created.')
  assert(linkedProjects.linkedProjectRowsForSystem(occupiedMidWithRollup, { projects: useAppStore.getState().projects, projectSystems: useAppStore.getState().projectSystems, projectTenants: useAppStore.getState().projectTenants, systems: useAppStore.getState().systems, opportunities: useAppStore.getState().opportunities, accounts: useAppStore.getState().accounts }).some((row) => row.pid === firstProject.pid && row.allocatedSystems.some((system) => system.sid === firstSid.sid)), 'MID Linked Projects must show the first POC/SID pair.')
  assert(linkedProjects.linkedProjectRowsForSystem(firstSidWithLocalChildren, { projects: useAppStore.getState().projects, projectSystems: useAppStore.getState().projectSystems, projectTenants: useAppStore.getState().projectTenants, systems: useAppStore.getState().systems, opportunities: useAppStore.getState().opportunities, accounts: useAppStore.getState().accounts }).map((row) => row.pid).join(';') === firstProject.pid, 'First SID Linked Projects must show only first POC.')

  let tenantResult = useAppStore.getState().createInternalTenantForSystem(firstProject.id, firstSid.id)
  if (tenantResult.requiresTimeGroupOverride) {
    tenantResult = useAppStore.getState().createInternalTenantForSystem(firstProject.id, firstSid.id, { timeGroupMismatchDecision: 'preserve' })
  }
  assert(tenantResult.ok, `Tenant creation on first RIS SID must succeed: ${tenantResult.message}`)
  const firstTenant = useAppStore.getState().tenants.find((tenant) => tenant.id === tenantResult.tenantId)
  const firstSidAfterFirstTenant = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const occupiedMidAfterFirstTenant = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const sidConfigAfterFirstTenant = systemInventory.configurationHistoryForSystemRecord(firstSidAfterFirstTenant, useAppStore.getState().systems)
  const midConfigAfterFirstTenant = systemInventory.configurationHistoryForSystemRecord(occupiedMidAfterFirstTenant, useAppStore.getState().systems)
  assert(sidConfigAfterFirstTenant.length === 1, 'SID Configuration History must begin when the first Tenant is created.')
  assert(sidConfigAfterFirstTenant[0]?.tid === firstTenant?.tid && sidConfigAfterFirstTenant[0]?.sid === firstSid.sid && sidConfigAfterFirstTenant[0]?.pid === firstProject.pid, 'First SID Configuration History entry must carry correct TID/SID/PID context.')
  assert(midConfigAfterFirstTenant.some((record) => record.id === sidConfigAfterFirstTenant[0]?.id), 'MID lifetime Configuration History read model must include active SID first-tenant configuration event.')

  const sidActiveVersion = createVersionCatalog('QA-RIS-2026.2', 'QA-RIS-2026.2.200')
  const sidActiveVersionRecord = saveVersionForSystem('allocated', firstSid.id, sidActiveVersion.versionNumberRefId, sidActiveVersion.buildNumberRefId, 'sid-active')
  const firstSidAfterActiveVersion = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const occupiedMidAfterActiveVersion = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  assert(firstSidAfterActiveVersion.currentVersionNumberRefId === sidActiveVersion.versionNumberRefId && firstSidAfterActiveVersion.currentBuildNumberRefId === sidActiveVersion.buildNumberRefId, 'Active SID Version Update must update SID current Version/Build state.')
  assert(occupiedMidAfterActiveVersion.currentVersionNumberRefId === sidActiveVersion.versionNumberRefId && occupiedMidAfterActiveVersion.currentBuildNumberRefId === sidActiveVersion.buildNumberRefId, 'Active SID Version Update must reflect to MID current Version/Build state.')
  assert(activeVersionRows(availableMid.id).some((record) => record.id === occupiedMidAfterActiveVersion.currentVersionUpdateId && record.versionNumberRefId === sidActiveVersion.versionNumberRefId), 'MID must receive a local Version Update row for active SID version change.')
  assert(activeVersionRows(firstSid.id).some((record) => record.id === sidActiveVersionRecord.id), 'SID must retain its local Version Update row for active SID version change.')

  const sharedProject = createPocProject('RIS dual representation shared active SID POC', '2026-10-10', '2026-10-28', firstSid.id)
  const sidCountBeforeExistingLink = useAppStore.getState().systems.length
  let sharedLink = useAppStore.getState().projectSystems.find((link) => link.projectId === sharedProject.id && link.systemId === firstSid.id && link.allocationStatus !== 'DEALLOCATED')
  if (!sharedLink) {
    const sharedAllocation = useAppStore.getState().linkExistingSystemToProject(sharedProject.id, firstSid.id)
    assert(sharedAllocation.ok, `Existing RIS SID link to second active POC must succeed: ${sharedAllocation.message}`)
    sharedLink = useAppStore.getState().projectSystems.find((link) => link.id === sharedAllocation.allocationId)
  }
  assert(Boolean(sharedLink), 'Second active POC must link to the existing SID.')
  assert(useAppStore.getState().systems.length === sidCountBeforeExistingLink, 'Linking an existing active RIS SID must not create another SID.')
  assert(sharedLink.allocationType === 'REUSED_INTERNAL' && sharedLink.sourceMachineId === firstSid.machineId, 'Existing RIS SID link must retain reused-internal MID identity.')
  let sharedTenantResult = useAppStore.getState().createInternalTenantForSystem(sharedProject.id, firstSid.id)
  if (sharedTenantResult.requiresTimeGroupOverride) {
    sharedTenantResult = useAppStore.getState().createInternalTenantForSystem(sharedProject.id, firstSid.id, { timeGroupMismatchDecision: 'preserve' })
  }
  assert(sharedTenantResult.ok, `Tenant creation on shared active RIS SID must succeed: ${sharedTenantResult.message}`)
  const sharedSidActive = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const sharedMidActive = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const sharedSidPids = systemInventory.currentProjectPidsForSystem(sharedSidActive, useAppStore.getState().projects, useAppStore.getState().projectSystems)
  assert(sharedSidPids.includes(firstProject.pid) && sharedSidPids.includes(sharedProject.pid), 'Active SID Linked Projects must include both active POC Projects.')
  assert(sharedMidActive?.purpose === 'POC' && sharedMidActive.status === 'Occupied', 'MID must remain POC/Occupied while active SID serves multiple POCs.')
  assert(systemInventory.currentProjectPidsForSystem(sharedMidActive, useAppStore.getState().projects, useAppStore.getState().projectSystems).includes(sharedProject.pid), 'MID Linked Projects must include the shared active POC/SID relationship.')
  assert(sharedMidActive.occupationStartDate === firstProject.pocStartDate, 'Active POC MID Occupation Start Date must mirror the current SID earliest linked POC start.')
  assert(sharedMidActive.occupationEndDate === sharedProject.pocEndDate, 'Active POC MID Occupation End Date must mirror the current SID latest linked POC end.')
  assert(sharedSidActive.occupationStartDate === firstProject.pocStartDate, 'Multi-project SID Occupation Start Date must be earliest linked POC start.')
  assert(sharedSidActive.occupationEndDate === sharedProject.pocEndDate, 'Multi-project SID Occupation End Date must be latest linked POC end.')
  assert((sharedSidActive.tenantIds ?? []).length >= 2, 'Active SID must retain tenants from both linked POC Projects.')
  const activeMidPhysicalIds = systemInventory.currentPhysicalSystemIdsForReusedRecord(sharedMidActive, useAppStore.getState().systems, useAppStore.getState().projectSystems)
  assert(activeMidPhysicalIds.has(firstSid.id) && activeMidPhysicalIds.size === 2, 'Active POC MID physical read model must include only the MID and its one current SID.')
  assert(systemInventory.hostedTenantsForSystemRecord(sharedMidActive, useAppStore.getState().tenants, useAppStore.getState().systems, useAppStore.getState().projectSystems).length >= 2, 'Active POC MID Tenant tab must reflect tenants hosted through the current SID.')
  assert(systemInventory.hostedTenantsForSystemRecord(sharedSidActive, useAppStore.getState().tenants, useAppStore.getState().systems).length >= 2, 'Active POC SID Tenant tab must show SID-specific tenants.')
  assert(!systemInventory.canAddTenantFromSystemRecord(sharedMidActive, useAppStore.getState().projectSystems), 'POC MID Add Tenant must be disabled.')
  assert(systemInventory.canAddTenantFromSystemRecord(sharedSidActive, useAppStore.getState().projectSystems), 'Active POC SID Add Tenant must be enabled.')
  const sidSummaryBeforeStatus = systemInventory.systemApplicationConfigurationSummary(sharedSidActive, useAppStore.getState().tenants, useAppStore.getState().systems, useAppStore.getState().projectSystems)
  const midActiveSummarySystem = useAppStore.getState().systems.find((system) => activeMidPhysicalIds.has(system.id))
  assert(JSON.stringify(systemInventory.systemApplicationConfigurationSummary(midActiveSummarySystem, useAppStore.getState().tenants, useAppStore.getState().systems, useAppStore.getState().projectSystems)) === JSON.stringify(sidSummaryBeforeStatus), 'Active MID and SID Application Configuration Summary must match.')
  useAppStore.getState().saveSystemFormTransaction('allocated', firstSid.id, { operationalStatus: 'Off' }, [], { preserveNewState: true })
  const midAfterSidOff = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const sidAfterSidOff = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const tenantsAfterSidOff = useAppStore.getState().tenants.filter((tenant) => [tenantResult.tenantId, sharedTenantResult.tenantId].includes(tenant.id))
  assert(midAfterSidOff.operationalStatus === 'Off' && sidAfterSidOff.operationalStatus === 'Off', 'Operational Status changed through active SID must synchronize to MID.')
  assert(tenantsAfterSidOff.every((tenant) => tenant.operationalStatus === 'System is Off' && tenant.systemForcedBySystemId === firstSid.id), 'SID Operational Status Off must propagate to hosted tenants.')
  useAppStore.getState().saveSystemFormTransaction('reused', availableMid.id, { operationalStatus: 'On' }, [], { preserveNewState: true })
  const midAfterMidOn = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const sidAfterMidOn = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const tenantsAfterMidOn = useAppStore.getState().tenants.filter((tenant) => [tenantResult.tenantId, sharedTenantResult.tenantId].includes(tenant.id))
  assert(midAfterMidOn.operationalStatus === 'On' && sidAfterMidOn.operationalStatus === 'On', 'Operational Status changed through active MID must synchronize to SID.')
  assert(tenantsAfterMidOn.every((tenant) => tenant.operationalStatus === 'Active' && !tenant.systemForcedBySystemId), 'MID Operational Status On must restore tenants forced by the active SID.')

  const completedFirstProject = useAppStore.getState().updateProject(firstProject.id, completeProjectTasks(firstProject))
  assert(completedFirstProject?.progressStatus === 'DONE', 'Completing first Project tasks must mark first POC Done.')
  const midAfterFirstDone = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const firstSidAfterFirstDone = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const firstLinkAfterFirstDone = useAppStore.getState().projectSystems.find((link) => link.id === firstLink.id)
  const sharedLinkAfterFirstDone = useAppStore.getState().projectSystems.find((link) => link.id === sharedLink.id)
  assert(firstLinkAfterFirstDone?.allocationStatus === 'DEALLOCATED', 'First POC link must deallocate when first POC completes.')
  assert(sharedLinkAfterFirstDone?.allocationStatus !== 'DEALLOCATED', 'Shared SID link must remain active while second POC is still open.')
  assert(midAfterFirstDone?.purpose === 'POC' && midAfterFirstDone.status === 'Occupied', 'MID must not release while another active POC still uses the SID.')
  assert(systemInventory.currentProjectPidsForSystem(midAfterFirstDone, useAppStore.getState().projects, useAppStore.getState().projectSystems).includes(sharedProject.pid), 'MID must retain current shared POC while first POC is done.')
  assert(midAfterFirstDone?.occupationStartDate === firstProject.pocStartDate && midAfterFirstDone?.occupationEndDate === sharedProject.pocEndDate, 'MID occupation dates must continue to mirror the current SID full linked POC window after one shared POC completes.')
  assert(firstSidAfterFirstDone?.occupationStartDate === firstProject.pocStartDate && firstSidAfterFirstDone?.occupationEndDate === sharedProject.pocEndDate, 'Active SID occupation dates must retain earliest/latest window across all POCs linked to that SID.')
  assert((firstSidAfterFirstDone?.tenantIds ?? []).length >= 2, 'SID must retain tenants from both Projects after first POC completes.')

  const completedSharedProject = useAppStore.getState().updateProject(sharedProject.id, completeProjectTasks(sharedProject))
  assert(completedSharedProject?.progressStatus === 'DONE', 'Completing shared Project tasks must mark second active POC Done.')
  const releasedMid = useAppStore.getState().reusedInternalSystems.find((system) => system.id === availableMid.id)
  const releasedFirstSid = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const releasedSharedLink = useAppStore.getState().projectSystems.find((link) => link.id === sharedLink.id)
  assert(releasedMid?.machineId === originalMidSnapshot.machineId, 'Final release must never clear or replace MID.')
  assert(releasedMid?.purpose === 'None' && releasedMid.status === 'Available', 'Released MID must become None/Available after last active POC completes.')
  assert((releasedMid.currentProjectIds ?? []).length === 0, 'Released MID current Project IDs must be cleared after final release.')
  assert(!systemInventory.deriveReusedSystemOccupationWindow(releasedMid, [], useAppStore.getState().projects, '', useAppStore.getState().systems).occupationStartDate, 'Released MID current occupation window must be cleared after final release.')
  assert(releasedFirstSid?.sid === firstSid.sid, 'Released allocated SID record must retain its SID.')
  assert(releasedFirstSid?.machineId === firstSid.machineId, 'Released allocated SID record must retain MID relationship.')
  assert(releasedFirstSid?.purpose === 'POC' && String(releasedFirstSid.availability).toLocaleLowerCase() === 'occupied', 'Released historical SID snapshot must not be transformed back into MID pool state.')
  assert(systemInventory.currentProjectPidsForSystem(releasedFirstSid, useAppStore.getState().projects, useAppStore.getState().projectSystems).includes(firstProject.pid), 'Released historical SID must retain first POC.')
  assert(systemInventory.currentProjectPidsForSystem(releasedFirstSid, useAppStore.getState().projects, useAppStore.getState().projectSystems).includes(sharedProject.pid), 'Released historical SID must retain shared active POC.')
  assert(releasedFirstSid?.occupationStartDate === firstProject.pocStartDate && releasedFirstSid?.occupationEndDate === sharedProject.pocEndDate, 'Released historical SID occupation dates must retain earliest/latest full SID window.')
  assert((releasedFirstSid?.tenantIds ?? []).length >= 2, 'Released historical SID must retain tenants from both Projects.')
  assert(releasedSharedLink?.allocationStatus === 'DEALLOCATED', 'Shared Project/System link must deallocate on final POC completion.')
  const releasedMidHostedTenants = systemInventory.hostedTenantsForSystemRecord(releasedMid, useAppStore.getState().tenants, useAppStore.getState().systems, useAppStore.getState().projectSystems)
  assert(releasedMidHostedTenants.length === 0, 'Released MID current Tenant scope must be empty after final POC release; historical Tenant evidence remains on the frozen SID.')
  const historicalSidRemark = {
    ...remarks.createRemarkRecord(releasedFirstSid.remarks ?? [], '2026-10-29T08:00:00.000Z', 'QA'),
    content: 'R2B historical SID remark remains editable',
  }
  const historicalSidDocuments = [
    ...(releasedFirstSid.documents ?? []),
    {
      id: 'doc-ris-first-sid-historical-qa',
      fileName: 'sid-historical-document.pdf',
      category: 'QA',
      uploadedAt: '2026-10-29T08:00:30.000Z',
      uploadedBy: 'QA',
      description: 'D2B historical SID document remains editable',
    },
  ]
  useAppStore.getState().saveSystemFormTransaction('allocated', releasedFirstSid.id, {
    remarks: [...(releasedFirstSid.remarks ?? []), historicalSidRemark],
    documents: historicalSidDocuments,
  }, [], { preserveNewState: true })
  const releasedFirstSidWithHistoricalChildren = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  assert((releasedFirstSidWithHistoricalChildren?.remarks ?? []).some((remark) => remark.content === historicalSidRemark.content), 'Historical SID Remarks must remain editable and local.')
  assert((releasedFirstSidWithHistoricalChildren?.documents ?? []).some((document) => document.description === 'D2B historical SID document remains editable'), 'Historical SID Documents must remain editable and local.')
  const frozenFirstSnapshotAfterLocalChildren = JSON.stringify(releasedFirstSidWithHistoricalChildren)
  const frozenFirstVersionRowsAfterLocalChildren = JSON.stringify(activeVersionRows(firstSid.id))
  const midPostReleaseVersion = createVersionCatalog('QA-RIS-2026.3', 'QA-RIS-2026.3.300')
  saveVersionForSystem('reused', releasedMid.id, midPostReleaseVersion.versionNumberRefId, midPostReleaseVersion.buildNumberRefId, 'mid-post-release')
  const midPostReleaseConfig = systemInventory.createSystemConfigurationHistoryRecord(
    { mapCenter: 'C4 MID post-release configuration' },
    useAppStore.getState().reusedInternalSystems.find((system) => system.id === releasedMid.id)?.configurationHistory ?? [],
    '2026-10-29T08:02:00.000Z',
    'QA',
  )
  assert(Boolean(midPostReleaseConfig), 'Post-release MID Configuration History record C4 must be created.')
  const currentReleasedMid = useAppStore.getState().reusedInternalSystems.find((system) => system.id === releasedMid.id)
  useAppStore.getState().saveSystemFormTransaction('reused', releasedMid.id, {
    configurationHistory: [midPostReleaseConfig, ...(currentReleasedMid?.configurationHistory ?? [])],
    operationalStatus: 'Off',
    cognitoRegion: 'eu-west-1',
    usedInRegion: 'APAC',
    timeGroup: 'APAC',
  }, [], { preserveNewState: true })
  const firstSidAfterPostReleaseMidChanges = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  assert(JSON.stringify(firstSidAfterPostReleaseMidChanges) === frozenFirstSnapshotAfterLocalChildren, 'Post-release MID operational/configuration/version changes must not mutate historical SID object snapshot.')
  assert(JSON.stringify(activeVersionRows(firstSid.id)) === frozenFirstVersionRowsAfterLocalChildren, 'Post-release MID Version Updates must not enter historical SID Version Update history.')
  const firstSidAfterMidTenantCancel = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  assert(JSON.stringify(firstSidAfterMidTenantCancel) === frozenFirstSnapshotAfterLocalChildren, 'Cancelling tenants from the released MID must not mutate the frozen historical SID record except its own saved Remarks/Documents.')
  assert(systemInventory.hostedTenantsForSystemRecord(releasedMid, useAppStore.getState().tenants, useAppStore.getState().systems, useAppStore.getState().projectSystems).length === 0, 'MID Tenant tab must remain empty after final release.')

  const laterProject = createPocProject('RIS dual representation later new SID POC', '2026-11-01', '2026-11-15')
  const laterAllocation = useAppStore.getState().allocateReusedInternalSystemToProject(laterProject.id, releasedMid.id)
  assert(laterAllocation.ok, `Later RIS allocation must succeed after final release: ${laterAllocation.message}`)
  const laterLink = useAppStore.getState().projectSystems.find((link) => link.id === laterAllocation.allocationId)
  const laterSid = useAppStore.getState().systems.find((system) => system.id === laterLink?.systemId)
  const reusedMidAgain = useAppStore.getState().reusedInternalSystems.find((system) => system.id === releasedMid.id)
  const firstSidAfterReuse = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  assert(Boolean(laterSid && reusedMidAgain), 'Later allocation must create a new allocated SID record.')
  assert(laterSid.sid !== firstSid.sid, 'RIS reuse after final release must allocate a new SID, not mutate the historical SID.')
  assert(JSON.stringify(firstSidAfterReuse) === frozenFirstSnapshotAfterLocalChildren, 'Historical first SID record must remain frozen after later MID reuse.')
  assert(JSON.stringify(activeVersionRows(firstSid.id)) === frozenFirstVersionRowsAfterLocalChildren, 'Later SID lifecycle must not mutate first historical SID Version Update history.')
  assert(activeVersionRows(laterSid.id).some((record) => record.versionNumberRefId === midPostReleaseVersion.versionNumberRefId && record.buildNumberRefId === midPostReleaseVersion.buildNumberRefId), 'Later SID must inherit MID Version Update state/history present at the start of its POC lifecycle.')
  const laterMidPhysicalIds = systemInventory.currentPhysicalSystemIdsForReusedRecord(reusedMidAgain, useAppStore.getState().systems, useAppStore.getState().projectSystems)
  assert(laterMidPhysicalIds.has(laterSid.id) && !laterMidPhysicalIds.has(firstSid.id), 'MID current physical read model must use only the new current SID after reuse, not the historical SID.')
  const midLinkedPids = systemInventory.currentProjectPidsForSystem(reusedMidAgain, useAppStore.getState().projects, useAppStore.getState().projectSystems)
  assert(midLinkedPids.includes(firstProject.pid) && midLinkedPids.includes(sharedProject.pid) && midLinkedPids.includes(laterProject.pid), 'MID form linked projects must include all historical/current allocations.')
  assert(systemInventory.currentProjectPidsForSystem(laterSid, useAppStore.getState().projects, useAppStore.getState().projectSystems).join(';') === laterProject.pid, 'Later SID form must show only later POC Project.')
  const laterSidRemark = {
    ...remarks.createRemarkRecord(laterSid.remarks ?? [], '2026-11-02T08:00:00.000Z', 'QA'),
    content: 'R3 later SID-local remark',
  }
  assert(systemInventory.configurationHistoryForSystemRecord(laterSid, useAppStore.getState().systems).length === 0, 'Later SID must start with clean Configuration History.')
  let laterTenantResult = useAppStore.getState().createInternalTenantForSystem(laterProject.id, laterSid.id)
  if (laterTenantResult.requiresTimeGroupOverride) {
    laterTenantResult = useAppStore.getState().createInternalTenantForSystem(laterProject.id, laterSid.id, { timeGroupMismatchDecision: 'preserve' })
  }
  assert(laterTenantResult.ok, `Tenant creation on later RIS SID must succeed: ${laterTenantResult.message}`)
  const laterSidVersion = createVersionCatalog('QA-RIS-2026.4', 'QA-RIS-2026.4.400')
  saveVersionForSystem('allocated', laterSid.id, laterSidVersion.versionNumberRefId, laterSidVersion.buildNumberRefId, 'later-sid-active')
  assert(JSON.stringify(activeVersionRows(firstSid.id)) === frozenFirstVersionRowsAfterLocalChildren, 'Later active SID Version Update must not enter first historical SID Version Update history.')
  useAppStore.getState().saveSystemFormTransaction('allocated', laterSid.id, {
    remarks: [laterSidRemark],
  }, [], { preserveNewState: true })
  const finalMid = useAppStore.getState().reusedInternalSystems.find((system) => system.id === releasedMid.id)
  const finalFirstSid = useAppStore.getState().systems.find((system) => system.id === firstSid.id)
  const finalLaterSid = useAppStore.getState().systems.find((system) => system.id === laterSid.id)
  const finalMidConfig = systemInventory.configurationHistoryForSystemRecord(finalMid, useAppStore.getState().systems)
  const finalFirstSidConfig = systemInventory.configurationHistoryForSystemRecord(finalFirstSid, useAppStore.getState().systems)
  const finalLaterSidConfig = systemInventory.configurationHistoryForSystemRecord(finalLaterSid, useAppStore.getState().systems)
  assert((finalMid?.remarks ?? []).map((remark) => remark.content).join('|') === 'R1 MID-local remark', 'MID Remarks must remain MID-local after multiple SID allocations.')
  assert((finalFirstSid?.remarks ?? []).map((remark) => remark.content).join('|') === 'R2 first SID-local remark|R2B historical SID remark remains editable', 'First SID Remarks must remain local and editable after release without propagating.')
  assert((finalLaterSid?.remarks ?? []).map((remark) => remark.content).join('|') === 'R3 later SID-local remark', 'Later SID Remarks must remain local.')
  assert(finalMidConfig.some((record) => record.configuration.mapCenter === 'C1 MID-local configuration'), 'MID Configuration History must retain C1.')
  assert(finalMidConfig.some((record) => record.id === sidConfigAfterFirstTenant[0]?.id && record.pid === firstProject.pid && record.sid === firstSid.sid), 'MID Configuration History must retain first SID first-tenant configuration with first PID/SID.')
  assert(finalMidConfig.some((record) => record.id === finalLaterSidConfig[0]?.id && record.pid === laterProject.pid && record.sid === laterSid.sid), 'MID Configuration History must retain later SID first-tenant configuration with later PID/SID.')
  assert(finalFirstSidConfig.length === 1 && finalFirstSidConfig[0]?.id === sidConfigAfterFirstTenant[0]?.id, 'First SID Configuration History must remain only its first-tenant entry after second reuse.')
  assert(finalLaterSidConfig.length === 1, 'Later SID Configuration History must contain only its own first-tenant entry.')
  assert(linkedProjects.linkedProjectRowsForSystem(finalMid, { projects: useAppStore.getState().projects, projectSystems: useAppStore.getState().projectSystems, projectTenants: useAppStore.getState().projectTenants, systems: useAppStore.getState().systems, opportunities: useAppStore.getState().opportunities, accounts: useAppStore.getState().accounts }).some((row) => row.pid === laterProject.pid && row.allocatedSystems.some((system) => system.sid === laterSid.sid)), 'MID Linked Projects must show the later POC/SID pair.')
  assert(linkedProjects.linkedProjectRowsForSystem(finalFirstSid, { projects: useAppStore.getState().projects, projectSystems: useAppStore.getState().projectSystems, projectTenants: useAppStore.getState().projectTenants, systems: useAppStore.getState().systems, opportunities: useAppStore.getState().opportunities, accounts: useAppStore.getState().accounts }).map((row) => row.pid).sort().join(';') === [firstProject.pid, sharedProject.pid].sort().join(';'), 'Frozen first SID Linked Projects must retain both POCs served by that SID.')
  assert(linkedProjects.linkedProjectRowsForSystem(finalLaterSid, { projects: useAppStore.getState().projects, projectSystems: useAppStore.getState().projectSystems, projectTenants: useAppStore.getState().projectTenants, systems: useAppStore.getState().systems, opportunities: useAppStore.getState().opportunities, accounts: useAppStore.getState().accounts }).map((row) => row.pid).join(';') === laterProject.pid, 'Later SID Linked Projects must remain later POC only.')
  assert(routeResolvedMid(systemInventory.formattedReusedInternalMachineId(finalMid.machineId))?.id === finalMid.id, 'Direct MID route must resolve the RIS-MID form even when a current SID exists.')
  assert(routeResolvedSid(finalFirstSid.sid)?.id === finalFirstSid.id, 'Direct historical SID route must resolve the historical SID form.')
  assert(routeResolvedSid(finalLaterSid.sid)?.id === finalLaterSid.id, 'Direct active SID route must resolve the active SID form.')
  assert(businessReferences.routePathForBusinessReference('SYSTEM', systemInventory.formattedReusedInternalMachineId(finalMid.machineId)) === `/systems/reused-internal/${systemInventory.formattedReusedInternalMachineId(finalMid.machineId)}`, 'Shared SYSTEM references must keep MID links on the MID route after reuse.')
  assert(businessReferences.routePathForBusinessReference('SYSTEM', finalFirstSid.sid) === `/systems/${finalFirstSid.sid}`, 'Shared SYSTEM references must keep historical SID links on the SID route.')
  assert(businessReferences.routePathForBusinessReference('SYSTEM', finalLaterSid.sid) === `/systems/${finalLaterSid.sid}`, 'Shared SYSTEM references must keep active SID links on the SID route.')
  const finalMidActivityIds = new Set(formActivityEvents(finalMid).map((event) => event.id))
  const finalFirstSidActivityIds = new Set(formActivityEvents(finalFirstSid).map((event) => event.id))
  const finalLaterSidActivityIds = new Set(formActivityEvents(finalLaterSid).map((event) => event.id))
  assert([...finalFirstSidActivityIds].some((id) => !finalMidActivityIds.has(id)), 'Historical SID Activity Log must retain SID-form activity that is not pulled into MID activity by machine ID.')
  assert([...finalLaterSidActivityIds].some((id) => !finalMidActivityIds.has(id)), 'Later SID Activity Log must retain later SID-form activity that is not pulled into MID activity by machine ID.')
  assert([...finalFirstSidActivityIds].some((id) => !finalLaterSidActivityIds.has(id)) && [...finalLaterSidActivityIds].some((id) => !finalFirstSidActivityIds.has(id)), 'SID1 and SID2 Activity Logs must remain form-specific.')
  repository.persistAppDataStateToStorage(useAppStore.getState(), globalThis.localStorage)
  const reconstructed = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  const reconstructedMid = reconstructed?.reusedInternalSystems.find((system) => system.id === finalMid.id)
  const reconstructedFirstSid = reconstructed?.systems.find((system) => system.id === finalFirstSid.id)
  const reconstructedLaterSid = reconstructed?.systems.find((system) => system.id === finalLaterSid.id)
  assert(Boolean(reconstructedMid && reconstructedFirstSid && reconstructedLaterSid), 'Persisted/reconstructed RIS state must retain MID, historical SID and active SID records.')
  assert((reconstructedFirstSid?.remarks ?? []).map((remark) => remark.content).join('|') === 'R2 first SID-local remark|R2B historical SID remark remains editable', 'Historical SID Remarks must survive storage reconstruction without propagating.')
  assert((reconstructedFirstSid?.documents ?? []).some((document) => document.description === 'D2B historical SID document remains editable'), 'Historical SID Documents must survive storage reconstruction without propagating.')
  assert(!(reconstructedMid?.remarks ?? []).some((remark) => remark.content === 'R2B historical SID remark remains editable') && !(reconstructedLaterSid?.remarks ?? []).some((remark) => remark.content === 'R2B historical SID remark remains editable'), 'Reconstructed historical SID Remarks must remain isolated from MID and later SID.')
  assert(!(reconstructedMid?.documents ?? []).some((document) => document.description === 'D2B historical SID document remains editable') && !(reconstructedLaterSid?.documents ?? []).some((document) => document.description === 'D2B historical SID document remains editable'), 'Reconstructed historical SID Documents must remain isolated from MID and later SID.')

  const afterProjection = repository.analyzeAppDataStateStorageProjection(useAppStore.getState())
  const broadBaselineCollections = changedCollections(afterProjection).filter((collection) =>
    ['roles', 'notificationRules', 'alertRecords', 'infrastructureItems'].includes(collection.key)
  )
  assert(broadBaselineCollections.length === 0, `RIS lifecycle must not reintroduce false baseline materialization: ${broadBaselineCollections.map((collection) => collection.key).join(', ')}.`)

  const productionSystem = useAppStore.getState().productionSystemInventory.find((system) => system.operationalStatus !== 'Canceled' && system.operationalStatus !== 'Cancelled')
  const productionProject = useAppStore.getState().projects.find((project) => project.mainType !== 'POC' && project.progressStatus === 'OPEN')
  if (productionSystem && productionProject) {
    const productionAllocation = useAppStore.getState().allocateProductionSystemToProject(productionProject.id, productionSystem.id)
    assert(productionAllocation.ok, `Production allocation smoke must remain unchanged: ${productionAllocation.message}`)
    assert(!useAppStore.getState().productionSystemInventory.some((system) => system.id === productionSystem.id), 'Production allocation must still move the inventory record out of the Production pool.')
  }

  const demoMid = useAppStore.getState().createReusedInternalSystem('910001')
  const demoOwner = {
    id: 'owner-ris-demo-qa',
    userId: 'qa-demo-owner',
    userName: 'qa-demo-owner',
    fullName: 'QA Demo Owner',
    title: 'Delivery Specialist',
    company: 'Penlink',
    phoneNumber: '',
    email: 'qa-demo-owner@example.com',
  }
  useAppStore.getState().saveSystemFormTransaction('reused', demoMid.id, {
    purpose: 'Demo',
    occupationStartDate: '2026-12-01',
    occupationEndDate: '2026-12-31',
    owners: [demoOwner],
  }, [], { preserveNewState: true })
  const demoMidReady = useAppStore.getState().reusedInternalSystems.find((system) => system.id === demoMid.id)
  assert(demoMidReady?.purpose === 'Demo', 'Manual Demo MID purpose must save through the normal RIS form transaction.')
  assert(systemInventory.canAddTenantFromSystemRecord(demoMidReady, useAppStore.getState().projectSystems), 'Demo MID Add Tenant must be enabled without a SID.')
  const demoTenantResult = useAppStore.getState().createInternalTenantForSystem('', demoMidReady.id)
  assert(demoTenantResult.ok, `Demo MID direct tenant creation must succeed without a SID: ${demoTenantResult.message}`)
  assert(systemInventory.hostedTenantsForSystemRecord(demoMidReady, useAppStore.getState().tenants, useAppStore.getState().systems, useAppStore.getState().projectSystems).length === 1, 'Demo MID direct tenant creation must reflect on the MID Tenant tab.')
  const noneMid = useAppStore.getState().createReusedInternalSystem('910002')
  assert(!systemInventory.canAddTenantFromSystemRecord(noneMid, useAppStore.getState().projectSystems), 'None MID Add Tenant must be disabled.')
  const obsoleteMid = useAppStore.getState().createReusedInternalSystem('910003')
  useAppStore.getState().saveSystemFormTransaction('reused', obsoleteMid.id, {
    purpose: 'OBSOLETE',
  }, [], { preserveNewState: true })
  const obsoleteMidReady = useAppStore.getState().reusedInternalSystems.find((system) => system.id === obsoleteMid.id)
  assert(systemInventory.reusedInternalAvailabilityStatus(obsoleteMidReady, useAppStore.getState().projectSystems, useAppStore.getState().projects, useAppStore.getState().systems) === 'Occupied', 'Obsolete MID availability must be Occupied under the authoritative Purpose-to-Availability rule.')

  const cleanupMid = useAppStore.getState().createReusedInternalSystem('910004')
  useAppStore.getState().saveSystemFormTransaction('reused', cleanupMid.id, {
    purpose: 'Demo',
    occupationStartDate: '2026-12-01',
    occupationEndDate: '2026-12-31',
  }, [], { preserveNewState: true })
  const cleanupTenantResult = useAppStore.getState().createInternalTenantForSystem('', cleanupMid.id)
  assert(cleanupTenantResult.ok, `Pre-POC direct MID Tenant must be created for cleanup regression: ${cleanupTenantResult.message}`)
  useAppStore.getState().saveSystemFormTransaction('reused', cleanupMid.id, {
    purpose: 'None',
    occupationStartDate: null,
    occupationEndDate: null,
  }, [], { preserveNewState: true })
  const cleanupProject = createPocProject('RIS pre-POC MID tenant cleanup POC', '2026-12-10', '2026-12-20')
  const cleanupAllocation = useAppStore.getState().allocateReusedInternalSystemToProject(cleanupProject.id, cleanupMid.id)
  assert(cleanupAllocation.ok, `Allocation after stale MID tenant cleanup must succeed: ${cleanupAllocation.message}`)
  const cleanupLink = useAppStore.getState().projectSystems.find((link) => link.id === cleanupAllocation.allocationId)
  const cleanupSid = useAppStore.getState().systems.find((system) => system.id === cleanupLink?.systemId)
  const retainedCleanupTenant = useAppStore.getState().tenants.find((tenant) => tenant.id === cleanupTenantResult.tenantId)
  assert(Boolean(retainedCleanupTenant), 'New POC allocation must retain the pre-POC MID Tenant record for history.')
  assert(String(retainedCleanupTenant?.operationalStatus ?? '').toLocaleLowerCase().includes('cancel'), 'New POC allocation must cancel stale MID tenants through the existing retained cancellation lifecycle before SID use.')
  assert((cleanupSid?.tenantIds ?? []).length === 0, 'New SID tenant scope must start clean after stale MID tenant cleanup.')

  console.log(JSON.stringify({
    mid: {
      id: reusedMidAgain.id,
      machineId: systemInventory.formattedReusedInternalMachineId(reusedMidAgain.machineId),
      route: businessReferences.systemReference(reusedMidAgain).routePath,
      purpose: reusedMidAgain.purpose,
      status: reusedMidAgain.status,
      currentSid: laterSid.sid,
      linkedProjects: midLinkedPids,
      purposeHistoryCount: systemInventory.reusedInternalPurposeHistory(reusedMidAgain, useAppStore.getState().projects, useAppStore.getState().projectSystems, useAppStore.getState().systems).length,
    },
    firstHistoricalSid: {
      sid: firstSid.sid,
      route: businessReferences.systemReference(firstSid).routePath,
      linkedProjects: systemInventory.currentProjectPidsForSystem(firstSidAfterReuse, useAppStore.getState().projects, useAppStore.getState().projectSystems),
      frozenAfterReuse: JSON.stringify(firstSidAfterReuse) === frozenFirstSnapshotAfterLocalChildren,
    },
    laterCurrentSid: {
      sid: laterSid.sid,
      route: businessReferences.systemReference(laterSid).routePath,
      linkedProjects: systemInventory.currentProjectPidsForSystem(laterSid, useAppStore.getState().projects, useAppStore.getState().projectSystems),
    },
    zeroChangeStillCleanBeforeLifecycle: {
      rawDeltaLength: zeroProjection.rawDeltaLength,
      changedCollections: changedCollections(zeroProjection),
    },
    afterLifecyclePayload: {
      serializedPayloadLength: afterProjection.serializedPayloadLength,
      changedCollections: changedCollections(afterProjection).map((collection) => ({
        key: collection.key,
        upserts: collection.upsertCount,
        deletes: collection.deletedCount,
      })),
    },
  }, null, 2))

  if (!process.exitCode) {
    console.log('V1.3 RIS dual-representation verification passed')
  }
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
