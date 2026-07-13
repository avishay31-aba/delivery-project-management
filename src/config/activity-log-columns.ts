import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { activityEventCategoryLabel, type ActivityEvent } from '@/domain/activity-log'
import { formatDateTimeSeconds } from '@/domain/date-time-presentation'

export interface ActivityDashboardRow {
  id: string
  activityId: string
  creationDate: string
  creationDateSort: string
  user: string
  eventCategory: string
  description: string
}

export function activityDashboardRows(events: ActivityEvent[]): ActivityDashboardRow[] {
  return events.map((event) => ({
    id: event.id,
    activityId: event.id,
    creationDate: formatDateTimeSeconds(event.occurredAt),
    creationDateSort: event.occurredAt,
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
      getValue: (row) => row.creationDateSort,
      render: (row) => row.creationDate,
    },
    { id: 'user', label: 'User', getValue: (row) => row.user },
    { id: 'eventCategory', label: 'Event Category', getValue: (row) => row.eventCategory },
    { id: 'description', label: 'Description', getValue: (row) => row.description },
  ]
}
