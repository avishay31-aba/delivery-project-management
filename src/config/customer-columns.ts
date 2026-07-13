import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, BusinessIdListLinks } from '@/components/ui'
import { REGION_OPTIONS } from '@/config/picklist-options'
import type { Account, SalesManager, System, Tenant, WarrantyRecord } from '@/data/seed.types'
import {
  CUSTOMER_ACCOUNT_FIELD_LABELS,
  accountManagerDisplayName,
  customerSidList,
  customerSystemCount,
  customerTenantCount,
  customerTenantNameList,
  customerTidList,
  customerTypeLabel,
  customerWarrantySummary,
} from '@/domain/customer-account'
import { formatDateTimeSeconds } from '@/domain/date-time-presentation'

export function createCustomerColumns(
  salesManagers: SalesManager[],
  systems: System[],
  tenants: Tenant[],
  warrantyRecords: WarrantyRecord[],
): DashboardColumn<Account>[] {
  return [
    {
      id: 'accountCode',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.accountCode,
      getValue: (row) => row.accountCode,
      editKey: 'accountCode',
      render: (row) => createElement(BusinessIdLink, { objectType: 'CUSTOMER', businessId: row.accountCode }, row.accountCode),
    },
    { id: 'accountName', label: CUSTOMER_ACCOUNT_FIELD_LABELS.accountName, getValue: (row) => row.accountName, editKey: 'accountName' },
    { id: 'customerType', label: CUSTOMER_ACCOUNT_FIELD_LABELS.customerType, getValue: customerTypeLabel },
    {
      id: 'salesManager',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.salesManager,
      getValue: (row) => accountManagerDisplayName(row.salesManagerId, salesManagers),
    },
    { id: 'region', label: CUSTOMER_ACCOUNT_FIELD_LABELS.region, getValue: (row) => row.region, editKey: 'region', options: REGION_OPTIONS },
    { id: 'country', label: CUSTOMER_ACCOUNT_FIELD_LABELS.country, getValue: (row) => row.country, editKey: 'country' },
    { id: 'state', label: CUSTOMER_ACCOUNT_FIELD_LABELS.state, getValue: (row) => row.state, editKey: 'state' },
    { id: 'timeZone', label: CUSTOMER_ACCOUNT_FIELD_LABELS.timeZone, getValue: (row) => row.timeZone, editKey: 'timeZone' },
    {
      id: 'systemCount',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.systemCount,
      getValue: (row) => customerSystemCount(row.id, systems),
    },
    {
      id: 'tenantCount',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.tenantCount,
      getValue: (row) => customerTenantCount(row.id, tenants),
    },
    {
      id: 'sids',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.sids,
      getValue: (row) => customerSidList(row.id, systems),
      render: (row) => createElement(BusinessIdListLinks, { objectType: 'SYSTEM', businessIds: customerSidList(row.id, systems) }),
    },
    {
      id: 'tids',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.tids,
      getValue: (row) => customerTidList(row.id, tenants),
      render: (row) => createElement(BusinessIdListLinks, { objectType: 'TENANT', businessIds: customerTidList(row.id, tenants) }),
    },
    {
      id: 'tenantNames',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.tenantNames,
      getValue: (row) => customerTenantNameList(row.id, tenants),
    },
    {
      id: 'warrantySummary',
      label: CUSTOMER_ACCOUNT_FIELD_LABELS.warrantySummary,
      getValue: (row) => customerWarrantySummary(row.id, tenants, warrantyRecords),
    },
    { id: 'updatedAt', label: CUSTOMER_ACCOUNT_FIELD_LABELS.updatedAt, getValue: (row) => formatDateTimeSeconds(row.updatedAt) },
  ]
}
