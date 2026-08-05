import type { UserPresentationPreference } from '@/data/seed.types'

export type RecordsPerPageValue = 10 | 20 | 25 | 50 | 100 | 'all'

export const RECORDS_PER_PAGE_OPTIONS: RecordsPerPageValue[] = [10, 20, 25, 50, 100, 'all']
export const SYSTEM_DEFAULT_RECORDS_PER_PAGE: RecordsPerPageValue = 10
export const USER_PREFERENCE_TYPE_RECORDS_PER_PAGE = 'RecordsPerPage'

export function recordsPerPageLabel(value: RecordsPerPageValue): string {
  return value === 'all' ? 'All' : String(value)
}

export function normalizeRecordsPerPageValue(value: unknown): RecordsPerPageValue | null {
  if (value === 'all') return 'all'
  const numeric = Number(value)
  return RECORDS_PER_PAGE_OPTIONS.includes(numeric as RecordsPerPageValue)
    ? numeric as RecordsPerPageValue
    : null
}

export function normalizeUserPresentationPreferences(preferences: UserPresentationPreference[] | undefined): UserPresentationPreference[] {
  return (preferences ?? []).filter((preference) => {
    if (preference.preferenceType !== USER_PREFERENCE_TYPE_RECORDS_PER_PAGE) return true
    return Boolean(normalizeRecordsPerPageValue(preference.value))
  })
}

export function recordsPerPagePreference(
  preferences: UserPresentationPreference[],
  userId: string,
  context: string,
): RecordsPerPageValue | null {
  const preference = preferences.find((candidate) =>
    candidate.userId === userId &&
    candidate.preferenceType === USER_PREFERENCE_TYPE_RECORDS_PER_PAGE &&
    candidate.context === context,
  )
  return normalizeRecordsPerPageValue(preference?.value)
}

export function effectiveRecordsPerPage(
  preferences: UserPresentationPreference[],
  userId: string,
  context: string | undefined,
  systemDefault: RecordsPerPageValue = SYSTEM_DEFAULT_RECORDS_PER_PAGE,
): RecordsPerPageValue {
  if (!context) return systemDefault
  return recordsPerPagePreference(preferences, userId, context) ?? systemDefault
}

export function preferenceContextLabel(context: string): string {
  return context
    .split(/[-:]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
