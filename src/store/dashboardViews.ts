import {
  FULL_DASHBOARD_VIEW_ID,
  FULL_DASHBOARD_VIEW_NAME,
  areDashboardViewStatesEqual,
  createEmptyDashboardViews,
  createFullDashboardView,
  createFullDashboardViewState,
  createView,
  deleteView,
  duplicateView,
  getRuntimeDashboardViews,
  hasDashboardViewNameConflict,
  normalizePersistedDashboardViews,
  normalizeDashboardViewState,
  renameView,
  resolveDefaultDashboardViewId,
  setDefaultView,
  updateView,
  type DashboardViewScope,
  type DashboardViewState,
  type DashboardViewsForScope,
  type PersistedDashboardViews,
  type RuntimeDashboardView,
  type SavedDashboardView,
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
  normalizePersistedDashboardViews,
  normalizeDashboardViewState,
  resolveDefaultDashboardViewId,
}
export type { DashboardViewScope }
export type {
  DashboardViewsForScope,
  PersistedDashboardViews,
  RuntimeDashboardView,
  SavedDashboardView,
}
export type SavedDashboardViewState = DashboardViewState

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
