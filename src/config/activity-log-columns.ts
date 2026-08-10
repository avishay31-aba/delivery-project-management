import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { activityEventCategoryLabel, type ActivityEvent } from '@/domain/activity-log'

export interface ActivityDashboardRow {
  id: string
  activityId: string
  timestamp: string
  user: string
  eventCategory: string
  eventType: string
  businessObject: string
  businessObjectId: string
  description: string
  source: string
  correlationId: string
}

export function activityDashboardRows(events: ActivityEvent[]): ActivityDashboardRow[] {
  return events.map((event) => ({
    id: event.id,
    activityId: event.id,
    timestamp: event.occurredAt,
    user: event.actorName,
    eventCategory: activityEventCategoryLabel(event),
    eventType: event.eventType,
    businessObject: event.primaryObject.objectType,
    businessObjectId: event.primaryObject.businessId || event.primaryObject.id,
    description: event.summary,
    source: event.source,
    correlationId: event.correlationId ?? '',
  }))
}

export function createActivityLogColumns(): DashboardColumn<ActivityDashboardRow>[] {
  return [
    { id: 'activityId', label: 'Activity ID', getValue: (row) => row.activityId },
    {
      id: 'timestamp',
      label: 'Timestamp',
      getValue: (row) => row.timestamp,
      semanticType: 'datetime',
    },
    { id: 'user', label: 'User', getValue: (row) => row.user },
    { id: 'eventCategory', label: 'Event Category', getValue: (row) => row.eventCategory },
    { id: 'eventType', label: 'Event Type', getValue: (row) => row.eventType },
    { id: 'businessObject', label: 'Business Object', getValue: (row) => row.businessObject },
    { id: 'businessObjectId', label: 'Business Object ID', getValue: (row) => row.businessObjectId },
    { id: 'description', label: 'Description', getValue: (row) => row.description },
    { id: 'source', label: 'Source', getValue: (row) => row.source },
  ]
}
