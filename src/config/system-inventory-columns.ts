import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, BusinessIdListLinks, OperationalStatusIcon } from '@/components/ui'
import type { ProductionSystemInventoryItem, Project, ProjectSystemLink, ReusedInternalSystem, Tenant } from '@/data/seed.types'
import type { AllocatedSystemDashboardRow } from '@/domain/system-inventory'
import { systemCurrentVersionLabel } from '@/domain/system-version-update'
import { useAppStore } from '@/store/useAppStore'
import { REGION_OPTIONS, REUSED_PURPOSE_OPTIONS } from '@/config/picklist-options'
import { activeProjectSystemLinks } from '@/domain/allocation-context'
import {
  deriveReusedSystemOccupationWindow,
  formattedReusedInternalMachineId,
  joinUniqueValues,
  currentProjectPidsForSystem,
  hostedTenantsForSystem,
  reusedInternalAvailabilityStatus,
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

function systemVersionColumn<T extends { id: string; currentVersionUpdateId?: string | null }>(): DashboardColumn<T> {
  return {
    id: 'currentVersion',
    label: 'Version',
    getValue: (row) => {
      const state = useAppStore.getState()
      return systemCurrentVersionLabel(state.versionUpdates, state.referenceData, row.id, row.currentVersionUpdateId)
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
  { id: 'productType', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
  systemVersionColumn<ProductionSystemInventoryItem>(),
  systemUrlColumn<ProductionSystemInventoryItem>(),
  { id: 'tenantCount', label: '# Tenants', getValue: (row) => row.tenantCount },
  { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
  { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editable: true, editKey: 'cloudPlatform' },
  { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '', editable: true, editKey: 'cloudRegion' },
  { id: 'usedInRegion', label: 'Used In Region', getValue: (row) => row.region ?? '', editable: true, editKey: 'region', options: REGION_OPTIONS },
  { id: 'region', label: 'Region', getValue: (row) => row.region ?? '', editable: true, editKey: 'region', options: REGION_OPTIONS },
  { id: 'country', label: 'Country', getValue: (row) => row.country ?? '', editable: true, editKey: 'country' },
  { id: 'state', label: 'State', getValue: (row) => row.state ?? '', editable: true, editKey: 'state' },
  { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup },
  {
    id: 'operationalStatus',
    label: 'Operational Status',
    getValue: (row) => row.operationalStatus,
    editable: true,
    editKey: 'operationalStatus',
    render: (row) => createElement(OperationalStatusIcon, { status: row.operationalStatus, showLabel: true }),
  },
  { id: 'alerts', label: 'Alerts', getValue: (row) => row.alerts.join('; ') },
]

export function createReusedInternalSystemColumns(projects: Project[], projectSystems: ProjectSystemLink[]): DashboardColumn<ReusedInternalSystem>[] {
  const activeAllocations = activeProjectSystemLinks(projectSystems)
  const occupationWindow = (row: ReusedInternalSystem) =>
    deriveReusedSystemOccupationWindow(row, activeAllocations, projects, new Date().toISOString())

  return [
  {
    id: 'machineId',
    label: 'MID',
    getValue: (row) => formattedReusedInternalMachineId(row.machineId),
    render: (row) => row.machineId
      ? createElement(BusinessIdLink, { objectType: 'INTERNAL_REUSED_SYSTEM', businessId: row.machineId }, row.machineId)
      : '',
  },
  { id: 'source', label: 'Source', getValue: (row) => row.source },
  { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose, editable: true, editKey: 'purpose', options: REUSED_PURPOSE_OPTIONS },
  { id: 'status', label: 'Availability Status', getValue: (row) => reusedInternalAvailabilityStatus(row, activeAllocations, projects) },
  { id: 'productType', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
  systemVersionColumn<ReusedInternalSystem>(),
  systemUrlColumn<ReusedInternalSystem>(),
  { id: 'tenantCount', label: '# Tenants', getValue: (row) => row.tenantCount },
  { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
  { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editable: true, editKey: 'cloudPlatform' },
  { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '', editable: true, editKey: 'cloudRegion' },
  { id: 'usedInRegion', label: 'Used In Region', getValue: (row) => row.usedInRegion ?? row.timeGroup ?? '', editable: true, editKey: 'usedInRegion', options: REGION_OPTIONS },
  { id: 'occupationStartDate', label: 'Occupation Start', getValue: (row) => occupationWindow(row).occupationStartDate ?? '', editable: true, editKey: 'occupationStartDate' },
  { id: 'occupationEndDate', label: 'Occupation End', getValue: (row) => occupationWindow(row).occupationEndDate ?? '', editable: true, editKey: 'occupationEndDate' },
  {
    id: 'currentProjects',
    label: 'Linked Projects',
    getValue: (row) => currentProjectPidsForSystem(row, projects, projectSystems).join('; '),
    render: (row) =>
      createElement(BusinessIdListLinks, {
        objectType: 'PROJECT',
        businessIds: currentProjectPidsForSystem(row, projects, projectSystems),
      }),
  },
  {
    id: 'operationalStatus',
    label: 'Operational Status',
    getValue: (row) => row.operationalStatus,
    editable: true,
    editKey: 'operationalStatus',
    render: (row) => createElement(OperationalStatusIcon, { status: row.operationalStatus, showLabel: true }),
  },
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
      hideInFullDashboard: true,
      render: (row) =>
        createElement(BusinessIdListLinks, {
          objectType: 'PROJECT',
          businessIds: currentProjectPidsForSystem(row, projects),
        }),
    },
    {
      id: 'machineId',
      label: 'MID',
      getValue: (row) => formattedReusedInternalMachineId(row.machineId),
      render: (row) => row.machineId
        ? createElement(BusinessIdLink, { objectType: 'INTERNAL_REUSED_SYSTEM', businessId: row.machineId }, row.machineId)
        : '',
    },
    { id: 'source', label: 'Source', getValue: (row) => systemSourceLabel(row) },
    { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
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
      id: 'tenants',
      label: 'Hosted Tenants',
      getValue: (row) => joinUniqueValues(hostedTenantsForSystem(row.id, tenants).map((tenant) => tenant.tid)),
      render: (row) =>
        createElement(BusinessIdListLinks, {
          objectType: 'TENANT',
          businessIds: joinUniqueValues(hostedTenantsForSystem(row.id, tenants).map((tenant) => tenant.tid)),
        }),
    },
    { id: 'productType', label: 'Product', getValue: (row) => row.productType, editKey: 'productType', replaceable: true },
    systemVersionColumn<AllocatedSystemDashboardRow>(),
    systemUrlColumn<AllocatedSystemDashboardRow>({ replaceable: true }),
    {
      id: 'tenantCount',
      label: '# Tenants',
      getValue: (row) => tenantCountForSystem(row, tenants),
    },
    { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType, editKey: 'hostingType', replaceable: true },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '', editKey: 'cloudPlatform', replaceable: true },
    { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '', editKey: 'cloudRegion', replaceable: true },
    { id: 'usedInRegion', label: 'Used In Region', getValue: (row) => row.region ?? row.timeGroup ?? '', editKey: 'region', replaceable: true, options: REGION_OPTIONS },
    { id: 'timeGroup', label: 'Time Group', getValue: (row) => row.timeGroup },
    {
      id: 'operationalStatus',
      label: 'Operational Status',
      getValue: (row) => row.operationalStatus,
      editKey: 'operationalStatus',
      replaceable: true,
      render: (row) => createElement(OperationalStatusIcon, { status: row.operationalStatus, showLabel: true }),
    },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt, semanticType: 'datetime' },
  ]
}
