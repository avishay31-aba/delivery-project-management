import { createServer } from 'vite'

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 System/Project retention verification failed: ${message}`)
    process.exitCode = 1
  }
}

function routeMachineId(value) {
  return String(value ?? '').replace(/^M/i, '')
}

function pidSetForSystem(system, projects, projectSystems) {
  const projectById = new Map(projects.map((project) => [project.id, project]))
  return new Set(
    projectSystems
      .filter((link) => link.systemId === system.id)
      .map((link) => projectById.get(link.projectId)?.pid)
      .filter(Boolean),
  )
}

function historicalPidSetForMachine(machineId, projects, projectSystems) {
  const projectById = new Map(projects.map((project) => [project.id, project]))
  return new Set(
    projectSystems
      .filter((link) => routeMachineId(link.sourceMachineId) === routeMachineId(machineId))
      .map((link) => projectById.get(link.projectId)?.pid)
      .filter(Boolean),
  )
}

function systemsForProject(project, systems, projectSystems) {
  const systemIds = new Set(projectSystems.filter((link) => link.projectId === project.id && link.allocationStatus !== 'DEALLOCATED').map((link) => link.systemId))
  return systems.filter((system) => systemIds.has(system.id))
}

function activeLinksForMachine(machineId, projectSystems, systems) {
  return projectSystems.filter((link) => {
    if (link.allocationStatus === 'DEALLOCATED') return false
    if (routeMachineId(link.sourceMachineId) === routeMachineId(machineId)) return true
    const system = systems.find((candidate) => candidate.id === link.systemId)
    return system && routeMachineId(system.machineId) === routeMachineId(machineId)
  })
}

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
  const storeModule = await server.ssrLoadModule('/src/store/useAppStore.ts')
  const store = storeModule.useAppStore
  store.getState().resetToSeed()

  const createdRis = store.getState().createReusedInternalSystem('999903')
  const initial = store.getState()
  const availableRis = initial.reusedInternalSystems.find((system) => system.id === createdRis.id)
  const pocProjects = initial.projects
    .filter((project) => project.mainType === 'POC' && project.progressStatus === 'OPEN' && project.pocStartDate && project.pocEndDate)
    .slice(0, 2)
  assert(Boolean(availableRis), 'An available RIS must exist for the workflow scenario.')
  assert(pocProjects.length >= 2, 'Two open POC Projects with dates must exist for the workflow scenario.')

  const [poc1, poc2] = pocProjects
  const allocation1 = store.getState().allocateReusedInternalSystemToProject(poc1.id, availableRis.id)
  assert(allocation1.ok, `RIS allocation to POC 1 must succeed: ${allocation1.message}`)
  if (!allocation1.ok) throw new Error(allocation1.message)
  const afterAllocation1 = store.getState()
  const sid1 = afterAllocation1.systems.find((system) =>
    afterAllocation1.projectSystems.some((link) => link.id === allocation1.allocationId && link.systemId === system.id),
  )
  assert(Boolean(sid1), 'POC 1 allocation must create an allocated SID System.')
  assert(sid1.occupationStartDate === poc1.pocStartDate, 'Allocated RIS SID Occupation Start Date must come from POC 1 Start Date.')
  assert(sid1.occupationEndDate === poc1.pocEndDate, 'Allocated RIS SID Occupation End Date must come from POC 1 End Date.')
  assert(pidSetForSystem(sid1, afterAllocation1.projects, afterAllocation1.projectSystems).has(poc1.pid), 'System Linked Projects must include POC 1 after allocation.')
  assert(systemsForProject(poc1, afterAllocation1.systems, afterAllocation1.projectSystems).some((system) => system.id === sid1.id), 'POC 1 Allocated Systems must include the RIS SID after allocation.')

  const risAfterAllocation1 = afterAllocation1.reusedInternalSystems.find((system) => system.id === availableRis.id)
  const openHistory1 = risAfterAllocation1?.purposeHistory?.find((row) => row.purposeType === 'POC' && row.pid === poc1.pid && !row.endDate)
  assert(risAfterAllocation1?.status === 'Occupied', 'RIS must be occupied after POC 1 allocation.')
  assert(Boolean(openHistory1), 'POC 1 allocation must create a Purpose History row.')
  assert(openHistory1?.owner === '', 'Historical Owner must remain the owner snapshot from the allocated SID event.')

  store.getState().updateProject(poc1.id, {
    progressStatus: 'DONE',
    tasks: (poc1.tasks ?? []).map((task) => ({ ...task, status: 'DONE' })),
  })
  const afterPoc1Done = store.getState()
  const sid1AfterDone = afterPoc1Done.systems.find((system) => system.id === sid1.id)
  const risAfterDone = afterPoc1Done.reusedInternalSystems.find((system) => system.id === availableRis.id)
  assert(Boolean(sid1AfterDone), 'RIS SID must not disappear when POC 1 is completed.')
  assert(pidSetForSystem(sid1AfterDone, afterPoc1Done.projects, afterPoc1Done.projectSystems).has(poc1.pid), 'Completed POC 1 must remain in System Linked Projects.')
  assert(!systemsForProject(poc1, afterPoc1Done.systems, afterPoc1Done.projectSystems).some((system) => system.id === sid1.id), 'Completed POC 1 must remove the RIS SID from current Allocated Systems.')
  assert(sid1AfterDone?.purpose === 'POC' && sid1AfterDone?.availability === 'OCCUPIED', 'Completed POC 1 allocated SID must remain a frozen POC/Occupied allocation snapshot.')
  assert(sid1AfterDone?.occupationStartDate === poc1.pocStartDate && sid1AfterDone?.occupationEndDate === poc1.pocEndDate, 'Completed POC 1 allocated SID must retain its historical occupation dates.')
  assert(risAfterDone?.purpose === 'None' && risAfterDone?.status === 'Available', 'RIS must become available after the POC completion lifecycle.')
  assert(activeLinksForMachine(availableRis.machineId, afterPoc1Done.projectSystems, afterPoc1Done.systems).length === 0, 'RIS availability must be based on active allocations, not historical Linked Projects.')

  const historyIdsBeforeReuse = new Set((risAfterDone?.purposeHistory ?? []).map((row) => row.id))
  const allocation2 = store.getState().allocateReusedInternalSystemToProject(poc2.id, availableRis.id)
  assert(allocation2.ok, `RIS allocation to POC 2 must succeed: ${allocation2.message}`)
  if (!allocation2.ok) throw new Error(allocation2.message)
  const afterAllocation2 = store.getState()
  const sid2 = afterAllocation2.systems.find((system) =>
    afterAllocation2.projectSystems.some((link) => link.id === allocation2.allocationId && link.systemId === system.id),
  )
  const risAfterAllocation2 = afterAllocation2.reusedInternalSystems.find((system) => system.id === availableRis.id)
  assert(Boolean(sid2), 'POC 2 allocation must create an allocated SID System.')
  assert(sid2.occupationStartDate === poc2.pocStartDate, 'Allocated RIS SID Occupation Start Date must come from POC 2 Start Date.')
  assert(sid2.occupationEndDate === poc2.pocEndDate, 'Allocated RIS SID Occupation End Date must come from POC 2 End Date.')
  const sid2Projects = pidSetForSystem(sid2, afterAllocation2.projects, afterAllocation2.projectSystems)
  const sid1ProjectsAfterReuse = pidSetForSystem(sid1AfterDone, afterAllocation2.projects, afterAllocation2.projectSystems)
  const risProjectsAfterReuse = historicalPidSetForMachine(availableRis.machineId, afterAllocation2.projects, afterAllocation2.projectSystems)
  assert(sid1ProjectsAfterReuse.has(poc1.pid) && !sid1ProjectsAfterReuse.has(poc2.pid), 'Historical RIS SID Linked Projects must remain limited to POC 1 after MID reuse.')
  assert(sid2Projects.has(poc2.pid) && !sid2Projects.has(poc1.pid), 'Current RIS SID Linked Projects must remain limited to POC 2 after MID reuse.')
  assert(risProjectsAfterReuse.has(poc1.pid) && risProjectsAfterReuse.has(poc2.pid), 'RIS MID inventory Linked Projects must include both POC 1 and POC 2 history.')
  assert(sid1AfterDone.purpose === 'POC' && sid1AfterDone.availability === 'OCCUPIED', 'Historical RIS SID must stay frozen after MID reuse.')
  assert(!systemsForProject(poc1, afterAllocation2.systems, afterAllocation2.projectSystems).some((system) => system.id === sid1.id), 'POC 1 must not retain the original RIS SID under current Allocated Systems after reuse.')
  assert(systemsForProject(poc2, afterAllocation2.systems, afterAllocation2.projectSystems).some((system) => system.id === sid2.id), 'POC 2 must contain the reused RIS under Allocated Systems.')
  assert([...historyIdsBeforeReuse].every((id) => (risAfterAllocation2?.purposeHistory ?? []).some((row) => row.id === id)), 'RIS reuse must preserve previous Purpose History rows.')
  assert((risAfterAllocation2?.purposeHistory ?? []).filter((row) => row.purposeType === 'POC').length >= 2, 'RIS reuse must add a new POC Purpose History row.')

  store.getState().saveToStorage()
  const hydrated = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  const hydratedSid1 = hydrated?.systems.find((system) => system.id === sid1.id)
  const hydratedSid2 = hydrated?.systems.find((system) => system.id === sid2.id)
  const hydratedRis = hydrated?.reusedInternalSystems.find((system) => system.id === availableRis.id)
  assert(Boolean(hydratedSid1), 'Historical reused RIS SID must hydrate after baseline/delta persistence.')
  assert(Boolean(hydratedSid2), 'Reused RIS SID must hydrate after baseline/delta persistence.')
  assert(pidSetForSystem(hydratedSid1, hydrated.projects, hydrated.projectSystems).has(poc1.pid), 'Hydrated historical SID Linked Projects must retain POC 1.')
  assert(!pidSetForSystem(hydratedSid1, hydrated.projects, hydrated.projectSystems).has(poc2.pid), 'Hydrated historical SID Linked Projects must not gain POC 2.')
  assert(pidSetForSystem(hydratedSid2, hydrated.projects, hydrated.projectSystems).has(poc2.pid), 'Hydrated current SID Linked Projects must retain POC 2.')
  assert(!pidSetForSystem(hydratedSid2, hydrated.projects, hydrated.projectSystems).has(poc1.pid), 'Hydrated current SID Linked Projects must not gain POC 1.')
  assert(historicalPidSetForMachine(availableRis.machineId, hydrated.projects, hydrated.projectSystems).has(poc1.pid), 'Hydrated RIS MID Linked Projects must retain POC 1 history.')
  assert(historicalPidSetForMachine(availableRis.machineId, hydrated.projects, hydrated.projectSystems).has(poc2.pid), 'Hydrated RIS MID Linked Projects must retain POC 2 history.')
  assert(hydratedSid1.purpose === 'POC' && hydratedSid1.availability === 'OCCUPIED', 'Hydrated historical SID must remain POC/Occupied.')
  assert(hydratedSid2.occupationStartDate === poc2.pocStartDate, 'Hydrated occupation start date must be preserved.')
  assert(hydratedSid2.occupationEndDate === poc2.pocEndDate, 'Hydrated occupation end date must be preserved.')
  assert((hydratedRis?.purposeHistory ?? []).length === (risAfterAllocation2?.purposeHistory ?? []).length, 'Hydrated Purpose History must not duplicate or lose rows.')

  const hydratedAgain = repository.loadAppDataStateFromStorage(globalThis.localStorage)
  assert((hydratedAgain?.projectSystems ?? []).length === (hydrated?.projectSystems ?? []).length, 'Repeated hydrate must not duplicate System/Project relationships.')
  assert((hydratedAgain?.reusedInternalSystems.find((system) => system.id === availableRis.id)?.purposeHistory ?? []).length === (hydratedRis?.purposeHistory ?? []).length, 'Repeated hydrate must not duplicate Purpose History.')

  const finalqaSid = hydrated?.systems.find((system) => system.sid === 'S000270')
  const finalqaProject = hydrated?.projects.find((project) => project.pid === 'P000360')
  assert(Boolean(finalqaSid), 'Explicit QA SID S000270 must exist.')
  assert(Boolean(finalqaProject), 'Explicit QA Project P000360 must exist.')
  assert(pidSetForSystem(finalqaSid, hydrated.projects, hydrated.projectSystems).has('P000360'), 'S000270 Linked Projects must include P000360.')
  assert(finalqaSid.occupationStartDate === finalqaProject.pocStartDate, 'S000270 Occupation Start Date must match P000360 POC Start Date.')
  assert(finalqaSid.occupationEndDate === finalqaProject.pocEndDate, 'S000270 Occupation End Date must match P000360 POC End Date.')

  const relationshipKeys = (hydrated?.projectSystems ?? []).map((link) => `${link.id}`)
  assert(new Set(relationshipKeys).size === relationshipKeys.length, 'Project/System relationship IDs must remain unique.')

  console.log(JSON.stringify({
    ris: availableRis.machineId,
    poc1: poc1.pid,
    poc2: poc2.pid,
    sid1: sid1.sid,
    sid2: sid2.sid,
    linkedProjectsAfterReuse: [...sid2Projects].sort(),
    purposeHistoryRows: risAfterAllocation2?.purposeHistory?.length ?? 0,
    explicitQa: {
      sid: finalqaSid?.sid,
      pid: finalqaProject?.pid,
      occupationStartDate: finalqaSid?.occupationStartDate,
      occupationEndDate: finalqaSid?.occupationEndDate,
    },
  }, null, 2))
  console.log('V1.3 System/Project retention verification passed.')
} finally {
  await server.close()
}

process.exit(process.exitCode ?? 0)
