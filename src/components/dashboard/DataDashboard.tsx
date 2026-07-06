import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, Dispatch, DragEvent, FormEvent, KeyboardEvent, ReactNode, SetStateAction } from 'react'
import {
  Eye,
  Pencil,
} from 'lucide-react'
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
  type Row,
  type SortingState,
  type VisibilityState,
} from '@tanstack/react-table'
import {
  FULL_DASHBOARD_VIEW_ID,
  addDashboardView,
  areDashboardViewStatesEqual,
  deleteDashboardView,
  duplicateDashboardView,
  getRuntimeDashboardViews,
  hasDashboardViewNameConflict,
  loadDashboardViews,
  normalizeDashboardViewState,
  persistDashboardViews,
  resolveDefaultDashboardViewId,
  setDefaultDashboardView,
  updateDashboardView,
  renameDashboardView,
  type DashboardViewScope,
  type RuntimeDashboardView,
  type SavedDashboardViewState,
} from '@/store/dashboardViews'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { AlertStatusIcon, ClampedTableCellContent, RecordChangeBadge, recordChangeState } from '@/components/ui'
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
  replaceable?: boolean
  options?: string[]
}



interface DataDashboardProps<T extends { id: string }> {
  title: string
  dashboardScope: DashboardViewScope
  rows: T[]
  columns: DashboardColumn<T>[]
  onView?: (row: T) => void
  onEditRecord?: (row: T) => void
  onEdit?: (row: T, columnId: string, value: string) => void
  getRowClassName?: (row: T) => string
  toolbar?: ReactNode
  enableInlineEditing?: boolean
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
const ACTION_COLUMN_ID = '__actions'
const ROW_INDICATOR_COLUMN_ID = '__rowIndicator'

function joinClassNames(...classNames: Array<string | false | undefined>): string {
  return classNames.filter(Boolean).join(' ')
}

function RowIndicator({ row }: { row: unknown }) {
  return <RecordChangeBadge record={row as { createdAt?: string; updatedAt?: string }} placeholder />
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
        aria-modal="false"
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

interface ViewActionsMenuProps {
  selectedView: RuntimeDashboardView
  onRename: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function ViewActionsMenu({ selectedView, onRename, onDuplicate, onDelete }: ViewActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuWrapperRef = useRef<HTMLDivElement>(null)
  const isFullDashboard = selectedView.isFullDashboard

  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!menuWrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  function closeAfterAction(action: () => void) {
    setIsOpen(false)
    action()
  }

  return (
    <div ref={menuWrapperRef} className="relative inline-flex">
      <button
        type="button"
        className="rounded border border-sf-border px-3 py-1 hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted disabled:hover:bg-white"
        disabled={isFullDashboard}
        title={
          isFullDashboard
            ? 'Full Dashboard cannot be renamed, duplicated, or deleted.'
            : 'Open saved view actions'
        }
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((isVisible) => !isVisible)}
      >
        View Actions ▾
      </button>

      {isOpen && !isFullDashboard ? (
        <div
          className="absolute left-0 top-full z-30 mt-1 w-44 rounded border border-sf-border bg-white p-1 text-sm shadow-lg"
          role="menu"
          aria-label="Saved view actions"
        >
          <button
            type="button"
            className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt"
            role="menuitem"
            onClick={() => closeAfterAction(onRename)}
          >
            Rename View
          </button>
          <button
            type="button"
            className="block w-full rounded px-2 py-1 text-left hover:bg-sf-surface-alt"
            role="menuitem"
            onClick={() => closeAfterAction(onDuplicate)}
          >
            Duplicate View
          </button>
          <button
            type="button"
            className="block w-full rounded px-2 py-1 text-left text-red-700 hover:bg-red-50"
            role="menuitem"
            onClick={() => closeAfterAction(onDelete)}
          >
            Delete View
          </button>
        </div>
      ) : null}
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
  const selectedFilterValues = Array.isArray(column.getFilterValue())
    ? (column.getFilterValue() as string[])
    : column.getFilterValue()
      ? [String(column.getFilterValue())]
      : []

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

  function toggleFilterValue(value: string) {
    const nextValues = selectedFilterValues.includes(value)
      ? selectedFilterValues.filter((selectedValue) => selectedValue !== value)
      : [...selectedFilterValues, value]
    column.setFilterValue(nextValues.length > 0 ? nextValues : undefined)
  }

  function selectAllFilterValues() {
    column.setFilterValue(filterOptions.length > 0 ? filterOptions : undefined)
  }

  function clearFilterValues() {
    column.setFilterValue(undefined)
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
            <div className="rounded border border-sf-border bg-white p-2 text-sm font-normal normal-case text-sf-text">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-sf-text-muted">
                  {selectedFilterValues.length > 0 ? `${selectedFilterValues.length} selected` : 'All values'}
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="rounded border border-sf-border px-1.5 py-0.5 text-xs hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
                    disabled={!column.getCanFilter() || filterOptions.length === 0}
                    onClick={selectAllFilterValues}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="rounded border border-sf-border px-1.5 py-0.5 text-xs hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted"
                    disabled={!column.getCanFilter() || selectedFilterValues.length === 0}
                    onClick={clearFilterValues}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                {filterOptions.length > 0 ? (
                  filterOptions.map((option) => (
                    <label key={option} className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-sf-surface-alt">
                      <input
                        type="checkbox"
                        disabled={!column.getCanFilter()}
                        checked={selectedFilterValues.includes(option)}
                        onChange={() => toggleFilterValue(option)}
                      />
                      <span className="truncate" title={option}>{option}</span>
                    </label>
                  ))
                ) : (
                  <p className="px-1.5 py-1 text-xs text-sf-text-muted">No filter values</p>
                )}
              </div>
            </div>
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
  onView,
  onEditRecord,
  onEdit,
  getRowClassName,
  toolbar,
  enableInlineEditing = true,
}: DataDashboardProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [grouping, setGrouping] = useState<GroupingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnOrder, setColumnOrder] = useState<ColumnOrderState>(() => [ROW_INDICATOR_COLUMN_ID, ...columns.map((column) => column.id)])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() =>
    Object.fromEntries([ROW_INDICATOR_COLUMN_ID, ...columns.map((column) => column.id)].map((columnId) => [columnId, true])),
  )
  const [dashboardUndoStack, setDashboardUndoStack] = useState<SavedDashboardViewState[]>([])
  const [openMenuColumnId, setOpenMenuColumnId] = useState<string | null>(null)
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null)
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null)
  const sourceColumnIds = useMemo(() => [ROW_INDICATOR_COLUMN_ID, ...columns.map((column) => column.id)], [columns])
  const [persistedDashboardViews, setPersistedDashboardViews] = useState(() => loadDashboardViews())
  const [selectedViewId, setSelectedViewId] = useState(FULL_DASHBOARD_VIEW_ID)
  const [pendingViewId, setPendingViewId] = useState<string | null>(null)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [saveSuccessContinuation, setSaveSuccessContinuation] = useState<(() => void) | null>(null)
  const [replaceColumnId, setReplaceColumnId] = useState(columns.find((column) => column.editable)?.id ?? columns[0]?.id ?? '')
  const [replaceFindValue, setReplaceFindValue] = useState('')
  const [replaceValue, setReplaceValue] = useState('')
  const [isReplaceDialogOpen, setIsReplaceDialogOpen] = useState(false)
  const hasAppliedInitialDefaultRef = useRef<DashboardViewScope | null>(null)
  const tableContainerRef = useRef<HTMLDivElement | null>(null)
  const [frozenColumnOffsets, setFrozenColumnOffsets] = useState<number[]>([0, 0, 0])
  const [isFreezeEnabled, setIsFreezeEnabled] = useState(false)
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())
  const isApplyingDashboardUndoRef = useRef(false)
  const setHasUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.setHasUnsavedDashboardChanges)
  const setSaveUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.setSaveUnsavedDashboardChanges)

  const dashboardViewStateSnapshot = useCallback(
    () =>
      normalizeDashboardViewState(
        { columnOrder, columnVisibility, columnFilters, sorting, grouping, globalFilter },
        sourceColumnIds,
      ),
    [columnFilters, columnOrder, columnVisibility, globalFilter, grouping, sorting, sourceColumnIds],
  )

  function recordDashboardUndoSnapshot() {
    if (isApplyingDashboardUndoRef.current) return
    const snapshot = dashboardViewStateSnapshot()
    setDashboardUndoStack((current) =>
      current.length > 0 && areDashboardViewStatesEqual(current[current.length - 1], snapshot, sourceColumnIds)
        ? current
        : [...current, snapshot],
    )
  }

  function updateDashboardState<TState>(
    setState: Dispatch<SetStateAction<TState>>,
    updater: SetStateAction<TState>,
  ) {
    recordDashboardUndoSnapshot()
    setState(updater)
  }

  function applyDashboardViewState(state: SavedDashboardViewState) {
    const normalizedState = normalizeDashboardViewState(state, sourceColumnIds)
    isApplyingDashboardUndoRef.current = true
    setGlobalFilter(normalizedState.globalFilter)
    setSorting(normalizedState.sorting)
    setGrouping(normalizedState.grouping)
    setColumnFilters(normalizedState.columnFilters)
    setColumnOrder(normalizedState.columnOrder)
    setColumnVisibility(normalizedState.columnVisibility)
    window.setTimeout(() => {
      isApplyingDashboardUndoRef.current = false
    }, 0)
  }

  useEffect(() => {
    setColumnOrder((currentColumnOrder) => {
      const nextSourceColumnIdSet = new Set(sourceColumnIds)
      const preservedColumnOrder = currentColumnOrder.filter((columnId) => nextSourceColumnIdSet.has(columnId))
      const newColumnIds = sourceColumnIds.filter((columnId) => !preservedColumnOrder.includes(columnId))

      return [...preservedColumnOrder, ...newColumnIds]
    })
  }, [sourceColumnIds])

  useEffect(() => {
    setCollapsedGroupIds(new Set())
  }, [grouping])

  const internalColumnOrder = useMemo(
    () => [ACTION_COLUMN_ID, ...columnOrder.filter((columnId) => columnId !== ACTION_COLUMN_ID)],
    [columnOrder],
  )
  const internalColumnVisibility = useMemo(
    () => ({ ...columnVisibility, [ACTION_COLUMN_ID]: true }),
    [columnVisibility],
  )

  const tableColumns = useMemo<ColumnDef<T>[]>(
    () => [
      {
        id: ACTION_COLUMN_ID,
        header: 'Actions',
        accessorFn: () => '',
        enableSorting: false,
        enableGrouping: false,
        enableColumnFilter: false,
        enableHiding: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded border border-sf-border bg-white px-2 text-sf-text hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
              title="View"
              aria-label="View record"
              disabled={!onView}
              onClick={(event) => {
                event.stopPropagation()
                onView?.(row.original)
              }}
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
              <span>View</span>
            </button>
            <button
              type="button"
              className="inline-flex h-7 items-center gap-1 rounded border border-sf-border bg-white px-2 text-sf-text hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:opacity-40"
              title="Edit"
              aria-label="Edit record"
              disabled={!onEditRecord}
              onClick={(event) => {
                event.stopPropagation()
                onEditRecord?.(row.original)
              }}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              <span>Edit</span>
            </button>
          </div>
        ),
      },
      {
        id: ROW_INDICATOR_COLUMN_ID,
        header: '',
        accessorFn: (row) => recordChangeState(row as { createdAt?: string; updatedAt?: string }) ?? '',
        enableSorting: true,
        enableGrouping: false,
        enableColumnFilter: true,
        cell: ({ row }) => <RowIndicator row={row.original} />,
      },
      ...columns.map((column): ColumnDef<T> => ({
        id: column.id,
        header: column.label,
        accessorFn: (row) => String(column.getValue(row) ?? ''),
        enableSorting: column.sortable !== false,
        enableGrouping: column.groupable !== false,
        enableColumnFilter: column.filterable !== false,
        filterFn: (row, columnId, filterValue) => {
          if (!filterValue) return true
          const rowValue = String(row.getValue(columnId) ?? '')
          if (Array.isArray(filterValue)) {
            return filterValue.length === 0 || filterValue.map(String).includes(rowValue)
          }
          return rowValue === String(filterValue)
        },
        cell: ({ row }) => {
          const raw = String(column.getValue(row.original) ?? '')

          if (enableInlineEditing && column.editable && onEdit) {
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

          const renderedValue = column.render?.(row.original) ?? raw

          return (
            <ClampedTableCellContent title={raw}>
              {renderedValue || '-'}
            </ClampedTableCellContent>
          )
        },
      })),
    ],
    [columns, enableInlineEditing, onEdit, onEditRecord, onView],
  )

  const table = useReactTable({
    data: rows,
    columns: tableColumns,
    state: { globalFilter, sorting, grouping, columnFilters, columnOrder: internalColumnOrder, columnVisibility: internalColumnVisibility },
    onGlobalFilterChange: (updater) => updateDashboardState(setGlobalFilter, updater),
    onSortingChange: (updater) => updateDashboardState(setSorting, updater),
    onGroupingChange: (updater) => updateDashboardState(setGrouping, updater),
    onColumnFiltersChange: (updater) => updateDashboardState(setColumnFilters, updater),
    onColumnOrderChange: (updater) =>
      updateDashboardState(setColumnOrder, (current) => {
        const nextColumnOrder = typeof updater === 'function'
          ? updater([ACTION_COLUMN_ID, ...current])
          : updater
        return nextColumnOrder.filter((columnId) => columnId !== ACTION_COLUMN_ID)
      }),
    onColumnVisibilityChange: (updater) =>
      updateDashboardState(setColumnVisibility, (current) => {
        const nextColumnVisibility = typeof updater === 'function'
          ? updater({ ...current, [ACTION_COLUMN_ID]: true })
          : updater
        const { [ACTION_COLUMN_ID]: _actionVisibility, ...userColumnVisibility } = nextColumnVisibility
        return userColumnVisibility
      }),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
  })

  useLayoutEffect(() => {
    if (!isFreezeEnabled) {
      setFrozenColumnOffsets((currentOffsets) =>
        currentOffsets.every((offset) => offset === 0) ? currentOffsets : [0, 0, 0],
      )
      return
    }

    const container = tableContainerRef.current
    if (!container) return

    const measureFrozenColumns = () => {
      const headers = Array.from(container.querySelectorAll('thead th')).slice(0, 3) as HTMLElement[]
      const offsets = headers.reduce<number[]>((nextOffsets, _header, index) => {
        nextOffsets[index] = index === 0 ? 0 : (nextOffsets[index - 1] ?? 0) + (headers[index - 1]?.offsetWidth ?? 0)
        return nextOffsets
      }, [])
      const nextOffsets = [offsets[0] ?? 0, offsets[1] ?? 0, offsets[2] ?? 0]
      setFrozenColumnOffsets((currentOffsets) =>
        currentOffsets.every((offset, index) => offset === nextOffsets[index]) ? currentOffsets : nextOffsets,
      )
    }

    measureFrozenColumns()
    if (typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(measureFrozenColumns)
    observer.observe(container)
    return () => observer.disconnect()
  }, [columnOrder, columnVisibility, rows.length, isFreezeEnabled])

  function columnPositionStyle(index: number, columnId: string): CSSProperties | undefined {
    if (columnId === ACTION_COLUMN_ID) return { insetInlineStart: 0 }
    return isFreezeEnabled && index < 3 ? { left: frozenColumnOffsets[index] ?? 0 } : undefined
  }

  function frozenColumnClassName(index: number, isHeader = false, columnId = ''): string {
    if (columnId === ACTION_COLUMN_ID) {
      return joinClassNames(
        'sticky shadow-[1px_0_0_0_var(--tw-shadow-color)] shadow-sf-border',
        isHeader ? 'z-40 bg-sf-surface-alt' : 'z-30 bg-inherit',
      )
    }
    if (!isFreezeEnabled || index >= 3) return ''
    const isLastFrozenColumn = index === 2
    return joinClassNames(
      'sticky',
      isLastFrozenColumn
        ? 'relative shadow-[4px_0_0_0_rgba(16,185,129,0.85)] after:absolute after:right-0 after:top-0 after:h-full after:w-1 after:bg-emerald-500 after:content-[""]'
        : 'shadow-[1px_0_0_0_var(--tw-shadow-color)] shadow-sf-border',
      isHeader ? 'z-30 bg-sf-surface-alt' : 'z-20 bg-inherit',
    )
  }

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
  const replaceColumns = useMemo(
    () => columns.filter((column) => (column.replaceable ?? Boolean(column.editKey)) && onEdit),
    [columns, onEdit],
  )
  const replaceColumn = replaceColumns.find((column) => column.id === replaceColumnId) ?? replaceColumns[0]
  const replaceMatchCount = replaceColumn
    ? rows.filter((row) => String(replaceColumn.getValue(row) ?? '') === replaceFindValue).length
    : 0

  const applyDashboardView = useCallback(
    (view: RuntimeDashboardView) => {
      applyDashboardViewState(view.state)
      setDashboardUndoStack([])
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

  function renameSelectedView() {
    if (!selectedDashboardView) return

    if (selectedDashboardView.isFullDashboard) {
      window.alert('Full Dashboard cannot be renamed.')
      return
    }

    const nextName = window.prompt('Rename View', selectedDashboardView.name)
    if (nextName === null) return

    try {
      const dashboardViews = renameDashboardView(
        persistedDashboardViews,
        dashboardScope,
        selectedDashboardView.id,
        nextName,
      )

      persistAndSetDashboardViews(dashboardViews)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to rename dashboard view.')
    }
  }

  function duplicateSelectedView() {
    if (!selectedDashboardView) return

    if (selectedDashboardView.isFullDashboard) {
      window.alert('Full Dashboard cannot be duplicated.')
      return
    }

    const nextName = window.prompt('Duplicate View', `Copy of ${selectedDashboardView.name}`)
    if (nextName === null) return

    try {
      const { dashboardViews, view } = duplicateDashboardView(
        persistedDashboardViews,
        dashboardScope,
        selectedDashboardView.id,
        nextName,
      )

      persistAndSetDashboardViews(dashboardViews)
      setSelectedViewId(view.id)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to duplicate dashboard view.')
    }
  }

  function deleteSelectedView() {
    if (!selectedDashboardView) return

    if (selectedDashboardView.isFullDashboard) {
      window.alert('Full Dashboard cannot be deleted.')
      return
    }

    const confirmationMessage = isSelectedViewModified
      ? 'This view has unsaved changes.\n\nDeleting this view will:\n- permanently remove the saved view\n- discard all unsaved changes\n- switch back to Full Dashboard\n\nContinue?'
      : `Delete “${selectedDashboardView.name}”?\n\nThis will permanently remove the saved view and switch back to Full Dashboard.\n\nContinue?`

    if (!window.confirm(confirmationMessage)) return

    try {
      const dashboardViews = deleteDashboardView(persistedDashboardViews, dashboardScope, selectedDashboardView.id)
      const fullDashboardView = runtimeDashboardViews.find((view) => view.id === FULL_DASHBOARD_VIEW_ID)

      persistAndSetDashboardViews(dashboardViews)

      if (fullDashboardView) {
        applyDashboardView(fullDashboardView)
      } else {
        setSelectedViewId(FULL_DASHBOARD_VIEW_ID)
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to delete dashboard view.')
    }
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

  function undoDashboardChange() {
    setDashboardUndoStack((current) => {
      const previous = current[current.length - 1]
      if (!previous) return current
      applyDashboardViewState(previous)
      return current.slice(0, -1)
    })
  }

  function updateColumnOrder(sourceColumnId: string, targetColumnId: string, placement: ColumnDropPlacement = 'before') {
    updateDashboardState(setColumnOrder, (currentColumnOrder) => moveColumn(currentColumnOrder, sourceColumnId, targetColumnId, placement))
  }

  function moveColumnByOffset(columnId: string, offset: -1 | 1) {
    updateDashboardState(setColumnOrder, (currentColumnOrder) => {
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

  function clearAllFiltersAndSearch() {
    recordDashboardUndoSnapshot()
    setColumnFilters([])
    setGlobalFilter('')
  }

  function dashboardRowClassName(row: T): string {
    return getRowClassName?.(row) || 'bg-white hover:bg-sf-surface-alt'
  }

  function groupTitle(row: Row<T>): string {
    const column = table.getAllLeafColumns().find((candidate) => candidate.id === row.groupingColumnId)
    const categoryName = column ? String(column.columnDef.header) : row.groupingColumnId ?? 'Group'
    return `${categoryName} - ${String(row.groupingValue ?? 'Not set')}, Count: ${row.subRows.length}`
  }

  function groupSummaryLabel(): string {
    const groupColumnId = grouping[0]
    if (!groupColumnId) return 'Group'
    const column = table.getAllLeafColumns().find((candidate) => candidate.id === groupColumnId)
    return column ? String(column.columnDef.header) : groupColumnId
  }

  function splitSummaryValues(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String).map((part) => part.trim()).filter(Boolean)
    return String(value ?? '')
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
  }

  function groupSummaryCountColumns(): Array<{ key: string; columnId: string; label: string; value: string }> {
    const groupColumnId = grouping[0]
    if (!groupColumnId) return []
    return table.getVisibleLeafColumns()
      .filter((column) => column.id !== ROW_INDICATOR_COLUMN_ID && column.id !== groupColumnId)
      .flatMap((column) => {
        const values = table.getFilteredRowModel().rows.flatMap((row) => splitSummaryValues(row.getValue(column.id)))
        const uniqueValues = Array.from(new Set(values)).sort((first, second) => first.localeCompare(second))
        if (uniqueValues.length === 0 || uniqueValues.length > 8) return []
        return uniqueValues.map((value) => ({
          key: `${column.id}:${value}`,
          columnId: column.id,
          label: `${String(column.columnDef.header)}: ${value}`,
          value,
        }))
      })
      .slice(0, 12)
  }

  function groupSummaryRows(): Array<{ value: string; count: number; counts: Record<string, number> }> {
    const groupColumnId = grouping[0]
    if (!groupColumnId) return []
    const summaryColumns = groupSummaryCountColumns()
    const rowsByValue = new Map<string, Array<Row<T>>>()
    table.getFilteredRowModel().rows.forEach((row) => {
      const value = String(row.getValue(groupColumnId) ?? 'Not set') || 'Not set'
      rowsByValue.set(value, [...(rowsByValue.get(value) ?? []), row])
    })

    return Array.from(rowsByValue.entries())
      .map(([value, groupedRows]) => {
        const counts: Record<string, number> = {}
        summaryColumns.forEach((summaryColumn) => {
          counts[summaryColumn.key] = groupedRows.filter((row) =>
            splitSummaryValues(row.getValue(summaryColumn.columnId)).includes(summaryColumn.value),
          ).length
        })
        return { value, count: groupedRows.length, counts }
      })
      .sort((first, second) => first.value.localeCompare(second.value))
  }

  function toggleGroup(rowId: string) {
    setCollapsedGroupIds((current) => {
      const next = new Set(current)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  function renderDashboardRows(rowsToRender: Array<Row<T>>): ReactNode[] {
    return rowsToRender.flatMap((row) => {
      if (row.getIsGrouped()) {
        const isExpanded = !collapsedGroupIds.has(row.id)
        return [
          <tr key={`${row.id}-group`} className="bg-sf-surface-alt">
            <td className="border-y border-sf-border px-3 py-2 text-sm font-semibold text-sf-text" colSpan={table.getVisibleLeafColumns().length}>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-white"
                aria-expanded={isExpanded}
                onClick={() => toggleGroup(row.id)}
              >
                <span className="text-sf-text-muted" aria-hidden="true">{isExpanded ? '▾' : '▸'}</span>
                <span>{groupTitle(row)}</span>
              </button>
            </td>
          </tr>,
          ...(isExpanded ? renderDashboardRows(row.subRows as Array<Row<T>>) : []),
        ]
      }

      return (
        <tr
          key={row.id}
          className={joinClassNames(dashboardRowClassName(row.original))}
        >
          {row.getVisibleCells().map((cell, cellIndex) => (
            <td
              key={cell.id}
              style={columnPositionStyle(cellIndex, cell.column.id)}
              className={joinClassNames('px-3 py-2 align-middle', frozenColumnClassName(cellIndex, false, cell.column.id))}
            >
              {cell.getIsPlaceholder() ? null : flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>
          ))}
        </tr>
      )
    })
  }

  function exportCsv() {
    const visibleColumns = table.getVisibleLeafColumns().filter((column) => column.id !== ACTION_COLUMN_ID)
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

  function applyReplaceAll() {
    if (!onEdit || !replaceColumn || !replaceFindValue) return
    if (replaceMatchCount === 0) return

    const confirmed = window.confirm(
      `Replace ${replaceMatchCount} exact match${replaceMatchCount === 1 ? '' : 'es'} in "${replaceColumn.label}"?`,
    )
    if (!confirmed) return

    rows
      .filter((row) => String(replaceColumn.getValue(row) ?? '') === replaceFindValue)
      .forEach((row) => onEdit(row, replaceColumn.id, replaceValue))
    setIsReplaceDialogOpen(false)
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col space-y-4 overflow-hidden">
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
      {isReplaceDialogOpen && replaceColumns.length > 0 ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 shadow-xl" role="dialog" aria-modal="false" aria-labelledby="search-replace-title">
            <h2 id="search-replace-title" className="text-lg font-semibold text-sf-text">Search & Replace</h2>
            <p className="mt-1 text-sm text-sf-text-muted">Replace exact matches in one selected dashboard field.</p>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-medium text-sf-text">
                Field / Column
                <select
                  className="mt-1 h-8 w-full rounded border border-sf-border px-2 py-1 text-sm"
                  value={replaceColumn?.id ?? ''}
                  onChange={(event) => setReplaceColumnId(event.target.value)}
                >
                  {replaceColumns.map((column) => (
                    <option key={column.id} value={column.id}>{column.label}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-sf-text">
                Exact value to find
                <input
                  className="mt-1 h-8 w-full rounded border border-sf-border px-2 py-1 text-sm"
                  value={replaceFindValue}
                  onChange={(event) => setReplaceFindValue(event.target.value)}
                />
              </label>
              <label className="block text-sm font-medium text-sf-text">
                New value
                <input
                  className="mt-1 h-8 w-full rounded border border-sf-border px-2 py-1 text-sm"
                  value={replaceValue}
                  onChange={(event) => setReplaceValue(event.target.value)}
                />
              </label>
              <div className="rounded border border-sf-border bg-sf-surface-alt px-3 py-2 text-sm text-sf-text-muted">
                {replaceMatchCount} exact match{replaceMatchCount === 1 ? '' : 'es'} found.
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => setIsReplaceDialogOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!replaceColumn || !replaceFindValue || replaceMatchCount === 0}
                onClick={applyReplaceAll}
              >
                Apply Replacement
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sf-text-muted">
          <span className="font-semibold text-sf-text">{title}</span>
          {' · '}Showing {table.getFilteredRowModel().rows.length} record
          {table.getFilteredRowModel().rows.length === 1 ? '' : 's'}
        </p>
        {toolbar}
      </div>

      <div className="sf-card flex min-h-0 flex-1 flex-col space-y-3 overflow-hidden p-3">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
            <ViewActionsMenu
              selectedView={selectedDashboardView}
              onRename={renameSelectedView}
              onDuplicate={duplicateSelectedView}
              onDelete={deleteSelectedView}
            />
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
            <button
              type="button"
              onClick={undoDashboardChange}
              disabled={dashboardUndoStack.length === 0}
              className="rounded border border-sf-border px-3 py-1 disabled:cursor-not-allowed disabled:text-sf-text-muted"
            >
              Undo
            </button>
          ) : null}

          {isSelectedViewModified ? (
            <button type="button" onClick={revertSelectedView} className="rounded border border-sf-border px-3 py-1">
              Revert
            </button>
          ) : null}

          <button
            type="button"
            aria-pressed={isFreezeEnabled}
            className={joinClassNames(
              'rounded border px-3 py-1 font-medium',
              isFreezeEnabled
                ? 'border-emerald-400 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                : 'border-sf-border text-sf-text hover:bg-sf-surface-alt',
            )}
            onClick={() => setIsFreezeEnabled((current) => !current)}
          >
            {isFreezeEnabled ? 'Unfreeze Columns' : 'Freeze Columns'}
          </button>

<div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <input
                placeholder="Search"
                className="rounded border border-sf-border px-2 py-1 pr-7"
                value={globalFilter}
                onChange={(event) => updateDashboardState(setGlobalFilter, event.target.value)}
              />
              {hasGlobalSearch ? (
                <button
                  type="button"
                  className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-sf-text-muted hover:bg-sf-surface-alt hover:text-sf-text"
                  aria-label="Clear search"
                  onClick={() => updateDashboardState<string>(setGlobalFilter, '')}
                >
                  ×
                </button>
              ) : null}
            </div>
            {activeFilterAndSearchCount > 0 ? (
              <span
                className="inline-flex items-center gap-1 rounded-full border border-sf-brand bg-sf-brand/10 px-2 py-0.5 text-xs font-semibold text-sf-brand"
                title={`${activeColumnFilterCount} column filter${activeColumnFilterCount === 1 ? '' : 's'} and ${
                  hasGlobalSearch ? 1 : 0
                } global search active`}
              >
                Filters ({activeFilterAndSearchCount})
                <button
                  type="button"
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-sf-brand/15"
                  aria-label="Clear all filters and search"
                  onClick={clearAllFiltersAndSearch}
                >
                  ×
                </button>
              </span>
            ) : null}
          </div>

          <button type="button" onClick={exportCsv} className="rounded border border-sf-border px-3 py-1">
            Export CSV
          </button>

          {replaceColumns.length > 0 ? (
            <button type="button" className="rounded border border-sf-border px-3 py-1 hover:bg-sf-surface-alt" onClick={() => setIsReplaceDialogOpen(true)}>
              Search & Replace
            </button>
          ) : null}
          {selectedDashboardView ? (
            <span className="ml-auto text-sm text-sf-text-muted">
              {selectedDashboardView.name}
              {isSelectedViewModified ? ' (modified)' : ''}
            </span>
          ) : null}
        </div>

        {hiddenFilteredColumns.length > 0 ? (
          <div className="flex items-start gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
            <AlertStatusIcon variant="warning" label="Hidden filtered columns warning" className="mt-0.5" />
            <span>
              <span className="font-semibold">Hidden filtered columns:</span> {hiddenFilteredColumnNames.join(', ')}.
              {' '}These hidden columns are still filtering the visible records.
            </span>
          </div>
        ) : null}  

        <div
          ref={tableContainerRef}
          className="min-h-0 flex-1 overflow-x-scroll overflow-y-auto border-b border-sf-border"
          style={{ scrollbarGutter: 'stable' }}
        >
          <table className="min-w-full divide-y divide-sf-border text-sm">
            <thead className="bg-sf-surface-alt text-left">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, headerIndex) => {
                    const sourceColumn = columns.find((column) => column.id === header.column.id)
                    const isActionColumn = header.column.id === ACTION_COLUMN_ID

                    return (
                      <th
                        key={header.id}
                        style={columnPositionStyle(headerIndex, header.column.id)}
                        className={joinClassNames(
                          'whitespace-nowrap px-3 py-2 font-semibold text-sf-text transition-colors',
                          'sticky top-0 z-10 bg-sf-surface-alt',
                          frozenColumnClassName(headerIndex, true, header.column.id),
                          draggedColumnId === header.column.id && 'opacity-60',
                          dragOverColumnId === header.column.id &&
                            draggedColumnId !== header.column.id &&
                            'bg-blue-50 ring-2 ring-inset ring-sf-brand',
                        )}
                        onDragOver={isActionColumn ? undefined : (event) => handleColumnDragOver(event, header.column.id)}
                        onDragLeave={() =>
                          setDragOverColumnId((columnId) => (columnId === header.column.id ? null : columnId))
                        }
                        onDrop={isActionColumn ? undefined : (event) => handleColumnDrop(event, header.column.id)}
                      >
                        {header.isPlaceholder ? null : isActionColumn ? (
                          <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        ) : (
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
                              allColumns={table.getAllLeafColumns().filter((column) => column.id !== ACTION_COLUMN_ID)}
                              sourceColumn={sourceColumn}
                              rows={rows}
                              grouping={grouping}
                              setGrouping={(nextGrouping) => updateDashboardState(setGrouping, nextGrouping)}
                              setSorting={(nextSorting) => updateDashboardState(setSorting, nextSorting)}
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
              {renderDashboardRows(table.getRowModel().rows)}
            </tbody>
            {grouping.length > 0 ? (
              <tfoot className="bg-sf-surface-alt">
                <tr>
                  <td className="border-t border-sf-border px-3 py-2 text-sm font-semibold text-sf-text" colSpan={table.getVisibleLeafColumns().length}>
                    <table className="w-auto border-collapse bg-white text-sm">
                      <thead className="bg-sf-surface-alt text-left">
                        <tr>
                          <th className="border border-sf-border px-2 py-1">{groupSummaryLabel()}</th>
                          <th className="border border-sf-border px-2 py-1 text-right">Count</th>
                          {groupSummaryCountColumns().map((summaryColumn) => (
                            <th key={summaryColumn.key} className="border border-sf-border px-2 py-1 text-right">
                              {summaryColumn.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {groupSummaryRows().map((summary) => (
                          <tr key={summary.value}>
                            <td className="border border-sf-border px-2 py-1">{summary.value}</td>
                            <td className="border border-sf-border px-2 py-1 text-right">{summary.count}</td>
                            {groupSummaryCountColumns().map((summaryColumn) => (
                              <td key={summaryColumn.key} className="border border-sf-border px-2 py-1 text-right">
                                {summary.counts[summaryColumn.key] ?? 0}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  )
}

