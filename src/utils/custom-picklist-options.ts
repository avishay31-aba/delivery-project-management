const CUSTOM_PICKLIST_STORAGE_KEY = 'dpm.customPicklistOptions.v1'

export type CustomPicklistOptions = Record<string, string[]>

export function loadCustomPicklistOptions(): CustomPicklistOptions {
  try {
    const rawValue = window.localStorage.getItem(CUSTOM_PICKLIST_STORAGE_KEY)
    if (!rawValue) return {}
    const parsed = JSON.parse(rawValue) as CustomPicklistOptions
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

export function saveCustomPicklistOptions(options: CustomPicklistOptions): void {
  window.localStorage.setItem(CUSTOM_PICKLIST_STORAGE_KEY, JSON.stringify(options))
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
