import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, RotateCcw, Table2, Trash2, X } from 'lucide-react'
import { DashboardActionButton, DataDashboard } from '@/components/dashboard'
import { InfrastructureMaintenanceCalendar } from '@/components/maintenance/InfrastructureMaintenanceCalendar'
import { PageHeader, WorkspaceFrame, WorkspaceTabs } from '@/components/record'
import { createInfrastructureColumns, createInfrastructureMaintenanceTaskColumns } from '@/config/infrastructure-columns'
import {
  INFRASTRUCTURE_DELETED_OPERATIONAL_STATUS,
  allSystemRecords,
  infrastructureDashboardRows,
  infrastructureMaintenanceDashboardRows,
  type InfrastructureDashboardRow,
} from '@/domain/infrastructure-item'
import { infrastructureItemReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'
import { RichTextEditor, formMessageClassName } from '@/components/ui'
import { richTextIsEmpty } from '@/domain/rich-text'

type InfrastructureDashboardTab = 'allItems' | 'deletedItems' | 'maintenance'

const INFRASTRUCTURE_DASHBOARD_TABS: Array<{ id: InfrastructureDashboardTab; label: string }> = [
  { id: 'allItems', label: 'All Items' },
  { id: 'maintenance', label: 'Maintenance Tasks' },
  { id: 'deletedItems', label: 'Deleted Items' },
]

const INFRASTRUCTURE_DASHBOARD_TAB_DETAILS: Record<InfrastructureDashboardTab, { title: string; description: string }> = {
  allItems: {
    title: 'All Items',
    description: 'All Infrastructure Items supporting Systems.',
  },
  deletedItems: {
    title: 'Deleted Items',
    description: 'Recoverable Infrastructure Items retained with lifecycle history and restore actions.',
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
  const [itemPendingDelete, setItemPendingDelete] = useState<InfrastructureDashboardRow | null>(null)
  const [itemPendingRestore, setItemPendingRestore] = useState<InfrastructureDashboardRow | null>(null)
  const [deletionReason, setDeletionReason] = useState('')
  const [messages, setMessages] = useState<string[]>([])
  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const accounts = useAppStore((state) => state.accounts)
  const referenceData = useAppStore((state) => state.referenceData)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const tenants = useAppStore((state) => state.tenants)
  const deleteInfrastructureItem = useAppStore((state) => state.deleteInfrastructureItem)
  const restoreInfrastructureItem = useAppStore((state) => state.restoreInfrastructureItem)
  const activeInfrastructureItems = useMemo(
    () => infrastructureItems.filter((item) => item.operationalStatus !== INFRASTRUCTURE_DELETED_OPERATIONAL_STATUS),
    [infrastructureItems],
  )
  const deletedInfrastructureItems = useMemo(
    () => infrastructureItems.filter((item) => item.operationalStatus === INFRASTRUCTURE_DELETED_OPERATIONAL_STATUS),
    [infrastructureItems],
  )
  const rows = useMemo(
    () => infrastructureDashboardRows(activeInfrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants),
    [activeInfrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const deletedRows = useMemo(
    () => infrastructureDashboardRows(deletedInfrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants),
    [deletedInfrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const maintenanceRows = useMemo(
    () => infrastructureMaintenanceDashboardRows(activeInfrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants, accounts),
    [accounts, activeInfrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const columns = useMemo(() => createInfrastructureColumns(), [])
  const deletedColumns = useMemo(() => createInfrastructureColumns({ includeDeletionReason: true }), [])
  const maintenanceColumns = useMemo(() => createInfrastructureMaintenanceTaskColumns(), [])
  const activeTabDetails = INFRASTRUCTURE_DASHBOARD_TAB_DETAILS[activeTab]

  function openDeleteDialog(item: InfrastructureDashboardRow) {
    setItemPendingDelete(item)
    setDeletionReason('')
    setMessages([])
  }

  function closeDeleteDialog() {
    setItemPendingDelete(null)
    setDeletionReason('')
  }

  function openRestoreDialog(item: InfrastructureDashboardRow) {
    setItemPendingRestore(item)
    setMessages([])
  }

  function closeRestoreDialog() {
    setItemPendingRestore(null)
  }

  function confirmDeleteItem() {
    if (!itemPendingDelete) return
    if (richTextIsEmpty(deletionReason)) {
      setMessages(['Deletion Reason is required.'])
      return
    }
    const result = deleteInfrastructureItem(itemPendingDelete.id, deletionReason)
    if (!result.ok || !result.record) {
      setMessages([result.message])
      return
    }
    closeDeleteDialog()
    setActiveTab('deletedItems')
    setMessages([`Infrastructure Item ${result.record.infrastructureId} status changed to Deleted.`])
  }

  function confirmRestoreItem() {
    if (!itemPendingRestore) return
    const result = restoreInfrastructureItem(itemPendingRestore.id)
    if (!result.ok || !result.record) {
      setMessages([result.message])
      return
    }
    closeRestoreDialog()
    setActiveTab('allItems')
    setMessages([`Infrastructure Item ${result.record.infrastructureId} restored with Operational Status ${result.record.operationalStatus}.`])
  }

  function renderDeleteDialog() {
    if (!itemPendingDelete) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="false" aria-labelledby="infrastructure-dashboard-delete-title">
          <div className="mb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="infrastructure-dashboard-delete-title" className="text-lg font-semibold">Delete item {itemPendingDelete.infrastructureId}</h2>
                <p className="text-sm text-sf-text-muted">The Infrastructure Item remains available with Operational Status = Deleted. Relationships, history, maintenance, warranties, remarks, documents, and activity remain intact.</p>
              </div>
              <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close delete dialog" onClick={closeDeleteDialog}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-sm font-semibold">Deletion Reason <span className="text-red-600">*</span></span>
            <RichTextEditor value={deletionReason} onChange={setDeletionReason} minHeightClassName="min-h-24" />
          </label>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={closeDeleteDialog}>Cancel</button>
            <button
              type="button"
              className="rounded bg-red-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={richTextIsEmpty(deletionReason)}
              onClick={confirmDeleteItem}
            >
              Delete Item
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderRestoreDialog() {
    if (!itemPendingRestore) return null
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="false" aria-labelledby="infrastructure-dashboard-restore-title">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 id="infrastructure-dashboard-restore-title" className="text-lg font-semibold">Restore item {itemPendingRestore.infrastructureId}</h2>
              <p className="text-sm text-sf-text-muted">The Infrastructure Item will return to All Items with its previous Operational Status.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close restore dialog" onClick={closeRestoreDialog}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={closeRestoreDialog}>Cancel</button>
            <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={confirmRestoreItem}>
              Restore Item
            </button>
          </div>
        </div>
      </div>
    )
  }
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
      {renderDeleteDialog()}
      {renderRestoreDialog()}
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
          {messages.length > 0 ? (
            <div className={`mb-3 ${formMessageClassName(messages)}`}>
              {messages.map((message) => <div key={message}>{message}</div>)}
            </div>
          ) : null}
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
              renderRecordActions={(row) => (
                <DashboardActionButton
                  icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
                  label="Delete"
                  tone="danger"
                  onClick={() => openDeleteDialog(row)}
                />
              )}
            />
          ) : null}
          {activeTab === 'deletedItems' ? (
            <DataDashboard
              title="Deleted Items"
              dashboardScope="deletedInfrastructure"
              rows={deletedRows}
              columns={deletedColumns}
              initialSorting={[{ id: 'infrastructureId', desc: false }]}
              freezeThroughColumnId="identifier"
              onView={(row) => {
                const routePath = infrastructureItemReference(row).routePath
                if (routePath) navigate(routePath, { state: { returnTo, mode: 'view' } })
              }}
              onEditRecord={(row) => {
                const routePath = infrastructureItemReference(row).routePath
                if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit' } })
              }}
              renderRecordActions={(row) => (
                <DashboardActionButton
                  icon={<RotateCcw className="h-4 w-4" aria-hidden="true" />}
                  label="Restore"
                  onClick={() => openRestoreDialog(row)}
                />
              )}
            />
          ) : null}
          {activeTab === 'maintenance' ? (
            <DataDashboard
              title="Maintenance Tasks"
              dashboardScope="infrastructurePlannedMaintenance"
              rows={sortedMaintenanceRows}
              columns={maintenanceColumns}
              initialSorting={[{ id: 'startDate', desc: true }]}
              freezeThroughColumnId="infrastructureItemId"
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
