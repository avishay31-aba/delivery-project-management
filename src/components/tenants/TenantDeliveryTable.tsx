import type { ReactNode } from 'react'
import { Globe2 } from 'lucide-react'
import type { System, Tenant } from '@/data/seed.types'
import { formattedReusedInternalMachineId } from '@/domain/system-inventory'
import { TENANT_REQUIREMENT_CONFIGURATION_FIELDS } from '@/domain/tenant-requirement'
import { currentOrHistoricalSystemForTenant, effectiveTenantOperationalMode, tenantConfigurationPresentationRecord, tenantRequirementIdDisplay } from '@/domain/tenant-operations'
import { systemReference, tenantReference } from '@/domain/business-reference'
import { BusinessIdLink, BusinessObjectLink, OperationalStatusIcon, RecordChangeBadge } from '@/components/ui'
import { ConfigurationColumnHeaders, ConfigurationValueCells } from '@/components/configuration'

function OperationalStatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <OperationalStatusIcon status={value} showLabel className="h-5 w-5 stroke-[3]" />
    </span>
  )
}

interface TenantDeliveryTableProps {
  tenants: Tenant[]
  systems: System[]
  emptyText: string
  actions?: (tenant: Tenant, system: System | undefined) => ReactNode
  systemTimeGroupGovernorTenantId?: string
}

export function TenantDeliveryTable({ tenants, systems, emptyText, actions, systemTimeGroupGovernorTenantId }: TenantDeliveryTableProps) {
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
            <th className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
              New/Updated
            </th>
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
              'Requirement ID',
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
            const system = currentOrHistoricalSystemForTenant(tenant, systems)
            const configurationRecord = tenantConfigurationPresentationRecord(tenant, systems, tenants)
            return (
              <tr key={tenant.id} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <RecordChangeBadge record={tenant} placeholder />
                </td>
                {actions ? (
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                    {actions(tenant, system)}
                  </td>
                ) : null}
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <BusinessObjectLink reference={tenantReference(tenant)}>{tenant.tid}</BusinessObjectLink>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system ? <BusinessObjectLink reference={systemReference(system)}>{system.sid ?? formattedReusedInternalMachineId(system.machineId) ?? ''}</BusinessObjectLink> : null}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {system?.machineId ? <BusinessObjectLink reference={systemReference(system)}>{formattedReusedInternalMachineId(system.machineId)}</BusinessObjectLink> : ''}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  {tenant.deliveryPid ? <BusinessIdLink objectType="PROJECT" businessId={tenant.deliveryPid}>{tenant.deliveryPid}</BusinessIdLink> : '-'}
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenantRequirementIdDisplay(tenant) || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.accountName}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.country}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <span className="inline-flex items-center gap-1">
                    {tenant.timeGroup}
                    {tenant.id === systemTimeGroupGovernorTenantId ? (
                      <span title="System Time Group source" aria-label="System Time Group source">
                        <Globe2 className="h-3.5 w-3.5 text-sf-blue" aria-hidden="true" />
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">
                  <OperationalStatusBadge value={effectiveTenantOperationalMode(tenant, system)} />
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm text-sf-text">{tenant.tenantFormType ?? tenant.tenantType}</td>
                <ConfigurationValueCells record={configurationRecord as unknown as Record<string, unknown>} fields={TENANT_REQUIREMENT_CONFIGURATION_FIELDS} />
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
