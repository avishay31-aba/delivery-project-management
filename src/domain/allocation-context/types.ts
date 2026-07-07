import type {
  AllocationStatus,
  AllocationType,
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
}

export interface AllocationValidationContext {
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  productionSystemInventory: Array<{ id: string }>
  reusedInternalSystems: ReusedInternalSystem[]
  systems: System[]
  opportunities?: Array<{ opportunityId: string; id: string; newTenantRequirements?: Array<{ existingSystemId?: string | null; deployTarget?: string }>; changeRequestRequirements?: Array<{ systemId?: string | null }>; standardRenewalRequirements?: Array<{ systemId?: string | null }> }>
}

export interface AllocationValidationInput {
  projectId: string
  systemId: string
}

export type { AllocationStatus, AllocationType }
