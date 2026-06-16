import type { ApplicationConfiguration, ApplicationConfigurationFieldMetadata } from './types'

export function applicationConfigurationValue(
  configuration: ApplicationConfiguration,
  field: ApplicationConfigurationFieldMetadata,
): unknown {
  return configuration[field.configKey]
}

export function numericOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}
