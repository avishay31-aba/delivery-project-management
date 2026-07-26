import { DASHBOARD_VIEW_SCOPES, FULL_DASHBOARD_VIEW_ID, FULL_DASHBOARD_VIEW_NAME } from './metadata'
import type {
  CreatedDashboardViewResult,
  DashboardViewScope,
  DashboardViewState,
  DashboardViewsForScope,
  PersistedDashboardViews,
  RuntimeDashboardView,
  SavedDashboardView,
} from './types'
import {
  assertCanDeleteDashboardView,
  assertCanDuplicateDashboardView,
  assertCanOverwriteDashboardView,
  assertCanRenameDashboardView,
  validateDashboardViewName,
} from './validation'

export function createEmptyScopeViews(): DashboardViewsForScope {
  return {
    defaultViewId: FULL_DASHBOARD_VIEW_ID,
    views: [],
  }
}

export function createEmptyDashboardViews(): PersistedDashboardViews {
  return {
    version: 1,
    dashboards: {
      opportunities: createEmptyScopeViews(),
      projects: createEmptyScopeViews(),
      systems: createEmptyScopeViews(),
      productionSystemInventory: createEmptyScopeViews(),
      reusedInternalSystems: createEmptyScopeViews(),
      tenants: createEmptyScopeViews(),
      warranties: createEmptyScopeViews(),
      renewals: createEmptyScopeViews(),
      customers: createEmptyScopeViews(),
      requirementCoverage: createEmptyScopeViews(),
      activityLog: createEmptyScopeViews(),
      infrastructure: createEmptyScopeViews(),
    },
  }
}

export function createFullDashboardViewState(
  columnIds: string[],
  defaultSorting: DashboardViewState['sorting'] = [],
  defaultColumnVisibility: DashboardViewState['columnVisibility'] = {},
): DashboardViewState {
  return {
    columnOrder: columnIds,
    columnVisibility: Object.fromEntries(columnIds.map((columnId) => [columnId, defaultColumnVisibility[columnId] ?? true])),
    columnFilters: [],
    sorting: defaultSorting.filter((sort) => columnIds.includes(sort.id)),
    grouping: [],
    globalFilter: '',
  }
}

export function normalizeDashboardViewState(state: DashboardViewState, columnIds: string[]): DashboardViewState {
  const columnIdSet = new Set(columnIds)
  const preservedColumnOrder = state.columnOrder.filter((columnId) => columnIdSet.has(columnId))
  const newColumnIds = columnIds.filter((columnId) => !preservedColumnOrder.includes(columnId))
  const columnVisibility = Object.fromEntries(
    columnIds.map((columnId) => [columnId, state.columnVisibility[columnId] ?? true]),
  )

  return {
    columnOrder: [...preservedColumnOrder, ...newColumnIds],
    columnVisibility,
    columnFilters: state.columnFilters.filter((filter) => columnIdSet.has(filter.id)),
    sorting: state.sorting.filter((sort) => columnIdSet.has(sort.id)),
    grouping: state.grouping.filter((columnId) => columnIdSet.has(columnId)),
    globalFilter: state.globalFilter ?? '',
  }
}

export function createFullDashboardView(
  columnIds: string[],
  defaultViewId: string = FULL_DASHBOARD_VIEW_ID,
  defaultSorting: DashboardViewState['sorting'] = [],
  defaultColumnVisibility: DashboardViewState['columnVisibility'] = {},
): RuntimeDashboardView {
  const now = new Date(0).toISOString()

  return {
    id: FULL_DASHBOARD_VIEW_ID,
    name: FULL_DASHBOARD_VIEW_NAME,
    state: createFullDashboardViewState(columnIds, defaultSorting, defaultColumnVisibility),
    createdAt: now,
    updatedAt: now,
    isFullDashboard: true,
    isDefault: defaultViewId === FULL_DASHBOARD_VIEW_ID,
  }
}

export function getRuntimeDashboardViews(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  columnIds: string[],
  defaultSorting: DashboardViewState['sorting'] = [],
  defaultColumnVisibility: DashboardViewState['columnVisibility'] = {},
): RuntimeDashboardView[] {
  const scopedViews = persistedViews.dashboards[scope]
  const fullDashboardView = createFullDashboardView(columnIds, scopedViews.defaultViewId, defaultSorting, defaultColumnVisibility)
  const savedViews = scopedViews.views.map((view) => ({
    ...view,
    state: normalizeDashboardViewState(view.state, columnIds),
    isFullDashboard: false,
    isDefault: scopedViews.defaultViewId === view.id,
  }))

  return [fullDashboardView, ...savedViews]
}

