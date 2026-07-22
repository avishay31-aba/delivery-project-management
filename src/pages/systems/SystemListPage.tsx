import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createAllocatedSystemColumns } from '@/config/system-inventory-columns'
import { ALLOCATED_SYSTEM_DASHBOARD_COLOR_LEGEND, allocatedSystemDashboardRows, systemDashboardRowClassName } from '@/domain/system-inventory'
import { systemReference } from '@/domain/business-reference'

export function SystemListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const systems = useAppStore((s) => s.systems)
  const projects = useAppStore((s) => s.projects)
  const tenants = useAppStore((s) => s.tenants)
  const projectSystems = useAppStore((s) => s.projectSystems)
  const updateSystem = useAppStore((s) => s.updateSystem)
  const allocatedSystems = allocatedSystemDashboardRows(systems, projectSystems)
  const systemListColumns = createAllocatedSystemColumns(projects, tenants)

  return (
    <div>
      <PageHeader title="Allocated Systems" subtitle="Allocated systems only. Production rows show SID; reused internal rows show SID plus MID." />

      <DataDashboard
        title="Allocated Systems"
        dashboardScope="systems"
        rows={allocatedSystems}
        columns={systemListColumns}
        getRowClassName={systemDashboardRowClassName}
        initialSorting={[{ id: 'sid', desc: true }]}
        colorLegend={ALLOCATED_SYSTEM_DASHBOARD_COLOR_LEGEND}
        onEdit={(row, columnId, value) => {
          const column = systemListColumns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateSystem(row.id, { [column.editKey]: value } as never)
        }}
        onView={(row) => {
          const routePath = systemReference(row).routePath
          if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
        }}
        onEditRecord={(row) => {
          const routePath = systemReference(row).routePath
          if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
        }}
      />
    </div>
  )
}
