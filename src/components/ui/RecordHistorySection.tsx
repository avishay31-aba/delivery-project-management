import { Children, isValidElement, type ReactNode, useEffect, useMemo, useState } from 'react'
import { CURRENT_USER_ID } from '@/config/current-user'
import {
  RECORDS_PER_PAGE_OPTIONS,
  SYSTEM_DEFAULT_RECORDS_PER_PAGE,
  effectiveRecordsPerPage,
  preferenceContextLabel,
  recordsPerPageLabel as sharedPageSizeLabel,
  recordsPerPagePreference,
  type RecordsPerPageValue,
} from '@/domain/user-preferences'
import { useAppStore } from '@/store/useAppStore'
import { downloadCsv, type CsvCellValue } from '@/utils/csv-export'

export type RecordHistoryPageSize = RecordsPerPageValue
export type RecordHistorySortDirection = 'asc' | 'desc'

export interface RecordHistoryColumn<TRecord> {
  key: string
  label: ReactNode
  render: (record: TRecord) => ReactNode
  sortValue?: (record: TRecord) => string | number | null | undefined
  exportValue?: (record: TRecord) => CsvCellValue
  exportLabel?: string
  excludeFromExport?: boolean
  className?: string
  headerClassName?: string
}

interface RecordHistorySectionProps<TRecord> {
  records: TRecord[]
  columns: Array<RecordHistoryColumn<TRecord>>
  getRowKey: (record: TRecord, index: number) => string
  getSearchText: (record: TRecord) => string
  emptyText: string
  filteredEmptyText?: string
  enableSearch?: boolean
  searchLabel?: string
  searchPlaceholder?: string
  dateFilterLabel?: string
  fromDateLabel?: string
  toDateLabel?: string
  getDateValue?: (record: TRecord) => string | null | undefined
  recordsPerPageLabel?: string
  pageSizeOptions?: RecordHistoryPageSize[]
  initialPageSize?: RecordHistoryPageSize
  initialSort?: { key: string; direction: RecordHistorySortDirection } | null
  logicalTableType?: string
  logicalTableLabel?: string
  controls?: ReactNode
  actions?: ReactNode
  message?: ReactNode
  resetPageSignal?: unknown
  tableClassName?: string
  exportFileName?: string
}

const DEFAULT_PAGE_SIZE_OPTIONS: RecordHistoryPageSize[] = RECORDS_PER_PAGE_OPTIONS

function pageSizeLabel(pageSize: RecordHistoryPageSize): string {
  return sharedPageSizeLabel(pageSize)
}

function normalized(value: unknown): string {
  return value == null ? '' : String(value).trim().toLocaleLowerCase()
}

function compareValues(first: string | number | null | undefined, second: string | number | null | undefined): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second
  return normalized(first).localeCompare(normalized(second), undefined, { numeric: true, sensitivity: 'base' })
}

function reactNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (!isValidElement<{ children?: ReactNode }>(node)) return ''
  return Children.toArray(node.props.children).map(reactNodeText).filter(Boolean).join(' ')
}

