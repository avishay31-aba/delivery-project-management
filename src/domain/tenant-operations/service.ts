import type { System, Tenant, TenantFormType, TenantHostedSystemHistory } from '@/data/seed.types'
import { isReusedInternalSystem, SYSTEM_CLASS_POC_DEMO_TRAINING } from '@/domain/system-inventory'

export function tenantFormType(tenant: Tenant): TenantFormType {
  return tenant.tenantFormType ?? (tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER')
}

export function tenantFormTypeForSystem(system: System): TenantFormType {
  if (system.systemClass === SYSTEM_CLASS_POC_DEMO_TRAINING || isReusedInternalSystem(system)) return 'POC'
  return 'CUSTOMER'
}

export function tenantHostedSystemHistory(tenant: Tenant): TenantHostedSystemHistory[] {
  return tenant.hostedSystemHistory ?? [
    { systemId: tenant.systemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' },
  ]
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
