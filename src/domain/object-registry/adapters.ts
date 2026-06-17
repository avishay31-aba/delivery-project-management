import type { ObjectFieldDefinition, ObjectRegistryEntry } from './types'

export function objectRegistryEntryLabel(entry: ObjectRegistryEntry): string {
  return entry.label
}

export function objectFieldLabels(fields: ObjectFieldDefinition[]): string[] {
  return fields.map((field) => field.label)
}