export function resolveDefaultDashboardViewId(persistedViews: PersistedDashboardViews, scope: DashboardViewScope): string {
  const scopedViews = persistedViews.dashboards[scope]
  return scopedViews.defaultViewId === FULL_DASHBOARD_VIEW_ID ||
    scopedViews.views.some((view) => view.id === scopedViews.defaultViewId)
    ? scopedViews.defaultViewId
    : FULL_DASHBOARD_VIEW_ID
}

function updateScope(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  updater: (scopeViews: DashboardViewsForScope) => DashboardViewsForScope,
): PersistedDashboardViews {
  return {
    version: 1,
    dashboards: Object.fromEntries(
      DASHBOARD_VIEW_SCOPES.map((dashboardScope) => [
        dashboardScope,
        dashboardScope === scope ? updater(persistedViews.dashboards[dashboardScope]) : persistedViews.dashboards[dashboardScope],
      ]),
    ) as Record<DashboardViewScope, DashboardViewsForScope>,
  }
}

export function createView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  input: {
    id: string
    name: string
    state: DashboardViewState
    nowIso: string
    setAsDefault?: boolean
  },
): CreatedDashboardViewResult {
  const view: SavedDashboardView = {
    id: input.id,
    name: validateDashboardViewName(persistedViews, scope, input.name),
    state: input.state,
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  }

  const dashboardViews = updateScope(persistedViews, scope, (scopeViews) => ({
    defaultViewId: input.setAsDefault ? view.id : scopeViews.defaultViewId,
    views: [...scopeViews.views, view],
  }))

  return { dashboardViews, view }
}

export function updateView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  state: DashboardViewState,
  input: { nowIso: string; setAsDefault?: boolean },
): PersistedDashboardViews {
  assertCanOverwriteDashboardView(viewId)

  return updateScope(persistedViews, scope, (scopeViews) => ({
    defaultViewId: input.setAsDefault ? viewId : scopeViews.defaultViewId,
    views: scopeViews.views.map((view) => (view.id === viewId ? { ...view, state, updatedAt: input.nowIso } : view)),
  }))
}

export function setDefaultView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
): PersistedDashboardViews {
  return updateScope(persistedViews, scope, (scopeViews) => {
    const nextDefaultViewId =
      viewId === FULL_DASHBOARD_VIEW_ID || scopeViews.views.some((view) => view.id === viewId)
        ? viewId
        : FULL_DASHBOARD_VIEW_ID

    return {
      ...scopeViews,
      defaultViewId: nextDefaultViewId,
    }
  })
}

export function renameView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  name: string,
  input: { nowIso: string },
): PersistedDashboardViews {
  assertCanRenameDashboardView(viewId)
  const nextName = validateDashboardViewName(persistedViews, scope, name, viewId)

  return updateScope(persistedViews, scope, (scopeViews) => ({
    ...scopeViews,
    views: scopeViews.views.map((view) =>
      view.id === viewId ? { ...view, name: nextName, updatedAt: input.nowIso } : view,
    ),
  }))
}

export function duplicateView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  input: { id: string; name: string; nowIso: string },
): CreatedDashboardViewResult {
  assertCanDuplicateDashboardView(viewId)
  const sourceView = persistedViews.dashboards[scope].views.find((view) => view.id === viewId)
  if (!sourceView) {
    throw new Error('Saved dashboard view not found.')
  }

  return createView(persistedViews, scope, {
    id: input.id,
    name: input.name,
    state: sourceView.state,
    nowIso: input.nowIso,
  })
}

export function deleteView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
): PersistedDashboardViews {
  assertCanDeleteDashboardView(viewId)

  return updateScope(persistedViews, scope, (scopeViews) => ({
    defaultViewId: scopeViews.defaultViewId === viewId ? FULL_DASHBOARD_VIEW_ID : scopeViews.defaultViewId,
    views: scopeViews.views.filter((view) => view.id !== viewId),
  }))
}

export function areDashboardViewStatesEqual(
  firstState: DashboardViewState,
  secondState: DashboardViewState,
  columnIds: string[],
): boolean {
  const normalizedFirstState = normalizeDashboardViewState(firstState, columnIds)
  const normalizedSecondState = normalizeDashboardViewState(secondState, columnIds)

  return JSON.stringify(normalizedFirstState) === JSON.stringify(normalizedSecondState)
}
