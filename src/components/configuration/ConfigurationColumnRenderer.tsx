import type { ReactNode } from 'react'
import { RequiredFieldMarker } from '@/components/ui/FormField'
import type { SharedFieldMetadata } from '@/domain/application-configuration'
import {
  applicationConfigurationCategoryLabel,
  applicationConfigurationRecordValue,
} from '@/domain/application-configuration'

export function formatConfigurationCellValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ') || '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

export function createConfigurationColumnsFromMetadata(fields: SharedFieldMetadata[]): SharedFieldMetadata[] {
  return fields
}

export function configurationColumnGroupLabel(field: Pick<SharedFieldMetadata, 'key' | 'group'>): string {
  return applicationConfigurationCategoryLabel(field)
}

export function configurationCellValue(record: Record<string, unknown>, field: SharedFieldMetadata): string {
  return formatConfigurationCellValue(applicationConfigurationRecordValue(record, field))
}

export function renderConfigurationColumnHeader(field: SharedFieldMetadata): ReactNode {
  return (
    <>
      <span>{field.label}{field.required ? <RequiredFieldMarker /> : null}</span>
      <span className="block text-xs font-normal text-sf-text-muted">{configurationColumnGroupLabel(field)}</span>
    </>
  )
}

export function ConfigurationColumnHeaders({ fields }: { fields: SharedFieldMetadata[] }) {
  return (
    <>
      {createConfigurationColumnsFromMetadata(fields).map((field) => (
        <th key={field.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
          {renderConfigurationColumnHeader(field)}
        </th>
      ))}
    </>
  )
}

export function ConfigurationValueCells({
  record,
  fields,
}: {
  record: Record<string, unknown>
  fields: SharedFieldMetadata[]
}) {
  return (
    <>
      {createConfigurationColumnsFromMetadata(fields).map((field) => (
        <td key={field.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
          <ConfigurationValueCell record={record} field={field} />
        </td>
      ))}
    </>
  )
}

function ConfigurationValueCell({
  record,
  field,
}: {
  record: Record<string, unknown>
  field: SharedFieldMetadata
}) {
  const value = configurationCellValue(record, field)

  return <span title={value}>{value}</span>
}
