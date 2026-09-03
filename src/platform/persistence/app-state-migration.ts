import type { AllocationType, AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeIdCounters } from '@/data/id-generator'
import {
  activeProjectSystemLinks,
  normalizeProjectSystemLink,
  normalizeProjectTenantLink,
} from '@/domain/allocation-context'
import { normalizeActivityEvents } from '@/domain/activity-log'
import { normalizeOpportunityLifecycleOpportunity } from '@/domain/opportunity-lifecycle'
import { normalizeProjectLifecycleProject } from '@/domain/project-lifecycle'
import { applyReusedSystemOccupationWindow, normalizeSystemInventoryRecord } from '@/domain/system-inventory'
import { normalizeTenantOperationRecord } from '@/domain/tenant-operations'
import { repairGlobalRequirementIds } from '@/domain/tenant-requirement'
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'
import { ensureInfrastructureReferenceData, normalizeInfrastructureItemsForReferenceData } from '@/domain/infrastructure-item'
import { normalizeTenantTimeGroup, normalizeTimeGroupLookups, systemsWithDerivedTimeGroups, timeGroupForTimeZone, timeGroupFromLocation } from '@/domain/time-groups'
import { geographicTimeZoneDisplayValue } from '@/domain/geographic-time-zone'
import { normalizeUserPresentationPreferences } from '@/domain/user-preferences'

function tenantHistoricalSystemId(tenant: AppDataState['tenants'][number]): string {
  if (tenant.hostedSystemId || tenant.systemId) return tenant.hostedSystemId || tenant.systemId
  const history = tenant.hostedSystemHistory ?? []
  return history[history.length - 1]?.systemId ?? ''
}

function allocationTypeForRetainedSystem(system: AppDataState['systems'][number] | undefined): AllocationType {
  return system?.source === 'Reused Internal Systems' ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM'
}

function retainedProjectIdsForTenant(
  state: AppDataState,
  tenant: AppDataState['tenants'][number],
): string[] {
  const projectIds = new Set<string>()
  const tenantSystemId = tenantHistoricalSystemId(tenant)
  const addProjectId = (projectId: string | null | undefined) => {
    if (
      projectId &&
      state.projects.some((project) => project.id === projectId) &&
      activeProjectSystemLinks(state.projectSystems).some((link) => link.projectId === projectId && link.systemId === tenantSystemId)
    ) {
      projectIds.add(projectId)
    }
  }

  const deliveryProject = tenant.deliveryPid
    ? state.projects.find((project) => project.pid === tenant.deliveryPid)
    : undefined
  addProjectId(deliveryProject?.id)

  return Array.from(projectIds)
}

function repairRetainedProjectTenantRelationships(
  state: AppDataState,
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants'> {
  const projectById = new Map(state.projects.map((project) => [project.id, project]))
  const tenantById = new Map(state.tenants.map((tenant) => [tenant.id, tenant]))
  let projectTenants = state.projectTenants.filter((link) => {
    const tenant = tenantById.get(link.tenantId)
    const project = projectById.get(link.projectId)
    return Boolean(tenant && project)
  }).map((link) => {
    if (link.allocationStatus === 'DEALLOCATED') return link
    const tenant = tenantById.get(link.tenantId)
    const tenantSystemId = tenant ? tenantHistoricalSystemId(tenant) : ''
    const activeSystemLink = activeProjectSystemLinks(state.projectSystems).find(
      (systemLink) => systemLink.projectId === link.projectId && systemLink.systemId === tenantSystemId,
    )
    return activeSystemLink && link.systemId !== tenantSystemId
      ? { ...link, systemId: tenantSystemId, allocationType: activeSystemLink.allocationType ?? link.allocationType }
      : link
  })
  let projectSystems = state.projectSystems.map((link) => {
    return {
      ...link,
      tenantIds: (link.tenantIds ?? []).filter((tenantId) => {
        return tenantById.has(tenantId)
      }),
    }
  })
  let systems = state.systems

  state.tenants.forEach((tenant) => {
    const tenantSystemId = tenantHistoricalSystemId(tenant)
    const system = systems.find((candidate) => candidate.id === tenantSystemId)
    const projectIds = retainedProjectIdsForTenant({ ...state, systems, projectSystems, projectTenants }, tenant)
    projectIds.forEach((projectId) => {
      const existingTenantLink = projectTenants.find((link) => link.projectId === projectId && link.tenantId === tenant.id)
      if (!existingTenantLink) {
        const systemLink = projectSystems.find((link) => link.projectId === projectId && link.systemId === tenantSystemId)
        projectTenants = [
          {
            id: `proj-ten-retained-${projectId}-${tenant.id}`,
            projectId,
            tenantId: tenant.id,
            systemId: tenantSystemId,
            allocationStatus: 'ALLOCATED',
            allocationType: systemLink?.allocationType ?? allocationTypeForRetainedSystem(system),
            allocatedAt: tenant.createdAt,
            deallocatedAt: null,
          },
          ...projectTenants,
        ]
      }

      if (!tenantSystemId) return
      projectSystems = projectSystems.map((link) =>
        link.projectId === projectId && link.systemId === tenantSystemId
          ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])) }
          : link,
      )
      systems = systems.map((candidate) =>
        candidate.id === tenantSystemId
          ? {
              ...candidate,
              tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), tenant.id])),
              linkedProjectIds: Array.from(new Set([...(candidate.linkedProjectIds ?? []), projectId])),
            }
          : candidate,
      )
    })
  })

  return { systems, projectSystems, projectTenants }
}

