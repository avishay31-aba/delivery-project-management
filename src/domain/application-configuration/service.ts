import type { ConfigurationHistoryRecord, TenantConfigurationHistoryRecord } from '@/data/seed.types'
import { APPLICATION_CONFIGURATION_FIELDS } from './metadata'
import type {
  ApplicationConfiguration,
  ApplicationConfigurationComparisonResult,
  ApplicationConfigurationFieldMetadata,
  SharedFieldMetadata,
} from './types'

export const APPLICATION_CONFIGURATION_CATEGORY_ORDER = [
  'Hosting',
  'Core Details',
  'Modules',
  'AI',
  'Additional Features',
] as const

export function applicationConfigurationValue(
  configuration: ApplicationConfiguration,
  field: ApplicationConfigurationFieldMetadata,
): unknown {
  return configuration[field.configKey]
}

export function applicationConfigurationFieldForRequirementKey(key: string): ApplicationConfigurationFieldMetadata | undefined {
  return APPLICATION_CONFIGURATION_FIELDS.find((field) => field.key === key || field.configKey === key)
}

function normalizeScalar(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Number(String(value).trim())
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : normalizeScalar(value).split(/[;,]/)
  const unique = new Map<string, string>()
  values
    .map((item) => normalizeScalar(item))
    .filter(Boolean)
    .forEach((item) => unique.set(item.toLocaleLowerCase(), item))
  return Array.from(unique.values()).sort((first, second) => first.localeCompare(second))
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  const normalized = normalizeScalar(value).toLocaleLowerCase()
  if (['yes', 'y', 'true', '1'].includes(normalized)) return true
  if (['no', 'n', 'false', '0'].includes(normalized)) return false
  return null
}

function hasSameListValues(first: string[], second: string[]): boolean {
  return first.length === second.length && first.every((value, index) => value.toLocaleLowerCase() === second[index]?.toLocaleLowerCase())
}

export function compareApplicationConfigurationField(
  field: ApplicationConfigurationFieldMetadata,
  requestedRecord: Record<string, unknown>,
  currentConfiguration: ApplicationConfiguration,
): ApplicationConfigurationComparisonResult {
  const requestedValue = field.key in requestedRecord ? requestedRecord[field.key] : requestedRecord[field.configKey]
  const currentValue = applicationConfigurationValue(currentConfiguration, field)

  if (field.inputType === 'integer') {
    const requestedNumber = normalizeNumber(requestedValue)
    const currentNumber = normalizeNumber(currentValue)
    const matches = requestedNumber === currentNumber
    const direction = matches
      ? 'none'
      : requestedNumber !== null && (currentNumber === null || requestedNumber > currentNumber)
        ? 'increase'
        : requestedNumber !== null && currentNumber !== null && requestedNumber < currentNumber
          ? 'decrease'
          : 'changed'

    return {
      fieldKey: field.key,
      dataType: 'number',
      matches,
      currentValue: currentNumber,
      requestedValue: requestedNumber,
      direction,
      addedItems: [],
      removedItems: [],
    }
  }

  if (field.inputType === 'multiselect') {
    const requestedItems = normalizeList(requestedValue)
    const currentItems = normalizeList(currentValue)
    const requestedKeys = new Set(requestedItems.map((item) => item.toLocaleLowerCase()))
    const currentKeys = new Set(currentItems.map((item) => item.toLocaleLowerCase()))
    const addedItems = requestedItems.filter((item) => !currentKeys.has(item.toLocaleLowerCase()))
    const removedItems = currentItems.filter((item) => !requestedKeys.has(item.toLocaleLowerCase()))
    const matches = hasSameListValues(requestedItems, currentItems)

    return {
      fieldKey: field.key,
      dataType: 'list',
      matches,
      currentValue: currentItems,
      requestedValue: requestedItems,
      direction: matches ? 'none' : 'changed',
      addedItems,
      removedItems,
    }
  }

  const requestedBooleanValue = normalizeBoolean(requestedValue)
  const currentBooleanValue = normalizeBoolean(currentValue)
  if (requestedBooleanValue !== null || currentBooleanValue !== null) {
    const matches = requestedBooleanValue === currentBooleanValue
    return {
      fieldKey: field.key,
      dataType: 'boolean',
      matches,
      currentValue: currentBooleanValue,
      requestedValue: requestedBooleanValue,
      direction: matches ? 'none' : 'changed',
      addedItems: [],
      removedItems: [],
      requestedBooleanValue,
    }
  }

  const requestedText = normalizeScalar(requestedValue)
  const currentText = normalizeScalar(currentValue)
  const matches = requestedText.localeCompare(currentText, undefined, { sensitivity: 'accent' }) === 0
  return {
    fieldKey: field.key,
    dataType: 'string',
    matches,
    currentValue: currentText,
    requestedValue: requestedText,
    direction: matches ? 'none' : 'changed',
    addedItems: [],
    removedItems: [],
  }
}

