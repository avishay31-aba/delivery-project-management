import type { ApplicationConfigurationFieldMetadata } from './types'

const YES_NO_OPTIONS = ['', 'YES', 'NO']

export const TENANT_APPLICATION_CONFIGURATION_FIELDS: ApplicationConfigurationFieldMetadata[] = [
  {
    key: 'productType',
    configKey: 'product',
    label: 'Product',
    group: 'Core Details',
    editable: true,
    inputType: 'picklist',
    options: ['Tangles', 'Tangles Light', 'Webloc', 'Weaver', 'Trapdoor', 'Lynx', 'DataAPI'],
    required: true,
  },
  { key: 'licenses', configKey: 'licenses', label: 'License', group: 'Core Details', editable: true, inputType: 'integer', required: true },
  { key: 'users', configKey: 'users', label: 'Users', group: 'Core Details', editable: true, inputType: 'integer', required: true },
  { key: 'concurrentSearches', configKey: 'concurrentSearches', label: 'Concurrent Searches', group: 'Core Details', editable: true, inputType: 'integer', required: true },
  { key: 'concurrentAnalyses', configKey: 'concurrentAnalyses', label: 'Concurrent Analyses', group: 'Core Details', editable: true, inputType: 'integer', required: true },
  { key: 'topicAnalyses', configKey: 'topicAnalyses', label: 'Topic Analysis', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'standardMonitors', configKey: 'standardMonitors', label: 'Std. Monitors', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'fullMonitors', configKey: 'fullMonitors', label: 'Full Monitors', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'topicMonitors', configKey: 'topicMonitors', label: 'Topic Monitors', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'dailySearches', configKey: 'dailySearches', label: 'Daily Qty Searches', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'monthlySearches', configKey: 'monthlySearches', label: 'Monthly Qty Searches', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'dailyAnalyses', configKey: 'dailyAnalyses', label: 'Daily Qty Analyses', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'monthlyAnalyses', configKey: 'monthlyAnalyses', label: 'Monthly Qty Analyses', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'mapCenter', configKey: 'mapCenter', label: 'Map Center', group: 'Core Details', editable: true, inputType: 'picklist', required: true },
  { key: 'tangles', configKey: 'tangles', label: 'Tangles', group: 'Modules / #users', editable: true, inputType: 'integer' },
  { key: 'tanglesGo', configKey: 'tanglesGo', label: 'Tangles Go', group: 'Modules / #users', editable: true, inputType: 'integer' },
  { key: 'webloc', configKey: 'webloc', label: 'Webloc', group: 'Modules / #users', editable: true, inputType: 'integer' },
  { key: 'webeye', configKey: 'webeye', label: 'Webeye', group: 'Modules / #users', editable: true, inputType: 'integer' },
  { key: 'ingest', configKey: 'ingest', label: 'Ingest', group: 'Modules / #users', editable: true, inputType: 'integer' },
  { key: 'blockchain', configKey: 'blockchain', label: 'Blockchain', group: 'Modules', editable: true, inputType: 'picklist', options: YES_NO_OPTIONS },
  {
    key: 'crossSystemFeatures',
    configKey: 'crossSystemFeatures',
    label: 'Additional Sources',
    group: 'Additional Sources',
    editable: true,
    inputType: 'multiselect',
    options: ['Weaver', 'Dark web', 'Lynx'],
  },
  { key: 'apiEnabled', configKey: 'apiEnabled', label: 'API Enable', group: 'API', editable: true, inputType: 'picklist', options: YES_NO_OPTIONS },
  { key: 'apiDailyQty', configKey: 'apiDailyQty', label: 'API Daily Qty', group: 'API', editable: true, inputType: 'integer' },
  { key: 'apiMonthlyQty', configKey: 'apiMonthlyQty', label: 'API Monthly Qty', group: 'API', editable: true, inputType: 'integer' },
  {
    key: 'aiFeatures',
    configKey: 'aiFeatures',
    label: 'AI',
    group: 'AI',
    editable: true,
    inputType: 'multiselect',
    options: ['Face Detection', 'OCR', 'Object Detection', 'Reverse Face', 'Landmark', 'Video Analysis', 'CoAnalyst'],
  },
  {
    key: 'additionalFeatures',
    configKey: 'additionalFeatures',
    label: 'Additional Features',
    group: 'Additional features',
    editable: true,
    inputType: 'multiselect',
    options: ['SSO', '2FA', 'Export to PDF', 'Enhanced Search', 'Post Translation', 'Advanced Search'],
  },
]

export const APPLICATION_CONFIGURATION_FIELDS = TENANT_APPLICATION_CONFIGURATION_FIELDS
export const TENANT_CONFIGURATION_FIELDS = TENANT_APPLICATION_CONFIGURATION_FIELDS
export const APPLICATION_CONFIGURATION_SUMMARY_FIELDS = TENANT_APPLICATION_CONFIGURATION_FIELDS
