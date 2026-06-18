import type { ObjectFieldDefinition } from '@/domain/object-registry'
import type { RuntimeAdapterValidationMessage } from './types'

const RUNTIME_SUPPORTED_FIELD_TYPES = ['text', 'integer', 'date', 'picklist', 'multiselect', 'readonly', 'boolean'] as const

export function isRuntimeSupportedField(field: ObjectFieldDefinition): boolean {
  return RUNTIME_SUPPORTED_FIELD_TYPES.includes(field.type as typeof RUNTIME_SUPPORTED_FIELD_TYPES[number])
}

export function isRuntimeDashboardSupportedField(field: ObjectFieldDefinition): boolean {
  return isRuntimeSupportedField(field)
}

export function isRuntimeSimpleField(field: ObjectFieldDefinition): boolean {
  return isRuntimeSupportedField(field) && !field.readModelSource && !field.validationSource
}

export function runtimeSupportedFields(fields: ObjectFieldDefinition[]): ObjectFieldDefinition[] {
  return fields.filter(isRuntimeSupportedField)
}

export function runtimeSimpleFields(fields: ObjectFieldDefinition[]): ObjectFieldDefinition[] {
  return fields.filter(isRuntimeSimpleField)
}

export function validateRuntimeAdapterFields(fields: ObjectFieldDefinition[]): RuntimeAdapterValidationMessage[] {
  return fields.flatMap((field) => {
    if (isRuntimeSupportedField(field)) return []
    return [{
      fieldKey: field.key,
      level: 'warning' as const,
      message: `Unsupported runtime field type: ${field.type}`,
    }]
  })
}
