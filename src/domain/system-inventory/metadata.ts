export const SYSTEM_SOURCE_PRODUCTION = 'Production'
export const SYSTEM_SOURCE_REUSED_INTERNAL = 'Reused Internal Systems'

export const SYSTEM_CLASS_CUSTOMER = 'CUSTOMER'
export const SYSTEM_CLASS_POC_DEMO_TRAINING = 'POC_DEMO_TRAINING'

export const SYSTEM_PURPOSE_CUSTOMER = 'CUSTOMER'
export const SYSTEM_PURPOSE_DELIVERY = 'Delivery'
export const SYSTEM_PURPOSE_POC = 'POC'
export const REUSED_INTERNAL_PURPOSE_AVAILABLE = 'Available'
export const REUSED_INTERNAL_PURPOSE_OBSOLETE = 'OBSOLETE'

export const SYSTEM_AVAILABILITY_AVAILABLE = 'AVAILABLE'
export const SYSTEM_AVAILABILITY_OCCUPIED = 'OCCUPIED'

export const REUSED_INTERNAL_STATUS_AVAILABLE = 'Available'
export const REUSED_INTERNAL_STATUS_OCCUPIED = 'Occupied'
export const REUSED_INTERNAL_STATUS_OBSOLETE = 'Obsolete'

export const SYSTEM_OPERATIONAL_STATUS_ON = 'On'
export const SYSTEM_OPERATIONAL_STATUS_OFF = 'Off'
export const SYSTEM_OPERATIONAL_STATUS_ACCESS_BLOCKED = 'Access blocked'
export const SYSTEM_OPERATIONAL_STATUS_SERVICE_BLOCKED = 'Service blocked'
export const SYSTEM_OPERATIONAL_STATUS_DELETED = 'Deleted'
export const SYSTEM_OPERATIONAL_STATUS_CANCELED = 'Canceled'

export const REUSED_PURPOSE_OPTIONS = [REUSED_INTERNAL_PURPOSE_AVAILABLE, 'POC', 'Demo', 'Training', 'Support', REUSED_INTERNAL_PURPOSE_OBSOLETE]
export const REUSED_STATUS_OPTIONS = [
  REUSED_INTERNAL_STATUS_AVAILABLE,
  REUSED_INTERNAL_STATUS_OCCUPIED,
  REUSED_INTERNAL_STATUS_OBSOLETE,
]
export const REUSED_OPERATIONAL_STATUS_OPTIONS = [
  SYSTEM_OPERATIONAL_STATUS_ON,
  SYSTEM_OPERATIONAL_STATUS_OFF,
  SYSTEM_OPERATIONAL_STATUS_ACCESS_BLOCKED,
  SYSTEM_OPERATIONAL_STATUS_SERVICE_BLOCKED,
  SYSTEM_OPERATIONAL_STATUS_DELETED,
]
export const PRODUCTION_OPERATIONAL_STATUS_OPTIONS = [
  ...REUSED_OPERATIONAL_STATUS_OPTIONS,
]

export type SystemInventorySource = typeof SYSTEM_SOURCE_PRODUCTION | typeof SYSTEM_SOURCE_REUSED_INTERNAL

export interface SystemInventoryHeaderField {
  key: string
  label: string
  editable: boolean
  source: string
  line: number
  inputType?: 'text' | 'date' | 'integer' | 'picklist' | 'readonly'
  options?: string[]
  required?: boolean
}

export interface SystemInventoryTab {
  id: string
  label: string
}

export interface SystemInventoryMetadata {
  source: SystemInventorySource
  sourceSheet: string
  titleLabel: string
  headerFields: SystemInventoryHeaderField[]
  tabs: SystemInventoryTab[]
}

export const SYSTEM_INVENTORY_TABS: SystemInventoryTab[] = [
  { id: 'tenant', label: 'Tenant' },
  { id: 'infrastructure', label: 'Platform' },
  { id: 'versionUpdate', label: 'Version update' },
  { id: 'linkedProjects', label: 'Linked Projects' },
  { id: 'usage', label: 'Usage' },
  { id: 'documents', label: 'Documents' },
]
