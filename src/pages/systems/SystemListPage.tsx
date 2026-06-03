import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createSystemColumns } from '@/config/system-columns'

export function SystemListPage() {
const navigate = useNavigate()
const systems = useAppStore((s) => s.systems)
const accounts = useAppStore((s) => s.accounts)
const salesManagers = useAppStore((s) => s.salesManagers)
const tenants = useAppStore((s) => s.tenants)
const updateSystem = useAppStore((s) => s.updateSystem)
const createSystem = useAppStore((s) => s.createSystem)
const systemListColumns = createSystemColumns(accounts, salesManagers, tenants)

return (
<div>
<PageHeader title="Systems" subtitle="Customer and POC systems" />

  <DataDashboard
    title="System list"
    dashboardScope="systems"
    rows={systems}
    columns={systemListColumns}
    toolbar={
      <button
        type="button"
        className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
        onClick={() => {
          const system = createSystem()
          navigate(`/systems/${system.sid ?? system.machineId}`)
        }}
      >
        + New System
      </button>
    }
    onEdit={(row, columnId, value) => {
      const column = systemListColumns.find((col) => col.id === columnId)
      if (!column?.editKey) return
      updateSystem(row.id, { [column.editKey]: value } as never)
    }}
    onRowClick={(row) => navigate(`/systems/${row.sid ?? row.machineId}`)}
  />
</div>
)
}
