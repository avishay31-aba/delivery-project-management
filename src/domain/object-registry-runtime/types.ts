import type {
  ObjectDefinition,
  ObjectFieldDefinition,
  ObjectMetadataSourceRef,
  ObjectRegistryKey,
} from '@/domain/object-registry'

export type RuntimeFieldType = ObjectFieldDefinition['type']

export interface RuntimeSourceResolution<T = unknown> {
  ref?: ObjectMetadataSourceRef
  resolved: boolean
  value?: T
  message?: string
}

export interface RuntimeSourceResolverOptions {
  strict?: boolean
}

export interface RuntimeAdapterValidationMessage {
  fieldKey?: string
  level: 'warning' | 'error'
  message: string
}

export type RuntimeFieldSupportStatus = 'supported' | 'unsupported'

export type RuntimeFieldIssueKind =
  | 'unsupportedType'
  | 'missingSource'
  | 'unresolvedSource'
  | 'unresolvedPicklist'
  | 'requiresCustomRender'
  | 'requiresAction'
  | 'requiresReadModel'
  | 'requiresValidation'

export interface RuntimeFieldIssue {
  fieldKey: string
  kind: RuntimeFieldIssueKind
  message: string
}

export interface RuntimeFormField {
  key: string
  label: string
  type: RuntimeFieldType
  editable: boolean
  required: boolean
  visible: boolean
  section?: string
  tab?: string
  options?: string[]
  source?: ObjectMetadataSourceRef
  picklistSource?: ObjectMetadataSourceRef
  sourceResolution?: RuntimeSourceResolution
  picklistResolution?: RuntimeSourceResolution<string[]>
}

export interface RuntimeFormSection {
  id: string
  label: string
  fields: RuntimeFormField[]
  source?: ObjectMetadataSourceRef
}

export interface RuntimeFormTab {
  id: string
  label: string
  fields: RuntimeFormField[]
  source?: ObjectMetadataSourceRef
}

export interface RuntimeFormModel {
  objectKey: ObjectRegistryKey
  label: string
  fields: RuntimeFormField[]
  sections: RuntimeFormSection[]
  tabs: RuntimeFormTab[]
  definition: ObjectDefinition
}

export interface RuntimeDashboardField<T> {
  id: string
  label: string
  getValue: (row: T) => string | number | null
  editKey?: keyof T
  editable?: boolean
  options?: string[]
}

export type RuntimeDashboardSkipReason =
  | 'unsupportedType'
  | 'collectionField'
  | 'referenceField'
  | 'readModelRequired'
  | 'validationRequired'
  | 'customRenderRequired'

export interface RuntimeDashboardSkippedField {
  field: ObjectFieldDefinition
  reason: RuntimeDashboardSkipReason
  message: string
}

export interface RuntimeObjectSummary {
  objectKey: ObjectRegistryKey
  label: string
  totalFields: number
  runtimeSupportedFields: number
  unsupportedFields: ObjectFieldDefinition[]
  missingSourceRefs: ObjectFieldDefinition[]
  unresolvedPicklists: ObjectFieldDefinition[]
  customRenderOrActionFields: ObjectFieldDefinition[]
  issues: RuntimeFieldIssue[]
}
