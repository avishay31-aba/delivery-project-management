import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { PlaceholderCard, LinkId } from '@/components/ui'

export function SystemListPage() {
  const systems = useAppStore((s) => s.systems)

  return (
    <div>
      <PageHeader
        title="Systems"
        subtitle="Customer and POC systems — list dashboard (Phase B)"
      />

      <DataDashboard title="System list" recordCount={systems.length}>
        <PlaceholderCard title="Preview">
          <ul className="divide-y divide-sf-border text-sm">
            {systems.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-2">
                {s.sid ? (
                  <LinkId to={`/systems/${s.sid}`}>{s.sid}</LinkId>
                ) : s.machineId ? (
                  <LinkId to={`/systems/${s.machineId}`}>
                    {`MID ${s.machineId}`}
                  </LinkId>
                ) : (
                  <span className="text-sf-text-muted">—</span>
                )}
                <span className="text-sf-text-muted">{s.systemClass}</span>
                <span className="text-xs">{s.purpose}</span>
              </li>
            ))}
          </ul>
        </PlaceholderCard>
      </DataDashboard>
    </div>
  )
}
