import { useLocation, useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { productionSystemInventoryColumns } from '@/config/system-inventory-columns'
import { useAppStore } from '@/store/useAppStore'
import { systemReference } from '@/domain/business-reference'

export function ProductionSystemInventoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const systems = useAppStore((state) => state.productionSystemInventory)
  const sortedSystems = useMemo(
    () => [...systems].sort((first, second) => String(second.sid).localeCompare(String(first.sid), undefined, { numeric: true })),
    [systems],
  )
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
        rows={sortedSystems}
        columns={productionSystemInventoryColumns}
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
            + New Production System
          </button>
        }
        enableInlineEditing={false}
        onEdit={(row, columnId, value) => {
          const column = productionSystemInventoryColumns.find((candidate) => candidate.id === columnId)
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
