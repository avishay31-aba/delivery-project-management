import { createElement } from 'react'
import { Check } from 'lucide-react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { AlertStatusIcon, BusinessIdLink } from '@/components/ui'
import { formatDate } from '@/domain/date-time-presentation'
import type { WarrantyDashboardRow } from '@/domain/warranty-collection'
import { alertVariantForWarrantyStatus } from '@/domain/status-presentation'

export function createWarrantyColumns(): DashboardColumn<WarrantyDashboardRow>[] {
  return [
    { id: 'warrantyId', label: 'Warranty ID', getValue: (row) => row.warrantyId },
    { id: 'customer', label: 'Customer', getValue: (row) => row.customer },
    { id: 'accountManager', label: 'Account Manager', getValue: (row) => row.accountManager },
    {
      id: 'tenantTid',
      label: 'Tenant TID',
      getValue: (row) => row.tenantTid,
      render: (row) => createElement(BusinessIdLink, { objectType: 'TENANT', businessId: row.tenantTid }, row.tenantTid),
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
    { id: 'startDate', label: 'Start Date', getValue: (row) => formatDate(row.startDate, { fallback: '' }) },
    { id: 'endDate', label: 'End Date', getValue: (row) => formatDate(row.endDate, { fallback: '' }) },
    { id: 'daysToExpiration', label: 'Days To Expiration', getValue: (row) => row.daysToExpiration },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => row.warrantyStatusLabel },
    { id: 'tenantHeaderStatus', label: 'Tenant Header Status', getValue: (row) => row.tenantHeaderStatusLabel },
    {
      id: 'alerts',
      label: 'Alerts',
      getValue: (row) => row.alerts,
      render: (row) => row.alerts ? createElement('span', { className: 'inline-flex items-center gap-1' }, createElement(AlertStatusIcon, { variant: alertVariantForWarrantyStatus(row.warrantyStatus, row.tenantHeaderStatus) }), row.alerts) : '',
    },
    { id: 'predecessorCount', label: 'Predecessor Count', getValue: (row) => row.predecessorCount },
    { id: 'successorCount', label: 'Successor Count', getValue: (row) => row.successorCount },
  ]
}
