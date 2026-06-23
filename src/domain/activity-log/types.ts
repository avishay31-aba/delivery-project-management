export type ActivityEventCategory =
  | 'PROJECT'
  | 'CUSTOMER'
  | 'WARRANTY'
  | 'REQUIREMENT'
  | 'TENANT'
  | 'SYSTEM'
  | 'ALLOCATION'
  | 'MILESTONE'
  | 'DASHBOARD_VIEW'
  | 'DOCUMENT'

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
