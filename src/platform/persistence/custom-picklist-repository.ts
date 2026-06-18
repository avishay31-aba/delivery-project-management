import { parseJson, stringifyJson } from './json'
import { localStoragePersistenceAdapter } from './local-storage'
import type { KeyValuePersistenceAdapter } from './types'

export const CUSTOM_PICKLIST_STORAGE_KEY = 'dpm.customPicklistOptions.v1'
export type PersistedCustomPicklistOptions = Record<string, string[]>

export function loadCustomPicklistOptionsFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): PersistedCustomPicklistOptions {
  try {
    const rawValue = storage.getItem(CUSTOM_PICKLIST_STORAGE_KEY)
    if (!rawValue) return {}
    const parsed = parseJson(rawValue) as PersistedCustomPicklistOptions
    return Object.fromEntries(
      Object.entries(parsed).map(([key, values]) => [
        key,
        Array.isArray(values) ? values.filter((value) => typeof value === 'string' && value.trim()) : [],
      ]),
    )
  } catch {
    return {}
  }
}

export function saveCustomPicklistOptionsToStorage(
  options: PersistedCustomPicklistOptions,
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  storage.setItem(CUSTOM_PICKLIST_STORAGE_KEY, stringifyJson(options))
}

