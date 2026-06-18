import type { ObjectFieldDefinition } from '@/domain/object-registry'
import { runtimeSimpleFields, runtimeSupportedFields } from './validation'

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
