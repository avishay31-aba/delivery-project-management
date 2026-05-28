import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeIdCounters } from '@/data/id-generator'

export const STORAGE_KEY = 'dpm-mvp-v1'

function normalizeState(state: AppDataState): AppDataState {
  return {
    ...state,
    idCounters: normalizeIdCounters(state.idCounters, state),
  }
}

/** Default state loaded from seed file */
export function createInitialState(): AppDataState {
  return normalizeState({
    ...(seedJson as AppDataState),
    lastPersistedAt: null,
  })
}

export function loadPersistedState(): AppDataState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as AppDataState
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.projects)) {
      return null
    }
    return normalizeState(parsed)
  } catch {
    return null
  }
}

export function persistState(state: AppDataState): void {
  const payload: AppDataState = normalizeState({
    ...state,
    lastPersistedAt: new Date().toISOString(),
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function clearPersistedState(): void {
  localStorage.removeItem(STORAGE_KEY)
}