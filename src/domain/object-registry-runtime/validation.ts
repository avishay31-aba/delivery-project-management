import type { ObjectDefinition, ObjectFieldDefinition } from '@/domain/object-registry'
import { resolveObjectRegistryOptions, resolveObjectRegistrySource } from './source-resolver'
import type {
  RuntimeAdapterValidationMessage,
  RuntimeFieldIssue,
  RuntimeObjectSummary,
} from './types'

const RUNTIME_SUPPORTED_FIELD_TYPES = ['text', 'integer', 'date', 'time', 'datetime', 'picklist', 'multiselect', 'readonly', 'boolean'] as const

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

export function validateObjectDefinitionRuntime(definition: ObjectDefinition): RuntimeAdapterValidationMessage[] {
  return objectDefinitionRuntimeIssues(definition).map((issue) => ({
    fieldKey: issue.fieldKey,
    level: 'warning',
    message: issue.message,
  }))
}

export function objectDefinitionRuntimeSummary(definition: ObjectDefinition): RuntimeObjectSummary {
  const issues = objectDefinitionRuntimeIssues(definition)
  const unsupportedFields = definition.fields.filter((field) => !isRuntimeSupportedField(field))
  const missingSourceRefs = definition.fields.filter((field) => !field.source)
  const unresolvedPicklists = definition.fields.filter((field) => {
    if (!field.picklistSource) return false
    return !resolveObjectRegistryOptions(field.picklistSource).resolved
  })
  const customRenderOrActionFields = definition.fields.filter(requiresCustomRuntimeHandling)
  return {
    objectKey: definition.key,
    label: definition.label,
    totalFields: definition.fields.length,
    runtimeSupportedFields: definition.fields.filter(isRuntimeSupportedField).length,
    unsupportedFields,
    missingSourceRefs,
    unresolvedPicklists,
    customRenderOrActionFields,
    issues,
  }
}

function requiresCustomRuntimeHandling(field: ObjectFieldDefinition): boolean {
  return (
    field.type === 'collection' ||
    field.type === 'reference' ||
    Boolean(field.readModelSource) ||
    Boolean(field.validationSource) ||
    !isRuntimeSupportedField(field)
  )
}

export function objectDefinitionRuntimeIssues(definition: ObjectDefinition): RuntimeFieldIssue[] {
  return definition.fields.flatMap((field) => {
    const issues: RuntimeFieldIssue[] = []
    if (!isRuntimeSupportedField(field)) {
      issues.push({ fieldKey: field.key, kind: 'unsupportedType', message: `Unsupported runtime field type: ${field.type}` })
    }
    if (!field.source) {
      issues.push({ fieldKey: field.key, kind: 'missingSource', message: `${field.key} is missing a source reference.` })
    } else if (!resolveObjectRegistrySource(field.source).resolved) {
      issues.push({ fieldKey: field.key, kind: 'unresolvedSource', message: `${field.key} source is unresolved.` })
    }
    if (field.picklistSource && !resolveObjectRegistryOptions(field.picklistSource).resolved) {
      issues.push({ fieldKey: field.key, kind: 'unresolvedPicklist', message: `${field.key} picklist source is unresolved.` })
    }
    if (field.readModelSource) {
      issues.push({ fieldKey: field.key, kind: 'requiresReadModel', message: `${field.key} requires read-model logic.` })
    }
    if (field.validationSource) {
      issues.push({ fieldKey: field.key, kind: 'requiresValidation', message: `${field.key} requires validation/action logic.` })
    }
    if (field.type === 'collection') {
      issues.push({ fieldKey: field.key, kind: 'requiresCustomRender', message: `${field.key} requires custom collection rendering.` })
    }
    return issues
  })
}
