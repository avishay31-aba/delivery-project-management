import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createProjectListColumns } from '@/config/project-columns'
import { projectListRowClassName } from '@/domain/project-lifecycle'

export function ProjectListPage() {
const navigate = useNavigate()
const projects = useAppStore((s) => s.projects)
const systems = useAppStore((s) => s.systems)
const tenants = useAppStore((s) => s.tenants)
const projectSystems = useAppStore((s) => s.projectSystems)
const projectTenants = useAppStore((s) => s.projectTenants)
const createProject = useAppStore((s) => s.createProject)
const updateProject = useAppStore((s) => s.updateProject)
const projectListColumns = useMemo(
  () => createProjectListColumns({ systems, tenants, projectSystems, projectTenants }),
  [projectSystems, projectTenants, systems, tenants],
)

return (
<div>
<PageHeader title="Projects" subtitle="Delivery specialist desktop" />

  <DataDashboard
    title="Project list"
    dashboardScope="projects"
    rows={projects}
    columns={projectListColumns}
    enableInlineEditing={false}
    toolbar={
      <button
        type="button"
        className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
        onClick={() => {
          const project = createProject()
          navigate(`/projects/${project.pid}`)
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
    onRowClick={(row) => navigate(`/projects/${row.pid}`)}
  />
</div>
)
}
