import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'

export const STORAGE_KEY = 'dpm-mvp-v1'

/** Default state loaded from seed file */
export function createInitialState(): AppDataState {
  return {
    ...(seedJson as AppDataState),
    lastPersistedAt: null,
  }
}

export function loadPersistedState(): AppDataState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AppDataState
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.projects)) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function persistState(state: AppDataState): void {
  const payload: AppDataState = {
    ...state,
    lastPersistedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearPersistedState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
