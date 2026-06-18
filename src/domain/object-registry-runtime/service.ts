import type { ObjectDefinition, ObjectFieldDefinition } from '@/domain/object-registry'
import { isRuntimeSupportedField, runtimeSimpleFields, runtimeSupportedFields } from './validation'
import { objectDefinitionRuntimeSummary } from './validation'
import type { RuntimeObjectSummary } from './types'

export function supportedRuntimeFields(fields: ObjectFieldDefinition[]): ObjectFieldDefinition[] {
  return runtimeSupportedFields(fields)
}

export function simpleRuntimeFields(fields: ObjectFieldDefinition[]): ObjectFieldDefinition[] {
  return runtimeSimpleFields(fields)
}

export function runtimeFieldsByKeys(fields: ObjectFieldDefinition[], keys: string[]): ObjectFieldDefinition[] {
  const keySet = new Set(keys)
  return fields.filter((field) => keySet.has(field.key))
}

export function unsupportedRuntimeFields(fields: ObjectFieldDefinition[]): ObjectFieldDefinition[] {
  return fields.filter((field) => !isRuntimeSupportedField(field))
}

export function objectRuntimeSummaries(definitions: ObjectDefinition[]): RuntimeObjectSummary[] {
  return definitions.map(objectDefinitionRuntimeSummary)
}
