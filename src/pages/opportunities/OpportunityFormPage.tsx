import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  getOpportunityMetadata,
  getVisibleRequirementTypes,
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
  type OpportunityHeaderField,
  type RequirementColumnMetadata,
} from '@/config/opportunity-metadata'
import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  RequirementDeployTarget,
  StandardRenewalRequirement,
  System,
  Tenant,
  WarrantyRecord,
  YesNo,
} from '@/data/seed.types'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'
import { useAppStore } from '@/store/useAppStore'
import {
  getAccountTenants,
  getHiddenRequirementTypesWithRows,
  getOpportunityExistingSidSystems,
  resolveTenantSid,
  validateOpportunity,
} from '@/utils/opportunity-validation'

type RequirementGridKind = 'A' | 'B' | 'C'
type RequirementRow = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement

const SUB_TYPE_OPTIONS: Record<OpportunityType, OpportunitySubType[]> = {
  POC: ['FREE', 'PAID'],
  DELIVERY: ['NEW', 'UPSELL'],
  RENEWAL: ['STANDARD', 'UPSELL', 'DOWN_SELL'],
}

const HOSTING_OPTIONS = ['SaaS', 'On premise', 'Hybrid']
const CLOUD_PLATFORM_OPTIONS = ['Local', 'Azure', 'AWS', "Customer's VPC", 'Azure Gov']
const PRODUCT_OPTIONS = ['Tangles', 'Tangles Light', 'Weaver', 'Webloc', 'Trapdoor', 'Lynx', 'DataAPI']
const YES_NO_OPTIONS: YesNo[] = ['', 'YES', 'NO']
const CROSS_SYSTEM_OPTIONS = ['Weaver', 'Dark web', 'Lynx']
const AI_OPTIONS = ['Face Detection', 'OCR', 'Object Detection', 'Reverse Face', 'Landmark', 'Video Analysis', 'CoAnalyst']
const ADDITIONAL_FEATURE_OPTIONS = ['SSO', '2FA', 'Export to PDF', 'Enhanced Search', 'Post Translation']

function cloneOpportunity(opportunity: Opportunity): Opportunity {
  return JSON.parse(JSON.stringify(opportunity)) as Opportunity
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

function inputClassName(isChanged: boolean, extra = ''): string {
  return [
    'rounded border border-sf-border px-2 py-1',
    isChanged ? 'bg-yellow-100' : 'bg-white',
    extra,
  ].join(' ')
}

function readonlyClassName(isChanged: boolean): string {
  return inputClassName(isChanged, 'bg-sf-surface-alt')
}

function rowValue(row: RequirementRow, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key]
}

function createBaseRequirement(requirementId: string): Omit<
  NewTenantRequirement,
  'deployTarget' | 'existingSystemId'
> {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId,
    hostingType: 'SaaS',
    cloudPlatform: 'Azure',
    productType: 'Tangles',
    mapCenter: '',
    licenses: null,
    users: null,
    concurrentSearches: null,
    dailySearches: null,
    monthlySearches: null,
    concurrentAnalyses: null,
    dailyAnalyses: null,
    monthlyAnalyses: null,
    tanglesGo: 'NO',
    webloc: 'NO',
    webeye: 'NO',
    ingest: 'NO',
    blockchain: 'NO',
    crossSystemFeatures: [],
    apiEnabled: 'NO',
    apiDailyQty: null,
    apiMonthlyQty: null,
    aiFeatures: [],
    topicAnalyses: '',
    additionalFeatures: [],
    standardMonitors: null,
    fullMonitors: null,
  }
}

function createRequirementA(index: number, mapCenter = ''): NewTenantRequirement {
  return {
    ...createBaseRequirement(`A-${String(index + 1).padStart(3, '0')}`),
    mapCenter,
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
  }
}

function createRequirementB(index: number, tenant?: Tenant, mapCenter = ''): ChangeRequestRequirement {
  return {
    ...createBaseRequirement(`B-${String(index + 1).padStart(3, '0')}`),
    mapCenter,
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
  }
}

