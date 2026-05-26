import { create } from 'zustand'
import type { AppDataState } from '@/data/seed.types'
import {
  createInitialState,
  loadPersistedState,
  persistState,
  clearPersistedState,
} from '@/store/persistence'

interface AppStore extends AppDataState {
  /** Hydrate from localStorage or seed */
  initialize: () => void
  /** Write current state to localStorage */
  saveToStorage: () => void
  /** Reset to seed and clear localStorage */
  resetToSeed: () => void
  /** Whether store has been hydrated */
  hydrated: boolean
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...createInitialState(),
  hydrated: false,

  initialize: () => {
    const persisted = loadPersistedState()
    const next = persisted ?? createInitialState()
    set({ ...next, hydrated: true })
  },

  saveToStorage: () => {
    const state = get()
    const data: AppDataState = {
      version: state.version,
      projects: state.projects,
      systems: state.systems,
      tenants: state.tenants,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      lastPersistedAt: state.lastPersistedAt,
    }
    persistState(data)
    set({ lastPersistedAt: new Date().toISOString() })
  },

  resetToSeed: () => {
    clearPersistedState()
    set({ ...createInitialState(), hydrated: true })
  },
}))
