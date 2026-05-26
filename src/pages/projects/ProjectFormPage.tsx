import { useParams } from 'react-router-dom'
import { projectsApi } from '@/api/projects'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'

export function ProjectFormPage() {
  const { pid } = useParams<{ pid: string }>()
  const project = pid ? projectsApi.getByPid(pid) : undefined

  if (!project) {
    return (
      <PlaceholderCard
        title="Project not found"
        description={`No project with PID "${pid}" in mock store.`}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={`Project ${project.pid}`}
        subtitle={`${project.mainType} · ${project.subType} — form shell (Phase D)`}
      />
      <PlaceholderCard
        title="Project form"
        description="Sticky header, tabs, and grids will be implemented in later phases."
      >
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-sf-text-muted">Account</dt>
            <dd className="font-medium">{project.accountName}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Delivery date</dt>
            <dd className="font-medium">{project.deliveryDate ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Progress</dt>
            <dd className="font-medium">{project.progressStatus}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Opportunity</dt>
            <dd className="font-medium">{project.opportunityName}</dd>
          </div>
        </dl>
      </PlaceholderCard>
    </div>
  )
}
