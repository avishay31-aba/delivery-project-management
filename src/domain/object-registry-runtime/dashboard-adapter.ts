import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { ObjectFieldDefinition } from '@/domain/object-registry'
import type { DateTimeSemanticType } from '@/domain/date-time-presentation'
import { resolveObjectRegistryOptions } from './source-resolver'
import type {
  RuntimeDashboardSkipReason,
  RuntimeDashboardSkippedField,
  RuntimeSourceResolverOptions,
} from './types'
import { isRuntimeDashboardSupportedField } from './validation'

export interface RuntimeDashboardColumnOptions<T> extends RuntimeSourceResolverOptions {
  editable?: boolean
  editKey?: keyof T
  id?: string
  label?: string
  options?: string[]
}

export function objectFieldToRuntimeDashboardField<T extends object>(
  field: ObjectFieldDefinition,
  options: RuntimeDashboardColumnOptions<T> = {},
): DashboardColumn<T> | null {
  if (dashboardSkipReason(field)) return null
  const optionResolution = resolveObjectRegistryOptions(field.picklistSource, options)
  const editable = options.editable ?? field.editable === true
  return {
    id: options.id ?? field.key,
    label: options.label ?? field.label,
    getValue: (row) => runtimeDashboardValue((row as Record<string, unknown>)[field.key]),
    editKey: editable ? options.editKey ?? field.key as keyof T : undefined,
    editable,
    options: options.options ?? (optionResolution.resolved ? optionResolution.value : undefined),
    semanticType: semanticTypeForObjectField(field),
  }
}

function semanticTypeForObjectField(field: ObjectFieldDefinition): DateTimeSemanticType | undefined {
  if (field.type === 'date' || field.type === 'time' || field.type === 'datetime') return field.type
  return undefined
}

export function objectFieldsToRuntimeDashboardColumns<T extends object>(
  fields: ObjectFieldDefinition[],
  options: RuntimeSourceResolverOptions = {},
): DashboardColumn<T>[] {
  return fields.flatMap((field) => {
    const column = objectFieldToRuntimeDashboardField<T>(field, options)
    return column ? [column] : []
  })
}

export function objectFieldsToRuntimeDashboardModel<T extends object>(
  fields: ObjectFieldDefinition[],
  options: RuntimeSourceResolverOptions = {},
): { columns: DashboardColumn<T>[]; skippedFields: RuntimeDashboardSkippedField[] } {
  return {
    columns: objectFieldsToRuntimeDashboardColumns<T>(fields, options),
    skippedFields: skippedRuntimeDashboardFields(fields),
  }
}

export function skippedRuntimeDashboardFields(fields: ObjectFieldDefinition[]): RuntimeDashboardSkippedField[] {
  return fields.flatMap((field) => {
    const reason = dashboardSkipReason(field)
    return reason ? [{ field, reason, message: dashboardSkipMessage(field, reason) }] : []
  })
}

export function dashboardSkipReason(field: ObjectFieldDefinition): RuntimeDashboardSkipReason | null {
  if (field.type === 'collection') return 'collectionField'
  if (field.type === 'reference') return 'referenceField'
  if (field.readModelSource) return 'readModelRequired'
  if (field.validationSource) return 'validationRequired'
  if (!isRuntimeDashboardSupportedField(field)) return 'unsupportedType'
  return null
}

function runtimeDashboardValue(value: unknown): string | number | null {
  if (typeof value === 'number') return value
  if (Array.isArray(value)) return value.join(';')
  if (value == null) return ''
  return String(value)
}

function dashboardSkipMessage(field: ObjectFieldDefinition, reason: RuntimeDashboardSkipReason): string {
  if (reason === 'collectionField') return `${field.key} is a collection field and needs custom dashboard handling.`
  if (reason === 'referenceField') return `${field.key} is a reference field and needs lookup/read-model handling.`
  if (reason === 'readModelRequired') return `${field.key} requires a read model source.`
  if (reason === 'validationRequired') return `${field.key} has validation/action behavior outside the simple dashboard adapter.`
  if (reason === 'customRenderRequired') return `${field.key} requires a custom render column.`
  return `${field.key} uses unsupported dashboard field type ${field.type}.`
}
