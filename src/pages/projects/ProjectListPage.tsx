import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { RotateCcw, Trash2, X } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { DashboardActionButton, DataDashboard } from '@/components/dashboard'
import { PageHeader, WorkspaceFrame, WorkspaceTabs } from '@/components/record'
import { createProjectListColumns } from '@/config/project-columns'
import { PROJECT_DASHBOARD_COLOR_LEGEND, projectListRowClassName } from '@/domain/project-lifecycle'
import { projectReference } from '@/domain/business-reference'
import { formMessageClassName } from '@/components/ui'
import type { Project } from '@/data/seed.types'

type ProjectDashboardTab = 'active' | 'deleted'

const PROJECT_DASHBOARD_TABS: Array<{ id: ProjectDashboardTab; label: string }> = [
  { id: 'active', label: 'Active Projects' },
  { id: 'deleted', label: 'Deleted Projects' },
]

const PROJECT_DASHBOARD_TAB_DETAILS: Record<ProjectDashboardTab, { title: string; description: string }> = {
  active: {
    title: 'Active Projects',
    description: 'Open and Done Projects currently active in delivery.',
  },
  deleted: {
    title: 'Deleted Projects',
    description: 'Soft-deleted Projects retained with lifecycle history and restore actions.',
  },
}

export function ProjectListPage() {
const navigate = useNavigate()
const location = useLocation()
const returnTo = `${location.pathname}${location.search}`
const [activeDashboardTab, setActiveDashboardTab] = useState<ProjectDashboardTab>('active')
const [projectPendingDelete, setProjectPendingDelete] = useState<Project | null>(null)
const [projectPendingRestore, setProjectPendingRestore] = useState<Project | null>(null)
const [deletionReason, setDeletionReason] = useState('')
const [messages, setMessages] = useState<string[]>([])
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
const deleteProject = useAppStore((s) => s.deleteProject)
const restoreProject = useAppStore((s) => s.restoreProject)
const activeProjectListColumns = useMemo(
  () => createProjectListColumns({ accounts, opportunities, salesManagers, systems, tenants, projectSystems, projectTenants }),
  [accounts, opportunities, projectSystems, projectTenants, salesManagers, systems, tenants],
)
const deletedProjectListColumns = useMemo(
  () => createProjectListColumns({ accounts, opportunities, salesManagers, systems, tenants, projectSystems, projectTenants, includeDeletionReason: true }),
  [accounts, opportunities, projectSystems, projectTenants, salesManagers, systems, tenants],
)
const activeProjects = useMemo(() => projects.filter((project) => !project.archivedAt && project.progressStatus !== 'DELETED'), [projects])
const deletedProjects = useMemo(() => projects.filter((project) => !project.archivedAt && project.progressStatus === 'DELETED'), [projects])
const displayedProjects = activeDashboardTab === 'active' ? activeProjects : deletedProjects
const projectListColumns = activeDashboardTab === 'active' ? activeProjectListColumns : deletedProjectListColumns
const activeTabDetails = PROJECT_DASHBOARD_TAB_DETAILS[activeDashboardTab]
const dashboardTitle = activeTabDetails.title
const dashboardScope = activeDashboardTab === 'active' ? 'projects' : 'deletedProjects'

function openDeleteDialog(project: Project) {
  setProjectPendingDelete(project)
  setDeletionReason('')
  setMessages([])
}

function closeDeleteDialog() {
  setProjectPendingDelete(null)
  setDeletionReason('')
}

function openRestoreDialog(project: Project) {
  setProjectPendingRestore(project)
  setMessages([])
}

function closeRestoreDialog() {
  setProjectPendingRestore(null)
}

function confirmDeleteProject() {
  if (!projectPendingDelete) return
  const reason = deletionReason.trim()
  if (!reason) {
    setMessages(['Deletion Reason is required.'])
    return
  }
  const deleted = deleteProject(projectPendingDelete.id, reason)
  if (!deleted) {
    setMessages(['Project was not found.'])
    return
  }
  closeDeleteDialog()
  setActiveDashboardTab('deleted')
  setMessages([`Project ${deleted.pid} status changed to Deleted.`])
}

function confirmRestoreProject() {
  if (!projectPendingRestore) return
  const restored = restoreProject(projectPendingRestore.id)
  if (!restored) {
    setMessages(['Project could not be restored.'])
    return
  }
  closeRestoreDialog()
  setActiveDashboardTab('active')
  setMessages([`Project ${restored.pid} restored with status ${restored.progressStatus === 'DONE' ? 'Done' : 'Open'}.`])
}

function renderDeleteDialog() {
  if (!projectPendingDelete) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="false" aria-labelledby="project-dashboard-delete-title">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="project-dashboard-delete-title" className="text-lg font-semibold">Delete project {projectPendingDelete.pid}</h2>
              <p className="text-sm text-sf-text-muted">The Project record remains available with Status = Deleted. Historical systems, tenants, warranties, links, and activity remain intact.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close delete dialog" onClick={closeDeleteDialog}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-sm font-semibold">Deletion Reason <span className="text-red-600">*</span></span>
          <textarea
            className="min-h-24 w-full resize-y rounded border border-sf-border px-2 py-1 text-sm"
            value={deletionReason}
            onChange={(event) => setDeletionReason(event.target.value)}
          />
        </label>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={closeDeleteDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!deletionReason.trim()}
            onClick={confirmDeleteProject}
          >
            Delete Project
          </button>
        </div>
      </div>
    </div>
  )
}

