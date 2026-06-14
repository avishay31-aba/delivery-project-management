import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { productionSystemInventoryColumns } from '@/config/system-inventory-columns'
import { useAppStore } from '@/store/useAppStore'

export function ProductionSystemInventoryPage() {
  const navigate = useNavigate()
  const systems = useAppStore((state) => state.productionSystemInventory)
  const createSystem = useAppStore((state) => state.createProductionSystemInventoryItem)
  const updateSystem = useAppStore((state) => state.updateProductionSystemInventoryItem)

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
        enableInlineEditing={false}
        onEdit={(row, columnId, value) => {
          const column = productionSystemInventoryColumns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateSystem(row.id, { [column.editKey]: value } as never)
        }}
        onRowClick={(row) => navigate(`/systems/production-inventory/${row.sid}`)}
      />
    </div>
  )
}
