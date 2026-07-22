import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createProjectListColumns } from '@/config/project-columns'
import { PROJECT_DASHBOARD_COLOR_LEGEND, projectListRowClassName } from '@/domain/project-lifecycle'
import { projectReference } from '@/domain/business-reference'

export function ProjectListPage() {
const navigate = useNavigate()
const location = useLocation()
const returnTo = `${location.pathname}${location.search}`
const accounts = useAppStore((s) => s.accounts)
const opportunities = useAppStore((s) => s.opportunities)
const projects = useAppStore((s) => s.projects)
const salesManagers = useAppStore((s) => s.salesManagers)
const systems = useAppStore((s) => s.systems)
const tenants = useAppStore((s) => s.tenants)
const projectSystems = useAppStore((s) => s.projectSystems)
const projectTenants = useAppStore((s) => s.projectTenants)
const createProject = useAppStore((s) => s.createProject)
const updateProject = useAppStore((s) => s.updateProject)
const projectListColumns = useMemo(
  () => createProjectListColumns({ accounts, opportunities, salesManagers, systems, tenants, projectSystems, projectTenants }),
  [accounts, opportunities, projectSystems, projectTenants, salesManagers, systems, tenants],
)
const activeProjects = useMemo(() => projects.filter((project) => !project.archivedAt), [projects])

return (
<div>
<PageHeader title="Projects" subtitle="Delivery specialist desktop" />

  <DataDashboard
    title="Project list"
    dashboardScope="projects"
    rows={activeProjects}
    columns={projectListColumns}
    enableInlineEditing={false}
    initialSorting={[{ id: 'deliveryDate', desc: true }]}
    colorLegend={PROJECT_DASHBOARD_COLOR_LEGEND}
    toolbar={
      <button
        type="button"
        className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
        onClick={() => {
          const project = createProject()
          const routePath = projectReference(project).routePath
          if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit', newRecordSession: true } })
        }}
      >
        + New Project
      </button>
    }
    getRowClassName={projectListRowClassName}
    onEdit={(row, columnId, value) => {
      const column = projectListColumns.find((candidate) => candidate.id === columnId)
      if (!column?.editKey) return
      updateProject(row.id, { [column.editKey]: value } as never)
    }}
    onView={(row) => {
      const routePath = projectReference(row).routePath
      if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
    }}
    onEditRecord={(row) => {
      const routePath = projectReference(row).routePath
      if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
    }}
  />
</div>
)
}
