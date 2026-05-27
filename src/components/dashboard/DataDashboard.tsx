import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getGroupedRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type GroupingState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'

export interface DashboardColumn<T> {
  id: string
  label: string
  getValue: (row: T) => string | number | null
  editKey?: keyof T
  render?: (row: T) => ReactNode
  sortable?: boolean
  filterable?: boolean
  groupable?: boolean
  editable?: boolean
  options?: string[]
}

interface DataDashboardProps<T extends { id: string }> {
  title: string
  rows: T[]
  columns: DashboardColumn<T>[]
  onRowClick?: (row: T) => void
  onEdit?: (row: T, columnId: string, value: string) => void
  toolbar?: ReactNode
}

export function DataDashboard<T extends { id: string }>({
  title,
  rows,
  columns,
  onRowClick,
  onEdit,
  toolbar,
}: DataDashboardProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [grouping, setGrouping] = useState<GroupingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(columns.map((c) => [c.id, true])),
  )

  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => ({
        id: col.id,
        header: col.label,
        accessorFn: (row) => String(col.getValue(row) ?? ''),
        enableSorting: col.sortable !== false,
        enableGrouping: col.groupable !== false,
        enableColumnFilter: col.filterable !== false,
        cell: ({ row }) => {
          const raw = String(col.getValue(row.original) ?? '')
          if (col.editable && onEdit) {
            if (col.options?.length) {
              return (
                <select
                  className="w-full rounded border border-sf-border px-2 py-1"
                  value={raw}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onEdit(row.original, col.id, e.target.value)}
                >
                  {col.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )
            }
            return (
              <input
                className="w-full rounded border border-sf-border px-2 py-1"
                value={raw}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onEdit(row.original, col.id, e.target.value)}
              />
            )
          }

          return (col.render?.(row.original) ?? raw) || '—'
        },
      })),
    [columns, onEdit],
  )

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { globalFilter, sorting, grouping, columnFilters, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
  })

  function exportCsv() {
    const visibleColumns = table.getVisibleLeafColumns()
    const header = visibleColumns.map((c) => c.columnDef.header as string).join(',')
    const lines = table.getFilteredRowModel().rows.map((row) =>
      visibleColumns
        .map((col) => {
          const val = String(row.getValue(col.id) ?? '')
          return `"${val.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title.toLowerCase().replaceAll(' ', '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sf-text-muted">
          <span className="font-semibold text-sf-text">{title}</span>
          {' · '}Showing {table.getFilteredRowModel().rows.length} record
          {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
        </p>
        {toolbar}
      </div>

      <div className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Search"
            className="rounded border border-sf-border px-2 py-1"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
          />

          {table.getAllLeafColumns().map((col) => {
            const srcCol = columns.find((c) => c.id === col.id)
            if (!srcCol) return null
            if (srcCol.filterable === false) return null
            const options = Array.from(new Set(rows.map((r) => String(srcCol.getValue(r) ?? '')))).filter(Boolean)
            return (
              <select
                key={col.id}
                className="rounded border border-sf-border px-2 py-1"
                value={(col.getFilterValue() as string) ?? ''}
                onChange={(e) => col.setFilterValue(e.target.value || undefined)}
              >
                <option value="">{String(col.columnDef.header)}: All</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )
          })}

          <select
            className="rounded border border-sf-border px-2 py-1"
            value={grouping[0] ?? ''}
            onChange={(e) => setGrouping(e.target.value ? [e.target.value] : [])}
          >
            <option value="">Group by: none</option>
            {table.getAllLeafColumns().map((c) => (
              <option key={c.id} value={c.id}>{String(c.columnDef.header)}</option>
            ))}
          </select>

          <button type="button" onClick={exportCsv} className="rounded border border-sf-border px-3 py-1">
            Export CSV
          </button>
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-sf-text-muted">Show / hide columns</summary>
          <div className="mt-2 flex flex-wrap gap-3">
            {table.getAllLeafColumns().map((c) => (
              <label key={c.id} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={c.getIsVisible()} onChange={c.getToggleVisibilityHandler()} />
                {String(c.columnDef.header)}
              </label>
            ))}
          </div>
        </details>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-sf-border text-sm">
            <thead className="bg-sf-surface-alt text-left">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-3 py-2 font-semibold text-sf-text">
                      {header.isPlaceholder ? null : (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? '↑' : ''}
                          {header.column.getIsSorted() === 'desc' ? '↓' : ''}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-sf-border bg-white">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-sf-surface-alt" onClick={() => onRowClick?.(row.original)}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2 align-middle">
                      {cell.getIsGrouped() ? (
                        <>
                          <button type="button" onClick={row.getToggleExpandedHandler()}>
                            {row.getIsExpanded() ? '▾' : '▸'}
                          </button>{' '}
                          {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                        </>
                      ) : (
                        flexRender(cell.column.columnDef.cell, cell.getContext())
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}