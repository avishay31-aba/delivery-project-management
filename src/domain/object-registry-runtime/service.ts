import type { ObjectFieldDefinition } from '@/domain/object-registry'
import { isRuntimeSupportedField } from './validation'

export function supportedRuntimeFields(fields: ObjectFieldDefinition[]): ObjectFieldDefinition[] {
  return fields.filter(isRuntimeSupportedField)
}

