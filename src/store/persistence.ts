import type {
  AppDataState,
  Opportunity,
  Project,
  Tenant,
} from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeIdCounters } from '@/data/id-generator'
import { applicationConfigurationFromTenant } from '@/domain/application-configuration'
import {
  normalizeProjectSystemLink,
  normalizeProjectTenantLink,
} from '@/domain/allocation-context'
import {
  normalizeOpportunityEngagementCircles,
  normalizeTenantEngagementCircle,
} from '@/domain/engagement-circle'
import { hostingSnapshotFromTenant } from '@/domain/hosting-context'
import { normalizeProjectLifecycleProject, projectSourceFor } from '@/domain/project-lifecycle'
import { normalizeTenantWarranties } from '@/domain/warranty-collection'
import { localStoragePersistenceAdapter, parseJson, stringifyJson } from '@/platform/persistence'

export const STORAGE_KEY = 'dpm-mvp-v1'

function normalizeOpportunity(opportunity: Opportunity, projects: Project[]): Opportunity {
  const linkedProjects = projects.filter((project) => project.opportunityId === opportunity.opportunityId)
  const pocProjectIds = Array.from(
    new Set([
      ...(Array.isArray(opportunity.pocProjectIds) ? opportunity.pocProjectIds : []),
      ...linkedProjects
        .filter((project) => projectSourceFor(project) === 'POC')
        .map((project) => project.id),
    ]),
  )
  const finalProjectId =
    opportunity.finalProjectId ??
    linkedProjects.find((project) => projectSourceFor(project) === 'FINAL')?.id ??
    null

  return {
    ...opportunity,
    stage: opportunity.stage === 'WON' ? 'WON' : 'OPEN',
    engagementCircles: normalizeOpportunityEngagementCircles(opportunity),
    pocProjectIds,
    finalProjectId,
    wonAt: opportunity.wonAt ?? (opportunity.stage === 'WON' ? opportunity.updatedAt : null),
  }
}

function normalizeTenant(tenant: Tenant, systems: AppDataState['systems']): Tenant {
  const history =
    tenant.hostedSystemHistory && tenant.hostedSystemHistory.length > 0
      ? tenant.hostedSystemHistory
      : tenant.systemId
        ? [{ systemId: tenant.systemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' as const }]
        : []

  return {
    ...tenant,
    contractStatus: tenant.contractStatus ?? 'UNDER_CONTRACT',
    hostedSystemHistory: history,
    tenantFormType: tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER',
    hostedSystemId: tenant.hostedSystemId ?? tenant.systemId,
    hostingSid: tenant.hostingSid ?? systems.find((system) => system.id === tenant.systemId)?.sid ?? '',
    configuration: applicationConfigurationFromTenant(tenant),
    hostingSnapshot: tenant.hostingSnapshot ?? hostingSnapshotFromTenant(tenant, systems),
    engagementCircle: normalizeTenantEngagementCircle(tenant),
    remarks: Array.isArray(tenant.remarks) ? tenant.remarks : [],
    configurationHistory: Array.isArray(tenant.configurationHistory) ? tenant.configurationHistory : [],
    warranties: normalizeTenantWarranties(tenant.warranties),
    documents: Array.isArray(tenant.documents) ? tenant.documents : [],
  }
}

function normalizeState(state: AppDataState): AppDataState {
  const seedState = seedJson as AppDataState
  const projects = Array.isArray(state.projects) ? state.projects.map(normalizeProjectLifecycleProject) : seedState.projects.map(normalizeProjectLifecycleProject)
  const opportunities = Array.isArray(state.opportunities)
    ? state.opportunities.map((opportunity) => normalizeOpportunity(opportunity, projects))
    : seedState.opportunities.map((opportunity) => normalizeOpportunity(opportunity, projects))
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
      ? state.tenants.map((tenant) => normalizeTenant(tenant, Array.isArray(state.systems) ? state.systems : seedState.systems))
      : seedState.tenants.map((tenant) => normalizeTenant(tenant, seedState.systems)),
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
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

/** Default state loaded from seed file */
export function createInitialState(): AppDataState {
  return normalizeState({
    ...(seedJson as AppDataState),
    lastPersistedAt: null,
  })
}

export function loadPersistedState(): AppDataState | null {
  try {
    const raw = localStoragePersistenceAdapter.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = parseJson(raw) as AppDataState
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.projects)) {
      return null
    }
    return normalizeState(parsed)
  } catch {
    return null
  }
}

export function persistState(state: AppDataState): void {
  const payload: AppDataState = normalizeState({
    ...state,
    lastPersistedAt: new Date().toISOString(),
  })
  localStoragePersistenceAdapter.setItem(STORAGE_KEY, stringifyJson(payload))
}

export function clearPersistedState(): void {
  localStoragePersistenceAdapter.removeItem(STORAGE_KEY)
}
