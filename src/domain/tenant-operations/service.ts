import type { Account, Opportunity, Project, ProjectSystemLink, ProjectTenantLink, System, Tenant, TenantConfiguration, TenantFormType, TenantHostedSystemHistory } from '@/data/seed.types'
import { activeProjectSystemLinks, activeProjectTenantLinks } from '@/domain/allocation-context'
import { geographicTimeZoneDisplayValue } from '@/domain/geographic-time-zone'
import { projectHeaderFieldValue } from '@/domain/project-lifecycle'
import { isReusedInternalSystem, systemApplicationConfigurationSummary, SYSTEM_CLASS_POC_DEMO_TRAINING } from '@/domain/system-inventory'
import {
  activeHostedSystemIdForTenant,
  isTenantLifecycleInactive,
  tenantLatestHistoricalSystemId,
  TENANT_OPERATIONAL_STATUS_CANCELLED,
  TENANT_OPERATIONAL_STATUS_DELETED,
} from './lifecycle'
import {
  TENANT_WARRANTY_CONTRACT_GROUPS,
  tenantWarrantyHeaderStatusReadModel,
  type TenantWarrantyHeaderStatusReadModel,
} from '@/domain/warranty-collection'

export type TenantMoveMode = 'DELIVERED' | 'POC_ASSIGNED'

interface TenantMoveContext {
  tenant: Tenant
  systems: System[]
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  opportunities?: Opportunity[]
  accounts?: Account[]
}

export type TenantOperationalMode =
  | 'Operative'
  | 'Service Blocked'
  | 'Access Blocked'
  | 'Deleted'
  | 'Cancelled'
  | 'Access Blocked - Password Reset'

export const TENANT_LIFECYCLE_OPERATIONAL_MODES: TenantOperationalMode[] = [
  TENANT_OPERATIONAL_STATUS_DELETED,
  TENANT_OPERATIONAL_STATUS_CANCELLED,
]

export const TENANT_MANUAL_OPERATIONAL_MODES: TenantOperationalMode[] = [
  'Access Blocked - Password Reset',
]

