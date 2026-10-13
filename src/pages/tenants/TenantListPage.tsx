import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import { createTenantColumns } from '@/config/tenant-columns'
import { tenantReference } from '@/domain/business-reference'
import { TENANT_DASHBOARD_COLOR_LEGEND, isTenantRetainedDashboardVisible, tenantDashboardRowClassName } from '@/domain/tenant-operations'

export function TenantListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const tenants = useAppStore((s) => s.tenants)
  const dashboardTenants = tenants.filter(isTenantRetainedDashboardVisible)
  const systems = useAppStore((s) => s.systems)
  const projects = useAppStore((s) => s.projects)
  const projectTenants = useAppStore((s) => s.projectTenants)
  const opportunities = useAppStore((s) => s.opportunities)
  const accounts = useAppStore((s) => s.accounts)
  const updateTenant = useAppStore((s) => s.updateTenant)
  const tenantListColumns = createTenantColumns(systems, projects, projectTenants, opportunities, accounts)

  function editTenantDashboardCell(row: (typeof tenants)[number], columnId: string, value: string) {
    const column = tenantListColumns.find((col) => col.id === columnId)
    if (!column?.editKey) return
    updateTenant(row.id, { [column.editKey]: value } as never)
  }

  function viewTenant(row: (typeof tenants)[number]) {
    const routePath = tenantReference(row).routePath
    if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
  }

  function editTenant(row: (typeof tenants)[number]) {
    const routePath = tenantReference(row).routePath
    if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
  }

  return (
    <WorkspaceFrame className="gap-4">
      <WorkspaceDashboardContent>
        <DataDashboard
          title="Tenant Dashboard"
          dashboardScope="tenants"
          rows={dashboardTenants}
          columns={tenantListColumns}
          initialSorting={[{ id: 'tid', desc: true }]}
          getRowClassName={tenantDashboardRowClassName}
          colorLegend={TENANT_DASHBOARD_COLOR_LEGEND}
          onEdit={editTenantDashboardCell}
          onView={viewTenant}
          onEditRecord={editTenant}
          enableInlineEditing
        />
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
