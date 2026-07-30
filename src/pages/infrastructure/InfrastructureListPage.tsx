import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
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

export function InfrastructureListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const [activeTab, setActiveTab] = useState<InfrastructureDashboardTab>('allItems')
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

  return (
    <WorkspaceFrame className="gap-4">
      <div className="shrink-0 border-b border-sf-border bg-sf-surface">
        <nav className="flex flex-wrap gap-2" aria-label="Infrastructure Workspace views">
          {INFRASTRUCTURE_DASHBOARD_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'rounded-t border border-b-0 px-3 py-2 text-sm font-medium',
                activeTab === tab.id
                  ? 'border-sf-border bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:border-sf-border hover:bg-white',
              ].join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <WorkspaceScrollContent>
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
