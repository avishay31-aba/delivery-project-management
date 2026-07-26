import type {
  Account,
  AppDataState,
  DocumentRecord,
  Opportunity,
  ProductionSystemInventoryItem,
  Project,
  ReusedInternalSystem,
  InfrastructureItem,
  System,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'

export type BusinessObjectType =
  | 'ACCOUNT'
  | 'OPPORTUNITY'
  | 'PROJECT'
  | 'SYSTEM'
  | 'PRODUCTION_SYSTEM'
  | 'INTERNAL_REUSED_SYSTEM'
  | 'TENANT'
  | 'WARRANTY'
  | 'DOCUMENT'
  | 'REQUIREMENT'
  | 'MILESTONE'
  | 'TASK'
  | 'INFRASTRUCTURE_ITEM'

export interface BusinessObjectReference {
  objectType: BusinessObjectType
  internalId: string | null
  businessId: string
  displayLabel: string
  routePath: string | null
  isMissing: boolean
  isStale: boolean
}

export interface BusinessReferenceLookup {
  objectType: BusinessObjectType
  internalId?: string | null
  businessId?: string | null
}

export type BusinessReferenceContext = Pick<
  AppDataState,
  | 'accounts'
  | 'opportunities'
  | 'projects'
  | 'productionSystemInventory'
  | 'reusedInternalSystems'
  | 'systems'
  | 'tenants'
  | 'warrantyRecords'
  | 'infrastructureItems'
>

export type BusinessReferenceRecord =
  | Account
  | Opportunity
  | Project
  | ProductionSystemInventoryItem
  | ReusedInternalSystem
  | System
  | Tenant
  | WarrantyRecord
  | InfrastructureItem
  | DocumentRecord
