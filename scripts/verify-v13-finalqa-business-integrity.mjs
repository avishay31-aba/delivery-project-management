import { readFileSync } from 'node:fs'

const state = JSON.parse(readFileSync('src/data/seed.json', 'utf8'))
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

function inactiveStatus(value) {
  return ['cancel', 'deleted'].some((token) => String(value ?? '').toLocaleLowerCase().includes(token))
}

function tenantWarrantyGroup(tenant) {
  const statuses = (tenant.warranties ?? []).map((row) => row.warrantyStatus)
  if (statuses.length === 0 || statuses.every((status) => status === 'NOT_SET')) return 'NOT_SET'
  if (statuses.some((status) => ['VALID', 'PENDING', 'PLANNED', 'RENEWED'].includes(status))) return 'UNDER_CONTRACT'
  return 'OUT_OF_CONTRACT'
}

function collectNested(rows, key) {
  return rows.flatMap((row) => row[key] ?? [])
}

function loadProjectMilestoneTaskTemplates() {
  const source = readFileSync('src/config/project-milestone-templates.ts', 'utf8')
  const declarationIndex = source.indexOf('export const PROJECT_MILESTONE_TASK_TEMPLATES')
  const objectStart = source.indexOf('{', declarationIndex)
  const objectEnd = source.indexOf('\n} as Record', objectStart)
  if (declarationIndex < 0 || objectStart < 0 || objectEnd < 0) throw new Error('Unable to locate PROJECT_MILESTONE_TASK_TEMPLATES.')
  return Function(`return (${source.slice(objectStart, objectEnd + 2)})`)()
}

function projectMilestonePlanMatchesTemplate(project, templates) {
  const template = templates[project.milestoneTemplateId]
  if (!template) return false
  const expectedMilestones = [...new Map(template.rows.map((row) => [
    `${row.milestoneOrder}:${row.milestone}`,
    { order: row.milestoneOrder, name: row.milestone },
  ])).values()].sort((first, second) => first.order - second.order)
  const milestones = [...(project.milestones ?? [])].sort((first, second) => first.order - second.order)
  const tasks = [...(project.tasks ?? [])].sort((first, second) => first.order - second.order)
  return milestones.length === expectedMilestones.length &&
    tasks.length === template.rows.length &&
    expectedMilestones.every((expected, index) => milestones[index]?.order === expected.order && milestones[index]?.name === expected.name) &&
    template.rows.every((expected, index) => {
      const actual = tasks[index]
      return actual?.name === expected.task &&
        actual.department === expected.department &&
        actual.resource === expected.resource
    })
}

const projects = state.projects ?? []
const systems = state.systems ?? []
const productionSystemInventory = state.productionSystemInventory ?? []
const reusedInternalSystems = state.reusedInternalSystems ?? []
const tenants = state.tenants ?? []
const opportunities = state.opportunities ?? []
const projectSystems = state.projectSystems ?? []
const projectTenants = state.projectTenants ?? []
const infrastructureItems = state.infrastructureItems ?? []
const activityEvents = state.activityEvents ?? []
const projectsById = new Map(projects.map((project) => [project.id, project]))
const projectsByPid = new Map(projects.map((project) => [project.pid, project]))
const systemsById = new Map(systems.map((system) => [system.id, system]))
const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
const reusedSystemsByMachineId = new Map(reusedInternalSystems.map((system) => [system.machineId, system]))
const projectTemplates = loadProjectMilestoneTaskTemplates()

