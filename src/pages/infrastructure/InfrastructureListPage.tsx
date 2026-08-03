import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { InfrastructureMaintenanceCalendar } from '@/components/maintenance/InfrastructureMaintenanceCalendar'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent, WorkspaceTabs } from '@/components/record'
import { createInfrastructureColumns, createInfrastructureMaintenanceTaskColumns } from '@/config/infrastructure-columns'
import {
  allSystemRecords,
  currentInfrastructureMaintenanceDashboardRows,
  infrastructureDashboardRows,
  infrastructureMaintenanceDashboardRows,
  plannedInfrastructureMaintenanceDashboardRows,
} from '@/domain/infrastructure-item'
import { infrastructureItemReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'

type InfrastructureDashboardTab = 'allItems' | 'plannedMaintenance' | 'currentMaintenance'

const INFRASTRUCTURE_DASHBOARD_TABS: Array<{ id: InfrastructureDashboardTab; label: string }> = [
  { id: 'allItems', label: 'All Items' },
  { id: 'plannedMaintenance', label: 'Planned Maintenance Tasks' },
  { id: 'currentMaintenance', label: 'Current Maintenance Tasks' },
]

const INFRASTRUCTURE_DASHBOARD_TAB_DETAILS: Record<InfrastructureDashboardTab, { title: string; description: string }> = {
  allItems: {
    title: 'All Items',
    description: 'All Infrastructure Items supporting Systems.',
  },
  plannedMaintenance: {
    title: 'Planned Maintenance Tasks',
    description: 'Open Infrastructure maintenance tasks scheduled to start in the future.',
  },
  currentMaintenance: {
    title: 'Current Maintenance Tasks',
    description: 'Open Infrastructure maintenance tasks whose scheduled start date has been reached.',
  },
}

export function InfrastructureListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const [activeTab, setActiveTab] = useState<InfrastructureDashboardTab>('allItems')
  const [plannedViewMode, setPlannedViewMode] = useState<'list' | 'calendar'>('list')
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
  const maintenanceRows = useMemo(
    () => infrastructureMaintenanceDashboardRows(infrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants, accounts),
    [accounts, infrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const plannedMaintenanceRows = useMemo(() => plannedInfrastructureMaintenanceDashboardRows(maintenanceRows), [maintenanceRows])
  const currentMaintenanceRows = useMemo(() => currentInfrastructureMaintenanceDashboardRows(maintenanceRows), [maintenanceRows])
  const columns = useMemo(() => createInfrastructureColumns(), [])
  const plannedMaintenanceColumns = useMemo(() => createInfrastructureMaintenanceTaskColumns(), [])
  const currentMaintenanceColumns = useMemo(() => createInfrastructureMaintenanceTaskColumns({ includeDaysRunning: true }), [])
  const activeTabDetails = INFRASTRUCTURE_DASHBOARD_TAB_DETAILS[activeTab]

  return (
    <WorkspaceFrame className="gap-4">
      <WorkspaceTabs
        tabs={INFRASTRUCTURE_DASHBOARD_TABS}
        ariaLabel="Infrastructure Workspace views"
        activeId={activeTab}
        onSelect={(id) => setActiveTab(id as InfrastructureDashboardTab)}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <WorkspaceScrollContent>
          <PageHeader title={activeTabDetails.title} subtitle={activeTabDetails.description} />
          {activeTab === 'allItems' ? (
            <DataDashboard
              title="All Items"
              dashboardScope="infrastructure"
              rows={rows}
              columns={columns}
              initialSorting={[{ id: 'infrastructureId', desc: false }]}
              freezeThroughColumnId="identifier"
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
          {activeTab === 'plannedMaintenance' ? (
            <DataDashboard
              title="Planned Maintenance Tasks"
              dashboardScope="infrastructurePlannedMaintenance"
              rows={plannedMaintenanceRows}
              columns={plannedMaintenanceColumns}
              initialSorting={[
                { id: 'startDate', desc: false },
                { id: 'dueDate', desc: false },
                { id: 'infrastructureItemId', desc: false },
              ]}
              freezeThroughColumnId="infrastructureItemId"
              contentModeControls={
                <div className="inline-flex rounded border border-sf-border bg-white p-0.5 text-sm">
                  <button
                    type="button"
                    className={plannedViewMode === 'list' ? 'rounded bg-sf-brand px-3 py-1 text-white' : 'rounded px-3 py-1 text-sf-text hover:bg-sf-surface-alt'}
                    onClick={() => setPlannedViewMode('list')}
                  >
                    List
                  </button>
                  <button
                    type="button"
                    className={plannedViewMode === 'calendar' ? 'rounded bg-sf-brand px-3 py-1 text-white' : 'rounded px-3 py-1 text-sf-text hover:bg-sf-surface-alt'}
                    onClick={() => setPlannedViewMode('calendar')}
                  >
                    Calendar
                  </button>
                </div>
              }
              renderAlternateContent={plannedViewMode === 'calendar'
                ? (filteredRows) => (
                    <InfrastructureMaintenanceCalendar
                      rows={filteredRows}
                      onOpenTask={(row) => navigate(`/infrastructure/${row.infrastructureItemId}`, { state: { returnTo, mode: 'view', focusSection: 'maintenance' } })}
                    />
                  )
                : undefined}
            />
          ) : null}
          {activeTab === 'currentMaintenance' ? (
            <DataDashboard
              title="Current Maintenance Tasks"
              dashboardScope="infrastructureCurrentMaintenance"
              rows={currentMaintenanceRows}
              columns={currentMaintenanceColumns}
              initialSorting={[
                { id: 'startDate', desc: false },
                { id: 'dueDate', desc: false },
                { id: 'infrastructureItemId', desc: false },
              ]}
              freezeThroughColumnId="infrastructureItemId"
            />
          ) : null}
        </WorkspaceScrollContent>
      </div>
    </WorkspaceFrame>
  )
}