export function normalizeAppDataState(state: AppDataState): AppDataState {
  const seedState = { ...(seedJson as unknown as AppDataState), activityEvents: [] }
  const timeGroupLookups = normalizeTimeGroupLookups(Array.isArray(state.timeGroupLookups) ? state.timeGroupLookups : [])
  const sourceProjects = (Array.isArray(state.projects) ? state.projects : seedState.projects).map(normalizeProjectLifecycleProject)
  const sourceOpportunities = Array.isArray(state.opportunities) ? state.opportunities : seedState.opportunities
  const usedOpportunityIds = sourceOpportunities.map((opportunity) => opportunity.opportunityId)
  const opportunities = sourceOpportunities.map((opportunity) => {
    const normalized = normalizeOpportunityLifecycleOpportunity(opportunity, sourceProjects, usedOpportunityIds)
    usedOpportunityIds.push(normalized.opportunityId)
    const location = timeGroupFromLocation(timeGroupLookups, normalized.country, normalized.state, normalized.deliveryDate ?? normalized.pocStartDate)
    return { ...normalized, timeZone: location.timeZone, timeGroup: location.timeGroup }
  })
  const accounts = (Array.isArray(state.accounts) ? state.accounts : seedState.accounts).map((account) => {
    const region = getBusinessRegionForCountry(account.country, account.state) || normalizeBusinessRegion(account.region)
    const location = timeGroupFromLocation(timeGroupLookups, account.country, account.state)
    return { ...account, region, timeZone: location.timeZone, timeGroup: location.timeGroup }
  })
  const projects = sourceProjects.map((project) => {
    const opportunity = opportunities.find((candidate) =>
      candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId,
    )
    const account = accounts.find((candidate) =>
      candidate.id === opportunity?.accountId || candidate.accountName === project.accountName,
    )
    const country = opportunity?.country || account?.country || project.country || ''
    const state = opportunity?.state || account?.state || project.state || ''
    const timeZone = geographicTimeZoneDisplayValue(country, state, project.deliveryDate)
    return {
      ...project,
      country,
      state,
      region: getBusinessRegionForCountry(country, state) || normalizeBusinessRegion(project.region),
      timeZone,
      timeGroup: timeGroupForTimeZone(timeGroupLookups, timeZone),
    }
  })
  const projectSystems = Array.isArray(state.projectSystems)
    ? state.projectSystems.map(normalizeProjectSystemLink)
    : seedState.projectSystems.map(normalizeProjectSystemLink)
  const projectTenants = Array.isArray(state.projectTenants)
    ? state.projectTenants.map(normalizeProjectTenantLink)
    : seedState.projectTenants.map(normalizeProjectTenantLink)
  const referenceData = ensureInfrastructureReferenceData(Array.isArray(state.referenceData) ? state.referenceData : [])
  const normalizedProductionSystemInventory = Array.isArray(state.productionSystemInventory)
    ? state.productionSystemInventory.map(normalizeSystemInventoryRecord)
    : seedState.productionSystemInventory.map(normalizeSystemInventoryRecord)
  const normalizedReusedInternalSystems = Array.isArray(state.reusedInternalSystems)
    ? state.reusedInternalSystems.map(normalizeSystemInventoryRecord)
    : seedState.reusedInternalSystems.map(normalizeSystemInventoryRecord)
  const normalizedSystems = Array.isArray(state.systems)
    ? state.systems.map(normalizeSystemInventoryRecord)
    : seedState.systems.map(normalizeSystemInventoryRecord)
  const sourceTenants = Array.isArray(state.tenants) ? state.tenants : seedState.tenants
  const tenants = sourceTenants.map((tenant) => {
    const normalizedTenant = normalizeTenantOperationRecord(tenant, normalizedSystems)
    const project = normalizedTenant.deliveryPid
      ? projects.find((candidate) => candidate.pid === normalizedTenant.deliveryPid)
      : undefined
    const opportunity = project
      ? opportunities.find((candidate) =>
          candidate.id === project.opportunityId ||
          candidate.opportunityId === project.opportunityId ||
          candidate.pocProjectIds.includes(project.id) ||
          candidate.finalProjectId === project.id,
        )
      : undefined
    const account = accounts.find((candidate) =>
      candidate.id === normalizedTenant.accountId ||
      candidate.id === opportunity?.accountId ||
      candidate.accountName === normalizedTenant.accountName ||
      candidate.accountName === project?.accountName,
    )
    const system = normalizedSystems.find((candidate) => candidate.id === (normalizedTenant.hostedSystemId || normalizedTenant.systemId))
    const country = normalizedTenant.country || opportunity?.country || account?.country || project?.country || system?.country || ''
    const stateName = normalizedTenant.state || opportunity?.state || account?.state || project?.state || system?.state || ''
    return normalizeTenantTimeGroup({
      ...normalizedTenant,
      country,
      state: stateName,
    }, timeGroupLookups)
  })

  const normalizedState = {
    ...state,
    salesManagers: (Array.isArray(state.salesManagers) ? state.salesManagers : seedState.salesManagers).map((manager) => ({
      ...manager,
      region: normalizeBusinessRegion(manager.region) || manager.region,
    })),
    accounts,
    opportunities,
    projects,
    productionSystemInventory: normalizedProductionSystemInventory,
    reusedInternalSystems: normalizedReusedInternalSystems,
    systems: normalizedSystems,
    tenants,
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
    referenceData,
    timeGroupLookups,
    userPresentationPreferences: normalizeUserPresentationPreferences(Array.isArray(state.userPresentationPreferences) ? state.userPresentationPreferences : []),
    versionUpdates: Array.isArray(state.versionUpdates) ? state.versionUpdates : [],
    infrastructureItems: normalizeInfrastructureItemsForReferenceData(Array.isArray(state.infrastructureItems) ? state.infrastructureItems as never : [], referenceData),
    activityEvents: normalizeActivityEvents('activityEvents' in state ? state.activityEvents : []),
    projectSystems,
    projectTenants,
  }

  const requirementIdState = repairGlobalRequirementIds(normalizedState)
  const retainedRelationshipState = repairRetainedProjectTenantRelationships(requirementIdState)
  const normalizedStateWithRetainedRelationships = {
    ...requirementIdState,
    systems: retainedRelationshipState.systems,
    projectSystems: retainedRelationshipState.projectSystems,
    projectTenants: retainedRelationshipState.projectTenants,
  }

  const activeSystemLinks = activeProjectSystemLinks(normalizedStateWithRetainedRelationships.projectSystems)
  const reusedInternalSystems = normalizedStateWithRetainedRelationships.reusedInternalSystems.map((system) =>
    applyReusedSystemOccupationWindow(system, activeSystemLinks, normalizedStateWithRetainedRelationships.projects, system.updatedAt ?? new Date().toISOString()),
  )
  const systems = systemsWithDerivedTimeGroups(normalizedStateWithRetainedRelationships.systems, normalizedStateWithRetainedRelationships.tenants, timeGroupLookups)

  return {
    ...normalizedStateWithRetainedRelationships,
    systems,
    reusedInternalSystems,
    idCounters: normalizeIdCounters(state.idCounters, normalizedStateWithRetainedRelationships),
  }
}