const reusedInternalPurposeInvariantMismatches = [
  ...reusedInternalSystems
    .filter((system) => !String(system.purpose ?? '').trim())
    .map((system) => `${system.machineId}:blank-purpose`),
  ...reusedInternalSystems
    .filter((system) => system.purpose === 'None' && system.status !== 'Available')
    .map((system) => `${system.machineId}:None/${system.status}`),
  ...reusedInternalSystems
    .filter((system) => system.purpose === 'POC' && system.status !== 'Occupied')
    .map((system) => `${system.machineId}:POC/${system.status}`),
  ...systems
    .filter((system) => system.source === 'Reused Internal Systems')
    .filter((system) => !String(system.purpose ?? '').trim())
    .map((system) => `${system.sid}:blank-purpose`),
  ...systems
    .filter((system) => system.source === 'Reused Internal Systems')
    .filter((system) => system.purpose === 'None' && system.availability !== 'AVAILABLE')
    .map((system) => `${system.sid}:None/${system.availability}`),
  ...systems
    .filter((system) => system.source === 'Reused Internal Systems')
    .filter((system) => system.purpose === 'POC' && system.availability !== 'OCCUPIED')
    .map((system) => `${system.sid}:POC/${system.availability}`),
]
expect(reusedInternalPurposeInvariantMismatches.length === 0, `RIS Purpose/Availability invariants failed: ${reusedInternalPurposeInvariantMismatches.join(', ')}`)

const projectTemplateMismatches = projects
  .filter((project) => project.milestoneTemplateId)
  .filter((project) => !projectMilestonePlanMatchesTemplate(project, projectTemplates))
  .map((project) => project.pid)
expect(projectTemplateMismatches.length === 0, `Projects must use their resolved milestone/task template shape: ${projectTemplateMismatches.join(', ')}`)

const doneProjectsWithOpenTasks = projects
  .filter((project) => project.progressStatus === 'DONE')
  .filter((project) => (project.tasks ?? []).some((task) => task.status !== 'DONE'))
  .map((project) => project.pid)
expect(doneProjectsWithOpenTasks.length === 0, `Done Projects must not have open applicable tasks: ${doneProjectsWithOpenTasks.join(', ')}`)

const openProjectsWithAllTasksDone = projects
  .filter((project) => project.progressStatus === 'OPEN' && (project.tasks ?? []).length > 0)
  .filter((project) => (project.tasks ?? []).every((task) => task.status === 'DONE'))
  .map((project) => project.pid)
expect(openProjectsWithAllTasksDone.length === 0, `Open Projects must not have every task DONE: ${openProjectsWithAllTasksDone.join(', ')}`)

const activePocRisMismatches = reusedInternalSystems
  .filter((system) => system.purpose === 'POC')
  .filter((system) => {
    const project = projectsById.get((system.currentProjectIds ?? [])[0])
    const purposeHistory = (system.purposeHistory ?? []).find((row) => row.purposeType === 'POC' && !row.endDate)
    return !project ||
      project.mainType !== 'POC' ||
      project.progressStatus !== 'OPEN' ||
      system.status !== 'Occupied' ||
      system.occupationStartDate !== project.pocStartDate ||
      system.occupationEndDate !== project.pocEndDate ||
      !purposeHistory ||
      purposeHistory.startDate !== project.pocStartDate
  })
  .map((system) => system.machineId)
expect(activePocRisMismatches.length === 0, `Active POC RIS rows must derive current occupation from their active POC Project: ${activePocRisMismatches.join(', ')}`)

const activeRisAllocationDateMismatches = projectSystems
  .filter((link) => link.allocationStatus !== 'DEALLOCATED' && link.allocationType === 'REUSED_INTERNAL')
  .map((link) => ({ link, system: systemsById.get(link.systemId), project: projectsById.get(link.projectId) }))
  .filter(({ system, project }) =>
    !system ||
    !project ||
    project.mainType !== 'POC' ||
    system.purpose !== 'POC' ||
    system.availability !== 'OCCUPIED' ||
    system.occupationStartDate !== project.pocStartDate ||
    system.occupationEndDate !== project.pocEndDate,
  )
  .map(({ link, system, project }) => `${system?.sid ?? link.systemId}/${project?.pid ?? link.projectId}`)
expect(activeRisAllocationDateMismatches.length === 0, `Active RIS POC allocated SIDs must carry occupation dates from their POC Project: ${activeRisAllocationDateMismatches.join(', ')}`)

