import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { ProductionSystemInventoryItem, Project, ReusedInternalSystem, System, Tenant } from '@/data/seed.types'

function join(values: Array<string | null | undefined>): string {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).join('; ')
}

export const productionSystemInventoryColumns: DashboardColumn<ProductionSystemInventoryItem>[] = [
  { id: 'sid', label: 'SID', getValue: (row) => row.sid },
  { id: 'source', label: 'Source', getValue: (row) => row.source },
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
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
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose, editable: true, editKey: 'purpose', options: ['POC', 'Demo', 'Training', 'Support'] },
  { id: 'status', label: 'Status', getValue: (row) => row.status, editable: true, editKey: 'status', options: ['Available', 'Occupied', 'Obsolete'] },
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
    { id: 'machineId', label: 'MID', getValue: (row) => row.machineId ?? '' },
    { id: 'source', label: 'Source', getValue: (row) => row.source ?? (row.machineId ? 'Reused Internal Systems' : 'Production') },
    { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
    {
      id: 'projects',
      label: 'Linked Projects',
      getValue: (row) =>
        join(
          (row.linkedProjectIds ?? [])
            .map((projectId) => projects.find((project) => project.id === projectId)?.pid)
            .filter(Boolean),
        ),
    },
    {
      id: 'tenantCount',
      label: '# Tenants',
      getValue: (row) => tenants.filter((tenant) => tenant.systemId === row.id).length,
    },
    {
      id: 'tenants',
      label: 'Hosted Tenants',
      getValue: (row) => join(tenants.filter((tenant) => tenant.systemId === row.id).map((tenant) => tenant.tid)),
    },
    { id: 'productType', label: 'Product', getValue: (row) => row.productType },
    { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '' },
    { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup },
    { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt },
  ]
}