function createRequirementC(index: number, tenant?: Tenant, warrantyRecord?: WarrantyRecord): StandardRenewalRequirement {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId: `C-${String(index + 1).padStart(3, '0')}`,
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
    warrantyRecordId: warrantyRecord?.warrantyRecordId ?? '',
    warrantyStatus: warrantyRecord?.status ?? tenant?.warrantyStatus ?? 'NOT_SET',
    warrantyEndDate: warrantyRecord?.endDate ?? tenant?.warrantyEndDate ?? null,
  }
}

function findRequirement(saved: Opportunity, kind: RequirementGridKind, rowId: string): RequirementRow | undefined {
  if (kind === 'A') return saved.newTenantRequirements.find((row) => row.id === rowId)
  if (kind === 'B') return saved.changeRequestRequirements.find((row) => row.id === rowId)
  return saved.standardRenewalRequirements.find((row) => row.id === rowId)
}

function RequirementGrid({
  title,
  kind,
  columns,
  draft,
  saved,
  accountTenants,
  sidSystems,
  warrantyRecords,
  countryOptions,
  onAddRow,
  onDeleteRow,
  onUpdateRow,
}: {
  title: string
  kind: RequirementGridKind
  columns: RequirementColumnMetadata[]
  draft: Opportunity
  saved: Opportunity
  accountTenants: Tenant[]
  sidSystems: System[]
  warrantyRecords: WarrantyRecord[]
  countryOptions: string[]
  onAddRow: () => void
  onDeleteRow: (rowId: string) => void
  onUpdateRow: (rowId: string, key: string, value: string | string[] | number | null) => void
}) {
  const rows =
    kind === 'A'
      ? draft.newTenantRequirements
      : kind === 'B'
        ? draft.changeRequestRequirements
        : draft.standardRenewalRequirements
  const canUseExistingSystem = sidSystems.length > 0

  function cellChanged(row: RequirementRow, key: string): boolean {
    const savedRow = findRequirement(saved, kind, row.id)
    if (!savedRow) return true

    return !valuesEqual(rowValue(row, key), rowValue(savedRow, key))
  }

  function renderMultiSelect(row: RequirementRow, column: RequirementColumnMetadata, options: string[]) {
    const selected = Array.isArray(rowValue(row, column.key)) ? (rowValue(row, column.key) as string[]) : []
    const isChanged = cellChanged(row, column.key)

    return (
      <select
        multiple
        size={Math.min(options.length, 4)}
        className={inputClassName(isChanged, 'min-h-24 w-52 text-xs')}
        value={selected}
        onChange={(event) =>
          onUpdateRow(
            row.id,
            column.key,
            Array.from(event.currentTarget.selectedOptions).map((option) => option.value),
          )
        }
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  function renderCell(row: RequirementRow, column: RequirementColumnMetadata) {
    const isChanged = cellChanged(row, column.key)

    if (column.key === 'deployTarget' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      return (
        <select
          className={inputClassName(isChanged, 'h-8 w-36 text-xs')}
          value={requirement.deployTarget}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value as RequirementDeployTarget)}
        >
          <option value="NEW_SYSTEM">New System</option>
          {canUseExistingSystem ? <option value="EXISTING_SID">Existing System</option> : null}
        </select>
      )
    }

    if (column.key === 'existingSystemId' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      return (
        <select
          className={inputClassName(isChanged, 'h-8 w-44 text-xs')}
          disabled={requirement.deployTarget !== 'EXISTING_SID'}
          value={requirement.existingSystemId ?? ''}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value || null)}
        >
          <option value="">Select SID</option>
          {sidSystems.map((system) => (
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
          className={inputClassName(isChanged, 'h-8 w-48 text-xs')}
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
      return (
        <span className={isChanged ? 'bg-yellow-100 px-1 text-xs' : 'text-xs text-sf-text-muted'}>
          {resolveTenantSid(tenantId, accountTenants, sidSystems)}
        </span>
      )
    }

    if (column.key === 'warrantyRecordId' && kind === 'C') {
      const requirement = row as StandardRenewalRequirement
      const tenantWarrantyRecords = warrantyRecords.filter((record) => record.tenantId === requirement.tenantId)
      return (
        <select
          className={inputClassName(isChanged, 'h-8 w-52 text-xs')}
          value={requirement.warrantyRecordId}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="">Select warranty</option>
          {tenantWarrantyRecords.map((record) => (
            <option key={record.warrantyRecordId} value={record.warrantyRecordId}>
              {record.warrantyRecordId} - {record.status} - {record.endDate ?? 'No end'}
            </option>
          ))}
        </select>
      )
    }

    if (column.inputType === 'picklist') {
      const options =
        column.key === 'hostingType'
          ? HOSTING_OPTIONS
          : column.key === 'cloudPlatform'
            ? CLOUD_PLATFORM_OPTIONS
            : column.key === 'productType'
              ? PRODUCT_OPTIONS
              : column.key === 'mapCenter'
                ? [...countryOptions, 'Add new...']
                : YES_NO_OPTIONS

      return (
        <select
          className={inputClassName(isChanged, 'h-8 w-40 text-xs')}
          value={textValue(rowValue(row, column.key))}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option || 'Not set'}
            </option>
          ))}
        </select>
      )
    }

    if (column.inputType === 'multiselect') {
      const options =
        column.key === 'crossSystemFeatures'
          ? CROSS_SYSTEM_OPTIONS
          : column.key === 'aiFeatures'
            ? AI_OPTIONS
            : ADDITIONAL_FEATURE_OPTIONS
      return renderMultiSelect(row, column, options)
    }

    if (column.inputType === 'integer') {
      return (
        <input
          className={inputClassName(isChanged, 'h-8 w-28 text-xs')}
          type="number"
          step="1"
          value={textValue(rowValue(row, column.key))}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value === '' ? null : Number(event.target.value))}
        />
      )
    }

    if (!column.editable) {
      return (
        <span className={isChanged ? 'bg-yellow-100 px-1 text-xs' : 'text-xs text-sf-text-muted'}>
          {textValue(rowValue(row, column.key))}
        </span>
      )
    }

    return (
      <input
        className={inputClassName(isChanged, 'h-8 w-36 text-xs')}
        value={textValue(rowValue(row, column.key))}
        onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
      />
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-sf-text">{title}</h2>
          <p className="text-xs text-sf-text-muted">Each row represents one tenant requirement from Excel section 3.</p>
        </div>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={onAddRow}>
          + Add Tenant Requirement
        </button>
      </div>

      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-xs">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap border border-sf-border px-2 py-1 align-bottom font-semibold text-sf-text">
                  <span>{column.label}</span>
                  <span className="block text-[11px] font-normal text-sf-text-muted">{column.group}</span>
                </th>
              ))}
              <th className="border border-sf-border px-2 py-1" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-sf-surface-alt">
                {columns.map((column) => (
                  <td key={column.key} className="border border-sf-border px-2 py-1 align-top">
                    {renderCell(row, column)}
                  </td>
                ))}
                <td className="border border-sf-border px-2 py-1 align-top">
                  <button
                    type="button"
                    className="h-8 rounded border border-red-200 px-2 text-xs text-red-700 hover:bg-red-50"
                    onClick={() => onDeleteRow(row.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={columns.length + 1}>
                  No tenant requirements yet.
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
  const navigate = useNavigate()
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const updateOpportunity = useAppStore((state) => state.updateOpportunity)
  const savedOpportunity = opportunities.find((candidate) => candidate.opportunityId === opportunityId)
  const [draft, setDraft] = useState<Opportunity | null>(() => (savedOpportunity ? cloneOpportunity(savedOpportunity) : null))
  const [saveMessages, setSaveMessages] = useState<string[]>([])

  useEffect(() => {
    setDraft(savedOpportunity ? cloneOpportunity(savedOpportunity) : null)
    setSaveMessages([])
  }, [savedOpportunity])

  const metadata = draft ? getOpportunityMetadata(draft.type, draft.subType) : null
  const visibleRequirementTypes = draft ? getVisibleRequirementTypes(draft.type, draft.subType) : []
  const account = draft ? accounts.find((candidate) => candidate.id === draft.accountId) : undefined
  const sidSystems = draft ? getOpportunityExistingSidSystems(draft, accounts, systems) : []
  const accountTenants = draft ? getAccountTenants(draft.accountId, tenants) : []
  const hiddenRequirementTypes = draft ? getHiddenRequirementTypesWithRows(draft) : []
  const countryOptions = Array.from(new Set(accounts.map((candidate) => candidate.country).filter(Boolean))).sort()
  const isDirty = Boolean(savedOpportunity && draft && !valuesEqual(savedOpportunity, draft))

  if (!savedOpportunity || !draft || !metadata) {
    return (
      <PlaceholderCard
        title="Opportunity not found"
        description={`No opportunity with Salesforce ID "${opportunityId}" in mock store.`}
      />
    )
  }

  const currentDraft = draft
  const currentSavedOpportunity = savedOpportunity

  function patchDraft(patch: Partial<Opportunity>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setSaveMessages([])
  }

  function headerChanged(field: keyof Opportunity): boolean {
    return !valuesEqual(currentDraft[field], currentSavedOpportunity[field])
  }

  function updateAccount(accountId: string) {
    const nextAccount = accounts.find((candidate) => candidate.id === accountId)
    if (!nextAccount) return

    patchDraft({
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
    const nextSubType = nextSubTypes.includes(currentDraft.subType) ? currentDraft.subType : nextSubTypes[0]
    patchDraft({ type, subType: nextSubType })
  }

  function addRequirement(kind: RequirementGridKind) {
    const firstTenant = accountTenants[0]
    const firstWarranty = firstTenant
      ? warrantyRecords.find((record) => record.tenantId === firstTenant.id)
      : undefined

    if (kind === 'A') {
      patchDraft({
        newTenantRequirements: [
          ...currentDraft.newTenantRequirements,
          createRequirementA(currentDraft.newTenantRequirements.length, currentDraft.country),
        ],
      })
      return
    }

    if (kind === 'B') {
      patchDraft({
        changeRequestRequirements: [
          ...currentDraft.changeRequestRequirements,
          createRequirementB(currentDraft.changeRequestRequirements.length, firstTenant, currentDraft.country),
        ],
      })
      return
    }

    patchDraft({
      standardRenewalRequirements: [
        ...currentDraft.standardRenewalRequirements,
        createRequirementC(currentDraft.standardRenewalRequirements.length, firstTenant, firstWarranty),
      ],
    })
  }

  function deleteRequirement(kind: RequirementGridKind, rowId: string) {
    if (kind === 'A') {
      patchDraft({ newTenantRequirements: currentDraft.newTenantRequirements.filter((row) => row.id !== rowId) })
      return
    }

    if (kind === 'B') {
      patchDraft({ changeRequestRequirements: currentDraft.changeRequestRequirements.filter((row) => row.id !== rowId) })
      return
    }

    patchDraft({ standardRenewalRequirements: currentDraft.standardRenewalRequirements.filter((row) => row.id !== rowId) })
  }

  function updateRequirement(kind: RequirementGridKind, rowId: string, key: string, value: string | string[] | number | null) {
    if (kind === 'A') {
      const nextRows = currentDraft.newTenantRequirements.map((row) => {
        if (row.id !== rowId) return row
        const patch =
          key === 'deployTarget' && value === 'NEW_SYSTEM'
            ? { deployTarget: value, existingSystemId: null }
            : { [key]: value }
        return { ...row, ...patch } as NewTenantRequirement
      })
      patchDraft({ newTenantRequirements: nextRows })
      return
    }

    if (kind === 'B') {
      const selectedTenant = typeof value === 'string' ? accountTenants.find((tenant) => tenant.id === value) : undefined
      const nextRows = currentDraft.changeRequestRequirements.map((row) =>
        row.id === rowId
          ? ({
              ...row,
              [key]: value,
              ...(key === 'tenantId' && selectedTenant ? { systemId: selectedTenant.systemId } : {}),
            } as ChangeRequestRequirement)
          : row,
      )
      patchDraft({ changeRequestRequirements: nextRows })
      return
    }

    const selectedTenant = typeof value === 'string' ? accountTenants.find((tenant) => tenant.id === value) : undefined
    const selectedWarranty =
      key === 'warrantyRecordId' && typeof value === 'string'
        ? warrantyRecords.find((record) => record.warrantyRecordId === value)
        : undefined
    const nextRows = currentDraft.standardRenewalRequirements.map((row) =>
      row.id === rowId
        ? ({
            ...row,
            [key]: value,
            ...(key === 'tenantId' && selectedTenant
              ? {
                  systemId: selectedTenant.systemId,
                  warrantyRecordId:
                    warrantyRecords.find((record) => record.tenantId === selectedTenant.id)?.warrantyRecordId ?? '',
                  warrantyStatus: selectedTenant.warrantyStatus,
                  warrantyEndDate: selectedTenant.warrantyEndDate,
                }
              : {}),
            ...(selectedWarranty
              ? {
                  warrantyStatus: selectedWarranty.status,
                  warrantyEndDate: selectedWarranty.endDate,
                }
              : {}),
          } as StandardRenewalRequirement)
        : row,
    )
    patchDraft({ standardRenewalRequirements: nextRows })
  }

  function discardChanges() {
    setDraft(cloneOpportunity(currentSavedOpportunity))
    setSaveMessages([])
  }

  function saveChanges() {
    const messages = validateOpportunity(currentDraft, { accounts, systems, tenants })
      .filter((message) => message.level === 'error')
      .map((message) => message.message)

    if (messages.length > 0) {
      setSaveMessages(messages)
      return
    }

    updateOpportunity(currentSavedOpportunity.id, currentDraft)
    setSaveMessages([])

    if (currentDraft.opportunityId !== currentSavedOpportunity.opportunityId) {
      navigate(`/opportunities/${currentDraft.opportunityId}`)
    }
  }

  function renderHeaderField(field: OpportunityHeaderField) {
    if (field.key === 'type') {
      return (
        <label key={field.key} className="space-y-1 text-sm">
          <span className="font-medium text-sf-text-muted">{field.label}</span>
          <select
            className={inputClassName(headerChanged('type'), 'w-full')}
            value={currentDraft.type}
            onChange={(event) => updateType(event.target.value as OpportunityType)}
          >
            <option value="POC">POC</option>
            <option value="DELIVERY">Delivery</option>
            <option value="RENEWAL">Renewal</option>
          </select>
        </label>
      )
    }

    if (field.key === 'subType') {
      return (
        <label key={field.key} className="space-y-1 text-sm">
          <span className="font-medium text-sf-text-muted">{field.label}</span>
          <select
            className={inputClassName(headerChanged('subType'), 'w-full')}
            value={currentDraft.subType}
            onChange={(event) => patchDraft({ subType: event.target.value as OpportunitySubType })}
          >
            {SUB_TYPE_OPTIONS[currentDraft.type].map((subType) => (
              <option key={subType} value={subType}>
                {subType}
              </option>
            ))}
          </select>
        </label>
      )
    }

    if (field.key === 'accountId') {
      return (
        <label key={field.key} className="space-y-1 text-sm">
          <span className="font-medium text-sf-text-muted">{field.label}</span>
          <select
            className={inputClassName(headerChanged('accountId'), 'w-full')}
            value={currentDraft.accountId}
            onChange={(event) => updateAccount(event.target.value)}
          >
            {accounts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.accountName}
              </option>
            ))}
          </select>
        </label>
      )
    }

    if (field.key === 'salesManagerId') {
      return (
        <label key={field.key} className="space-y-1 text-sm">
          <span className="font-medium text-sf-text-muted">{field.label}</span>
          <select
            className={inputClassName(headerChanged('salesManagerId'), 'w-full')}
            value={currentDraft.salesManagerId}
            onChange={(event) => patchDraft({ salesManagerId: event.target.value })}
          >
            {salesManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </label>
      )
    }

    if (field.key === 'projectAlerts' || field.key === 'currentMilestone') {
      return null
    }

    const dateFields = new Set(['deliveryDate', 'pocStartDate', 'pocEndDate'])
    const isDate = dateFields.has(field.key)
    const isNumber = field.key === 'warrantyServiceMonths'
    const changed = headerChanged(field.key)

    return (
      <label key={field.key} className="space-y-1 text-sm">
        <span className="font-medium text-sf-text-muted">{field.label}</span>
        <input
          className={field.editable ? inputClassName(changed, 'w-full') : readonlyClassName(changed)}
          type={isDate ? 'date' : isNumber ? 'number' : 'text'}
          step={isNumber ? '1' : undefined}
          value={textValue(currentDraft[field.key])}
          readOnly={!field.editable}
          onChange={(event) =>
            patchDraft({
              [field.key]: isNumber
                ? event.target.value === ''
                  ? null
                  : Number(event.target.value)
                : event.target.value || (isDate ? null : ''),
            } as Partial<Opportunity>)
          }
        />
      </label>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Opportunity ${currentDraft.opportunityId}`}
        subtitle={`${metadata.sourceSheet} - ${visibleRequirementTypes.join('+') || 'No'} visible requirement grids`}
      />

      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-sf-border bg-white p-3 shadow-sm">
        <div className="text-sm text-sf-text-muted">
          {isDirty ? 'Unsaved changes are highlighted in yellow.' : 'No unsaved changes.'}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:text-sf-text-muted"
            disabled={!isDirty}
            onClick={discardChanges}
          >
            Cancel / Discard
          </button>
          <button type="button" className="rounded border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white" onClick={saveChanges}>
            Save
          </button>
        </div>
      </div>

      {saveMessages.length > 0 ? (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p className="font-semibold">Save blocked</p>
          <ul className="mt-1 list-inside list-disc">
            {saveMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-sf-text">Opportunity header</h2>
            <p className="text-sm text-sf-text-muted">Excel section 2 metadata with Opportunity naming and Project status excluded.</p>
          </div>
          <span className="rounded-full border border-sf-border px-2 py-0.5 text-xs text-sf-text-muted">
            Account/End User: {account?.accountName ?? 'Not set'}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {metadata.headerFields.map(renderHeaderField)}
          <label className="space-y-1 text-sm">
            <span className="font-medium text-sf-text-muted">Stage</span>
            <select
              className={inputClassName(headerChanged('stage'), 'w-full')}
              value={currentDraft.stage}
              onChange={(event) => patchDraft({ stage: event.target.value as Opportunity['stage'] })}
            >
              <option value="OPEN">Open</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>
          </label>
        </div>
      </section>

      {saveMessages.length > 0 && hiddenRequirementTypes.length > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Hidden requirement rows are preserved for Grid {hiddenRequirementTypes.join(', ')}. Change the type/subtype back
          or manually delete irrelevant rows later.
        </div>
      ) : null}

      {visibleRequirementTypes.includes('A') ? (
        <RequirementGrid
          title="Grid A: New Tenant Requirements"
          kind="A"
          columns={requirementAColumns}
          draft={currentDraft}
          saved={currentSavedOpportunity}
          accountTenants={accountTenants}
          sidSystems={sidSystems}
          warrantyRecords={warrantyRecords}
          countryOptions={countryOptions}
          onAddRow={() => addRequirement('A')}
          onDeleteRow={(rowId) => deleteRequirement('A', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('A', rowId, key, value)}
        />
      ) : null}

      {visibleRequirementTypes.includes('B') ? (
        <RequirementGrid
          title="Grid B: Change Request Requirements"
          kind="B"
          columns={requirementBColumns}
          draft={currentDraft}
          saved={currentSavedOpportunity}
          accountTenants={accountTenants}
          sidSystems={sidSystems}
          warrantyRecords={warrantyRecords}
          countryOptions={countryOptions}
          onAddRow={() => addRequirement('B')}
          onDeleteRow={(rowId) => deleteRequirement('B', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('B', rowId, key, value)}
        />
      ) : null}

      {visibleRequirementTypes.includes('C') ? (
        <RequirementGrid
          title="Grid C: Standard Renewal Requirements"
          kind="C"
          columns={requirementCColumns}
          draft={currentDraft}
          saved={currentSavedOpportunity}
          accountTenants={accountTenants}
          sidSystems={sidSystems}
          warrantyRecords={warrantyRecords}
          countryOptions={countryOptions}
          onAddRow={() => addRequirement('C')}
          onDeleteRow={(rowId) => deleteRequirement('C', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('C', rowId, key, value)}
        />
      ) : null}
    </div>
  )
}
