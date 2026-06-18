import type {
  ColumnFiltersState,
  ColumnOrderState,
  GroupingState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'
import {
  FULL_DASHBOARD_VIEW_ID,
  FULL_DASHBOARD_VIEW_NAME,
  areDashboardViewStatesEqual,
  createEmptyDashboardViews,
  createEmptyScopeViews,
  createFullDashboardView,
  createFullDashboardViewState,
  createView,
  deleteView,
  duplicateView,
  getRuntimeDashboardViews,
  hasDashboardViewNameConflict,
  normalizeDashboardViewState,
  renameView,
  resolveDefaultDashboardViewId,
  setDefaultView,
  updateView,
  type DashboardViewScope,
} from '@/domain/dashboard-view'

export const DASHBOARD_VIEWS_STORAGE_KEY = 'dpm-dashboard-views-v1'
export {
  FULL_DASHBOARD_VIEW_ID,
  FULL_DASHBOARD_VIEW_NAME,
  areDashboardViewStatesEqual,
  createEmptyDashboardViews,
  createFullDashboardView,
  createFullDashboardViewState,
  getRuntimeDashboardViews,
  hasDashboardViewNameConflict,
  normalizeDashboardViewState,
  resolveDefaultDashboardViewId,
}
export type { DashboardViewScope }

export interface SavedDashboardViewState {
  columnOrder: ColumnOrderState
  columnVisibility: VisibilityState
  columnFilters: ColumnFiltersState
  sorting: SortingState
  grouping: GroupingState
  globalFilter: string
}

export interface SavedDashboardView {
  id: string
  name: string
  state: SavedDashboardViewState
  createdAt: string
  updatedAt: string
}

export interface DashboardViewsForScope {
  defaultViewId: string
  views: SavedDashboardView[]
}

export interface PersistedDashboardViews {
  version: 1
  dashboards: Record<DashboardViewScope, DashboardViewsForScope>
}

export interface RuntimeDashboardView extends SavedDashboardView {
  isFullDashboard: boolean
  isDefault: boolean
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function sanitizeViewState(value: unknown): SavedDashboardViewState | null {
  if (!isObject(value)) return null

  const columnOrder = Array.isArray(value.columnOrder)
    ? value.columnOrder.filter((columnId): columnId is string => typeof columnId === 'string')
    : []
  const columnVisibility = isObject(value.columnVisibility)
    ? Object.fromEntries(
        Object.entries(value.columnVisibility).filter(
          (entry): entry is [string, boolean] => typeof entry[1] === 'boolean',
        ),
      )
    : {}
  const columnFilters = Array.isArray(value.columnFilters)
    ? value.columnFilters.filter(
        (filter): filter is ColumnFiltersState[number] =>
          isObject(filter) && typeof filter.id === 'string' && 'value' in filter,
      )
    : []
  const sorting = Array.isArray(value.sorting)
    ? value.sorting.filter(
        (sort): sort is SortingState[number] =>
          isObject(sort) && typeof sort.id === 'string' && typeof sort.desc === 'boolean',
      )
    : []
  const grouping = Array.isArray(value.grouping)
    ? value.grouping.filter((columnId): columnId is string => typeof columnId === 'string')
    : []
  const globalFilter = typeof value.globalFilter === 'string' ? value.globalFilter : ''

  return {
    columnOrder,
    columnVisibility,
    columnFilters,
    sorting,
    grouping,
    globalFilter,
  }
}

function sanitizeSavedView(value: unknown): SavedDashboardView | null {
  if (!isObject(value)) return null

  const id = safeString(value.id)
  const name = safeString(value.name)
  const state = sanitizeViewState(value.state)

  if (!id || id === FULL_DASHBOARD_VIEW_ID || !name || !state) return null

  return {
    id,
    name,
    state,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  }
}

function sanitizeScopeViews(value: unknown): DashboardViewsForScope {
  if (!isObject(value)) return createEmptyScopeViews()

  const views = Array.isArray(value.views)
    ? value.views.map(sanitizeSavedView).filter((view): view is SavedDashboardView => view !== null)
    : []
  const uniqueViews = views.filter(
    (view, index, allViews) => allViews.findIndex((candidate) => candidate.id === view.id) === index,
  )
  const defaultViewId =
    typeof value.defaultViewId === 'string' &&
    (value.defaultViewId === FULL_DASHBOARD_VIEW_ID || uniqueViews.some((view) => view.id === value.defaultViewId))
      ? value.defaultViewId
      : FULL_DASHBOARD_VIEW_ID

  return {
    defaultViewId,
    views: uniqueViews,
  }
}

export function normalizePersistedDashboardViews(value: unknown): PersistedDashboardViews {
  if (!isObject(value) || value.version !== 1 || !isObject(value.dashboards)) {
    return createEmptyDashboardViews()
  }

  return {
    version: 1,
    dashboards: {
      opportunities: sanitizeScopeViews(value.dashboards.opportunities),
      projects: sanitizeScopeViews(value.dashboards.projects),
      productionSystemInventory: sanitizeScopeViews(value.dashboards.productionSystemInventory),
      reusedInternalSystems: sanitizeScopeViews(value.dashboards.reusedInternalSystems),
      systems: sanitizeScopeViews(value.dashboards.systems),
      tenants: sanitizeScopeViews(value.dashboards.tenants),
      customers: sanitizeScopeViews(value.dashboards.customers),
    },
  }
}

export function loadDashboardViews(): PersistedDashboardViews {
  try {
    const raw = localStorage.getItem(DASHBOARD_VIEWS_STORAGE_KEY)
    if (!raw) return createEmptyDashboardViews()

    return normalizePersistedDashboardViews(JSON.parse(raw) as unknown)
  } catch {
    return createEmptyDashboardViews()
  }
}

export function persistDashboardViews(dashboardViews: PersistedDashboardViews): void {
  try {
    localStorage.setItem(DASHBOARD_VIEWS_STORAGE_KEY, JSON.stringify(normalizePersistedDashboardViews(dashboardViews)))
  } catch {
    // Ignore storage failures so dashboard rendering is not blocked by browser storage restrictions.
  }
}

function createViewId(): string {
  return `view-${crypto.randomUUID()}`
}

export function addDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  name: string,
  state: SavedDashboardViewState,
  setAsDefault = false,
): { dashboardViews: PersistedDashboardViews; view: SavedDashboardView } {
  const now = new Date().toISOString()
  return createView(persistedViews, scope, {
    id: createViewId(),
    name,
    state,
    nowIso: now,
    setAsDefault,
  })
}

export function updateDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  state: SavedDashboardViewState,
  setAsDefault = false,
): PersistedDashboardViews {
  return updateView(persistedViews, scope, viewId, state, { nowIso: new Date().toISOString(), setAsDefault })
}

export function setDefaultDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
): PersistedDashboardViews {
  return setDefaultView(persistedViews, scope, viewId)
}

export function renameDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  name: string,
): PersistedDashboardViews {
  return renameView(persistedViews, scope, viewId, name, { nowIso: new Date().toISOString() })
}

export function duplicateDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  name: string,
): { dashboardViews: PersistedDashboardViews; view: SavedDashboardView } {
  return duplicateView(persistedViews, scope, viewId, { id: createViewId(), name, nowIso: new Date().toISOString() })
}

export function deleteDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
): PersistedDashboardViews {
  return deleteView(persistedViews, scope, viewId)
}
