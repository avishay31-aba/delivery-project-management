import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const inputPath = process.argv[2] || fileURLToPath(new URL('../src/data/seed.json', import.meta.url))
const state = JSON.parse(readFileSync(inputPath, 'utf8'))

function assert(condition, message) {
  if (!condition) {
    console.error(message)
    process.exitCode = 1
  }
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row)
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function loadProjectMilestoneTaskTemplates() {
  const source = readFileSync(fileURLToPath(new URL('../src/config/project-milestone-templates.ts', import.meta.url)), 'utf8')
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

function allRequirements(opportunity) {
  return [
    ...(opportunity.newTenantRequirements ?? []).map((requirement) => ({ opportunity, requirement, type: 'A' })),
    ...(opportunity.changeRequestRequirements ?? []).map((requirement) => ({ opportunity, requirement, type: 'B' })),
    ...(opportunity.standardRenewalRequirements ?? []).map((requirement) => ({ opportunity, requirement, type: 'C' })),
  ]
}

const accounts = state.accounts ?? []
const opportunities = state.opportunities ?? []
const projects = state.projects ?? []
const systems = state.systems ?? []
const tenants = state.tenants ?? []
const productionSystemInventory = state.productionSystemInventory ?? []
const reusedInternalSystems = state.reusedInternalSystems ?? []
const projectSystems = state.projectSystems ?? []
const projectTenants = state.projectTenants ?? []
const infrastructureItems = state.infrastructureItems ?? []
const referenceData = state.referenceData ?? []

const requirements = opportunities.flatMap(allRequirements)
const requirementIds = requirements.map(({ requirement }) => requirement.requirementId).sort((first, second) => {
  const firstNumber = Number(first.replace(/^A-/, ''))
  const secondNumber = Number(second.replace(/^A-/, ''))
  return firstNumber - secondNumber
})
const expectedRequirementIds = requirementIds.map((_, index) => `A-${String(index + 1).padStart(3, '0')}`)
const malformedRequirementIds = requirementIds.filter((requirementId) => !/^A-\d{3}$/.test(requirementId))
const duplicateRequirementIds = requirementIds.filter((requirementId, index) => requirementIds.indexOf(requirementId) !== index)
const nonSequentialRequirementIds = requirementIds.filter((requirementId, index) => requirementId !== expectedRequirementIds[index])

const projectsById = new Map(projects.map((project) => [project.id, project]))
const systemsById = new Map(systems.map((system) => [system.id, system]))
const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
const reusedSystemsByMachineId = new Map(reusedInternalSystems.map((system) => [system.machineId, system]))
const projectTemplates = loadProjectMilestoneTaskTemplates()
const requirementByProjectAndId = new Set()
projects.forEach((project) => {
  const opportunity = opportunities.find((candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId)
  allRequirements(opportunity ?? {}).forEach(({ requirement }) => {
    requirementByProjectAndId.add(`${project.id}::${requirement.requirementId}`)
  })
})

const tenantOriginProjectMismatches = tenants
  .filter((tenant) => !projects.some((project) => project.pid === tenant.deliveryPid))
  .map((tenant) => ({ tid: tenant.tid, deliveryPid: tenant.deliveryPid ?? '' }))

const tenantRequirementHistoryMismatches = tenants.flatMap((tenant) =>
  (tenant.requirementHistory ?? [])
    .filter((relationship) =>
      !projectsById.has(relationship.projectId) ||
      projectsById.get(relationship.projectId)?.pid !== relationship.pid ||
      !requirementByProjectAndId.has(`${relationship.projectId}::${relationship.requirementId}`),
    )
    .map((relationship) => ({ tid: tenant.tid, pid: relationship.pid, requirementId: relationship.requirementId })),
)

const activeProjectTenantMismatches = projectTenants
  .filter((link) => link.allocationStatus !== 'DEALLOCATED')
  .filter((link) => {
    const tenant = tenantsById.get(link.tenantId)
    return !tenant || tenant.operationalStatus === 'Deleted' || tenant.operationalStatus === 'Cancelled'
  })
  .map((link) => ({ id: link.id, tenantId: link.tenantId }))

const activeSystemAllocationMismatches = projectSystems
  .filter((link) => link.allocationStatus !== 'DEALLOCATED')
  .filter((link) => !projectsById.has(link.projectId) || !systemsById.has(link.systemId) || !['POC', 'DELIVERY', 'RENEWAL'].includes(projectsById.get(link.projectId)?.mainType))
  .map((link) => ({ id: link.id, projectId: link.projectId, systemId: link.systemId }))

const hostedProductionSystems = systems.filter((system) => system.source === 'Production')
const allProductionSystems = [...hostedProductionSystems, ...productionSystemInventory]
const productionSystemsById = new Map(allProductionSystems.map((system) => [system.id, system]))
const allAllocatedAndProductionSids = [...systems, ...productionSystemInventory].map((system) => system.sid).filter(Boolean)
const duplicateSystemSids = allAllocatedAndProductionSids.filter((sid, index) => allAllocatedAndProductionSids.indexOf(sid) !== index)
const projectTemplateMismatches = projects
  .filter((project) => project.milestoneTemplateId)
  .filter((project) => !projectMilestonePlanMatchesTemplate(project, projectTemplates))
  .map((project) => project.pid)
const doneProjectsWithOpenTasks = projects
  .filter((project) => project.progressStatus === 'DONE')
  .filter((project) => (project.tasks ?? []).some((task) => task.status !== 'DONE'))
  .map((project) => project.pid)
const openProjectsWithAllTasksDone = projects
  .filter((project) => project.progressStatus === 'OPEN' && (project.tasks ?? []).length > 0)
  .filter((project) => (project.tasks ?? []).every((task) => task.status === 'DONE'))
  .map((project) => project.pid)
const onPremProductionSystems = allProductionSystems.filter((system) => system.hostingType === 'On premise')
const openPocProjects = projects.filter((project) => project.mainType === 'POC' && project.progressStatus === 'OPEN')
const donePocProjects = projects.filter((project) => project.mainType === 'POC' && project.progressStatus === 'DONE')
const invalidPocProjectDates = projects
  .filter((project) => project.mainType === 'POC' && project.pocStartDate && project.pocEndDate && project.pocEndDate < project.pocStartDate)
  .map((project) => `${project.pid}:${project.pocStartDate}>${project.pocEndDate}`)
const activePocRisMissingOccupationDates = reusedInternalSystems
  .filter((system) => system.purpose === 'POC')
  .filter((system) => !system.occupationStartDate || !system.occupationEndDate)
  .map((system) => system.machineId)
const purposeHistoryMissingOwner = reusedInternalSystems
  .flatMap((system) => (system.purposeHistory ?? []).map((row) => ({ system, row })))
  .filter(({ row }) => !row.owner)
  .map(({ system, row }) => `${system.machineId}/${row.recordId}`)
const configurationHistoryTidIsSid = systems
  .flatMap((system) => (system.configurationHistory ?? []).map((row) => ({ system, row })))
  .filter(({ system, row }) => row.tid && row.tid === system.sid)
  .map(({ system, row }) => `${system.sid}/${row.recordId}`)
const reusedPurposeCounts = countBy(reusedInternalSystems, (system) => system.purpose)
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
const accountsByRegion = countBy(accounts, (account) => account.region)
const referenceById = new Map(referenceData.map((record) => [record.id, record]))
const referenceLabel = (id) => referenceById.get(id)?.label ?? ''
const infrastructureIds = infrastructureItems.map((item) => item.infrastructureId)
const duplicateInfrastructureIds = infrastructureIds.filter((infrastructureId, index) => infrastructureIds.indexOf(infrastructureId) !== index)
const infrastructureMaintenanceTasks = infrastructureItems.flatMap((item) => (item.maintenanceTasks ?? []).map((task) => ({ item, task })))
const infrastructureWarranties = infrastructureItems.flatMap((item) => (item.warranties ?? []).map((warranty) => ({ item, warranty })))
const infrastructureWarrantyIds = infrastructureWarranties.map(({ warranty }) => warranty.warrantyId)
const duplicateInfrastructureWarrantyIds = infrastructureWarrantyIds.filter((warrantyId, index) => infrastructureWarrantyIds.indexOf(warrantyId) !== index)
const infrastructureMaintenanceTaskIds = infrastructureMaintenanceTasks.map(({ task }) => task.taskId)
const duplicateInfrastructureMaintenanceTaskIds = infrastructureMaintenanceTaskIds.filter((taskId, index) => infrastructureMaintenanceTaskIds.indexOf(taskId) !== index)
const infrastructureItemsByLinkedSystem = new Map()
infrastructureItems.forEach((item) => {
  ;(item.linkedSystemIds ?? []).forEach((systemId) => {
    const rows = infrastructureItemsByLinkedSystem.get(systemId) ?? []
    rows.push(item)
    infrastructureItemsByLinkedSystem.set(systemId, rows)
  })
})
const onPremInfrastructurePairMismatches = onPremProductionSystems
  .map((system) => {
    const linkedItems = infrastructureItemsByLinkedSystem.get(system.id) ?? []
    const hpServers = linkedItems.filter((item) => referenceLabel(item.typeRefId) === 'Server' && ['HP', 'HPE'].includes(referenceLabel(item.manufacturerRefId)))
    const fortigateFirewalls = linkedItems.filter((item) => referenceLabel(item.typeRefId) === 'Firewall' && referenceLabel(item.manufacturerRefId) === 'FortiGate')
    return { sid: system.sid, linkedItems: linkedItems.length, hpServers: hpServers.length, fortigateFirewalls: fortigateFirewalls.length }
  })
  .filter((row) => row.linkedItems !== 2 || row.hpServers !== 1 || row.fortigateFirewalls !== 1)
const infrastructureOrphans = infrastructureItems
  .filter((item) => item.operationalStatus !== 'Cancelled')
  .filter((item) => (item.linkedSystemIds ?? []).length === 0 || !(item.linkedSystemIds ?? []).every((systemId) => productionSystemsById.has(systemId)))
  .map((item) => ({ infrastructureId: item.infrastructureId, linkedSystemIds: item.linkedSystemIds ?? [] }))
const cancelledLinkedInfrastructureItems = infrastructureItems
  .filter((item) => item.operationalStatus === 'Cancelled' && (item.linkedSystemIds ?? []).length > 0)
  .map((item) => ({ infrastructureId: item.infrastructureId, linkedSystemIds: item.linkedSystemIds ?? [] }))
const infrastructureBadReferences = infrastructureItems
  .filter((item) =>
    !referenceById.has(item.categoryRefId) ||
    !referenceById.has(item.typeRefId) ||
    !referenceById.has(item.manufacturerRefId) ||
    !referenceById.has(item.ownerRefId) ||
    !referenceById.has(item.billingMethodRefId) ||
    !referenceById.has(item.warrantyTypeRefId),
  )
  .map((item) => item.infrastructureId)
const infrastructureBadWarrantyRows = infrastructureWarranties
  .filter(({ item, warranty }) =>
    !warranty.warrantyId ||
    !['VALID', 'PENDING', 'EXPIRED'].includes(warranty.warrantyStatus) ||
    !warranty.startDate ||
    !warranty.endDate ||
    item.currentWarrantyStartDate !== warranty.startDate ||
    item.currentWarrantyEndDate !== warranty.endDate,
  )
  .map(({ item, warranty }) => ({ infrastructureId: item.infrastructureId, warrantyId: warranty.warrantyId }))
const validMaintenanceStatuses = new Set(['Open', 'In Progress', 'Done'])
const validRecurrenceFrequencies = new Set(['none', 'daily', 'weekly', 'monthly', 'yearly'])
const validRecurrenceEndTypes = new Set(['none', 'after', 'by'])
const infrastructureBadMaintenanceRows = infrastructureMaintenanceTasks
  .filter(({ item, task }) => {
    const recurrence = task.recurrence ?? {}
    if (!task.taskId || !validMaintenanceStatuses.has(task.taskStatus)) return true
    if (!referenceById.has(task.taskTypeRefId) || !referenceById.has(task.assignedResourceRefId)) return true
    if (!validRecurrenceFrequencies.has(recurrence.frequency) || !validRecurrenceEndTypes.has(recurrence.endType)) return true
    if (recurrence.frequency !== 'none' && !recurrence.startDate) return true
    if (recurrence.frequency === 'weekly' && (recurrence.weeklyWeekdays ?? []).length === 0) return true
    if (recurrence.frequency === 'monthly' && (recurrence.monthlyMode ?? 'day') === 'day' && !(recurrence.monthlyDay >= 1 && recurrence.monthlyDay <= 31)) return true
    if (recurrence.frequency === 'yearly' && !(recurrence.yearlyMonth >= 1 && recurrence.yearlyMonth <= 12)) return true
    if (recurrence.frequency === 'yearly' && (recurrence.yearlyMode ?? 'date') === 'date' && !(recurrence.yearlyDay >= 1 && recurrence.yearlyDay <= 31)) return true
    if (recurrence.endType === 'after' && !(recurrence.endAfterOccurrences >= 1 && recurrence.endAfterOccurrences <= 99)) return true
    if (recurrence.endType === 'by' && (!recurrence.endByDate || recurrence.endByDate < recurrence.startDate)) return true
    return false
  })
  .map(({ item, task }) => ({ infrastructureId: item.infrastructureId, taskId: task.taskId }))
const hpServerCount = infrastructureItems.filter((item) => referenceLabel(item.typeRefId) === 'Server' && ['HP', 'HPE'].includes(referenceLabel(item.manufacturerRefId))).length
const fortigateFirewallCount = infrastructureItems.filter((item) => referenceLabel(item.typeRefId) === 'Firewall' && referenceLabel(item.manufacturerRefId) === 'FortiGate').length
const maintenanceRecurrenceCounts = countBy(infrastructureMaintenanceTasks, ({ task }) => task.recurrence?.frequency ?? 'none')
const recurringMaintenanceCount = infrastructureMaintenanceTasks.filter(({ task }) => task.recurrence?.frequency && task.recurrence.frequency !== 'none').length
function tenantWarrantyGroup(tenant) {
  const statuses = (tenant.warranties ?? []).map((warranty) => warranty.warrantyStatus)
  if (statuses.length === 0 || statuses.every((status) => status === 'NOT_SET')) return 'NOT_SET'
  if (statuses.some((status) => status === 'NO_WARRANTY') && statuses.every((status) => status === 'NO_WARRANTY' || status === 'RENEWED')) return 'OUT_OF_CONTRACT'
  if (statuses.some((status) => status === 'OUT_OF_CONTRACT')) return 'OUT_OF_CONTRACT'
  return 'UNDER_CONTRACT'
}
function isCancelledTenant(tenant) {
  return String(tenant.operationalStatus ?? '').toLocaleLowerCase().includes('cancel')
}
function isCancelledStatus(value) {
  return String(value ?? '').toLocaleLowerCase().includes('cancel')
}
function isCancelledSystem(system) {
  return isCancelledStatus(system.operationalStatus)
}
function isCancelledProject(project) {
  return project?.progressStatus === 'CANCELLED' || isCancelledStatus(project?.progressStatus)
}
function tenantIsLifecycleInactive(tenant) {
  return ['Deleted - By System', 'Cancelled - By System', 'Deleted', 'Cancelled'].includes(tenant?.operationalStatus)
}
function activeTenantSystemId(tenant) {
  if (tenantIsLifecycleInactive(tenant)) return ''
  return tenant?.hostedSystemId || tenant?.systemId || ''
}
function tenantCurrentOperationalSystem(tenant, systemRows) {
  const systemId = activeTenantSystemId(tenant)
  return systemId ? systemRows.find((system) => system.id === systemId && !isCancelledSystem(system)) : undefined
}
function tenantIsEligibleSystemTimeGroupGovernor(tenant) {
  return tenant.tenantType === 'CUSTOMER' || tenant.tenantType === 'POC'
}
function activeHostingDateForTenant(tenant, systemId) {
  const activeHistory = (tenant.hostedSystemHistory ?? [])
    .filter((entry) => entry.systemId === systemId && entry.endedAt == null)
    .sort((first, second) => first.startedAt.localeCompare(second.startedAt))[0]
  return activeHistory?.startedAt || tenant.createdAt || ''
}
function activeEligibleTimeGroupGovernor(system) {
  return tenants
    .filter((tenant) =>
      tenantIsEligibleSystemTimeGroupGovernor(tenant) &&
      !tenantIsLifecycleInactive(tenant) &&
      activeTenantSystemId(tenant) === system.id,
    )
    .sort((first, second) => {
      const firstDate = activeHostingDateForTenant(first, system.id)
      const secondDate = activeHostingDateForTenant(second, system.id)
      if (firstDate !== secondDate) return firstDate.localeCompare(secondDate)
      return first.tid.localeCompare(second.tid, undefined, { numeric: true, sensitivity: 'base' })
    })[0]
}
const tenantCancellationPresentationScenarios = ['NOT_SET', 'UNDER_CONTRACT', 'OUT_OF_CONTRACT'].flatMap((warrantyGroup) =>
  ['Deleted'].map((operationalStatus) => ({
    warrantyGroup,
    operationalStatus,
    count: tenants.filter((tenant) => tenant.tenantType === 'CUSTOMER' && tenant.operationalStatus === operationalStatus && tenantWarrantyGroup(tenant) === warrantyGroup).length,
  })),
)
const retainedLegacyCancelledTenants = tenants.filter(isCancelledTenant)
const tenantDashboardRows = tenants.filter((tenant) => !isCancelledTenant(tenant))
const tenantWorkspaceMembership = {
  tenantDashboardRows: tenantDashboardRows.length,
  tenantDashboardCancelledRows: tenantDashboardRows.filter(isCancelledTenant).length,
  retainedLegacyCancelledTenants: retainedLegacyCancelledTenants.length,
  tenantDashboardNonCancelledByWarrantyGroup: countBy(tenantDashboardRows, tenantWarrantyGroup),
  tenantDashboardDeletedByWarrantyGroup: countBy(tenantDashboardRows.filter((tenant) => tenant.operationalStatus === 'Deleted'), tenantWarrantyGroup),
}
const cancelledProjects = projects.filter((project) => project.progressStatus === 'CANCELLED')
const cancelledSystems = [...systems, ...productionSystemInventory, ...reusedInternalSystems].filter((system) => system.operationalStatus === 'Canceled' || system.operationalStatus === 'Cancelled')
const cancelledInfrastructureItems = infrastructureItems.filter((item) => item.operationalStatus === 'Cancelled')
const cancelledInfrastructureMaintenanceTasks = cancelledInfrastructureItems.flatMap((item) => item.maintenanceTasks ?? [])
const activeProjectSystemLinks = projectSystems.filter((link) => link.allocationStatus !== 'DEALLOCATED')
const activeProjectTenantLinks = projectTenants.filter((link) => link.allocationStatus !== 'DEALLOCATED')
const activeProjectSystemIds = new Set(activeProjectSystemLinks.map((link) => link.systemId))
const operationalProductionInventorySystemIds = new Set(
  productionSystemInventory
    .filter((system) => !isCancelledSystem(system) && !activeProjectSystemIds.has(system.id))
    .map((system) => system.id),
)
const operationalAllocatedSystemIds = new Set(
  systems
    .filter((system) => !isCancelledSystem(system) && activeProjectSystemIds.has(system.id))
    .map((system) => system.id),
)
const operationalReusedInternalSystemIds = new Set(
  reusedInternalSystems
    .filter((system) => !isCancelledSystem(system))
    .map((system) => system.id),
)
const allSystemRecords = [...systems, ...productionSystemInventory, ...reusedInternalSystems]
const activeTenantsHostedByCancelledSystems = tenants
  .map((tenant) => ({ tenant, systemId: activeTenantSystemId(tenant) }))
  .filter(({ tenant, systemId }) => !isCancelledTenant(tenant) && systemId)
  .map(({ tenant, systemId }) => ({ tenant, system: allSystemRecords.find((candidate) => candidate.id === systemId), systemId }))
  .filter(({ system }) => isCancelledSystem(system))
  .map(({ tenant, system, systemId }) => ({
    tid: tenant.tid,
    tenantStatus: tenant.operationalStatus,
    systemId,
    systemStatus: system?.operationalStatus ?? '',
  }))
const syntheticCancelledSystem = { id: '__synthetic-cancelled-system__', sid: 'S999999', operationalStatus: 'Cancelled' }
const syntheticActiveTenant = { id: '__synthetic-active-tenant__', tid: 'T999999', hostedSystemId: syntheticCancelledSystem.id, operationalStatus: 'Under Contract' }
const syntheticTenantCurrentOperationalSystemBlocked =
  tenantCurrentOperationalSystem(syntheticActiveTenant, [syntheticCancelledSystem]) === undefined
const activeEligibleTenantsMissingTimeGroup = tenants
  .filter((tenant) => tenantIsEligibleSystemTimeGroupGovernor(tenant) && !tenantIsLifecycleInactive(tenant))
  .filter((tenant) => !tenant.timeGroup)
  .map((tenant) => ({ tid: tenant.tid, tenantType: tenant.tenantType, country: tenant.country, state: tenant.state ?? '', deliveryPid: tenant.deliveryPid ?? '' }))
const activeSystemTimeGroupMismatches = systems
  .map((system) => ({ system, governor: activeEligibleTimeGroupGovernor(system) }))
  .filter(({ governor }) => Boolean(governor))
  .filter(({ system, governor }) => system.timeGroup !== governor.timeGroup)
  .map(({ system, governor }) => ({
    sid: system.sid ?? system.id,
    timeGroup: system.timeGroup ?? '',
    governorTid: governor.tid,
    governorTimeGroup: governor.timeGroup ?? '',
  }))
const operationalProjectSystemVisibilityLeaks = activeProjectSystemLinks
  .map((link) => ({ link, project: projectsById.get(link.projectId), system: systemsById.get(link.systemId) }))
  .filter(({ project, system }) => isCancelledProject(project) || isCancelledSystem(system))
  .map(({ link, project, system }) => ({
    allocationId: link.id,
    pid: project?.pid ?? link.projectId,
    projectStatus: project?.progressStatus ?? '',
    sid: system?.sid ?? link.systemId,
    systemStatus: system?.operationalStatus ?? '',
  }))
const operationalProjectTenantVisibilityLeaks = activeProjectSystemLinks.flatMap((systemLink) => {
  const project = projectsById.get(systemLink.projectId)
  const system = systemsById.get(systemLink.systemId)
  return activeProjectTenantLinks
    .filter((tenantLink) => tenantLink.projectId === systemLink.projectId && tenantLink.systemId === systemLink.systemId)
    .map((tenantLink) => ({ tenantLink, tenant: tenantsById.get(tenantLink.tenantId), project, system }))
    .filter(({ tenant, project, system }) => isCancelledProject(project) || isCancelledSystem(system) || isCancelledTenant(tenant))
    .map(({ tenantLink, tenant, project, system }) => ({
      allocationId: tenantLink.id,
      pid: project?.pid ?? tenantLink.projectId,
      projectStatus: project?.progressStatus ?? '',
      sid: system?.sid ?? tenantLink.systemId,
      systemStatus: system?.operationalStatus ?? '',
      tid: tenant?.tid ?? tenantLink.tenantId,
      tenantStatus: tenant?.operationalStatus ?? '',
    }))
})
const retainedCancelledTenantSystemReferences = systems.flatMap((system) =>
  tenants
    .filter((tenant) => (tenant.hostedSystemId || tenant.systemId) === system.id && isCancelledTenant(tenant))
    .map((tenant) => ({ sid: system.sid ?? system.id, tid: tenant.tid, tenantStatus: tenant.operationalStatus })),
)
const operationalSystemTenantVisibilityLeaks = systems.flatMap((system) =>
  tenants
    .filter((tenant) => !isCancelledTenant(tenant) && activeTenantSystemId(tenant) === system.id && isCancelledSystem(system))
    .map((tenant) => ({ sid: system.sid ?? system.id, tid: tenant.tid, tenantStatus: tenant.operationalStatus })),
)
const operationalInfrastructureVisibilityLeaks = infrastructureItems
  .filter((item) => item.operationalStatus === 'Cancelled' && (item.linkedSystemIds ?? []).length > 0)
  .map((item) => ({ infrastructureId: item.infrastructureId, linkedSystemIds: item.linkedSystemIds ?? [] }))
const cancelledProjectsWithActiveSystemAllocations = cancelledProjects
  .filter((project) => activeProjectSystemLinks.some((link) => link.projectId === project.id))
  .map((project) => project.pid)
const activeReusedInternalAllocations = activeProjectSystemLinks.filter((link) => link.allocationType === 'REUSED_INTERNAL')
const reusedInternalAllocationHistoryByMid = Object.entries(projectSystems
  .filter((link) => link.allocationType === 'REUSED_INTERNAL' && link.sourceMachineId)
  .reduce((groups, link) => {
    groups[link.sourceMachineId] = groups[link.sourceMachineId] ?? []
    groups[link.sourceMachineId].push(link)
    return groups
  }, {}))
const reusedInternalMultiUseHistory = reusedInternalAllocationHistoryByMid
  .filter(([, links]) => links.length > 1 && new Set(links.map((link) => link.systemId)).size === links.length)
  .map(([sourceMachineId, links]) => ({
    sourceMachineId,
    allocationSids: links.map((link) => link.systemId).sort(),
    projectIds: links.map((link) => link.projectId).sort(),
  }))
const activeReusedInternalAllocationIdentityMismatches = activeReusedInternalAllocations
  .filter((link) => {
    const allocatedSystem = systemsById.get(link.systemId)
    const reusedResource = reusedInternalSystems.find((system) => system.machineId === link.sourceMachineId)
    return !allocatedSystem || !allocatedSystem.sid || !link.sourceMachineId || !reusedResource || allocatedSystem.machineId !== link.sourceMachineId || allocatedSystem.sid === link.sourceMachineId
  })
  .map((link) => ({ id: link.id, systemId: link.systemId, sourceMachineId: link.sourceMachineId ?? '' }))
const activeReusedInternalOccupationDateMismatches = activeReusedInternalAllocations
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
  .map(({ link, system, project }) => ({ id: link.id, sid: system?.sid ?? link.systemId, pid: project?.pid ?? link.projectId }))
const historicalSystemAllocationMismatches = projectSystems
  .map((link) => ({ link, system: systemsById.get(link.systemId), project: projectsById.get(link.projectId) }))
  .filter(({ system, project }) =>
    !system ||
    !project ||
    !(system.linkedProjectIds ?? []).includes(project.id),
  )
  .map(({ link, system, project }) => ({ id: link.id, sid: system?.sid ?? link.systemId, pid: project?.pid ?? link.projectId }))
const completedPocActiveRisAllocations = projectSystems
  .filter((link) => link.allocationType === 'REUSED_INTERNAL' && link.allocationStatus !== 'DEALLOCATED')
  .filter((link) => {
    const project = projectsById.get(link.projectId)
    return project?.mainType === 'POC' && project.progressStatus === 'DONE'
  })
  .map((link) => ({ id: link.id, pid: projectsById.get(link.projectId)?.pid ?? link.projectId, sid: systemsById.get(link.systemId)?.sid ?? link.systemId }))
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
  .map(({ link, project, system }) => ({ pid: project?.pid ?? link.projectId, sid: system?.sid ?? link.systemId }))
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
  .map(({ project, link }) => ({ pid: project?.pid ?? link.projectId, machineId: link.sourceMachineId }))
const explicitQaSid = systems.find((system) => system.sid === 'S000270')
const explicitQaProject = projects.find((project) => project.pid === 'P000360')
const explicitQaAllocation = explicitQaSid && explicitQaProject
  ? projectSystems.find((link) => link.systemId === explicitQaSid.id && link.projectId === explicitQaProject.id)
  : undefined
const explicitQaOccupationDateMatch = Boolean(
  explicitQaSid &&
  explicitQaProject &&
  explicitQaAllocation &&
  explicitQaSid.occupationStartDate === explicitQaProject.pocStartDate &&
  explicitQaSid.occupationEndDate === explicitQaProject.pocEndDate,
)
const explicitProjectQa = projects.find((project) => project.pid === 'P000390')
const explicitSystemQa = systems.find((system) => system.sid === 'S000300')
const explicitProjectSystemQa = explicitProjectQa && explicitSystemQa
  ? projectSystems.find((link) => link.projectId === explicitProjectQa.id && link.systemId === explicitSystemQa.id)
  : undefined
const explicitReusedSystemQa = explicitSystemQa ? reusedSystemsByMachineId.get(explicitSystemQa.machineId) : undefined
const explicitProjectQaValid = Boolean(
  explicitProjectQa &&
  explicitSystemQa &&
  explicitProjectSystemQa &&
  explicitReusedSystemQa &&
  explicitProjectQa.progressStatus === 'DONE' &&
  (explicitProjectQa.tasks ?? []).length > 2 &&
  (explicitProjectQa.tasks ?? []).every((task) => task.status === 'DONE') &&
  explicitProjectSystemQa.allocationStatus === 'DEALLOCATED' &&
  explicitSystemQa.purpose === 'None' &&
  explicitSystemQa.availability === 'AVAILABLE' &&
  explicitSystemQa.deliveryPid === '' &&
  !explicitSystemQa.occupationStartDate &&
  !explicitSystemQa.occupationEndDate &&
  (explicitSystemQa.linkedProjectIds ?? []).includes(explicitProjectQa.id) &&
  !(explicitReusedSystemQa.currentProjectIds ?? []).includes(explicitProjectQa.id) &&
  (explicitReusedSystemQa.purposeHistory ?? []).some((row) =>
    row.purposeType === 'POC' &&
    row.startDate === explicitProjectQa.pocStartDate &&
    row.endDate === explicitProjectQa.pocEndDate,
  )
)
const activeAllocatedSystemsWithoutSid = systems
  .filter((system) => activeProjectSystemIds.has(system.id) && !system.sid)
  .map((system) => system.id)
const cancellableUnallocatedProductionSystems = productionSystemInventory.filter((system) => system.operationalStatus !== 'Canceled' && system.operationalStatus !== 'Cancelled' && !activeProjectSystemIds.has(system.id))
const allocatedProductionSystemsRejectCancellation = hostedProductionSystems.filter((system) => system.operationalStatus !== 'Canceled' && system.operationalStatus !== 'Cancelled' && activeProjectSystemIds.has(system.id))
const availableReusedInternalSystemsCanCancel = reusedInternalSystems.filter((system) => system.purpose === 'None' && system.operationalStatus !== 'Canceled' && system.operationalStatus !== 'Cancelled')
const occupiedReusedInternalSystemsRejectCancellation = reusedInternalSystems.filter(
  (system) =>
    system.operationalStatus !== 'Canceled' &&
    system.operationalStatus !== 'Cancelled' &&
    (activeProjectSystemLinks.some((link) => link.sourceMachineId === system.machineId || link.systemId === system.id) || !['None', 'OBSOLETE'].includes(system.purpose)),
)
const cancelledSystemsWithNoActiveAllocation = cancelledSystems.filter((system) => !activeProjectSystemIds.has(system.id))

const summary = {
  accounts: accounts.length,
  accountsByRegion,
  productionSystems: hostedProductionSystems.length + productionSystemInventory.length,
  hostedProductionSystems: hostedProductionSystems.length,
  productionInventorySystems: productionSystemInventory.length,
  duplicateSystemSids,
  projectTemplateMismatches,
  doneProjectsWithOpenTasks,
  openProjectsWithAllTasksDone,
  activeReusedInternalAllocations: activeReusedInternalAllocations.length,
  reusedInternalMultiUseHistory,
  activeReusedInternalAllocationIdentityMismatches,
  activeReusedInternalOccupationDateMismatches,
  historicalSystemAllocationMismatches,
  completedPocActiveRisAllocations,
  completedPocReleasedSidMismatches,
  completedPocPurposeHistoryMismatches,
  explicitQa: {
    sid: explicitQaSid?.sid ?? null,
    pid: explicitQaProject?.pid ?? null,
    allocationId: explicitQaAllocation?.id ?? null,
    occupationDateMatch: explicitQaOccupationDateMatch,
  },
  explicitProjectQa: {
    pid: explicitProjectQa?.pid ?? null,
    sid: explicitSystemQa?.sid ?? null,
    allocationStatus: explicitProjectSystemQa?.allocationStatus ?? null,
    projectValid: explicitProjectQaValid,
  },
  activeAllocatedSystemsWithoutSid,
  onPremProductionSystems: onPremProductionSystems.length,
  customerTenants: tenants.filter((tenant) => tenant.tenantType === 'CUSTOMER').length,
  reusedInternalSystems: reusedInternalSystems.length,
  reusedPurposeCounts,
  reusedInternalPurposeInvariantMismatches,
  openPocProjects: openPocProjects.length,
  donePocProjects: donePocProjects.length,
  invalidPocProjectDates,
  activePocRisMissingOccupationDates,
  purposeHistoryMissingOwner,
  configurationHistoryTidIsSid,
  requirements: requirementIds.length,
  infrastructureItems: infrastructureItems.length,
  hpServerCount,
  fortigateFirewallCount,
  infrastructureWarrantyRecords: infrastructureWarranties.length,
  infrastructureMaintenanceTasks: infrastructureMaintenanceTasks.length,
  maintenanceRecurrenceCounts,
  recurringMaintenanceCount,
  tenantCancellationPresentationScenarios,
  tenantWorkspaceMembership,
  operationalProductionInventorySystems: operationalProductionInventorySystemIds.size,
  operationalAllocatedSystems: operationalAllocatedSystemIds.size,
  operationalReusedInternalSystems: operationalReusedInternalSystemIds.size,
  activeTenantsHostedByCancelledSystems,
  syntheticTenantCurrentOperationalSystemBlocked,
  activeEligibleTenantsMissingTimeGroup,
  activeSystemTimeGroupMismatches,
  operationalProjectSystemVisibilityLeaks,
  operationalProjectTenantVisibilityLeaks,
  retainedCancelledTenantSystemReferences,
  operationalSystemTenantVisibilityLeaks,
  operationalInfrastructureVisibilityLeaks,
  cancelledProjects: cancelledProjects.length,
  cancelledProjectsWithActiveSystemAllocations,
  cancelledSystems: cancelledSystems.length,
  cancellableUnallocatedProductionSystems: cancellableUnallocatedProductionSystems.length,
  allocatedProductionSystemsRejectCancellation: allocatedProductionSystemsRejectCancellation.length,
  availableReusedInternalSystemsCanCancel: availableReusedInternalSystemsCanCancel.length,
  occupiedReusedInternalSystemsRejectCancellation: occupiedReusedInternalSystemsRejectCancellation.length,
  cancelledSystemsWithNoActiveAllocation: cancelledSystemsWithNoActiveAllocation.length,
  cancelledInfrastructureItems: cancelledInfrastructureItems.length,
  cancelledLinkedInfrastructureItems,
  cancelledInfrastructureMaintenanceTasks: cancelledInfrastructureMaintenanceTasks.length,
  tenantOriginProjectMismatches,
  tenantRequirementHistoryMismatches,
  activeProjectTenantMismatches,
  activeSystemAllocationMismatches,
  onPremInfrastructurePairMismatches,
  infrastructureOrphans,
  infrastructureBadReferences,
  infrastructureBadWarrantyRows,
  infrastructureBadMaintenanceRows,
  malformedRequirementIds,
  duplicateRequirementIds,
  nonSequentialRequirementIds,
  duplicateInfrastructureIds,
  duplicateInfrastructureWarrantyIds,
  duplicateInfrastructureMaintenanceTaskIds,
}

console.log(JSON.stringify({ inputPath, ...summary }, null, 2))

assert(accounts.length === 80, 'Final QA seed must contain 80 Customers.')
;['NA', 'EMEA', 'APAC', 'LATAM'].forEach((region) => assert(accountsByRegion[region] === 20, `Final QA seed must contain 20 Customers in ${region}.`))
assert(hostedProductionSystems.length === 200, 'Final QA seed must contain 200 hosted Production Systems.')
assert(productionSystemInventory.length === 40, 'Final QA seed must contain 40 standalone Production inventory Systems.')
assert(hostedProductionSystems.length + productionSystemInventory.length === 240, 'Final QA seed must contain 240 total Production Systems.')
assert(duplicateSystemSids.length === 0, 'SID values must be globally unique across allocated Systems and Production Inventory.')
assert(projectTemplateMismatches.length === 0, 'Projects must use their resolved milestone/task template shape.')
assert(doneProjectsWithOpenTasks.length === 0, 'DONE Projects must not have OPEN tasks.')
assert(openProjectsWithAllTasksDone.length === 0, 'OPEN Projects must not have every task DONE.')
assert(activeAllocatedSystemsWithoutSid.length === 0, 'Every active allocated System must have an SID.')
assert(activeReusedInternalAllocationIdentityMismatches.length === 0, 'Every active Reused Internal allocation must resolve an allocated SID instance and a distinct reusable MID resource.')
assert(activeReusedInternalOccupationDateMismatches.length === 0, 'Every active Reused Internal POC allocation must populate allocated SID occupation dates from the POC Project.')
assert(historicalSystemAllocationMismatches.length === 0, 'Every historical Project/System allocation must remain represented in the System Linked Projects field.')
assert(completedPocActiveRisAllocations.length === 0, 'DONE POC Projects must not retain active RIS allocations.')
assert(completedPocReleasedSidMismatches.length === 0, 'Released DONE POC allocated SIDs must be None/Available with no current occupation dates.')
assert(completedPocPurposeHistoryMismatches.length === 0, 'Completed POC RIS releases must retain historical POC Purpose History.')
assert(explicitQaOccupationDateMatch, 'Explicit QA scenario S000270/P000360 must retain the allocation and matching POC occupation dates.')
assert(explicitProjectQaValid, 'Explicit QA scenario P000390/S000300 must have completed template tasks, released RIS allocation, historical linkage, and retained POC Purpose History.')
assert(reusedInternalMultiUseHistory.some((row) => row.sourceMachineId === 'M000002' && row.allocationSids.length >= 2), 'Final QA seed must contain a deterministic Reused Internal MID with multiple SID allocation instances over time.')
assert(reusedInternalSystems.length === 60, 'Final QA seed must contain exactly 60 Reused Internal Systems.')
assert(reusedInternalPurposeInvariantMismatches.length === 0, 'RIS Purpose/Availability invariants must hold for MIDs and allocated reused SIDs.')
assert(reusedPurposeCounts.POC === 30, 'Final QA seed must contain 30 POC Reused Internal Systems.')
assert(reusedPurposeCounts.Demo === 10, 'Final QA seed must contain 10 Demo Reused Internal Systems.')
assert(reusedPurposeCounts.Training === 10, 'Final QA seed must contain 10 Training Reused Internal Systems.')
assert(reusedPurposeCounts.None === 8, 'Final QA seed must contain 8 None-purpose Reused Internal Systems.')
assert(reusedPurposeCounts.Support === 2, 'Final QA seed must contain 2 Support Reused Internal Systems.')
assert(openPocProjects.length === 30, 'Final QA seed must contain 30 open POC Projects.')
assert(donePocProjects.length === 30, 'Final QA seed must contain 30 done POC Projects.')
assert(invalidPocProjectDates.length === 0, 'Final QA seed must not contain invalid POC Project date ranges.')
assert(activePocRisMissingOccupationDates.length === 0, 'Active POC Reused Internal Systems must have occupation dates.')
assert(purposeHistoryMissingOwner.length === 0, 'RIS Purpose History rows must retain Owner snapshots.')
assert(configurationHistoryTidIsSid.length === 0, 'System Configuration History TID must contain the Tenant ID, not the owning SID.')
assert(malformedRequirementIds.length === 0, 'Requirement IDs must use A-xxx format.')
assert(duplicateRequirementIds.length === 0, 'Requirement IDs must be globally unique.')
assert(nonSequentialRequirementIds.length === 0, 'Requirement IDs must be globally sequential without gaps.')
assert(tenantOriginProjectMismatches.length === 0, 'Every Tenant origin PID must resolve to a Project.')
assert(tenantRequirementHistoryMismatches.length === 0, 'Every Tenant Requirement history row must resolve to its PID/Project Requirement.')
assert(activeProjectTenantMismatches.length === 0, 'Inactive Tenants must not have active Project-Tenant allocations.')
assert(activeSystemAllocationMismatches.length === 0, 'Active System allocations must resolve to valid POC/Delivery/Renewal Projects and Systems.')
assert(onPremProductionSystems.length === 20, 'Final QA seed must contain exactly 20 On-Prem Production Systems.')
assert(hpServerCount === 20, 'Every On-Prem Production System must have exactly one HP/HPE Server.')
assert(fortigateFirewallCount === 20, 'Every On-Prem Production System must have exactly one FortiGate Firewall.')
assert(infrastructureItems.length === 41, 'Final QA seed must contain 40 On-Prem Infrastructure Items plus one cancelled unlinked release-first scenario.')
assert(infrastructureWarranties.length === 41, 'Every Final QA Infrastructure Item must have one Warranty record.')
assert(infrastructureMaintenanceTasks.length === 41, 'Every Final QA Infrastructure Item must have one scheduled Maintenance Task.')
;['none', 'weekly', 'monthly', 'yearly'].forEach((frequency) => assert(maintenanceRecurrenceCounts[frequency] === 8, `Final QA Infrastructure Maintenance must contain 8 ${frequency} tasks.`))
assert(maintenanceRecurrenceCounts.daily === 9, 'Final QA Infrastructure Maintenance must contain 8 On-Prem daily tasks plus one cancelled unlinked daily scenario.')
assert(recurringMaintenanceCount >= 30, 'Final QA Infrastructure Maintenance must include a useful recurring-task mix.')
assert(onPremInfrastructurePairMismatches.length === 0, 'Every On-Prem Production System must resolve exactly one HP/HPE Server and one FortiGate Firewall.')
assert(infrastructureOrphans.length === 0, 'Every active Infrastructure Item must resolve to a valid Production System.')
assert(cancelledLinkedInfrastructureItems.length === 0, 'Cancelled Infrastructure Items must be unlinked from Systems.')
assert(infrastructureBadReferences.length === 0, 'Every Infrastructure Item must use valid reference-data values.')
assert(infrastructureBadWarrantyRows.length === 0, 'Every Infrastructure Warranty row must be valid and aligned to its Infrastructure Item.')
assert(infrastructureBadMaintenanceRows.length === 0, 'Every Infrastructure Maintenance Task must use valid references and recurrence data.')
assert(duplicateInfrastructureIds.length === 0, 'Infrastructure Item IDs must be unique.')
assert(duplicateInfrastructureWarrantyIds.length === 0, 'Infrastructure Warranty IDs must be unique.')
assert(duplicateInfrastructureMaintenanceTaskIds.length === 0, 'Infrastructure Maintenance Task IDs must be unique.')
tenantCancellationPresentationScenarios.forEach((scenario) => {
  assert(scenario.count > 0, `Final QA seed must contain Customer Tenant scenario ${scenario.warrantyGroup} + ${scenario.operationalStatus}.`)
})
assert(tenantWorkspaceMembership.tenantDashboardRows === tenants.length - retainedLegacyCancelledTenants.length, 'Operational Tenant Dashboard must exclude retained historical Cancelled records.')
;['NOT_SET', 'UNDER_CONTRACT', 'OUT_OF_CONTRACT'].forEach((warrantyGroup) => {
  assert((tenantWorkspaceMembership.tenantDashboardNonCancelledByWarrantyGroup[warrantyGroup] ?? 0) > 0, `Tenant Dashboard must contain ${warrantyGroup} Tenants.`)
  assert((tenantWorkspaceMembership.tenantDashboardDeletedByWarrantyGroup[warrantyGroup] ?? 0) > 0, `Tenant Dashboard must contain Deleted ${warrantyGroup} Tenants.`)
})
assert(cancelledProjects.some((project) => project.cancellationReason && project.cancellationPreviousProgressStatus && (project.cancellationHistory ?? []).length > 0), 'Final QA seed must contain a cancelled Project with cancellation audit history.')
assert(cancelledProjectsWithActiveSystemAllocations.length === 0, 'Cancelled Projects must not retain active System allocations.')
assert(cancelledSystems.some((system) => system.cancellationReason && system.cancellationPreviousOperationalStatus), 'Final QA seed must contain a cancelled System with previous Operational Status.')
assert(cancellableUnallocatedProductionSystems.length > 0, 'Final QA seed must contain an unallocated Production System that can be cancelled.')
assert(allocatedProductionSystemsRejectCancellation.length > 0, 'Final QA seed must contain an allocated Production System scenario that must reject cancellation.')
assert(availableReusedInternalSystemsCanCancel.length > 0, 'Final QA seed must contain an available/unoccupied Reused Internal System that can be cancelled.')
assert(occupiedReusedInternalSystemsRejectCancellation.length > 0, 'Final QA seed must contain an occupied Reused Internal System scenario that must reject cancellation.')
assert(cancelledSystemsWithNoActiveAllocation.length > 0, 'Final QA seed must contain a cancelled System with no active allocation.')
assert(cancelledInfrastructureItems.some((item) => item.cancellationReason && item.cancellationPreviousOperationalStatus && (item.cancellationHistory ?? []).length > 0), 'Final QA seed must contain a cancelled Infrastructure Item with cancellation audit history.')
assert(cancelledInfrastructureMaintenanceTasks.length > 0, 'Cancelled Infrastructure Item seed scenario must retain Maintenance Tasks for Restore.')
assert(retainedLegacyCancelledTenants.length > 0, 'Final QA seed must retain legacy Cancelled Tenants for history/audit verification.')
assert(tenantWorkspaceMembership.tenantDashboardCancelledRows === 0, 'Operational Tenant Dashboard must exclude retained legacy Cancelled Tenants.')
assert(activeTenantsHostedByCancelledSystems.length === 0, 'Active/non-cancelled Tenants must not resolve to Cancelled Systems as current operational hosts.')
assert(syntheticTenantCurrentOperationalSystemBlocked, 'Operational Tenant current-System resolution must reject Cancelled Systems even for stale persisted data.')
assert(activeEligibleTenantsMissingTimeGroup.length === 0, 'Active Customer/POC Tenants must resolve a geography-derived Time Group.')
assert(activeSystemTimeGroupMismatches.length === 0, 'Active Systems with eligible hosted Tenants must derive Time Group from the governing Tenant.')
assert(operationalProjectSystemVisibilityLeaks.length === 0, 'Operational Project System collections must exclude Cancelled Projects and Systems.')
assert(operationalProjectTenantVisibilityLeaks.length === 0, 'Operational Project Tenant collections must exclude Cancelled Projects, Systems, and Tenants.')
assert(operationalSystemTenantVisibilityLeaks.length === 0, 'Operational System Tenant collections must exclude retained legacy Cancelled Tenants.')
assert(operationalInfrastructureVisibilityLeaks.length === 0, 'Operational System Infrastructure collections must exclude Cancelled Infrastructure Items.')
