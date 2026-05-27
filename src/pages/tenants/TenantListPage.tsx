import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { tenantListColumns } from '@/config/tenant-columns'

export function TenantListPage() {
const navigate = useNavigate()
const tenants = useAppStore((s) => s.tenants)
const updateTenant = useAppStore((s) => s.updateTenant)
const createTenant = useAppStore((s) => s.createTenant)

return (
<div>
<PageHeader title="Tenants" subtitle="Tenant list with warranty columns" />

  <DataDashboard
    title="Tenant list"
    rows={tenants}
    columns={tenantListColumns}
    toolbar={
      <button
        type="button"
        className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
        onClick={() => {
          const tenant = createTenant()
          navigate(`/tenants/${tenant.tid}`)
        }}
      >
        + New Tenant
      </button>
    }
    onEdit={(row, columnId, value) => {
      const column = tenantListColumns.find((col) => col.id === columnId)
      if (!column?.editKey) return
      updateTenant(row.id, { [column.editKey]: value } as never)
    }}
    onRowClick={(row) => navigate(`/tenants/${row.tid}`)}
  />
</div>
)
}