import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { Account, SalesManager, System, Tenant, WarrantyRecord } from '@/data/seed.types'

function joinSemicolon(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(';')
}

function warrantySummary(accountId: string, tenants: Tenant[], warrantyRecords: WarrantyRecord[]): string {
  const accountTenantIds = new Set(tenants.filter((tenant) => tenant.accountId === accountId).map((tenant) => tenant.id))
  const statuses = warrantyRecords
    .filter((record) => accountTenantIds.has(record.tenantId))
    .map((record) => record.status)

  if (statuses.length === 0) return ''

  return Array.from(new Set(statuses)).join(';')
}

export function createCustomerColumns(
  salesManagers: SalesManager[],
  systems: System[],
  tenants: Tenant[],
  warrantyRecords: WarrantyRecord[],
): DashboardColumn<Account>[] {
  return [
    { id: 'accountCode', label: 'Customer / Account ID', getValue: (row) => row.accountCode },
    { id: 'accountName', label: 'Customer / Account Name', getValue: (row) => row.accountName },
    { id: 'customerType', label: 'Customer Type', getValue: (row) => row.customerType === 'VETERAN_CUSTOMER' ? 'Veteran' : 'New' },
    {
      id: 'salesManager',
      label: 'Sales Manager / Deal Owner',
      getValue: (row) => salesManagers.find((manager) => manager.id === row.salesManagerId)?.name ?? '',
    },
    { id: 'region', label: 'Region', getValue: (row) => row.region },
    { id: 'country', label: 'Country', getValue: (row) => row.country },
    { id: 'state', label: 'State', getValue: (row) => row.state },
    { id: 'timeZone', label: 'Time Zone', getValue: (row) => row.timeZone },
    {
      id: 'systemCount',
      label: 'Number of Systems',
      getValue: (row) => systems.filter((system) => system.accountId === row.id).length,
    },
    {
      id: 'tenantCount',
      label: 'Number of Tenants',
      getValue: (row) => tenants.filter((tenant) => tenant.accountId === row.id).length,
    },
    {
      id: 'sids',
      label: 'SIDs',
      getValue: (row) => joinSemicolon(systems.filter((system) => system.accountId === row.id).map((system) => system.sid)),
    },
    {
      id: 'tids',
      label: 'TIDs',
      getValue: (row) => joinSemicolon(tenants.filter((tenant) => tenant.accountId === row.id).map((tenant) => tenant.tid)),
    },
    {
      id: 'tenantNames',
      label: 'Tenant Names',
      getValue: (row) =>
        joinSemicolon(
          tenants
            .filter((tenant) => tenant.accountId === row.id)
            .map((tenant) => tenant.tenantName || `${tenant.tid} ${tenant.accountName}`.trim()),
        ),
    },
    {
      id: 'warrantySummary',
      label: 'Warranty Summary',
      getValue: (row) => warrantySummary(row.id, tenants, warrantyRecords),
    },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt },
  ]
}
