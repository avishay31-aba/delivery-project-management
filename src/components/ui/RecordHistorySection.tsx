import { type ReactNode, useEffect, useMemo, useState } from 'react'

export type RecordHistoryPageSize = 20 | 50 | 100 | 'all'
export type RecordHistorySortDirection = 'asc' | 'desc'

export interface RecordHistoryColumn<TRecord> {
  key: string
  label: ReactNode
  render: (record: TRecord) => ReactNode
  sortValue?: (record: TRecord) => string | number | null | undefined
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
  searchLabel?: string
  searchPlaceholder?: string
  recordsPerPageLabel?: string
  pageSizeOptions?: RecordHistoryPageSize[]
  initialPageSize?: RecordHistoryPageSize
  controls?: ReactNode
  actions?: ReactNode
  message?: ReactNode
  resetPageSignal?: unknown
  tableClassName?: string
}

const DEFAULT_PAGE_SIZE_OPTIONS: RecordHistoryPageSize[] = [20, 50, 100, 'all']

function pageSizeLabel(pageSize: RecordHistoryPageSize): string {
  return pageSize === 'all' ? 'All' : String(pageSize)
}

function normalized(value: unknown): string {
  return value == null ? '' : String(value).trim().toLocaleLowerCase()
}

function compareValues(first: string | number | null | undefined, second: string | number | null | undefined): number {
  if (typeof first === 'number' && typeof second === 'number') return first - second
  return normalized(first).localeCompare(normalized(second), undefined, { numeric: true, sensitivity: 'base' })
}

export function RecordHistorySection<TRecord>({
  records,
  columns,
  getRowKey,
  getSearchText,
  emptyText,
  filteredEmptyText = 'No records match the current filters.',
  searchLabel = 'Search / Filter',
  searchPlaceholder = 'Search / Filter',
  recordsPerPageLabel = 'Records per page',
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  initialPageSize = 20,
  controls,
  actions,
  message,
  resetPageSignal,
  tableClassName = 'w-max min-w-full border-collapse text-sm leading-tight',
}: RecordHistorySectionProps<TRecord>) {
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<RecordHistoryPageSize>(initialPageSize)
  const [pageNumber, setPageNumber] = useState(1)
  const [sort, setSort] = useState<{ key: string; direction: RecordHistorySortDirection } | null>(null)

  function resetToFirstPage() {
    setPageNumber(1)
  }

  useEffect(() => {
    resetToFirstPage()
  }, [resetPageSignal])

  const sortedAndFilteredRecords = useMemo(() => {
    const searchText = normalized(search)
    const filtered = searchText
      ? records.filter((record) => normalized(getSearchText(record)).includes(searchText))
      : records

    if (!sort) return filtered
    const column = columns.find((candidate) => candidate.key === sort.key)
    if (!column?.sortValue) return filtered

    return [...filtered].sort((first, second) => {
      const result = compareValues(column.sortValue?.(first), column.sortValue?.(second))
      return sort.direction === 'asc' ? result : -result
    })
  }, [columns, getSearchText, records, search, sort])

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-2">
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
          <label className="block text-sm font-medium text-sf-text">
            <span className="mb-1 block text-xs font-semibold uppercase text-sf-text-muted">{searchLabel}</span>
            <input
              aria-label={searchLabel}
              className="h-8 w-72 rounded border border-sf-border px-2 py-1 text-sm"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                resetToFirstPage()
              }}
            />
          </label>
          {controls}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {message}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-sf-border bg-white px-3 py-2 text-sm text-sf-text">
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
          <thead className="bg-sf-surface-alt text-left">
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
