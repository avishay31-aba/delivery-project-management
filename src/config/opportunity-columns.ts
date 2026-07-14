import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink } from '@/components/ui'
import { getVisibleRequirementTypesForOpportunity } from '@/config/opportunity-metadata'
import { REGION_OPTIONS } from '@/config/picklist-options'
import type { Account, Opportunity, SalesManager, System, Tenant } from '@/data/seed.types'
import { getHiddenRequirementTypesWithRows, validateOpportunity } from '@/utils/opportunity-validation'

export function createOpportunityColumns(
  accounts: Account[],
  salesManagers: SalesManager[],
  systems: System[] = [],
  tenants: Tenant[] = [],
): DashboardColumn<Opportunity>[] {
  const accountName = (accountId: string) =>
    accounts.find((account) => account.id === accountId)?.accountName ?? accountId
  const accountCode = (accountId: string) =>
    accounts.find((account) => account.id === accountId)?.accountCode ?? ''
  const salesManagerName = (salesManagerId: string) =>
    salesManagers.find((salesManager) => salesManager.id === salesManagerId)?.name ?? salesManagerId

  return [
    {
      id: 'opportunityId',
      label: 'Opportunity ID',
      getValue: (row) => row.opportunityId,
      render: (row) => createElement(BusinessIdLink, { objectType: 'OPPORTUNITY', businessId: row.opportunityId }, row.opportunityId),
    },
    { id: 'opportunityName', label: 'Opportunity Name', getValue: (row) => row.opportunityName, editKey: 'opportunityName' },
    { id: 'stage', label: 'Stage', getValue: (row) => row.stage, editKey: 'stage' },
    {
      id: 'account',
      label: 'Account',
      getValue: (row) => accountName(row.accountId),
      render: (row) => createElement(BusinessIdLink, { objectType: 'CUSTOMER', businessId: accountCode(row.accountId) }, accountName(row.accountId)),
    },
    { id: 'salesManager', label: 'Sales Manager', getValue: (row) => salesManagerName(row.salesManagerId) },
    { id: 'type', label: 'Opportunity Type', getValue: (row) => row.type, editKey: 'type' },
    { id: 'subType', label: 'Opportunity Sub Type', getValue: (row) => row.subType, editKey: 'subType' },
    { id: 'region', label: 'Region', getValue: (row) => row.region, editKey: 'region', options: REGION_OPTIONS },
    { id: 'country', label: 'Country', getValue: (row) => row.country, editKey: 'country' },
    { id: 'deliveryDate', label: 'Delivery Date', getValue: (row) => row.deliveryDate ?? '', editKey: 'deliveryDate', semanticType: 'date' },
    { id: 'pocStartDate', label: 'POC Start Date', getValue: (row) => row.pocStartDate ?? '', editKey: 'pocStartDate' },
    { id: 'pocEndDate', label: 'POC End Date', getValue: (row) => row.pocEndDate ?? '', editKey: 'pocEndDate' },
    {
      id: 'visibleRequirementTypes',
      label: 'Visible Requirement Types',
      getValue: (row) => getVisibleRequirementTypesForOpportunity(row).join('+'),
    },
    {
      id: 'requirementRowCount',
      label: 'Requirement Rows',
      getValue: (row) =>
        row.newTenantRequirements.length +
        row.changeRequestRequirements.length +
        row.standardRenewalRequirements.length,
    },
    {
      id: 'hiddenRequirementRowCount',
      label: 'Hidden Requirement Rows',
      getValue: (row) => getHiddenRequirementTypesWithRows(row).length,
    },
    {
      id: 'validationStatus',
      label: 'Validation Status',
      getValue: (row) =>
        validateOpportunity(row, { accounts, systems, tenants }).some((message) => message.level === 'error')
          ? 'Needs attention'
          : 'Ready',
    },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt, semanticType: 'datetime' },
  ]
}
