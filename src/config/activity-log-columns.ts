import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { activityEventCategoryLabel, type ActivityEvent } from '@/domain/activity-log'

export interface ActivityDashboardRow {
  id: string
  activityId: string
  creationDate: string
  user: string
  eventCategory: string
  description: string
}

export function activityDashboardRows(events: ActivityEvent[]): ActivityDashboardRow[] {
  return events.map((event) => ({
    id: event.id,
    activityId: event.id,
    creationDate: event.occurredAt,
    user: event.actorName,
    eventCategory: activityEventCategoryLabel(event),
    description: event.summary,
  }))
}

export function createActivityLogColumns(): DashboardColumn<ActivityDashboardRow>[] {
  return [
    { id: 'activityId', label: 'Activity ID', getValue: (row) => row.activityId },
    {
      id: 'creationDate',
      label: 'Creation Date',
      getValue: (row) => row.creationDate,
      semanticType: 'datetime',
    },
    { id: 'user', label: 'User', getValue: (row) => row.user },
    { id: 'eventCategory', label: 'Event Category', getValue: (row) => row.eventCategory },
    { id: 'description', label: 'Description', getValue: (row) => row.description },
  ]
}
