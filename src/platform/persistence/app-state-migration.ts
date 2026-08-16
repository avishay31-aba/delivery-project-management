import type { AppDataState } from '@/data/seed.types'
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
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'
import { ensureInfrastructureReferenceData, normalizeInfrastructureItemsForReferenceData } from '@/domain/infrastructure-item'
import { normalizeTenantTimeGroup, normalizeTimeGroupLookups, systemsWithDerivedTimeGroups, timeGroupForTimeZone, timeGroupFromLocation } from '@/domain/time-groups'
import { geographicTimeZoneDisplayValue } from '@/domain/geographic-time-zone'
import { normalizeUserPresentationPreferences } from '@/domain/user-preferences'

export function normalizeAppDataState(state: AppDataState): AppDataState {
  const seedState = { ...(seedJson as unknown as AppDataState), activityEvents: [] }
  const timeGroupLookups = normalizeTimeGroupLookups(Array.isArray(state.timeGroupLookups) ? state.timeGroupLookups : [])
  const baseProjects = (Array.isArray(state.projects) ? state.projects : seedState.projects).map((source) => {
    const project = normalizeProjectLifecycleProject(source)
    const timeZone = geographicTimeZoneDisplayValue(project.country, project.state, project.deliveryDate)
    return { ...project, timeZone, timeGroup: timeGroupForTimeZone(timeGroupLookups, timeZone) }
  })
  const sourceOpportunities = Array.isArray(state.opportunities) ? state.opportunities : seedState.opportunities
  const usedOpportunityIds = sourceOpportunities.map((opportunity) => opportunity.opportunityId)
  const opportunities = sourceOpportunities.map((opportunity) => {
    const normalized = normalizeOpportunityLifecycleOpportunity(opportunity, baseProjects, usedOpportunityIds)
    usedOpportunityIds.push(normalized.opportunityId)
    const location = timeGroupFromLocation(timeGroupLookups, normalized.country, normalized.state, normalized.deliveryDate ?? normalized.pocStartDate)
    return { ...normalized, timeZone: location.timeZone, timeGroup: location.timeGroup }
  })
  const projects = baseProjects.map((project) => {
    const opportunity = opportunities.find((candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId)
    const country = opportunity?.country ?? project.country ?? ''
    const state = opportunity?.state ?? project.state ?? ''
    const location = timeGroupFromLocation(timeGroupLookups, country, state, project.deliveryDate)
    return { ...project, country, state, timeZone: location.timeZone, timeGroup: location.timeGroup }
  })
  const projectSystems = Array.isArray(state.projectSystems)
    ? state.projectSystems.map(normalizeProjectSystemLink)
    : seedState.projectSystems.map(normalizeProjectSystemLink)
  const referenceData = ensureInfrastructureReferenceData(Array.isArray(state.referenceData) ? state.referenceData : [])
  const projectTenants = Array.isArray(state.projectTenants)
    ? state.projectTenants.map(normalizeProjectTenantLink)
    : seedState.projectTenants.map(normalizeProjectTenantLink)
  const sourceTenants = Array.isArray(state.tenants) ? state.tenants : seedState.tenants
  const tenantSystems = Array.isArray(state.systems) ? state.systems : seedState.systems
  const tenants = sourceTenants.map((sourceTenant) => {
    const tenant = normalizeTenantOperationRecord(sourceTenant, tenantSystems)
    const projectLink = projectTenants.find((link) => link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED')
    const project = projects.find((candidate) => candidate.id === projectLink?.projectId || candidate.pid === tenant.deliveryPid)
    return normalizeTenantTimeGroup({
      ...tenant,
      country: project?.country ?? tenant.country,
      state: project?.state ?? tenant.state ?? '',
      timeZone: project?.timeZone ?? tenant.timeZone ?? '',
    }, timeGroupLookups)
  })
  const normalizedState = {
    ...state,
    salesManagers: (Array.isArray(state.salesManagers) ? state.salesManagers : seedState.salesManagers).map((manager) => ({
      ...manager,
      region: normalizeBusinessRegion(manager.region) || manager.region,
    })),
    accounts: (Array.isArray(state.accounts) ? state.accounts : seedState.accounts).map((account) => {
      const region = getBusinessRegionForCountry(account.country, account.state) || normalizeBusinessRegion(account.region)
      const location = timeGroupFromLocation(timeGroupLookups, account.country, account.state)
      return {
        ...account,
        region,
        timeZone: location.timeZone,
        timeGroup: location.timeGroup,
      }
    }),
    opportunities,
    projects,
    productionSystemInventory: Array.isArray(state.productionSystemInventory)
      ? state.productionSystemInventory.map(normalizeSystemInventoryRecord)
      : seedState.productionSystemInventory.map(normalizeSystemInventoryRecord),
    reusedInternalSystems: Array.isArray(state.reusedInternalSystems)
      ? state.reusedInternalSystems.map(normalizeSystemInventoryRecord)
      : seedState.reusedInternalSystems.map(normalizeSystemInventoryRecord),
    systems: Array.isArray(state.systems)
      ? state.systems.map(normalizeSystemInventoryRecord)
      : seedState.systems.map(normalizeSystemInventoryRecord),
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

  const activeSystemLinks = activeProjectSystemLinks(normalizedState.projectSystems)
  const reusedInternalSystems = normalizedState.reusedInternalSystems.map((system) =>
    applyReusedSystemOccupationWindow(system, activeSystemLinks, normalizedState.projects, system.updatedAt ?? new Date().toISOString()),
  )
  const systems = systemsWithDerivedTimeGroups(normalizedState.systems, normalizedState.tenants, timeGroupLookups)

  return {
    ...normalizedState,
    systems,
    reusedInternalSystems,
    idCounters: normalizeIdCounters(state.idCounters, normalizedState),
  }
}
