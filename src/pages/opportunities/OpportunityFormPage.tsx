import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  getOpportunityMetadata,
  getVisibleRequirementTypes,
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
  type RequirementColumnMetadata,
} from '@/config/opportunity-metadata'
import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  StandardRenewalRequirement,
  Tenant,
} from '@/data/seed.types'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import {
  getAccountSystems,
  getAccountTenants,
  getHiddenRequirementTypesWithRows,
  resolveTenantSid,
  validateOpportunity,
} from '@/utils/opportunity-validation'

type RequirementGridKind = 'A' | 'B' | 'C'

const SUB_TYPE_OPTIONS: Record<OpportunityType, OpportunitySubType[]> = {
  POC: ['FREE', 'PAID'],
  DELIVERY: ['NEW', 'UPSELL'],
  RENEWAL: ['STANDARD', 'UPSELL', 'DOWN_SELL'],
}

const TOPIC_ANALYSES_OPTIONS = ['', 'YES', 'NO'] as const

function numberOrNull(value: string): number | null {
  if (!value.trim()) return null

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

function createBaseRequirement(requirementId: string): Omit<
  NewTenantRequirement,
  'deployTarget' | 'existingSystemId'
> {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId,
    hostingType: '',
    cloudPlatform: '',
    productType: 'Tangles',
    licenses: null,
    users: null,
    concurrentSearches: null,
    dailySearches: null,
    monthlySearches: null,
    concurrentAnalyses: null,
    dailyAnalyses: null,
    monthlyAnalyses: null,
    topicAnalyses: '',
    standardMonitors: null,
    fullMonitors: null,
  }
}

function createRequirementA(index: number): NewTenantRequirement {
  return {
    ...createBaseRequirement(`A-${String(index + 1).padStart(3, '0')}`),
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
  }
}

function createRequirementB(index: number, tenant?: Tenant): ChangeRequestRequirement {
  return {
    ...createBaseRequirement(`B-${String(index + 1).padStart(3, '0')}`),
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
  }
}

function createRequirementC(index: number, tenant?: Tenant): StandardRenewalRequirement {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId: `C-${String(index + 1).padStart(3, '0')}`,
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
    warrantyStatus: tenant?.warrantyStatus ?? 'NOT_SET',
    warrantyEndDate: tenant?.warrantyEndDate ?? null,
  }
}

function badgeClassName(level: 'error' | 'warning') {
  return level === 'error'
    ? 'border-red-200 bg-red-50 text-red-700'
    : 'border-amber-300 bg-amber-50 text-amber-900'
}

