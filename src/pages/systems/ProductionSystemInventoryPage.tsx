import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { productionSystemInventoryColumns } from '@/config/system-inventory-columns'
import { useAppStore } from '@/store/useAppStore'

export function ProductionSystemInventoryPage() {
  const navigate = useNavigate()
  const systems = useAppStore((state) => state.productionSystemInventory)
  const createSystem = useAppStore((state) => state.createProductionSystemInventoryItem)

  return (
    <div>
      <PageHeader
        title="Production System Inventory"
        subtitle="Available production systems only. Source = Production, Purpose = Delivery."
      />
      <DataDashboard
        title="Production System Inventory"
        dashboardScope="productionSystemInventory"
        rows={systems}
        columns={productionSystemInventoryColumns}
        toolbar={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={() => {
              const system = createSystem()
              navigate(`/systems/production-inventory/${system.sid}`)
            }}
          >
            + New Production System
          </button>
        }
        onRowClick={(row) => navigate(`/systems/production-inventory/${row.sid}`)}
      />
    </div>
  )
}
