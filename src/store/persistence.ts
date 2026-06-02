import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeIdCounters } from '@/data/id-generator'

export const STORAGE_KEY = 'dpm-mvp-v1'

function normalizeState(state: AppDataState): AppDataState {
  const seedState = seedJson as AppDataState
  const normalizedState = {
    ...state,
    salesManagers: Array.isArray(state.salesManagers) ? state.salesManagers : seedState.salesManagers,
    accounts: Array.isArray(state.accounts) ? state.accounts : seedState.accounts,
    opportunities: Array.isArray(state.opportunities) ? state.opportunities : seedState.opportunities,
    systems: Array.isArray(state.systems) ? state.systems : seedState.systems,
    tenants: Array.isArray(state.tenants) ? state.tenants : seedState.tenants,
    warrantyRecords: Array.isArray(state.warrantyRecords) ? state.warrantyRecords : seedState.warrantyRecords,
    projectSystems: Array.isArray(state.projectSystems) ? state.projectSystems : seedState.projectSystems,
    projectTenants: Array.isArray(state.projectTenants) ? state.projectTenants : seedState.projectTenants,
  }

  return {
    ...normalizedState,
    idCounters: normalizeIdCounters(state.idCounters, normalizedState),
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
