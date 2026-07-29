import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, OperationalStatusIcon } from '@/components/ui'
import { displayWarrantyStatus } from '@/domain/warranty-collection'
import type { InfrastructureDashboardRow } from '@/domain/infrastructure-item'

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
    { id: 'tidWarrantyMonthsLeft', label: 'TID Warranty Months Left', getValue: (row) => row.tidWarrantyMonthsLeft, sortValue: (row) => row.tidWarrantyMonthsLeft ?? '', promoteAsBusinessIdentifier: false },
    { id: 'tidWarrantyDaysLeft', label: 'TID Warranty Days Left', getValue: (row) => row.tidWarrantyDaysLeft, sortValue: (row) => row.tidWarrantyDaysLeft ?? '', promoteAsBusinessIdentifier: false },
    { id: 'lastUpdatedDate', label: 'Last Updated', getValue: (row) => row.lastUpdatedDate ?? '', semanticType: 'date' },
    { id: 'maintenanceStatus', label: 'Maintenance Status', getValue: (row) => row.maintenanceStatus },
    { id: 'initialWarrantyStartDate', label: 'Initial Warranty Date', getValue: (row) => row.initialWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyStartDate', label: 'Current Warranty Start Date', getValue: (row) => row.currentWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyEndDate', label: 'Current Warranty End Date', getValue: (row) => row.currentWarrantyEndDate ?? '', semanticType: 'date' },
    { id: 'itemWarrantyDaysLeft', label: 'Warranty Days Left', getValue: (row) => row.itemWarrantyDaysLeft },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => displayWarrantyStatus(row.warrantyStatus) },
    { id: 'billingMethod', label: 'Billing Method', getValue: (row) => row.billingMethodLabel },
    { id: 'locationAddress', label: 'Location Address', getValue: (row) => row.locationAddress },
    { id: 'contactPersonName', label: 'Contact Person Name', getValue: (row) => row.warrantyContact.name },
    { id: 'contactPersonEmail', label: 'Contact Person Email', getValue: (row) => row.warrantyContact.email },
    { id: 'contactPersonPhone', label: 'Contact Person Phone', getValue: (row) => row.warrantyContact.phone },
  ]
  return options.includeActions ? columns : columns
}
