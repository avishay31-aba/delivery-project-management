import { useParams } from 'react-router-dom'
import { systemsApi } from '@/api/systems'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'

export function SystemFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const system =
    sid != null
      ? systemsApi.getBySid(sid) ?? systemsApi.getByMachineId(sid)
      : undefined

  if (!system) {
    return (
      <PlaceholderCard
        title="System not found"
        description={`No system with ID "${sid}" in mock store.`}
      />
    )
  }

  const displayId = system.sid ?? `MID ${system.machineId}`

  return (
    <div>
      <PageHeader
        title={`System ${displayId}`}
        subtitle={`${system.systemClass} — form shell (Phase E)`}
      />
      <PlaceholderCard title="System form">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-sf-text-muted">Product</dt>
            <dd className="font-medium">{system.productType}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Hosting</dt>
            <dd className="font-medium">{system.hostingType}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Purpose</dt>
            <dd className="font-medium">{system.purpose}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Time group</dt>
            <dd className="font-medium">{system.timeGroup}</dd>
          </div>
        </dl>
      </PlaceholderCard>
    </div>
  )
}
