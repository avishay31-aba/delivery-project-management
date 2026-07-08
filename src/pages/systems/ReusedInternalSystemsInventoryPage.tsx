import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { reusedInternalSystemColumns } from '@/config/system-inventory-columns'
import { useAppStore } from '@/store/useAppStore'
import { systemReference } from '@/domain/business-reference'

export function ReusedInternalSystemsInventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const systems = useAppStore((state) => state.reusedInternalSystems)
  const sortedSystems = useMemo(
    () => [...systems].sort((first, second) => String(second.machineId).localeCompare(String(first.machineId), undefined, { numeric: true })),
    [systems],
  )
  const createSystem = useAppStore((state) => state.createReusedInternalSystem)
  const updateSystem = useAppStore((state) => state.updateReusedInternalSystem)

  return (
    <div>
      <PageHeader
        title="Reused Internal Systems Inventory"
        subtitle="Reusable POC / Demo / Training / Support machines. Source = Reused Internal Systems."
      />
      <DataDashboard
        title="Reused Internal Systems Inventory"
        dashboardScope="reusedInternalSystems"
        rows={sortedSystems}
        columns={reusedInternalSystemColumns}
        toolbar={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={() => {
              const system = createSystem()
              const routePath = systemReference(system).routePath
              if (routePath) navigate(routePath, { state: { returnTo, mode: 'edit', newRecordSession: true } })
            }}
          >
            + New Reused Internal System
          </button>
        }
        enableInlineEditing={false}
        onEdit={(row, columnId, value) => {
          const column = reusedInternalSystemColumns.find((candidate) => candidate.id === columnId)
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
