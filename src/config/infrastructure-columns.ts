import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink } from '@/components/ui'
import { displayWarrantyStatus } from '@/domain/warranty-collection'
import type { InfrastructureDashboardRow } from '@/domain/infrastructure-item'

export function createInfrastructureColumns(options: { includeActions?: boolean } = {}): DashboardColumn<InfrastructureDashboardRow>[] {
  const columns: DashboardColumn<InfrastructureDashboardRow>[] = [
    {
      id: 'infrastructureId',
      label: 'Item ID',
      getValue: (row) => row.infrastructureId,
      render: (row) => createElement(BusinessIdLink, { objectType: 'INFRASTRUCTURE_ITEM', businessId: row.infrastructureId }, row.infrastructureId),
    },
    { id: 'identifier', label: 'Identifier', getValue: (row) => row.identifier },
    { id: 'linkedSidTid', label: 'Linked SID/TID', getValue: (row) => row.linkedSidTidDisplay || '-', sortValue: (row) => row.linkedSidTidDisplay || '' },
    { id: 'products', label: 'Products', getValue: (row) => row.productsDisplay },
    { id: 'owner', label: 'Owner', getValue: (row) => row.ownerLabel },
    { id: 'operationalStatus', label: 'Operational Status', getValue: (row) => row.operationalStatus },
    { id: 'category', label: 'Category', getValue: (row) => row.categoryLabel },
    { id: 'type', label: 'Type', getValue: (row) => row.typeLabel },
    { id: 'latestExpiringTenantId', label: 'Latest Expiring Tenant', getValue: (row) => row.latestExpiringTenantId || null, sortValue: (row) => row.latestExpiringTenantId || '' },
    { id: 'latestTenantWarrantyEndDate', label: 'Latest Tenant Warranty End', getValue: (row) => row.latestTenantWarrantyEndDate || '', semanticType: 'date', sortValue: (row) => row.latestTenantWarrantyEndDate || '' },
    { id: 'tidWarrantyMonthsLeft', label: 'TID Warranty Months Left', getValue: (row) => row.tidWarrantyMonthsLeft, sortValue: (row) => row.tidWarrantyMonthsLeft ?? '', promoteAsBusinessIdentifier: false },
    { id: 'tidWarrantyDaysLeft', label: 'TID Warranty Days Left', getValue: (row) => row.tidWarrantyDaysLeft, sortValue: (row) => row.tidWarrantyDaysLeft ?? '', promoteAsBusinessIdentifier: false },
    { id: 'manufacturer', label: 'Manufacturer', getValue: (row) => row.manufacturerLabel },
    { id: 'model', label: 'Model', getValue: (row) => row.model },
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
