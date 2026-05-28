/** Core enums and entity types for mock data (Phase A — no business logic). */

export type ProjectMainType = 'POC' | 'DELIVERY' | 'RENEWAL'
export type ProjectSubType = 'NONE' | 'NEW' | 'UPSELL' | 'STANDARD' | 'DOWN_SELL'
export type ProgressStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE'

export type SystemClass = 'CUSTOMER' | 'POC_DEMO_TRAINING'
export type SystemPurpose =
  | 'AVAILABLE'
  | 'POC'
  | 'DEMO'
  | 'TRAINING'
  | 'SUPPORT'
  | 'CUSTOMER'
export type AvailabilityStatus = 'AVAILABLE' | 'OCCUPIED' | 'OBSOLETE'

export type TenantType = 'CUSTOMER' | 'POC' | 'PENLINK_INTERNAL'
export type IdCounterKey = 'pid' | 'sid' | 'tid' | 'mid'

export interface IdCounters {
  pid: number
  sid: number
  tid: number
  mid: number
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
  accountName: string
  mainType: ProjectMainType
  subType: ProjectSubType
  deliveryDate: string | null
  progressStatus: ProgressStatus
  dealOwner: string
  opportunityName: string
  canceledAt: string | null
  createdAt: string
  updatedAt: string
}

export interface System {
  id: string
  sid: string | null
  machineId: string | null
  systemClass: SystemClass
  purpose: SystemPurpose
  availability: AvailabilityStatus
  productType: string
  hostingType: string
  timeGroup: string
  operationalStatus: string
  createdAt: string
  updatedAt: string
}

export interface Tenant {
  id: string
  tid: string
  systemId: string
  tenantType: TenantType
  accountName: string
  country: string
  timeGroup: string
  operationalStatus: string
  productType: string
  warrantyStatus: WarrantyStatus
  warrantyEndDate: string | null
  pocStartDate: string | null
  pocEndDate: string | null
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
  projects: Project[]
  systems: System[]
  tenants: Tenant[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  idCounters: IdCounters
  lastPersistedAt: string | null
}