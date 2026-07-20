import { useMemo } from 'react'
import { ActivityTimeline } from '@/components/activity'
import { PageHeader } from '@/components/record'
import { activityLogDashboardSummary } from '@/domain/activity-log'
import { useAppStore } from '@/store/useAppStore'

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
  const summary = useMemo(() => activityLogDashboardSummary(activityEvents), [activityEvents])

  return (
    <div className="space-y-4">
      <PageHeader title="Activity / Audit Log" subtitle="Read-only operational activity across customers, projects, systems, tenants, and allocations" />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
        {kpiCard('Total Events', summary.totalEvents)}
        {kpiCard('Today', summary.today)}
        {kpiCard('This Week', summary.thisWeek)}
        {kpiCard('Warnings', summary.warnings)}
        {kpiCard('Danger', summary.danger)}
        {kpiCard('Project Events', summary.projectEvents)}
        {kpiCard('Allocation Events', summary.allocationEvents)}
        {kpiCard('Tenant Events', summary.tenantEvents)}
        {kpiCard('System Events', summary.systemEvents)}
      </section>

      <ActivityTimeline events={activityEvents} emptyText="No activity has been recorded across the ERP." />
    </div>
  )
}
