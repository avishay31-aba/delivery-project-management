import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createRenewalColumns } from '@/config/renewal-columns'
import type { Tenant } from '@/data/seed.types'
import {
  accountManagerDisplayName,
  customerDisplayName,
  customerTenantDisplayName,
} from '@/domain/customer-account'
import { systemIdentity } from '@/domain/system-inventory'
import {
  renewalCandidateRows,
} from '@/domain/warranty-collection'
import { useAppStore } from '@/store/useAppStore'

export function RenewalWorkQueuePage() {
  const navigate = useNavigate()
  const accounts = useAppStore((state) => state.accounts)
  const projects = useAppStore((state) => state.projects)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)

  const rows = useMemo(
    () =>
      renewalCandidateRows({
        tenants,
        accountNameForTenant: (tenant: Tenant) => {
          const account = accounts.find((candidate) => candidate.id === tenant.accountId)
          return account ? customerDisplayName(account) : tenant.accountName
        },
        accountManagerForTenant: (tenant: Tenant) => {
          const account = accounts.find((candidate) => candidate.id === tenant.accountId)
          return accountManagerDisplayName(account?.salesManagerId, salesManagers)
        },
        tenantNameForTenant: customerTenantDisplayName,
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
  const columns = useMemo(() => createRenewalColumns(), [])

  return (
    <div className="space-y-4">
      <PageHeader title="Renewal Work Queue" subtitle="Read-only renewal readiness and warranty risk queue" />

      <DataDashboard
        title="Renewal candidates"
        dashboardScope="renewals"
        rows={rows}
        columns={columns}
        enableInlineEditing={false}
        onRowClick={(row) => navigate(`/tenants/${row.tenantTid}`)}
      />
    </div>
  )
}
