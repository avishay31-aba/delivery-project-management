export type ActivityEventCategory =
  | 'PROJECT'
  | 'OPPORTUNITY'
  | 'CUSTOMER'
  | 'WARRANTY'
  | 'REQUIREMENT'
  | 'TENANT'
  | 'SYSTEM'
  | 'ALLOCATION'
  | 'MILESTONE'
  | 'TASK'
  | 'REMARK'
  | 'CONFIGURATION'
  | 'PURPOSE_HISTORY'
  | 'OWNER'
  | 'SECURITY'
  | 'ADMINISTRATION'
  | 'DASHBOARD_VIEW'
  | 'DOCUMENT'
  | 'INFRASTRUCTURE'
  | 'OTHER'

export type ActivityEventSource = 'USER' | 'SYSTEM' | 'MIGRATION' | 'IMPORT'

export type ActivityEventSeverity = 'INFO' | 'SUCCESS' | 'WARNING' | 'DANGER'

export interface ActivityObjectRef {
  objectType: string
  id: string
  businessId: string
  displayLabel: string
  routePath?: string
}

export interface ActivityEvent {
  id: string
  technicalId?: string
  occurredAt: string
  actorId: string | null
  actorName: string
  source: ActivityEventSource
  eventType: string
  severity: ActivityEventSeverity
  category: ActivityEventCategory
  primaryObject: ActivityObjectRef
  relatedObjects: ActivityObjectRef[]
  summary: string
  details?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  correlationId?: string
  sequence?: number
  schemaVersion: number
}

export interface ActivityLogSummary {
  totalEvents: number
  info: number
  success: number
  warning: number
  danger: number
  byCategory: Record<ActivityEventCategory, number>
}

export interface ActivityLogDashboardSummary {
  totalEvents: number
  today: number
  thisWeek: number
  warnings: number
  danger: number
  projectEvents: number
  allocationEvents: number
  tenantEvents: number
  systemEvents: number
}

export type ActivityLogPageSize = 20 | 50 | 100 | 'all'

export type ActivityLogSortColumn =
  | 'activityId'
  | 'timestamp'
  | 'user'
  | 'eventCategory'
  | 'eventType'
  | 'businessObject'
  | 'businessObjectId'
  | 'description'
  | 'source'
  | 'correlationId'

export interface ActivityLogSortRule {
  column: ActivityLogSortColumn
  direction: 'asc' | 'desc'
}

export interface ActivityLogBrowseQuery {
  objectType?: string
  objectIdOrBusinessId?: string
  fromDate?: string
  toDate?: string
  search?: string
  sort?: ActivityLogSortRule | null
  pageNumber: number
  pageSize: ActivityLogPageSize
}

export interface ActivityLogBrowseResult {
  records: ActivityEvent[]
  totalMatchingRecords: number
  totalPages: number
  currentPage: number
  pageSize: ActivityLogPageSize
  firstRecordNumber: number
  lastRecordNumber: number
}
