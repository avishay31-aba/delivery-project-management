import type { ObjectRegistryEntry } from './types'

export function validateObjectRegistryEntry(entry: ObjectRegistryEntry): string[] {
  const messages: string[] = []
  if (!entry.key) messages.push('Object key is required.')
  if (!entry.label) messages.push('Object label is required.')
  if (!entry.pluralLabel) messages.push('Object plural label is required.')
  if (!entry.identityField) messages.push('Object identity field is required.')
  if (!entry.source.domain) messages.push('Object source domain is required.')
  return messages
}
