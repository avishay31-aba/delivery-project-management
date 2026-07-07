import type { ActivityEvent } from '@/domain/activity-log'

/** Core enums and entity types for mock data (Phase A — no business logic). */

export type ProjectMainType = 'POC' | 'DELIVERY' | 'RENEWAL'
export type ProjectSubType = 'NONE' | 'NEW' | 'UPSELL' | 'STANDARD' | 'DOWN_SELL'
export type ProgressStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED'
export type AccountCustomerType = 'NEW_CUSTOMER' | 'VETERAN_CUSTOMER'
export type OpportunityType = ProjectMainType
export type OpportunitySubType = ProjectSubType | 'FREE' | 'PAID'
export type OpportunityStage = 'OPEN' | 'POC' | 'WON'
export type OpportunityFinancialProfile = 'FREE' | 'PAID'
export type OpportunityDealPackage = 'Silver' | 'Gold' | 'Platinum'
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
export type AllocationStatus = 'ALLOCATED' | 'DEALLOCATED'
export type AllocationType = 'PRODUCTION' | 'REUSED_INTERNAL' | 'EXISTING_SYSTEM'
export type TenantFormType = 'POC' | 'CUSTOMER' | 'INTERNAL'

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
  | 'OUT_OF_CONTRACT'
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
  pocStartDate?: string | null
  pocEndDate?: string | null
  progressStatus: ProgressStatus
  dealOwner: string
  opportunityName: string
  canceledAt: string | null
  archivedAt?: string | null
  deletionReason?: string
  projectComments?: string
  milestoneTemplateId?: string
  milestones?: ProjectMilestone[]
  tasks?: ProjectTask[]
  documents?: DocumentRecord[]
  createdAt: string
  updatedAt: string
}

export interface ProjectMilestone {
  id: string
  name: string
  order: number
  status: ProgressStatus
  deadline?: string | null
  comment?: string
}

export interface ProjectTask {
  id: string
  milestoneId: string
  name: string
  department: string
  resource: string
  status: Exclude<ProgressStatus, 'IN_PROGRESS' | 'ARCHIVED'>
  order: number
  deadline?: string | null
  comment?: string
}

export type RemarkType = 'Note' | 'Task' | 'Temporary Change' | 'Permanent Change / Task' | string

export interface RemarkRecord {
  id: string
  remarkId: string
  createdAt: string
  author: string
  type: RemarkType
  content: string
  dueDate: string | null
  updatedAt?: string
  updatedBy?: string
}

export interface OwnerRecord {
  id: string
  userId: string
  userName: string
  fullName: string
  title: string
  company: string
  phoneNumber: string
  email: string
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
  financialProfile?: OpportunityFinancialProfile
  dealPackage?: OpportunityDealPackage
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
  salesComments?: string
  engagementCircles?: EngagementCircleContact[]
  newTenantRequirements: NewTenantRequirement[]
  changeRequestRequirements: ChangeRequestRequirement[]
  standardRenewalRequirements: StandardRenewalRequirement[]
  pocProjectIds: string[]
  finalProjectId: string | null
  wonAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface EngagementCircleContact {
  id: string
  subject: string
  role: string
  userName: string
  email: string
  phone?: string
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
  remarks?: RemarkRecord[]
  owners?: OwnerRecord[]
  configurationHistory?: ConfigurationHistoryRecord[]
  documents?: DocumentRecord[]
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
  tenantFormType?: TenantFormType
  hostedSystemId?: string
  hostingSid?: string
  sourceRequirementId?: string
  configuration?: TenantConfiguration
  hostingSnapshot?: TenantHostingSnapshot
  engagementCircle?: EngagementCircleContact[]
  remarks?: RemarkRecord[]
  configurationHistory?: TenantConfigurationHistoryRecord[]
  warranties?: TenantWarranty[]
  documents?: DocumentRecord[]
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

export interface TenantConfiguration {
  product: string
  licenses: number | null
  users: number | null
  concurrentSearches: number | null
  dailySearches: number | null
  monthlySearches: number | null
  concurrentAnalyses: number | null
  dailyAnalyses: number | null
  monthlyAnalyses: number | null
  topicAnalyses: number | null
  standardMonitors: number | null
  fullMonitors: number | null
  topicMonitors: number | null
  mapCenter: string
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
}

export interface TenantHostingSnapshot {
  currentSystem: boolean
  sid: string
  operationalStatus: string
  machineNumber: string
  versionNumber: string
  hostingType: string
  url: string
  performanceTier: 'STANDARD' | 'POWERED' | ''
  vpnEnabled: YesNo
  vpnType: string
  ipRestrictionEnabled: YesNo
  platform: string
  csp: string
  awsRegion: string
  azureRegion: string
}

export interface TenantRemark {
  id: string
  recordId: string
  timestamp: string
  author: string
  type: string
  content: string
  dueDate: string | null
  eventCreated: boolean
}

export interface TenantConfigurationHistoryRecord {
  id: string
  recordId: string
  timestamp: string
  tid?: string
  recordedBy: string
  configuration: TenantConfiguration
}

export interface ConfigurationHistoryRecord {
  id: string
  recordId: string
  timestamp: string
  tid?: string
  recordedBy: string
  configuration: TenantConfiguration
}

export interface ReusedInternalPurposeHistoryRecord {
  id: string
  recordId: string
  startDate: string
  endDate: string | null
  purposeType: string
  pid?: string
  sid?: string
  projectName?: string
  accountName?: string
  product?: string
  projectStatus?: string
}

export interface TenantWarranty {
  id: string
  warrantyId: string
  firstWarranty: boolean
  predecessor: string
  successor: string
  accountId: string
  relatedProjectId: string
  warrantyType: string
  opportunityId: string
  startDate: string | null
  endDate: string | null
  durationDays: number | null
  daysBeforeExpiration: number | null
  warrantyStatus: WarrantyStatus
  noWarranty?: YesNo
  outOfContract?: YesNo
  alerts: string
  remark: string
}

export interface DocumentRecord {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  uploadedAt: string
  replacedAt?: string
  objectUrl?: string
}

export type TenantDocument = DocumentRecord

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
  documents?: DocumentRecord[]
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
  remarks?: RemarkRecord[]
  owners?: OwnerRecord[]
  configurationHistory?: ConfigurationHistoryRecord[]
  createdAt: string
  updatedAt: string
}

export interface ReusedInternalSystem {
  id: string
  machineId: string
  source: 'Reused Internal Systems'
  purpose: 'Available' | 'POC' | 'Demo' | 'Training' | 'Support'
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
  purposeHistory?: ReusedInternalPurposeHistoryRecord[]
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
  remarks?: RemarkRecord[]
  owners?: OwnerRecord[]
  configurationHistory?: ConfigurationHistoryRecord[]
  documents?: DocumentRecord[]
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
  tenantIds?: string[]
  allocationStatus?: AllocationStatus
  allocationType?: AllocationType
  sourceMachineId?: string | null
  allocatedAt: string
  deallocatedAt?: string | null
}

export interface ProjectTenantLink {
  id: string
  projectId: string
  tenantId: string
  systemId?: string
  allocationStatus?: AllocationStatus
  allocationType?: AllocationType
  allocatedAt?: string
  deallocatedAt?: string | null
}

/** Root shape persisted by the application storage adapter */
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
  activityEvents: ActivityEvent[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  idCounters: IdCounters
  lastPersistedAt: string | null
}
