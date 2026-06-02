import type {
  ColumnFiltersState,
  ColumnOrderState,
  GroupingState,
  SortingState,
  VisibilityState,
} from '@tanstack/react-table'

export const DASHBOARD_VIEWS_STORAGE_KEY = 'dpm-dashboard-views-v1'
export const FULL_DASHBOARD_VIEW_ID = 'full-dashboard'
export const FULL_DASHBOARD_VIEW_NAME = 'Full Dashboard'

export type DashboardViewScope = 'opportunities' | 'projects' | 'systems' | 'tenants'

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

const DASHBOARD_SCOPES: DashboardViewScope[] = ['opportunities', 'projects', 'systems', 'tenants']

function createEmptyScopeViews(): DashboardViewsForScope {
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
      tenants: createEmptyScopeViews(),
    },
  }
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
      systems: sanitizeScopeViews(value.dashboards.systems),
      tenants: sanitizeScopeViews(value.dashboards.tenants),
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

export function createFullDashboardViewState(columnIds: string[]): SavedDashboardViewState {
  return {
    columnOrder: columnIds,
    columnVisibility: Object.fromEntries(columnIds.map((columnId) => [columnId, true])),
    columnFilters: [],
    sorting: [],
    grouping: [],
    globalFilter: '',
  }
}

export function normalizeDashboardViewState(
  state: SavedDashboardViewState,
  columnIds: string[],
): SavedDashboardViewState {
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
): RuntimeDashboardView {
  const now = new Date(0).toISOString()

  return {
    id: FULL_DASHBOARD_VIEW_ID,
    name: FULL_DASHBOARD_VIEW_NAME,
    state: createFullDashboardViewState(columnIds),
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
): RuntimeDashboardView[] {
  const scopedViews = persistedViews.dashboards[scope]
  const fullDashboardView = createFullDashboardView(columnIds, scopedViews.defaultViewId)
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
      DASHBOARD_SCOPES.map((dashboardScope) => [
        dashboardScope,
        dashboardScope === scope ? updater(persistedViews.dashboards[dashboardScope]) : persistedViews.dashboards[dashboardScope],
      ]),
    ) as Record<DashboardViewScope, DashboardViewsForScope>,
  }
}

function createViewId(): string {
  return `view-${crypto.randomUUID()}`
}

function normalizeDashboardViewName(name: string): string {
  return name.trim().toLocaleLowerCase()
}

export function hasDashboardViewNameConflict(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  name: string,
  excludeViewId?: string,
): boolean {
  const normalizedName = normalizeDashboardViewName(name)

  if (!normalizedName) return false
  if (normalizedName === normalizeDashboardViewName(FULL_DASHBOARD_VIEW_NAME)) return true

  return persistedViews.dashboards[scope].views.some(
    (view) => view.id !== excludeViewId && normalizeDashboardViewName(view.name) === normalizedName,
  )
}

function validateDashboardViewName(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  name: string,
  excludeViewId?: string,
): string {
  const nextName = name.trim()

  if (!nextName) {
    throw new Error('Saved dashboard view name is required.')
  }

  if (normalizeDashboardViewName(nextName) === normalizeDashboardViewName(FULL_DASHBOARD_VIEW_NAME)) {
    throw new Error('Full Dashboard is a reserved dashboard view name.')
  }

  if (hasDashboardViewNameConflict(persistedViews, scope, nextName, excludeViewId)) {
    throw new Error('A saved dashboard view with this name already exists.')
  }

  return nextName
}

export function addDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  name: string,
  state: SavedDashboardViewState,
  setAsDefault = false,
): { dashboardViews: PersistedDashboardViews; view: SavedDashboardView } {
  const now = new Date().toISOString()
  const view: SavedDashboardView = {
    id: createViewId(),
    name: validateDashboardViewName(persistedViews, scope, name),
    state,
    createdAt: now,
    updatedAt: now,
  }

  const dashboardViews = updateScope(persistedViews, scope, (scopeViews) => ({
    defaultViewId: setAsDefault ? view.id : scopeViews.defaultViewId,
    views: [...scopeViews.views, view],
  }))

  return { dashboardViews, view }
}

export function updateDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  state: SavedDashboardViewState,
  setAsDefault = false,
): PersistedDashboardViews {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be overwritten.')
  }

  return updateScope(persistedViews, scope, (scopeViews) => ({
    defaultViewId: setAsDefault ? viewId : scopeViews.defaultViewId,
    views: scopeViews.views.map((view) =>
      view.id === viewId ? { ...view, state, updatedAt: new Date().toISOString() } : view,
    ),
  }))
}

export function setDefaultDashboardView(
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

export function renameDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  name: string,
): PersistedDashboardViews {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be renamed.')
  }

  const nextName = validateDashboardViewName(persistedViews, scope, name, viewId)

  return updateScope(persistedViews, scope, (scopeViews) => ({
    ...scopeViews,
    views: scopeViews.views.map((view) =>
      view.id === viewId ? { ...view, name: nextName, updatedAt: new Date().toISOString() } : view,
    ),
  }))
}

export function duplicateDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
  name: string,
): { dashboardViews: PersistedDashboardViews; view: SavedDashboardView } {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be duplicated.')
  }

  const sourceView = persistedViews.dashboards[scope].views.find((view) => view.id === viewId)
  if (!sourceView) {
    throw new Error('Saved dashboard view not found.')
  }

  return addDashboardView(persistedViews, scope, name, sourceView.state)
}

export function deleteDashboardView(
  persistedViews: PersistedDashboardViews,
  scope: DashboardViewScope,
  viewId: string,
): PersistedDashboardViews {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be deleted.')
  }

  return updateScope(persistedViews, scope, (scopeViews) => ({
    defaultViewId: scopeViews.defaultViewId === viewId ? FULL_DASHBOARD_VIEW_ID : scopeViews.defaultViewId,
    views: scopeViews.views.filter((view) => view.id !== viewId),
  }))
}

export function areDashboardViewStatesEqual(
  firstState: SavedDashboardViewState,
  secondState: SavedDashboardViewState,
  columnIds: string[],
): boolean {
  const normalizedFirstState = normalizeDashboardViewState(firstState, columnIds)
  const normalizedSecondState = normalizeDashboardViewState(secondState, columnIds)

  return JSON.stringify(normalizedFirstState) === JSON.stringify(normalizedSecondState)
}
