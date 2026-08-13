import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, MaintenanceStatusPresentation, OperationalStatusIcon, RecurrenceIndicator, TaskStatusPresentation, WarrantyStatusPresentation } from '@/components/ui'
import { displayWarrantyStatus } from '@/domain/warranty-collection'
import { type InfrastructureDashboardRow, type InfrastructureMaintenanceDashboardRow } from '@/domain/infrastructure-item'

function renderLinkedSidTid(value: string) {
  if (!value || value === '-') return '-'

  return createElement(
    'span',
    null,
    value.split('; ').map((group, groupIndex) => {
      const separatorIndex = group.indexOf('-')
      const sid = separatorIndex >= 0 ? group.slice(0, separatorIndex) : group
      const tidList = separatorIndex >= 0 ? group.slice(separatorIndex + 1) : ''
      const tids = tidList.split(',').map((tid) => tid.trim()).filter(Boolean)

      return createElement(
        'span',
        { key: `${group}-${groupIndex}` },
        groupIndex > 0 ? '; ' : null,
        sid
          ? createElement(BusinessIdLink, { objectType: 'SYSTEM', businessId: sid }, sid)
          : null,
        '-',
        tids.map((tid, tidIndex) =>
          createElement(
            'span',
            { key: `${tid}-${tidIndex}` },
            tidIndex > 0 ? ',' : null,
            createElement(BusinessIdLink, { objectType: 'TENANT', businessId: tid }, tid),
          ),
        ),
      )
    }),
  )
}

export function createInfrastructureColumns(options: { includeActions?: boolean } = {}): DashboardColumn<InfrastructureDashboardRow>[] {
  const columns: DashboardColumn<InfrastructureDashboardRow>[] = [
    {
      id: 'infrastructureId',
      label: 'Item ID',
      getValue: (row) => row.infrastructureId,
      render: (row) => createElement(BusinessIdLink, { objectType: 'INFRASTRUCTURE_ITEM', businessId: row.infrastructureId }, row.infrastructureId),
    },
    { id: 'identifier', label: 'Identifier', getValue: (row) => row.identifier },
    { id: 'owner', label: 'Owner', getValue: (row) => row.ownerLabel },
    { id: 'operationalStatus', label: 'Operational Status', getValue: (row) => row.operationalStatus, render: (row) => createElement(OperationalStatusIcon, { status: row.operationalStatus, showLabel: true }) },
    { id: 'category', label: 'Category', getValue: (row) => row.categoryLabel },
    { id: 'type', label: 'Type', getValue: (row) => row.typeLabel },
    { id: 'manufacturer', label: 'Manufacturer', getValue: (row) => row.manufacturerLabel },
    { id: 'model', label: 'Model', getValue: (row) => row.model },
    { id: 'linkedSidTid', label: 'Linked SID/TID', getValue: (row) => row.linkedSidTidDisplay || '-', sortValue: (row) => row.linkedSidTidDisplay || '', render: (row) => renderLinkedSidTid(row.linkedSidTidDisplay), promoteAsBusinessIdentifier: false },
    { id: 'products', label: 'Products', getValue: (row) => row.productsDisplay },
    { id: 'latestExpiringTenantId', label: 'Latest Expiring Tenant', getValue: (row) => row.latestExpiringTenantId || null, sortValue: (row) => row.latestExpiringTenantId || '', render: (row) => row.latestExpiringTenantId ? createElement(BusinessIdLink, { objectType: 'TENANT', businessId: row.latestExpiringTenantId }, row.latestExpiringTenantId) : '' },
    { id: 'latestTenantWarrantyEndDate', label: 'Latest Tenant Warranty End', getValue: (row) => row.latestTenantWarrantyEndDate || '', semanticType: 'date', sortValue: (row) => row.latestTenantWarrantyEndDate || '' },
    { id: 'latestExpiringTenantAccountName', label: 'Account Latest Expiration', getValue: (row) => row.latestExpiringTenantAccountName || '' },
    { id: 'tidWarrantyMonthsLeft', label: 'TID Warranty Months Left', getValue: (row) => row.tidWarrantyMonthsLeft, sortValue: (row) => row.tidWarrantyMonthsLeft ?? '', promoteAsBusinessIdentifier: false },
    { id: 'tidWarrantyDaysLeft', label: 'TID Warranty Days Left', getValue: (row) => row.tidWarrantyDaysLeft, sortValue: (row) => row.tidWarrantyDaysLeft ?? '', promoteAsBusinessIdentifier: false },
    { id: 'lastMaintenanceDate', label: 'Last Maintenance Date', getValue: (row) => row.lastMaintenanceDate ?? '', semanticType: 'date' },
    {
      id: 'maintenanceStatus',
      label: 'Maintenance Status',
      getValue: (row) => row.maintenanceStatuses.length > 0 ? row.maintenanceStatuses.join('; ') : 'None',
      render: (row) => createElement(MaintenanceStatusPresentation, { status: row.maintenanceStatuses }),
    },
    { id: 'initialWarrantyStartDate', label: 'Initial Warranty Date', getValue: (row) => row.initialWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyStartDate', label: 'Current Warranty Start Date', getValue: (row) => row.currentWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyEndDate', label: 'Current Warranty End Date', getValue: (row) => row.currentWarrantyEndDate ?? '', semanticType: 'date' },
    { id: 'itemWarrantyDaysLeft', label: 'Warranty Days Left', getValue: (row) => row.itemWarrantyDaysLeft },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => displayWarrantyStatus(row.warrantyStatus), render: (row) => createElement(WarrantyStatusPresentation, { status: row.warrantyStatus }) },
    { id: 'billingMethod', label: 'Billing Method', getValue: (row) => row.billingMethodLabel },
    { id: 'locationAddress', label: 'Location Address', getValue: (row) => row.locationAddress },
    { id: 'contactPersonName', label: 'Contact Person Name', getValue: (row) => row.warrantyContact.name },
    { id: 'contactPersonEmail', label: 'Contact Person Email', getValue: (row) => row.warrantyContact.email },
    { id: 'contactPersonPhone', label: 'Contact Person Phone', getValue: (row) => row.warrantyContact.phone },
  ]
  return options.includeActions ? columns : columns
}

