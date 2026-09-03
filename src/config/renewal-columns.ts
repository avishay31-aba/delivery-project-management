import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, StatusBadge, WarrantyStatusPresentation } from '@/components/ui'
import type { RenewalCandidateRow } from '@/domain/warranty-collection'
import { WARRANTY_FIELD_LABELS } from '@/domain/warranty-collection'
import { badgeVariantForRenewalCategory } from '@/domain/status-presentation'

function text(value: string | number | null | undefined): string | number {
  return value ?? ''
}

export function createRenewalColumns(): DashboardColumn<RenewalCandidateRow>[] {
  return [
    { id: 'warrantyId', label: WARRANTY_FIELD_LABELS.id, getValue: (row) => row.warrantyId },
    { id: 'customer', label: 'Customer', getValue: (row) => row.customer },
    {
      id: 'tenantTid',
      label: 'Tenant TID',
      getValue: (row) => row.tenantTid,
      render: (row) => createElement(BusinessIdLink, { objectType: 'TENANT', businessId: row.tenantTid }, row.tenantTid),
    },
    {
      id: 'sid',
      label: 'SID',
      getValue: (row) => row.sid,
      render: (row) => createElement(BusinessIdLink, { objectType: 'SYSTEM', businessId: row.sid }, row.sid),
    },
    { id: 'product', label: 'Product', getValue: (row) => row.product },
    {
      id: 'relatedProjectId',
      label: 'Related Project ID',
      getValue: (row) => row.relatedProjectId,
      render: (row) => createElement(BusinessIdLink, { objectType: 'PROJECT', businessId: row.relatedProjectId }, row.relatedProjectId),
    },
    { id: 'warrantyType', label: WARRANTY_FIELD_LABELS.type, getValue: (row) => row.warrantyType },
    { id: 'warrantySubType', label: WARRANTY_FIELD_LABELS.subType, getValue: (row) => row.warrantySubType },
    { id: 'endDate', label: 'End Date', getValue: (row) => row.endDate ?? '', semanticType: 'date' },
    { id: 'daysToExpiration', label: 'Days To Expiration', getValue: (row) => text(row.daysToExpiration) },
    {
      id: 'warrantyStatus',
      label: WARRANTY_FIELD_LABELS.status,
      getValue: (row) => row.warrantyStatusLabel,
      render: (row) => createElement(WarrantyStatusPresentation, { status: row.warrantyStatus }),
    },
    { id: 'tenantHeaderStatus', label: 'Tenant Header Status', getValue: (row) => row.tenantHeaderStatusLabel },
    {
      id: 'renewalCategory',
      label: 'Renewal Category',
      getValue: (row) => row.renewalCategoryLabel,
      render: (row) => createElement(StatusBadge, { label: row.renewalCategoryLabel, variant: badgeVariantForRenewalCategory(row.renewalCategory) }),
    },
    { id: 'accountManager', label: 'Account Manager', getValue: (row) => row.accountManager },
  ]
}
