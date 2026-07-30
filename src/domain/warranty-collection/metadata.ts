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
  initialWarrantyDate: 'Initial Warranty',
  relatedProjectId: 'Related Project ID',
  startDate: 'Start Date',
  endDate: 'End Date',
  status: 'Warranty Status',
} as const

export type WarrantyObjectContext = 'infrastructure' | 'tenant'
export type WarrantyFieldKey = keyof typeof WARRANTY_FIELD_LABELS | 'remark'

export interface WarrantyObjectContextSchema {
  context: WarrantyObjectContext
  visibleFields: readonly WarrantyFieldKey[]
  requiredFields: readonly WarrantyFieldKey[]
}

export const WARRANTY_OBJECT_CONTEXT_SCHEMAS: Record<WarrantyObjectContext, WarrantyObjectContextSchema> = {
  infrastructure: {
    context: 'infrastructure',
    visibleFields: ['initialWarrantyDate', 'startDate', 'endDate', 'remark'],
    requiredFields: ['startDate', 'endDate'],
  },
  tenant: {
    context: 'tenant',
    visibleFields: ['relatedProjectId', 'startDate', 'endDate', 'remark'],
    requiredFields: ['relatedProjectId', 'startDate', 'endDate'],
  },
} as const

export function warrantyContextHasField(schema: WarrantyObjectContextSchema, field: WarrantyFieldKey): boolean {
  return schema.visibleFields.includes(field)
}

export function warrantyContextRequiresField(schema: WarrantyObjectContextSchema, field: WarrantyFieldKey): boolean {
  return schema.requiredFields.includes(field)
}

export const WARRANTY_PENDING_ALERT = 'Expiring soon'
export const WARRANTY_MANAGEABILITY_MESSAGE = 'Warranty can be managed only after the tenant is linked to a Project/Opportunity.'
export const WARRANTY_RELATED_PROJECT_REQUIRED_MESSAGE = 'Related Project ID is required.'
