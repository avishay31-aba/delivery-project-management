import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, StatusBadge } from '@/components/ui'
import type { RenewalCandidateRow } from '@/domain/warranty-collection'

function text(value: string | number | null | undefined): string | number {
  return value ?? ''
}

function categoryVariant(row: RenewalCandidateRow) {
  if (row.renewalCategory === 'EXPIRED' || row.renewalCategory === 'OUT_OF_CONTRACT') return 'error'
  if (row.renewalCategory === 'NO_WARRANTY') return 'warning'
  return 'default'
}

export function createRenewalColumns(): DashboardColumn<RenewalCandidateRow>[] {
  return [
    { id: 'warrantyId', label: 'Warranty ID', getValue: (row) => row.warrantyId },
    { id: 'customer', label: 'Customer', getValue: (row) => row.customer },
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
    { id: 'warrantyType', label: 'Warranty Type', getValue: (row) => row.warrantyType },
    { id: 'endDate', label: 'End Date', getValue: (row) => text(row.endDate) },
    { id: 'daysToExpiration', label: 'Days To Expiration', getValue: (row) => text(row.daysToExpiration) },
    { id: 'warrantyStatus', label: 'Warranty Status', getValue: (row) => row.warrantyStatusLabel },
    { id: 'tenantHeaderStatus', label: 'Tenant Header Status', getValue: (row) => row.tenantHeaderStatusLabel },
    {
      id: 'renewalCategory',
      label: 'Renewal Category',
      getValue: (row) => row.renewalCategoryLabel,
      render: (row) => createElement(StatusBadge, { label: row.renewalCategoryLabel, variant: categoryVariant(row) }),
    },
    { id: 'accountManager', label: 'Account Manager', getValue: (row) => row.accountManager },
  ]
}
