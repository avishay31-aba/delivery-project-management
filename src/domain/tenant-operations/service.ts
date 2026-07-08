import type { Project, ProjectTenantLink, System, Tenant, TenantFormType, TenantHostedSystemHistory } from '@/data/seed.types'
import { activeProjectTenantLinks } from '@/domain/allocation-context'
import { isReusedInternalSystem, SYSTEM_CLASS_POC_DEMO_TRAINING } from '@/domain/system-inventory'

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

export function tenantDeliveryPidDisplay(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): string {
  const pids = tenantActiveProjectPids(tenant, projects, projectTenants)
  const hasProjectTenantLink = projectTenants.some((link) => link.tenantId === tenant.id)
  return pids.length > 0 ? pids.join('; ') : hasProjectTenantLink ? '' : tenant.deliveryPid ?? ''
}

export function tenantPocPidDisplay(
  tenant: Tenant,
  projects: Project[],
  projectTenants: ProjectTenantLink[] = [],
): string {
  return tenantActiveProjectPids(tenant, projects, projectTenants)
    .filter((pid) => projects.find((project) => project.pid === pid)?.mainType === 'POC')
    .join('; ')
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
