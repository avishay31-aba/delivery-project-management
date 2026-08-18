import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
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
  renewalCandidateSummary,
  type RenewalCandidateSummary,
} from '@/domain/warranty-collection'
import { routePathForBusinessReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'

const KPI_LABELS: Array<{ key: keyof RenewalCandidateSummary; label: string }> = [
  { key: 'totalCandidates', label: 'Total Candidates' },
  { key: 'expiring30', label: 'Expiring 30' },
  { key: 'expiring60', label: 'Expiring 60' },
  { key: 'expiring90', label: 'Expiring 90' },
  { key: 'expired', label: 'Expired' },
  { key: 'noWarranty', label: 'No Warranty' },
  { key: 'outOfContract', label: 'Out Of Contract' },
]

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
        projectSubTypeForProjectId: (projectId: string) => projects.find((candidate) => candidate.id === projectId)?.subType ?? '',
      }),
    [accounts, projects, salesManagers, systems, tenants],
  )
  const summary = useMemo(() => renewalCandidateSummary(rows), [rows])
  const columns = useMemo(() => createRenewalColumns(), [])

  return (
    <WorkspaceFrame>
      <PageHeader title="Renewal Work Queue" subtitle="Read-only renewal readiness and warranty risk queue" />

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <section className="grid shrink-0 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {KPI_LABELS.map((item) => (
          <div key={item.key} className="rounded border border-sf-border bg-white p-3">
            <div className="text-xs font-semibold uppercase text-sf-text-muted">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold text-sf-text">{summary[item.key]}</div>
          </div>
        ))}
      </section>

      <WorkspaceDashboardContent><DataDashboard
        title="Renewal candidates"
        dashboardScope="renewals"
        rows={rows}
        columns={columns}
        enableInlineEditing={false}
        onView={(row) => {
          const routePath = routePathForBusinessReference('TENANT', row.tenantTid)
          if (routePath) navigate(routePath, { state: { mode: 'view' } })
        }}
        onEditRecord={(row) => {
          const routePath = routePathForBusinessReference('TENANT', row.tenantTid)
          if (routePath) navigate(routePath, { state: { mode: 'edit' } })
        }}
      /></WorkspaceDashboardContent>
      </div>
    </WorkspaceFrame>
  )
}
