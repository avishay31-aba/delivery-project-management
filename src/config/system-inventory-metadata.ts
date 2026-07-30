import { PRODUCT_OPTIONS } from '@/config/cloud-platform-metadata'
import {
  PRODUCTION_OPERATIONAL_STATUS_OPTIONS,
  COGNITO_REGION_OPTIONS,
  REGION_OPTIONS,
  REUSED_OPERATIONAL_STATUS_OPTIONS,
  REUSED_PURPOSE_OPTIONS,
  REUSED_STATUS_OPTIONS,
} from '@/config/picklist-options'
import {
  SYSTEM_INVENTORY_TABS,
  SYSTEM_SOURCE_PRODUCTION,
  SYSTEM_SOURCE_REUSED_INTERNAL,
  type SystemInventoryHeaderField,
  type SystemInventoryMetadata,
  type SystemInventorySource,
  type SystemInventoryTab,
} from '@/domain/system-inventory'
export { SYSTEM_OBJECT_DEFINITION } from '@/domain/object-registry'

export type {
  SystemInventoryHeaderField,
  SystemInventoryMetadata,
  SystemInventorySource,
  SystemInventoryTab,
}

export const productionSystemMetadata: SystemInventoryMetadata = {
  source: SYSTEM_SOURCE_PRODUCTION,
  sourceSheet: 'System form-Customer',
  titleLabel: 'SID',
  headerFields: [
    { key: 'sid', label: 'SID', editable: false, source: '1. Sticky Title', line: 1, inputType: 'readonly' },
    { key: 'purpose', label: 'Purpose', editable: false, source: '2. Header', line: 1, inputType: 'readonly' },
    { key: 'availability', label: 'Availability Status', editable: false, source: '2. Header', line: 1, inputType: 'readonly' },
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
    { key: 'productType', label: 'Product', editable: true, source: '2. Header', line: 2, inputType: 'picklist', options: PRODUCT_OPTIONS },
    { key: 'logo', label: 'Product Logo', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'tenantCount', label: 'Number of Tenants', editable: false, source: '2. Header', line: 2, inputType: 'integer' },
    { key: 'currentVersion', label: 'Current Version', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'currentBuild', label: 'Current Build', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'cognitoRegion', label: 'Cognito Region', editable: true, source: '2. Header', line: 3, inputType: 'picklist', options: COGNITO_REGION_OPTIONS, required: true },
    { key: 'usedInRegion', label: 'Used In Region', editable: true, source: '2. Header', line: 3, inputType: 'picklist', options: REGION_OPTIONS, required: true },
    { key: 'timeGroup', label: 'Time Group', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
    { key: 'timeGroupAlert', label: 'Time Group Alert', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
  ],
  tabs: SYSTEM_INVENTORY_TABS,
}

export const reusedInternalSystemMetadata: SystemInventoryMetadata = {
  source: SYSTEM_SOURCE_REUSED_INTERNAL,
  sourceSheet: 'System form-POC-Demo-Training',
  titleLabel: 'MID',
  headerFields: [
    { key: 'machineId', label: 'MID', editable: true, source: '1. Sticky Title', line: 1, inputType: 'text', required: true },
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
    { key: 'currentVersion', label: 'Current Version', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'currentBuild', label: 'Current Build', editable: false, source: '2. Header', line: 2, inputType: 'readonly' },
    { key: 'cognitoRegion', label: 'Cognito Region', editable: true, source: '2. Header', line: 3, inputType: 'picklist', options: COGNITO_REGION_OPTIONS, required: true },
    { key: 'usedInRegion', label: 'Used In Region', editable: true, source: 'POC/Training/Demo pool', line: 3, inputType: 'picklist', options: REGION_OPTIONS, required: true },
    { key: 'timeGroup', label: 'Time Group', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
    { key: 'timeGroupAlert', label: 'Time Group Alert', editable: false, source: '2. Header', line: 3, inputType: 'readonly' },
    { key: 'currentSid', label: 'Current SID', editable: false, source: 'POC/Training/Demo pool', line: 4, inputType: 'readonly' },
    { key: 'occupationStartDate', label: 'Occupation Start Date', editable: true, source: 'POC/Training/Demo pool', line: 5, inputType: 'date' },
    { key: 'occupationEndDate', label: 'Occupation End Date', editable: true, source: 'POC/Training/Demo pool', line: 5, inputType: 'date' },
  ],
  tabs: [...SYSTEM_INVENTORY_TABS, { id: 'owner', label: 'Owner' }],
}
