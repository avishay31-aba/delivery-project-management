import type { ObjectRegistryEntry } from './types'

export function validateObjectRegistryEntry(entry: ObjectRegistryEntry): string[] {
  const messages: string[] = []
  if (!entry.key) messages.push('Object key is required.')
  if (!entry.label) messages.push('Object label is required.')
  return messages
}
