import type {
  Account,
  IdCounters,
  Opportunity,
  OpportunityStage,
  OpportunitySubType,
  OpportunityType,
  Project,
  ProjectMainType,
  ProjectSubType,
  ProjectSource,
  RequirementType,
  SalesManager,
  System,
  Tenant,
} from '@/data/seed.types'

export type OpportunityLifecycleType = OpportunityType
export type OpportunityLifecycleSubType = OpportunitySubType
export type OpportunityLifecycleStage = OpportunityStage

export type PocProjectSyncAction = 'UPDATE_EXISTING_POC' | 'CREATE_NEW_POC' | 'DO_NOT_CREATE'

export interface OpportunityProjectSyncOptions {
  pocAction?: PocProjectSyncAction
  allowDoneFinalUpdate?: boolean
}

export interface ProjectLifecycleChange {
  projectId: string
  changeStatus: 'New' | 'Updated'
}

export interface OpportunityProjectSyncResult {
  opportunity: Opportunity
  projectChanges: ProjectLifecycleChange[]
  messages?: string[]
}

export interface OpportunityValidationContext {
  accounts: Account[]
  systems: System[]
  tenants: Tenant[]
}

export interface OpportunityProjectSyncContext {
  account?: Account
  salesManager?: SalesManager
  idCounters: IdCounters
  projects: Project[]
  now: string
  preserveOpportunityUpdatedAt?: string
}

export type {
  Account,
  IdCounters,
  Opportunity,
  OpportunityStage,
  OpportunitySubType,
  OpportunityType,
  Project,
  ProjectMainType,
  ProjectSubType,
  ProjectSource,
  RequirementType,
  SalesManager,
  System,
  Tenant,
}
