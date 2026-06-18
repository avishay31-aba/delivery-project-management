import type { ObjectFieldDefinition } from '@/domain/object-registry'
import type { RuntimeDashboardField } from './types'

export function objectFieldToRuntimeDashboardField<T extends Record<string, unknown>>(
  field: ObjectFieldDefinition,
): RuntimeDashboardField<T> {
  return {
    id: field.key,
    label: field.label,
    getValue: (row) => runtimeDashboardValue(row[field.key]),
    editKey: field.editable === true ? field.key as keyof T : undefined,
    editable: field.editable === true,
  }
}

function runtimeDashboardValue(value: unknown): string | number | null {
  if (typeof value === 'number') return value
  if (Array.isArray(value)) return value.join(';')
  if (value == null) return ''
  return String(value)
}

