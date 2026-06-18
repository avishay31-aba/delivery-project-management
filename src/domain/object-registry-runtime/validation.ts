import type { ObjectFieldDefinition } from '@/domain/object-registry'

export function isRuntimeSupportedField(field: ObjectFieldDefinition): boolean {
  return ['text', 'integer', 'date', 'picklist', 'multiselect', 'readonly', 'boolean'].includes(field.type)
}

