import { FULL_DASHBOARD_VIEW_ID } from './metadata'
import { createEmptyDashboardViews, createEmptyScopeViews } from './service'
import type {
  DashboardViewColumnFilter,
  DashboardViewSortingRule,
  DashboardViewState,
  DashboardViewsForScope,
  PersistedDashboardViews,
  SavedDashboardView,
} from './types'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

export function sanitizeDashboardViewState(value: unknown): DashboardViewState | null {
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
        (filter): filter is DashboardViewColumnFilter =>
          isObject(filter) && typeof filter.id === 'string' && 'value' in filter,
      )
    : []
  const sorting = Array.isArray(value.sorting)
    ? value.sorting.filter(
        (sort): sort is DashboardViewSortingRule =>
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

export function sanitizeSavedDashboardView(value: unknown): SavedDashboardView | null {
  if (!isObject(value)) return null

  const id = safeString(value.id)
  const name = safeString(value.name)
  const state = sanitizeDashboardViewState(value.state)

  if (!id || id === FULL_DASHBOARD_VIEW_ID || !name || !state) return null

  return {
    id,
    name,
    state,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : new Date().toISOString(),
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
  }
}

export function sanitizeDashboardScopeViews(value: unknown): DashboardViewsForScope {
  if (!isObject(value)) return createEmptyScopeViews()

  const views = Array.isArray(value.views)
    ? value.views.map(sanitizeSavedDashboardView).filter((view): view is SavedDashboardView => view !== null)
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
      opportunities: sanitizeDashboardScopeViews(value.dashboards.opportunities),
      projects: sanitizeDashboardScopeViews(value.dashboards.projects),
      productionSystemInventory: sanitizeDashboardScopeViews(value.dashboards.productionSystemInventory),
      reusedInternalSystems: sanitizeDashboardScopeViews(value.dashboards.reusedInternalSystems),
      systems: sanitizeDashboardScopeViews(value.dashboards.systems),
      tenants: sanitizeDashboardScopeViews(value.dashboards.tenants),
      warranties: sanitizeDashboardScopeViews(value.dashboards.warranties),
      renewals: sanitizeDashboardScopeViews(value.dashboards.renewals),
      customers: sanitizeDashboardScopeViews(value.dashboards.customers),
      requirementCoverage: sanitizeDashboardScopeViews(value.dashboards.requirementCoverage),
      activityLog: sanitizeDashboardScopeViews(value.dashboards.activityLog),
    },
  }
}
