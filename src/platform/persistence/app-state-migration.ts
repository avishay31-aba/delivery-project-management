import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeIdCounters } from '@/data/id-generator'
import {
  normalizeProjectSystemLink,
  normalizeProjectTenantLink,
} from '@/domain/allocation-context'
import { normalizeActivityEvents } from '@/domain/activity-log'
import { normalizeOpportunityLifecycleOpportunity } from '@/domain/opportunity-lifecycle'
import { normalizeProjectLifecycleProject } from '@/domain/project-lifecycle'
import { normalizeTenantOperationRecord } from '@/domain/tenant-operations'

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
  const normalizedState = {
    ...state,
    salesManagers: Array.isArray(state.salesManagers) ? state.salesManagers : seedState.salesManagers,
    accounts: Array.isArray(state.accounts) ? state.accounts : seedState.accounts,
    opportunities,
    projects,
    productionSystemInventory: Array.isArray(state.productionSystemInventory)
      ? state.productionSystemInventory
      : seedState.productionSystemInventory,
    reusedInternalSystems: Array.isArray(state.reusedInternalSystems)
      ? state.reusedInternalSystems
      : seedState.reusedInternalSystems,
    systems: Array.isArray(state.systems) ? state.systems : seedState.systems,
    tenants: Array.isArray(state.tenants)
      ? state.tenants.map((tenant) => normalizeTenantOperationRecord(tenant, Array.isArray(state.systems) ? state.systems : seedState.systems))
      : seedState.tenants.map((tenant) => normalizeTenantOperationRecord(tenant, seedState.systems)),
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
    activityEvents: normalizeActivityEvents('activityEvents' in state ? state.activityEvents : []),
    projectSystems: Array.isArray(state.projectSystems)
      ? state.projectSystems.map(normalizeProjectSystemLink)
      : seedState.projectSystems.map(normalizeProjectSystemLink),
    projectTenants: Array.isArray(state.projectTenants)
      ? state.projectTenants.map(normalizeProjectTenantLink)
      : seedState.projectTenants.map(normalizeProjectTenantLink),
  }

  return {
    ...normalizedState,
    idCounters: normalizeIdCounters(state.idCounters, normalizedState),
  }
}
