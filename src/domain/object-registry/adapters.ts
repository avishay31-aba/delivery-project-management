import type { ObjectDefinition, ObjectFieldDefinition, ObjectMetadataSourceRef, ObjectRegistryEntry } from './types'

export function objectRegistryEntryLabel(entry: ObjectRegistryEntry): string {
  return entry.label
}

export function objectFieldLabels(fields: ObjectFieldDefinition[]): string[] {
  return fields.map((field) => field.label)
}

export function objectFieldsForSection(objectDefinition: ObjectDefinition, sectionId: string): ObjectFieldDefinition[] {
  return objectDefinition.fields.filter((field) => field.section === sectionId)
}

export function objectFieldsForTab(objectDefinition: ObjectDefinition, tabId: string): ObjectFieldDefinition[] {
  return objectDefinition.fields.filter((field) => field.tab === tabId)
}

export interface ObjectRegistryColumnDescriptor {
  id: string
  label: string
  editable: boolean
  source: ObjectMetadataSourceRef
}

export function objectDashboardColumnDescriptors(objectDefinition: ObjectDefinition): ObjectRegistryColumnDescriptor[] {
  return objectDefinition.fields.map((field) => ({
    id: field.key,
    label: field.label,
    editable: field.editable === true,
    source: field.readModelSource ?? field.source,
  }))
}

export interface ObjectRegistryFieldSourceSummary {
  fieldKey: string
  source: ObjectMetadataSourceRef
  picklistSource?: ObjectMetadataSourceRef
  validationSource?: ObjectMetadataSourceRef
  readModelSource?: ObjectMetadataSourceRef
}

export function objectFieldSourceSummaries(objectDefinition: ObjectDefinition): ObjectRegistryFieldSourceSummary[] {
  return objectDefinition.fields.map((field) => ({
    fieldKey: field.key,
    source: field.source,
    picklistSource: field.picklistSource,
    validationSource: field.validationSource,
    readModelSource: field.readModelSource,
  }))
}

export function objectRelationshipSources(objectDefinition: ObjectDefinition): ObjectMetadataSourceRef[] {
  return objectDefinition.relationships ?? []
}
