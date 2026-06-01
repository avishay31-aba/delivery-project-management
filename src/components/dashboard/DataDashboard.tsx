import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent, FormEvent, KeyboardEvent, ReactNode } from 'react'
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
  type ColumnOrderState,
  type GroupingState,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  FULL_DASHBOARD_VIEW_ID,
  addDashboardView,
  areDashboardViewStatesEqual,
  getRuntimeDashboardViews,
  hasDashboardViewNameConflict,
  loadDashboardViews,
  normalizeDashboardViewState,
  persistDashboardViews,
  resolveDefaultDashboardViewId,
  setDefaultDashboardView,
  updateDashboardView,
  type DashboardViewScope,
  type RuntimeDashboardView,
  type SavedDashboardViewState,
} from '@/store/dashboardViews'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { useUnsavedChangesGuardStore } from '@/store/useUnsavedChangesGuardStore'

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
  dashboardScope: DashboardViewScope
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
  setSorting: (sorting: SortingState) => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

interface FloatingMenuPosition {
  top: number
  left: number
  maxHeight: number
}

type ColumnDropPlacement = 'before' | 'after'

const FLOATING_MENU_VIEWPORT_PADDING = 8
const FLOATING_MENU_TRIGGER_GAP = 4
const COLUMN_DRAG_DATA_TYPE = 'application/x-dashboard-column-id'

function joinClassNames(...classNames: Array<string | false | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function uniqueColumnOptions<T>(rows: T[], sourceColumn?: DashboardColumn<T>): string[] {
  if (!sourceColumn) return []

  return Array.from(new Set(rows.map((row) => String(sourceColumn.getValue(row) ?? ''))))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
}

function moveColumn(
  columnOrder: ColumnOrderState,
  sourceColumnId: string,
  targetColumnId: string,
  placement: ColumnDropPlacement = 'before',
): ColumnOrderState {
  if (sourceColumnId === targetColumnId) return columnOrder

  const sourceIndex = columnOrder.indexOf(sourceColumnId)
  const targetIndex = columnOrder.indexOf(targetColumnId)

  if (sourceIndex === -1 || targetIndex === -1) return columnOrder

  const nextColumnOrder = [...columnOrder]
  const [movedColumnId] = nextColumnOrder.splice(sourceIndex, 1)
  const targetInsertionIndex = placement === 'after' ? targetIndex + 1 : targetIndex
  const insertionIndex = sourceIndex < targetInsertionIndex ? targetInsertionIndex - 1 : targetInsertionIndex

  nextColumnOrder.splice(insertionIndex, 0, movedColumnId)
  return nextColumnOrder
}

function FilterFunnelIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 3.5A.5.5 0 0 1 2.5 3h11a.5.5 0 0 1 .38.82L9.5 9.05V12a.5.5 0 0 1-.22.42l-2 1.3A.5.5 0 0 1 6.5 13.3V9.05L2.12 3.82A.5.5 0 0 1 2 3.5Z"
      />
    </svg>
  )
}

type SaveDashboardViewOperation = 'update-existing' | 'save-as-new' | 'set-default'

interface SaveDashboardViewDialogProps {
  selectedView: RuntimeDashboardView
  isModified: boolean
  hasNameConflict: (name: string) => boolean
  onCancel: () => void
  onSaveAsNew: (name: string, setAsDefault: boolean) => string | null
  onUpdateExisting: (setAsDefault: boolean) => string | null
  onSetDefault: () => string | null
}

