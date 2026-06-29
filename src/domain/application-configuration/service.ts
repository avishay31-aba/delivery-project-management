import type { ApplicationConfiguration, ApplicationConfigurationFieldMetadata, SharedFieldMetadata } from './types'

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

export function numericOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