export function tenantFormType(tenant: Tenant): TenantFormType {
  return tenant.tenantFormType ?? (tenant.tenantType === 'PENLINK_INTERNAL' ? 'INTERNAL' : tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER')
}

export function tenantFormTypeForSystem(system: System): TenantFormType {
  if (system.systemClass === SYSTEM_CLASS_POC_DEMO_TRAINING || isReusedInternalSystem(system)) return 'POC'
  return 'CUSTOMER'
}

export function derivedTenantOperationalMode(system?: System): TenantOperationalMode {
  const status = system?.operationalStatus?.toLocaleLowerCase() ?? ''
  if (status.includes('service blocked')) return 'Service Blocked'
  if (status.includes('access blocked')) return 'Access Blocked'
  return 'Operative'
}

export function isManualTenantOperationalMode(value: string | undefined | null): value is TenantOperationalMode {
  return TENANT_MANUAL_OPERATIONAL_MODES.includes(value as TenantOperationalMode)
}

export function effectiveTenantOperationalMode(tenant: Tenant, system?: System): TenantOperationalMode {
  if (isTenantLifecycleInactive(tenant)) return tenant.operationalStatus as TenantOperationalMode
  const systemDerivedMode = derivedTenantOperationalMode(system)
  if (systemDerivedMode !== 'Operative') return systemDerivedMode
  return isManualTenantOperationalMode(tenant.operationalStatus)
    ? tenant.operationalStatus
    : systemDerivedMode
}

export function systemForTenant(tenant: Tenant, systems: System[]): System | undefined {
  return systems.find((system) => system.id === tenant.hostedSystemId || system.id === tenant.systemId)
}

export function currentOrHistoricalSystemForTenant(tenant: Tenant, systems: System[]): System | undefined {
  const systemId = tenantLatestHistoricalSystemId(tenant)
  return systems.find((system) => system.id === systemId)
}

export function inheritedTenantMapCenter(tenant: Tenant, systems: System[], tenants: Tenant[] = []): string {
  const system = systemForTenant(tenant, systems)
  if (!system) return tenant.mapCenter ?? tenant.configuration?.mapCenter ?? tenant.country ?? ''
  return systemApplicationConfigurationSummary(system, tenants).mapCenter || system.mapCenter || ''
}

export function tenantConfigurationPresentationRecord(
  tenant: Tenant,
  systems: System[],
  tenants: Tenant[] = [],
): Tenant & { configuration?: TenantConfiguration } {
  const mapCenter = inheritedTenantMapCenter(tenant, systems, tenants)
  return {
    ...tenant,
    mapCenter,
    configuration: {
      ...(tenant.configuration ?? {}),
      mapCenter,
    } as TenantConfiguration,
  }
}

export function tenantDerivedWarrantyContractStatus(tenant: Tenant): TenantWarrantyHeaderStatusReadModel {
  return tenantWarrantyHeaderStatusReadModel(tenant.warranties ?? [], tenant.tid)
}

export function tenantsGroupedByDerivedWarrantyContractStatus(tenants: Tenant[]): Array<{ status: TenantWarrantyHeaderStatusReadModel['status']; title: string; rows: Tenant[] }> {
  return TENANT_WARRANTY_CONTRACT_GROUPS.map((group) => ({
    status: group.status,
    title: group.label,
    rows: tenants.filter((tenant) => tenantDerivedWarrantyContractStatus(tenant).status === group.status),
  }))
}

export function tenantHostedSystemHistory(tenant: Tenant): TenantHostedSystemHistory[] {
  return tenant.hostedSystemHistory ?? [
    { systemId: tenant.systemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' },
  ]
}

export function tenantActiveProjectPids(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): string[] {
  const projectIds = new Set(
    activeProjectTenantLinks(projectTenants)
      .filter((link) => link.tenantId === tenant.id)
      .map((link) => link.projectId),
  )
  return Array.from(projectIds)
    .map((projectId) => projects.find((project) => project.id === projectId)?.pid)
    .filter((pid): pid is string => Boolean(pid))
}

export function tenantActiveProjects(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): Project[] {
  const projectIds = new Set(
    activeProjectTenantLinks(projectTenants)
      .filter((link) => link.tenantId === tenant.id)
      .map((link) => link.projectId),
  )
  return Array.from(projectIds)
    .map((projectId) => projects.find((project) => project.id === projectId))
    .filter((project): project is Project => Boolean(project))
}

export function tenantRelatedProjects(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
  systems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
  opportunities: Opportunity[] = [],
): Project[] {
  const projectIds = new Set<string>()
  const addProject = (project: Project | undefined) => {
    if (project) projectIds.add(project.id)
  }
  const addProjectId = (projectId: string | null | undefined) => {
    if (projectId) projectIds.add(projectId)
  }

  projectTenants
    .filter((link) => link.tenantId === tenant.id)
    .forEach((link) => addProjectId(link.projectId))

  projectSystems
    .filter((link) => (link.tenantIds ?? []).includes(tenant.id))
    .forEach((link) => addProjectId(link.projectId))

  const tenantPocPid = (tenant as Tenant & { pocPid?: string }).pocPid
  projects
    .filter((project) => project.pid === tenant.deliveryPid || project.pid === tenantPocPid)
    .forEach(addProject)

  const tenantSystemIds = new Set([tenant.systemId, tenant.hostedSystemId].filter((value): value is string => Boolean(value)))
  systems
    .filter((system) => tenantSystemIds.has(system.id))
    .flatMap((system) => system.linkedProjectIds ?? [])
    .forEach(addProjectId)

  opportunities.forEach((opportunity) => {
    const hasTenantRequirement = [
      ...(opportunity.changeRequestRequirements ?? []),
      ...(opportunity.standardRenewalRequirements ?? []),
    ].some((requirement) => requirement.tenantId === tenant.id)
    if (!hasTenantRequirement) return
    const opportunityProjectIds = [...(opportunity.pocProjectIds ?? []), opportunity.finalProjectId]
    opportunityProjectIds.forEach(addProjectId)
  })

  return projects
    .filter((project) => projectIds.has(project.id))
    .sort((first, second) => {
      const firstTime = Date.parse(first.createdAt)
      const secondTime = Date.parse(second.createdAt)
      if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
        return firstTime - secondTime
      }
      return first.pid.localeCompare(second.pid)
    })
}

function projectLinkAllocatedAt(link: ProjectTenantLink): string {
  return link.allocatedAt ?? ''
}

export function tenantOriginalProject(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): Project | undefined {
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const linkedProjects = projectTenants
    .filter((link) => link.tenantId === tenant.id)
    .sort((first, second) => {
      const firstDate = projectLinkAllocatedAt(first)
      const secondDate = projectLinkAllocatedAt(second)
      if (firstDate && secondDate && firstDate !== secondDate) return firstDate.localeCompare(secondDate)
      if (firstDate) return -1
      if (secondDate) return 1
      return first.id.localeCompare(second.id)
    })
    .map((link) => projectById.get(link.projectId))
    .filter((project): project is Project => Boolean(project))
  if (linkedProjects[0]) return linkedProjects[0]

  const tenantPocPid = (tenant as Tenant & { pocPid?: string }).pocPid
  return projects.find((project) => project.pid === tenant.deliveryPid || project.pid === tenantPocPid)
}

export function tenantMoveDefaultMode(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): TenantMoveMode {
  return tenantOriginalProject(tenant, projects, projectTenants)?.mainType === 'POC'
    ? 'POC_ASSIGNED'
    : 'DELIVERED'
}

export function tenantMoveDefaultRegion(context: Pick<TenantMoveContext, 'tenant' | 'projects' | 'projectTenants' | 'opportunities' | 'accounts'>): string {
  const project = tenantOriginalProject(context.tenant, context.projects, context.projectTenants)
  if (!project) return ''
  const linkedOpportunity = context.opportunities?.find((opportunity) => opportunity.id === project.opportunityId || opportunity.opportunityId === project.opportunityId)
  const account = context.accounts?.find((candidate) => candidate.accountName === project.accountName)
  return projectHeaderFieldValue(project, 'region', { linkedOpportunity, account }).trim()
}

function projectMatchesMoveMode(project: Project, mode: TenantMoveMode): boolean {
  if (project.archivedAt) return false
  if (mode === 'POC_ASSIGNED') return project.mainType === 'POC'
  return (
    (project.mainType === 'DELIVERY' && (project.subType === 'NEW' || project.subType === 'UPSELL')) ||
    (project.mainType === 'RENEWAL' && project.subType === 'UPSELL')
  )
}

function systemRegion(system: System): string {
  return system.region || system.timeGroup || ''
}

export function tenantMoveDestinationCandidates(context: TenantMoveContext, mode: TenantMoveMode): System[] {
  const sourceSystemId = activeHostedSystemIdForTenant(context.tenant)
  const sourceProduct = context.systems.find((system) => system.id === sourceSystemId)?.productType || context.tenant.productType
  const projectById = new Map(context.projects.map((project) => [project.id, project]))
  const eligibleProjectIds = new Set(
    context.projects
      .filter((project) => projectMatchesMoveMode(project, mode))
      .map((project) => project.id),
  )
  const allocatedSystemIds = new Set(
    activeProjectSystemLinks(context.projectSystems)
      .filter((link) => eligibleProjectIds.has(link.projectId) && projectById.has(link.projectId))
      .map((link) => link.systemId),
  )
  const defaultRegion = tenantMoveDefaultRegion(context)
  return context.systems.filter((system) => {
    if (system.id === sourceSystemId) return false
    if (!allocatedSystemIds.has(system.id)) return false
    if (sourceProduct && system.productType && system.productType !== sourceProduct) return false
    const destinationRegion = systemRegion(system)
    if (defaultRegion && destinationRegion && destinationRegion !== defaultRegion) return false
    return true
  })
}

export function validateTenantMoveDestination(context: TenantMoveContext, destinationSystemId: string): string | null {
  if (isTenantLifecycleInactive(context.tenant)) return `Tenant ${context.tenant.tid} cannot be moved because its Operational Status is ${context.tenant.operationalStatus}.`
  if (!activeHostedSystemIdForTenant(context.tenant)) return `Tenant ${context.tenant.tid} is not actively hosted by a System.`
  if (activeHostedSystemIdForTenant(context.tenant) === destinationSystemId) return 'Destination System must be different from the current hosted System.'
  if (!context.systems.some((system) => system.id === destinationSystemId)) return 'Destination System was not found.'
  const candidates = [
    ...tenantMoveDestinationCandidates(context, 'DELIVERED'),
    ...tenantMoveDestinationCandidates(context, 'POC_ASSIGNED'),
  ]
  return candidates.some((system) => system.id === destinationSystemId)
    ? null
    : 'Destination System is not eligible for this Tenant move.'
}

export function tenantDeliveryPidDisplay(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): string {
  const pids = tenantActiveProjects(tenant, projects, projectTenants)
    .filter((project) => project.mainType !== 'POC')
    .map((project) => project.pid)
  const hasProjectTenantLink = projectTenants.some((link) => link.tenantId === tenant.id)
  return pids.length > 0 ? pids.join('; ') : hasProjectTenantLink ? '' : tenant.deliveryPid ?? ''
}

export function tenantPocPidDisplay(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): string {
  return tenantActiveProjects(tenant, projects, projectTenants)
    .filter((project) => project.mainType === 'POC')
    .map((project) => project.pid)
    .join('; ')
}

export function tenantRequirementIdDisplay(tenant: Tenant): string {
  return tenant.sourceRequirementId ?? ''
}

export function tenantDashboardRowClassName(tenant: Tenant): string {
  return tenant.tenantType === 'POC'
    ? 'bg-blue-50 hover:bg-blue-100'
    : 'bg-white hover:bg-sf-surface-alt'
}

export const TENANT_DASHBOARD_COLOR_LEGEND = [
  { label: 'POC', rowClassName: 'bg-blue-50', swatchClassName: 'bg-blue-50' },
]

export function tenantTimeZoneDisplayValue(
  tenant: Tenant,
  opportunity?: Opportunity,
  system?: System,
): string {
  const country = tenant.country || opportunity?.country || system?.country || ''
  const state = opportunity?.state || system?.state || ''
  const referenceDate = opportunity?.deliveryDate ?? opportunity?.pocStartDate ?? null
  return geographicTimeZoneDisplayValue(country, state, referenceDate)
}

export function endedTenantHostedSystemHistory(
  tenant: Tenant,
  endedAt: string,
  reason: 'Deleted' | 'Cancelled',
): TenantHostedSystemHistory[] {
  const history = tenantHostedSystemHistory(tenant)
  return history.map((entry, index) =>
    index === history.length - 1 && entry.endedAt == null
      ? { ...entry, endedAt, reason }
      : entry,
  )
}

export function deletedTenantHostedSystemHistory(tenant: Tenant, deletedAt: string): TenantHostedSystemHistory[] {
  return endedTenantHostedSystemHistory(tenant, deletedAt, 'Deleted')
}

export function movedTenantHostedSystemHistory(
  tenant: Tenant,
  destinationSystemId: string,
  movedAt: string,
): TenantHostedSystemHistory[] {
  const history = tenantHostedSystemHistory(tenant)
  const closedHistory = history.map((entry, index) =>
    index === history.length - 1 && entry.endedAt == null
      ? { ...entry, endedAt: movedAt, reason: 'Moved' as const }
      : entry,
  )
  return [
    ...closedHistory,
    { systemId: destinationSystemId, startedAt: movedAt, endedAt: null, reason: 'Moved' as const },
  ]
}