function SaveDashboardViewDialog({
  selectedView,
  isModified,
  hasNameConflict,
  onCancel,
  onSaveAsNew,
  onUpdateExisting,
  onSetDefault,
}: SaveDashboardViewDialogProps) {
  const canUpdateExisting = isModified && !selectedView.isFullDashboard
  const canSaveAsNew = isModified
  const canSetDefaultOnly = !isModified && !selectedView.isDefault
  const initialOperation: SaveDashboardViewOperation = canUpdateExisting
    ? 'update-existing'
    : canSaveAsNew
      ? 'save-as-new'
      : 'set-default'
  const [operation, setOperation] = useState<SaveDashboardViewOperation>(initialOperation)
  const [newViewName, setNewViewName] = useState('')
  const [setAsDefault, setSetAsDefault] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trimmedNewViewName = newViewName.trim()
  const isSavingAsNew = operation === 'save-as-new'

  function validateNewViewName(): string | null {
    if (!trimmedNewViewName) return 'View name is required.'
    if (hasNameConflict(trimmedNewViewName)) return `A view named "${trimmedNewViewName}" already exists for this dashboard.`
    return null
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (operation === 'set-default') {
      setError(onSetDefault())
      return
    }

    if (operation === 'update-existing') {
      setError(onUpdateExisting(setAsDefault))
      return
    }

    const validationError = validateNewViewName()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(onSaveAsNew(trimmedNewViewName, setAsDefault))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4" role="presentation">
      <form
        className="w-full max-w-md space-y-4 rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-dashboard-view-title"
        onSubmit={handleSubmit}
      >
        <div>
          <h2 id="save-dashboard-view-title" className="text-base font-semibold">
            Save dashboard view
          </h2>
          <p className="mt-1 text-sf-text-muted">
            Save the current dashboard configuration for your local dashboard views.
          </p>
        </div>

        {selectedView.isFullDashboard && isModified ? (
          <p className="rounded border border-sf-border bg-sf-surface-alt p-2 text-sf-text-muted">
            Full Dashboard is protected and cannot be overwritten. Save these changes as a new view instead.
          </p>
        ) : null}

        <div className="space-y-3">
          {canUpdateExisting ? (
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="save-dashboard-view-operation"
                className="mt-1"
                checked={operation === 'update-existing'}
                onChange={() => setOperation('update-existing')}
              />
              <span>
                <span className="block font-medium">Update Existing View</span>
                <span className="block text-sf-text-muted">Replace “{selectedView.name}” with the current dashboard state.</span>
              </span>
            </label>
          ) : null}

          {canSaveAsNew ? (
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="save-dashboard-view-operation"
                className="mt-1"
                checked={operation === 'save-as-new'}
                onChange={() => setOperation('save-as-new')}
              />
              <span className="flex-1 space-y-2">
                <span className="block font-medium">Save as New View</span>
                <span className="block text-sf-text-muted">Create a personal saved view from the current dashboard state.</span>
                {isSavingAsNew ? (
                  <input
                    className="w-full rounded border border-sf-border px-2 py-1"
                    placeholder="New view name"
                    value={newViewName}
                    autoFocus
                    onChange={(event) => {
                      setNewViewName(event.target.value)
                      setError(null)
                    }}
                  />
                ) : null}
              </span>
            </label>
          ) : null}

          {canSetDefaultOnly ? (
            <label className="flex items-start gap-2">
              <input
                type="radio"
                name="save-dashboard-view-operation"
                className="mt-1"
                checked={operation === 'set-default'}
                onChange={() => setOperation('set-default')}
              />
              <span>
                <span className="block font-medium">Set as Default View</span>
                <span className="block text-sf-text-muted">Open “{selectedView.name}” by default for this dashboard.</span>
              </span>
            </label>
          ) : null}
        </div>

        {operation !== 'set-default' ? (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={setAsDefault}
              onChange={(event) => setSetAsDefault(event.target.checked)}
            />
            <span>Set saved view as default for this dashboard</span>
          </label>
        ) : null}

        {error ? <p className="rounded border border-red-200 bg-red-50 p-2 text-red-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 hover:bg-sf-surface-alt"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button type="submit" className="rounded border border-sf-brand bg-sf-brand px-3 py-1 text-white">
            Save
          </button>
        </div>
      </form>
    </div>
  )
}

function HeaderMenu<T extends { id: string }>({
  column,
  allColumns,
  sourceColumn,
  rows,
  grouping,
  setGrouping,
  setSorting,
  isOpen,
  onToggle,
  onClose,
}: HeaderMenuProps<T>) {
  const menuWrapperRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const [menuPosition, setMenuPosition] = useState<FloatingMenuPosition>(() => ({
    top: FLOATING_MENU_VIEWPORT_PADDING,
    left: FLOATING_MENU_VIEWPORT_PADDING,
    maxHeight:
      typeof window === 'undefined'
        ? 0
        : Math.max(0, window.innerHeight - FLOATING_MENU_VIEWPORT_PADDING * 2),
  }))
  const filterOptions = uniqueColumnOptions(rows, sourceColumn)
  const headerLabel = String(column.columnDef.header)
  const isGrouped = grouping.includes(column.id)
  const hiddenColumns = allColumns.filter((tableColumn) => !tableColumn.getIsVisible())
  const hiddenColumnCount = hiddenColumns.length
  const [showRestoreColumns, setShowRestoreColumns] = useState(false)
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([])

  const updateMenuPosition = useCallback(() => {
    const triggerElement = menuButtonRef.current
    const menuElement = menuPanelRef.current

    if (!triggerElement || !menuElement) return

    const triggerRect = triggerElement.getBoundingClientRect()
    const menuRect = menuElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const maxHeight = Math.max(0, viewportHeight - FLOATING_MENU_VIEWPORT_PADDING * 2)
    const menuWidth = menuRect.width
    const menuHeight = Math.min(menuRect.height, maxHeight)
    const spaceBelow = viewportHeight - triggerRect.bottom - FLOATING_MENU_TRIGGER_GAP - FLOATING_MENU_VIEWPORT_PADDING
    const spaceAbove = triggerRect.top - FLOATING_MENU_TRIGGER_GAP - FLOATING_MENU_VIEWPORT_PADDING
    const shouldOpenUpward = spaceBelow < menuHeight && spaceAbove > spaceBelow
    const preferredTop = shouldOpenUpward
      ? triggerRect.top - FLOATING_MENU_TRIGGER_GAP - menuHeight
      : triggerRect.bottom + FLOATING_MENU_TRIGGER_GAP
    const top = Math.min(
      Math.max(FLOATING_MENU_VIEWPORT_PADDING, preferredTop),
      Math.max(FLOATING_MENU_VIEWPORT_PADDING, viewportHeight - FLOATING_MENU_VIEWPORT_PADDING - menuHeight),
    )
    const preferredLeft = triggerRect.left
    const left = Math.min(
      Math.max(FLOATING_MENU_VIEWPORT_PADDING, preferredLeft),
      Math.max(FLOATING_MENU_VIEWPORT_PADDING, viewportWidth - FLOATING_MENU_VIEWPORT_PADDING - menuWidth),
    )

    setMenuPosition({ top, left, maxHeight })
  }, [])

  useEffect(() => {
    if (!isOpen) {
      setShowRestoreColumns(false)
      setSelectedColumnIds([])
    }
  }, [isOpen])

  useLayoutEffect(() => {
    if (!isOpen) return

    updateMenuPosition()
  }, [hiddenColumnCount, isOpen, showRestoreColumns, updateMenuPosition])

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuWrapperRef.current?.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleViewportChange() {
      updateMenuPosition()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [isOpen, onClose, updateMenuPosition])

  function closeAfterAction(action: () => void) {
    action()
    onClose()
  }

  function toggleSelectedColumn(columnId: string) {
    setSelectedColumnIds((currentSelection) =>
      currentSelection.includes(columnId)
        ? currentSelection.filter((selectedColumnId) => selectedColumnId !== columnId)
        : [...currentSelection, columnId],
    )
  }

  function restoreSelectedColumns() {
    const selectedColumnIdSet = new Set(selectedColumnIds)
    hiddenColumns.forEach((hiddenColumn) => {
      if (selectedColumnIdSet.has(hiddenColumn.id)) {
        hiddenColumn.toggleVisibility(true)
      }
    })
    onClose()
  }

  function restoreAllColumns() {
    hiddenColumns.forEach((hiddenColumn) => hiddenColumn.toggleVisibility(true))
    onClose()
  }

  return (
    <div ref={menuWrapperRef} className="relative inline-block" onClick={(event) => event.stopPropagation()}>
      <button
        ref={menuButtonRef}
        className="ml-1 inline-flex cursor-pointer list-none items-center rounded border border-transparent px-1 text-xs text-sf-text-muted hover:border-sf-border hover:bg-white"
        title={`${headerLabel} column menu`}
        type="button"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        ▾
      </button>
      {isOpen ? (
        <div
          ref={menuPanelRef}
          className="fixed z-20 w-64 space-y-2 overflow-y-auto rounded border border-sf-border bg-white p-3 text-sm font-normal text-sf-text shadow-lg"
          style={{ top: menuPosition.top, left: menuPosition.left, maxHeight: menuPosition.maxHeight }}
        >
          <label className="block space-y-1 text-xs font-semibold uppercase tracking-wide text-sf-text-muted">
            <span>Filter</span>
            <select
              className="w-full rounded border border-sf-border px-2 py-1 text-sm font-normal normal-case text-sf-text"
              disabled={!column.getCanFilter()}
              value={(column.getFilterValue() as string) ?? ''}
              onChange={(event) => column.setFilterValue(event.target.value || undefined)}
            >
              <option value="">All</option>
              {filterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1 border-t border-sf-border pt-2">
            <button
              type="button"
              className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
              disabled={!column.getCanGroup()}
              onClick={() =>
                closeAfterAction(() => {
                  setGrouping([column.id])
                  setSorting([{ id: column.id, desc: false }])
                })
              }
            >
              Group ascending
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
              disabled={!column.getCanGroup()}
              onClick={() =>
                closeAfterAction(() => {
                  setGrouping([column.id])
                  setSorting([{ id: column.id, desc: true }])
                })
              }
            >
              Group descending
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
              disabled={!isGrouped}
              onClick={() => closeAfterAction(() => setGrouping([]))}
            >
              Ungroup
            </button>
          </div>

          <div className="space-y-1 border-t border-sf-border pt-2">
            <button
              type="button"
              className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
              disabled={!column.getCanHide()}
              onClick={() => closeAfterAction(() => column.toggleVisibility(false))}
            >
              Hide column
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
              disabled={hiddenColumnCount === 0}
              onClick={() => setShowRestoreColumns((isVisible) => !isVisible)}
            >
              Restore hidden columns{hiddenColumnCount > 0 ? ` (${hiddenColumnCount})` : ''}
            </button>
          </div>

          {showRestoreColumns && hiddenColumnCount > 0 ? (
            <div className="space-y-2 border-t border-sf-border pt-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-sf-text-muted">Hidden columns</p>
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {hiddenColumns.map((hiddenColumn) => (
                  <label key={hiddenColumn.id} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-sf-surface-alt">
                    <input
                      type="checkbox"
                      checked={selectedColumnIds.includes(hiddenColumn.id)}
                      onChange={() => toggleSelectedColumn(hiddenColumn.id)}
                    />
                    <span>{String(hiddenColumn.columnDef.header)}</span>
                  </label>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-sf-border px-2 py-1 text-xs hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
                  disabled={selectedColumnIds.length === 0}
                  onClick={restoreSelectedColumns}
                >
                  Restore selected
                </button>
                <button
                  type="button"
                  className="rounded border border-sf-border px-2 py-1 text-xs hover:bg-sf-surface-alt"
                  onClick={restoreAllColumns}
                >
                  Restore all
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}


export function DataDashboard<T extends { id: string }>({
  title,
  dashboardScope,
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
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => columns.map((column) => column.id))
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries(columns.map((column) => [column.id, true])),
  )
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null)
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const sourceColumnIds = useMemo(() => columns.map((column) => column.id), [columns])
  const [persistedDashboardViews, setPersistedDashboardViews] = useState(() => loadDashboardViews())
  const [selectedViewId, setSelectedViewId] = useState(FULL_DASHBOARD_VIEW_ID)
  const [pendingViewId, setPendingViewId] = useState<string | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveSuccessContinuation, setSaveSuccessContinuation] = useState<(() => void) | null>(null)
  const hasAppliedInitialDefaultRef = useRef<DashboardViewScope | null>(null)
  const setHasUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.setHasUnsavedDashboardChanges)
  const setSaveUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.setSaveUnsavedDashboardChanges)

  useEffect(() => {
    setColumnOrder((currentColumnOrder) => {
      const nextSourceColumnIdSet = new Set(sourceColumnIds)
      const preservedColumnOrder = currentColumnOrder.filter((columnId) => nextSourceColumnIdSet.has(columnId))
      const newColumnIds = sourceColumnIds.filter((columnId) => !preservedColumnOrder.includes(columnId))

      return [...preservedColumnOrder, ...newColumnIds]
    })
  }, [sourceColumnIds])

  const tableColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => ({
        id: column.id,
        header: column.label,
        accessorFn: (row) => String(column.getValue(row) ?? ''),
        enableSorting: column.sortable !== false,
        enableGrouping: column.groupable !== false,
        enableColumnFilter: column.filterable !== false,
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue) return true
          return String(row.getValue(columnId) ?? '') === String(filterValue)
        },
        cell: ({ row }) => {
          const raw = String(column.getValue(row.original) ?? '')

          if (column.editable && onEdit) {
            if (column.options?.length) {
              return (
                <select
                  className="w-full rounded border border-sf-border px-2 py-1"
                  value={raw}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onEdit(row.original, column.id, event.target.value)}
                >
                  {column.options.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              )
            }

            return (
              <input
                className="w-full rounded border border-sf-border px-2 py-1"
                value={raw}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => onEdit(row.original, column.id, event.target.value)}
              />
            )
          }

          return (column.render?.(row.original) ?? raw) || '—'
        },
      })),
    [columns, onEdit],
  )

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { globalFilter, sorting, grouping, columnFilters, columnOrder, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onGroupingChange: setGrouping,
    onColumnFiltersChange: setColumnFilters,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
  })

  const runtimeDashboardViews = useMemo(
    () => getRuntimeDashboardViews(persistedDashboardViews, dashboardScope, sourceColumnIds),
    [dashboardScope, persistedDashboardViews, sourceColumnIds],
  )
  const selectedDashboardView =
    runtimeDashboardViews.find((view) => view.id === selectedViewId) ?? runtimeDashboardViews[0]
  const currentDashboardViewState: SavedDashboardViewState = useMemo(
    () =>
      normalizeDashboardViewState(
        { columnOrder, columnVisibility, columnFilters, sorting, grouping, globalFilter },
        sourceColumnIds,
      ),
    [columnFilters, columnOrder, columnVisibility, globalFilter, grouping, sorting, sourceColumnIds],
  )
  const isSelectedViewModified = selectedDashboardView
    ? !areDashboardViewStatesEqual(currentDashboardViewState, selectedDashboardView.state, sourceColumnIds)
    : false

  const applyDashboardView = useCallback(
    (view: RuntimeDashboardView) => {
      const normalizedState = normalizeDashboardViewState(view.state, sourceColumnIds)

      setGlobalFilter(normalizedState.globalFilter)
      setSorting(normalizedState.sorting)
      setGrouping(normalizedState.grouping)
      setColumnFilters(normalizedState.columnFilters)
      setColumnOrder(normalizedState.columnOrder)
      setColumnVisibility(normalizedState.columnVisibility)
      setSelectedViewId(view.id)
      setOpenMenuColumnId(null)
    },
    [sourceColumnIds],
  )

  useEffect(() => {
    if (hasAppliedInitialDefaultRef.current === dashboardScope) return

    const defaultViewId = resolveDefaultDashboardViewId(persistedDashboardViews, dashboardScope)
    const defaultView = runtimeDashboardViews.find((view) => view.id === defaultViewId) ?? runtimeDashboardViews[0]

    if (defaultView) {
      applyDashboardView(defaultView)
      hasAppliedInitialDefaultRef.current = dashboardScope
    }
  }, [applyDashboardView, dashboardScope, persistedDashboardViews, runtimeDashboardViews])

  useEffect(() => {
    setHasUnsavedDashboardChanges(isSelectedViewModified)

    return () => setHasUnsavedDashboardChanges(false)
  }, [isSelectedViewModified, setHasUnsavedDashboardChanges])

  const openSaveFlow = useCallback((onSuccess?: () => void) => {
    setSaveSuccessContinuation(() => onSuccess ?? null)
    setIsSaveDialogOpen(true)
  }, [])

  useEffect(() => {
    if (isSelectedViewModified) {
      setSaveUnsavedDashboardChanges(openSaveFlow)
    } else {
      setSaveUnsavedDashboardChanges(null)
    }

    return () => setSaveUnsavedDashboardChanges(null)
  }, [isSelectedViewModified, openSaveFlow, setSaveUnsavedDashboardChanges])

  function completeSave(nextSelectedViewId?: string) {
    setIsSaveDialogOpen(false)
    if (nextSelectedViewId) {
      setSelectedViewId(nextSelectedViewId)
    }

    const continuation = saveSuccessContinuation
    setSaveSuccessContinuation(null)
    continuation?.()
  }

  function persistAndSetDashboardViews(nextDashboardViews: typeof persistedDashboardViews) {
    persistDashboardViews(nextDashboardViews)
    setPersistedDashboardViews(nextDashboardViews)
  }

  function saveAsNewView(name: string, setAsDefault: boolean): string | null {
    try {
      const { dashboardViews, view } = addDashboardView(
        persistedDashboardViews,
        dashboardScope,
        name,
        currentDashboardViewState,
        setAsDefault,
      )

      persistAndSetDashboardViews(dashboardViews)
      completeSave(view.id)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to save dashboard view.'
    }
  }

  function saveExistingView(setAsDefault: boolean): string | null {
    if (!selectedDashboardView || selectedDashboardView.isFullDashboard) {
      return 'Full Dashboard cannot be overwritten. Save these changes as a new view.'
    }

    try {
      const dashboardViews = updateDashboardView(
        persistedDashboardViews,
        dashboardScope,
        selectedDashboardView.id,
        currentDashboardViewState,
        setAsDefault,
      )

      persistAndSetDashboardViews(dashboardViews)
      completeSave(selectedDashboardView.id)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to update dashboard view.'
    }
  }

  function setSelectedViewAsDefault(): string | null {
    if (!selectedDashboardView) return 'Select a dashboard view first.'
  
    try {
      const dashboardViews = setDefaultDashboardView(
        persistedDashboardViews,
        dashboardScope,
        selectedDashboardView.id,
      )
      persistAndSetDashboardViews(dashboardViews)
      completeSave(selectedDashboardView.id)
      return null
    } catch (error) {
      return error instanceof Error ? error.message : 'Unable to set default dashboard view.'
    }
  }

  function handleSaveCancel() {
    setIsSaveDialogOpen(false)
    setSaveSuccessContinuation(null)
  }

  function handleViewSelection(nextViewId: string) {
    if (nextViewId === selectedViewId) return

    if (isSelectedViewModified) {
      setPendingViewId(nextViewId)
      return
    }

    const nextView = runtimeDashboardViews.find((view) => view.id === nextViewId)
    if (nextView) {
      applyDashboardView(nextView)
    }
  }

  function discardChangesAndApplyPendingView() {
    if (!pendingViewId) return

    const nextView = runtimeDashboardViews.find((view) => view.id === pendingViewId)
    setPendingViewId(null)

    if (nextView) {
      applyDashboardView(nextView)
    }
  }

  function saveChangesAndApplyPendingView() {
    if (!pendingViewId) return

    const nextViewId = pendingViewId
    openSaveFlow(() => {
      const nextView = runtimeDashboardViews.find((view) => view.id === nextViewId)
      setPendingViewId(null)

      if (nextView) {
        applyDashboardView(nextView)
      }
    })
  }

  function revertSelectedView() {
    if (selectedDashboardView) {
      applyDashboardView(selectedDashboardView)
    }
  }

  function updateColumnOrder(sourceColumnId: string, targetColumnId: string, placement: ColumnDropPlacement = 'before') {
    setColumnOrder((currentColumnOrder) => moveColumn(currentColumnOrder, sourceColumnId, targetColumnId, placement))
  }

  function moveColumnByOffset(columnId: string, offset: -1 | 1) {
    setColumnOrder((currentColumnOrder) => {
      const columnIndex = currentColumnOrder.indexOf(columnId)
      const targetColumnId = currentColumnOrder[columnIndex + offset]

      if (!targetColumnId) return currentColumnOrder

      return moveColumn(currentColumnOrder, columnId, targetColumnId, offset === 1 ? 'after' : 'before')
    })
  }

  function handleColumnDragStart(event: DragEvent<HTMLButtonElement>, columnId: string) {
    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData(COLUMN_DRAG_DATA_TYPE, columnId)
    setDraggedColumnId(columnId)
    setOpenMenuColumnId(null)
  }

  function handleColumnDragOver(event: DragEvent<HTMLTableCellElement>, columnId: string) {
    const sourceColumnId = event.dataTransfer.getData(COLUMN_DRAG_DATA_TYPE) || draggedColumnId

    if (!sourceColumnId || sourceColumnId === columnId) return

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragOverColumnId(columnId)
  }

  function handleColumnDrop(event: DragEvent<HTMLTableCellElement>, targetColumnId: string) {
    event.preventDefault()
    const sourceColumnId = event.dataTransfer.getData(COLUMN_DRAG_DATA_TYPE) || draggedColumnId

    if (sourceColumnId) {
      const targetRect = event.currentTarget.getBoundingClientRect()
      const placement = event.clientX > targetRect.left + targetRect.width / 2 ? 'after' : 'before'
      updateColumnOrder(sourceColumnId, targetColumnId, placement)
    }

    setDraggedColumnId(null)
    setDragOverColumnId(null)
  }

  function handleColumnReorderKeyDown(event: KeyboardEvent<HTMLButtonElement>, columnId: string) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return

    event.preventDefault()
    event.stopPropagation()
    moveColumnByOffset(columnId, event.key === 'ArrowRight' ? 1 : -1)
  }

  const canOpenSaveFlow = Boolean(selectedDashboardView && (isSelectedViewModified || !selectedDashboardView.isDefault))