export function createInfrastructureMaintenanceTaskColumns(options: { includeDaysRunning?: boolean } = {}): DashboardColumn<InfrastructureMaintenanceDashboardRow>[] {
  const columns: DashboardColumn<InfrastructureMaintenanceDashboardRow>[] = [
    {
      id: 'taskId',
      label: 'Task ID',
      getValue: (row) => row.taskId,
      render: (row) => createElement('span', { className: 'inline-flex items-center gap-2' },
        createElement(BusinessIdLink, { objectType: 'INFRASTRUCTURE_ITEM', businessId: row.infrastructureItemId }, row.taskId),
        createElement(RecurrenceIndicator, { recurring: Boolean(row.recurrenceSeriesId), done: row.taskStatus === 'Done' }),
      ),
    },
    { id: 'taskType', label: 'Task Type', getValue: (row) => row.taskType },
    { id: 'description', label: 'Description', getValue: (row) => row.description },
    {
      id: 'infrastructureItemId',
      label: 'Infrastructure Item ID',
      getValue: (row) => row.infrastructureItemId,
      render: (row) => createElement(BusinessIdLink, { objectType: 'INFRASTRUCTURE_ITEM', businessId: row.infrastructureItemId }, row.infrastructureItemId),
    },
    {
      id: 'infrastructureItemName',
      label: 'Infrastructure Item Name',
      getValue: (row) => row.infrastructureItemName,
      render: (row) => createElement(BusinessIdLink, { objectType: 'INFRASTRUCTURE_ITEM', businessId: row.infrastructureItemId }, row.infrastructureItemName),
    },
    { id: 'infrastructureType', label: 'Infrastructure Type', getValue: (row) => row.infrastructureType },
    { id: 'region', label: 'Region', getValue: (row) => row.region },
    { id: 'customer', label: 'Customer', getValue: (row) => row.customer },
    { id: 'account', label: 'Account', getValue: (row) => row.account },
    { id: 'tenant', label: 'Tenant', getValue: (row) => row.tenant },
    { id: 'startDate', label: 'Start Date', getValue: (row) => row.startDate, semanticType: 'date', sortValue: (row) => row.startDate },
    { id: 'dueDate', label: 'Due Date', getValue: (row) => row.dueDate, semanticType: 'date', sortValue: (row) => row.dueDate },
    { id: 'assignedResource', label: 'Assigned Resource', getValue: (row) => row.assignedResource },
    { id: 'taskStatus', label: 'Task Status', getValue: (row) => row.taskStatus, render: (row) => createElement(TaskStatusPresentation, { status: row.taskStatus }) },
    {
      id: 'alert',
      label: 'Alert',
      getValue: (row) => row.alert || '',
      render: (row) => createElement(MaintenanceStatusPresentation, { status: row.alert }),
    },
    { id: 'recurrence', label: 'Recurrence', getValue: (row) => row.recurrenceSummary },
  ]

  if (options.includeDaysRunning) {
    columns.push({ id: 'daysRunning', label: 'Days Running', getValue: (row) => row.daysRunning, sortValue: (row) => row.daysRunning ?? '' })
  }

  return columns
}
