import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const inputPath = process.argv[2] || fileURLToPath(new URL('../src/data/seed.json', import.meta.url))
const state = JSON.parse(readFileSync(inputPath, 'utf8'))
const systemServiceSource = readFileSync(fileURLToPath(new URL('../src/domain/system-inventory/service.ts', import.meta.url)), 'utf8')
const systemFormSource = readFileSync(fileURLToPath(new URL('../src/pages/systems/SystemInventoryFormPages.tsx', import.meta.url)), 'utf8')

function assert(condition, message) {
  if (!condition) {
    console.error(message)
    process.exitCode = 1
  }
}

function isInactiveTenant(tenant) {
  return ['Deleted - By System', 'Cancelled - By System', 'Deleted', 'Cancelled'].includes(tenant?.operationalStatus)
}

function isCancelledTenant(tenant) {
  return ['Cancelled - By System', 'Cancelled'].includes(tenant?.operationalStatus)
}

function isSystemForcedTenant(tenant) {
  return Boolean(tenant?.systemForcedBySystemId && tenant?.systemForcedPreviousOperationalStatus)
}

function isIndividuallyInactiveTenant(tenant) {
  return isInactiveTenant(tenant) && !isSystemForcedTenant(tenant)
}

function tenantFormType(tenant) {
  return tenant.tenantFormType || (tenant.tenantType === 'PENLINK_INTERNAL' ? 'INTERNAL' : tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER')
}

function tenantHistoricalSystemId(tenant) {
  if (tenant.hostedSystemId || tenant.systemId) return tenant.hostedSystemId || tenant.systemId
  const history = Array.isArray(tenant.hostedSystemHistory) ? tenant.hostedSystemHistory : []
  return history.at(-1)?.systemId || ''
}

function tenantProjectByPid(tenant, projects) {
  return tenant.deliveryPid
    ? projects.find((project) => project.pid === tenant.deliveryPid)
    : undefined
}

function activeProjectSystemLinks(projectSystems) {
  return projectSystems.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

function activeProjectTenantLinks(projectTenants) {
  return projectTenants.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

function projectOpportunity(project, opportunities) {
  return opportunities.find((opportunity) => opportunity.id === project?.opportunityId || opportunity.opportunityId === project?.opportunityId)
}

function projectRequirementRows(project, opportunities) {
  const opportunity = projectOpportunity(project, opportunities)
  if (!opportunity) return []
  return [
    ...(opportunity.newTenantRequirements || []),
    ...(opportunity.changeRequestRequirements || []),
    ...(opportunity.standardRenewalRequirements || []),
  ]
}

function allRequirementRows(state) {
  const opportunities = Array.isArray(state.opportunities) ? state.opportunities : []
  return opportunities.flatMap((opportunity) => [
    ...(opportunity.newTenantRequirements || []).map((requirement) => ({ opportunityId: opportunity.opportunityId, grid: 'A', requirement })),
    ...(opportunity.changeRequestRequirements || []).map((requirement) => ({ opportunityId: opportunity.opportunityId, grid: 'B', requirement })),
    ...(opportunity.standardRenewalRequirements || []).map((requirement) => ({ opportunityId: opportunity.opportunityId, grid: 'C', requirement })),
  ])
}

function requirementForTenantInProject(tenant, project, opportunities) {
  const sourceRequirementId = String(tenant.sourceRequirementId || '').trim()
  if (!sourceRequirementId || !project) return undefined
  return projectRequirementRows(project, opportunities).find((requirement) =>
    requirement.requirementId === sourceRequirementId ||
    requirement.id === sourceRequirementId ||
    requirement.tenantId === tenant.id,
  )
}

function requirementProjectCandidates(tenant, projects, opportunities) {
  const sourceRequirementId = String(tenant.sourceRequirementId || '').trim()
  if (!sourceRequirementId) return []
  return projects.filter((project) =>
    projectRequirementRows(project, opportunities).some((requirement) =>
      requirement.requirementId === sourceRequirementId ||
      requirement.id === sourceRequirementId ||
      requirement.tenantId === tenant.id,
    ),
  )
}

function currentRequirementIdsForTenant(tenant) {
  const history = Array.isArray(tenant.requirementHistory) ? tenant.requirementHistory : []
  const currentHistoryIds = history
    .filter((relationship) => relationship.status === 'CURRENT')
    .map((relationship) => String(relationship.requirementId || '').trim())
    .filter(Boolean)
  if (currentHistoryIds.length > 0) return currentHistoryIds
  return [tenant.sourceRequirementId].map((requirementId) => String(requirementId || '').trim()).filter(Boolean)
}

function requirementExistsForProject(project, requirementId, opportunities) {
  return projectRequirementRows(project, opportunities).some((requirement) =>
    requirement.requirementId === requirementId ||
    requirement.id === requirementId,
  )
}

const systems = Array.isArray(state.systems) ? state.systems : []
const tenants = Array.isArray(state.tenants) ? state.tenants : []
const projects = Array.isArray(state.projects) ? state.projects : []
const opportunities = Array.isArray(state.opportunities) ? state.opportunities : []
const projectSystems = Array.isArray(state.projectSystems) ? state.projectSystems : []
const projectTenants = Array.isArray(state.projectTenants) ? state.projectTenants : []

const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
const systemsById = new Map(systems.map((system) => [system.id, system]))
const projectsById = new Map(projects.map((project) => [project.id, project]))
const requirementRows = allRequirementRows(state)
const requirementIdGroups = requirementRows.reduce((groups, row) => {
  const id = String(row.requirement?.requirementId || '').trim()
  if (!id) return groups
  groups.set(id, [...(groups.get(id) || []), row])
  return groups
}, new Map())

const duplicateRequirementIds = Array.from(requirementIdGroups.entries())
  .filter(([, rows]) => rows.length > 1)
  .map(([requirementId, rows]) => ({
    requirementId,
    locations: rows.map((row) => `${row.opportunityId}:${row.grid}:${row.requirement.id}`),
  }))

const malformedSuffixRequirementIds = requirementRows
  .map((row) => String(row.requirement?.requirementId || '').trim())
  .filter((requirementId) => /^[A-Z]-\d{3,}-[A-Z0-9]{6,}$/i.test(requirementId))

const countMismatches = systems
  .map((system) => {
    const expectedTenantIds = tenants
      .filter((tenant) => !isIndividuallyInactiveTenant(tenant) && tenantHistoricalSystemId(tenant) === system.id)
      .map((tenant) => tenant.id)
      .sort()
    const retainedActiveTenantIds = (system.tenantIds || [])
      .map((tenantId) => tenantsById.get(tenantId))
      .filter((tenant) => tenant && !isIndividuallyInactiveTenant(tenant))
      .map((tenant) => tenant.id)
      .sort()
    return {
      system: system.sid || system.machineId || system.id,
      expectedTids: expectedTenantIds.map((tenantId) => tenantsById.get(tenantId)?.tid || tenantId),
      retainedActiveTids: retainedActiveTenantIds.map((tenantId) => tenantsById.get(tenantId)?.tid || tenantId),
      count: expectedTenantIds.length,
      retainedCount: retainedActiveTenantIds.length,
      mismatch: JSON.stringify(expectedTenantIds) !== JSON.stringify(retainedActiveTenantIds),
    }
  })
  .filter((row) => row.mismatch)

const unresolvedSystemTenantRefs = systems.flatMap((system) =>
  (system.tenantIds || [])
    .filter((tenantId) => !tenantsById.has(tenantId))
    .map((tenantId) => ({ system: system.sid || system.machineId || system.id, tenantId })),
)

const tenantSystemMismatches = tenants
  .map((tenant) => ({ tenant, systemId: tenantHistoricalSystemId(tenant) }))
  .filter(({ systemId }) => systemId && !systemsById.has(systemId))
  .map(({ tenant, systemId }) => ({ tid: tenant.tid, systemId }))

const tenantPidMismatches = tenants
  .filter((tenant) => !tenant.deliveryPid || !tenantProjectByPid(tenant, projects))
  .map((tenant) => ({ tid: tenant.tid, pid: tenant.deliveryPid || '' }))

const activeProjectTenantAttachmentMismatches = activeProjectTenantLinks(projectTenants)
  .map((link) => ({ link, tenant: tenantsById.get(link.tenantId), project: projectsById.get(link.projectId) }))
  .filter(({ tenant, project }) => tenant && project)
  .filter(({ link, tenant }) => !activeProjectSystemLinks(projectSystems).some((systemLink) =>
    systemLink.projectId === link.projectId &&
    systemLink.systemId === (link.systemId || tenantHistoricalSystemId(tenant)),
  ))
  .map(({ link, tenant, project }) => ({
    id: link.id,
    tid: tenant.tid,
    pid: project.pid,
    systemId: link.systemId || tenantHistoricalSystemId(tenant),
  }))

const missingRequiredRequirementIds = tenants
  .filter((tenant) => tenantFormType(tenant) !== 'INTERNAL')
  .filter((tenant) => !isInactiveTenant(tenant))
  .filter((tenant) => !String(tenant.sourceRequirementId || '').trim() && !(Array.isArray(tenant.requirementHistory) && tenant.requirementHistory.length > 0))
  .map((tenant) => ({ tid: tenant.tid, tenantType: tenantFormType(tenant), pid: tenant.deliveryPid || '' }))

const requirementProjectMismatches = tenants
  .filter((tenant) => tenantFormType(tenant) !== 'INTERNAL')
  .flatMap((tenant) => {
    const history = Array.isArray(tenant.requirementHistory) ? tenant.requirementHistory : []
    const historyMismatches = history
      .map((relationship) => {
        const project = projectsById.get(relationship.projectId) || projects.find((candidate) => candidate.pid === relationship.pid)
        const projectPidMatches = project?.pid === relationship.pid
        const requirementMatchesProject = project ? requirementExistsForProject(project, relationship.requirementId, opportunities) : false
        return { relationship, project, projectPidMatches, requirementMatchesProject }
      })
      .filter(({ project, projectPidMatches, requirementMatchesProject }) => !project || !projectPidMatches || !requirementMatchesProject)
      .map(({ relationship, project }) => ({
        tid: tenant.tid,
        pid: relationship.pid || tenant.deliveryPid || '',
        requirementId: relationship.requirementId || '',
        matchingRequirementPids: requirementProjectCandidates({ ...tenant, sourceRequirementId: relationship.requirementId }, projects, opportunities).map((candidate) => candidate.pid),
        resolvedPid: project?.pid || '',
      }))

    if (history.length > 0 || !String(tenant.sourceRequirementId || '').trim()) return historyMismatches

    const project = tenantProjectByPid(tenant, projects)
    const requirement = requirementForTenantInProject(tenant, project, opportunities)
    return requirement
      ? historyMismatches
      : [
          {
            tid: tenant.tid,
            pid: tenant.deliveryPid || '',
            requirementId: tenant.sourceRequirementId || '',
            matchingRequirementPids: requirementProjectCandidates(tenant, projects, opportunities).map((candidate) => candidate.pid),
            resolvedPid: project?.pid || '',
          },
        ]
  })

const unresolvedProjectTenantLinks = projectTenants
  .filter((link) => !tenantsById.has(link.tenantId) || !projectsById.has(link.projectId))
  .map((link) => ({
    id: link.id,
    projectId: link.projectId,
    tenantId: link.tenantId,
    missingProject: !projectsById.has(link.projectId),
    missingTenant: !tenantsById.has(link.tenantId),
  }))

const systemProjectTenantGaps = projectSystems.flatMap((link) =>
  (link.tenantIds || [])
    .filter((tenantId) => systemsById.has(link.systemId) && tenantsById.has(tenantId) && projectsById.has(link.projectId))
    .filter((tenantId) => link.allocationStatus !== 'DEALLOCATED' && !activeProjectTenantLinks(projectTenants).some((projectTenant) => projectTenant.projectId === link.projectId && projectTenant.tenantId === tenantId))
    .map((tenantId) => ({
      system: systemsById.get(link.systemId)?.sid || systemsById.get(link.systemId)?.machineId || link.systemId,
      tid: tenantsById.get(tenantId)?.tid || tenantId,
      pid: projectsById.get(link.projectId)?.pid || link.projectId,
    })),
)

const individuallyInactiveWithoutPreviousStatus = tenants
  .filter(isIndividuallyInactiveTenant)
  .filter((tenant) => !String(tenant.individualLifecyclePreviousOperationalStatus || '').trim())
  .map((tenant) => ({ tid: tenant.tid, status: tenant.operationalStatus }))

const systemForcedWithoutPreviousStatus = tenants
  .filter((tenant) => tenant.systemForcedBySystemId || tenant.systemForcedPreviousOperationalStatus)
  .filter((tenant) => !tenant.systemForcedBySystemId || !tenant.systemForcedPreviousOperationalStatus)
  .map((tenant) => ({
    tid: tenant.tid,
    status: tenant.operationalStatus,
    systemForcedBySystemId: tenant.systemForcedBySystemId || '',
    systemForcedPreviousOperationalStatus: tenant.systemForcedPreviousOperationalStatus || '',
  }))

const systemForcedInvalidSystem = tenants
  .filter(isSystemForcedTenant)
  .filter((tenant) => !systemsById.has(tenant.systemForcedBySystemId))
  .map((tenant) => ({ tid: tenant.tid, systemForcedBySystemId: tenant.systemForcedBySystemId }))

const requirementOccupiedByMultipleTenants = Array.from(
  tenants
    .filter((tenant) => !isInactiveTenant(tenant))
    .reduce((groups, tenant) => {
      currentRequirementIdsForTenant(tenant).forEach((requirementId) => {
        groups.set(requirementId, [...(groups.get(requirementId) || []), tenant])
      })
      return groups
    }, new Map()),
).filter(([, rows]) => rows.length > 1)
  .map(([requirementId, rows]) => ({ requirementId, tids: rows.map((tenant) => tenant.tid) }))

const cancelledTenantStillConsumingRequirement = tenants
  .filter((tenant) => isCancelledTenant(tenant) && currentRequirementIdsForTenant(tenant).length > 0)
  .map((tenant) => ({ tid: tenant.tid, requirementIds: currentRequirementIdsForTenant(tenant) }))

const tenantLicenseAudit = tenants
  .filter((tenant) => tenantFormType(tenant) === 'CUSTOMER')
  .map((tenant) => {
    const system = systemsById.get(tenantHistoricalSystemId(tenant))
    const systemId = system?.sid || (system?.machineId ? `M${String(system.machineId).replace(/^M/i, '')}` : '')
    const licenseNumber = [tenant.deliveryPid, systemId, tenant.tid].filter(Boolean).join('')
    const missingParts = [
      tenant.deliveryPid ? '' : 'PID',
      systemId ? '' : 'SID/MID',
      tenant.tid ? '' : 'TID',
    ].filter(Boolean)
    return { tid: tenant.tid, licenseNumber, missingParts }
  })

const missingLicenseNumbers = tenantLicenseAudit
  .filter((row) => row.missingParts.length > 0 || !row.licenseNumber)
  .map((row) => ({ tid: row.tid, missingParts: row.missingParts }))

const malformedLicenseNumbers = tenantLicenseAudit
  .filter((row) => row.licenseNumber && !/^P\d+S\d+T\d+$/.test(row.licenseNumber) && !/^P\d+M\d+T\d+$/.test(row.licenseNumber))
  .map((row) => ({ tid: row.tid, licenseNumber: row.licenseNumber }))

const deletedTenantPresentationSafeguards = {
  activeSummaryUsesHostedTenants: /const hostedTenants = hostedTenantsForSystem\(system\.id, tenants\)/.test(systemServiceSource),
  systemFormRendersDeletedTenants: /function renderDeletedTenantsSection\(\)/.test(systemFormSource) &&
    /historicalInactiveTenantsForSystem\(system\.id, tenants\)/.test(systemFormSource),
  systemFormFiltersDeletedOnly: /isTenantDeleted\(tenant\)/.test(systemFormSource),
  systemFormShowsWarrantyWithoutActions: /showWarrantyStatusColumn/.test(systemFormSource) &&
    !/actions=\{[^}]*renderDeletedTenantsSection/.test(systemFormSource),
}

console.log(JSON.stringify({
  inputPath,
  systems: systems.length,
  tenants: tenants.length,
  projects: projects.length,
  duplicateRequirementIds,
  malformedSuffixRequirementIds,
  countMismatches,
  unresolvedSystemTenantRefs,
  tenantSystemMismatches,
  tenantPidMismatches,
  activeProjectTenantAttachmentMismatches,
  missingRequiredRequirementIds,
  requirementProjectMismatches,
  unresolvedProjectTenantLinks,
  systemProjectTenantGaps,
  individuallyInactiveWithoutPreviousStatus,
  systemForcedWithoutPreviousStatus,
  systemForcedInvalidSystem,
  requirementOccupiedByMultipleTenants,
  cancelledTenantStillConsumingRequirement,
  missingLicenseNumbers,
  malformedLicenseNumbers,
  deletedTenantPresentationSafeguards,
}, null, 2))

assert(duplicateRequirementIds.length === 0, 'Requirement IDs must be globally unique.')
assert(malformedSuffixRequirementIds.length === 0, 'Requirement IDs must not contain random/hash suffixes.')
assert(countMismatches.length === 0, 'System active Tenant count invariant failed.')
assert(unresolvedSystemTenantRefs.length === 0, 'System retains Tenant references that do not resolve.')
assert(tenantSystemMismatches.length === 0, 'Tenant historical/current System references do not resolve.')
assert(tenantPidMismatches.length === 0, 'Tenant PID does not resolve to a Project.')
assert(activeProjectTenantAttachmentMismatches.length === 0, 'Active Project-Tenant attachments must be backed by an active Project-System allocation for the Tenant hosting System.')
assert(missingRequiredRequirementIds.length === 0, 'Customer/POC Tenants are missing required Requirement IDs.')
assert(requirementProjectMismatches.length === 0, 'Customer/POC Tenant Requirement IDs do not resolve within the Tenant PID Project.')
assert(unresolvedProjectTenantLinks.length === 0, 'Project-Tenant links contain unresolved references.')
assert(systemProjectTenantGaps.length === 0, 'Project-System tenant membership is missing Project-Tenant links.')
assert(individuallyInactiveWithoutPreviousStatus.length === 0, 'Individually Deleted/Cancelled Tenants are missing previous Operational Status.')
assert(systemForcedWithoutPreviousStatus.length === 0, 'System-forced Tenants are missing lifecycle provenance.')
assert(systemForcedInvalidSystem.length === 0, 'System-forced Tenant references a nonexistent forcing System.')
assert(cancelledTenantStillConsumingRequirement.length === 0, 'Cancelled Tenant still consumes a Requirement ID.')
assert(missingLicenseNumbers.length === 0, 'Tenant License Number source parts are missing.')
assert(malformedLicenseNumbers.length === 0, 'Tenant License Number format is malformed.')
Object.entries(deletedTenantPresentationSafeguards).forEach(([name, ok]) => {
  assert(ok, `Deleted Tenant System presentation safeguard failed: ${name}.`)
})
