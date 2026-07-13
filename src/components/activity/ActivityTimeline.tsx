import { useMemo } from 'react'
import { DataDashboard } from '@/components/dashboard'
import {
  activityDashboardRows,
  createActivityLogColumns,
} from '@/config/activity-log-columns'
import type { ActivityEvent } from '@/domain/activity-log'

export function ActivityTimeline({
  events,
}: {
  events: ActivityEvent[]
  emptyText?: string
  showCategoryFilter?: boolean
}) {
  const rows = useMemo(() => activityDashboardRows(events), [events])
  const columns = useMemo(() => createActivityLogColumns(), [])

  return (
    <DataDashboard
      title="Activity Log"
      dashboardScope="activityLog"
      rows={rows}
      columns={columns}
      enableInlineEditing={false}
      enableRecordActions={false}
      initialSorting={[{ id: 'creationDate', desc: true }]}
    />
  )
}
