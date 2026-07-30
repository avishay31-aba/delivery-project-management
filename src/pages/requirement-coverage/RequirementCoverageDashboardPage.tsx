import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { createRequirementCoverageColumns } from '@/config/requirement-coverage-columns'
import {
  requirementCoverageRows,
  requirementCoverageSummary,
  type RequirementCoverageSummary,
} from '@/domain/requirement-coverage'
import { routePathForBusinessReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'

const KPI_LABELS: Array<{ key: keyof RequirementCoverageSummary; label: string }> = [
  { key: 'totalRequirements', label: 'Total Requirements' },
  { key: 'covered', label: 'Covered' },
  { key: 'partiallyCovered', label: 'Partially Covered' },
  { key: 'uncovered', label: 'Uncovered' },
  { key: 'missingProject', label: 'Missing Project' },
  { key: 'missingSystem', label: 'Missing System' },
  { key: 'missingTenant', label: 'Missing Tenant' },
  { key: 'unknown', label: 'Unknown' },
  { key: 'blocked', label: 'Blocked' },
]

export function RequirementCoverageDashboardPage() {
  const navigate = useNavigate()
  const accounts = useAppStore((state) => state.accounts)
  const opportunities = useAppStore((state) => state.opportunities)
  const projects = useAppStore((state) => state.projects)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const projectTenants = useAppStore((state) => state.projectTenants)

  const rows = useMemo(
    () =>
      requirementCoverageRows({
        accounts,
        opportunities,
        projects,
        systems,
        tenants,
        warrantyRecords,
        projectSystems,
        projectTenants,
      }),
    [accounts, opportunities, projectSystems, projectTenants, projects, systems, tenants, warrantyRecords],
  )
  const summary = useMemo(() => requirementCoverageSummary(rows), [rows])
  const columns = useMemo(() => createRequirementCoverageColumns(), [])

  return (
    <WorkspaceFrame>
      <PageHeader title="Requirement Coverage" subtitle="End-to-end requirement delivery traceability" />

      <WorkspaceScrollContent className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-9">
        {KPI_LABELS.map((item) => (
          <div key={item.key} className="rounded border border-sf-border bg-white p-3">
            <div className="text-xs font-semibold uppercase text-sf-text-muted">{item.label}</div>
            <div className="mt-1 text-2xl font-semibold text-sf-text">{summary[item.key]}</div>
          </div>
        ))}
      </section>

      <DataDashboard
        title="Requirement coverage"
        dashboardScope="requirementCoverage"
        rows={rows}
        columns={columns}
        enableInlineEditing={false}
        onView={(row) => {
          const routePath =
            routePathForBusinessReference('PROJECT', row.pid) ??
            routePathForBusinessReference('OPPORTUNITY', row.opportunityId)
          if (routePath) navigate(routePath, { state: { mode: 'view' } })
        }}
        onEditRecord={(row) => {
          const routePath =
            routePathForBusinessReference('PROJECT', row.pid) ??
            routePathForBusinessReference('OPPORTUNITY', row.opportunityId)
          if (routePath) navigate(routePath, { state: { mode: 'edit' } })
        }}
      />
      </WorkspaceScrollContent>
    </WorkspaceFrame>
  )
}
