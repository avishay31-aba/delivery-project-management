import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { ActivityEvent } from '@/domain/activity-log'
import { formatDateTimeSeconds } from '@/domain/date-time-presentation'

export interface ActivityDashboardRow {
  id: string
  activityId: string
  creationDate: string
  creationDateSort: string
  user: string
  description: string
}

export function activityDashboardRows(events: ActivityEvent[]): ActivityDashboardRow[] {
  return events.map((event) => ({
    id: event.id,
    activityId: event.id,
    creationDate: formatDateTimeSeconds(event.occurredAt),
    creationDateSort: event.occurredAt,
    user: event.actorName,
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
    { id: 'description', label: 'Description', getValue: (row) => row.description },
  ]
}
