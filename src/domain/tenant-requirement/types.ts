import type {
  Account,
  ChangeRequestRequirement,
  NewTenantRequirement,
  RequirementType,
  StandardRenewalRequirement,
  System,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'
import type { SharedFieldMetadata, ValidationMessage } from '@/domain/application-configuration'

export type TenantRequirementKind = RequirementType
export type TenantRequirement = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement
export type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  StandardRenewalRequirement,
  SharedFieldMetadata,
  ValidationMessage,
  WarrantyRecord,
}

export type RequirementColumnMetadata = SharedFieldMetadata

export interface TenantRequirementContext {
  accounts: Account[]
  systems: System[]
  tenants: Tenant[]
}
