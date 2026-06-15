import type { AppDataState, Opportunity, Project, Tenant } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeIdCounters } from '@/data/id-generator'

export const STORAGE_KEY = 'dpm-mvp-v1'

function projectSourceFor(project: Project): Project['projectSource'] {
  return project.projectSource ?? (project.mainType === 'POC' ? 'POC' : 'FINAL')
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    projectSource: projectSourceFor(project),
  }
}

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
    pocProjectIds,
    finalProjectId,
    wonAt: opportunity.wonAt ?? (opportunity.stage === 'WON' ? opportunity.updatedAt : null),
  }
}

function normalizeTenant(tenant: Tenant): Tenant {
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
  }
}

function normalizeState(state: AppDataState): AppDataState {
  const seedState = seedJson as AppDataState
  const projects = Array.isArray(state.projects) ? state.projects.map(normalizeProject) : seedState.projects.map(normalizeProject)
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
    tenants: Array.isArray(state.tenants) ? state.tenants.map(normalizeTenant) : seedState.tenants.map(normalizeTenant),
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
    projectSystems: Array.isArray(state.projectSystems) ? state.projectSystems : seedState.projectSystems,
    projectTenants: Array.isArray(state.projectTenants) ? state.projectTenants : seedState.projectTenants,
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
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AppDataState
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearPersistedState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
