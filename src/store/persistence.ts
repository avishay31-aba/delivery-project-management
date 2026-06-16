import type {
  AppDataState,
  EngagementCircleContact,
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
import { hostingSnapshotFromTenant } from '@/domain/hosting-context'

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

const DEFAULT_ENGAGEMENT_CIRCLE_ROLES = [
  'Region Manager',
  'Sales / Deal Manager',
  'Customer Success Manager',
  'Customer Success Engineer',
  'VP Project',
  'Delivery Specialist',
  'Support Manager',
]

function defaultEngagementCircles(opportunity: Opportunity): EngagementCircleContact[] {
  const region = opportunity.region || 'Global'
  return DEFAULT_ENGAGEMENT_CIRCLE_ROLES.map((role) => {
    const slug = role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    return {
      id: `circle-${opportunity.id}-${slug}`,
      subject: role === 'Support Manager' ? 'Support and version update notifications' : 'Tenant engagement',
      role,
      userName: `${region} ${role}`,
      email: `${slug}.${region.toLowerCase()}@example.com`,
      phone: '',
    }
  })
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
    engagementCircles:
      Array.isArray(opportunity.engagementCircles) && opportunity.engagementCircles.length > 0
        ? opportunity.engagementCircles
        : defaultEngagementCircles(opportunity),
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
    engagementCircle: Array.isArray(tenant.engagementCircle) ? tenant.engagementCircle : [],
    remarks: Array.isArray(tenant.remarks) ? tenant.remarks : [],
    configurationHistory: Array.isArray(tenant.configurationHistory) ? tenant.configurationHistory : [],
    warranties: Array.isArray(tenant.warranties)
      ? tenant.warranties.map((warranty) => ({
          ...warranty,
          noWarranty: warranty.noWarranty ?? 'NO',
          outOfContract: warranty.outOfContract ?? 'NO',
        }))
      : [],
    documents: Array.isArray(tenant.documents) ? tenant.documents : [],
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
