import { PRODUCT_OPTIONS } from '@/config/cloud-platform-metadata'
import {
  PRODUCTION_OPERATIONAL_STATUS_OPTIONS,
  REGION_OPTIONS,
  REUSED_OPERATIONAL_STATUS_OPTIONS,
  REUSED_PURPOSE_OPTIONS,
  REUSED_STATUS_OPTIONS,
} from '@/config/picklist-options'

export type SystemInventorySource = 'Production' | 'Reused Internal Systems'

export interface SystemInventoryHeaderField {
  key: string
  label: string
  editable: boolean
  source: string
  line: number
  inputType?: 'text' | 'date' | 'integer' | 'picklist' | 'readonly'
  options?: string[]
}

export interface SystemInventoryTab {
  id: string
  label: string
}

export interface SystemInventoryMetadata {
  source: SystemInventorySource
  sourceSheet: string
  titleLabel: string
  headerFields: SystemInventoryHeaderField[]
  tabs: SystemInventoryTab[]
}

const SYSTEM_TABS: SystemInventoryTab[] = [
  { id: 'tenant', label: 'Tenant' },
  { id: 'infrastructure', label: 'Platform' },
  { id: 'versionUpdate', label: 'Version update' },
  { id: 'usage', label: 'Usage' },
  { id: 'configurationHistory', label: 'Configuration history' },
  { id: 'documents', label: 'Documents' },
]

export const productionSystemMetadata: SystemInventoryMetadata = {
  source: 'Production',
  sourceSheet: 'System form-Customer',
  titleLabel: 'SID',
  headerFields: [
    { key: 'sid', label: 'SID', editable: false, source: '1. Sticky Title', line: 1, inputType: 'readonly' },
    { key: 'purpose', label: 'Purpose', editable: false, source: '2. Header', line: 1, inputType: 'readonly' },
    { key: 'logo', label: 'Logo', editable: false, source: '2. Header', line: 1, inputType: 'readonly' },
    { key: 'tenantCount', label: 'Number of Tenants', editable: false, source: '2. Header', line: 1, inputType: 'integer' },
    {
      key: 'operationalStatus',
      label: 'Operational Status',
      editable: true,
      source: '2. Header',
      line: 1,
      inputType: 'picklist',
      options: PRODUCTION_OPERATIONAL_STATUS_OPTIONS,
    },
    { key: 'alerts', label: 'Alert', editable: false, source: '2. Header', line: 1, inputType: 'readonly' },
    { key: 'cognitoRegion', label: 'Cognito Region', editable: true, source: '2. Header', line: 2, inputType: 'picklist', options: REGION_OPTIONS },
    { key: 'timeGroup', label: 'Time Group', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'timeGroupAlert', label: 'Time Group Alert', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'linkedProjects', label: 'Linked Projects', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
  ],
  tabs: SYSTEM_TABS,
}

export const reusedInternalSystemMetadata: SystemInventoryMetadata = {
  source: 'Reused Internal Systems',
  sourceSheet: 'System form-POC-Demo-Training',
  titleLabel: 'MID',
  headerFields: [
    { key: 'machineId', label: 'MID', editable: true, source: '1. Sticky Title', line: 1, inputType: 'text' },
    { key: 'purpose', label: 'Purpose', editable: true, source: '2. Header', line: 1, inputType: 'picklist', options: REUSED_PURPOSE_OPTIONS },
    { key: 'status', label: 'Availability Status', editable: true, source: '2. Header', line: 1, inputType: 'picklist', options: REUSED_STATUS_OPTIONS },
    {
      key: 'operationalStatus',
      label: 'Operational Status',
      editable: true,
      source: '2. Header',
      line: 1,
      inputType: 'picklist',
      options: REUSED_OPERATIONAL_STATUS_OPTIONS,
    },
    { key: 'alerts', label: 'Alerts', editable: false, source: '2. Header', line: 1, inputType: 'readonly' },
    { key: 'productType', label: 'Product', editable: true, source: '2. Header', line: 2, inputType: 'picklist', options: PRODUCT_OPTIONS },
    { key: 'logo', label: 'Logo', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'tenantCount', label: 'Number of Tenants', editable: false, source: '2. Header', line: 2, inputType: 'integer' },
    { key: 'cognitoRegion', label: 'Cognito Region', editable: true, source: '2. Header', line: 3, inputType: 'picklist', options: REGION_OPTIONS },
    { key: 'timeGroup', label: 'Time Group', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
    { key: 'timeGroupAlert', label: 'Time Group Alert', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
    { key: 'usedInRegion', label: 'Used in Region', editable: true, source: 'POC/Training/Demo pool', line: 4, inputType: 'picklist', options: REGION_OPTIONS },
    { key: 'occupationStartDate', label: 'Occupation Start Date', editable: true, source: 'POC/Training/Demo pool', line: 4, inputType: 'date' },
    { key: 'occupationEndDate', label: 'Occupation End Date', editable: true, source: 'POC/Training/Demo pool', line: 4, inputType: 'date' },
  ],
  tabs: SYSTEM_TABS,
}
