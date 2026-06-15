/** Core enums and entity types for mock data (Phase A — no business logic). */

export type ProjectMainType = 'POC' | 'DELIVERY' | 'RENEWAL'
export type ProjectSubType = 'NONE' | 'NEW' | 'UPSELL' | 'STANDARD' | 'DOWN_SELL'
export type ProgressStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE'
export type AccountCustomerType = 'NEW_CUSTOMER' | 'VETERAN_CUSTOMER'
export type OpportunityType = ProjectMainType
export type OpportunitySubType = ProjectSubType | 'FREE' | 'PAID'
export type OpportunityStage = 'OPEN' | 'WON'
export type RequirementType = 'A' | 'B' | 'C'
export type RequirementDeployTarget = 'NEW_SYSTEM' | 'EXISTING_SID'
export type YesNo = 'YES' | 'NO' | ''
export type ProjectSource = 'POC' | 'FINAL'

export type SystemClass = 'CUSTOMER' | 'POC_DEMO_TRAINING'
export type SystemSource = 'Production' | 'Reused Internal Systems'
export type SystemPurpose =
  | 'Delivery'
  | 'Available'
  | 'POC'
  | 'Demo'
  | 'Training'
  | 'Support'
  | 'AVAILABLE'
  | 'DEMO'
  | 'TRAINING'
  | 'SUPPORT'
  | 'CUSTOMER'
export type AvailabilityStatus = 'AVAILABLE' | 'OCCUPIED' | 'OBSOLETE'
export type ReusedInternalSystemStatus = 'Available' | 'Occupied' | 'Obsolete'

export type TenantType = 'CUSTOMER' | 'POC' | 'PENLINK_INTERNAL'
export type IdCounterKey = 'pid' | 'sid' | 'tid' | 'mid'
export type TenantContractStatus = 'UNDER_CONTRACT' | 'OUT_OF_CONTRACT'

export interface IdCounters {
  pid: number
  sid: number
  tid: number
  mid: number
}

export interface SalesManager {
  id: string
  name: string
  email: string
  region: string
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  accountCode: string
  accountName: string
  customerType: AccountCustomerType
  salesManagerId: string
  region: string
  country: string
  state: string
  timeZone: string
  timeGroup: string
  createdAt: string
  updatedAt: string
}

export type WarrantyStatus =
  | 'NOT_SET'
  | 'PLANNED'
  | 'VALID'
  | 'PENDING'
  | 'RENEWED'
  | 'EXPIRED'
  | 'NO_WARRANTY'
  | 'OBSOLETE'

export interface Project {
  id: string
  pid: string
  opportunityId?: string
  projectSource: ProjectSource
  accountName: string
  mainType: ProjectMainType
  subType: ProjectSubType
  deliveryDate: string | null
  progressStatus: ProgressStatus
  dealOwner: string
  opportunityName: string
  canceledAt: string | null
  milestoneTemplateId?: string
  milestones?: ProjectMilestone[]
  tasks?: ProjectTask[]
  createdAt: string
  updatedAt: string
}

export interface ProjectMilestone {
  id: string
  name: string
  order: number
  status: ProgressStatus
}

export interface ProjectTask {
  id: string
  milestoneId: string
  name: string
  department: string
  resource: string
  status: Exclude<ProgressStatus, 'IN_PROGRESS'>
  order: number
}

export interface OpportunityRequirementBase {
  id: string
  requirementId: string
  hostingType: string
  cloudPlatform: string
  csp?: string
  cloudRegion?: string
  statisticsId?: string
  authId?: string
  rdmId?: string
  performanceTier?: 'STANDARD' | 'POWERED' | ''
  vpnEnabled?: YesNo
  vpnType?: string
  ipRestrictionEnabled?: YesNo
  productType: string
  mapCenter: string
  licenses: number | null
  users: number | null
  concurrentSearches: number | null
  dailySearches: number | null
  monthlySearches: number | null
  concurrentAnalyses: number | null
  topicAnalyses: number | null
  dailyAnalyses: number | null
  monthlyAnalyses: number | null
  tangles: number | null
  tanglesGo: number | null
  webloc: number | null
  webeye: number | null
  ingest: number | null
  blockchain: YesNo
  crossSystemFeatures: string[]
  apiEnabled: YesNo
  apiDailyQty: number | null
  apiMonthlyQty: number | null
  aiFeatures: string[]
  additionalFeatures: string[]
  standardMonitors: number | null
  fullMonitors: number | null
  topicMonitors: number | null
}

