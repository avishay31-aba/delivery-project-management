import type { ObjectDefinition, ObjectFieldDefinition, ObjectMetadataSourceRef, ObjectRegistryEntry } from './types'

const opportunityLifecycleSource: ObjectMetadataSourceRef = {
  domain: 'OpportunityLifecycle',
  exportName: 'getOpportunityMetadata',
}

const opportunityValidationSource: ObjectMetadataSourceRef = {
  domain: 'OpportunityLifecycle',
  exportName: 'validateOpportunity',
}

const tenantRequirementSource: ObjectMetadataSourceRef = {
  domain: 'TenantRequirement',
  exportName: 'requirementAColumns/requirementBColumns/requirementCColumns',
}

const opportunityFields: ObjectFieldDefinition[] = [
  {
    key: 'opportunityId',
    label: 'Opportunity (name and ID)',
    type: 'text',
    section: 'header',
    editable: true,
    source: { ...opportunityLifecycleSource, fieldKey: 'opportunityId' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'opportunityName',
    label: 'Opportunity name',
    type: 'text',
    section: 'header',
    editable: true,
    source: { ...opportunityLifecycleSource, fieldKey: 'opportunityName' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'stage',
    label: 'Stage',
    type: 'picklist',
    section: 'header',
    editable: true,
    source: { domain: 'OpportunityLifecycle', exportName: 'validateOpportunityTransition', fieldKey: 'stage' },
    validationSource: { domain: 'OpportunityLifecycle', exportName: 'validateOpportunityTransition' },
  },
  {
    key: 'type',
    label: 'Opportunity Type',
    type: 'picklist',
    section: 'header',
    editable: true,
    source: { ...opportunityLifecycleSource, fieldKey: 'type' },
    picklistSource: { domain: 'OpportunityLifecycle', exportName: 'OPPORTUNITY_SUB_TYPE_OPTIONS', fieldKey: 'type' },
  },
  {
    key: 'subType',
    label: 'Opportunity sub type',
    type: 'picklist',
    section: 'header',
    editable: true,
    source: { ...opportunityLifecycleSource, fieldKey: 'subType' },
    picklistSource: { domain: 'OpportunityLifecycle', exportName: 'OPPORTUNITY_SUB_TYPE_OPTIONS', fieldKey: 'subType' },
  },
  {
    key: 'accountId',
    label: 'Account (end user)',
    type: 'reference',
    section: 'header',
    editable: true,
    source: { ...opportunityLifecycleSource, fieldKey: 'accountId' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'salesManagerId',
    label: 'Deal Owner',
    type: 'reference',
    section: 'header',
    editable: true,
    source: { ...opportunityLifecycleSource, fieldKey: 'salesManagerId' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'deliveryDate',
    label: 'Delivery date',
    type: 'date',
    section: 'header',
    editable: true,
    visible: { ...opportunityLifecycleSource, rule: 'visible', fieldKey: 'deliveryDate' },
    source: { ...opportunityLifecycleSource, fieldKey: 'deliveryDate' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'pocStartDate',
    label: 'Start Date',
    type: 'date',
    section: 'header',
    editable: true,
    visible: { ...opportunityLifecycleSource, rule: 'visible', fieldKey: 'pocStartDate' },
    source: { ...opportunityLifecycleSource, fieldKey: 'pocStartDate' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'pocEndDate',
    label: 'End Date',
    type: 'date',
    section: 'header',
    editable: true,
    visible: { ...opportunityLifecycleSource, rule: 'visible', fieldKey: 'pocEndDate' },
    source: { ...opportunityLifecycleSource, fieldKey: 'pocEndDate' },
    validationSource: opportunityValidationSource,
  },
  {
    key: 'warrantyServiceMonths',
    label: 'Warranty/Service period (months)',
    type: 'integer',
    section: 'header',
    editable: true,
    visible: { ...opportunityLifecycleSource, rule: 'visible', fieldKey: 'warrantyServiceMonths' },
    source: { ...opportunityLifecycleSource, fieldKey: 'warrantyServiceMonths' },
  },
  {
    key: 'tenantRequirements',
    label: 'Tenant requirements',
    type: 'collection',
    tab: 'requirements',
    editable: true,
    source: tenantRequirementSource,
    validationSource: { domain: 'TenantRequirement', exportName: 'validateRequirementA/validateRequirementB/validateRequirementC' },
  },
  {
    key: 'engagementCircles',
    label: 'Engagement Circle',
    type: 'collection',
    tab: 'engagementCircles',
    editable: true,
    source: { domain: 'EngagementCircle', exportName: 'ENGAGEMENT_ROLE_OPTIONS' },
  },
]

export const OPPORTUNITY_OBJECT_DEFINITION: ObjectDefinition = {
  key: 'opportunity',
  label: 'Opportunity',
  pluralLabel: 'Opportunities',
  identityField: 'opportunityId',
  source: opportunityLifecycleSource,
  fields: opportunityFields,
  sections: [{ id: 'header', label: 'Header', source: opportunityLifecycleSource }],
  tabs: [
    { id: 'requirements', label: 'Tenant Requirements', source: tenantRequirementSource },
    { id: 'engagementCircles', label: 'Engagement Circle', source: { domain: 'EngagementCircle', exportName: 'ENGAGEMENT_ROLE_OPTIONS' } },
    { id: 'documents', label: 'Documents', source: { domain: 'DocumentCollection' } },
  ],
  relationships: [
    { relationship: 'composes', domain: 'TenantRequirement', exportName: 'requirementAColumns/requirementBColumns/requirementCColumns' },
    { relationship: 'composes', domain: 'EngagementCircle', exportName: 'ENGAGEMENT_ROLE_OPTIONS' },
    { relationship: 'composes', domain: 'DocumentCollection' },
    { relationship: 'projects', domain: 'ProjectLifecycle', description: 'Created Project read models consume Opportunity-created Project links.' },
  ],
}

export const OBJECT_REGISTRY_ENTRIES: ObjectRegistryEntry[] = [OPPORTUNITY_OBJECT_DEFINITION]
