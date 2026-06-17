import type { ObjectFieldDefinition, ObjectMetadataSourceRef, ObjectRegistryEntry } from './types'

export function validateObjectRegistryEntry(entry: ObjectRegistryEntry): string[] {
  const messages: string[] = []
  if (!entry.key) messages.push('Object key is required.')
  if (!entry.label) messages.push('Object label is required.')
  if (!entry.pluralLabel) messages.push('Object plural label is required.')
  if (!entry.identityField) messages.push('Object identity field is required.')
  if (!entry.source.domain) messages.push('Object source domain is required.')
  entry.fields.forEach((field) => validateObjectFieldDefinition(field).forEach((message) => messages.push(message)))
  return messages
}

function validateSourceRef(source: ObjectMetadataSourceRef | undefined, context: string): string[] {
  if (!source) return []
  return source.domain ? [] : [`${context} source domain is required.`]
}

export function validateObjectFieldDefinition(field: ObjectFieldDefinition): string[] {
  const messages: string[] = []
  if (!field.key) messages.push('Field key is required.')
  if (!field.label) messages.push(`Field ${field.key} label is required.`)
  if (!field.type) messages.push(`Field ${field.key} type is required.`)
  validateSourceRef(field.source, `Field ${field.key}`).forEach((message) => messages.push(message))
  validateSourceRef(field.picklistSource, `Field ${field.key} picklist`).forEach((message) => messages.push(message))
  validateSourceRef(field.validationSource, `Field ${field.key} validation`).forEach((message) => messages.push(message))
  validateSourceRef(field.readModelSource, `Field ${field.key} read model`).forEach((message) => messages.push(message))
  return messages
}

export function validateObjectRegistry(entries: ObjectRegistryEntry[]): string[] {
  const seenKeys = new Set<string>()
  const messages: string[] = []

  entries.forEach((entry) => {
    if (seenKeys.has(entry.key)) messages.push(`Duplicate object key: ${entry.key}.`)
    seenKeys.add(entry.key)
    validateObjectRegistryEntry(entry).forEach((message) => messages.push(message))
  })

  return messages
}
