import type { RequirementColumnMetadata } from '@/config/opportunity-metadata'
import {
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
} from '@/config/opportunity-metadata'
import type { ProjectMainType, ProjectSubType } from './types'

export const PROJECT_NAME_REQUIRED_MESSAGE = 'Project name is required.'

export type ProjectFormTab =
  | 'overview'
  | 'requirements'
  | 'systems'
  | 'tenants'
  | 'systemsTenants'
  | 'engagement'
  | 'milestones'
  | 'tasks'
  | 'documents'
  | 'activity'
export type ProjectRequirementSectionKind = 'A' | 'B' | 'C'
export type ProjectHeaderFieldKey =
  | 'opportunityName'
  | 'mainType'
  | 'subType'
  | 'deliveryDate'
  | 'pocStartDate'
  | 'pocEndDate'
  | 'warrantyServiceMonths'
  | 'progressStatus'
  | 'currentMilestone'
  | 'projectAlerts'
  | 'opportunityId'
  | 'accountName'
  | 'region'
  | 'country'
  | 'state'
  | 'timeZone'
  | 'timeGroup'
  | 'dealOwner'
  | 'reportToDirect'
  | 'reportToLevel2'

export interface ProjectHeaderFieldMetadata {
  key: ProjectHeaderFieldKey
  label: string
  editable: boolean
  source: string
  required?: boolean
  inputType?: 'text' | 'date'
}

export interface ProjectRequirementSectionMetadata {
  kind: ProjectRequirementSectionKind
  title: string
  description?: string
  columns: RequirementColumnMetadata[]
}

export interface ProjectFormMetadata {
  sourceSheet: string
  headerFields: ProjectHeaderFieldMetadata[]
  requirementSections: ProjectRequirementSectionMetadata[]
  tabs: ProjectFormTab[]
  milestoneTemplate: string
}

export const PROJECT_TABS: ProjectFormTab[] = [
  'milestones',
  'tasks',
  'systemsTenants',
  'engagement',
  'documents',
]

const REPORTING_FIELDS: ProjectHeaderFieldMetadata[] = [
  { key: 'dealOwner', label: 'Deal/Sale owner', editable: false, source: '2. Header' },
  { key: 'reportToDirect', label: 'Report to - direct', editable: false, source: '2. Header' },
  { key: 'reportToLevel2', label: 'Report to - level 2', editable: false, source: '2. Header' },
]

const LOCATION_FIELDS: ProjectHeaderFieldMetadata[] = [
  { key: 'opportunityId', label: 'Opportunity (name and ID)', editable: true, source: '2. Header', inputType: 'text' },
  { key: 'accountName', label: 'Account (end user)', editable: false, source: '2. Header' },
  { key: 'region', label: 'Region', editable: false, source: '2. Header' },
  { key: 'country', label: 'Country', editable: false, source: '2. Header' },
  { key: 'state', label: 'State', editable: false, source: '2. Header' },
  { key: 'timeZone', label: 'Time Zone', editable: false, source: '2. Header' },
  { key: 'timeGroup', label: 'Time Group', editable: false, source: '2. Header' },
]

const POC_HEADER_FIELDS: ProjectHeaderFieldMetadata[] = [
  { key: 'opportunityName', label: 'Project name', editable: true, required: true, inputType: 'text', source: '2. Header' },
  { key: 'mainType', label: 'Project Type', editable: false, source: '2. Header' },
  { key: 'subType', label: 'Project sub type', editable: false, source: '2. Header' },
  { key: 'deliveryDate', label: 'Delivery date', editable: true, inputType: 'date', source: '2. Header' },
  { key: 'pocStartDate', label: 'Start Date', editable: false, source: '2. Header' },
  { key: 'pocEndDate', label: 'End Date', editable: false, source: '2. Header' },
  { key: 'progressStatus', label: 'Project status', editable: false, source: '2. Header' },
  { key: 'currentMilestone', label: 'Current milestone', editable: false, source: '2. Header' },
  { key: 'projectAlerts', label: 'Project Alerts', editable: false, source: '2. Header' },
  ...LOCATION_FIELDS,
  ...REPORTING_FIELDS,
]

const DELIVERY_RENEWAL_HEADER_FIELDS: ProjectHeaderFieldMetadata[] = [
  { key: 'opportunityName', label: 'Project name', editable: true, required: true, inputType: 'text', source: '2. Header' },
  { key: 'mainType', label: 'Project Type', editable: false, source: '2. Header' },
  { key: 'subType', label: 'Project sub type', editable: false, source: '2. Header' },
  { key: 'deliveryDate', label: 'Delivery date', editable: true, inputType: 'date', source: '2. Header' },
  { key: 'warrantyServiceMonths', label: 'Warranty/Service period (months)', editable: false, source: '2. Header' },
  { key: 'progressStatus', label: 'Project status', editable: false, source: '2. Header' },
  { key: 'currentMilestone', label: 'Current milestone', editable: false, source: '2. Header' },
  { key: 'projectAlerts', label: 'Project Alerts', editable: false, source: '2. Header' },
  ...LOCATION_FIELDS,
  ...REPORTING_FIELDS,
]

