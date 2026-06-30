import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createWarrantyColumns } from '@/config/warranty-columns'
import type { Tenant } from '@/data/seed.types'
import {
  accountManagerDisplayName,
  customerDisplayName,
  customerTenantDisplayName,
} from '@/domain/customer-account'
import { systemIdentity } from '@/domain/system-inventory'
import {
  warrantyDashboardRows,
  warrantyDashboardSummary,
  type WarrantyDashboardSummary,
} from '@/domain/warranty-collection'
import { routePathForBusinessReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'

const KPI_LABELS: Array<{ key: keyof WarrantyDashboardSummary; label: string }> = [
  { key: 'totalWarranties', label: 'Total Warranties' },
  { key: 'underContract', label: 'Under Contract' },
  { key: 'outOfContract', label: 'Out Of Contract' },
  { key: 'expiring30', label: 'Expiring 30' },
  { key: 'expired', label: 'Expired' },
  { key: 'noWarranty', label: 'No Warranty' },
  { key: 'renewalCandidates', label: 'Renewal Candidates' },
]

export function WarrantyDashboardPage() {
  const navigate = useNavigate()
  const accounts = useAppStore((state) => state.accounts)
  const projects = useAppStore((state) => state.projects)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)

  const rows = useMemo(
    () =>
      warrantyDashboardRows({
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
  const summary = useMemo(() => warrantyDashboardSummary(rows), [rows])
  const columns = useMemo(() => createWarrantyColumns(), [])

  return (
    <div className="space-y-4">
      <PageHeader title="Warranty Dashboard" subtitle="Operational warranty work queue" />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {KPI_LABELS.map((item) => (
          <div key={item.key} className="rounded border border-sf-border bg-white p-3">
            <div className="text-xs font-semibold uppercase text-sf-text-muted">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold text-sf-text">{summary[item.key]}</div>
          </div>
        ))}
      </section>

      <DataDashboard
        title="Warranty work queue"
        dashboardScope="warranties"
        rows={rows}
        columns={columns}
        enableInlineEditing={false}
        onRowClick={(row) => {
          const routePath = routePathForBusinessReference('TENANT', row.tenantTid)
          if (routePath) navigate(routePath)
        }}
      />
    </div>
  )
}