const historicalAllocationLinkMismatches = projectSystems
  .map((link) => ({ link, system: systemsById.get(link.systemId), project: projectsById.get(link.projectId) }))
  .filter(({ system, project }) => !system || !project || !(system.linkedProjectIds ?? []).includes(project.id))
  .map(({ link, system, project }) => `${system?.sid ?? link.systemId}/${project?.pid ?? link.projectId}`)
expect(historicalAllocationLinkMismatches.length === 0, `Historical Project/System allocations must remain in System Linked Projects: ${historicalAllocationLinkMismatches.join(', ')}`)

const completedPocActiveRisAllocations = projectSystems
  .filter((link) => link.allocationType === 'REUSED_INTERNAL' && link.allocationStatus !== 'DEALLOCATED')
  .filter((link) => {
    const project = projectsById.get(link.projectId)
    return project?.mainType === 'POC' && project.progressStatus === 'DONE'
  })
  .map((link) => `${projectsById.get(link.projectId)?.pid ?? link.projectId}/${systemsById.get(link.systemId)?.sid ?? link.systemId}`)
expect(completedPocActiveRisAllocations.length === 0, `DONE POC Projects must not retain active RIS allocations: ${completedPocActiveRisAllocations.join(', ')}`)

const completedPocReleasedSidMismatches = projectSystems
  .filter((link) => link.allocationType === 'REUSED_INTERNAL' && link.allocationStatus === 'DEALLOCATED')
  .map((link) => ({ link, project: projectsById.get(link.projectId), system: systemsById.get(link.systemId) }))
  .filter(({ project }) => project?.mainType === 'POC' && project.progressStatus === 'DONE')
  .filter(({ system }) =>
    !system ||
    system.purpose !== 'None' ||
    system.availability !== 'AVAILABLE' ||
    Boolean(system.deliveryPid) ||
    Boolean(system.occupationStartDate || system.occupationEndDate),
  )
  .map(({ link, project, system }) => `${project?.pid ?? link.projectId}/${system?.sid ?? link.systemId}`)
expect(completedPocReleasedSidMismatches.length === 0, `Released DONE POC allocated SIDs must be None/Available with no current occupation dates: ${completedPocReleasedSidMismatches.join(', ')}`)

const completedPocPurposeHistoryMismatches = projectSystems
  .filter((link) => link.allocationType === 'REUSED_INTERNAL' && link.allocationStatus === 'DEALLOCATED')
  .map((link) => ({ link, project: projectsById.get(link.projectId), reused: reusedSystemsByMachineId.get(link.sourceMachineId) }))
  .filter(({ project }) => project?.mainType === 'POC' && project.progressStatus === 'DONE')
  .filter(({ project, reused }) => !(reused?.purposeHistory ?? []).some((row) =>
    row.purposeType === 'POC' &&
    row.startDate === project.pocStartDate &&
    row.endDate === project.pocEndDate &&
    row.owner,
  ))
  .map(({ project, link }) => `${project?.pid ?? link.projectId}/${link.sourceMachineId}`)
expect(completedPocPurposeHistoryMismatches.length === 0, `Completed POC RIS releases must retain POC Purpose History: ${completedPocPurposeHistoryMismatches.join(', ')}`)

const explicitQaSid = systems.find((system) => system.sid === 'S000270')
const explicitQaProject = projects.find((project) => project.pid === 'P000360')
const explicitQaAllocation = explicitQaSid && explicitQaProject
  ? projectSystems.find((link) => link.systemId === explicitQaSid.id && link.projectId === explicitQaProject.id)
  : undefined
expect(Boolean(explicitQaSid && explicitQaProject && explicitQaAllocation), 'Explicit QA scenario S000270/P000360 must exist and retain its allocation link.')
expect(
  explicitQaSid?.occupationStartDate === explicitQaProject?.pocStartDate &&
    explicitQaSid?.occupationEndDate === explicitQaProject?.pocEndDate,
  'Explicit QA scenario S000270/P000360 must display occupation dates from the POC Project.',
)

