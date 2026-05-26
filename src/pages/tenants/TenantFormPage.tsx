import { useParams } from 'react-router-dom'
import { tenantsApi } from '@/api/tenants'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'

export function TenantFormPage() {
  const { tid } = useParams<{ tid: string }>()
  const tenant = tid ? tenantsApi.getByTid(tid) : undefined

  if (!tenant) {
    return (
      <PlaceholderCard
        title="Tenant not found"
        description={`No tenant with TID "${tid}" in mock store.`}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title={`Tenant ${tenant.tid}`}
        subtitle={`${tenant.tenantType} — form shell (Phase F)`}
      />
      <PlaceholderCard title="Tenant form">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-sf-text-muted">Account</dt>
            <dd className="font-medium">{tenant.accountName}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Country</dt>
            <dd className="font-medium">{tenant.country}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Warranty status</dt>
            <dd className="font-medium">{tenant.warrantyStatus}</dd>
          </div>
          <div>
            <dt className="text-sf-text-muted">Operational status</dt>
            <dd className="font-medium">{tenant.operationalStatus}</dd>
          </div>
        </dl>
      </PlaceholderCard>
    </div>
  )
}
