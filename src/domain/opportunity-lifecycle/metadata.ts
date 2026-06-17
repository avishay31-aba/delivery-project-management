import type { SharedFieldMetadata } from '@/domain/application-configuration'
import {
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
} from '@/domain/tenant-requirement'
import type { OpportunitySubType, OpportunityType, RequirementType } from './types'

export const OPPORTUNITY_SUB_TYPE_OPTIONS: Record<OpportunityType, OpportunitySubType[]> = {
  POC: ['FREE', 'PAID'],
  DELIVERY: ['NEW', 'UPSELL'],
  RENEWAL: ['STANDARD', 'UPSELL', 'DOWN_SELL'],
}

export const WON_IRREVERSIBLE_MESSAGE = 'WON is irreversible. A WON Opportunity cannot be changed back to Open.'
export const WON_POC_MESSAGE = 'WON Opportunities must be Delivery or Renewal to create a final Project.'

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

export type RequirementColumnMetadata = SharedFieldMetadata

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
    key: 'warrantyServiceMonths',
    label: 'Warranty/Service period (months)',
    editable: true,
    source: '2. Header yellow cells',
  },
  ...COMMON_HEADER_FIELDS.slice(3),
]

const RENEWAL_CHANGE_HEADER_FIELDS: OpportunityHeaderField[] = [
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

export { requirementAColumns, requirementBColumns, requirementCColumns }

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
      visibleRequirementTypes: ['C', 'B', 'A'],
    },
  ],
  [
    keyForOpportunity('RENEWAL', 'DOWN_SELL'),
    {
      sourceSheet: 'Project form-Renewal-Down Sell',
      headerFields: RENEWAL_CHANGE_HEADER_FIELDS,
      visibleRequirementTypes: ['C', 'B'],
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
