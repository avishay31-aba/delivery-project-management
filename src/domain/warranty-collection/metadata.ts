import type { WarrantyStatus } from './types'

export const WARRANTY_STATUS_LABELS: Record<WarrantyStatus, string> = {
  NOT_SET: 'Not set yet',
  PLANNED: 'Planned',
  VALID: 'Valid',
  PENDING: 'Pending',
  RENEWED: 'Renewed',
  EXPIRED: 'Expired',
  NO_WARRANTY: 'No warranty',
  OUT_OF_CONTRACT: 'Out of contract',
  OBSOLETE: 'Obsolete',
}

export const WARRANTY_PENDING_ALERT = 'Expiring soon'
export const WARRANTY_MANAGEABILITY_MESSAGE = 'Warranty can be managed only after the tenant is linked to a Project/Opportunity.'
export const WARRANTY_RELATED_PROJECT_REQUIRED_MESSAGE = 'Related Project ID is required.'
