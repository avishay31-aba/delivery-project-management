import type { Tenant } from '@/data/seed.types'

export const TENANT_OPERATIONAL_STATUS_DELETED = 'Deleted - By System'
export const TENANT_OPERATIONAL_STATUS_CANCELLED = 'Cancelled - By System'
export const TENANT_LEGACY_OPERATIONAL_STATUS_DELETED = 'Deleted'
export const TENANT_LEGACY_OPERATIONAL_STATUS_CANCELLED = 'Cancelled'

export function isTenantDeleted(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return tenant.operationalStatus === TENANT_OPERATIONAL_STATUS_DELETED || tenant.operationalStatus === TENANT_LEGACY_OPERATIONAL_STATUS_DELETED
}

export function isTenantCancelled(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return tenant.operationalStatus === TENANT_OPERATIONAL_STATUS_CANCELLED || tenant.operationalStatus === TENANT_LEGACY_OPERATIONAL_STATUS_CANCELLED
}

export function isTenantLifecycleInactive(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return isTenantDeleted(tenant) || isTenantCancelled(tenant)
}

export function activeHostedSystemIdForTenant(tenant: Pick<Tenant, 'hostedSystemId' | 'systemId' | 'operationalStatus'>): string {
  if (isTenantLifecycleInactive(tenant)) return ''
  return tenant.hostedSystemId || tenant.systemId || ''
}

export function tenantIsActivelyHostedBySystem(
  tenant: Pick<Tenant, 'hostedSystemId' | 'systemId' | 'operationalStatus'>,
  systemId: string,
): boolean {
  return activeHostedSystemIdForTenant(tenant) === systemId
}

export function tenantContributesToSystemConfiguration(
  tenant: Pick<Tenant, 'hostedSystemId' | 'systemId' | 'operationalStatus'>,
  systemId: string,
): boolean {
  return tenantIsActivelyHostedBySystem(tenant, systemId)
}

export function tenantVisibleInProjectTenantCollections(tenant: Pick<Tenant, 'operationalStatus'>): boolean {
  return !isTenantCancelled(tenant)
}

export function tenantLatestHistoricalSystemId(tenant: Pick<Tenant, 'hostedSystemHistory' | 'hostedSystemId' | 'systemId'>): string {
  const activeId = tenant.hostedSystemId || tenant.systemId || ''
  if (activeId) return activeId
  const history = tenant.hostedSystemHistory ?? []
  return history[history.length - 1]?.systemId ?? ''
}
