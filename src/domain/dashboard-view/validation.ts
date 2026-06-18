import { FULL_DASHBOARD_VIEW_ID, FULL_DASHBOARD_VIEW_NAME } from './metadata'
import type { DashboardViewScope, PersistedDashboardViews } from './types'

export function normalizeDashboardViewName(name: string): string {
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

export function validateDashboardViewName(
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

export function assertCanOverwriteDashboardView(viewId: string): void {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be overwritten.')
  }
}

export function assertCanRenameDashboardView(viewId: string): void {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be renamed.')
  }
}

export function assertCanDuplicateDashboardView(viewId: string): void {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be duplicated.')
  }
}

export function assertCanDeleteDashboardView(viewId: string): void {
  if (viewId === FULL_DASHBOARD_VIEW_ID) {
    throw new Error('Full Dashboard cannot be deleted.')
  }
}
