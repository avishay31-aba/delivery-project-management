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
    | 'opportunityId'
    | 'accountId'
    | 'region'
    | 'country'
    | 'state'
    | 'timeZone'
    | 'timeGroup'
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
  { key: 'deliveryDate', label: 'Delivery date', editable: true, source: '2. Header yellow cells' },
  { key: 'opportunityId', label: 'Opportunity (name and ID)', editable: true, source: '2. Header yellow cells' },
  { key: 'accountId', label: 'Account (end user)', editable: true, source: '2. Header yellow cells' },
  { key: 'region', label: 'Region', editable: false, source: '2. Header yellow cells' },
  { key: 'country', label: 'Country', editable: false, source: '2. Header yellow cells' },
  { key: 'state', label: 'State', editable: false, source: '2. Header yellow cells' },
  { key: 'timeZone', label: 'Time Zone', editable: false, source: '2. Header yellow cells' },
  { key: 'timeGroup', label: 'Time Group', editable: false, source: '2. Header yellow cells' },
  { key: 'salesManagerId', label: 'Deal Owner', editable: true, source: '2. Header yellow cells' },
  { key: 'currentMilestone', label: 'Current milestone', editable: false, source: '2. Header yellow cells' },
  { key: 'projectAlerts', label: 'Project Alerts', editable: false, source: '2. Header yellow cells' },
]

const POC_HEADER_FIELDS: OpportunityHeaderField[] = [
  ...COMMON_HEADER_FIELDS.slice(0, 4),
  { key: 'pocStartDate', label: 'Start Date', editable: true, source: '2. Header yellow cells' },
  { key: 'pocEndDate', label: 'End Date', editable: true, source: '2. Header yellow cells' },
  ...COMMON_HEADER_FIELDS.slice(4),
]

const DELIVERY_HEADER_FIELDS: OpportunityHeaderField[] = [
  ...COMMON_HEADER_FIELDS.slice(0, 4),
  {
    key: 'warrantyServiceMonths',
    label: 'Warranty/Service period (months)',
    editable: false,
    source: '2. Header yellow cells',
  },
  ...COMMON_HEADER_FIELDS.slice(4),
]

export const requirementAColumns: RequirementColumnMetadata[] = [
  { key: 'requirementId', label: 'Requirement ID', group: 'Tenant requirements', editable: true },
  { key: 'deployTarget', label: 'New System (Boolean)', group: 'Tenant requirements', editable: true },
  { key: 'existingSystemId', label: 'SID (If not a new system)', group: 'Tenant requirements', editable: true },
  { key: 'hostingType', label: 'Hosting', group: 'Environment', editable: true },
  { key: 'cloudPlatform', label: 'Cloud Platform', group: 'Environment', editable: true },
  { key: 'productType', label: 'Product', group: 'Core Details', editable: true },
  { key: 'licenses', label: 'Licenses', group: 'Core Details', editable: true },
  { key: 'users', label: 'Users', group: 'Core Details', editable: true },
  { key: 'concurrentSearches', label: 'Con. Searches', group: 'Core Details', editable: true },
  { key: 'dailySearches', label: 'Daily Qty Searches', group: 'Core Details', editable: true },
  { key: 'monthlySearches', label: 'Monthly Qty Searches', group: 'Core Details', editable: true },
  { key: 'concurrentAnalyses', label: 'Con. Analyses', group: 'Core Details', editable: true },
  { key: 'dailyAnalyses', label: 'Daily Qty Analyses', group: 'Core Details', editable: true },
  { key: 'monthlyAnalyses', label: 'Monthly Qty Analyses', group: 'Core Details', editable: true },
  { key: 'topicAnalyses', label: 'Topic analyses', group: 'AI', editable: true },
  { key: 'standardMonitors', label: 'Std. Monitors', group: 'Modules', editable: true },
  { key: 'fullMonitors', label: 'Full monitors', group: 'Modules', editable: true },
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
      headerFields: DELIVERY_HEADER_FIELDS,
      visibleRequirementTypes: ['C'],
    },
  ],
  [
    keyForOpportunity('RENEWAL', 'UPSELL'),
    {
      sourceSheet: 'Project form-Renewal-Upsell',
      headerFields: DELIVERY_HEADER_FIELDS,
      visibleRequirementTypes: ['A', 'B', 'C'],
    },
  ],
  [
    keyForOpportunity('RENEWAL', 'DOWN_SELL'),
    {
      sourceSheet: 'Project form-Renewal-Down Sell',
      headerFields: DELIVERY_HEADER_FIELDS,
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