export function RecordHistorySection<TRecord>({
  records,
  columns,
  getRowKey,
  getSearchText,
  emptyText,
  filteredEmptyText = 'No matching records.',
  enableSearch = true,
  searchLabel = 'Search / Filter',
  searchPlaceholder = 'Search / Filter',
  dateFilterLabel = 'Date',
  fromDateLabel = 'From Date',
  toDateLabel = 'To Date',
  getDateValue,
  recordsPerPageLabel = 'Records per page',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = 10,
  initialSort = null,
  logicalTableType,
  logicalTableLabel,
  controls,
  actions,
  message,
  resetPageSignal,
  tableClassName = 'w-max min-w-full border-collapse text-sm leading-tight',
  exportFileName,
}: RecordHistorySectionProps<TRecord>) {
  const userPresentationPreferences = useAppStore((state) => state.userPresentationPreferences)
  const setRecordsPerPagePreference = useAppStore((state) => state.setRecordsPerPagePreference)
  const resetRecordsPerPagePreference = useAppStore((state) => state.resetRecordsPerPagePreference)
  const tableLabel = logicalTableLabel ?? (logicalTableType ? preferenceContextLabel(logicalTableType) : 'this table')
  const effectiveInitialPageSize = logicalTableType
    ? effectiveRecordsPerPage(userPresentationPreferences, CURRENT_USER_ID, logicalTableType, initialPageSize ?? SYSTEM_DEFAULT_RECORDS_PER_PAGE)
    : initialPageSize
  const savedUserDefault = logicalTableType
    ? recordsPerPagePreference(userPresentationPreferences, CURRENT_USER_ID, logicalTableType)
    : null
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<RecordHistoryPageSize>(effectiveInitialPageSize)
  const [pageNumber, setPageNumber] = useState(1)
  const [sort, setSort] = useState<{ key: string; direction: RecordHistorySortDirection } | null>(initialSort)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [preferenceMessage, setPreferenceMessage] = useState('')

  function resetToFirstPage() {
    setPageNumber(1)
  }

  useEffect(() => {
    resetToFirstPage()
  }, [resetPageSignal])

  useEffect(() => {
    setPageSize(effectiveInitialPageSize)
    resetToFirstPage()
  }, [effectiveInitialPageSize])

  function setCurrentPageSizeAsDefault() {
    if (!logicalTableType) return
    const result = setRecordsPerPagePreference(logicalTableType, pageSize)
    setPreferenceMessage(result.ok ? `${pageSizeLabel(pageSize)} records per page was set as your default for ${tableLabel}.` : result.message)
  }

  function resetPersonalDefault() {
    if (!logicalTableType) return
    const result = resetRecordsPerPagePreference(logicalTableType)
    setPreferenceMessage(result.ok ? `Your personal default for ${tableLabel} was reset.` : result.message)
  }

  const sortedAndFilteredRecords = useMemo(() => {
    const searchText = enableSearch ? normalized(search) : ''
    const dateFiltered = getDateValue
      ? records.filter((record) => {
          if (!fromDate && !toDate) return true
          const value = getDateValue(record)
          if (!value) return false
          const date = String(value).slice(0, 10)
          if (fromDate && date < fromDate) return false
          if (toDate && date > toDate) return false
          return true
        })
      : records
    const filtered = searchText
      ? dateFiltered.filter((record) => normalized(getSearchText(record)).includes(searchText))
      : dateFiltered

    if (!sort) return filtered
    const column = columns.find((candidate) => candidate.key === sort.key)
    if (!column?.sortValue) return filtered

    return [...filtered].sort((first, second) => {
      const result = compareValues(column.sortValue?.(first), column.sortValue?.(second))
      return sort.direction === 'asc' ? result : -result
    })
  }, [columns, enableSearch, fromDate, getDateValue, getSearchText, records, search, sort, toDate])

  const totalMatchingRecords = sortedAndFilteredRecords.length
  const numericPageSize = pageSize === 'all' ? Math.max(totalMatchingRecords, 1) : pageSize
  const totalPages = Math.max(1, Math.ceil(totalMatchingRecords / numericPageSize))
  const currentPage = Math.min(Math.max(1, pageNumber), totalPages)
  const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * numericPageSize
  const visibleRecords = pageSize === 'all'
    ? sortedAndFilteredRecords
    : sortedAndFilteredRecords.slice(startIndex, startIndex + numericPageSize)
  const firstRecordNumber = visibleRecords.length > 0 ? startIndex + 1 : 0
  const lastRecordNumber = visibleRecords.length > 0 ? startIndex + visibleRecords.length : 0
  const pageSummary = totalMatchingRecords > 0
    ? `Records ${firstRecordNumber}-${lastRecordNumber} of ${totalMatchingRecords}`
    : 'Records 0-0 of 0'

  useEffect(() => {
    if (currentPage !== pageNumber) setPageNumber(currentPage)
  }, [currentPage, pageNumber])

  function toggleSort(key: string) {
    const column = columns.find((candidate) => candidate.key === key)
    if (!column?.sortValue) return
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
    resetToFirstPage()
  }

  const emptyMessage = records.length > 0 && totalMatchingRecords === 0 ? filteredEmptyText : emptyText
  const exportColumns = columns.filter((column) => column.key !== 'actions' && !column.excludeFromExport)

  function exportCsv() {
    downloadCsv(
      exportFileName ?? `${(logicalTableLabel ?? logicalTableType ?? 'table').toLocaleLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}.csv`,
      exportColumns.map((column) => column.exportLabel ?? (reactNodeText(column.label) || column.key)),
      sortedAndFilteredRecords.map((record) => exportColumns.map((column) => column.exportValue?.(record) ?? column.sortValue?.(record) ?? '')),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="sf-collection-navigation flex flex-wrap items-end gap-2">
          <label className="block text-sm font-medium text-sf-text">
            <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">{recordsPerPageLabel}</span>
            <select
              aria-label={recordsPerPageLabel}
              className="h-8 rounded border border-sf-border px-2 py-1 text-sm"
              value={String(pageSize)}
              onChange={(event) => {
                const value = event.target.value === 'all' ? 'all' : Number(event.target.value) as RecordHistoryPageSize
                setPageSize(value)
                resetToFirstPage()
              }}
            >
              {pageSizeOptions.map((value) => (
                <option key={value} value={String(value)}>{pageSizeLabel(value)}</option>
              ))}
            </select>
          </label>
          {logicalTableType ? (
            <div className="flex items-end gap-2">
              <button
                type="button"
                className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                onClick={setCurrentPageSizeAsDefault}
              >
                Set as Default
              </button>
              <button
                type="button"
                className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                onClick={resetPersonalDefault}
              >
                Reset to Default
              </button>
              {savedUserDefault === pageSize ? (
                <span className="pb-1 text-xs font-semibold text-sf-success">Saved default</span>
              ) : null}
            </div>
          ) : null}
          {enableSearch ? (
            <label className="block text-sm font-medium text-sf-text">
              <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">{searchLabel}</span>
              <div className="relative">
                <input
                  aria-label={searchLabel}
                  className="h-8 w-72 rounded border border-sf-border px-2 py-1 pr-8 text-sm"
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    resetToFirstPage()
                  }}
                />
                {search ? (
                  <button
                    type="button"
                    className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-sf-text-muted hover:bg-sf-surface-alt hover:text-sf-text"
                    aria-label={`Clear ${searchLabel.toLocaleLowerCase()}`}
                    onClick={() => {
                      setSearch('')
                      resetToFirstPage()
                    }}
                  >
                    ×
                  </button>
                ) : null}
              </div>
            </label>
          ) : null}
          {getDateValue ? (
            <>
              <label className="block text-sm font-medium text-sf-text">
                <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">{fromDateLabel}</span>
                <input
                  aria-label={`${dateFilterLabel} ${fromDateLabel}`}
                  className="h-8 rounded border border-sf-border px-2 py-1 text-sm"
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value)
                    resetToFirstPage()
                  }}
                />
              </label>
              <label className="block text-sm font-medium text-sf-text">
                <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">{toDateLabel}</span>
                <input
                  aria-label={`${dateFilterLabel} ${toDateLabel}`}
                  className="h-8 rounded border border-sf-border px-2 py-1 text-sm"
                  type="date"
                  value={toDate}
                  onChange={(event) => {
                    setToDate(event.target.value)
                    resetToFirstPage()
                  }}
                />
              </label>
            </>
          ) : null}
          {controls}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt" onClick={exportCsv}>
            Export CSV
          </button>
          {actions}
        </div>
      </div>

      {message}
      {preferenceMessage ? (
        <div className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{preferenceMessage}</div>
      ) : null}

      <div className="sf-collection-navigation flex flex-wrap items-center justify-between gap-2 rounded border border-sf-border bg-white px-3 py-2 text-sm text-sf-text">
        <div>
          Page {currentPage} of {totalPages}
          <span className="ml-3 text-sf-text-muted">{pageSummary}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage <= 1}
            onClick={() => setPageNumber((current) => Math.max(1, current - 1))}
          >
            Previous
          </button>
          <button
            type="button"
            className="rounded border border-sf-border px-3 py-1 text-sm hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
            disabled={currentPage >= totalPages}
            onClick={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </button>
        </div>
      </div>

      <div className="sf-scroll-x rounded border border-sf-border bg-white">
        <table className={tableClassName}>
          <thead className="sf-collection-navigation bg-sf-surface-alt text-left">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.headerClassName ?? 'whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text'}>
                  {column.sortValue ? (
                    <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort(column.key)}>
                      {column.label}
                      {sort?.key === column.key && sort.direction === 'asc' ? '↑' : ''}
                      {sort?.key === column.key && sort.direction === 'desc' ? '↓' : ''}
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record, index) => (
              <tr key={getRowKey(record, startIndex + index)} className="hover:bg-sf-surface-alt">
                {columns.map((column) => (
                  <td key={column.key} className={column.className ?? 'whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text'}>
                    {column.render(record)}
                  </td>
                ))}
              </tr>
            ))}
            {visibleRecords.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
