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

export interface WarrantyDashboardRow {
  id: string
  warrantyId: string
  customer: string
  accountManager: string
  tenantId: string
  tenantTid: string
  tenantName: string
  sid: string
  product: string
  relatedProjectId: string
  projectName: string
  opportunityId: string
  warrantyType: string
  first: boolean
  startDate: string | null
  endDate: string | null
  daysToExpiration: number | null
  warrantyStatus: WarrantyStatus
  warrantyStatusLabel: string
  tenantHeaderStatus: TenantWarrantyHeaderStatus
  tenantHeaderStatusLabel: string
  alerts: string
  predecessorCount: number
  successorCount: number
  isRenewalCandidate: boolean
  isMissingRelatedProject: boolean
}

export interface WarrantyDashboardContext {
  tenants: Tenant[]
  accountNameForTenant: (tenant: Tenant) => string
  accountManagerForTenant: (tenant: Tenant) => string
  tenantNameForTenant: (tenant: Tenant) => string
  sidForTenant: (tenant: Tenant) => string
  productForTenant: (tenant: Tenant) => string
  projectNameForProjectId: (projectId: string) => string
}

export interface WarrantyDashboardSummary {
  totalWarranties: number
  underContract: number
  outOfContract: number
  expiring30: number
  expired: number
  noWarranty: number
  renewalCandidates: number
}

export type RenewalCandidateCategory =
  | 'EXPIRING_30'
  | 'EXPIRING_60'
  | 'EXPIRING_90'
  | 'EXPIRED'
  | 'NO_WARRANTY'
  | 'OUT_OF_CONTRACT'

export interface RenewalCandidateRow {
  id: string
  warrantyId: string
  customer: string
  accountManager: string
  tenantId: string
  tenantTid: string
  tenantName: string
  sid: string
  product: string
  relatedProjectId: string
  warrantyType: string
  endDate: string | null
  daysToExpiration: number | null
  warrantyStatus: WarrantyStatus
  warrantyStatusLabel: string
  tenantHeaderStatus: TenantWarrantyHeaderStatus
  tenantHeaderStatusLabel: string
  renewalCategory: RenewalCandidateCategory
  renewalCategoryLabel: string
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