export interface NewTenantRequirement extends OpportunityRequirementBase {
  deployTarget: RequirementDeployTarget
  existingSystemId: string | null
}

export interface ChangeRequestRequirement extends OpportunityRequirementBase {
  tenantId: string
  systemId: string
}

export interface StandardRenewalRequirement extends Partial<OpportunityRequirementBase> {
  id: string
  requirementId: string
  tenantId: string
  systemId: string
  warrantyRecordId: string
  warrantyStatus: WarrantyStatus
  warrantyEndDate: string | null
}

export interface Opportunity {
  id: string
  opportunityId: string
  opportunityName: string
  stage: OpportunityStage
  accountId: string
  salesManagerId: string
  type: OpportunityType
  subType: OpportunitySubType
  deliveryDate: string | null
  pocStartDate: string | null
  pocEndDate: string | null
  warrantyServiceMonths: number | null
  warrantyRecordId?: string
  region: string
  country: string
  state: string
  timeZone: string
  timeGroup: string
  currentMilestone: string
  projectAlerts: string[]
  newTenantRequirements: NewTenantRequirement[]
  changeRequestRequirements: ChangeRequestRequirement[]
  standardRenewalRequirements: StandardRenewalRequirement[]
  pocProjectIds: string[]
  finalProjectId: string | null
  wonAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface System {
  id: string
  accountId?: string | null
  salesManagerId?: string | null
  sid: string | null
  deliveryPid?: string | null
  machineId: string | null
  source?: SystemSource
  linkedProjectIds?: string[]
  tenantIds?: string[]
  systemClass: SystemClass
  purpose: SystemPurpose
  availability: AvailabilityStatus
  logo?: string
  url?: string
  cognitoRegion?: string
  productType: string
  hostingType: string
  cloudPlatform?: string
  csp?: string
  cloudRegion?: string
  statisticsId?: string
  authId?: string
  rdmId?: string
  performanceTier?: 'STANDARD' | 'POWERED' | ''
  vpnEnabled?: YesNo
  vpnType?: string
  ipRestrictionEnabled?: YesNo
  mapCenter?: string
  region?: string
  country?: string
  state?: string
  timeGroup: string
  timeGroupAlert?: string
  operationalStatus: string
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  tid: string
  tenantName?: string
  accountId: string
  systemId: string
  deliveryPid?: string
  tenantType: TenantType
  accountName: string
  country: string
  timeGroup: string
  operationalStatus: string
  contractStatus?: TenantContractStatus
  hostedSystemHistory?: TenantHostedSystemHistory[]
  productType: string
  hostingType?: string
  cloudPlatform?: string
  csp?: string
  cloudRegion?: string
  statisticsId?: string
  authId?: string
  rdmId?: string
  performanceTier?: 'STANDARD' | 'POWERED' | ''
  vpnEnabled?: YesNo
  vpnType?: string
  ipRestrictionEnabled?: YesNo
  mapCenter?: string
  licenses?: number | null
  users?: number | null
  concurrentSearches?: number | null
  dailySearches?: number | null
  monthlySearches?: number | null
  concurrentAnalyses?: number | null
  topicAnalyses?: number | null
  dailyAnalyses?: number | null
  monthlyAnalyses?: number | null
  tangles?: number | null
  tanglesGo?: number | null
  webloc?: number | null
  webeye?: number | null
  ingest?: number | null
  blockchain?: YesNo
  crossSystemFeatures?: string[]
  apiEnabled?: YesNo
  apiDailyQty?: number | null
  apiMonthlyQty?: number | null
  aiFeatures?: string[]
  additionalFeatures?: string[]
  standardMonitors?: number | null
  fullMonitors?: number | null
  topicMonitors?: number | null
  warrantyStatus: WarrantyStatus
  warrantyStartDate?: string | null
  warrantyEndDate: string | null
  pocStartDate: string | null
  pocEndDate: string | null
  createdAt: string
  updatedAt: string
}

export interface TenantHostedSystemHistory {
  systemId: string
  startedAt: string
  endedAt: string | null
  reason: 'Created' | 'Moved' | 'Deleted'
}

export interface ProductionSystemInventoryItem {
  id: string
  sid: string
  source: 'Production'
  purpose: 'Delivery'
  logo?: string
  url?: string
  cognitoRegion?: string
  productType: string
  hostingType: string
  cloudPlatform?: string
  csp?: string
  cloudRegion?: string
  mapCenter?: string
  performanceTier?: 'STANDARD' | 'POWERED' | ''
  vpnEnabled?: YesNo
  vpnType?: string
  ipRestrictionEnabled?: YesNo
  region?: string
  country?: string
  state?: string
  timeGroup: string
  timeGroupAlert?: string
  linkedProjects?: string[]
  operationalStatus: string
  tenantCount: number
  licenses?: number | null
  users?: number | null
  concurrentSearches?: number | null
  dailySearches?: number | null
  monthlySearches?: number | null
  concurrentAnalyses?: number | null
  topicAnalyses?: number | null
  dailyAnalyses?: number | null
  monthlyAnalyses?: number | null
  standardMonitors?: number | null
  fullMonitors?: number | null
  topicMonitors?: number | null
  tangles?: number | null
  tanglesGo?: number | null
  webloc?: number | null
  webeye?: number | null
  ingest?: number | null
  blockchain?: YesNo
  crossSystemFeatures?: string[]
  apiEnabled?: YesNo
  apiDailyQty?: number | null
  apiMonthlyQty?: number | null
  aiFeatures?: string[]
  additionalFeatures?: string[]
  alerts: string[]
  createdAt: string
  updatedAt: string
}

export interface ReusedInternalSystem {
  id: string
  machineId: string
  source: 'Reused Internal Systems'
  purpose: 'POC' | 'Demo' | 'Training' | 'Support'
  status: ReusedInternalSystemStatus
  logo?: string
  url?: string
  cognitoRegion?: string
  productType: string
  hostingType: string
  cloudPlatform?: string
  csp?: string
  cloudRegion?: string
  mapCenter?: string
  performanceTier?: 'STANDARD' | 'POWERED' | ''
  vpnEnabled?: YesNo
  vpnType?: string
  ipRestrictionEnabled?: YesNo
  usedInRegion?: string
  timeGroup: string
  timeGroupAlert?: string
  occupationStartDate?: string | null
  occupationEndDate?: string | null
  currentProjectIds: string[]
  tenantCount: number
  licenses?: number | null
  users?: number | null
  concurrentSearches?: number | null
  dailySearches?: number | null
  monthlySearches?: number | null
  concurrentAnalyses?: number | null
  topicAnalyses?: number | null
  dailyAnalyses?: number | null
  monthlyAnalyses?: number | null
  standardMonitors?: number | null
  fullMonitors?: number | null
  topicMonitors?: number | null
  tangles?: number | null
  tanglesGo?: number | null
  webloc?: number | null
  webeye?: number | null
  ingest?: number | null
  blockchain?: YesNo
  crossSystemFeatures?: string[]
  apiEnabled?: YesNo
  apiDailyQty?: number | null
  apiMonthlyQty?: number | null
  aiFeatures?: string[]
  additionalFeatures?: string[]
  alerts: string[]
  operationalStatus: string
  createdAt: string
  updatedAt: string
}

export interface WarrantyRecord {
  warrantyRecordId: string
  tenantId: string
  startDate: string | null
  endDate: string | null
  status: WarrantyStatus
  predecessorWarrantyId?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProjectSystemLink {
  id: string
  projectId: string
  systemId: string
  allocatedAt: string
}

export interface ProjectTenantLink {
  id: string
  projectId: string
  tenantId: string
}

/** Root shape persisted to localStorage */
export interface AppDataState {
  version: number
  salesManagers: SalesManager[]
  accounts: Account[]
  opportunities: Opportunity[]
  projects: Project[]
  productionSystemInventory: ProductionSystemInventoryItem[]
  reusedInternalSystems: ReusedInternalSystem[]
  systems: System[]
  tenants: Tenant[]
  warrantyRecords: WarrantyRecord[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  idCounters: IdCounters
  lastPersistedAt: string | null
}
