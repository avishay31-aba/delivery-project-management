import {
  createEmptyDashboardViews,
  normalizePersistedDashboardViews,
  type PersistedDashboardViews,
} from '@/domain/dashboard-view'
import { parseJson, stringifyJson } from './json'
import { localStoragePersistenceAdapter } from './local-storage'
import type { KeyValuePersistenceAdapter } from './types'

export const DASHBOARD_VIEWS_STORAGE_KEY = 'dpm-dashboard-views-v1'

export function loadDashboardViewsFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): PersistedDashboardViews {
  try {
    const raw = storage.getItem(DASHBOARD_VIEWS_STORAGE_KEY)
    if (!raw) return createEmptyDashboardViews()

    return normalizePersistedDashboardViews(parseJson(raw))
  } catch {
    return createEmptyDashboardViews()
  }
}

export function persistDashboardViewsToStorage(
  dashboardViews: PersistedDashboardViews,
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  try {
    storage.setItem(DASHBOARD_VIEWS_STORAGE_KEY, stringifyJson(normalizePersistedDashboardViews(dashboardViews)))
  } catch {
    // Ignore storage failures so dashboard rendering is not blocked by browser storage restrictions.
  }
}

