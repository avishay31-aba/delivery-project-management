export type DateTimePresentationValue = string | number | Date | null | undefined

export interface DateTimePresentationOptions {
  fallback?: string
  locale?: string
}

function fallbackValue(options?: DateTimePresentationOptions): string {
  return options?.fallback ?? '-'
}

function userLocale(options?: DateTimePresentationOptions): string | undefined {
  if (options?.locale) return options.locale
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language
  return undefined
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
  return new Intl.DateTimeFormat(userLocale(presentationOptions), options).format(parsed)
}

export function formatDate(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatPart(value, { year: 'numeric', month: '2-digit', day: '2-digit' }, options, true)
}

export function formatDateOnly(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatDate(value, options)
}

export function formatTime(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatPart(value, { hour: '2-digit', minute: '2-digit', hour12: false }, options)
}

export function formatDateTime(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  const parsed = parseDateTime(value)
  if (!parsed) return fallbackValue(options)
  return `${formatDate(parsed, options)} ${formatTime(parsed, options)}`
}

export function formatDateTimeSeconds(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  const parsed = parseDateTime(value)
  if (!parsed) return fallbackValue(options)
  const time = formatPart(parsed, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }, options)
  return `${formatDate(parsed, options)} ${time}`
}

export function formatDateTimeWithSeconds(value: DateTimePresentationValue, options?: DateTimePresentationOptions): string {
  return formatDateTimeSeconds(value, options)
}
