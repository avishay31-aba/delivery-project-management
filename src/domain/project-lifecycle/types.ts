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

export interface ProjectDeliveryDashboardContext {
  project: Project
  opportunities: Opportunity[]
  accounts: Account[]
  salesManagers: SalesManager[]
  systems: System[]
  tenants: Tenant[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
}

export type ProjectHealthStatus = 'HEALTHY' | 'WARNING' | 'AT_RISK' | 'BLOCKED' | 'COMPLETED'

export type ProjectDeliveryDateStatus = 'NOT_SET' | 'ON_TRACK' | 'UPCOMING_RISK' | 'OVERDUE' | 'COMPLETED'

export interface ProjectHealthReadModel {
  projectId: string
  pid: string
  healthStatus: ProjectHealthStatus
  healthLabel: string
  healthAlerts: string[]
  completionPercent: number
  currentMilestone: string
  lastCompletedMilestone: string
  openTaskCount: number
  completedTaskCount: number
  activeSystemCount: number
  activeTenantCount: number
  missingSystems: boolean
  missingTenants: boolean
  deliveryDateStatus: ProjectDeliveryDateStatus
  deliveryDateStatusLabel: string
}

export interface ProjectPortfolioHealthSummary {
  totalProjects: number
  healthyProjects: number
  warningProjects: number
  atRiskProjects: number
  completedProjects: number
  projectsMissingSystems: number
  projectsMissingTenants: number
}

export interface ProjectDeliveryDashboardReadModel {
  projectId: string
  pid: string
  projectName: string
  endUser: string
  payingCustomer: string
  region: string
  country: string
  status: string
  statusLabel: string
  deliveryDate: string
  pocStartDate: string
  pocEndDate: string
  type: string
  hosting: string
  product: string
  modules: string[]
  licenses: string
  users: string
  projectAlerts: string[]
  projectAlertSeverity: 'danger' | 'warning' | 'info' | 'success'
  milestoneCompletionPercent: number
  milestoneCompletion: string
  lastMilestone: string
  currentMilestone: string
  financialProfile: string
  owner: string
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
