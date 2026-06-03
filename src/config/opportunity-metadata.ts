import type { OpportunitySubType, OpportunityType, RequirementType } from '@/data/seed.types'

export interface OpportunityHeaderField {
  key:
    | 'opportunityName'
    | 'type'
    | 'subType'
    | 'deliveryDate'
    | 'pocStartDate'
    | 'pocEndDate'
    | 'warrantyServiceMonths'
    | 'warrantyRecordId'
    | 'opportunityId'
    | 'accountId'
    | 'region'
    | 'country'
    | 'state'
    | 'timeZone'
    | 'projectAlerts'
    | 'currentMilestone'
    | 'salesManagerId'
  label: string
  editable: boolean
  source: string
}

export interface RequirementColumnMetadata {
  key: string
  label: string
  group: string
  editable: boolean
  inputType?: 'text' | 'integer' | 'picklist' | 'multiselect'
  options?: string[]
}

export interface OpportunityMetadata {
  sourceSheet: string
  headerFields: OpportunityHeaderField[]
  visibleRequirementTypes: RequirementType[]
}

const COMMON_HEADER_FIELDS: OpportunityHeaderField[] = [
  { key: 'opportunityName', label: 'Opportunity name', editable: true, source: '2. Header yellow cells' },
  { key: 'type', label: 'Opportunity Type', editable: true, source: '2. Header yellow cells' },
  { key: 'subType', label: 'Opportunity sub type', editable: true, source: '2. Header yellow cells' },
  { key: 'opportunityId', label: 'Opportunity (name and ID)', editable: true, source: '2. Header yellow cells' },
  { key: 'accountId', label: 'Account (end user)', editable: true, source: '2. Header yellow cells' },
  { key: 'region', label: 'Region', editable: false, source: '2. Header yellow cells' },
  { key: 'country', label: 'Country', editable: false, source: '2. Header yellow cells' },
  { key: 'state', label: 'State', editable: false, source: '2. Header yellow cells' },
  { key: 'timeZone', label: 'Time Zone', editable: false, source: '2. Header yellow cells' },
  { key: 'salesManagerId', label: 'Deal Owner', editable: true, source: '2. Header yellow cells' },
  { key: 'currentMilestone', label: 'Current milestone', editable: false, source: '2. Header yellow cells' },
  { key: 'projectAlerts', label: 'Project Alerts', editable: false, source: '2. Header yellow cells' },
]

const POC_HEADER_FIELDS: OpportunityHeaderField[] = [
  ...COMMON_HEADER_FIELDS.slice(0, 3),
  { key: 'deliveryDate', label: 'Delivery date', editable: true, source: '2. Header yellow cells' },
  { key: 'pocStartDate', label: 'Start Date', editable: true, source: '2. Header yellow cells' },
  { key: 'pocEndDate', label: 'End Date', editable: true, source: '2. Header yellow cells' },
  ...COMMON_HEADER_FIELDS.slice(3),
]

const DELIVERY_HEADER_FIELDS: OpportunityHeaderField[] = [
  ...COMMON_HEADER_FIELDS.slice(0, 3),
  { key: 'deliveryDate', label: 'Delivery date', editable: true, source: '2. Header yellow cells' },
  {
    key: 'warrantyServiceMonths',
    label: 'Warranty/Service period (months)',
    editable: true,
    source: '2. Header yellow cells',
  },
  ...COMMON_HEADER_FIELDS.slice(3),
]

const RENEWAL_STANDARD_HEADER_FIELDS: OpportunityHeaderField[] = [
  ...COMMON_HEADER_FIELDS.slice(0, 3),
  {
    key: 'warrantyRecordId',
    label: 'Warranty record to extend',
    editable: true,
    source: '2. Header yellow cells',
  },
  {
    key: 'warrantyServiceMonths',
    label: 'Warranty/Service period (months)',
    editable: true,
    source: '2. Header yellow cells',
  },
  ...COMMON_HEADER_FIELDS.slice(3),
]

const RENEWAL_CHANGE_HEADER_FIELDS: OpportunityHeaderField[] = [
  ...COMMON_HEADER_FIELDS.slice(0, 3),
  {
    key: 'warrantyRecordId',
    label: 'Warranty record to extend',
    editable: true,
    source: '2. Header yellow cells',
  },
  { key: 'deliveryDate', label: 'Delivery date', editable: true, source: '2. Header yellow cells' },
  {
    key: 'warrantyServiceMonths',
    label: 'Warranty/Service period (months)',
    editable: true,
    source: '2. Header yellow cells',
  },
  ...COMMON_HEADER_FIELDS.slice(3),
]