export const NEW_TENANT_PROJECT_SECTION: ProjectRequirementSectionMetadata = {
  kind: 'A',
  title: 'New Tenant Requirements',
  description: 'Live-linked from the Opportunity new tenant requirements.',
  columns: requirementAColumns,
}

export const CHANGE_REQUEST_PROJECT_SECTION: ProjectRequirementSectionMetadata = {
  kind: 'B',
  title: 'Change Request on Existing Tenant - Final Configuration',
  description: 'Live-linked from the Opportunity selected tenant change requirements.',
  columns: requirementBColumns,
}

export const STANDARD_RENEWAL_PROJECT_SECTION: ProjectRequirementSectionMetadata = {
  kind: 'C',
  title: 'Standard Renewal',
  description: 'Live-linked from the Opportunity tenants to renew.',
  columns: requirementCColumns,
}

function keyForProject(mainType: ProjectMainType, subType: ProjectSubType): string {
  return `${mainType}:${subType}`
}

const METADATA_BY_PROJECT = new Map<string, ProjectFormMetadata>([
  [
    keyForProject('POC', 'NONE'),
    {
      sourceSheet: 'Project Form - POC',
      headerFields: POC_HEADER_FIELDS,
      requirementSections: [NEW_TENANT_PROJECT_SECTION],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'Template #1 - POC',
    },
  ],
  [
    keyForProject('DELIVERY', 'NEW'),
    {
      sourceSheet: 'Project Form-Delivery-New',
      headerFields: DELIVERY_RENEWAL_HEADER_FIELDS,
      requirementSections: [NEW_TENANT_PROJECT_SECTION],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'Template #2/#3 - Delivery new by hosting context',
    },
  ],
  [
    keyForProject('DELIVERY', 'UPSELL'),
    {
      sourceSheet: 'Project form-Delivery-Upsell',
      headerFields: DELIVERY_RENEWAL_HEADER_FIELDS,
      requirementSections: [NEW_TENANT_PROJECT_SECTION, CHANGE_REQUEST_PROJECT_SECTION],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'Template #2/#3/#4 - Delivery upsell by requirement mix',
    },
  ],
  [
    keyForProject('RENEWAL', 'STANDARD'),
    {
      sourceSheet: 'Project form-Renewal-Standard',
      headerFields: DELIVERY_RENEWAL_HEADER_FIELDS,
      requirementSections: [STANDARD_RENEWAL_PROJECT_SECTION],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'Renewal standard template',
    },
  ],
  [
    keyForProject('RENEWAL', 'UPSELL'),
    {
      sourceSheet: 'Project form-Renewal-Upsell',
      headerFields: DELIVERY_RENEWAL_HEADER_FIELDS,
      requirementSections: [STANDARD_RENEWAL_PROJECT_SECTION, CHANGE_REQUEST_PROJECT_SECTION, NEW_TENANT_PROJECT_SECTION],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'Renewal upsell template by requirement mix',
    },
  ],
  [
    keyForProject('RENEWAL', 'DOWN_SELL'),
    {
      sourceSheet: 'Project form-Renewal-Down Sell',
      headerFields: DELIVERY_RENEWAL_HEADER_FIELDS,
      requirementSections: [STANDARD_RENEWAL_PROJECT_SECTION, CHANGE_REQUEST_PROJECT_SECTION],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'Renewal downsell template',
    },
  ],
])

export function getProjectFormMetadata(mainType: ProjectMainType, subType: ProjectSubType): ProjectFormMetadata {
  return (
    METADATA_BY_PROJECT.get(keyForProject(mainType, subType)) ?? {
      sourceSheet: 'Project form - general',
      headerFields: DELIVERY_RENEWAL_HEADER_FIELDS,
      requirementSections: [],
      tabs: PROJECT_TABS,
      milestoneTemplate: 'General project template',
    }
  )
}

export function projectTabLabel(tab: ProjectFormTab): string {
  const labels: Record<ProjectFormTab, string> = {
    overview: 'Overview',
    requirements: 'Requirements',
    systems: 'Systems',
    tenants: 'Tenants',
    systemsTenants: 'Systems and Tenants',
    engagement: 'Engagement Circle',
    milestones: 'Milestones',
    tasks: 'Tasks',
    documents: 'Documents',
    activity: 'Activity',
  }
  return labels[tab]
}
