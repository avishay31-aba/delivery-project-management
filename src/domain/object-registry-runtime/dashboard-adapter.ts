import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { ObjectFieldDefinition } from '@/domain/object-registry'
import { resolveObjectRegistryOptions } from './source-resolver'
import type { RuntimeSourceResolverOptions } from './types'
import { isRuntimeDashboardSupportedField } from './validation'

export function objectFieldToRuntimeDashboardField<T extends Record<string, unknown>>(
  field: ObjectFieldDefinition,
  options: RuntimeSourceResolverOptions = {},
): DashboardColumn<T> | null {
  if (!isRuntimeDashboardSupportedField(field)) return null
  const optionResolution = resolveObjectRegistryOptions(field.picklistSource, options)
  const editable = field.editable === true
  return {
    id: field.key,
    label: field.label,
    getValue: (row) => runtimeDashboardValue(row[field.key]),
    editKey: editable ? field.key as keyof T : undefined,
    editable,
    options: optionResolution.resolved ? optionResolution.value : undefined,
  }
}

export function objectFieldsToRuntimeDashboardColumns<T extends Record<string, unknown>>(
  fields: ObjectFieldDefinition[],
  options: RuntimeSourceResolverOptions = {},
): DashboardColumn<T>[] {
  return fields.flatMap((field) => {
    const column = objectFieldToRuntimeDashboardField<T>(field, options)
    return column ? [column] : []
  })
}

function runtimeDashboardValue(value: unknown): string | number | null {
  if (typeof value === 'number') return value
  if (Array.isArray(value)) return value.join(';')
  if (value == null) return ''
  return String(value)
}