const explicitProjectQa = projects.find((project) => project.pid === 'P000390')
const explicitSystemQa = systems.find((system) => system.sid === 'S000300')
const explicitProjectSystemQa = explicitProjectQa && explicitSystemQa
  ? projectSystems.find((link) => link.projectId === explicitProjectQa.id && link.systemId === explicitSystemQa.id)
  : undefined
const explicitReusedSystemQa = explicitSystemQa ? reusedSystemsByMachineId.get(explicitSystemQa.machineId) : undefined
expect(Boolean(explicitProjectQa && explicitSystemQa && explicitProjectSystemQa && explicitReusedSystemQa), 'Explicit QA scenario P000390/S000300 must exist.')
expect(explicitProjectQa?.progressStatus === 'DONE', 'Explicit QA Project P000390 must be DONE.')
expect((explicitProjectQa?.tasks ?? []).length > 2 && (explicitProjectQa?.tasks ?? []).every((task) => task.status === 'DONE'), 'Explicit QA Project P000390 must retain DONE template tasks.')
expect(explicitProjectSystemQa?.allocationStatus === 'DEALLOCATED', 'Explicit QA Project P000390 must release S000300 allocation.')
expect(explicitSystemQa?.purpose === 'None' && explicitSystemQa?.availability === 'AVAILABLE' && explicitSystemQa?.deliveryPid === '' && !explicitSystemQa?.occupationStartDate && !explicitSystemQa?.occupationEndDate, 'Explicit QA System S000300 must be released to None/Available with no current occupation dates after POC completion.')
expect((explicitSystemQa?.linkedProjectIds ?? []).includes('P000390'), 'Explicit QA System S000300 must retain historical Linked Projects entry P000390.')
expect(!(explicitReusedSystemQa?.currentProjectIds ?? []).includes('P000390'), 'Explicit QA RIS M000060 must not retain P000390 as a current Project.')
expect((explicitReusedSystemQa?.purposeHistory ?? []).some((row) => row.purposeType === 'POC' && row.startDate === explicitProjectQa?.pocStartDate && row.endDate === explicitProjectQa?.pocEndDate), 'Explicit QA RIS M000060 must retain P000390 POC Purpose History.')

const invalidPocProjectDates = projects
  .filter((project) => project.mainType === 'POC' && project.pocStartDate && project.pocEndDate && project.pocEndDate < project.pocStartDate)
  .map((project) => `${project.pid}:${project.pocStartDate}>${project.pocEndDate}`)
expect(invalidPocProjectDates.length === 0, `POC Projects must not have End Date before Start Date: ${invalidPocProjectDates.join(', ')}`)

const purposeHistoryMissingOwner = reusedInternalSystems
  .flatMap((system) => (system.purposeHistory ?? []).map((row) => ({ system, row })))
  .filter(({ row }) => !row.owner)
  .map(({ system, row }) => `${system.machineId}/${row.recordId}`)
expect(purposeHistoryMissingOwner.length === 0, `RIS Purpose History rows must retain Owner snapshots: ${purposeHistoryMissingOwner.join(', ')}`)

const configurationHistoryTidIsSid = systems
  .flatMap((system) => (system.configurationHistory ?? []).map((row) => ({ system, row })))
  .filter(({ system, row }) => row.tid && row.tid === system.sid)
  .map(({ system, row }) => `${system.sid}/${row.recordId}`)
expect(configurationHistoryTidIsSid.length === 0, `System Configuration History TID must not store the owning SID: ${configurationHistoryTidIsSid.join(', ')}`)

const completedPocRisStaleLinks = reusedInternalSystems
  .filter((system) =>
    (system.currentProjectIds ?? []).some((projectId) => {
      const project = projectsById.get(projectId)
      return project?.mainType === 'POC' && project.progressStatus === 'DONE'
    }) ||
    (system.purpose !== 'POC' && (system.occupationStartDate || system.occupationEndDate)),
  )
  .map((system) => system.machineId)
expect(completedPocRisStaleLinks.length === 0, `Completed/non-POC RIS rows must not retain stale current POC occupation: ${completedPocRisStaleLinks.join(', ')}`)

