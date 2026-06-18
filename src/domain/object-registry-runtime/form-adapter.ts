import type { ObjectFieldDefinition } from '@/domain/object-registry'
import { resolveObjectRegistryOptions } from './source-resolver'
import type { RuntimeFormField, RuntimeSourceResolverOptions } from './types'
import { isRuntimeSupportedField } from './validation'

export function objectFieldToRuntimeFormField(
  field: ObjectFieldDefinition,
  options: RuntimeSourceResolverOptions = {},
): RuntimeFormField | null {
  if (!isRuntimeSupportedField(field)) return null
  const optionResolution = resolveObjectRegistryOptions(field.picklistSource, options)
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    editable: field.editable === true,
    required: field.required === true,
    section: field.section,
    tab: field.tab,
    options: optionResolution.resolved ? optionResolution.value : undefined,
    source: field.source,
    picklistSource: field.picklistSource,
  }
}

export function objectFieldsToRuntimeFormFields(
  fields: ObjectFieldDefinition[],
  options: RuntimeSourceResolverOptions = {},
): RuntimeFormField[] {
  return fields.flatMap((field) => {
    const runtimeField = objectFieldToRuntimeFormField(field, options)
    return runtimeField ? [runtimeField] : []
  })
}
