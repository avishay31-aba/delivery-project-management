import { OBJECT_REGISTRY_ENTRIES } from './metadata'
import type {
  ObjectDefinition,
  ObjectFieldDefinition,
  ObjectMetadataSourceRef,
  ObjectRegistryKey,
  ObjectSectionDefinition,
  ObjectTabDefinition,
} from './types'

export function listObjectRegistryEntries(): ObjectDefinition[] {
  return OBJECT_REGISTRY_ENTRIES
}

export function getObjectRegistryEntry(key: ObjectRegistryKey): ObjectDefinition | undefined {
  return OBJECT_REGISTRY_ENTRIES.find((entry) => entry.key === key)
}

export function getObjectFields(key: ObjectRegistryKey): ObjectFieldDefinition[] {
  return getObjectRegistryEntry(key)?.fields ?? []
}

export function getObjectSections(key: ObjectRegistryKey): ObjectSectionDefinition[] {
  return getObjectRegistryEntry(key)?.sections ?? []
}

export function getObjectTabs(key: ObjectRegistryKey): ObjectTabDefinition[] {
  return getObjectRegistryEntry(key)?.tabs ?? []
}

export function getObjectSourceRefs(key: ObjectRegistryKey): ObjectMetadataSourceRef[] {
  const objectDefinition = getObjectRegistryEntry(key)
  if (!objectDefinition) return []
  return [
    objectDefinition.source,
    ...objectDefinition.fields.flatMap((field) => [
      field.source,
      field.picklistSource,
      field.validationSource,
      field.readModelSource,
    ].filter((source): source is ObjectMetadataSourceRef => Boolean(source))),
    ...(objectDefinition.relationships ?? []),
  ]
}
