import { useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import { createAllocatedSystemColumns, createCancelledSystemColumns } from '@/config/system-inventory-columns'
import { ALLOCATED_SYSTEM_DASHBOARD_COLOR_LEGEND, SYSTEM_OPERATIONAL_STATUS_CANCELED, allocatedSystemDashboardRows, systemDashboardRowClassName } from '@/domain/system-inventory'
import { systemReference } from '@/domain/business-reference'

interface SystemListPageProps {
  mode?: 'allocated' | 'cancelled'
}

export function SystemListPage({ mode = 'allocated' }: SystemListPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const systems = useAppStore((s) => s.systems)
  const productionSystemInventory = useAppStore((s) => s.productionSystemInventory)
  const reusedInternalSystems = useAppStore((s) => s.reusedInternalSystems)
  const projects = useAppStore((s) => s.projects)
  const tenants = useAppStore((s) => s.tenants)
  const projectSystems = useAppStore((s) => s.projectSystems)
  const updateSystem = useAppStore((s) => s.updateSystem)
  const allocatedSystemListColumns = createAllocatedSystemColumns(projects, tenants)
  const cancelledSystemListColumns = createCancelledSystemColumns(projects, projectSystems, tenants)
  const allocatedSystems = allocatedSystemDashboardRows(systems, projectSystems).filter((system) => system.operationalStatus !== SYSTEM_OPERATIONAL_STATUS_CANCELED)
  const cancelledSystems = [...systems, ...productionSystemInventory, ...reusedInternalSystems]
    .filter((system) => system.operationalStatus === SYSTEM_OPERATIONAL_STATUS_CANCELED)
    .sort((first, second) =>
      String(('sid' in second && second.sid) || ('machineId' in second && second.machineId) || second.id)
        .localeCompare(String(('sid' in first && first.sid) || ('machineId' in first && first.machineId) || first.id), undefined, { numeric: true }),
    )
  const title = mode === 'cancelled' ? 'Cancelled Systems' : 'Allocated Systems'

  return (
    <WorkspaceFrame>
      <PageHeader
        title={title}
        subtitle={mode === 'cancelled'
          ? 'Systems cancelled through the form lifecycle, retained for audit and restore.'
          : 'Allocated systems only. Production rows show SID; reused internal rows show SID plus MID.'}
      />

      <WorkspaceDashboardContent>
      {mode === 'cancelled' ? (
        <DataDashboard
          title={title}
          dashboardScope="cancelledSystems"
          rows={cancelledSystems}
          columns={cancelledSystemListColumns}
          getRowClassName={systemDashboardRowClassName}
          initialSorting={[{ id: 'systemIdentity', desc: true }]}
          onView={(row) => {
            const routePath = systemReference(row).routePath
            if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
          }}
          onEditRecord={(row) => {
            const routePath = systemReference(row).routePath
            if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
          }}
        />
      ) : (
        <DataDashboard
          title={title}
          dashboardScope="systems"
          rows={allocatedSystems}
          columns={allocatedSystemListColumns}
          getRowClassName={systemDashboardRowClassName}
          initialSorting={[{ id: 'sid', desc: true }]}
          colorLegend={ALLOCATED_SYSTEM_DASHBOARD_COLOR_LEGEND}
          onEdit={(row, columnId, value) => {
            const column = allocatedSystemListColumns.find((candidate) => candidate.id === columnId)
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
      )}
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
