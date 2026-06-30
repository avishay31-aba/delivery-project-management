import type { ReactNode } from 'react'
import { Ban, CircleCheck, LockKeyhole, PowerOff, ServerOff, ShieldX, Trash2 } from 'lucide-react'
import type { System, Tenant } from '@/data/seed.types'
import { TENANT_REQUIREMENT_CONFIGURATION_FIELDS } from '@/domain/tenant-requirement'
import { effectiveTenantOperationalMode } from '@/domain/tenant-operations'
import { systemReference, tenantReference } from '@/domain/business-reference'
import { BusinessIdLink, BusinessObjectLink, RecordChangeBadge } from '@/components/ui'
import { ConfigurationColumnHeaders, ConfigurationValueCells } from '@/components/configuration'

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
              'PID',
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
            <ConfigurationColumnHeaders fields={TENANT_REQUIREMENT_CONFIGURATION_FIELDS} />
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
                    <BusinessObjectLink reference={tenantReference(tenant)}>{tenant.tid}</BusinessObjectLink>
                    <RecordChangeBadge record={tenant} />
                  </span>
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system ? <BusinessObjectLink reference={systemReference(system)}>{system.sid ?? system.machineId ?? ''}</BusinessObjectLink> : null}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system?.machineId ? <BusinessObjectLink reference={systemReference(system)}>{system.machineId}</BusinessObjectLink> : ''}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {tenant.deliveryPid ? <BusinessIdLink objectType="PROJECT" businessId={tenant.deliveryPid}>{tenant.deliveryPid}</BusinessIdLink> : '-'}
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.accountName}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.country}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.timeGroup}</td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <OperationalStatusBadge value={effectiveTenantOperationalMode(tenant, system)} />
                </td>
                <td className="border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.tenantFormType ?? tenant.tenantType}</td>
                <ConfigurationValueCells record={tenant as unknown as Record<string, unknown>} fields={TENANT_REQUIREMENT_CONFIGURATION_FIELDS} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
