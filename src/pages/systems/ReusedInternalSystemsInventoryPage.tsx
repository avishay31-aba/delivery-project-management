import { useLocation, useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { reusedInternalSystemColumns } from '@/config/system-inventory-columns'
import { useAppStore } from '@/store/useAppStore'

export function ReusedInternalSystemsInventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const systems = useAppStore((state) => state.reusedInternalSystems)
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
        rows={systems}
        columns={reusedInternalSystemColumns}
        toolbar={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={() => {
              const system = createSystem()
              navigate(`/systems/reused-internal/${system.machineId}`, { state: { returnTo } })
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
        onRowClick={(row) => navigate(`/systems/reused-internal/${row.machineId}`, { state: { returnTo } })}
      />
    </div>
  )
}
