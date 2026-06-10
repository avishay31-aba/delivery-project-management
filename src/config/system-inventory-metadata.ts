export type SystemInventorySource = 'Production' | 'Reused Internal Systems'

export interface SystemInventoryHeaderField {
  key: string
  label: string
  editable: boolean
  source: string
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
  { id: 'infrastructure', label: 'Infrastructure' },
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
    { key: 'sid', label: 'SID', editable: false, source: '1. Sticky Title' },
    { key: 'source', label: 'Source', editable: false, source: '2. Header' },
    { key: 'purpose', label: 'Purpose', editable: false, source: '2. Header' },
    { key: 'productType', label: 'Product', editable: true, source: '2. Header' },
    { key: 'tenantCount', label: '# Tenants', editable: false, source: '2. Header' },
    { key: 'operationalStatus', label: 'Operational mode', editable: true, source: '2. Header' },
    { key: 'alerts', label: 'Alerts', editable: false, source: '2. Header' },
    { key: 'region', label: 'Region', editable: true, source: '2. Header' },
    { key: 'country', label: 'Country', editable: true, source: '2. Header' },
    { key: 'state', label: 'State', editable: true, source: '2. Header' },
    { key: 'timeGroup', label: 'Time group', editable: true, source: '2. Header' },
    { key: 'hostingType', label: 'Hosting', editable: true, source: 'Infrastructure' },
    { key: 'cloudPlatform', label: 'Cloud Platform', editable: true, source: 'Infrastructure' },
  ],
  tabs: SYSTEM_TABS,
}

export const reusedInternalSystemMetadata: SystemInventoryMetadata = {
  source: 'Reused Internal Systems',
  sourceSheet: 'System form-POC-Demo-Training',
  titleLabel: 'MID',
  headerFields: [
    { key: 'machineId', label: 'MID', editable: false, source: '1. Sticky Title' },
    { key: 'source', label: 'Source', editable: false, source: '2. Header' },
    { key: 'purpose', label: 'Purpose', editable: true, source: '2. Header' },
    { key: 'status', label: 'Availability status', editable: true, source: '2. Header' },
    { key: 'operationalStatus', label: 'Operational mode', editable: true, source: '2. Header' },
    { key: 'alerts', label: 'Alerts', editable: false, source: '2. Header' },
    { key: 'productType', label: 'Product', editable: true, source: '2. Header' },
    { key: 'tenantCount', label: '# Tenants', editable: false, source: '2. Header' },
    { key: 'usedInRegion', label: 'Used in Region', editable: true, source: 'POC/Training/Demo pool' },
    { key: 'occupationStartDate', label: 'Occupation start date', editable: true, source: 'POC/Training/Demo pool' },
    { key: 'occupationEndDate', label: 'Occupation end date', editable: true, source: 'POC/Training/Demo pool' },
    { key: 'currentProjectIds', label: 'Current Project', editable: false, source: '2. Header' },
    { key: 'hostingType', label: 'Hosting', editable: true, source: 'Infrastructure' },
    { key: 'cloudPlatform', label: 'Cloud Platform', editable: true, source: 'Infrastructure' },
  ],
  tabs: SYSTEM_TABS,
}
