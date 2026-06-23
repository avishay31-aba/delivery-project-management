import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import {
  APP_STATE_STORAGE_KEY,
  clearAppDataStateFromStorage,
  loadAppDataStateFromStorage,
  normalizeAppDataState,
  persistAppDataStateToStorage,
} from '@/platform/persistence'

export const STORAGE_KEY = APP_STATE_STORAGE_KEY

/** Default state loaded from seed file */
export function createInitialState(): AppDataState {
  return normalizeAppDataState({
    ...(seedJson as unknown as AppDataState),
    activityEvents: [],
    lastPersistedAt: null,
  })
}

export function loadPersistedState(): AppDataState | null {
  return loadAppDataStateFromStorage()
}

export function persistState(state: AppDataState): void {
  persistAppDataStateToStorage(state)
}

export function clearPersistedState(): void {
  clearAppDataStateFromStorage()
}
