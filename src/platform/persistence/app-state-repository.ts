import type { AppDataState } from '@/data/seed.types'
import { normalizeAppDataState } from './app-state-migration'
import { parseJson, stringifyJson } from './json'
import { localStoragePersistenceAdapter } from './local-storage'
import type { KeyValuePersistenceAdapter } from './types'

export const APP_STATE_STORAGE_KEY = 'dpm-mvp-v1'

export function loadAppDataStateFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): AppDataState | null {
  try {
    const raw = storage.getItem(APP_STATE_STORAGE_KEY)
    if (!raw) return null

    const parsed = parseJson(raw) as AppDataState
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.projects)) {
      return null
    }
    return normalizeAppDataState(parsed)
  } catch {
    return null
  }
}

export function persistAppDataStateToStorage(
  state: AppDataState,
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  const payload: AppDataState = normalizeAppDataState({
    ...state,
    lastPersistedAt: new Date().toISOString(),
  })
  storage.setItem(APP_STATE_STORAGE_KEY, stringifyJson(payload))
}

export function clearAppDataStateFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  storage.removeItem(APP_STATE_STORAGE_KEY)
}