function RequirementGrid({
  title,
  kind,
  columns,
  opportunity,
  accountTenants,
  accountSystems,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
}: {
  title: string
  kind: RequirementGridKind
  columns: RequirementColumnMetadata[]
  opportunity: Opportunity
  accountTenants: Tenant[]
  accountSystems: ReturnType<typeof getAccountSystems>
  onAddRow: () => void
  onDeleteRow: (rowId: string) => void
  onUpdateRow: (rowId: string, key: string, value: string) => void
}) {
  const rows =
    kind === 'A'
      ? opportunity.newTenantRequirements
      : kind === 'B'
        ? opportunity.changeRequestRequirements
        : opportunity.standardRenewalRequirements

  function renderCell(row: (typeof rows)[number], column: RequirementColumnMetadata) {
    if (column.key === 'deployTarget' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      return (
        <select
          className="w-36 rounded border border-sf-border px-2 py-1"
          value={requirement.deployTarget}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="NEW_SYSTEM">New system</option>
          <option value="EXISTING_SID">Existing SID</option>
        </select>
      )
    }

    if (column.key === 'existingSystemId' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      return (
        <select
          className="w-40 rounded border border-sf-border px-2 py-1"
          disabled={requirement.deployTarget !== 'EXISTING_SID'}
          value={requirement.existingSystemId ?? ''}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="">Select SID</option>
          {accountSystems.map((system) => (
            <option key={system.id} value={system.id}>
              {system.sid} - {system.hostingType}
            </option>
          ))}
        </select>
      )
    }

    if (column.key === 'tenantId' && (kind === 'B' || kind === 'C')) {
      return (
        <select
          className="w-44 rounded border border-sf-border px-2 py-1"
          value={(row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="">Select tenant</option>
          {accountTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.tid} - {tenant.operationalStatus}
            </option>
          ))}
        </select>
      )
    }

    if (column.key === 'systemId' && (kind === 'B' || kind === 'C')) {
      const tenantId = (row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId
      return <span className="text-sf-text-muted">{resolveTenantSid(tenantId, accountTenants, accountSystems)}</span>
    }

    if (column.key === 'topicAnalyses') {
      return (
        <select
          className="w-28 rounded border border-sf-border px-2 py-1"
          value={textValue((row as unknown as Record<string, unknown>)[column.key])}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          {TOPIC_ANALYSES_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option || 'Not set'}
            </option>
          ))}
        </select>
      )
    }

    if (!column.editable) {
      return <span className="text-sf-text-muted">{textValue((row as unknown as Record<string, unknown>)[column.key])}</span>
    }

    return (
      <input
        className="w-32 rounded border border-sf-border px-2 py-1"
        value={textValue((row as unknown as Record<string, unknown>)[column.key])}
        onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
      />
    )
  }

  return (
    <section className="sf-card space-y-3 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-sf-text">{title}</h2>
          <p className="text-sm text-sf-text-muted">Editable tenant requirements from Excel section 3.</p>
        </div>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={onAddRow}>
          + Add row
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-sf-border text-sm">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-3 py-2 font-semibold text-sf-text">
                  {column.label}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sf-border bg-white">
            {rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 align-middle">
                    {renderCell(row, column)}
                  </td>
                ))}
                <td className="px-3 py-2 align-middle">
                  <button
                    type="button"
                    className="rounded border border-red-200 px-2 py-1 text-red-700 hover:bg-red-50"
                    onClick={() => onDeleteRow(row.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-4 text-sf-text-muted" colSpan={columns.length + 1}>
                  No rows yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function OpportunityFormPage() {
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const updateOpportunity = useAppStore((state) => state.updateOpportunity)
  const opportunity = opportunities.find((candidate) => candidate.opportunityId === opportunityId)

  const metadata = opportunity ? getOpportunityMetadata(opportunity.type, opportunity.subType) : null
  const visibleRequirementTypes = opportunity ? getVisibleRequirementTypes(opportunity.type, opportunity.subType) : []
  const account = opportunity ? accounts.find((candidate) => candidate.id === opportunity.accountId) : undefined
  const accountSystems = opportunity ? getAccountSystems(opportunity.accountId, systems) : []
  const accountTenants = opportunity ? getAccountTenants(opportunity.accountId, tenants) : []
  const hiddenRequirementTypes = opportunity ? getHiddenRequirementTypesWithRows(opportunity) : []
  const validationMessages = useMemo(
    () => (opportunity ? validateOpportunity(opportunity, { accounts, systems, tenants }) : []),
    [accounts, opportunity, systems, tenants],
  )

  if (!opportunity || !metadata) {
    return (
      <PlaceholderCard
        title="Opportunity not found"
        description={`No opportunity with Salesforce ID "${opportunityId}" in mock store.`}
      />
    )
  }

  const currentOpportunity = opportunity

  function patchOpportunity(patch: Partial<Opportunity>) {
    updateOpportunity(currentOpportunity.id, patch)
  }

  function updateAccount(accountId: string) {
    const nextAccount = accounts.find((candidate) => candidate.id === accountId)
    if (!nextAccount) return

    patchOpportunity({
      accountId: nextAccount.id,
      salesManagerId: nextAccount.salesManagerId,
      region: nextAccount.region,
      country: nextAccount.country,
      state: nextAccount.state,
      timeZone: nextAccount.timeZone,
      timeGroup: nextAccount.timeGroup,
    })
  }

  function updateType(type: OpportunityType) {
    const nextSubTypes = SUB_TYPE_OPTIONS[type]
    const nextSubType = nextSubTypes.includes(currentOpportunity.subType)
      ? currentOpportunity.subType
      : nextSubTypes[0]
    patchOpportunity({ type, subType: nextSubType })
  }

  function updateSubType(subType: OpportunitySubType) {
    patchOpportunity({ subType })
  }

  function addRequirement(kind: RequirementGridKind) {
    const firstTenant = accountTenants[0]

    if (kind === 'A') {
      patchOpportunity({
        newTenantRequirements: [
          ...currentOpportunity.newTenantRequirements,
          createRequirementA(currentOpportunity.newTenantRequirements.length),
        ],
      })
      return
    }

    if (kind === 'B') {
      patchOpportunity({
        changeRequestRequirements: [
          ...currentOpportunity.changeRequestRequirements,
          createRequirementB(currentOpportunity.changeRequestRequirements.length, firstTenant),
        ],
      })
      return
    }

    patchOpportunity({
      standardRenewalRequirements: [
        ...currentOpportunity.standardRenewalRequirements,
        createRequirementC(currentOpportunity.standardRenewalRequirements.length, firstTenant),
      ],
    })
  }

  function deleteRequirement(kind: RequirementGridKind, rowId: string) {
    if (kind === 'A') {
      patchOpportunity({
        newTenantRequirements: currentOpportunity.newTenantRequirements.filter((row) => row.id !== rowId),
      })
      return
    }

    if (kind === 'B') {
      patchOpportunity({
        changeRequestRequirements: currentOpportunity.changeRequestRequirements.filter((row) => row.id !== rowId),
      })
      return
    }

    patchOpportunity({
      standardRenewalRequirements: currentOpportunity.standardRenewalRequirements.filter((row) => row.id !== rowId),
    })
  }

  function normalizeRequirementValue(key: string, value: string): string | number | null {
    const numericKeys = new Set([
      'licenses',
      'users',
      'concurrentSearches',
      'dailySearches',
      'monthlySearches',
      'concurrentAnalyses',
      'dailyAnalyses',
      'monthlyAnalyses',
      'standardMonitors',
      'fullMonitors',
    ])

    return numericKeys.has(key) ? numberOrNull(value) : value
  }

  function updateRequirement(kind: RequirementGridKind, rowId: string, key: string, value: string) {
    if (kind === 'A') {
      const nextRows = currentOpportunity.newTenantRequirements.map((row) => {
        if (row.id !== rowId) return row
        const patch =
          key === 'deployTarget' && value === 'NEW_SYSTEM'
            ? { deployTarget: value, existingSystemId: null }
            : { [key]: value || null }

        return { ...row, ...patch } as NewTenantRequirement
      })
      patchOpportunity({ newTenantRequirements: nextRows })
      return
    }

    if (kind === 'B') {
      const selectedTenant = accountTenants.find((tenant) => tenant.id === value)
      const nextRows = currentOpportunity.changeRequestRequirements.map((row) =>
        row.id === rowId
          ? ({
              ...row,
              [key]: normalizeRequirementValue(key, value),
              ...(key === 'tenantId' && selectedTenant ? { systemId: selectedTenant.systemId } : {}),
            } as ChangeRequestRequirement)
          : row,
      )
      patchOpportunity({ changeRequestRequirements: nextRows })
      return
    }

    const selectedTenant = accountTenants.find((tenant) => tenant.id === value)
    const nextRows = currentOpportunity.standardRenewalRequirements.map((row) =>
      row.id === rowId
        ? ({
            ...row,
            [key]: normalizeRequirementValue(key, value),
            ...(key === 'tenantId' && selectedTenant
              ? {
                  systemId: selectedTenant.systemId,
                  warrantyStatus: selectedTenant.warrantyStatus,
                  warrantyEndDate: selectedTenant.warrantyEndDate,
                }
              : {}),
          } as StandardRenewalRequirement)
        : row,
    )
    patchOpportunity({ standardRenewalRequirements: nextRows })
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Opportunity ${opportunity.opportunityId}`}
        subtitle={`${metadata.sourceSheet} - ${visibleRequirementTypes.join('+') || 'No'} visible requirement grids`}
      />

      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sf-text">Opportunity header</h2>
            <p className="text-sm text-sf-text-muted">
              Excel section 2 metadata with Opportunity naming and Project status excluded.
            </p>
          </div>
          <span className="rounded-full border border-sf-border px-2 py-0.5 text-xs text-sf-text-muted">
            Account/End User: {account?.accountName ?? 'Not set'}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Salesforce Opportunity ID</span>
            <input
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.opportunityId}
              onChange={(event) => patchOpportunity({ opportunityId: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-medium text-sf-text-muted">Opportunity name</span>
            <input
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.opportunityName}
              onChange={(event) => patchOpportunity({ opportunityName: event.target.value })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Account</span>
            <select
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.accountId}
              onChange={(event) => updateAccount(event.target.value)}
            >
              {accounts.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.accountName}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Sales Manager / Deal Owner</span>
            <select
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.salesManagerId}
              onChange={(event) => patchOpportunity({ salesManagerId: event.target.value })}
            >
              {salesManagers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Stage</span>
            <select
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.stage}
              onChange={(event) => patchOpportunity({ stage: event.target.value as Opportunity['stage'] })}
            >
              <option value="OPEN">Open</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Opportunity Type</span>
            <select
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.type}
              onChange={(event) => updateType(event.target.value as OpportunityType)}
            >
              <option value="POC">POC</option>
              <option value="DELIVERY">Delivery</option>
              <option value="RENEWAL">Renewal</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Opportunity sub type</span>
            <select
              className="w-full rounded border border-sf-border px-2 py-1"
              value={opportunity.subType}
              onChange={(event) => updateSubType(event.target.value as OpportunitySubType)}
            >
              {SUB_TYPE_OPTIONS[opportunity.type].map((subType) => (
                <option key={subType} value={subType}>
                  {subType}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Delivery date</span>
            <input
              className="w-full rounded border border-sf-border px-2 py-1"
              type="date"
              value={opportunity.deliveryDate ?? ''}
              onChange={(event) => patchOpportunity({ deliveryDate: event.target.value || null })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">POC Start Date</span>
            <input
              className="w-full rounded border border-sf-border px-2 py-1"
              type="date"
              value={opportunity.pocStartDate ?? ''}
              onChange={(event) => patchOpportunity({ pocStartDate: event.target.value || null })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">POC End Date</span>
            <input
              className="w-full rounded border border-sf-border px-2 py-1"
              type="date"
              value={opportunity.pocEndDate ?? ''}
              onChange={(event) => patchOpportunity({ pocEndDate: event.target.value || null })}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Warranty/Service period (months)</span>
            <input
              className="w-full rounded border border-sf-border px-2 py-1"
              type="number"
              value={opportunity.warrantyServiceMonths ?? ''}
              onChange={(event) => patchOpportunity({ warrantyServiceMonths: numberOrNull(event.target.value) })}
            />
          </label>
          {(['region', 'country', 'state', 'timeZone', 'timeGroup'] as const).map((field) => (
            <label key={field} className="space-y-1 text-sm">
              <span className="font-medium text-sf-text-muted">{field}</span>
              <input className="w-full rounded border border-sf-border bg-sf-surface-alt px-2 py-1" value={opportunity[field]} readOnly />
            </label>
          ))}
        </div>
      </section>

      {hiddenRequirementTypes.length > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Hidden requirement rows are preserved for Grid {hiddenRequirementTypes.join(', ')}. Change the type/subtype
          back or manually delete irrelevant rows later.
        </div>
      ) : null}

      <section className="sf-card space-y-2 p-3">
        <h2 className="font-semibold text-sf-text">Validation</h2>
        {validationMessages.length === 0 ? (
          <p className="text-sm text-sf-text-muted">No validation messages.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {validationMessages.map((message, index) => (
              <span key={`${message.message}-${index}`} className={`rounded border px-2 py-1 text-sm ${badgeClassName(message.level)}`}>
                {message.message}
              </span>
            ))}
          </div>
        )}
      </section>

      {visibleRequirementTypes.includes('A') ? (
        <RequirementGrid
          title="Grid A - New tenant requirements"
          kind="A"
          columns={requirementAColumns}
          opportunity={opportunity}
          accountTenants={accountTenants}
          accountSystems={accountSystems}
          onAddRow={() => addRequirement('A')}
          onDeleteRow={(rowId) => deleteRequirement('A', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('A', rowId, key, value)}
        />
      ) : null}

      {visibleRequirementTypes.includes('B') ? (
        <RequirementGrid
          title="Grid B - Existing tenant change requests"
          kind="B"
          columns={requirementBColumns}
          opportunity={opportunity}
          accountTenants={accountTenants}
          accountSystems={accountSystems}
          onAddRow={() => addRequirement('B')}
          onDeleteRow={(rowId) => deleteRequirement('B', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('B', rowId, key, value)}
        />
      ) : null}

      {visibleRequirementTypes.includes('C') ? (
        <RequirementGrid
          title="Grid C - Standard renewal requirements"
          kind="C"
          columns={requirementCColumns}
          opportunity={opportunity}
          accountTenants={accountTenants}
          accountSystems={accountSystems}
          onAddRow={() => addRequirement('C')}
          onDeleteRow={(rowId) => deleteRequirement('C', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('C', rowId, key, value)}
        />
      ) : null}
    </div>
  )
}
