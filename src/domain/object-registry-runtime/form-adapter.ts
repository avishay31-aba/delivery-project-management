import type { ObjectDefinition, ObjectFieldDefinition } from '@/domain/object-registry'
import { resolveObjectRegistryOptions, resolveObjectRegistrySource } from './source-resolver'
import type {
  RuntimeFormField,
  RuntimeFormModel,
  RuntimeFormSection,
  RuntimeFormTab,
  RuntimeSourceResolverOptions,
} from './types'
import { isRuntimeSupportedField } from './validation'

export function objectFieldToRuntimeFormField(
  field: ObjectFieldDefinition,
  options: RuntimeSourceResolverOptions = {},
): RuntimeFormField | null {
  if (!isRuntimeSupportedField(field)) return null
  const sourceResolution = resolveObjectRegistrySource(field.source, options)
  const optionResolution = resolveObjectRegistryOptions(field.picklistSource, options)
  return {
    key: field.key,
    label: field.label,
    type: field.type,
    editable: field.editable === true,
    required: field.required === true,
    visible: field.visible !== false,
    section: field.section,
    tab: field.tab,
    options: optionResolution.resolved ? optionResolution.value : undefined,
    source: field.source,
    picklistSource: field.picklistSource,
    sourceResolution,
    picklistResolution: field.picklistSource ? optionResolution : undefined,
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

export function objectDefinitionToRuntimeFormModel(
  definition: ObjectDefinition,
  options: RuntimeSourceResolverOptions = {},
): RuntimeFormModel {
  const fields = objectFieldsToRuntimeFormFields(definition.fields, options)
  return {
    objectKey: definition.key,
    label: definition.label,
    fields,
    sections: runtimeFormSections(definition, fields),
    tabs: runtimeFormTabs(definition, fields),
    definition,
  }
}

function runtimeFormSections(definition: ObjectDefinition, fields: RuntimeFormField[]): RuntimeFormSection[] {
  return (definition.sections ?? []).map((section) => ({
    id: section.id,
    label: section.label,
    fields: fields.filter((field) => field.section === section.id),
    source: section.source,
  }))
}

function runtimeFormTabs(definition: ObjectDefinition, fields: RuntimeFormField[]): RuntimeFormTab[] {
  return (definition.tabs ?? []).map((tab) => ({
    id: tab.id,
    label: tab.label,
    fields: fields.filter((field) => field.tab === tab.id),
    source: tab.source,
  }))
}
