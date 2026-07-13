export type DateTimePresentationValue = string | number | Date | null | undefined

export interface DateTimePresentationOptions {
  fallback?: string
  locale?: string
}

export type DateTimePresentationKind = 'date' | 'time' | 'datetime' | 'datetime-seconds'

function fallbackValue(options?: DateTimePresentationOptions): string {
  return options?.fallback ?? '-'
}

function userLocale(options?: DateTimePresentationOptions): string | undefined {
  if (options?.locale) return options.locale
  if (typeof navigator !== 'undefined') {
    if (Array.isArray(navigator.languages) && navigator.languages.length > 0) {
      return navigator.languages[0]
    }
    if (navigator.language) return navigator.language
  }
  return undefined
}

export function userDateTimeLocale(options?: DateTimePresentationOptions): string | undefined {
  return userLocale(options)
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
  return new Intl.DateTimeFormat(userLocale(presentationOptions), {
    ...options,
    timeZone: dateOnly ? undefined : userDateTimeZone(),
  }).format(parsed)
}

export function formatDate(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatPart(value, { year: 'numeric', month: '2-digit', day: '2-digit' }, options, true)
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
