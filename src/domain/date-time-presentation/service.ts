export type DateTimePresentationValue = string | number | Date | null | undefined

export interface DateTimePresentationOptions {
  fallback?: string
}

export type DateTimePresentationKind = 'date' | 'time' | 'datetime' | 'datetime-seconds'
export type DateTimeSemanticType = 'date' | 'time' | 'datetime'
export type RegionalDateFormatPreference = 'system' | 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'

export const REGIONAL_DATE_FORMAT_STORAGE_KEY = 'delivery-erp-regional-date-format'
export const REGIONAL_DATE_FORMAT_EVENT = 'delivery-erp-regional-date-format-changed'

export const REGIONAL_DATE_FORMAT_OPTIONS: Array<{ value: RegionalDateFormatPreference; label: string }> = [
  { value: 'system', label: 'System / Workstation Regional Format' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
]

const EXPLICIT_REGIONAL_DATE_FORMATS = new Set<RegionalDateFormatPreference>(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])

declare global {
  interface Window {
    __DELIVERY_ERP_RUNTIME_CONFIG__?: {
      regionalDateFormat?: RegionalDateFormatPreference
    }
  }
}

function fallbackValue(options?: DateTimePresentationOptions): string {
  return options?.fallback ?? '-'
}

function isRegionalDateFormatPreference(value: unknown): value is RegionalDateFormatPreference {
  return value === 'system' || EXPLICIT_REGIONAL_DATE_FORMATS.has(value as RegionalDateFormatPreference)
}

function runtimeRegionalDateFormat(): RegionalDateFormatPreference {
  if (typeof window === 'undefined') return 'system'
  const runtimeValue = window.__DELIVERY_ERP_RUNTIME_CONFIG__?.regionalDateFormat
  return isRegionalDateFormatPreference(runtimeValue) ? runtimeValue : 'system'
}

export function regionalDateFormatPreference(): RegionalDateFormatPreference {
  return resolvedRegionalDateFormatPreference()
}

export function resolvedRegionalDateFormatPreference(): RegionalDateFormatPreference {
  const runtimePreference = runtimeRegionalDateFormat()
  return runtimePreference !== 'system' ? runtimePreference : 'system'
}

export function setRegionalDateFormatPreference(format: RegionalDateFormatPreference): void {
  if (typeof window === 'undefined') return
  const nextFormat = isRegionalDateFormatPreference(format) ? format : 'system'
  try {
    window.localStorage.setItem(REGIONAL_DATE_FORMAT_STORAGE_KEY, nextFormat)
  } catch {
    // Ignore unavailable storage; notify this tab so it still re-renders.
  }
  window.dispatchEvent(new CustomEvent(REGIONAL_DATE_FORMAT_EVENT, { detail: nextFormat }))
}

export function subscribeToRegionalDateFormatPreference(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handleLocalChange = () => listener()
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === REGIONAL_DATE_FORMAT_STORAGE_KEY) listener()
  }
  window.addEventListener(REGIONAL_DATE_FORMAT_EVENT, handleLocalChange)
  window.addEventListener('storage', handleStorageChange)
  return () => {
    window.removeEventListener(REGIONAL_DATE_FORMAT_EVENT, handleLocalChange)
    window.removeEventListener('storage', handleStorageChange)
  }
}

export function userDateTimeZone(): string | undefined {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return undefined
  }
}

function parseDateTime(value: DateTimePresentationValue): Date | null {
  if (value == null || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value
  const parsed = new Date(value)
  return Number.isNaN(parsed.valueOf()) ? null : parsed
}

function parseDateOnly(value: DateTimePresentationValue): Date | null {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return parseDateTime(value)
}

function formatPart(
  value: DateTimePresentationValue,
  options: Intl.DateTimeFormatOptions,
  presentationOptions?: DateTimePresentationOptions,
  dateOnly = false,
): string {
  const parsed = dateOnly ? parseDateOnly(value) : parseDateTime(value)
  if (!parsed) return fallbackValue(presentationOptions)
  return new Intl.DateTimeFormat(undefined, {
    ...options,
    timeZone: dateOnly ? undefined : userDateTimeZone(),
  }).format(parsed)
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

function explicitDateParts(value: Date): { year: string; month: string; day: string } {
  return {
    year: String(value.getFullYear()),
    month: padDatePart(value.getMonth() + 1),
    day: padDatePart(value.getDate()),
  }
}

export function formatDate(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  const parsed = parseDateOnly(value)
  if (!parsed) return fallbackValue(options)
  const preference = resolvedRegionalDateFormatPreference()
  if (preference === 'system') {
    return formatPart(parsed, { year: 'numeric', month: '2-digit', day: '2-digit' }, options, true)
  }
  const { year, month, day } = explicitDateParts(parsed)
  if (preference === 'DD/MM/YYYY') return `${day}/${month}/${year}`
  if (preference === 'MM/DD/YYYY') return `${month}/${day}/${year}`
  return `${year}-${month}-${day}`
}

export function formatDateOnly(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatDate(value, options)
}

export function formatTime(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatPart(value, { hour: '2-digit', minute: '2-digit', hour12: false, hourCycle: 'h23' }, options)
}

export function formatDateTime(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  const parsed = parseDateTime(value)
  if (!parsed) return fallbackValue(options)
  return `${formatDate(parsed, options)} ${formatTime(parsed, options)}`
}

export function formatDateTimeSeconds(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  const parsed = parseDateTime(value)
  if (!parsed) return fallbackValue(options)
  const time = formatPart(parsed, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, hourCycle: 'h23' }, options)
  return `${formatDate(parsed, options)} ${time}`
}

export function formatDateTimeWithSeconds(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatDateTimeSeconds(value, options)
}

export function isCanonicalDateOnly(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isCanonicalDateTime(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}/.test(value)
}

export function formatDateTimePresentation(
  value: DateTimePresentationValue,
  kind: DateTimePresentationKind,
  options?: DateTimePresentationOptions,
): string {
  if (kind === 'date') return formatDate(value, options)
  if (kind === 'time') return formatTime(value, options)
  if (kind === 'datetime-seconds') return formatDateTimeSeconds(value, options)
  return formatDateTime(value, options)
}

export function formatSemanticDateTimeValue(
  value: DateTimePresentationValue,
  semanticType: DateTimeSemanticType | undefined,
  options?: DateTimePresentationOptions,
): string {
  if (semanticType === 'date') return formatDate(value, options)
  if (semanticType === 'time') return formatTime(value, options)
  if (semanticType === 'datetime') return formatDateTimeSeconds(value, options)
  return value == null ? fallbackValue(options) : String(value)
}
