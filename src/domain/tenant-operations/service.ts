import type { System, Tenant, TenantFormType } from '@/data/seed.types'
import { isReusedInternalSystem, SYSTEM_CLASS_POC_DEMO_TRAINING } from '@/domain/system-inventory'

export function tenantFormType(tenant: Tenant): TenantFormType {
  return tenant.tenantFormType ?? (tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER')
}

export function tenantFormTypeForSystem(system: System): TenantFormType {
  if (system.systemClass === SYSTEM_CLASS_POC_DEMO_TRAINING || isReusedInternalSystem(system)) return 'POC'
  return 'CUSTOMER'
}

