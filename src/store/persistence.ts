import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import {
  localStoragePersistenceAdapter,
  normalizeAppDataState,
  parseJson,
  stringifyJson,
} from '@/platform/persistence'

export const STORAGE_KEY = 'dpm-mvp-v1'

/** Default state loaded from seed file */
export function createInitialState(): AppDataState {
  return normalizeAppDataState({
    ...(seedJson as AppDataState),
    lastPersistedAt: null,
  })
}

export function loadPersistedState(): AppDataState | null {
  try {
    const raw = localStoragePersistenceAdapter.getItem(STORAGE_KEY)
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

export function persistState(state: AppDataState): void {
  const payload: AppDataState = normalizeAppDataState({
    ...state,
    lastPersistedAt: new Date().toISOString(),
  })
  localStoragePersistenceAdapter.setItem(STORAGE_KEY, stringifyJson(payload))
}

export function clearPersistedState(): void {
  localStoragePersistenceAdapter.removeItem(STORAGE_KEY)
}
