import type { ValidationMessage } from './types'

type ApplicationConfigurationValidationSource = Record<string, unknown>

const INTEGER_FIELD_LABELS: Array<[string, string]> = [
  ['licenses', 'Licenses'],
  ['users', 'Users'],
  ['concurrentSearches', 'Concurrent searches'],
  ['dailySearches', 'Daily searches'],
  ['monthlySearches', 'Monthly searches'],
  ['concurrentAnalyses', 'Concurrent analyses'],
  ['topicAnalyses', 'Topic analysis'],
  ['dailyAnalyses', 'Daily analyses'],
  ['monthlyAnalyses', 'Monthly analyses'],
  ['tangles', 'Tangles'],
  ['tanglesGo', 'Tangles Go'],
  ['webloc', 'Webloc'],
  ['webeye', 'Webeye'],
  ['ingest', 'Ingest'],
  ['standardMonitors', 'Standard monitors'],
  ['fullMonitors', 'Full monitors'],
  ['topicMonitors', 'Topic monitors'],
  ['apiDailyQty', 'API daily quantity'],
  ['apiMonthlyQty', 'API monthly quantity'],
]

const MODULE_QUANTITY_FIELD_LABELS: Array<[string, string]> = [
  ['tangles', 'Tangles'],
  ['tanglesGo', 'Tangles Go'],
  ['webloc', 'Webloc'],
  ['webeye', 'Webeye'],
  ['ingest', 'Ingest'],
]

export function validateApplicationConfigurationIntegerFields(
  source: ApplicationConfigurationValidationSource,
): ValidationMessage[] {
  return INTEGER_FIELD_LABELS.flatMap(([key, label]) => {
    const value = source[key]

    return value == null || value === '' || (typeof value === 'number' && Number.isInteger(value))
      ? []
      : [{ level: 'error' as const, message: `${label} must be an integer.` }]
  })
}

export function validateApplicationModuleQuantitiesDoNotExceedUsers(
  source: ApplicationConfigurationValidationSource,
  gridName: string,
  rowIndex: number,
): ValidationMessage[] {
  const users = source.users
  if (typeof users !== 'number' || !Number.isInteger(users)) return []

  return MODULE_QUANTITY_FIELD_LABELS.flatMap(([key, label]) => {
    const value = source[key]
    return typeof value === 'number' && value > users
      ? [
          {
            level: 'error' as const,
            message: `${gridName} row ${rowIndex + 1}: ${label} - Module quantity cannot exceed number of users.`,
          },
        ]
      : []
  })
}

export function validateApplicationLicensesDoNotExceedUsers(
  source: ApplicationConfigurationValidationSource,
  gridName: string,
  rowIndex: number,
): ValidationMessage[] {
  const users = source.users
  const licenses = source.licenses

  return typeof users === 'number' && typeof licenses === 'number' && licenses > users
    ? [
        {
          level: 'error' as const,
          message: `${gridName} row ${rowIndex + 1}: Licenses cannot exceed number of users.`,
        },
      ]
    : []
}
