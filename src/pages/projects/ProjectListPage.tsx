import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { PlaceholderCard, LinkId } from '@/components/ui'

export function ProjectListPage() {
  const projects = useAppStore((s) => s.projects)

  return (
    <div>
      <PageHeader
        title="Projects"
        subtitle="Delivery specialist desktop — list dashboard (Phase B: TanStack Table + inline edit)"
      />

      <DataDashboard title="Project list" recordCount={projects.length}>
        <PlaceholderCard
          title="Preview"
          description="Seed data loaded from store. Full table coming in Phase B."
        >
          <ul className="divide-y divide-sf-border text-sm">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <LinkId to={`/projects/${p.pid}`}>{p.pid}</LinkId>
                <span className="text-sf-text-muted">{p.accountName}</span>
                <span className="text-xs text-sf-text-muted">
                  {p.mainType} / {p.subType}
                </span>
              </li>
            ))}
          </ul>
        </PlaceholderCard>
      </DataDashboard>
    </div>
  )
}
