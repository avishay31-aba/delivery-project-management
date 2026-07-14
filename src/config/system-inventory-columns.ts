import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, BusinessIdListLinks } from '@/components/ui'
import type { ProductionSystemInventoryItem, Project, ProjectSystemLink, ReusedInternalSystem, Tenant } from '@/data/seed.types'
import type { AllocatedSystemDashboardRow } from '@/domain/system-inventory'
import { REGION_OPTIONS, REUSED_PURPOSE_OPTIONS, REUSED_STATUS_OPTIONS } from '@/config/picklist-options'
import {
  joinUniqueValues,
  currentProjectPidsForSystem,
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
  {
    id: 'sid',
    label: 'SID',
    getValue: (row) => row.sid,
    render: (row) => createElement(BusinessIdLink, { objectType: 'PRODUCTION_SYSTEM', businessId: row.sid }, row.sid),
  },
  { id: 'source', label: 'Source', getValue: (row) => row.source },
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
  systemUrlColumn<ProductionSystemInventoryItem>(),
  { id: 'productType', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
  { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
  { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editable: true, editKey: 'cloudPlatform' },
  { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '', editable: true, editKey: 'cloudRegion' },
  { id: 'usedInRegion', label: 'Used In Region', getValue: (row) => row.timeGroup ?? '', editable: true, editKey: 'timeGroup', options: REGION_OPTIONS },
  { id: 'region', label: 'Region', getValue: (row) => row.region ?? '', editable: true, editKey: 'region', options: REGION_OPTIONS },
  { id: 'country', label: 'Country', getValue: (row) => row.country ?? '', editable: true, editKey: 'country' },
  { id: 'state', label: 'State', getValue: (row) => row.state ?? '', editable: true, editKey: 'state' },
  { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup, editable: true, editKey: 'timeGroup', options: REGION_OPTIONS },
  { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus, editable: true, editKey: 'operationalStatus' },
  { id: 'tenantCount', label: '# Tenants', getValue: (row) => row.tenantCount },
  { id: 'alerts', label: 'Alerts', getValue: (row) => row.alerts.join('; ') },
]

export function createReusedInternalSystemColumns(projects: Project[], projectSystems: ProjectSystemLink[]): DashboardColumn<ReusedInternalSystem>[] {
  return [
  {
    id: 'machineId',
    label: 'MID',
    getValue: (row) => row.machineId,
    render: (row) => createElement(BusinessIdLink, { objectType: 'INTERNAL_REUSED_SYSTEM', businessId: row.machineId }, row.machineId),
  },
  { id: 'source', label: 'Source', getValue: (row) => row.source },
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose, editable: true, editKey: 'purpose', options: REUSED_PURPOSE_OPTIONS },
  { id: 'status', label: 'Status', getValue: (row) => row.status, editable: true, editKey: 'status', options: REUSED_STATUS_OPTIONS },
  systemUrlColumn<ReusedInternalSystem>(),
  { id: 'productType', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
  { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
  { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editable: true, editKey: 'cloudPlatform' },
  { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '', editable: true, editKey: 'cloudRegion' },
  { id: 'usedInRegion', label: 'Used In Region', getValue: (row) => row.usedInRegion ?? row.timeGroup ?? '', editable: true, editKey: 'usedInRegion', options: REGION_OPTIONS },
  { id: 'occupationStartDate', label: 'Occupation Start', getValue: (row) => row.occupationStartDate ?? '', editable: true, editKey: 'occupationStartDate' },
  { id: 'occupationEndDate', label: 'Occupation End', getValue: (row) => row.occupationEndDate ?? '', editable: true, editKey: 'occupationEndDate' },
  {
    id: 'currentProjects',
    label: 'Current PID',
    getValue: (row) => currentProjectPidsForSystem(row, projects, projectSystems).join('; '),
    render: (row) =>
      createElement(BusinessIdListLinks, {
        objectType: 'PROJECT',
        businessIds: currentProjectPidsForSystem(row, projects, projectSystems),
      }),
  },
  { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus, editable: true, editKey: 'operationalStatus' },
  { id: 'tenantCount', label: '# Tenants', getValue: (row) => row.tenantCount },
  { id: 'alerts', label: 'Alerts', getValue: (row) => row.alerts.join('; ') },
  ]
}

export function createAllocatedSystemColumns(projects: Project[], tenants: Tenant[]): DashboardColumn<AllocatedSystemDashboardRow>[] {
  return [
    {
      id: 'sid',
      label: 'SID',
      getValue: (row) => row.sid ?? '',
      render: (row) => createElement(BusinessIdLink, { objectType: 'SYSTEM', businessId: row.sid ?? '' }, row.sid ?? ''),
    },
    {
      id: 'pid',
      label: 'PID',
      getValue: (row) => currentProjectPidsForSystem(row, projects).join('; '),
      render: (row) =>
        createElement(BusinessIdListLinks, {
          objectType: 'PROJECT',
          businessIds: currentProjectPidsForSystem(row, projects),
        }),
    },
    {
      id: 'machineId',
      label: 'MID',
      getValue: (row) => row.machineId ?? '',
      render: (row) => createElement(BusinessIdLink, { objectType: 'INTERNAL_REUSED_SYSTEM', businessId: row.machineId ?? '' }, row.machineId ?? ''),
    },
    { id: 'source', label: 'Source', getValue: (row) => systemSourceLabel(row) },
    { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
    { id: 'allocationType', label: 'Allocation Type', getValue: (row) => row.allocationTypes.join('; ') },
    { id: 'allocationStatus', label: 'Allocation Status', getValue: (row) => row.allocationStatus },
    { id: 'allocatedAt', label: 'Allocated At', getValue: (row) => row.allocatedAt, semanticType: 'datetime' },
    {
      id: 'projects',
      label: 'Linked Projects',
      getValue: (row) => currentProjectPidsForSystem(row, projects).join('; '),
      render: (row) =>
        createElement(BusinessIdListLinks, {
          objectType: 'PROJECT',
          businessIds: currentProjectPidsForSystem(row, projects),
        }),
    },
    {
      id: 'tenantCount',
      label: '# Tenants',
      getValue: (row) => tenantCountForSystem(row, tenants),
    },
    {
      id: 'tenants',
      label: 'Hosted Tenants',
      getValue: (row) => joinUniqueValues(tenants.filter((tenant) => tenant.systemId === row.id || tenant.hostedSystemId === row.id).map((tenant) => tenant.tid)),
      render: (row) =>
        createElement(BusinessIdListLinks, {
          objectType: 'TENANT',
          businessIds: joinUniqueValues(tenants.filter((tenant) => tenant.systemId === row.id || tenant.hostedSystemId === row.id).map((tenant) => tenant.tid)),
        }),
    },
    systemUrlColumn<AllocatedSystemDashboardRow>({ replaceable: true }),
    { id: 'productType', label: 'Product', getValue: (row) => row.productType, editKey: 'productType', replaceable: true },
    { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editKey: 'hostingType', replaceable: true },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editKey: 'cloudPlatform', replaceable: true },
    { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '', editKey: 'cloudRegion', replaceable: true },
    { id: 'usedInRegion', label: 'Used In Region', getValue: (row) => row.region ?? row.timeGroup ?? '', editKey: 'region', replaceable: true, options: REGION_OPTIONS },
    { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup, editKey: 'timeGroup', replaceable: true, options: REGION_OPTIONS },
    { id: 'operationalStatus', label: 'Operational Mode', getValue: (row) => row.operationalStatus, editKey: 'operationalStatus', replaceable: true },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt, semanticType: 'datetime' },
  ]
}
