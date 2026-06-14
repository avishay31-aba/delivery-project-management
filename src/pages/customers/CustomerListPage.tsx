import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createCustomerColumns } from '@/config/customer-columns'
import { useAppStore } from '@/store/useAppStore'

export function CustomerListPage() {
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const updateAccount = useAppStore((state) => state.updateAccount)
  const columns = createCustomerColumns(salesManagers, systems, tenants, warrantyRecords)

  return (
    <div>
      <PageHeader title="Customers" subtitle="Customer/account database for Opportunities, Systems, and Tenants" />

      <DataDashboard
        title="Customer list"
        dashboardScope="customers"
        rows={accounts}
        columns={columns}
        enableInlineEditing={false}
        onEdit={(row, columnId, value) => {
          const column = columns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateAccount(row.id, { [column.editKey]: value } as never)
        }}
      />
    </div>
  )
}
