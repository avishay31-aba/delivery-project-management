export type ObjectRegistryKey = 'opportunity' | 'project' | 'system' | 'tenant'

export type ObjectFieldType =
  | 'text'
  | 'integer'
  | 'date'
  | 'picklist'
  | 'multiselect'
  | 'readonly'
  | 'boolean'
  | 'reference'
  | 'collection'

export type ObjectRegistryDomainSource =
  | 'ApplicationConfiguration'
  | 'TenantRequirement'
  | 'HostingContext'
  | 'AllocationContext'
  | 'WarrantyCollection'
  | 'EngagementCircle'
  | 'SystemInventory'
  | 'OpportunityLifecycle'
  | 'ProjectLifecycle'
  | 'MilestonePlan'
  | 'DocumentCollection'

export interface ObjectMetadataSourceRef {
  domain: ObjectRegistryDomainSource
  exportName?: string
  fieldKey?: string
  description?: string
}

export interface ObjectRuleRef extends ObjectMetadataSourceRef {
  rule: 'editable' | 'visible' | 'required' | 'validation' | 'readModel' | 'picklist'
}

export interface ObjectFieldDefinition {
  key: string
  label: string
  type: ObjectFieldType
  source: ObjectMetadataSourceRef
  section?: string
  tab?: string
  editable?: boolean | ObjectRuleRef
  visible?: boolean | ObjectRuleRef
  required?: boolean | ObjectRuleRef
  picklistSource?: ObjectMetadataSourceRef
  validationSource?: ObjectMetadataSourceRef
  readModelSource?: ObjectMetadataSourceRef
}

export interface ObjectSectionDefinition {
  id: string
  label: string
  source?: ObjectMetadataSourceRef
}

export interface ObjectTabDefinition {
  id: string
  label: string
  source?: ObjectMetadataSourceRef
}

export interface ObjectCompositionRef extends ObjectMetadataSourceRef {
  relationship: 'inherits' | 'composes' | 'references' | 'projects' | 'hosts'
}

export interface ObjectDefinition {
  key: ObjectRegistryKey
  label: string
  pluralLabel: string
  identityField: string
  fields: ObjectFieldDefinition[]
  sections?: ObjectSectionDefinition[]
  tabs?: ObjectTabDefinition[]
  relationships?: ObjectCompositionRef[]
  source: ObjectMetadataSourceRef
}

export type ObjectRegistryEntry = ObjectDefinition
