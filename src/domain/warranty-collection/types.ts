import type { Project, Tenant, TenantWarranty, WarrantyRecord, WarrantyStatus } from '@/data/seed.types'

export type WarrantyCollection = TenantWarranty[]
export type WarrantyCollectionProject = Project

export type TenantWarrantyHeaderStatus = 'NOT_SET_YET' | 'UNDER_CONTRACT' | 'OUT_OF_CONTRACT'

export interface WarrantyPredecessorRef {
  warrantyId: string
  tenantId: string
  recordId?: string
  rawValue: string
}

export interface WarrantySuccessorRef {
  warrantyId: string
  tenantId: string
  recordId?: string
}

export interface WarrantyRowReadModel {
  warranty: TenantWarranty
  predecessorRefs: WarrantyPredecessorRef[]
  successorRefs: WarrantySuccessorRef[]
  firstWarranty: boolean
  generatedStatus: WarrantyStatus
  canEditNoWarranty: boolean
  alert: string
}

export interface TenantWarrantyHeaderStatusReadModel {
  status: TenantWarrantyHeaderStatus
  label: string
}

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
