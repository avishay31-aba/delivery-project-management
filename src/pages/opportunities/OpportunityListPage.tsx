import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createOpportunityColumns } from '@/config/opportunity-columns'
import { useAppStore } from '@/store/useAppStore'

export function OpportunityListPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = `${location.pathname}${location.search}`
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const createOpportunity = useAppStore((state) => state.createOpportunity)
  const updateOpportunity = useAppStore((state) => state.updateOpportunity)
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
        enableInlineEditing={false}
        toolbar={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={() => {
              const opportunity = createOpportunity('DELIVERY', 'NEW')
              navigate(`/opportunities/${opportunity.opportunityId}`, { state: { returnTo } })
            }}
          >
            + New Opportunity
          </button>
        }
        getRowClassName={(row) =>
          row.stage === 'OPEN' ? 'bg-red-50 hover:bg-red-100' : ''
        }
        onEdit={(row, columnId, value) => {
          const column = columns.find((candidate) => candidate.id === columnId)
          if (!column?.editKey) return
          updateOpportunity(row.id, { [column.editKey]: value } as never)
        }}
        onRowClick={(row) => navigate(`/opportunities/${row.opportunityId}`, { state: { returnTo } })}
      />
    </div>
  )
}
