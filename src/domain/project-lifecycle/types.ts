import type {
  Account,
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  Project,
  ProjectMainType,
  ProjectSource,
  ProjectSubType,
  ProjectSystemLink,
  ProjectTenantLink,
  SalesManager,
  StandardRenewalRequirement,
  System,
  Tenant,
} from '@/data/seed.types'

export type ProjectLifecycleProject = Project
export type ProjectLifecycleMainType = ProjectMainType
export type ProjectLifecycleSubType = ProjectSubType
export type ProjectLifecycleSource = ProjectSource

export type ProjectRequirementRow = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement

export interface ProjectLifecycleContext {
  linkedOpportunity?: Opportunity
  account?: Account
  salesManager?: SalesManager
}

export interface ProjectSystemsTenantsContext {
  project: Project
  systems: System[]
  tenants: Tenant[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
}

export type {
  Account,
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  Project,
  ProjectMainType,
  ProjectSource,
  ProjectSubType,
  ProjectSystemLink,
  ProjectTenantLink,
  SalesManager,
  StandardRenewalRequirement,
  System,
  Tenant,
}
