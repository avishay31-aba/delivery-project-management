import { useMemo, useState } from 'react'
import {
  activityEventCategoryLabel,
  activityEventsByDateRange,
  type ActivityEvent,
} from '@/domain/activity-log'
import { createActivityLogColumns } from '@/config/activity-log-columns'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { RecordHistorySection, type RecordHistoryColumn } from '@/components/ui'

const ACTIVITY_COLUMNS = createActivityLogColumns()

function csvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function activityTimestampPresentation(value: string): string {
  return formatSemanticDateTimeValue(value, 'datetime', { fallback: '' })
}

function defaultActivitySort(first: ActivityEvent, second: ActivityEvent): number {
  const timestampComparison = second.occurredAt.localeCompare(first.occurredAt)
  if (timestampComparison !== 0) return timestampComparison
  return second.id.localeCompare(first.id, undefined, { numeric: true, sensitivity: 'base' })
}

function activityBusinessObject(event: ActivityEvent): string {
  return event.primaryObject.objectType
}

function activityBusinessObjectId(event: ActivityEvent): string {
  return event.primaryObject.businessId || event.primaryObject.id
}

function activitySearchText(event: ActivityEvent): string {
  return [
    event.id,
    activityTimestampPresentation(event.occurredAt),
    event.actorName,
    activityEventCategoryLabel(event),
    event.eventType,
    activityBusinessObject(event),
    activityBusinessObjectId(event),
    event.summary,
    event.source,
  ].join(' ').toLocaleLowerCase()
}

const ACTIVITY_HISTORY_COLUMNS: Array<RecordHistoryColumn<ActivityEvent>> = ACTIVITY_COLUMNS.map((column) => {
  if (column.id === 'activityId') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => event.id,
      sortValue: (event) => event.id,
    }
  }
  if (column.id === 'timestamp') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => <DateTimeValue value={event.occurredAt} semanticType="datetime" />,
      sortValue: (event) => event.occurredAt,
    }
  }
  if (column.id === 'user') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => event.actorName,
      sortValue: (event) => event.actorName,
    }
  }
  if (column.id === 'eventCategory') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => activityEventCategoryLabel(event),
      sortValue: (event) => activityEventCategoryLabel(event),
    }
  }
  if (column.id === 'eventType') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => event.eventType,
      sortValue: (event) => event.eventType,
    }
  }
  if (column.id === 'businessObject') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => activityBusinessObject(event),
      sortValue: (event) => activityBusinessObject(event),
    }
  }
  if (column.id === 'businessObjectId') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => activityBusinessObjectId(event),
      sortValue: (event) => activityBusinessObjectId(event),
    }
  }
  if (column.id === 'source') {
    return {
      key: column.id,
      label: column.label,
      render: (event) => event.source,
      sortValue: (event) => event.source,
    }
  }
  return {
    key: column.id,
    label: column.label,
    render: (event) => event.summary,
    sortValue: (event) => event.summary,
  }
})

export function ActivityTimeline({
  events,
  emptyText = 'No activity has been recorded.',
}: {
  events: ActivityEvent[]
  emptyText?: string
  showCategoryFilter?: boolean
}) {
  useDateTimePresentationPreference()
  const [fromDateDraft, setFromDateDraft] = useState('')
  const [toDateDraft, setToDateDraft] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [dateError, setDateError] = useState('')
  const [resetPageSignal, setResetPageSignal] = useState(0)

  const dateFilteredEvents = useMemo(
    () => activityEventsByDateRange(events, fromDate, toDate).sort(defaultActivitySort),
    [events, fromDate, toDate],
  )

  function resetToFirstPage() {
    setResetPageSignal((current) => current + 1)
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

  function exportCsv() {
    const header = ACTIVITY_COLUMNS.map((column) => column.label).join(',')
    const lines = dateFilteredEvents.map((event) =>
      [
        event.id,
        activityTimestampPresentation(event.occurredAt),
        event.actorName,
        activityEventCategoryLabel(event),
        event.eventType,
        activityBusinessObject(event),
        activityBusinessObjectId(event),
        event.summary,
        event.source,
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

  return (
    <section className="space-y-3">
      <RecordHistorySection
        records={dateFilteredEvents}
        columns={ACTIVITY_HISTORY_COLUMNS}
        getRowKey={(event) => event.id}
        getSearchText={activitySearchText}
        emptyText={emptyText}
        filteredEmptyText="No activity matches the current filters."
        searchLabel="Search / Filter"
        searchPlaceholder="Search Activity Log"
        recordsPerPageLabel="Records per page"
        logicalTableType="activity-log"
        logicalTableLabel="Activity Log"
        resetPageSignal={`${fromDate}|${toDate}|${resetPageSignal}`}
        controls={(
          <>
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
          </>
        )}
        actions={(
          <button type="button" className="h-8 rounded border border-sf-border px-3 text-sm hover:bg-sf-surface-alt" onClick={exportCsv}>
            Export CSV
          </button>
        )}
        message={dateError ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {dateError}
          </div>
        ) : null}
      />
    </section>
  )
}
