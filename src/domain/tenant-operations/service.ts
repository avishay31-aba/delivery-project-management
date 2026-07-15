import type { Opportunity, Project, ProjectTenantLink, System, Tenant, TenantConfiguration, TenantFormType, TenantHostedSystemHistory } from '@/data/seed.types'
import { activeProjectTenantLinks } from '@/domain/allocation-context'
import { geographicTimeZoneDisplayValue } from '@/domain/geographic-time-zone'
import { isReusedInternalSystem, systemApplicationConfigurationSummary, SYSTEM_CLASS_POC_DEMO_TRAINING } from '@/domain/system-inventory'

export type TenantOperationalMode =
  | 'Operative'
  | 'Service Blocked'
  | 'Access Blocked'
  | 'Deleted'
  | 'Cancelled'
  | 'Access Blocked - Password Reset'

export const TENANT_MANUAL_OPERATIONAL_MODES: TenantOperationalMode[] = [
  'Deleted',
  'Cancelled',
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
  return isManualTenantOperationalMode(tenant.operationalStatus)
    ? tenant.operationalStatus
    : derivedTenantOperationalMode(system)
}

export function systemForTenant(tenant: Tenant, systems: System[]): System | undefined {
  return systems.find((system) => system.id === tenant.hostedSystemId || system.id === tenant.systemId)
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

export function deletedTenantHostedSystemHistory(tenant: Tenant, deletedAt: string): TenantHostedSystemHistory[] {
  const history = tenantHostedSystemHistory(tenant)
  return history.map((entry, index) =>
    index === history.length - 1 && entry.endedAt == null
      ? { ...entry, endedAt: deletedAt, reason: 'Deleted' as const }
      : entry,
  )
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
