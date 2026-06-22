import type {
  Account,
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  StandardRenewalRequirement,
  System,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'

export type RequirementCoverageStatus = 'COVERED' | 'PARTIALLY_COVERED' | 'UNCOVERED' | 'BLOCKED' | 'UNKNOWN'

export type RequirementCoverageMissingStep =
  | 'NONE'
  | 'MISSING_PROJECT'
  | 'MISSING_SYSTEM_ALLOCATION'
  | 'MISSING_TENANT_CREATION'
  | 'MISSING_HOSTING'
  | 'MISSING_PRODUCT_CONFIGURATION'
  | 'MISSING_RELATED_REQUIREMENT_LINK'
  | 'MISSING_DATA'

export type RequirementCoverageGrid = 'A' | 'B' | 'C'

export type RequirementCoverageRequirement =
  | NewTenantRequirement
  | ChangeRequestRequirement
  | StandardRenewalRequirement

export interface RequirementCoverageContext {
  accounts: Account[]
  opportunities: Opportunity[]
  projects: Project[]
  systems: System[]
  tenants: Tenant[]
  warrantyRecords: WarrantyRecord[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
}

export interface RequirementCoverageRow {
  id: string
  opportunityId: string
  opportunityName: string
  accountId: string
  customerName: string
  requirementId: string
  requirementType: RequirementCoverageGrid
  requirementGrid: string
  product: string
  hostingType: string
  cloudPlatform: string
  deploymentTarget: string
  projectId: string
  pid: string
  systemId: string
  sid: string
  mid: string
  tenantId: string
  tid: string
  coverageStatus: RequirementCoverageStatus
  coverageStatusLabel: string
  missingStep: RequirementCoverageMissingStep
  missingStepLabel: string
  coverageAlerts: string[]
  linkedProjectCount: number
  linkedSystemCount: number
  linkedTenantCount: number
}

export interface RequirementCoverageSummary {
  totalRequirements: number
  covered: number
  partiallyCovered: number
  uncovered: number
  blocked: number
  unknown: number
  missingProject: number
  missingSystem: number
  missingTenant: number
}

export interface RequirementCoverageSource {
  opportunity: Opportunity
  account?: Account
  requirement: RequirementCoverageRequirement
  requirementType: RequirementCoverageGrid
  requirementGrid: string
}

export type {
  Account,
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  StandardRenewalRequirement,
  System,
  Tenant,
  WarrantyRecord,
}