const activeColumnFilterCount = columnFilters.length
const hasGlobalSearch = globalFilter.trim().length > 0
const activeFilterAndSearchCount = activeColumnFilterCount + (hasGlobalSearch ? 1 : 0)

const hiddenFilteredColumns = table
  .getAllLeafColumns()
  .filter((column) => !column.getIsVisible() && column.getIsFiltered())

const hiddenFilteredColumnNames = hiddenFilteredColumns.map((column) =>
  String(column.columnDef.header),
)

function clearAllColumnFilters() {
  setColumnFilters([])
}

function clearGlobalSearch() {
  setGlobalFilter('')
}

function clearAllFiltersAndSearch() {
  setColumnFilters([])
  setGlobalFilter('')
}

  function exportCsv() {
    const visibleColumns = table.getVisibleLeafColumns()
    const header = visibleColumns.map((column) => column.columnDef.header as string).join(',')
    const lines = table.getFilteredRowModel().rows.map((row) =>
      visibleColumns
        .map((column) => {
          const value = String(row.getValue(column.id) ?? '')
          return `"${value.replaceAll('"', '""')}"`
        })
        .join(','),
    )
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${title.toLowerCase().replaceAll(' ', '-')}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {pendingViewId ? (
        <UnsavedChangesDialog
          onSave={saveChangesAndApplyPendingView}
          onDiscardChanges={discardChangesAndApplyPendingView}
          onCancel={() => setPendingViewId(null)}
        />
      ) : null}
      {isSaveDialogOpen && selectedDashboardView ? (
        <SaveDashboardViewDialog
          selectedView={selectedDashboardView}
          isModified={isSelectedViewModified}
          hasNameConflict={(name) => hasDashboardViewNameConflict(persistedDashboardViews, dashboardScope, name)}
          onCancel={handleSaveCancel}
          onSaveAsNew={saveAsNewView}
          onUpdateExisting={saveExistingView}
          onSetDefault={setSelectedViewAsDefault}
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sf-text-muted">
          <span className="font-semibold text-sf-text">{title}</span>
          {' · '}Showing {table.getFilteredRowModel().rows.length} record
          {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
        </p>
        {toolbar}
      </div>

      <div className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-sf-text-muted">View</span>
            <select
              className="rounded border border-sf-border px-2 py-1"
              value={selectedDashboardView?.id ?? FULL_DASHBOARD_VIEW_ID}
              onChange={(event) => handleViewSelection(event.target.value)}
            >
              {runtimeDashboardViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                  {view.isDefault ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </label>

          {selectedDashboardView ? (
            <span className="text-sm text-sf-text-muted">
              {selectedDashboardView.name}
              {isSelectedViewModified ? ' (modified)' : ''}
            </span>
          ) : null}

          {selectedDashboardView ? (
            <button
              type="button"
              className="rounded border border-sf-border px-3 py-1 hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted disabled:hover:bg-white"
              disabled={!canOpenSaveFlow}
              title={canOpenSaveFlow ? 'Save dashboard view changes' : 'No dashboard view changes to save'}
              onClick={() => openSaveFlow()}
            >
              Save
            </button>
          ) : null}

          {isSelectedViewModified ? (
            <button type="button" onClick={revertSelectedView} className="rounded border border-sf-border px-3 py-1">
              Revert
            </button>
          ) : null}

<div className="flex flex-wrap items-center gap-2">
            <input
              placeholder="Search"
              className="rounded border border-sf-border px-2 py-1"
              value={globalFilter}
              onChange={(event) => setGlobalFilter(event.target.value)}
            />
            <span
              className={joinClassNames(
                'rounded-full border px-2 py-0.5 text-xs font-semibold',
                activeFilterAndSearchCount > 0
                  ? 'border-sf-brand bg-sf-brand/10 text-sf-brand'
                  : 'border-sf-border text-sf-text-muted',
              )}
              title={`${activeColumnFilterCount} column filter${activeColumnFilterCount === 1 ? '' : 's'} and ${
                hasGlobalSearch ? 1 : 0
              } global search active`}
            >
              Filters ({activeFilterAndSearchCount})
            </span>
            <button
              type="button"
              className="rounded border border-sf-border px-3 py-1 hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted disabled:hover:bg-white"
              disabled={activeColumnFilterCount === 0}
              onClick={clearAllColumnFilters}
            >
              Clear All Column Filters
            </button>
            <button
              type="button"
              className="rounded border border-sf-border px-3 py-1 hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted disabled:hover:bg-white"
              disabled={!hasGlobalSearch}
              onClick={clearGlobalSearch}
            >
              Clear Global Search
            </button>
            <button
              type="button"
              className="rounded border border-sf-border px-3 py-1 hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted disabled:hover:bg-white"
              disabled={activeFilterAndSearchCount === 0}
              onClick={clearAllFiltersAndSearch}
            >
              Clear All Filters/Search
            </button>
          </div>

          <button type="button" onClick={exportCsv} className="rounded border border-sf-border px-3 py-1">
            Export CSV
          </button>
        </div>

        <details>
          <summary className="cursor-pointer text-sm text-sf-text-muted">Show / hide columns</summary>
          <div className="mt-2 flex flex-wrap gap-3">
            {table.getAllLeafColumns().map((column) => (
              <label key={column.id} className="inline-flex items-center gap-1 text-sm">
                <input type="checkbox" checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} />
                {String(column.columnDef.header)}
              </label>
            ))}
          </div>
        </details>

        {hiddenFilteredColumns.length > 0 ? (
          <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            <span className="font-semibold">Hidden filtered columns:</span> {hiddenFilteredColumnNames.join(', ')}.
            {' '}These hidden columns are still filtering the visible records.
          </div>
        ) : null}  

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-sf-border text-sm">
            <thead className="bg-sf-surface-alt text-left">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sourceColumn = columns.find((column) => column.id === header.column.id)

                    return (
                      <th
                        key={header.id}
                        className={joinClassNames(
                          'whitespace-nowrap px-3 py-2 font-semibold text-sf-text transition-colors',
                          draggedColumnId === header.column.id && 'opacity-60',
                          dragOverColumnId === header.column.id &&
                            draggedColumnId !== header.column.id &&
                            'bg-blue-50 ring-2 ring-inset ring-sf-brand',
                        )}
                        onDragOver={(event) => handleColumnDragOver(event, header.column.id)}
                        onDragLeave={() =>
                          setDragOverColumnId((columnId) => (columnId === header.column.id ? null : columnId))
                        }
                        onDrop={(event) => handleColumnDrop(event, header.column.id)}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              className="cursor-grab rounded border border-transparent px-1 text-sf-text-muted hover:border-sf-border hover:bg-white active:cursor-grabbing"
                              title={`Drag ${String(header.column.columnDef.header)} column to reorder`}
                              aria-label={`Drag ${String(header.column.columnDef.header)} column to reorder. Use left and right arrow keys to move it.`}
                              draggable
                              onClick={(event) => event.stopPropagation()}
                              onDragStart={(event) => handleColumnDragStart(event, header.column.id)}
                              onDragEnd={() => {
                                setDraggedColumnId(null)
                                setDragOverColumnId(null)
                              }}
                              onKeyDown={(event) => handleColumnReorderKeyDown(event, header.column.id)}
                            >
                              ⋮⋮
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1"
                              onClick={header.column.getToggleSortingHandler()}
                            >
                              {flexRender(header.column.columnDef.header, header.getContext())}
                              {header.column.getIsFiltered() ? (
                                <span
                                  className="inline-flex text-sf-brand"
                                  title={`${String(header.column.columnDef.header)} column is filtered`}
                                >
                                  <span className="sr-only">Filtered</span>
                                  <FilterFunnelIcon className="h-3.5 w-3.5" />
                                </span>
                              ) : null}  
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
                              setSorting={setSorting}
                              isOpen={openMenuColumnId === header.column.id}
                              onToggle={() =>
                                setOpenMenuColumnId((columnId) =>
                                  columnId === header.column.id ? null : header.column.id,
                                )
                              }
                              onClose={() => setOpenMenuColumnId(null)}
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
