import { useMemo, useState } from 'react'
import { CheckCircle2, RotateCcw } from 'lucide-react'
import { DataDashboard, DashboardActionButton, TableCalendarViewToggle, type DashboardColorLegendItem, type DashboardColumn, type TableCalendarViewMode } from '@/components/dashboard'
import { PageHeader, WorkspaceFrame } from '@/components/record'
import { BusinessObjectLink } from '@/components/ui'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import { deriveReminderRows, type ReminderReadModelRow, type ReminderStatus } from '@/domain/reminders'
import { useAppStore } from '@/store/useAppStore'

const URGENCY_LEGEND: DashboardColorLegendItem[] = [
  { label: 'Past due', rowClassName: 'bg-red-50 hover:bg-red-100', swatchClassName: 'bg-red-50' },
  { label: 'Due within 30 days', rowClassName: 'bg-yellow-50 hover:bg-yellow-100', swatchClassName: 'bg-yellow-50' },
]

function sourceTypeLabel(row: ReminderReadModelRow): string {
  if (row.sourceType === 'PROJECT_TASK') return 'Project Task'
  if (row.sourceType === 'PROJECT_MILESTONE') return 'Project Milestone'
  if (row.sourceType === 'INFRASTRUCTURE_MAINTENANCE_TASK') return 'Maintenance Task'
  return 'Remark'
}

function urgencyRowClass(row: ReminderReadModelRow): string {
  if (row.status === 'EXECUTED') return 'bg-white hover:bg-sf-surface-alt'
  if (row.urgency === 'OVERDUE') return 'bg-red-50 hover:bg-red-100'
  if (row.urgency === 'DUE_SOON') return 'bg-yellow-50 hover:bg-yellow-100'
  return 'bg-white hover:bg-sf-surface-alt'
}

function useReminderColumns(): Array<DashboardColumn<ReminderReadModelRow>> {
  return useMemo<Array<DashboardColumn<ReminderReadModelRow>>>(() => [
    { id: 'source', label: 'Source', getValue: (row) => `${sourceTypeLabel(row)} ${row.sourceLabel}`, render: (row) => <span>{sourceTypeLabel(row)} {row.sourceLabel}</span>, cellClassName: 'min-w-48 whitespace-normal', cellContentClassName: 'whitespace-normal' },
    { id: 'parent', label: 'Parent Object', getValue: (row) => row.parentBusinessId, render: (row) => <BusinessObjectLink reference={row.parentReference} /> },
    { id: 'message', label: 'Message', getValue: (row) => row.message, cellClassName: 'min-w-96 whitespace-normal', cellContentClassName: 'whitespace-normal' },
    { id: 'dueDate', label: 'Due Date / Deadline', getValue: (row) => row.dueDate, render: (row) => formatSemanticDateTimeValue(row.dueDate, 'date'), semanticType: 'date' },
    { id: 'owner', label: 'Owner / Author', getValue: (row) => row.owner },
    { id: 'status', label: 'Status', getValue: (row) => row.status === 'EXECUTED' ? 'Executed' : 'Pending' },
    { id: 'executedAt', label: 'Executed At', getValue: (row) => row.executedAt ?? '', render: (row) => formatSemanticDateTimeValue(row.executedAt, 'datetime'), semanticType: 'datetime' },
    { id: 'executedBy', label: 'Executed By', getValue: (row) => row.executedBy ?? '' },
  ], [])
}

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

function startOfWeek(value: Date): Date {
  const next = new Date(value)
  next.setDate(value.getDate() - value.getDay())
  return next
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(value.getDate() + days)
  return next
}

function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1)
}

