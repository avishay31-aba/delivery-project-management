import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createInfrastructureColumns } from '@/config/infrastructure-columns'
import { allSystemRecords, infrastructureDashboardRows } from '@/domain/infrastructure-item'
import { infrastructureItemReference } from '@/domain/business-reference'
import { useAppStore } from '@/store/useAppStore'

export function InfrastructureListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const referenceData = useAppStore((state) => state.referenceData)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const tenants = useAppStore((state) => state.tenants)
  const rows = useMemo(
    () => infrastructureDashboardRows(infrastructureItems, referenceData, allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), tenants),
    [infrastructureItems, productionSystemInventory, referenceData, reusedInternalSystems, systems, tenants],
  )
  const columns = useMemo(() => createInfrastructureColumns(), [])

  return (
    <div className="space-y-4">
      <PageHeader title="Infrastructure Dashboard" subtitle="Global Infrastructure Items supporting Systems" />
      <DataDashboard
        title="Infrastructure Items"
        dashboardScope="infrastructure"
        rows={rows}
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
    </div>
  )
}
