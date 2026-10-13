import { CalendarDays, Table2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type TableCalendarViewMode = 'table' | 'calendar'

interface TableCalendarViewToggleProps {
  value: TableCalendarViewMode
  onChange: (value: TableCalendarViewMode) => void
}

const toggleOptions: Array<{ value: TableCalendarViewMode; label: string; Icon: LucideIcon }> = [
  { value: 'table', label: 'Table view', Icon: Table2 },
  { value: 'calendar', label: 'Calendar view', Icon: CalendarDays },
]

export function TableCalendarViewToggle({ value, onChange }: TableCalendarViewToggleProps) {
  return (
    <div className="inline-flex items-center gap-1" role="group" aria-label="Table or calendar view">
      {toggleOptions.map(({ value: optionValue, label, Icon }) => {
        const active = value === optionValue
        return (
          <button
            key={optionValue}
            type="button"
            className={active
              ? 'inline-flex h-7 w-7 items-center justify-center rounded border border-sf-brand bg-sf-brand text-white'
              : 'inline-flex h-7 w-7 items-center justify-center rounded border border-sf-border bg-white text-sf-text hover:bg-sf-surface-alt'}
            aria-label={label}
            title={label}
            aria-pressed={active}
            onClick={() => onChange(optionValue)}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
