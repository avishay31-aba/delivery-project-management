import type { Tenant } from '@/data/seed.types'

export const TENANT_OPERATIONAL_STATUS_DELETED = 'Deleted'
export const TENANT_OPERATIONAL_STATUS_CANCELLED = 'Cancelled'
export const TENANT_LEGACY_OPERATIONAL_STATUS_DELETED = 'Deleted'
export const TENANT_LEGACY_OPERATIONAL_STATUS_CANCELLED = 'Cancelled'
const TENANT_DEPRECATED_OPERATIONAL_STATUS_DELETED_BY_SYSTEM = 'Deleted - By System'
const TENANT_DEPRECATED_OPERATIONAL_STATUS_CANCELLED_BY_SYSTEM = 'Cancelled - By System'
export const TENANT_SYSTEM_FORCED_STATUS_OFF = 'System is Off'
export const TENANT_SYSTEM_FORCED_STATUS_ACCESS_BLOCKED = 'System-Access Blocked'
export const TENANT_SYSTEM_FORCED_STATUS_SERVICE_BLOCKED = 'System-Service Blocked'

export type TenantLifecycleFields = Pick<
  Tenant,
  'operationalStatus' | 'individualLifecyclePreviousOperationalStatus' | 'systemForcedPreviousOperationalStatus' | 'systemForcedBySystemId'
>

export function isTenantDeleted(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return tenant.operationalStatus === TENANT_OPERATIONAL_STATUS_DELETED || tenant.operationalStatus === TENANT_LEGACY_OPERATIONAL_STATUS_DELETED || tenant.operationalStatus === TENANT_DEPRECATED_OPERATIONAL_STATUS_DELETED_BY_SYSTEM
}

export function isTenantCancelled(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return tenant.operationalStatus === TENANT_OPERATIONAL_STATUS_CANCELLED || tenant.operationalStatus === TENANT_LEGACY_OPERATIONAL_STATUS_CANCELLED || tenant.operationalStatus === TENANT_DEPRECATED_OPERATIONAL_STATUS_CANCELLED_BY_SYSTEM
}

export function isTenantOperationallyVisible(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return !isTenantCancelled(tenant)
}

export function isTenantLifecycleInactive(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return isTenantDeleted(tenant) || isTenantCancelled(tenant)
}

export function isTenantSystemForced(tenant: Partial<TenantLifecycleFields>): boolean {
  return Boolean(tenant.systemForcedBySystemId && tenant.systemForcedPreviousOperationalStatus)
}

export function isTenantIndividuallyLifecycleInactive(tenant: Partial<TenantLifecycleFields>): boolean {
  return isTenantLifecycleInactive({ operationalStatus: tenant.operationalStatus ?? '' }) && !isTenantSystemForced(tenant)
}

export function activeHostedSystemIdForTenant(
  tenant: Pick<Tenant, 'hostedSystemId' | 'systemId' | 'operationalStatus'> & Partial<TenantLifecycleFields>,
): string {
  if (isTenantIndividuallyLifecycleInactive(tenant)) return ''
  return tenant.hostedSystemId || tenant.systemId || ''
}

export function tenantIsActivelyHostedBySystem(
  tenant: Pick<Tenant, 'hostedSystemId' | 'systemId' | 'operationalStatus'>,
  systemId: string,
): boolean {
  return activeHostedSystemIdForTenant(tenant) === systemId
}

export function tenantContributesToSystemConfiguration(
  tenant: Pick<Tenant, 'hostedSystemId' | 'systemId' | 'operationalStatus'> & Partial<TenantLifecycleFields>,
  systemId: string,
): boolean {
  return tenantIsActivelyHostedBySystem(tenant, systemId)
}

export function tenantLatestHistoricalSystemId(tenant: Pick<Tenant, 'hostedSystemHistory' | 'hostedSystemId' | 'systemId'>): string {
  const activeId = tenant.hostedSystemId || tenant.systemId || ''
  if (activeId) return activeId
  const history = tenant.hostedSystemHistory ?? []
  return history[history.length - 1]?.systemId ?? ''
}