export function applicationConfigurationCategoryLabel(field: Pick<SharedFieldMetadata, 'key' | 'group'>): string {
  if (field.key === 'hostingType' || field.key === 'cloudPlatform' || field.group === 'Environment' || field.group === 'Hosting') {
    return 'Hosting'
  }
  if (field.group === 'Modules / #users' || field.group === 'Modules') {
    return 'Modules'
  }
  if (field.group === 'AI') {
    return 'AI'
  }
  if (field.group === 'Additional Sources' || field.group === 'Additional features' || field.group === 'Additional Features' || field.group === 'API') {
    return 'Additional Features'
  }
  return field.group || 'Core Details'
}

export function applicationConfigurationFieldOrder(fields: SharedFieldMetadata[]): SharedFieldMetadata[] {
  const categoryIndex = new Map<string, number>(APPLICATION_CONFIGURATION_CATEGORY_ORDER.map((category, index) => [category, index]))
  return fields
    .map((field, index) => ({ field, index }))
    .sort((first, second) => {
      const firstCategory = categoryIndex.get(applicationConfigurationCategoryLabel(first.field)) ?? APPLICATION_CONFIGURATION_CATEGORY_ORDER.length
      const secondCategory = categoryIndex.get(applicationConfigurationCategoryLabel(second.field)) ?? APPLICATION_CONFIGURATION_CATEGORY_ORDER.length
      return firstCategory - secondCategory || first.index - second.index
    })
    .map(({ field }) => field)
}

export function applicationConfigurationRecordValue(record: Record<string, unknown>, field: SharedFieldMetadata): unknown {
  const hostingSnapshot = record.hostingSnapshot as Record<string, unknown> | undefined
  const configuration = record.configuration as Record<string, unknown> | undefined

  if (field.key === 'hostingType') {
    return hostingSnapshot?.hostingType ?? record.hostingType
  }
  if (field.key === 'cloudPlatform') {
    return hostingSnapshot?.platform ?? record.cloudPlatform
  }
  if (field.key === 'productType') {
    return configuration?.product ?? record.productType
  }
  if (configuration && field.key in configuration) {
    return configuration[field.key]
  }
  return record[field.key]
}

export type ApplicationConfigurationHistoryRecord = ConfigurationHistoryRecord | TenantConfigurationHistoryRecord

export function configurationHistoryReadModel<T extends { configurationHistory?: ApplicationConfigurationHistoryRecord[] }>(
  parent: T | null | undefined,
): ApplicationConfigurationHistoryRecord[] {
  return Array.isArray(parent?.configurationHistory) ? parent.configurationHistory : []
}

type ConfigurationSummaryField = [field: string, label: string]

const CONFIGURATION_MODULE_FIELDS: ConfigurationSummaryField[] = [
  ['tangles', 'Tangles'],
  ['tanglesGo', 'Tangles Go'],
  ['webloc', 'WebLOC'],
  ['webeye', 'WebEye'],
  ['ingest', 'Ingest'],
  ['blockchain', 'Blockchain'],
  ['apiEnabled', 'API'],
]

const CONFIGURATION_ADDITIONAL_FEATURE_FIELDS: ConfigurationSummaryField[] = [
  ['crossSystemFeatures', 'Additional Sources'],
  ['additionalFeatures', 'Additional Features'],
]

function uniqueEnabledConfigurationLabels(records: Array<Record<string, unknown>>, fields: ConfigurationSummaryField[]): string[] {
  const labels: string[] = []
  records.forEach((record) => {
    fields.forEach(([field, label]) => {
      const value = record[field]
      if (Array.isArray(value) && value.length > 0) {
        labels.push(...value.map(String).filter(Boolean))
      } else if (typeof value === 'number' && value > 0) {
        labels.push(label)
      } else if (typeof value === 'string' && value && value !== 'NO') {
        labels.push(label)
      }
    })
  })
  return Array.from(new Set(labels))
}

export interface ConfigurationSummaryFormatterResult {
  modules: string[]
  ai: string[]
  additionalFeatures: string[]
  visibleTokens: string[]
  tooltip: string
}

export function formatConfigurationSummaryForRecords(records: Array<Record<string, unknown>>): ConfigurationSummaryFormatterResult {
  const modules = uniqueEnabledConfigurationLabels(records, CONFIGURATION_MODULE_FIELDS)
  const ai = uniqueEnabledConfigurationLabels(records, [['aiFeatures', 'AI']])
  const additionalFeatures = uniqueEnabledConfigurationLabels(records, CONFIGURATION_ADDITIONAL_FEATURE_FIELDS)
  const visibleTokens = [
    ...modules,
    ai.length > 0 ? 'AI' : '',
    additionalFeatures.length > 0 ? 'AF' : '',
  ].filter(Boolean)

  return {
    modules,
    ai,
    additionalFeatures,
    visibleTokens,
    tooltip: [
      `Modules: ${modules.join(', ') || '-'}`,
      `AI: ${ai.join(', ') || '-'}`,
      `Additional Features: ${additionalFeatures.join(', ') || '-'}`,
    ].join('\n'),
  }
}

export function numericOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
