import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createOpportunityColumns } from '@/config/opportunity-columns'
import { useAppStore } from '@/store/useAppStore'

export function OpportunityListPage() {
  const navigate = useNavigate()
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const createOpportunity = useAppStore((state) => state.createOpportunity)
  const columns = useMemo(
    () => createOpportunityColumns(accounts, salesManagers, systems, tenants),
    [accounts, salesManagers, systems, tenants],
  )

  return (
    <div>
      <PageHeader title="Opportunities" subtitle="Salesforce opportunity intake and tenant requirements" />

      <DataDashboard
        title="Opportunity dashboard"
        dashboardScope="opportunities"
        rows={opportunities}
        columns={columns}
        toolbar={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={() => {
              const opportunity = createOpportunity()
              navigate(`/opportunities/${opportunity.opportunityId}`)
            }}
          >
            + New Opportunity
          </button>
        }
        getRowClassName={(row) =>
          row.stage === 'WON' ? 'bg-green-50 hover:bg-green-100' : 'bg-blue-50 hover:bg-blue-100'
        }
        onRowClick={(row) => navigate(`/opportunities/${row.opportunityId}`)}
      />
    </div>
  )
}
