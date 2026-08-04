import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MaintenanceStatusPresentation, TaskStatusPresentation } from '@/components/ui'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import type { InfrastructureMaintenanceDashboardRow } from '@/domain/infrastructure-item'

type CalendarMode = 'week' | 'month' | 'year'

interface InfrastructureMaintenanceCalendarProps {
  rows: InfrastructureMaintenanceDashboardRow[]
  onOpenTask: (row: InfrastructureMaintenanceDashboardRow) => void
}

function parseDate(value: string): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

function dateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function startOfWeek(value: Date): Date {
  const start = new Date(value)
  start.setDate(value.getDate() - value.getDay())
  return start
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(value: Date, months: number): Date {
  return new Date(value.getFullYear(), value.getMonth() + months, 1)
}

function periodLabel(value: Date, mode: CalendarMode): string {
  if (mode === 'week') {
    const weekStart = startOfWeek(value)
    const weekEnd = addDays(weekStart, 6)
    return `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  if (mode === 'year') return String(value.getFullYear())
  return value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function monthDays(value: Date): Date[] {
  const firstDay = new Date(value.getFullYear(), value.getMonth(), 1)
  const lastDay = new Date(value.getFullYear(), value.getMonth() + 1, 0)
  const gridStart = startOfWeek(firstDay)
  const gridEnd = addDays(startOfWeek(lastDay), 6)
  const days: Date[] = []
  let cursor = gridStart
  while (cursor <= gridEnd) {
    days.push(new Date(cursor))
    cursor = addDays(cursor, 1)
  }
  return days
}

function eventTouchesDay(row: InfrastructureMaintenanceDashboardRow, day: Date): boolean {
  const start = parseDate(row.startDate)
  const due = parseDate(row.dueDate) ?? start
  if (!start || !due) return false
  const current = dateKey(day)
  return current >= dateKey(start) && current <= dateKey(due)
}

function rowsForDay(rows: InfrastructureMaintenanceDashboardRow[], day: Date): InfrastructureMaintenanceDashboardRow[] {
  return rows.filter((row) => eventTouchesDay(row, day))
}

function eventClassName(status: string): string {
  if (status === 'Done') return 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100'
  if (status === 'In Progress') return 'border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100'
  return 'border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:bg-emerald-100'
}

function DayNumber({ day, todayKey }: { day: Date; todayKey: string }) {
  const isToday = dateKey(day) === todayKey
  return (
    <span className={isToday ? 'inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-sf-brand bg-sf-brand/10 px-1 font-bold text-sf-brand' : 'text-sf-text-muted'}>
      {day.getDate()}
    </span>
  )
}

function EventButton({ row, onOpenTask, compact = false }: { row: InfrastructureMaintenanceDashboardRow; onOpenTask: (row: InfrastructureMaintenanceDashboardRow) => void; compact?: boolean }) {
  return (
    <button
      type="button"
      className={['block w-full rounded border px-1.5 py-1 text-left text-xs text-sf-text', eventClassName(row.taskStatus)].join(' ')}
      title={[
        `Task ID: ${row.taskId}`,
        `Task Type: ${row.taskType || '-'}`,
        `Description: ${row.description || '-'}`,
        `Infrastructure Item ID: ${row.infrastructureItemId}`,
        `Start Date: ${formatSemanticDateTimeValue(row.startDate, 'date', { fallback: '-' })}`,
        `Due Date: ${formatSemanticDateTimeValue(row.dueDate, 'date', { fallback: '-' })}`,
        `Assigned Resource: ${row.assignedResource || '-'}`,
        `Task Status: ${row.taskStatus}`,
        `Alert: ${row.alert || '-'}`,
      ].join('\n')}
      onClick={() => onOpenTask(row)}
    >
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate font-semibold">{row.taskId}</span>
        <TaskStatusPresentation status={row.taskStatus} label="" />
        {row.alert ? <MaintenanceStatusPresentation status={row.alert} label="" /> : null}
      </span>
      {!compact ? <span className="block truncate">{row.taskType || '-'}</span> : null}
      {!compact ? <span className="block truncate text-sf-text-muted">{row.description || '-'}</span> : null}
    </button>
  )
}

function StatusDot({ status }: { status: string }) {
  const className = status === 'Done'
    ? 'bg-blue-500'
    : status === 'In Progress'
      ? 'bg-orange-500'
      : 'bg-emerald-500'
  return <span className={['inline-block h-1.5 w-1.5 rounded-full', className].join(' ')} />
}

export function InfrastructureMaintenanceCalendar({ rows, onOpenTask }: InfrastructureMaintenanceCalendarProps) {
  const [mode, setMode] = useState<CalendarMode>('month')
  const [visibleDate, setVisibleDate] = useState(() => new Date())
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null)
  const today = useMemo(() => new Date(), [])
  const todayKey = dateKey(today)

  function move(offset: number) {
    setSelectedDateKey(null)
    setVisibleDate((current) => {
      if (mode === 'week') return addDays(current, offset * 7)
      if (mode === 'year') return new Date(current.getFullYear() + offset, 0, 1)
      return addMonths(current, offset)
    })
  }

  function goToday() {
    setSelectedDateKey(null)
    setVisibleDate(new Date())
  }

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_value, index) => addDays(startOfWeek(visibleDate), index)), [visibleDate])
  const visibleMonthDays = useMemo(() => monthDays(visibleDate), [visibleDate])
  const selectedDateRows = selectedDateKey
    ? rows.filter((row) => {
        const day = parseDate(selectedDateKey)
        return day ? eventTouchesDay(row, day) : false
      })
    : []

  function renderModeToggle() {
    return (
      <div className="inline-flex rounded border border-sf-border bg-white p-0.5 text-sm">
        {(['week', 'month', 'year'] as CalendarMode[]).map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={mode === candidate ? 'rounded bg-sf-brand px-3 py-1 text-white' : 'rounded px-3 py-1 capitalize text-sf-text hover:bg-sf-surface-alt'}
            onClick={() => {
              setMode(candidate)
              setSelectedDateKey(null)
            }}
          >
            {candidate[0].toUpperCase()}{candidate.slice(1)}
          </button>
        ))}
      </div>
    )
  }

  function renderDayCell(day: Date, isCurrentMonth = true) {
    const dayRows = rowsForDay(rows, day)
    return (
      <div key={dateKey(day)} className={['min-h-0 min-w-0 border-b border-r border-sf-border p-1.5', isCurrentMonth ? 'bg-white' : 'bg-sf-surface-alt/50'].join(' ')}>
        <div className="mb-1 text-xs font-semibold">
          <DayNumber day={day} todayKey={todayKey} />
        </div>
        <div className="space-y-1">
          {dayRows.map((row) => <EventButton key={`${row.id}-${dateKey(day)}`} row={row} onOpenTask={onOpenTask} compact />)}
        </div>
      </div>
    )
  }

  function renderWeek() {
    return (
      <>
        <div className="grid grid-cols-7 border-b border-sf-border bg-sf-surface-alt text-xs font-semibold uppercase text-sf-text-muted">
          {weekDays.map((day) => <div key={dateKey(day)} className="px-2 py-1">{day.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>)}
        </div>
        <div className="grid min-h-[28rem] grid-cols-7">
          {weekDays.map((day) => renderDayCell(day))}
        </div>
      </>
    )
  }

  function renderMonth() {
    const rowCount = Math.ceil(visibleMonthDays.length / 7)
    return (
      <>
        <div className="grid grid-cols-7 border-b border-sf-border bg-sf-surface-alt text-xs font-semibold uppercase text-sf-text-muted">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="px-2 py-1">{day}</div>)}
        </div>
        <div className="grid grid-cols-7" style={{ gridTemplateRows: `repeat(${rowCount}, minmax(7.5rem, auto))` }}>
          {visibleMonthDays.map((day) => renderDayCell(day, day.getMonth() === visibleDate.getMonth()))}
        </div>
      </>
    )
  }

  function renderYear() {
    return (
      <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }, (_value, monthIndex) => {
          const monthDate = new Date(visibleDate.getFullYear(), monthIndex, 1)
          const miniDays = monthDays(monthDate)
          return (
            <section key={monthIndex} className="rounded border border-sf-border bg-white p-2">
              <h4 className="mb-1 text-sm font-semibold text-sf-text">{monthDate.toLocaleDateString(undefined, { month: 'long' })}</h4>
              <div className="grid grid-cols-7 text-center text-[0.65rem] font-semibold uppercase text-sf-text-muted">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <div key={`${day}-${index}`}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
                {miniDays.map((day) => {
                  const dayRows = rowsForDay(rows, day)
                  const currentMonth = day.getMonth() === monthIndex
                  return (
                    <button
                      key={dateKey(day)}
                      type="button"
                      className={['min-h-8 rounded px-0.5 py-0.5 text-sf-text hover:bg-sf-surface-alt', !currentMonth && 'text-sf-text-muted opacity-40', dateKey(day) === todayKey && 'ring-1 ring-sf-brand'].filter(Boolean).join(' ')}
                      title={dayRows.map((row) => `${row.taskId} - ${row.taskType}`).join('\n')}
                      onClick={() => dayRows.length > 0 ? setSelectedDateKey(dateKey(day)) : undefined}
                    >
                      <span>{day.getDate()}</span>
                      {dayRows.length > 0 ? (
                        <span className="mt-0.5 flex justify-center gap-0.5">
                          {dayRows.slice(0, 3).map((row) => <StatusDot key={`${row.id}-${dateKey(day)}`} status={row.taskStatus} />)}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b border-sf-border bg-white px-3 py-2">
        <div className="text-sm font-semibold text-sf-text">{periodLabel(visibleDate, mode)}</div>
        <div className="flex flex-wrap items-center gap-2">
          {renderModeToggle()}
          <button type="button" className="rounded border border-sf-border px-2 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => move(-1)} aria-label="Previous period">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={goToday}>Today</button>
          <button type="button" className="rounded border border-sf-border px-2 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => move(1)} aria-label="Next period">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {mode === 'week' ? renderWeek() : mode === 'year' ? renderYear() : renderMonth()}
      {selectedDateRows.length > 0 ? (
        <div className="border-t border-sf-border bg-sf-surface-alt p-2">
          <div className="mb-1 text-xs font-semibold uppercase text-sf-text-muted">{selectedDateKey}</div>
          <div className="flex flex-wrap gap-2">
            {selectedDateRows.map((row) => <div key={row.id} className="w-56"><EventButton row={row} onOpenTask={onOpenTask} /></div>)}
          </div>
        </div>
      ) : null}
    </div>
  )
}
