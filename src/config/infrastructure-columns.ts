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
    { id: 'owner', label: 'Owner', getValue: (row) => row.owner },
    { id: 'operationalStatus', label: 'Operational Status', getValue: (row) => row.operationalStatus },
    { id: 'maintenanceStatus', label: 'Maintenance Status', getValue: (row) => row.maintenanceStatus },
    { id: 'products', label: 'Products', getValue: (row) => row.productsDisplay },
    {
      id: 'linkedSystems',
      label: 'Linked Systems',
      getValue: (row) => row.linkedSystemsDisplay,
      render: (row) => createElement(BusinessIdListLinks, { objectType: 'SYSTEM', businessIds: row.linkedSystemBusinessIds }),
    },
    { id: 'initialWarrantyStartDate', label: 'Initial Warranty Start', getValue: (row) => row.initialWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyStartDate', label: 'Current Warranty Start', getValue: (row) => row.currentWarrantyStartDate ?? '', semanticType: 'date' },
    { id: 'currentWarrantyEndDate', label: 'Current Warranty End', getValue: (row) => row.currentWarrantyEndDate ?? '', semanticType: 'date' },
    { id: 'daysBeforeExpiration', label: 'Days Before Expiration', getValue: (row) => row.daysBeforeExpiration },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => warrantyStatusLabel(row.warrantyStatus) },
    { id: 'warrantyContact', label: 'Warranty Contact', getValue: (row) => row.warrantyContactDisplay },
    { id: 'physicalAddress', label: 'Physical Address', getValue: (row) => row.physicalAddress },
  ]
  return options.includeActions ? columns : columns
}
