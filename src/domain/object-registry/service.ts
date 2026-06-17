import { OBJECT_REGISTRY_ENTRIES } from './metadata'
import type { ObjectRegistryEntry, ObjectRegistryKey } from './types'

export function listObjectRegistryEntries(): ObjectRegistryEntry[] {
  return OBJECT_REGISTRY_ENTRIES
}

export function getObjectRegistryEntry(key: ObjectRegistryKey): ObjectRegistryEntry | undefined {
  return OBJECT_REGISTRY_ENTRIES.find((entry) => entry.key === key)
}
