import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createRequirementCoverageColumns } from '@/config/requirement-coverage-columns'
import { requirementCoverageRows } from '@/domain/requirement-coverage'
import { useAppStore } from '@/store/useAppStore'

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
  const columns = useMemo(() => createRequirementCoverageColumns(), [])

  return (
    <div className="space-y-4">
      <PageHeader title="Requirement Coverage" subtitle="End-to-end requirement delivery traceability" />

      <DataDashboard
        title="Requirement coverage"
        dashboardScope="requirementCoverage"
        rows={rows}
        columns={columns}
        enableInlineEditing={false}
        onRowClick={(row) => {
          if (row.pid) navigate(`/projects/${row.pid}`)
          else if (row.opportunityId) navigate(`/opportunities/${row.opportunityId}`)
        }}
      />
    </div>
  )
}
