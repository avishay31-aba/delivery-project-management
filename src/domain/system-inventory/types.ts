import type {
  AvailabilityStatus,
  ProductionSystemInventoryItem,
  Project,
  ProjectSystemLink,
  ReusedInternalSystem,
  ReusedInternalSystemStatus,
  System,
  SystemClass,
  SystemPurpose,
  SystemSource,
  Tenant,
} from '@/data/seed.types'

export type SystemInventoryRecord = ProductionSystemInventoryItem | ReusedInternalSystem | System
export type AllocatedSystem = System
export type ProductionInventoryRecord = ProductionSystemInventoryItem
export type ReusedInternalInventoryRecord = ReusedInternalSystem
export type SystemIdentityKind = 'SID' | 'MID'

export type AllocatedSystemDashboardRow = System & {
  allocationIds: string[]
  allocationProjectIds: string[]
  allocationTypes: string[]
  allocatedAt: string
  allocationStatus: string
}

export interface SystemInventoryValidationMessage {
  field?: string
  message: string
}

export interface SystemReadModelContext {
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  tenants: Tenant[]
}

export type {
  AvailabilityStatus,
  ProductionSystemInventoryItem,
  Project,
  ProjectSystemLink,
  ReusedInternalSystem,
  ReusedInternalSystemStatus,
  System,
  SystemClass,
  SystemPurpose,
  SystemSource,
  Tenant,
}