function monthDays(value: Date): Date[] {
  const first = new Date(value.getFullYear(), value.getMonth(), 1)
  const last = new Date(value.getFullYear(), value.getMonth() + 1, 0)
  const start = startOfWeek(first)
  const end = addDays(startOfWeek(last), 6)
  const days: Date[] = []
  let cursor = start
  while (cursor <= end) {
    days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

function ReminderCalendar({ rows }: { rows: ReminderReadModelRow[] }) {
  const [visibleDate, setVisibleDate] = useState(() => new Date())
  const days = useMemo(() => monthDays(visibleDate), [visibleDate])
  const todayKey = dateKey(new Date())
  const rowsByDate = useMemo(() => {
    const byDate = new Map<string, ReminderReadModelRow[]>()
    rows.forEach((row) => byDate.set(row.dueDate, [...(byDate.get(row.dueDate) ?? []), row]))
    return byDate
  }, [rows])

  return (
      <div className="flex min-h-0 flex-col overflow-hidden bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sf-border px-3 py-2">
          <div className="text-sm font-semibold text-sf-text">{visibleDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
          <div className="flex items-center gap-2">
            <button type="button" className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => setVisibleDate((current) => addMonths(current, -1))}>Previous</button>
            <button type="button" className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => setVisibleDate(new Date())}>Today</button>
            <button type="button" className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => setVisibleDate((current) => addMonths(current, 1))}>Next</button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-sf-border bg-sf-surface-alt text-xs font-semibold uppercase text-sf-text-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="px-2 py-1">{day}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${Math.ceil(days.length / 7)}, minmax(7.5rem, auto))` }}>
          {days.map((day) => {
            const key = dateKey(day)
            const dayRows = rowsByDate.get(key) ?? []
            const isCurrentMonth = day.getMonth() === visibleDate.getMonth()
            return (
              <div key={key} className={['min-w-0 border-b border-r border-sf-border p-1.5', isCurrentMonth ? 'bg-white' : 'bg-sf-surface-alt/50'].join(' ')}>
                <div className={key === todayKey ? 'mb-1 inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-sf-brand bg-sf-brand/10 px-1 text-xs font-bold text-sf-brand' : 'mb-1 text-xs font-semibold text-sf-text-muted'}>{day.getDate()}</div>
                <div className="space-y-1">
                  {dayRows.map((row) => (
                    <div key={row.id} className={['rounded border px-1.5 py-1 text-xs', row.status === 'EXECUTED' ? 'border-blue-200 bg-blue-50' : row.urgency === 'OVERDUE' ? 'border-red-200 bg-red-50' : row.urgency === 'DUE_SOON' ? 'border-yellow-200 bg-yellow-50' : 'border-emerald-200 bg-emerald-50'].join(' ')}>
                      <div className="truncate font-semibold">{row.sourceLabel}</div>
                      <div className="truncate text-sf-text-muted">{row.parentBusinessId}</div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
  )
}

export function RemindersPage() {
  const state = useAppStore()
  const executeReminder = useAppStore((store) => store.executeReminder)
  const restoreReminder = useAppStore((store) => store.restoreReminder)
  const [status, setStatus] = useState<ReminderStatus>('PENDING')
  const [viewMode, setViewMode] = useState<TableCalendarViewMode>('table')
  const columns = useReminderColumns()
  const rows = useMemo(() => deriveReminderRows(state).filter((row) => row.status === status), [state, status])

  return (
    <WorkspaceFrame className="gap-4">
      <PageHeader title="Reminders" subtitle="Due-date reminders derived from remarks and tasks" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded border border-sf-border bg-white p-0.5 text-sm">
          {(['PENDING', 'EXECUTED'] as ReminderStatus[]).map((candidate) => (
            <button key={candidate} type="button" className={status === candidate ? 'rounded bg-sf-brand px-3 py-1 text-white' : 'rounded px-3 py-1 text-sf-text hover:bg-sf-surface-alt'} onClick={() => setStatus(candidate)}>
              {candidate === 'PENDING' ? 'Pending' : 'Executed'}
            </button>
          ))}
        </div>
      </div>
      <DataDashboard
        title={status === 'PENDING' ? 'Pending Reminders' : 'Executed Reminders'}
        dashboardScope="reminders"
        rows={rows}
        columns={columns}
        enableRecordActions
        showDefaultRecordActions={false}
        getRowClassName={urgencyRowClass}
        colorLegend={status === 'PENDING' ? URGENCY_LEGEND : []}
        initialSorting={[{ id: 'dueDate', desc: false }]}
        contentModeControls={<TableCalendarViewToggle value={viewMode} onChange={setViewMode} />}
        renderAlternateContent={viewMode === 'calendar' ? (filteredRows) => <ReminderCalendar rows={filteredRows} /> : undefined}
        renderRecordActions={(row) => (
          row.status === 'PENDING'
            ? <DashboardActionButton icon={<CheckCircle2 className="h-4 w-4" aria-hidden="true" />} label="Execute" onClick={() => executeReminder(row.sourceKey)} />
            : <DashboardActionButton icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />} label="Restore to Pending" onClick={() => restoreReminder(row.sourceKey)} />
        )}
      />
    </WorkspaceFrame>
  )
}
