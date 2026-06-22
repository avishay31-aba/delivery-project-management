import { createElement } from 'react'
import { Check } from 'lucide-react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { AlertStatusIcon, LinkId } from '@/components/ui'
import type { WarrantyDashboardRow } from '@/domain/warranty-collection'

function text(value: string | number | null | undefined): string | number | null {
  return value ?? ''
}

function alertVariant(row: WarrantyDashboardRow): 'danger' | 'warning' | 'info' | 'success' {
  if (row.warrantyStatus === 'EXPIRED' || row.tenantHeaderStatus === 'OUT_OF_CONTRACT') return 'danger'
  if (row.warrantyStatus === 'PENDING' || row.warrantyStatus === 'NO_WARRANTY') return 'warning'
  if (row.warrantyStatus === 'VALID' || row.tenantHeaderStatus === 'UNDER_CONTRACT') return 'success'
  return 'info'
}

export function createWarrantyColumns(): DashboardColumn<WarrantyDashboardRow>[] {
  return [
    { id: 'warrantyId', label: 'Warranty ID', getValue: (row) => row.warrantyId },
    { id: 'customer', label: 'Customer', getValue: (row) => row.customer },
    { id: 'accountManager', label: 'Account Manager', getValue: (row) => row.accountManager },
    {
      id: 'tenantTid',
      label: 'Tenant TID',
      getValue: (row) => row.tenantTid,
      render: (row) => createElement(LinkId, { to: `/tenants/${row.tenantTid}` }, row.tenantTid),
    },
    { id: 'tenantName', label: 'Tenant Name', getValue: (row) => row.tenantName },
    { id: 'sid', label: 'SID', getValue: (row) => row.sid },
    { id: 'product', label: 'Product', getValue: (row) => row.product },
    { id: 'relatedProjectId', label: 'Related Project ID', getValue: (row) => row.relatedProjectId },
    { id: 'projectName', label: 'Project Name', getValue: (row) => row.projectName },
    { id: 'opportunityId', label: 'Opportunity ID', getValue: (row) => row.opportunityId },
    { id: 'warrantyType', label: 'Warranty Type', getValue: (row) => row.warrantyType },
    {
      id: 'first',
      label: 'First',
      getValue: (row) => (row.first ? 'Yes' : ''),
      render: (row) => row.first ? createElement(Check, { className: 'mx-auto h-4 w-4 text-black', 'aria-label': 'First warranty' }) : '',
    },
    { id: 'startDate', label: 'Start Date', getValue: (row) => text(row.startDate) },
    { id: 'endDate', label: 'End Date', getValue: (row) => text(row.endDate) },
    { id: 'daysToExpiration', label: 'Days To Expiration', getValue: (row) => row.daysToExpiration },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => row.warrantyStatusLabel },
    { id: 'tenantHeaderStatus', label: 'Tenant Header Status', getValue: (row) => row.tenantHeaderStatusLabel },
    {
      id: 'alerts',
      label: 'Alerts',
      getValue: (row) => row.alerts,
      render: (row) => row.alerts ? createElement('span', { className: 'inline-flex items-center gap-1' }, createElement(AlertStatusIcon, { variant: alertVariant(row) }), row.alerts) : '',
    },
    { id: 'predecessorCount', label: 'Predecessor Count', getValue: (row) => row.predecessorCount },
    { id: 'successorCount', label: 'Successor Count', getValue: (row) => row.successorCount },
  ]
}
