import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { projectListColumns } from '@/config/project-columns'

export function ProjectListPage() {
const navigate = useNavigate()
const projects = useAppStore((s) => s.projects)
const createProject = useAppStore((s) => s.createProject)

return (
<div>
<PageHeader title="Projects" subtitle="Delivery specialist desktop" />

  <DataDashboard
    title="Project list"
    rows={projects}
    columns={projectListColumns}
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
    getRowClassName={(row) =>
      row.progressStatus === 'DONE'
        ? 'bg-blue-50 hover:bg-blue-100'
        : 'bg-green-50 hover:bg-green-100'
    }
    onRowClick={(row) => navigate(`/projects/${row.pid}`)}
  />
</div>
)
}