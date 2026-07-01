import type { ReactNode } from 'react'
import type { System, Tenant } from '@/data/seed.types'
import { TENANT_REQUIREMENT_CONFIGURATION_FIELDS } from '@/domain/tenant-requirement'
import { effectiveTenantOperationalMode } from '@/domain/tenant-operations'
import { systemReference, tenantReference } from '@/domain/business-reference'
import { operationalStatusPresentation } from '@/domain/status-presentation'
import { BusinessIdLink, BusinessObjectLink, RecordChangeBadge } from '@/components/ui'
import { ConfigurationColumnHeaders, ConfigurationValueCells } from '@/components/configuration'

function OperationalStatusBadge({ value }: { value: string }) {
  const presentation = operationalStatusPresentation(value)
  const Icon = presentation.icon

  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <Icon className={['h-5 w-5 stroke-[3]', presentation.iconClassName].join(' ')} aria-hidden="true" />
      {presentation.label}
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
      <table className="w-max min-w-full border-collapse text-sm leading-tight">
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
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                    {actions(tenant, system)}
                  </td>
                ) : null}
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <span className="inline-flex items-center gap-2">
                    <BusinessObjectLink reference={tenantReference(tenant)}>{tenant.tid}</BusinessObjectLink>
                    <RecordChangeBadge record={tenant} />
                  </span>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system ? <BusinessObjectLink reference={systemReference(system)}>{system.sid ?? system.machineId ?? ''}</BusinessObjectLink> : null}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system?.machineId ? <BusinessObjectLink reference={systemReference(system)}>{system.machineId}</BusinessObjectLink> : ''}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {tenant.deliveryPid ? <BusinessIdLink objectType="PROJECT" businessId={tenant.deliveryPid}>{tenant.deliveryPid}</BusinessIdLink> : '-'}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.accountName}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.country}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.timeGroup}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <OperationalStatusBadge value={effectiveTenantOperationalMode(tenant, system)} />
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.tenantFormType ?? tenant.tenantType}</td>
                <ConfigurationValueCells record={tenant as unknown as Record<string, unknown>} fields={TENANT_REQUIREMENT_CONFIGURATION_FIELDS} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
