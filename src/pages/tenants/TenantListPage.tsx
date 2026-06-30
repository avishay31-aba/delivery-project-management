import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createTenantColumns } from '@/config/tenant-columns'
import { tenantReference } from '@/domain/business-reference'

export function TenantListPage() {
const navigate = useNavigate()
const location = useLocation()
const returnTo = `${location.pathname}${location.search}`
const tenants = useAppStore((s) => s.tenants)
const systems = useAppStore((s) => s.systems)
const updateTenant = useAppStore((s) => s.updateTenant)
const createTenant = useAppStore((s) => s.createTenant)
const tenantListColumns = createTenantColumns(systems)

return (
<div>
<PageHeader title="Tenants" subtitle="Tenant list with warranty columns" />

  <DataDashboard
    title="Tenant list"
    dashboardScope="tenants"
    rows={tenants}
    columns={tenantListColumns}
    toolbar={
      <button
        type="button"
        className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
        onClick={() => {
          const tenant = createTenant()
          const routePath = tenantReference(tenant).routePath
          if (routePath) navigate(routePath, { state: { returnTo } })
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
    onRowClick={(row) => {
      const routePath = tenantReference(row).routePath
      if (routePath) navigate(routePath, { state: { returnTo } })
    }}
  />
</div>
)
}
