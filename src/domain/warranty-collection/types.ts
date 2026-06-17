import type { Project, Tenant, TenantWarranty, WarrantyRecord, WarrantyStatus } from '@/data/seed.types'

export type WarrantyCollection = TenantWarranty[]
export type WarrantyCollectionProject = Project

export interface WarrantyCollectionContext {
  tenant: Tenant
  projects: Project[]
  opportunities: Array<{ opportunityId: string; id: string; opportunityName: string }>
}

export type {
  TenantWarranty,
  WarrantyRecord,
  WarrantyStatus,
}
