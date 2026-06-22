import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'
import type { Tenant } from '@/data/seed.types'
import {
  customerAccount360ReadModel,
  customerDisplayName,
  customerTypeLabel,
} from '@/domain/customer-account'
import { systemIdentity } from '@/domain/system-inventory'
import {
  warrantyDashboardRows,
} from '@/domain/warranty-collection'
import { useAppStore } from '@/store/useAppStore'

type Customer360Tab = 'overview' | 'opportunities' | 'projects' | 'systems' | 'tenants' | 'warranties' | 'documents'

const CUSTOMER_360_TABS: Array<{ id: Customer360Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'projects', label: 'Projects' },
  { id: 'systems', label: 'Systems' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'warranties', label: 'Warranties' },
  { id: 'documents', label: 'Documents' },
]

function readOnlyValue(label: string, value: string) {
  return (
    <div className="rounded border border-sf-border bg-white p-3">
      <div className="text-xs font-semibold uppercase text-sf-text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-sf-text">{value || '-'}</div>
    </div>
  )
}

export function Customer360Page() {
  const { accountCode = '' } = useParams()
  const accounts = useAppStore((state) => state.accounts)
  const opportunities = useAppStore((state) => state.opportunities)
  const projects = useAppStore((state) => state.projects)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const [activeTab, setActiveTab] = useState<Customer360Tab>('overview')

  const account = accounts.find((candidate) => candidate.accountCode === accountCode)
  const warrantyRows = useMemo(
    () =>
      warrantyDashboardRows({
        tenants,
        accountNameForTenant: (tenant: Tenant) => accounts.find((candidate) => candidate.id === tenant.accountId)?.accountName ?? tenant.accountName,
        accountManagerForTenant: (tenant: Tenant) => {
          const tenantAccount = accounts.find((candidate) => candidate.id === tenant.accountId)
          return salesManagers.find((manager) => manager.id === tenantAccount?.salesManagerId)?.name ?? ''
        },
        tenantNameForTenant: (tenant: Tenant) => tenant.tenantName || `${tenant.tid} ${tenant.accountName}`.trim(),
        sidForTenant: (tenant: Tenant) => {
          const system = systems.find((candidate) => candidate.id === (tenant.hostedSystemId ?? tenant.systemId))
          return system ? systemIdentity(system) : ''
        },
        productForTenant: (tenant: Tenant) => {
          const system = systems.find((candidate) => candidate.id === (tenant.hostedSystemId ?? tenant.systemId))
          return tenant.productType ?? system?.productType ?? ''
        },
        projectNameForProjectId: (projectId: string) => {
          const project = projects.find((candidate) => candidate.id === projectId)
          return project?.opportunityName ?? project?.pid ?? ''
        },
      }),
    [accounts, projects, salesManagers, systems, tenants],
  )

  const customer360 = useMemo(
    () =>
      account
        ? customerAccount360ReadModel({
            account,
            salesManagers,
            opportunities,
            projects,
            systems,
            tenants,
            warrantyRows,
          })
        : null,
    [account, opportunities, projects, salesManagers, systems, tenants, warrantyRows],
  )

  if (!account || !customer360) {
    return (
      <PlaceholderCard
        title="Customer not found"
        description={`No customer with account code "${accountCode}" in the current store.`}
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title={customerDisplayName(account)} subtitle="Customer 360 workspace" />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {readOnlyValue('Account ID', account.accountCode)}
        {readOnlyValue('Account Manager', customer360.accountManager)}
        {readOnlyValue('Region', account.region)}
        {readOnlyValue('Country', account.country)}
        {readOnlyValue('Customer Type', customerTypeLabel(account))}
      </section>

      <section className="rounded border border-sf-border bg-sf-surface">
        <div className="flex flex-wrap border-b border-sf-border">
          {CUSTOMER_360_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'border-b-2 px-4 py-2 text-base font-semibold',
                activeTab === tab.id
                  ? 'border-sf-brand bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
              ].join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-64 p-3 text-sm text-sf-text-muted" role="tabpanel" aria-label={CUSTOMER_360_TABS.find((tab) => tab.id === activeTab)?.label}>
          {activeTab === 'overview' ? 'Customer overview will appear here.' : `${CUSTOMER_360_TABS.find((tab) => tab.id === activeTab)?.label} will appear here.`}
        </div>
      </section>
    </div>
  )
}
