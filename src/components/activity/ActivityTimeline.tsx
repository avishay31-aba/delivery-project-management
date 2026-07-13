import { useMemo, useState } from 'react'
import { formatDateTimeSeconds } from '@/domain/date-time-presentation'
import { activityEventCategoryLabel, type ActivityEvent } from '@/domain/activity-log'

type ActivitySortKey = 'activityId' | 'creationDate' | 'user' | 'eventCategory' | 'description'
type SortDirection = 'asc' | 'desc'

interface ActivityRow {
  activityId: string
  creationDate: string
  creationDateSort: string
  user: string
  eventCategory: string
  description: string
}

const ACTIVITY_COLUMNS: Array<{ key: ActivitySortKey; label: string }> = [
  { key: 'activityId', label: 'Activity ID' },
  { key: 'creationDate', label: 'Creation Date' },
  { key: 'user', label: 'User' },
  { key: 'eventCategory', label: 'Event Category' },
  { key: 'description', label: 'Description' },
]

function activityRows(events: ActivityEvent[]): ActivityRow[] {
  return events.map((event) => ({
    activityId: event.id,
    creationDate: formatDateTimeSeconds(event.occurredAt, { fallback: '' }),
    creationDateSort: event.occurredAt,
    user: event.actorName,
    eventCategory: activityEventCategoryLabel(event),
    description: event.summary,
  }))
}

function compareRows(first: ActivityRow, second: ActivityRow, sortKey: ActivitySortKey, direction: SortDirection): number {
  const multiplier = direction === 'asc' ? 1 : -1
  if (sortKey === 'creationDate') {
    return first.creationDateSort.localeCompare(second.creationDateSort) * multiplier
  }
  return first[sortKey].localeCompare(second[sortKey], undefined, { numeric: true }) * multiplier
}

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

export function ActivityTimeline({
  events,
  emptyText = 'No activity has been recorded.',
}: {
  events: ActivityEvent[]
  emptyText?: string
  showCategoryFilter?: boolean
}) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ActivitySortKey>('creationDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const rows = useMemo(() => activityRows(events), [events])
  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase()
    return rows
      .filter((row) => {
        if (!normalizedSearch) return true
        return [row.activityId, row.creationDate, row.user, row.eventCategory, row.description].some((value) =>
          value.toLocaleLowerCase().includes(normalizedSearch),
        )
      })
      .sort((first, second) => compareRows(first, second, sortKey, sortDirection))
  }, [rows, search, sortDirection, sortKey])

  function toggleSort(nextSortKey: ActivitySortKey) {
    if (nextSortKey === sortKey) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextSortKey)
    setSortDirection(nextSortKey === 'creationDate' ? 'desc' : 'asc')
  }

  function exportCsv() {
    const header = ACTIVITY_COLUMNS.map((column) => column.label).join(',')
    const lines = filteredRows.map((row) =>
      [row.activityId, row.creationDate, row.user, row.eventCategory, row.description].map(csvValue).join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'activity-log.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="relative">
          <input
            aria-label="Search Activity Log"
            className="h-8 w-72 rounded border border-sf-border px-2 py-1 pr-7 text-sm"
            placeholder="Search / Filter"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search ? (
            <button
              type="button"
              className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-sf-text-muted hover:bg-sf-surface-alt hover:text-sf-text"
              aria-label="Clear activity search"
              onClick={() => setSearch('')}
            >
              x
            </button>
          ) : null}
        </div>
        <button type="button" className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="sf-scroll-x rounded border border-sf-border bg-white">
        <table className="w-max min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {ACTIVITY_COLUMNS.map((column) => (
                <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => toggleSort(column.key)}
                  >
                    {column.label}
                    {sortKey === column.key ? <span aria-hidden="true">{sortDirection === 'asc' ? '^' : 'v'}</span> : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.activityId} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.activityId}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.creationDate}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.user}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.eventCategory}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.description}</td>
              </tr>
            ))}
            {filteredRows.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={ACTIVITY_COLUMNS.length}>
                  {emptyText}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
