import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataDashboard } from '@/components/dashboard'
import { PageHeader } from '@/components/record'
import { createOpportunityColumns } from '@/config/opportunity-columns'
import type { OpportunitySubType, OpportunityType } from '@/data/seed.types'
import { opportunitySubTypeOptions } from '@/domain/opportunity-lifecycle'
import { useAppStore } from '@/store/useAppStore'

export function OpportunityListPage() {
  const navigate = useNavigate()
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const createOpportunity = useAppStore((state) => state.createOpportunity)
  const updateOpportunity = useAppStore((state) => state.updateOpportunity)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newOpportunityType, setNewOpportunityType] = useState<OpportunityType>('POC')
  const [newOpportunitySubType, setNewOpportunitySubType] = useState<OpportunitySubType>('FREE')
  const columns = useMemo(
    () => createOpportunityColumns(accounts, salesManagers, systems, tenants),
    [accounts, salesManagers, systems, tenants],
  )

  return (
    <div>
      <PageHeader title="Opportunities" subtitle="Salesforce opportunity intake and tenant requirements" />

      {isCreateDialogOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md space-y-4 rounded border border-sf-border bg-white p-4 shadow-xl">
            <div>
              <h2 className="text-base font-semibold text-sf-text">New Opportunity</h2>
              <p className="text-sm text-sf-text-muted">Choose the Opportunity Type/Subtype before opening the form.</p>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-sf-text-muted">Opportunity Type</span>
              <select
                className="w-full rounded border border-sf-border px-2 py-1"
                value={newOpportunityType}
                onChange={(event) => {
                  const nextType = event.target.value as OpportunityType
                  setNewOpportunityType(nextType)
                  setNewOpportunitySubType(opportunitySubTypeOptions(nextType)[0])
                }}
              >
                <option value="POC">POC</option>
                <option value="DELIVERY">Delivery</option>
                <option value="RENEWAL">Renewal</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-sf-text-muted">Opportunity Subtype</span>
              <select
                className="w-full rounded border border-sf-border px-2 py-1"
                value={newOpportunitySubType}
                onChange={(event) => setNewOpportunitySubType(event.target.value as OpportunitySubType)}
              >
                {opportunitySubTypeOptions(newOpportunityType).map((subType) => (
                  <option key={subType} value={subType}>
                    {subType}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white"
                onClick={() => {
                  const opportunity = createOpportunity(newOpportunityType, newOpportunitySubType)
                  setIsCreateDialogOpen(false)
                  navigate(`/opportunities/${opportunity.opportunityId}`)
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
            onClick={() => setIsCreateDialogOpen(true)}
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
        onRowClick={(row) => navigate(`/opportunities/${row.opportunityId}`)}
      />
    </div>
  )
}
