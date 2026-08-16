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
  const projects = (Array.isArray(state.projects) ? state.projects : seedState.projects).map((source) => {
    const project = normalizeProjectLifecycleProject(source)
    const timeZone = geographicTimeZoneDisplayValue(project.country, project.state, project.deliveryDate)
    return { ...project, timeZone, timeGroup: timeGroupForTimeZone(timeGroupLookups, timeZone) }
  })
  const sourceOpportunities = Array.isArray(state.opportunities) ? state.opportunities : seedState.opportunities
  const usedOpportunityIds = sourceOpportunities.map((opportunity) => opportunity.opportunityId)
  const opportunities = sourceOpportunities.map((opportunity) => {
    const normalized = normalizeOpportunityLifecycleOpportunity(opportunity, projects, usedOpportunityIds)
    usedOpportunityIds.push(normalized.opportunityId)
    const location = timeGroupFromLocation(timeGroupLookups, normalized.country, normalized.state, normalized.deliveryDate ?? normalized.pocStartDate)
    return { ...normalized, timeZone: location.timeZone, timeGroup: location.timeGroup }
  })
  const projectSystems = Array.isArray(state.projectSystems)
    ? state.projectSystems.map(normalizeProjectSystemLink)
    : seedState.projectSystems.map(normalizeProjectSystemLink)
  const referenceData = ensureInfrastructureReferenceData(Array.isArray(state.referenceData) ? state.referenceData : [])
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
    tenants: Array.isArray(state.tenants)
      ? state.tenants.map((tenant) => normalizeTenantTimeGroup(normalizeTenantOperationRecord(tenant, Array.isArray(state.systems) ? state.systems : seedState.systems), timeGroupLookups))
      : seedState.tenants.map((tenant) => normalizeTenantTimeGroup(normalizeTenantOperationRecord(tenant, seedState.systems), timeGroupLookups)),
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
    referenceData,
    timeGroupLookups,
    userPresentationPreferences: normalizeUserPresentationPreferences(Array.isArray(state.userPresentationPreferences) ? state.userPresentationPreferences : []),
    versionUpdates: Array.isArray(state.versionUpdates) ? state.versionUpdates : [],
    infrastructureItems: normalizeInfrastructureItemsForReferenceData(Array.isArray(state.infrastructureItems) ? state.infrastructureItems as never : [], referenceData),
    activityEvents: normalizeActivityEvents('activityEvents' in state ? state.activityEvents : []),
    projectSystems,
    projectTenants: Array.isArray(state.projectTenants)
      ? state.projectTenants.map(normalizeProjectTenantLink)
      : seedState.projectTenants.map(normalizeProjectTenantLink),
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
