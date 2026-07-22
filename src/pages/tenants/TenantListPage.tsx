import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createTenantColumns } from '@/config/tenant-columns'
import { tenantReference } from '@/domain/business-reference'
import { TENANT_DASHBOARD_COLOR_LEGEND, tenantDashboardRowClassName } from '@/domain/tenant-operations'

export function TenantListPage() {
const navigate = useNavigate()
const location = useLocation()
const returnTo = `${location.pathname}${location.search}`
const tenants = useAppStore((s) => s.tenants)
const systems = useAppStore((s) => s.systems)
const projects = useAppStore((s) => s.projects)
const projectTenants = useAppStore((s) => s.projectTenants)
const updateTenant = useAppStore((s) => s.updateTenant)
const createTenant = useAppStore((s) => s.createTenant)
const tenantListColumns = createTenantColumns(systems, projects, projectTenants)

return (
<div>
<PageHeader title="Tenants" subtitle="Tenant list with warranty columns" />

  <DataDashboard
    title="Tenant list"
    dashboardScope="tenants"
    rows={tenants}
    columns={tenantListColumns}
    initialSorting={[{ id: 'tid', desc: true }]}
    getRowClassName={tenantDashboardRowClassName}
    colorLegend={TENANT_DASHBOARD_COLOR_LEGEND}
    toolbar={
      <button
        type="button"
        className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
        onClick={() => {
          const tenant = createTenant()
          const routePath = tenantReference(tenant).routePath
          if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit', newRecordSession: true } })
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
    onView={(row) => {
      const routePath = tenantReference(row).routePath
      if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
    }}
    onEditRecord={(row) => {
      const routePath = tenantReference(row).routePath
      if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
    }}
  />
</div>
)
}
