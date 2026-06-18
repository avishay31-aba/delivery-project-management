import {
  loadCustomPicklistOptionsFromStorage,
  saveCustomPicklistOptionsToStorage,
  type PersistedCustomPicklistOptions,
} from '@/platform/persistence'

export type CustomPicklistOptions = PersistedCustomPicklistOptions

export function loadCustomPicklistOptions(): CustomPicklistOptions {
  return loadCustomPicklistOptionsFromStorage()
}

export function saveCustomPicklistOptions(options: CustomPicklistOptions): void {
  saveCustomPicklistOptionsToStorage(options)
}

export function addCustomPicklistOption(options: CustomPicklistOptions, key: string, value: string): CustomPicklistOptions {
  const nextValue = value.trim()
  if (!nextValue) return options
  const nextOptions = {
    ...options,
    [key]: Array.from(new Set([...(options[key] ?? []), nextValue])),
  }
  saveCustomPicklistOptions(nextOptions)
  return nextOptions
}
