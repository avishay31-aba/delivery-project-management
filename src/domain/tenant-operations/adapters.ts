import type { Tenant } from '@/data/seed.types'

export function cloneTenant(tenant: Tenant): Tenant {
  return JSON.parse(JSON.stringify(tenant)) as Tenant
}

