import type { WarrantyStatus } from './types'

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  NOT_SET: 'Not Set Yet',
  PLANNED: 'Planned',
  VALID: 'Valid',
  PENDING: 'Pending Renewal',
  RENEWED: 'Renewed',
  EXPIRED: 'Expired',
  NO_WARRANTY: 'No Warranty',
  OUT_OF_CONTRACT: 'Out Of Contract',
  OBSOLETE: 'Obsolete',
}

export const WARRANTY_FIELD_LABELS = {
  id: 'ID',
  type: 'Type',
  subType: 'Sub Type',
  relatedProjectId: 'Related Project ID',
  status: 'Warranty Status',
} as const

export const WARRANTY_PENDING_ALERT = 'Expiring soon'
export const WARRANTY_MANAGEABILITY_MESSAGE = 'Warranty can be managed only after the tenant is linked to a Project/Opportunity.'
export const WARRANTY_RELATED_PROJECT_REQUIRED_MESSAGE = 'Related Project ID is required.'