function renderRestoreDialog() {
  if (!projectPendingRestore) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="false" aria-labelledby="project-dashboard-restore-title">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="project-dashboard-restore-title" className="text-lg font-semibold">Restore project {projectPendingRestore.pid}</h2>
            <p className="text-sm text-sf-text-muted">The Project will return to Active Projects with its previous Open/Done lifecycle status.</p>
          </div>
          <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close restore dialog" onClick={closeRestoreDialog}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={closeRestoreDialog}>
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
            onClick={confirmRestoreProject}
          >
            Restore Project
          </button>
        </div>
      </div>
    </div>
  )
}

return (
<WorkspaceFrame className="gap-4">
  {renderDeleteDialog()}
  {renderRestoreDialog()}
  <WorkspaceTabs
    tabs={PROJECT_DASHBOARD_TABS}
    ariaLabel="Projects Workspace views"
    activeId={activeDashboardTab}
    onSelect={(id) => setActiveDashboardTab(id as ProjectDashboardTab)}
  />
  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <div className="shrink-0">
      <PageHeader title={activeTabDetails.title} subtitle={activeTabDetails.description} />
    </div>
    <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
      {messages.length > 0 ? (
        <div className={`mb-3 ${formMessageClassName(messages)}`}>
          {messages.map((message) => <div key={message}>{message}</div>)}
        </div>
      ) : null}
      <DataDashboard
        key={activeDashboardTab}
        title={dashboardTitle}
        dashboardScope={dashboardScope}
        rows={displayedProjects}
        columns={projectListColumns}
        enableInlineEditing={false}
        initialSorting={[{ id: 'deliveryDate', desc: true }]}
        colorLegend={PROJECT_DASHBOARD_COLOR_LEGEND}
        toolbar={activeDashboardTab === 'active' ? (
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
        ) : null}
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
        renderRecordActions={(row) => activeDashboardTab === 'active' ? (
          <DashboardActionButton
            icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
            label="Delete"
            tone="danger"
            onClick={() => openDeleteDialog(row)}
          />
        ) : (
          <DashboardActionButton
            icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
            label="Restore"
            onClick={() => openRestoreDialog(row)}
          />
        )}
      />
    </div>
  </div>
</WorkspaceFrame>
)
}
