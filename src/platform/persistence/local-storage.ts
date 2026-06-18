import type { KeyValuePersistenceAdapter } from './types'

export const localStoragePersistenceAdapter: KeyValuePersistenceAdapter = {
  getItem(key) {
    return localStorage.getItem(key)
  },
  setItem(key, value) {
    localStorage.setItem(key, value)
  },
  removeItem(key) {
    localStorage.removeItem(key)
  },
}

