import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
flexRender,
getCoreRowModel,
getFilteredRowModel,
getGroupedRowModel,
getSortedRowModel,
useReactTable,
type Column,
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
getRowClassName?: (row: T) => string
toolbar?: ReactNode
}

interface HeaderMenuProps<T extends { id: string }> {
column: Column<T, unknown>
allColumns: Array<Column<T, unknown>>
sourceColumn?: DashboardColumn<T>
rows: T[]
grouping: GroupingState
setGrouping: (grouping: GroupingState) => void
}

function joinClassNames(...classNames: Array<string | false | undefined>): string {
return classNames.filter(Boolean).join(' ')
}

function uniqueColumnOptions<T>(rows: T[], sourceColumn?: DashboardColumn<T>): string[] {
if (!sourceColumn) return []

return Array.from(new Set(rows.map((row) => String(sourceColumn.getValue(row) ?? ''))))
.filter(Boolean)
.sort((a, b) => a.localeCompare(b))
}

function HeaderMenu<T extends { id: string }>({
column,
allColumns,
sourceColumn,
rows,
grouping,
setGrouping,
}: HeaderMenuProps<T>) {
const filterOptions = uniqueColumnOptions(rows, sourceColumn)
const headerLabel = String(column.columnDef.header)
const isGrouped = grouping.includes(column.id)
const hasHiddenColumns = allColumns.some((tableColumn) => !tableColumn.getIsVisible())

return (
<details className="group relative inline-block" onClick={(event) => event.stopPropagation()}>
<summary
className="ml-1 inline-flex cursor-pointer list-none items-center rounded border border-transparent px-1 text-xs text-sf-text-muted hover:border-sf-border hover:bg-white"
title={`${headerLabel} column menu`}
>
▾
</summary>
<div className="absolute left-0 z-20 mt-1 w-56 space-y-2 rounded border border-sf-border bg-white p-3 text-sm font-normal text-sf-text shadow-lg">
<div className="space-y-1">
<button
type="button"
className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
disabled={!column.getCanSort()}
onClick={() => column.toggleSorting(false)}
>
Sort A-Z
</button>
<button
type="button"
className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
disabled={!column.getCanSort()}
onClick={() => column.toggleSorting(true)}
>
Sort Z-A
</button>
</div>

    <label className="block space-y-1 border-t border-sf-border pt-2 text-xs font-semibold uppercase tracking-wide text-sf-text-muted">
      <span>Filter</span>
      <select
        className="w-full rounded border border-sf-border px-2 py-1 text-sm font-normal normal-case text-sf-text"
        disabled={!column.getCanFilter()}
        value={(column.getFilterValue() as string) ?? ''}
        onChange={(event) => column.setFilterValue(event.target.value || undefined)}
      >
        <option value="">All</option>
        {filterOptions.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>

    <div className="space-y-1 border-t border-sf-border pt-2">
      <button
        type="button"
        className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
        disabled={!column.getCanGroup()}
        onClick={() => setGrouping(isGrouped ? [] : [column.id])}
      >
        {isGrouped ? 'Ungroup column' : 'Group by column'}
      </button>
      <button
        type="button"
        className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
        disabled={!column.getCanHide()}
        onClick={() => column.toggleVisibility(false)}
      >
        Hide column
      </button>
      <button
        type="button"
        className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
        disabled={!hasHiddenColumns}
        onClick={() => allColumns.forEach((tableColumn) => tableColumn.toggleVisibility(true))}
      >
        Show all columns
      </button>
    </div>
  </div>
</details>
)
}

export function DataDashboard<T extends { id: string }>({
title,
rows,
columns,
onRowClick,
onEdit,
getRowClassName,
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
filterFn: (row, columnId, filterValue) => {
if (!filterValue) return true
return String(row.getValue(columnId) ?? '') === String(filterValue)
},
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
              {headerGroup.headers.map((header) => {
                const sourceColumn = columns.find((column) => column.id === header.column.id)

                return (
                  <th key={header.id} className="whitespace-nowrap px-3 py-2 font-semibold text-sf-text">
                    {header.isPlaceholder ? null : (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === 'asc' ? '↑' : ''}
                          {header.column.getIsSorted() === 'desc' ? '↓' : ''}
                        </button>
                        <HeaderMenu
                          column={header.column}
                          allColumns={table.getAllLeafColumns()}
                          sourceColumn={sourceColumn}
                          rows={rows}
                          grouping={grouping}
                          setGrouping={setGrouping}
                        />
                      </div>
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-sf-border bg-white">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className={joinClassNames('hover:bg-sf-surface-alt', getRowClassName?.(row.original))}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-3 py-2 align-middle">
                  {cell.getIsGrouped() ? (
                    <>
                      <button type="button" onClick={row.getToggleExpandedHandler()}>
                        {row.getIsExpanded() ? '▾' : '▸'}
                      </button>{' '}
                      {flexRender(cell.column.columnDef.cell, cell.getContext())} ({row.subRows.length})
                    </>
                  ) : cell.getIsPlaceholder() ? null : (
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