const invalidWarrantyPredecessors = tenants.flatMap((tenant) => {
  const byId = new Map((tenant.warranties ?? []).map((warranty) => [warranty.warrantyId, warranty]))
  return (tenant.warranties ?? [])
    .filter((warranty) => warranty.predecessor)
    .filter((warranty) => {
      const predecessor = byId.get(warranty.predecessor)
      return !predecessor || (predecessor.endDate && warranty.startDate && predecessor.endDate > warranty.startDate)
    })
    .map((warranty) => `${tenant.tid}/${warranty.warrantyId}`)
})
expect(invalidWarrantyPredecessors.length === 0, `Renewed/successor warranties must have valid same-Tenant predecessors: ${invalidWarrantyPredecessors.join(', ')}`)

const authorizedReminderSources = [
  ...projects.flatMap((project) => (project.tasks ?? []).filter((task) => task.deadline).map((task) => `PROJECT_TASK:${project.id}:${task.id}`)),
  ...systems.flatMap((system) => (system.remarks ?? []).filter((remark) => remark.dueDate).map((remark) => `SYSTEM_REMARK:${system.id}:${remark.id}`)),
  ...tenants.flatMap((tenant) => (tenant.remarks ?? []).filter((remark) => remark.dueDate).map((remark) => `TENANT_REMARK:${tenant.id}:${remark.id}`)),
]
expect(!('reminders' in state) || (state.reminders ?? []).length === 0, 'Final-QA seed must not contain standalone persisted Reminder records.')
expect(authorizedReminderSources.length > 0, 'Final-QA seed must contain legitimate Project Task/System Remark/Tenant Remark due-date sources for derived Reminders.')
expect(infrastructureItems.flatMap((item) => item.maintenanceTasks ?? []).length > 0, 'Infrastructure maintenance task coverage must remain present, but must not be a Reminder source.')

expect(!('notifications' in state) || (state.notifications ?? []).length === 0, 'Final-QA seed must not contain standalone/fake Notification records.')
expect(!('alerts' in state) || (state.alerts ?? []).length === 0, 'Final-QA seed must not contain standalone/fake Alert records.')
const invalidActivityEvents = activityEvents.filter((event) => {
  const ref = event.primaryObject ?? {}
  if (ref.objectType === 'Project') return !projectsById.has(ref.id)
  if (ref.objectType === 'System') return !systemsById.has(ref.id)
  if (ref.objectType === 'Tenant') return !tenantsById.has(ref.id)
  return false
})
expect(invalidActivityEvents.length === 0, 'Seeded Activity events must resolve their primary object references.')

const tenantPidMismatches = tenants.filter((tenant) => tenant.deliveryPid && !projectsByPid.has(tenant.deliveryPid)).map((tenant) => tenant.tid)
expect(tenantPidMismatches.length === 0, `Tenant origin PIDs must resolve to Projects: ${tenantPidMismatches.join(', ')}`)

const activeAllocationMismatches = projectSystems
  .filter((link) => link.allocationStatus !== 'DEALLOCATED')
  .filter((link) => !projectsById.has(link.projectId) || !systemsById.has(link.systemId))
  .map((link) => link.id)
expect(activeAllocationMismatches.length === 0, `Active Project/System allocations must resolve both sides: ${activeAllocationMismatches.join(', ')}`)

const activeTenantAllocationMismatches = projectTenants
  .filter((link) => link.allocationStatus !== 'DEALLOCATED')
  .filter((link) => !projectsById.has(link.projectId) || !systemsById.has(link.systemId) || !tenantsById.has(link.tenantId))
  .map((link) => link.id)
expect(activeTenantAllocationMismatches.length === 0, `Active Project/Tenant allocations must resolve all sides: ${activeTenantAllocationMismatches.join(', ')}`)

