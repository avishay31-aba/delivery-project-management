import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { ProductionSystemInventoryItem, Project, ReusedInternalSystem, System, Tenant } from '@/data/seed.types'
import { REUSED_PURPOSE_OPTIONS, REUSED_STATUS_OPTIONS } from '@/config/picklist-options'
import {
  joinUniqueValues,
  systemSourceLabel,
  tenantCountForSystem,
} from '@/domain/system-inventory'

function systemUrlColumn<T extends { url?: string }>(options: { replaceable?: boolean } = {}): DashboardColumn<T> {
  return {
    id: 'url',
    label: 'System URL',
    getValue: (row) => row.url ?? '',
    editKey: options.replaceable ? 'url' as keyof T : undefined,
    replaceable: options.replaceable,
    render: (row) => {
      if (!row.url) return ''
      return createElement(
        'a',
        {
          href: row.url,
          target: '_blank',
          rel: 'noreferrer',
          className: 'text-sf-brand hover:underline',
          onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
        },
        row.url,
      )
    },
  }
}

export const productionSystemInventoryColumns: DashboardColumn<ProductionSystemInventoryItem>[] = [
  { id: 'sid', label: 'SID', getValue: (row) => row.sid },
  { id: 'source', label: 'Source', getValue: (row) => row.source },
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
  systemUrlColumn<ProductionSystemInventoryItem>(),
  { id: 'productType', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
  { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
  { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editable: true, editKey: 'cloudPlatform' },
  { id: 'region', label: 'Region', getValue: (row) => row.region ?? '', editable: true, editKey: 'region' },
  { id: 'country', label: 'Country', getValue: (row) => row.country ?? '', editable: true, editKey: 'country' },
  { id: 'state', label: 'State', getValue: (row) => row.state ?? '', editable: true, editKey: 'state' },
  { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup, editable: true, editKey: 'timeGroup' },
  { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus, editable: true, editKey: 'operationalStatus' },
  { id: 'tenantCount', label: '# Tenants', getValue: (row) => row.tenantCount },
  { id: 'alerts', label: 'Alerts', getValue: (row) => row.alerts.join('; ') },
]

export const reusedInternalSystemColumns: DashboardColumn<ReusedInternalSystem>[] = [
  { id: 'machineId', label: 'MID', getValue: (row) => row.machineId },
  { id: 'source', label: 'Source', getValue: (row) => row.source },
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose, editable: true, editKey: 'purpose', options: REUSED_PURPOSE_OPTIONS },
  { id: 'status', label: 'Status', getValue: (row) => row.status, editable: true, editKey: 'status', options: REUSED_STATUS_OPTIONS },
  systemUrlColumn<ReusedInternalSystem>(),
  { id: 'productType', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
  { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
  { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editable: true, editKey: 'cloudPlatform' },
  { id: 'usedInRegion', label: 'Used in Region', getValue: (row) => row.usedInRegion ?? '', editable: true, editKey: 'usedInRegion' },
  { id: 'occupationStartDate', label: 'Occupation Start', getValue: (row) => row.occupationStartDate ?? '', editable: true, editKey: 'occupationStartDate' },
  { id: 'occupationEndDate', label: 'Occupation End', getValue: (row) => row.occupationEndDate ?? '', editable: true, editKey: 'occupationEndDate' },
  { id: 'currentProjects', label: 'Current Projects', getValue: (row) => row.currentProjectIds.join('; ') },
  { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus, editable: true, editKey: 'operationalStatus' },
  { id: 'tenantCount', label: '# Tenants', getValue: (row) => row.tenantCount },
  { id: 'alerts', label: 'Alerts', getValue: (row) => row.alerts.join('; ') },
]

export function createAllocatedSystemColumns(projects: Project[], tenants: Tenant[]): DashboardColumn<System>[] {
  return [
    { id: 'sid', label: 'SID', getValue: (row) => row.sid ?? '' },
    {
      id: 'pid',
      label: 'PID',
      getValue: (row) =>
        joinUniqueValues(
          (row.linkedProjectIds ?? [])
            .map((projectId) => projects.find((project) => project.id === projectId)?.pid)
            .filter(Boolean),
          '; ',
        ),
    },
    { id: 'machineId', label: 'MID', getValue: (row) => row.machineId ?? '' },
    { id: 'source', label: 'Source', getValue: (row) => systemSourceLabel(row) },
    { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
    {
      id: 'projects',
      label: 'Linked Projects',
      getValue: (row) =>
        joinUniqueValues(
          (row.linkedProjectIds ?? [])
            .map((projectId) => projects.find((project) => project.id === projectId)?.pid)
            .filter(Boolean),
          '; ',
        ),
    },
    {
      id: 'tenantCount',
      label: '# Tenants',
      getValue: (row) => tenantCountForSystem(row, tenants),
    },
    {
      id: 'tenants',
      label: 'Hosted Tenants',
      getValue: (row) => joinUniqueValues(tenants.filter((tenant) => tenant.systemId === row.id).map((tenant) => tenant.tid)),
    },
    systemUrlColumn<System>({ replaceable: true }),
    { id: 'productType', label: 'Product', getValue: (row) => row.productType, editKey: 'productType', replaceable: true },
    { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editKey: 'hostingType', replaceable: true },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editKey: 'cloudPlatform', replaceable: true },
    { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup, editKey: 'timeGroup', replaceable: true },
    { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus, editKey: 'operationalStatus', replaceable: true },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt },
  ]
}
