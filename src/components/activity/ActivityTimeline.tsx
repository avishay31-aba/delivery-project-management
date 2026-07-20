import { useEffect, useMemo, useState } from 'react'
import {
  browseActivityLog,
  type ActivityEvent,
  type ActivityLogPageSize,
  type ActivityLogSortColumn,
  type ActivityLogSortRule,
} from '@/domain/activity-log'
import { activityDashboardRows, createActivityLogColumns } from '@/config/activity-log-columns'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'

const ACTIVITY_COLUMNS = createActivityLogColumns().map((column) => ({
  key: column.id as ActivityLogSortColumn,
  label: column.label,
}))

const ACTIVITY_PAGE_SIZE_OPTIONS: ActivityLogPageSize[] = [20, 50, 100, 'all']
const MAX_CUSTOM_RECORD_LIMIT = 10000

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function activityTimestampPresentation(value: string): string {
  return formatSemanticDateTimeValue(value, 'datetime', { fallback: '' })
}

function pageSizeLabel(pageSize: ActivityLogPageSize): string {
  return pageSize === 'all' ? 'All' : String(pageSize)
}

export function ActivityTimeline({
  events,
  emptyText = 'No activity has been recorded.',
}: {
  events: ActivityEvent[]
  emptyText?: string
  showCategoryFilter?: boolean
}) {
  useDateTimePresentationPreference()
  const [search, setSearch] = useState('')
  const [fromDateDraft, setFromDateDraft] = useState('')
  const [toDateDraft, setToDateDraft] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [pageSize, setPageSize] = useState<ActivityLogPageSize>(20)
  const [pageNumber, setPageNumber] = useState(1)
  const [customLimitDraft, setCustomLimitDraft] = useState('')
  const [latestRecordLimit, setLatestRecordLimit] = useState<number | null>(null)
  const [limitError, setLimitError] = useState('')
  const [sort, setSort] = useState<ActivityLogSortRule | null>(null)

  const result = useMemo(
    () =>
      browseActivityLog(events, {
        fromDate,
        toDate,
        search,
        sort,
        pageNumber,
        pageSize,
        latestRecordLimit,
      }),
    [events, fromDate, latestRecordLimit, pageNumber, pageSize, search, sort, toDate],
  )
  const rows = useMemo(() => activityDashboardRows(result.records), [result.records])
  const exportRows = useMemo(
    () =>
      activityDashboardRows(browseActivityLog(events, {
        fromDate,
        toDate,
        search,
        sort,
        pageNumber: 1,
        pageSize: 'all',
        latestRecordLimit,
      }).records),
    [events, fromDate, latestRecordLimit, search, sort, toDate],
  )

  useEffect(() => {
    if (result.currentPage !== pageNumber) setPageNumber(result.currentPage)
  }, [pageNumber, result.currentPage])

  useEffect(() => {
    if (fromDateDraft && toDateDraft && fromDateDraft > toDateDraft) {
      setDateError('From Date must not be later than To Date.')
    } else if (dateError) {
      setDateError('')
    }
  }, [dateError, fromDateDraft, toDateDraft])

  function resetToFirstPage() {
    setPageNumber(1)
  }

  function toggleSort(column: ActivityLogSortColumn) {
    setSort((current) => {
      if (!current || current.column !== column) return { column, direction: 'asc' }
      if (current.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
    resetToFirstPage()
  }

  function applyDateFilter() {
    if (fromDateDraft && toDateDraft && fromDateDraft > toDateDraft) {
      setDateError('From Date must not be later than To Date.')
      return
    }
    setDateError('')
    setFromDate(fromDateDraft)
    setToDate(toDateDraft)
    resetToFirstPage()
  }

  function clearDateFilter() {
    setDateError('')
    setFromDateDraft('')
    setToDateDraft('')
    setFromDate('')
    setToDate('')
    resetToFirstPage()
  }

  function applyCustomLimit() {
    const trimmed = customLimitDraft.trim()
    const parsed = Number(trimmed)
    if (!trimmed || !Number.isInteger(parsed) || parsed <= 0 || parsed > MAX_CUSTOM_RECORD_LIMIT) {
      setLimitError(`Enter a positive whole number up to ${MAX_CUSTOM_RECORD_LIMIT}.`)
      return
    }
    setLimitError('')
    setLatestRecordLimit(parsed)
    resetToFirstPage()
  }

  function clearCustomLimit() {
    setLimitError('')
    setCustomLimitDraft('')
    setLatestRecordLimit(null)
    resetToFirstPage()
  }

  function exportCsv() {
    const header = ACTIVITY_COLUMNS.map((column) => column.label).join(',')
    const lines = exportRows.map((row) =>
      [
        row.activityId,
        activityTimestampPresentation(row.timestamp),
        row.user,
        row.eventCategory,
        row.eventType,
        row.businessObject,
        row.businessObjectId,
        row.description,
        row.source,
        row.correlationId,
      ].map(csvValue).join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'activity-log.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const hasAnyActivity = events.length > 0
  const emptyMessage = hasAnyActivity ? 'No activity matches the current filters.' : emptyText
  const pageSummary = result.totalMatchingRecords > 0
    ? `Records ${result.firstRecordNumber}-${result.lastRecordNumber} of ${result.totalMatchingRecords}`
    : 'Records 0-0 of 0'

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="block text-sm font-medium text-sf-text">
            <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">Search</span>
            <input
              aria-label="Search Activity Log"
              className="h-8 w-72 rounded border border-sf-border px-2 py-1 text-sm"
              placeholder="Search Activity Log"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetToFirstPage()
              }}
            />
          </label>
          <label className="block text-sm font-medium text-sf-text">
            <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">From Date</span>
            <input
              aria-label="Activity From Date"
              className="h-8 rounded border border-sf-border px-2 py-1 text-sm"
              type="date"
              value={fromDateDraft}
              onChange={(event) => setFromDateDraft(event.target.value)}
              onInput={(event) => setFromDateDraft(event.currentTarget.value)}
            />
          </label>
          <label className="block text-sm font-medium text-sf-text">
            <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">To Date</span>
            <input
              aria-label="Activity To Date"
              className="h-8 rounded border border-sf-border px-2 py-1 text-sm"
              type="date"
              value={toDateDraft}
              onChange={(event) => setToDateDraft(event.target.value)}
              onInput={(event) => setToDateDraft(event.currentTarget.value)}
            />
          </label>
          <button type="button" className="h-8 rounded border border-sf-border px-3 text-sm hover:bg-sf-surface-alt" onClick={applyDateFilter}>
            Apply
          </button>
          <button type="button" className="h-8 rounded border border-sf-border px-3 text-sm hover:bg-sf-surface-alt" onClick={clearDateFilter}>
            Clear / All Dates
          </button>
        </div>
        <button type="button" className="h-8 rounded border border-sf-border px-3 text-sm hover:bg-sf-surface-alt" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <label className="block text-sm font-medium text-sf-text">
          <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">Records Per Page</span>
          <select
            aria-label="Activity records per page"
            className="h-8 rounded border border-sf-border px-2 py-1 text-sm"
            value={String(pageSize)}
            onChange={(event) => {
              const value = event.target.value === 'all' ? 'all' : Number(event.target.value) as ActivityLogPageSize
              setPageSize(value)
              resetToFirstPage()
            }}
          >
            {ACTIVITY_PAGE_SIZE_OPTIONS.map((value) => (
              <option key={value} value={String(value)}>{pageSizeLabel(value)}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-sf-text">
          <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">Latest Record Count</span>
          <input
            aria-label="Latest Activity record count"
            className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm"
            inputMode="numeric"
            placeholder="e.g. 25"
            value={customLimitDraft}
            onChange={(event) => setCustomLimitDraft(event.target.value)}
          />
        </label>
        <button type="button" className="h-8 rounded border border-sf-border px-3 text-sm hover:bg-sf-surface-alt" onClick={applyCustomLimit}>
          Apply Latest
        </button>
        <button type="button" className="h-8 rounded border border-sf-border px-3 text-sm hover:bg-sf-surface-alt" onClick={clearCustomLimit}>
          Clear Limit
        </button>
        {latestRecordLimit ? (
          <span className="pb-1 text-sm text-sf-text-muted">Showing latest {latestRecordLimit} matching records before pagination.</span>
        ) : null}
      </div>

      {dateError || limitError ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          {dateError || limitError}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-sf-border bg-white px-3 py-2 text-sm text-sf-text">
        <div>
          Page {result.currentPage} of {result.totalPages}
          <span className="ml-3 text-sf-text-muted">{pageSummary}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
            disabled={result.currentPage <= 1}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
            disabled={result.currentPage >= result.totalPages}
            onClick={() => setPageNumber((current) => Math.min(result.totalPages, current + 1))}
          >
            Next
          </button>
        </div>
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
                    {sort?.column === column.key && sort.direction === 'asc' ? '↑' : ''}
                    {sort?.column === column.key && sort.direction === 'desc' ? '↓' : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.activityId} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.activityId}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                  <DateTimeValue value={row.timestamp} semanticType="datetime" />
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.user}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.eventCategory}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.eventType}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.businessObject}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.businessObjectId}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.description}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.source}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.correlationId || '-'}</td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={ACTIVITY_COLUMNS.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