const requirementUseCounts = new Map()
tenants.forEach((tenant) => {
  ;(tenant.requirementHistory ?? [])
    .filter((relationship) => relationship.status === 'CURRENT')
    .forEach((relationship) => {
      const key = `${relationship.projectId}:${relationship.requirementId}`
      requirementUseCounts.set(key, (requirementUseCounts.get(key) ?? 0) + 1)
    })
})
expect([...requirementUseCounts.values()].some((count) => count > 1), 'Final-QA seed must preserve a legitimate one-to-many Tenant Requirement scenario.')

const activeProductionSystems = systems.filter((system) => system.source === 'Production' && !inactiveStatus(system.operationalStatus))
const eligibleProductionSystems = activeProductionSystems.filter((system) => {
  const hostedTenants = tenants.filter((tenant) =>
    !inactiveStatus(tenant.operationalStatus) &&
    (tenant.hostedSystemId === system.id || tenant.systemId === system.id) &&
    ['UNDER_CONTRACT', 'NOT_SET'].includes(tenantWarrantyGroup(tenant)),
  )
  return hostedTenants.length > 0
})
const eligibleCloudPlatforms = new Set(eligibleProductionSystems.map((system) => system.cloudPlatform).filter(Boolean))
expect(eligibleProductionSystems.length > 0, 'Final-QA seed must contain eligible Production Systems for Version Upgrade Scheduler.')
;['AWS', 'Azure', "Customer's datacenter"].forEach((platform) => expect(eligibleCloudPlatforms.has(platform), `Version Upgrade eligibility must include ${platform} coverage.`))
expect(productionSystemInventory.some((system) => !inactiveStatus(system.operationalStatus)), 'Final-QA seed must contain ineligible standalone Production inventory Systems.')

const documents = [
  ...collectNested(projects, 'documents'),
  ...collectNested(systems, 'documents'),
  ...collectNested(tenants, 'documents'),
  ...collectNested(reusedInternalSystems, 'documents'),
  ...collectNested(productionSystemInventory, 'documents'),
  ...collectNested(infrastructureItems, 'documents'),
]
const remarks = [
  ...collectNested(projects, 'remarks'),
  ...collectNested(systems, 'remarks'),
  ...collectNested(tenants, 'remarks'),
  ...collectNested(reusedInternalSystems, 'remarks'),
  ...collectNested(productionSystemInventory, 'remarks'),
  ...collectNested(infrastructureItems, 'remarks'),
]
const configurationHistory = [
  ...collectNested(projects, 'configurationHistory'),
  ...collectNested(systems, 'configurationHistory'),
  ...collectNested(tenants, 'configurationHistory'),
  ...collectNested(reusedInternalSystems, 'configurationHistory'),
  ...collectNested(productionSystemInventory, 'configurationHistory'),
  ...collectNested(infrastructureItems, 'configurationHistory'),
]
;[
  ['Document', documents.map((row) => row.id)],
  ['Remark', remarks.map((row) => row.remarkId)],
  ['Configuration History', configurationHistory.map((row) => row.recordId)],
  ['Activity', activityEvents.map((row) => row.id)],
].forEach(([label, ids]) => {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index)
  expect(duplicates.length === 0, `${label} IDs must be globally unique: ${duplicates.slice(0, 10).join(', ')}`)
})

if (failures.length > 0) {
  console.error('V1.3 Final-QA business integrity verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log(JSON.stringify({
  projects: projects.length,
  doneProjects: projects.filter((project) => project.progressStatus === 'DONE').length,
  activePocRis: reusedInternalSystems.filter((system) => system.purpose === 'POC').length,
  invalidPocProjectDates: invalidPocProjectDates.length,
  purposeHistoryRows: reusedInternalSystems.flatMap((system) => system.purposeHistory ?? []).length,
  warrantySuccessors: tenants.flatMap((tenant) => tenant.warranties ?? []).filter((warranty) => warranty.predecessor).length,
  authorizedReminderSources: authorizedReminderSources.length,
  activityEvents: activityEvents.length,
  eligibleProductionSystems: eligibleProductionSystems.length,
  eligibleCloudPlatforms: [...eligibleCloudPlatforms].sort(),
}, null, 2))
console.log('V1.3 Final-QA business integrity verification passed.')
