import type { ReactNode } from 'react'
import { Ban, CircleCheck, LockKeyhole, PowerOff, ServerOff, ShieldX, Trash2 } from 'lucide-react'
import type { System, Tenant } from '@/data/seed.types'
import { TENANT_REQUIREMENT_CONFIGURATION_FIELDS } from '@/domain/tenant-requirement'
import { effectiveTenantOperationalMode } from '@/domain/tenant-operations'
import { systemRoutePath } from '@/domain/system-inventory'
import { LinkId, RecordChangeBadge } from '@/components/ui'
import type { SharedFieldMetadata } from '@/domain/application-configuration'

const OPERATIONAL_STATUS_ICON_STYLES: Record<string, string> = {
  On: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]',
  Operative: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]',
  Off: 'text-red-500',
  'Access blocked': 'text-amber-500',
  'Service blocked': 'text-orange-500',
  Deleted: 'text-gray-500',
  Canceled: 'text-purple-500',
  Cancelled: 'text-purple-500',
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

function formatReadOnlyValue(value: unknown): string {
  const formatted = textValue(value)
  return formatted || '-'
}

function deliveryConfigurationValue(record: System | Tenant, field: SharedFieldMetadata): unknown {
  if (field.key === 'hostingType') {
    return 'hostingSnapshot' in record && record.hostingSnapshot
      ? record.hostingSnapshot.hostingType
      : record.hostingType
  }
  if (field.key === 'cloudPlatform') {
    return 'hostingSnapshot' in record && record.hostingSnapshot
      ? record.hostingSnapshot.platform
      : record.cloudPlatform
  }
  if (field.key === 'productType') {
    return 'configuration' in record && record.configuration?.product
      ? record.configuration.product
      : record.productType
  }
  if ('configuration' in record && record.configuration) {
    const configurationValue = (record.configuration as unknown as Record<string, unknown>)[field.key]
    if (configurationValue !== undefined) return configurationValue
  }
  return (record as unknown as Record<string, unknown>)[field.key]
}

function deliveryConfigurationDisplayValue(record: System | Tenant, field: SharedFieldMetadata): string {
  return formatReadOnlyValue(deliveryConfigurationValue(record, field))
}

function OperationalStatusBadge({ value }: { value: string }) {
  const Icon =
    value === 'On' || value === 'Operative'
      ? CircleCheck
      : value === 'Off'
        ? PowerOff
        : value === 'Access blocked'
          ? LockKeyhole
          : value === 'Service blocked'
            ? ShieldX
            : value === 'Deleted'
              ? Trash2
              : value === 'Canceled' || value === 'Cancelled'
                ? Ban
                : ServerOff

  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <Icon className={['h-5 w-5 stroke-[3]', OPERATIONAL_STATUS_ICON_STYLES[value] ?? 'text-slate-400'].join(' ')} aria-hidden="true" />
      {value || 'Not set'}
    </span>
  )
}

interface TenantDeliveryTableProps {
  tenants: Tenant[]
  systems: System[]
  emptyText: string
  actions?: (tenant: Tenant, system: System | undefined) => ReactNode
}

export function TenantDeliveryTable({ tenants, systems, emptyText, actions }: TenantDeliveryTableProps) {
  if (tenants.length === 0) {
    return (
      <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="sf-scroll-x rounded border border-sf-border bg-white">
      <table className="min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {actions ? (
              <th className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                Actions
              </th>
            ) : null}
            {[
              'TID',
              'SID',
              'MID',
              'Account Name',
              'Country',
              'Time Group',
              'Operational Status',
              'Environment',
            ].map((label) => (
              <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                {label}
              </th>
            ))}
            {TENANT_REQUIREMENT_CONFIGURATION_FIELDS.map((field) => (
              <th key={field.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                <span>{field.label}</span>
                <span className="block text-xs font-normal text-sf-text-muted">{field.group}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenants.map((tenant) => {
            const system = systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId)
            return (
              <tr key={tenant.id} className="hover:bg-sf-surface-alt">
                {actions ? (
                  <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                    {actions(tenant, system)}
                  </td>
                ) : null}
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <span className="inline-flex items-center gap-2">
                    <LinkId to={`/tenants/${tenant.tid}`}>{tenant.tid}</LinkId>
                    <RecordChangeBadge record={tenant} />
                  </span>
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system ? <LinkId to={systemRoutePath(system)}>{system.sid ?? system.machineId ?? ''}</LinkId> : null}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system?.machineId ? <LinkId to={systemRoutePath(system)}>{system.machineId}</LinkId> : ''}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.accountName}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.country}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.timeGroup}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <OperationalStatusBadge value={effectiveTenantOperationalMode(tenant, system)} />
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.tenantFormType ?? tenant.tenantType}</td>
                {TENANT_REQUIREMENT_CONFIGURATION_FIELDS.map((field) => (
                  <td key={field.key} className="max-w-72 whitespace-normal border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                    {deliveryConfigurationDisplayValue(tenant, field)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
