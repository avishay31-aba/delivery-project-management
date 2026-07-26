import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, BusinessIdListLinks } from '@/components/ui'
import type { InfrastructureDashboardRow } from '@/domain/infrastructure-item'

function warrantyStatusLabel(value: string): string {
  if (value === 'NOT_SET') return 'Not Set Yet'
  if (value === 'NO_WARRANTY') return 'No Warranty'
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
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
    { id: 'category', label: 'Category', getValue: (row) => row.categoryLabel },
    { id: 'type', label: 'Type', getValue: (row) => row.typeLabel },
    { id: 'manufacturer', label: 'Manufacturer', getValue: (row) => row.manufacturerLabel },
    { id: 'model', label: 'Model', getValue: (row) => row.model },
    { id: 'lastUpdatedDate', label: 'Last Updated', getValue: (row) => row.lastUpdatedDate ?? '', semanticType: 'date' },
    { id: 'owner', label: 'Owner', getValue: (row) => row.ownerLabel },
    { id: 'operationalStatus', label: 'Operational Status', getValue: (row) => row.operationalStatus },
    { id: 'maintenanceStatus', label: 'Maintenance Status', getValue: (row) => row.maintenanceStatus },
    { id: 'products', label: 'Products', getValue: (row) => row.productsDisplay },
    {
      id: 'linkedSystems',
      label: 'Linked Systems',
      getValue: (row) => row.linkedSystemsDisplay,
      render: (row) => createElement(BusinessIdListLinks, { objectType: 'SYSTEM', businessIds: row.linkedSystemBusinessIds }),
    },
    { id: 'latestWarrantyTid', label: 'Latest Warranty TID', getValue: (row) => row.latestWarrantyTid },
    { id: 'latestWarrantyEndDate', label: 'Latest Warranty End Date', getValue: (row) => row.latestWarrantyEndDate, semanticType: 'date' },
    { id: 'tidMonthsLeft', label: 'TID Months Left', getValue: (row) => row.tidMonthsLeft },
    { id: 'tidDaysLeft', label: 'TID Days Left', getValue: (row) => row.tidDaysLeft },
    { id: 'warrantyType', label: 'Warranty Type', getValue: (row) => row.warrantyTypeLabel },
    { id: 'initialWarrantyStartDate', label: 'Initial Warranty Start', getValue: (row) => row.initialWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyStartDate', label: 'Current Warranty Start', getValue: (row) => row.currentWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyEndDate', label: 'Current Warranty End', getValue: (row) => row.currentWarrantyEndDate ?? '', semanticType: 'date' },
    { id: 'itemWarrantyDaysLeft', label: 'Item Warranty Days Left', getValue: (row) => row.itemWarrantyDaysLeft },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => warrantyStatusLabel(row.warrantyStatus) },
    { id: 'billingMethod', label: 'Billing Method', getValue: (row) => row.billingMethodLabel },
    { id: 'address', label: 'Address', getValue: (row) => row.locationAddress },
    { id: 'contactPersonName', label: 'Contact Person Name', getValue: (row) => row.warrantyContact.name },
    { id: 'contactPersonEmail', label: 'Contact Person Email', getValue: (row) => row.warrantyContact.email },
    { id: 'contactPersonPhone', label: 'Contact Person Phone', getValue: (row) => row.warrantyContact.phone },
  ]
  return options.includeActions ? columns : columns
}
