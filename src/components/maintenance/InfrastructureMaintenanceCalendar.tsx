import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { MaintenanceStatusPresentation, TaskStatusPresentation } from '@/components/ui'
import type { InfrastructureMaintenanceDashboardRow } from '@/domain/infrastructure-item'

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

function monthLabel(value: Date): string {
  return value.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

function eventTouchesDay(row: InfrastructureMaintenanceDashboardRow, day: Date): boolean {
  const start = parseDate(row.startDate)
  const due = parseDate(row.dueDate) ?? start
  if (!start || !due) return false
  const current = dateKey(day)
  return current >= dateKey(start) && current <= dateKey(due)
}

export function InfrastructureMaintenanceCalendar({ rows, onOpenTask }: InfrastructureMaintenanceCalendarProps) {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const days = useMemo(() => {
    const firstDay = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
    const gridStart = new Date(firstDay)
    gridStart.setDate(firstDay.getDate() - firstDay.getDay())
    return Array.from({ length: 42 }, (_value, index) => {
      const day = new Date(gridStart)
      day.setDate(gridStart.getDate() + index)
      return day
    })
  }, [visibleMonth])

  function moveMonth(offset: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function goToday() {
    const now = new Date()
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  return (
    <div className="flex min-h-full flex-col bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sf-border px-3 py-2">
        <div className="text-sm font-semibold text-sf-text">{monthLabel(visibleMonth)}</div>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded border border-sf-border px-2 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => moveMonth(-1)} aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <button type="button" className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={goToday}>Today</button>
          <button type="button" className="rounded border border-sf-border px-2 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => moveMonth(1)} aria-label="Next month">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-sf-border bg-sf-surface-alt text-xs font-semibold uppercase text-sf-text-muted">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="px-2 py-1">{day}</div>)}
      </div>
      <div className="grid flex-1 grid-cols-7 auto-rows-[minmax(7rem,1fr)]">
        {days.map((day) => {
          const dayRows = rows.filter((row) => eventTouchesDay(row, day))
          const isCurrentMonth = day.getMonth() === visibleMonth.getMonth()
          return (
            <div key={dateKey(day)} className={['min-w-0 border-b border-r border-sf-border p-1.5', isCurrentMonth ? 'bg-white' : 'bg-sf-surface-alt/50'].join(' ')}>
              <div className="mb-1 text-xs font-semibold text-sf-text-muted">{day.getDate()}</div>
              <div className="space-y-1">
                {dayRows.slice(0, 4).map((row) => (
                  <button
                    key={`${row.id}-${dateKey(day)}`}
                    type="button"
                    className="block w-full rounded border border-orange-200 bg-orange-50 px-1.5 py-1 text-left text-xs text-sf-text hover:border-orange-300 hover:bg-orange-100"
                    title={[
                      `Task ID: ${row.taskId}`,
                      `Task Type: ${row.taskType || '-'}`,
                      `Description: ${row.description || '-'}`,
                      `Infrastructure Item ID: ${row.infrastructureItemId}`,
                      `Start Date: ${row.startDate || '-'}`,
                      `Due Date: ${row.dueDate || '-'}`,
                      `Location: ${row.location || '-'}`,
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
                    <span className="block truncate">{row.taskType || '-'}</span>
                    <span className="block truncate text-sf-text-muted">{row.description || '-'}</span>
                  </button>
                ))}
                {dayRows.length > 4 ? <div className="text-xs text-sf-text-muted">+{dayRows.length - 4} more</div> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
