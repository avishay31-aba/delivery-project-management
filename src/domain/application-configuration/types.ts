import type { TenantConfiguration } from '@/data/seed.types'

export type ApplicationConfiguration = TenantConfiguration

export type ApplicationConfigurationKey =
  | 'product'
  | 'licenses'
  | 'users'
  | 'concurrentSearches'
  | 'dailySearches'
  | 'monthlySearches'
  | 'concurrentAnalyses'
  | 'dailyAnalyses'
  | 'monthlyAnalyses'
  | 'topicAnalyses'
  | 'standardMonitors'
  | 'fullMonitors'
  | 'topicMonitors'
  | 'mapCenter'
  | 'tangles'
  | 'tanglesGo'
  | 'webloc'
  | 'webeye'
  | 'ingest'
  | 'blockchain'
  | 'crossSystemFeatures'
  | 'apiEnabled'
  | 'apiDailyQty'
  | 'apiMonthlyQty'
  | 'aiFeatures'
  | 'additionalFeatures'

export interface SharedFieldMetadata {
  key: string
  label: string
  group: string
  editable: boolean
  inputType?: 'text' | 'integer' | 'picklist' | 'multiselect'
  options?: string[]
  required?: boolean
  requiredWhen?: string
}

export type ApplicationConfigurationFieldMetadata = SharedFieldMetadata & {
  configKey: ApplicationConfigurationKey
}

export interface ValidationMessage {
  level: 'error' | 'warning'
  message: string
}
