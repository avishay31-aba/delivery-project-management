import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, Table2 } from 'lucide-react'
import { DataDashboard } from '@/components/dashboard'
import { InfrastructureMaintenanceCalendar } from '@/components/maintenance/InfrastructureMaintenanceCalendar'
import { PageHeader, WorkspaceFrame, WorkspaceTabs } from '@/components/record'
import { createInfrastructureColumns, createInfrastructureMaintenanceTaskColumns } from '@/config/infrastructure-columns'
import {
  INFRASTRUCTURE_CANCELLED_OPERATIONAL_STATUS,
  allSystemRecords,
  infrastructureDashboardRows,
  infrastructureMaintenanceDashboardRows,
} from '@/domain/infrastructure-item'
import { infrastructureItemReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'

type InfrastructureDashboardTab = 'allItems' | 'cancelledItems' | 'maintenance'

const INFRASTRUCTURE_DASHBOARD_TABS: Array<{ id: InfrastructureDashboardTab; label: string }> = [
  { id: 'allItems', label: 'Active Items' },
  { id: 'maintenance', label: 'Maintenance Tasks' },
  { id: 'cancelledItems', label: 'Cancelled Infrastructure Items' },
]

const INFRASTRUCTURE_DASHBOARD_TAB_DETAILS: Record<InfrastructureDashboardTab, { title: string; description: string }> = {
  allItems: {
    title: 'Active Infrastructure Items',
    description: 'Infrastructure Items supporting Systems, excluding cancelled lifecycle records.',
  },
  cancelledItems: {
    title: 'Cancelled Infrastructure Items',
    description: 'Infrastructure Items cancelled through the lifecycle workflow and retained for audit and restore.',
  },
  maintenance: {
    title: 'Maintenance Tasks',
    description: 'Infrastructure maintenance tasks across statuses.',
  },
}

function maintenanceRowClassName(row: { taskStatus: string }): string {
  if (row.taskStatus === 'Done') return 'bg-blue-50 hover:bg-blue-100'
  if (row.taskStatus === 'In Progress') return 'bg-orange-50 hover:bg-orange-100'
  return 'bg-emerald-50 hover:bg-emerald-100'
}

export function InfrastructureListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const [activeTab, setActiveTab] = useState<InfrastructureDashboardTab>('allItems')
  const [maintenanceViewMode, setMaintenanceViewMode] = useState<'table' | 'calendar'>('table')
  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const accounts = useAppStore((state) => state.accounts)
  const referenceData = useAppStore((state) => state.referenceData)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const tenants = useAppStore((state) => state.tenants)
  const rows = useMemo(
    () => infrastructureDashboardRows(infrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants),
    [infrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const activeRows = useMemo(
    () => rows.filter((row) => row.operationalStatus !== INFRASTRUCTURE_CANCELLED_OPERATIONAL_STATUS),
    [rows],
  )
  const cancelledRows = useMemo(
    () => rows.filter((row) => row.operationalStatus === INFRASTRUCTURE_CANCELLED_OPERATIONAL_STATUS),
    [rows],
  )
  const maintenanceRows = useMemo(
    () => infrastructureMaintenanceDashboardRows(infrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants, accounts),
    [accounts, infrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const columns = useMemo(() => createInfrastructureColumns(), [])
  const maintenanceColumns = useMemo(() => createInfrastructureMaintenanceTaskColumns(), [])
  const activeTabDetails = INFRASTRUCTURE_DASHBOARD_TAB_DETAILS[activeTab]

  const sortedMaintenanceRows = useMemo(
    () => [...maintenanceRows].sort((first, second) =>
      second.startDate.localeCompare(first.startDate) ||
      second.dueDate.localeCompare(first.dueDate) ||
      second.taskId.localeCompare(first.taskId, undefined, { numeric: true, sensitivity: 'base' }),
    ),
    [maintenanceRows],
  )

  return (
    <WorkspaceFrame className="gap-4">
      <WorkspaceTabs
        tabs={INFRASTRUCTURE_DASHBOARD_TABS}
        ariaLabel="Infrastructure Workspace views"
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as InfrastructureDashboardTab)}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <PageHeader title={activeTabDetails.title} subtitle={activeTabDetails.description} />
        </div>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
          {activeTab === 'allItems' ? (
            <DataDashboard
              title="Active Infrastructure Items"
              dashboardScope="infrastructure"
              rows={activeRows}
              columns={columns}
              initialSorting={[{ id: 'infrastructureId', desc: false }]}
              toolbar={
                <button
                  type="button"
                  className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                  onClick={() => {
                    navigate('/infrastructure/new', { state: { returnTo, mode: 'edit', newRecordSession: true } })
                  }}
                >
                  + Add Item
                </button>
              }
              onView={(row) => {
                const routePath = infrastructureItemReference(row).routePath
                if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
              }}
              onEditRecord={(row) => {
                const routePath = infrastructureItemReference(row).routePath
                if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
              }}
            />
          ) : null}
          {activeTab === 'cancelledItems' ? (
            <DataDashboard
              title="Cancelled Infrastructure Items"
              dashboardScope="cancelledInfrastructure"
              rows={cancelledRows}
              columns={columns}
              initialSorting={[{ id: 'infrastructureId', desc: false }]}
              onView={(row) => {
                const routePath = infrastructureItemReference(row).routePath
                if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
              }}
              onEditRecord={(row) => {
                const routePath = infrastructureItemReference(row).routePath
                if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
              }}
            />
          ) : null}
          {activeTab === 'maintenance' ? (
            <DataDashboard
              title="Maintenance Tasks"
              dashboardScope="infrastructurePlannedMaintenance"
              rows={sortedMaintenanceRows}
              columns={maintenanceColumns}
              initialSorting={[{ id: 'startDate', desc: true }]}
              getRowClassName={maintenanceRowClassName}
              contentModeControls={
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    className={maintenanceViewMode === 'table' ? 'rounded border border-sf-brand bg-sf-brand px-2 py-1 text-white' : 'rounded border border-sf-border bg-white px-2 py-1 text-sf-text hover:bg-sf-surface-alt'}
                    aria-label="Table view"
                    title="Table view"
                    onClick={() => setMaintenanceViewMode('table')}
                  >
                    <Table2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={maintenanceViewMode === 'calendar' ? 'rounded border border-sf-brand bg-sf-brand px-2 py-1 text-white' : 'rounded border border-sf-border bg-white px-2 py-1 text-sf-text hover:bg-sf-surface-alt'}
                    aria-label="Calendar view"
                    title="Calendar view"
                    onClick={() => setMaintenanceViewMode('calendar')}
                  >
                    <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              }
              renderAlternateContent={maintenanceViewMode === 'calendar'
                ? (filteredRows) => (
                    <InfrastructureMaintenanceCalendar
                      rows={filteredRows}
                      onOpenTask={(row) => navigate(`/infrastructure/${row.infrastructureItemId}`, { state: { returnTo, mode: 'view', focusSection: 'maintenance' } })}
                    />
                  )
                : undefined}
            />
          ) : null}
        </div>
      </div>
    </WorkspaceFrame>
  )
}
