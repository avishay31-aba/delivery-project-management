import type {
  Account,
  AppDataState,
  NewTenantRequirement,
  Opportunity,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  System,
  Tenant,
  TenantConfiguration,
  TenantFormType,
  TenantHostedSystemHistory,
} from '@/data/seed.types'
import type { AllocationActionResult } from '@/domain/allocation-context'

export type TenantOperationResult = AllocationActionResult
export type TenantOperationFormType = TenantFormType
export type TenantHostingHistory = TenantHostedSystemHistory[]

export interface TenantCreationContext {
  accounts: Account[]
  idCounters: AppDataState['idCounters']
  opportunities: Opportunity[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  projects: Project[]
  systems: System[]
  tenants: Tenant[]
}

export interface TenantCreationInput {
  projectId: string
  systemId: string
  requirementId: string
}

export interface TenantCreationSource {
  account?: Account
  existingTenantIds: Array<string | null | undefined>
  idCounters: AppDataState['idCounters']
  opportunity: Opportunity
  project: Project
  projectSystemLink?: ProjectSystemLink
  requirement: NewTenantRequirement
  system: System
}

export interface TenantCreationDraft {
  idCounters: AppDataState['idCounters']
  projectTenant: ProjectTenantLink
  tenant: Tenant
}

export interface TenantConfigurationSaveContext {
  activeSystem?: System
  savedTenant: Tenant
  tenantDraft: Tenant
}

export interface TenantConfigurationSaveDraft {
  configuration: TenantConfiguration
  patch: Partial<Tenant>
}