export const requirementAColumns: RequirementColumnMetadata[] = [
  { key: 'requirementId', label: 'Requirement ID', group: 'Tenant requirements', editable: true },
  { key: 'deployTarget', label: 'System New/Existing?', group: 'Tenant requirements', editable: true, inputType: 'picklist' },
  { key: 'existingSystemId', label: 'Existing System SID', group: 'Tenant requirements', editable: true },
  { key: 'hostingType', label: 'Hosting', group: 'Environment', editable: true, inputType: 'picklist' },
  { key: 'cloudPlatform', label: 'Cloud Platform', group: 'Environment', editable: true, inputType: 'picklist' },
  { key: 'productType', label: 'Product', group: 'Core Details', editable: true, inputType: 'picklist' },
  { key: 'mapCenter', label: 'Map Center', group: 'Core Details', editable: true, inputType: 'picklist' },
  { key: 'licenses', label: 'Licenses', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'users', label: 'Users', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'concurrentSearches', label: 'Con. Searches', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'dailySearches', label: 'Daily Qty Searches', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'monthlySearches', label: 'Monthly Qty Searches', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'concurrentAnalyses', label: 'Con. Analyses', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'dailyAnalyses', label: 'Daily Qty Analyses', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'monthlyAnalyses', label: 'Monthly Qty Analyses', group: 'Core Details', editable: true, inputType: 'integer' },
  { key: 'tanglesGo', label: 'Tangles Go', group: 'Modules', editable: true, inputType: 'picklist' },
  { key: 'webloc', label: 'Webloc', group: 'Modules', editable: true, inputType: 'picklist' },
  { key: 'webeye', label: 'Webeye', group: 'Modules', editable: true, inputType: 'picklist' },
  { key: 'ingest', label: 'Ingest', group: 'Modules', editable: true, inputType: 'picklist' },
  { key: 'blockchain', label: 'Blockchain', group: 'Modules', editable: true, inputType: 'picklist' },
  { key: 'crossSystemFeatures', label: 'Cross System', group: 'Modules', editable: true, inputType: 'multiselect' },
  { key: 'standardMonitors', label: 'Std. Monitors', group: 'Modules', editable: true, inputType: 'integer' },
  { key: 'fullMonitors', label: 'Full monitors', group: 'Modules', editable: true, inputType: 'integer' },
  { key: 'apiEnabled', label: 'API Enable', group: 'API', editable: true, inputType: 'picklist' },
  { key: 'apiDailyQty', label: 'API Daily Qty', group: 'API', editable: true, inputType: 'integer' },
  { key: 'apiMonthlyQty', label: 'API Monthly', group: 'API', editable: true, inputType: 'integer' },
  { key: 'aiFeatures', label: 'AI', group: 'AI', editable: true, inputType: 'multiselect' },
  { key: 'topicAnalyses', label: 'Topic analyses', group: 'AI', editable: true, inputType: 'picklist' },
  { key: 'additionalFeatures', label: 'Additional Features', group: 'Additional features', editable: true, inputType: 'multiselect' },
]

export const requirementBColumns: RequirementColumnMetadata[] = [
  { key: 'requirementId', label: 'Req ID', group: 'Tenant requirements', editable: true },
  { key: 'tenantId', label: 'TID', group: 'Tenant requirements', editable: true },
  { key: 'systemId', label: 'SID', group: 'Tenant requirements', editable: false },
  ...requirementAColumns.slice(3),
]

export const requirementCColumns: RequirementColumnMetadata[] = [
  { key: 'requirementId', label: 'Req ID', group: 'Tenant requirements', editable: true },
  { key: 'tenantId', label: 'TID', group: 'Tenant requirements', editable: true },
  { key: 'systemId', label: 'SID', group: 'Tenant requirements', editable: false },
  { key: 'warrantyStatus', label: 'Warranty status', group: 'Renewal context', editable: false },
  { key: 'warrantyEndDate', label: 'Warranty end date', group: 'Renewal context', editable: false },
]

function keyForOpportunity(type: OpportunityType, subType: OpportunitySubType): string {
  return `${type}:${subType}`
}

const METADATA_BY_TYPE = new Map<string, OpportunityMetadata>([
  [
    keyForOpportunity('POC', 'FREE'),
    {
      sourceSheet: 'Project Form - POC',
      headerFields: POC_HEADER_FIELDS,
      visibleRequirementTypes: ['A'],
    },
  ],
  [
    keyForOpportunity('POC', 'PAID'),
    {
      sourceSheet: 'Project Form - POC',
      headerFields: POC_HEADER_FIELDS,
      visibleRequirementTypes: ['A'],
    },
  ],
  [
    keyForOpportunity('DELIVERY', 'NEW'),
    {
      sourceSheet: 'Project Form-Delivery-New',
      headerFields: DELIVERY_HEADER_FIELDS,
      visibleRequirementTypes: ['A'],
    },
  ],
  [
    keyForOpportunity('DELIVERY', 'UPSELL'),
    {
      sourceSheet: 'Project form-Delivery-Upsell',
      headerFields: DELIVERY_HEADER_FIELDS,
      visibleRequirementTypes: ['A', 'B'],
    },
  ],
  [
    keyForOpportunity('RENEWAL', 'STANDARD'),
    {
      sourceSheet: 'Project form-Renewal-Standard',
      headerFields: RENEWAL_STANDARD_HEADER_FIELDS,
      visibleRequirementTypes: ['C'],
    },
  ],
  [
    keyForOpportunity('RENEWAL', 'UPSELL'),
    {
      sourceSheet: 'Project form-Renewal-Upsell',
      headerFields: RENEWAL_CHANGE_HEADER_FIELDS,
      visibleRequirementTypes: ['A', 'B', 'C'],
    },
  ],
  [
    keyForOpportunity('RENEWAL', 'DOWN_SELL'),
    {
      sourceSheet: 'Project form-Renewal-Down Sell',
      headerFields: RENEWAL_CHANGE_HEADER_FIELDS,
      visibleRequirementTypes: ['B', 'C'],
    },
  ],
])

export function getOpportunityMetadata(type: OpportunityType, subType: OpportunitySubType): OpportunityMetadata {
  return (
    METADATA_BY_TYPE.get(keyForOpportunity(type, subType)) ?? {
      sourceSheet: 'Project form - general',
      headerFields: DELIVERY_HEADER_FIELDS,
      visibleRequirementTypes: [],
    }
  )
}

export function getVisibleRequirementTypes(type: OpportunityType, subType: OpportunitySubType): RequirementType[] {
  return getOpportunityMetadata(type, subType).visibleRequirementTypes
}
