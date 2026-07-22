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

export function normalizeAppDataState(state: AppDataState): AppDataState {
  const seedState = { ...(seedJson as unknown as AppDataState), activityEvents: [] }
  const projects = Array.isArray(state.projects) ? state.projects.map(normalizeProjectLifecycleProject) : seedState.projects.map(normalizeProjectLifecycleProject)
  const sourceOpportunities = Array.isArray(state.opportunities) ? state.opportunities : seedState.opportunities
  const usedOpportunityIds = sourceOpportunities.map((opportunity) => opportunity.opportunityId)
  const opportunities = sourceOpportunities.map((opportunity) => {
    const normalized = normalizeOpportunityLifecycleOpportunity(opportunity, projects, usedOpportunityIds)
    usedOpportunityIds.push(normalized.opportunityId)
    return normalized
  })
  const projectSystems = Array.isArray(state.projectSystems)
    ? state.projectSystems.map(normalizeProjectSystemLink)
    : seedState.projectSystems.map(normalizeProjectSystemLink)
  const normalizedState = {
    ...state,
    salesManagers: (Array.isArray(state.salesManagers) ? state.salesManagers : seedState.salesManagers).map((manager) => ({
      ...manager,
      region: normalizeBusinessRegion(manager.region) || manager.region,
    })),
    accounts: (Array.isArray(state.accounts) ? state.accounts : seedState.accounts).map((account) => {
      const region = getBusinessRegionForCountry(account.country, account.state) || normalizeBusinessRegion(account.region)
      return {
        ...account,
        region,
        timeGroup: region || normalizeBusinessRegion(account.timeGroup),
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
      ? state.tenants.map((tenant) => normalizeTenantOperationRecord(tenant, Array.isArray(state.systems) ? state.systems : seedState.systems))
      : seedState.tenants.map((tenant) => normalizeTenantOperationRecord(tenant, seedState.systems)),
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
    referenceData: Array.isArray(state.referenceData) ? state.referenceData : [],
    versionUpdates: Array.isArray(state.versionUpdates) ? state.versionUpdates : [],
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

  return {
    ...normalizedState,
    reusedInternalSystems,
    idCounters: normalizeIdCounters(state.idCounters, normalizedState),
  }
}
