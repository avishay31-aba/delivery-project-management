import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { PlaceholderCard, LinkId } from '@/components/ui'

export function TenantListPage() {
  const tenants = useAppStore((s) => s.tenants)

  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="Tenant list with warranty columns — full grid in Phase B"
      />

      <DataDashboard title="Tenant list" recordCount={tenants.length}>
        <PlaceholderCard title="Preview">
          <ul className="divide-y divide-sf-border text-sm">
            {tenants.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-2">
                <LinkId to={`/tenants/${t.tid}`}>{t.tid}</LinkId>
                <span className="text-sf-text-muted">{t.accountName}</span>
                <span className="text-xs">{t.warrantyStatus}</span>
              </li>
            ))}
          </ul>
        </PlaceholderCard>
      </DataDashboard>
    </div>
  )
}
