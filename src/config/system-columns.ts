import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, BusinessIdListLinks } from '@/components/ui'
import type { Account, SalesManager, System, Tenant } from '@/data/seed.types'
import { hostedTenantsForSystem, joinUniqueValues, systemIdentity, tenantCountForSystem } from '@/domain/system-inventory'

export function createSystemColumns(
  accounts: Account[],
  salesManagers: SalesManager[],
  tenants: Tenant[],
): DashboardColumn<System>[] {
  return [
    {
      id: 'sid',
      label: 'SID',
      getValue: (row) => systemIdentity(row),
      render: (row) => createElement(BusinessIdLink, { objectType: 'SYSTEM', businessId: systemIdentity(row) }, systemIdentity(row)),
    },
    {
      id: 'accountName',
      label: 'Customer / End User / Account',
      getValue: (row) => accounts.find((account) => account.id === row.accountId)?.accountName ?? '',
    },
    { id: 'accountId', label: 'Account ID', getValue: (row) => row.accountId ?? '' },
    {
      id: 'salesManager',
      label: 'Sales Manager / Deal Owner',
      getValue: (row) => salesManagers.find((manager) => manager.id === row.salesManagerId)?.name ?? '',
    },
    { id: 'hosting', label: 'Hosting', getValue: (row) => row.hostingType, editable: true, editKey: 'hostingType' },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '' },
    { id: 'cloudRegion', label: 'Cloud Region', getValue: (row) => row.cloudRegion ?? '' },
    { id: 'product', label: 'Product', getValue: (row) => row.productType, editable: true, editKey: 'productType' },
    { id: 'region', label: 'Region', getValue: (row) => row.region ?? row.timeGroup },
    { id: 'country', label: 'Country', getValue: (row) => row.country ?? '' },
    { id: 'state', label: 'State', getValue: (row) => row.state ?? '' },
    {
      id: 'tenantCount',
      label: 'Tenants Count',
      getValue: (row) => tenantCountForSystem(row, tenants),
    },
    {
      id: 'deliveryPid',
      label: 'Related Delivery PID',
      getValue: (row) => joinUniqueValues(hostedTenantsForSystem(row.id, tenants).map((tenant) => tenant.deliveryPid), ';'),
      render: (row) =>
        createElement(BusinessIdListLinks, {
          objectType: 'PROJECT',
          businessIds: joinUniqueValues(hostedTenantsForSystem(row.id, tenants).map((tenant) => tenant.deliveryPid), ';'),
        }),
    },
    { id: 'systemStatus', label: 'System Status', getValue: (row) => row.operationalStatus, editable: true, editKey: 'operationalStatus' },
    { id: 'systemClass', label: 'System Class', getValue: (row) => row.systemClass },
    { id: 'purpose', label: 'Purpose', getValue: (row) => row.purpose },
    { id: 'availability', label: 'Availability', getValue: (row) => row.availability },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt, semanticType: 'datetime' },
  ]
}
