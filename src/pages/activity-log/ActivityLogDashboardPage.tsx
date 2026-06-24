import { useMemo } from 'react'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import {
  activityDashboardRows,
  createActivityLogColumns,
} from '@/config/activity-log-columns'
import {
  activityEventsByDateRange,
  activityLogSummary,
} from '@/domain/activity-log'
import { useAppStore } from '@/store/useAppStore'

function startOfTodayIso(today = new Date()): string {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
}

function startOfWeekIso(today = new Date()): string {
  const dayOfWeek = today.getDay()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek)
  return start.toISOString()
}

function kpiCard(label: string, value: number) {
  return (
    <div className="rounded border border-sf-border bg-white p-3">
      <div className="text-xs font-semibold uppercase text-sf-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-sf-text">{value}</div>
    </div>
  )
}

export function ActivityLogDashboardPage() {
  const activityEvents = useAppStore((state) => state.activityEvents)
  const rows = useMemo(() => activityDashboardRows(activityEvents), [activityEvents])
  const summary = useMemo(() => activityLogSummary(activityEvents), [activityEvents])
  const todayCount = useMemo(() => activityEventsByDateRange(activityEvents, startOfTodayIso()).length, [activityEvents])
  const thisWeekCount = useMemo(() => activityEventsByDateRange(activityEvents, startOfWeekIso()).length, [activityEvents])
  const columns = useMemo(() => createActivityLogColumns(), [])

  return (
    <div className="space-y-4">
      <PageHeader title="Activity Log" subtitle="Read-only operational activity across customers, projects, systems, tenants, and allocations" />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
        {kpiCard('Total Events', summary.totalEvents)}
        {kpiCard('Today', todayCount)}
        {kpiCard('This Week', thisWeekCount)}
        {kpiCard('Warnings', summary.warning)}
        {kpiCard('Danger', summary.danger)}
        {kpiCard('Project Events', summary.byCategory.PROJECT)}
        {kpiCard('Allocation Events', summary.byCategory.ALLOCATION)}
        {kpiCard('Tenant Events', summary.byCategory.TENANT)}
        {kpiCard('System Events', summary.byCategory.SYSTEM)}
      </section>

      <DataDashboard
        title="Activity Log"
        dashboardScope="activityLog"
        rows={rows}
        columns={columns}
        enableInlineEditing={false}
      />
    </div>
  )
}
