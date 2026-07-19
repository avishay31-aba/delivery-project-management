import type {
  Account,
  AllocationStatus,
  AllocationType,
  Opportunity,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  ReusedInternalSystem,
  System,
} from '@/data/seed.types'

export type AllocationMode = AllocationType
export type ProjectSystemAllocation = ProjectSystemLink
export type ProjectTenantAllocation = ProjectTenantLink

export interface AllocationActionResult {
  ok: boolean
  message: string
  allocationId?: string
  tenantId?: string
}

export interface AllocationValidationContext {
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  productionSystemInventory: Array<{ id: string }>
  reusedInternalSystems: ReusedInternalSystem[]
  systems: System[]
  accounts?: Account[]
  opportunities?: Opportunity[]
}

export interface AllocationValidationInput {
  projectId: string
  systemId: string
}

export type { AllocationStatus, AllocationType }
