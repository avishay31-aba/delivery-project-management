import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { ObjectFieldDefinition } from '@/domain/object-registry'
import { resolveObjectRegistryOptions } from './source-resolver'
import type { RuntimeSourceResolverOptions } from './types'
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
  if (!isRuntimeDashboardSupportedField(field)) return null
  const optionResolution = resolveObjectRegistryOptions(field.picklistSource, options)
  const editable = options.editable ?? field.editable === true
  return {
    id: options.id ?? field.key,
    label: options.label ?? field.label,
    getValue: (row) => runtimeDashboardValue((row as Record<string, unknown>)[field.key]),
    editKey: editable ? options.editKey ?? field.key as keyof T : undefined,
    editable,
    options: options.options ?? (optionResolution.resolved ? optionResolution.value : undefined),
  }
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

function runtimeDashboardValue(value: unknown): string | number | null {
  if (typeof value === 'number') return value
  if (Array.isArray(value)) return value.join(';')
  if (value == null) return ''
  return String(value)
}
