import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import { createCustomerColumns } from '@/config/customer-columns'
import { useAppStore } from '@/store/useAppStore'
import { accountReference } from '@/domain/business-reference'

export function CustomerListPage() {
  const navigate = useNavigate()
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const updateAccount = useAppStore((state) => state.updateAccount)
  const columns = createCustomerColumns(salesManagers, systems, tenants, warrantyRecords)

  return (
    <WorkspaceFrame>
      <PageHeader title="Customers" subtitle="Customer/account database for Opportunities, Systems, and Tenants" />

      <WorkspaceDashboardContent>
      <DataDashboard
        title="Customer list"
        dashboardScope="customers"
        rows={accounts}
        columns={columns}
        enableInlineEditing={false}
        onView={(row) => {
          const routePath = accountReference(row).routePath
          if (routePath) navigate(routePath, { state: { mode: 'view' } })
        }}
        onEditRecord={(row) => {
          const routePath = accountReference(row).routePath
          if (routePath) navigate(routePath, { state: { mode: 'edit' } })
        }}
        onEdit={(row, columnId, value) => {
          const column = columns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateAccount(row.id, { [column.editKey]: value } as never)
        }}
      />
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
