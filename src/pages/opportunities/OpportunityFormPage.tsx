import { type KeyboardEvent, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import { FormField, PlaceholderCard } from '@/components/ui'
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
type OpportunityDetailTab = 'requirements' | 'project'
type ActiveMultiSelect = { id: string; left: number; top: number; width: number }

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
  const clone = JSON.parse(JSON.stringify(opportunity)) as Opportunity
  return {
    ...clone,
    warrantyRecordId: clone.warrantyRecordId ?? clone.standardRenewalRequirements[0]?.warrantyRecordId ?? '',
  }
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

function inputClassName(isChanged: boolean, extra = ''): string {
  return [
    'rounded border border-sf-border px-2 py-1 leading-tight',
    isChanged ? 'bg-yellow-100' : 'bg-white',
    extra,
  ].join(' ')
}

function fieldClassName(isChanged: boolean, isMissing: boolean, extra = ''): string {
  return [
    inputClassName(isChanged, extra),
    isMissing ? 'border-red-500 ring-1 ring-red-500' : '',
  ].join(' ')
}

function rowValue(row: RequirementRow, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key]
}

function moduleQuantityLabel(key: string): string | null {
  const labels: Record<string, string> = {
    topicAnalyses: 'Topic Analysis',
    tangles: 'Tangles',
    tanglesGo: 'Tangles Go',
    webloc: 'Webloc',
    webeye: 'Webeye',
    ingest: 'Ingest',
    standardMonitors: 'Std. Monitors',
    fullMonitors: 'Full Monitors',
    topicMonitors: 'Topic Monitors',
  }
  return labels[key] ?? null
}

function digitString(value: unknown): string {
  return value == null ? '' : String(value).replace(/\D/g, '')
}

function parseDigitValue(value: string): number | null {
  return value === '' ? null : Number(value)
}

function numericOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function preventNonDigitKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  if (!/^\d$/.test(event.key)) event.preventDefault()
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
    topicAnalyses: null,
    dailyAnalyses: null,
    monthlyAnalyses: null,
    tangles: null,
    tanglesGo: null,
    webloc: null,
    webeye: null,
    ingest: null,
    blockchain: '',
    crossSystemFeatures: [],
    apiEnabled: '',
    apiDailyQty: null,
    apiMonthlyQty: null,
    aiFeatures: [],
    additionalFeatures: [],
    standardMonitors: null,
    fullMonitors: null,
    topicMonitors: null,
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

function tenantConfigurationPatch(tenant?: Tenant): Partial<NewTenantRequirement> {
  if (!tenant) return {}

  return {
    hostingType: tenant.hostingType ?? 'SaaS',
    cloudPlatform: tenant.cloudPlatform ?? 'Azure',
    productType: tenant.productType,
    mapCenter: tenant.mapCenter ?? tenant.country,
    licenses: numericOrNull(tenant.licenses),
    users: numericOrNull(tenant.users),
    concurrentSearches: numericOrNull(tenant.concurrentSearches),
    dailySearches: numericOrNull(tenant.dailySearches),
    monthlySearches: numericOrNull(tenant.monthlySearches),
    concurrentAnalyses: numericOrNull(tenant.concurrentAnalyses),
    topicAnalyses: numericOrNull(tenant.topicAnalyses),
    dailyAnalyses: numericOrNull(tenant.dailyAnalyses),
    monthlyAnalyses: numericOrNull(tenant.monthlyAnalyses),
    tangles: numericOrNull(tenant.tangles),
    tanglesGo: numericOrNull(tenant.tanglesGo),
    webloc: numericOrNull(tenant.webloc),
    webeye: numericOrNull(tenant.webeye),
    ingest: numericOrNull(tenant.ingest),
    blockchain: tenant.blockchain ?? '',
    crossSystemFeatures: tenant.crossSystemFeatures ?? [],
    apiEnabled: tenant.apiEnabled ?? '',
    apiDailyQty: numericOrNull(tenant.apiDailyQty),
    apiMonthlyQty: numericOrNull(tenant.apiMonthlyQty),
    aiFeatures: tenant.aiFeatures ?? [],
    additionalFeatures: tenant.additionalFeatures ?? [],
    standardMonitors: numericOrNull(tenant.standardMonitors),
    fullMonitors: numericOrNull(tenant.fullMonitors),
    topicMonitors: numericOrNull(tenant.topicMonitors),
  }
}

function createRequirementB(index: number, tenant?: Tenant, mapCenter = ''): ChangeRequestRequirement {
  return {
    ...createBaseRequirement(`B-${String(index + 1).padStart(3, '0')}`),
    mapCenter,
    ...tenantConfigurationPatch(tenant),
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
  }
}

function createRequirementC(index: number, tenant?: Tenant, warrantyRecord?: WarrantyRecord): StandardRenewalRequirement {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId: `C-${String(index + 1).padStart(3, '0')}`,
    ...tenantConfigurationPatch(tenant),
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

function tenantDisplayName(tenant: Tenant): string {
  return tenant.tenantName || `${tenant.tid} ${tenant.accountName}`.trim()
}

function tenantConfigurationSummary(tenant: Tenant): string {
  return [
    tenant.productType,
    tenant.hostingType,
    tenant.cloudPlatform,
    tenant.licenses != null ? `${tenant.licenses} lic.` : null,
    tenant.users != null ? `${tenant.users} users` : null,
    tenant.concurrentSearches != null ? `${tenant.concurrentSearches} searches` : null,
    tenant.concurrentAnalyses != null ? `${tenant.concurrentAnalyses} analyses` : null,
    tenant.tangles != null ? `Tangles ${tenant.tangles}` : null,
    tenant.webloc != null ? `Webloc ${tenant.webloc}` : null,
  ]
    .filter(Boolean)
    .join(' | ')
}

function tenantOptionText(tenant: Tenant, accountTenants: Tenant[], sidSystems: System[]): string {
  return [
    tenantDisplayName(tenant),
    `TID ${tenant.tid}`,
    `SID ${resolveTenantSid(tenant.id, accountTenants, sidSystems) || '-'}`,
    `PID ${tenant.deliveryPid || '-'}`,
    tenantConfigurationSummary(tenant),
  ]
    .filter(Boolean)
    .join(' | ')
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
  saveMessages,
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
  saveMessages: string[]
  onAddRow: () => void
  onDeleteRow: (rowId: string) => void
  onUpdateRow: (rowId: string, key: string, value: string | string[] | number | null) => void
}) {
  const [activeMultiSelect, setActiveMultiSelect] = useState<ActiveMultiSelect | null>(null)
  const rows =
    kind === 'A'
      ? draft.newTenantRequirements
      : kind === 'B'
        ? draft.changeRequestRequirements
        : draft.standardRenewalRequirements

  function cellChanged(row: RequirementRow, key: string): boolean {
    const savedRow = findRequirement(saved, kind, row.id)
    if (!savedRow) return true

    return !valuesEqual(rowValue(row, key), rowValue(savedRow, key))
  }

  function cellMissing(rowIndex: number, column: RequirementColumnMetadata): boolean {
    const prefix = `Grid ${kind} row ${rowIndex + 1}: `
    const moduleLabel = moduleQuantityLabel(column.key)
    if (column.key === 'tangles' || column.key === 'webloc') {
      return saveMessages.some(
        (message) =>
          message.startsWith(prefix) &&
          (message.includes('Tangles or Webloc') ||
            message.includes(`${moduleLabel} - Module quantity cannot exceed number of users.`)),
      )
    }
    if (moduleLabel) {
      return saveMessages.some(
        (message) =>
          message.startsWith(prefix) &&
          message.includes(`${moduleLabel} - Module quantity cannot exceed number of users.`),
      )
    }
    return saveMessages.some((message) => message === `${prefix}${column.label} is required.`)
  }

  function renderMultiSelect(row: RequirementRow, column: RequirementColumnMetadata, options: string[]) {
    const selected = Array.isArray(rowValue(row, column.key)) ? (rowValue(row, column.key) as string[]) : []
    const isChanged = cellChanged(row, column.key)
    const pickerId = `${row.id}:${column.key}`
    const isOpen = activeMultiSelect?.id === pickerId

    function toggleOption(option: string) {
      const nextSelected = selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option]
      onUpdateRow(row.id, column.key, nextSelected)
      setActiveMultiSelect(null)
    }

    return (
      <>
        <button
          type="button"
          className={inputClassName(isChanged, 'min-h-7 w-44 truncate text-left text-xs')}
          title={selected.join('; ')}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setActiveMultiSelect((current) =>
              current?.id === pickerId
                ? null
                : { id: pickerId, left: rect.left, top: rect.bottom + 4, width: Math.max(rect.width, 224) },
            )
          }}
        >
          {selected.length > 0 ? selected.join('; ') : 'Select'}
        </button>
        {isOpen
          ? createPortal(
              <div
                className="fixed z-50 max-h-56 overflow-y-auto rounded border border-sf-border bg-white p-1 shadow-lg"
                style={{ left: activeMultiSelect.left, top: activeMultiSelect.top, width: activeMultiSelect.width }}
              >
                {options.map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs hover:bg-sf-surface-alt">
                    <input type="checkbox" checked={selected.includes(option)} onChange={() => toggleOption(option)} />
                    <span>{option}</span>
                  </label>
                ))}
              </div>,
              document.body,
            )
          : null}
      </>
    )
  }

  function renderCell(row: RequirementRow, column: RequirementColumnMetadata, rowIndex: number) {
    const isChanged = cellChanged(row, column.key)
    const isMissing = cellMissing(rowIndex, column)

    if ((column.key === 'tenantName' || column.key === 'deliveryPid') && (kind === 'B' || kind === 'C')) {
      const tenantId = (row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId
      const tenant = accountTenants.find((candidate) => candidate.id === tenantId)
      const value = column.key === 'tenantName' ? (tenant ? tenantDisplayName(tenant) : '') : tenant?.deliveryPid ?? ''
      return <span className="text-xs text-sf-text-muted">{value}</span>
    }

    if (column.key === 'deployTarget' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      return (
        <select
          className={fieldClassName(isChanged, isMissing, 'h-7 w-36 text-xs')}
          value={requirement.deployTarget}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value as RequirementDeployTarget)}
        >
          <option value="NEW_SYSTEM">New System</option>
          <option value="EXISTING_SID">Existing System</option>
        </select>
      )
    }

    if (column.key === 'existingSystemId' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      if (requirement.deployTarget !== 'EXISTING_SID') {
        return <span className="text-xs text-sf-text-muted">New System</span>
      }

      return (
        <>
          <select
            className={fieldClassName(isChanged, isMissing, 'h-7 w-44 text-xs')}
            value={requirement.existingSystemId ?? ''}
            onChange={(event) => onUpdateRow(row.id, column.key, event.target.value || null)}
            disabled={sidSystems.length === 0}
          >
            <option value="">{sidSystems.length > 0 ? 'Select SID' : 'No eligible SIDs'}</option>
            {sidSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {system.sid} - {system.hostingType}
              </option>
            ))}
          </select>
          {sidSystems.length === 0 ? (
            <span className="block max-w-44 text-[10px] leading-tight text-sf-text-muted">
              No eligible existing systems found for this deal owner.
            </span>
          ) : null}
        </>
      )
    }

    if (column.key === 'tenantId' && (kind === 'B' || kind === 'C')) {
      return (
        <select
          className={fieldClassName(isChanged, isMissing, 'h-7 w-72 text-xs')}
          value={(row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="">Select tenant</option>
          {accountTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenantOptionText(tenant, accountTenants, sidSystems)}
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
          className={fieldClassName(isChanged, isMissing, 'h-7 w-44 text-xs')}
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

    if (!column.editable) {
      return (
        <span className={isChanged ? 'bg-yellow-100 px-1 text-xs' : 'text-xs text-sf-text-muted'}>
          {textValue(rowValue(row, column.key))}
        </span>
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
          className={fieldClassName(isChanged, isMissing, 'h-7 w-40 text-xs')}
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
          className={fieldClassName(isChanged, isMissing, 'h-7 w-24 text-xs')}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={digitString(rowValue(row, column.key))}
          onKeyDown={preventNonDigitKey}
          onPaste={(event) => {
            event.preventDefault()
            onUpdateRow(row.id, column.key, parseDigitValue(event.clipboardData.getData('text').replace(/\D/g, '')))
          }}
          onChange={(event) => onUpdateRow(row.id, column.key, parseDigitValue(event.target.value.replace(/\D/g, '')))}
        />
      )
    }

    return (
      <input
        className={fieldClassName(isChanged, isMissing, 'h-7 w-36 text-xs')}
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
          {kind === 'B' ? 'Select and Change Tenant' : kind === 'C' ? 'Select Tenant' : '+ Add Tenant Requirement'}
        </button>
      </div>

      {kind === 'B' || kind === 'C' ? (
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-xs leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                <th className="border border-sf-border px-2 py-1 font-semibold">TID</th>
                <th className="border border-sf-border px-2 py-1 font-semibold">Tenant Name</th>
                <th className="border border-sf-border px-2 py-1 font-semibold">SID</th>
                <th className="border border-sf-border px-2 py-1 font-semibold">Delivery PID</th>
                <th className="border border-sf-border px-2 py-1 font-semibold">Current product/config summary</th>
              </tr>
            </thead>
            <tbody>
              {accountTenants.map((tenant) => (
                <tr key={tenant.id}>
                  <td className="border border-sf-border px-2 py-1">{tenant.tid}</td>
                  <td className="border border-sf-border px-2 py-1">{tenantDisplayName(tenant)}</td>
                  <td className="border border-sf-border px-2 py-1">{resolveTenantSid(tenant.id, accountTenants, sidSystems)}</td>
                  <td className="border border-sf-border px-2 py-1">{tenant.deliveryPid ?? ''}</td>
                  <td className="border border-sf-border px-2 py-1">{tenantConfigurationSummary(tenant)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-xs leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom font-semibold text-sf-text">
                  <span>
                    {column.label}
                    {column.required ? <span className="ml-0.5 text-red-600">*</span> : null}
                    {column.requiredWhen && column.key !== 'existingSystemId' ? <span className="ml-0.5 text-red-600">*</span> : null}
                  </span>
                  {column.key !== 'existingSystemId' ? (
                    <span className="block text-[11px] font-normal text-sf-text-muted">{column.group}</span>
                  ) : null}
                  {column.requiredWhen && column.key !== 'existingSystemId' ? (
                    <span className="block max-w-40 whitespace-normal text-[10px] font-normal leading-tight text-red-700">
                      {column.requiredWhen}
                    </span>
                  ) : null}
                </th>
              ))}
              <th className="border border-sf-border px-2 py-1" />
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-sf-surface-alt">
                {columns.map((column) => (
                  <td key={column.key} className="border border-sf-border px-1.5 py-px align-top">
                    {renderCell(row, column, rowIndex)}
                  </td>
                ))}
                <td className="border border-sf-border px-1.5 py-px align-top">
                  <button
                    type="button"
                    className="h-6 rounded border border-red-200 px-2 text-[11px] text-red-700 hover:bg-red-50"
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
  const projects = useAppStore((state) => state.projects)
  const updateOpportunity = useAppStore((state) => state.updateOpportunity)
  const createProjectFromOpportunity = useAppStore((state) => state.createProjectFromOpportunity)
  const savedOpportunity = opportunities.find((candidate) => candidate.opportunityId === opportunityId)
  const [draft, setDraft] = useState<Opportunity | null>(() => (savedOpportunity ? cloneOpportunity(savedOpportunity) : null))
  const [saveMessages, setSaveMessages] = useState<string[]>([])
  const [activeDetailTab, setActiveDetailTab] = useState<OpportunityDetailTab>('requirements')

  useEffect(() => {
    setDraft(savedOpportunity ? cloneOpportunity(savedOpportunity) : null)
    setSaveMessages([])
  }, [savedOpportunity])

  const metadata = draft ? getOpportunityMetadata(draft.type, draft.subType) : null
  const visibleRequirementTypes = draft ? getVisibleRequirementTypes(draft.type, draft.subType) : []
  const account = draft ? accounts.find((candidate) => candidate.id === draft.accountId) : undefined
  const sidSystems = draft ? getOpportunityExistingSidSystems(draft, accounts, systems) : []
  const accountTenants = draft ? getAccountTenants(draft.accountId, tenants) : []
  const createdProjects = draft
    ? projects.filter(
        (project) =>
          (project.accountName === account?.accountName || !account) &&
          (project.opportunityId === draft.opportunityId ||
            Boolean(savedOpportunity?.opportunityId && project.opportunityId === savedOpportunity.opportunityId)),
      )
    : []
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

  function headerFieldWidthClass(key: OpportunityHeaderField['key'] | 'stage'): string {
    if (key === 'opportunityName' || key === 'accountId' || key === 'warrantyRecordId') return 'w-64'
    if (key === 'salesManagerId') return 'w-56'
    if (key === 'opportunityId' || key === 'timeZone') return 'w-48'
    if (key === 'deliveryDate' || key === 'pocStartDate' || key === 'pocEndDate') return 'w-40'
    if (key === 'warrantyServiceMonths') return 'w-36'
    if (key === 'type' || key === 'subType' || key === 'region' || key === 'country' || key === 'state') return 'w-36'
    return 'w-32'
  }

  function headerControlClassName(changed: boolean, editable = true, isMissing = false): string {
    const base = 'h-8 w-full text-sm'
    return editable
      ? fieldClassName(changed, isMissing, base)
      : fieldClassName(changed, isMissing, `${base} bg-sf-surface-alt`)
  }

  function headerMissing(fieldKey: OpportunityHeaderField['key'] | 'stage'): boolean {
    const labels: Partial<Record<OpportunityHeaderField['key'] | 'stage', string[]>> = {
      opportunityId: ['Salesforce Opportunity ID is required.'],
      opportunityName: ['Opportunity name is required.'],
      accountId: ['Account is required.'],
      salesManagerId: ['Sales Manager / Deal Owner is required.'],
      deliveryDate: ['Delivery date is required.'],
      pocStartDate: ['Start Date is required.'],
      pocEndDate: ['End Date is required.'],
      warrantyRecordId: ['Warranty record to extend is required.'],
    }
    return (labels[fieldKey] ?? []).some((message) => saveMessages.includes(message))
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
              ...(key === 'tenantId' && selectedTenant
                ? { ...tenantConfigurationPatch(selectedTenant), systemId: selectedTenant.systemId }
                : {}),
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
                  ...tenantConfigurationPatch(selectedTenant),
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

  function cancelChanges() {
    setDraft(cloneOpportunity(currentSavedOpportunity))
    setSaveMessages([])
    navigate('/opportunities')
  }

  function switchDetailTab(nextTab: OpportunityDetailTab) {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    setActiveDetailTab(nextTab)
    window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  }

  function saveChanges() {
    const messages = validateOpportunity(currentDraft, { accounts, systems, tenants })
      .filter((message) => message.level === 'error')
      .map((message) => message.message)

    if (messages.length > 0) {
      setSaveMessages(messages)
      return
    }

    let forceNewProject = false
    const existingLinkedProjects = projects.filter(
      (project) =>
        project.opportunityId === currentDraft.opportunityId ||
        project.opportunityId === currentSavedOpportunity.opportunityId,
    )

    if (currentDraft.type === 'POC') {
      const activePocProject = existingLinkedProjects.find(
        (project) => project.mainType === 'POC' && project.progressStatus !== 'DONE',
      )
      const completedPocProject = existingLinkedProjects.find(
        (project) => project.mainType === 'POC' && project.progressStatus === 'DONE',
      )

      if (activePocProject) {
        forceNewProject = !window.confirm(
          `Linked POC Project ${activePocProject.pid} is not Done. Press OK to update it, or Cancel to create a new POC Project.`,
        )
      } else if (completedPocProject) {
        forceNewProject = true
      }
    }

    updateOpportunity(currentSavedOpportunity.id, currentDraft)
    createProjectFromOpportunity(currentDraft, {
      forceNew: forceNewProject,
      existingOpportunityId: currentSavedOpportunity.opportunityId,
    })
    setSaveMessages([])
    navigate('/opportunities')
  }

  function renderHeaderField(field: OpportunityHeaderField) {
    if (field.key === 'type') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('type'), true, headerMissing(field.key))}
            value={currentDraft.type}
            onChange={(event) => updateType(event.target.value as OpportunityType)}
          >
            <option value="POC">POC</option>
            <option value="DELIVERY">Delivery</option>
            <option value="RENEWAL">Renewal</option>
          </select>
        </FormField>
      )
    }

    if (field.key === 'subType') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('subType'), true, headerMissing(field.key))}
            value={currentDraft.subType}
            onChange={(event) => patchDraft({ subType: event.target.value as OpportunitySubType })}
          >
            {SUB_TYPE_OPTIONS[currentDraft.type].map((subType) => (
              <option key={subType} value={subType}>
                {subType}
              </option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.key === 'accountId') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('accountId'), true, headerMissing(field.key))}
            value={currentDraft.accountId}
            onChange={(event) => updateAccount(event.target.value)}
          >
            {accounts.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.accountName}
              </option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.key === 'salesManagerId') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('salesManagerId'), true, headerMissing(field.key))}
            value={currentDraft.salesManagerId}
            onChange={(event) => patchDraft({ salesManagerId: event.target.value })}
          >
            {salesManagers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.key === 'warrantyRecordId') {
      const tenantIds = new Set(accountTenants.map((tenant) => tenant.id))
      const accountWarrantyRecords = warrantyRecords.filter((record) => tenantIds.has(record.tenantId))
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('warrantyRecordId'), true, headerMissing(field.key))}
            value={currentDraft.warrantyRecordId ?? ''}
            onChange={(event) => patchDraft({ warrantyRecordId: event.target.value })}
          >
            <option value="">Select warranty</option>
            {accountWarrantyRecords.map((record) => (
              <option key={record.warrantyRecordId} value={record.warrantyRecordId}>
                {record.warrantyRecordId} - {record.status} - {record.endDate ?? 'No end'}
              </option>
            ))}
          </select>
        </FormField>
      )
    }

    const dateFields = new Set(['deliveryDate', 'pocStartDate', 'pocEndDate'])
    const isDate = dateFields.has(field.key)
    const isNumber = field.key === 'warrantyServiceMonths'
    const changed = headerChanged(field.key)

    return (
      <FormField
        key={field.key}
        label={
          <>
            {field.label}
            {isDate ? <span className="ml-0.5 text-red-600">*</span> : null}
          </>
        }
        controlWidthClassName={headerFieldWidthClass(field.key)}
      >
        <input
          className={headerControlClassName(changed, field.editable, headerMissing(field.key))}
          type={isDate ? 'date' : 'text'}
          inputMode={isNumber ? 'numeric' : undefined}
          pattern={isNumber ? '[0-9]*' : undefined}
          value={isNumber ? digitString(currentDraft[field.key]) : textValue(currentDraft[field.key])}
          readOnly={!field.editable}
          onKeyDown={isNumber ? preventNonDigitKey : undefined}
          onPaste={
            isNumber
              ? (event) => {
                  event.preventDefault()
                  patchDraft({ [field.key]: parseDigitValue(event.clipboardData.getData('text').replace(/\D/g, '')) } as Partial<Opportunity>)
                }
              : undefined
          }
          onChange={(event) =>
            patchDraft({
              [field.key]: isNumber
                ? parseDigitValue(event.target.value.replace(/\D/g, ''))
                : event.target.value || (isDate ? null : ''),
            } as Partial<Opportunity>)
          }
        />
      </FormField>
    )
  }

  function renderStageField() {
    return (
      <FormField label="Stage" controlWidthClassName={headerFieldWidthClass('stage')}>
        <select
          className={headerControlClassName(headerChanged('stage'), true, headerMissing('stage'))}
          value={currentDraft.stage}
          onChange={(event) => patchDraft({ stage: event.target.value as Opportunity['stage'] })}
        >
          <option value="OPEN">Open</option>
          <option value="WON">Won</option>
          <option value="LOST">Lost</option>
        </select>
      </FormField>
    )
  }

  const headerFieldByKey = new Map(metadata.headerFields.map((field) => [field.key, field]))
  const lineOneKeys: OpportunityHeaderField['key'][] = ['salesManagerId']
  const lineTwoKeys: OpportunityHeaderField['key'][] = ['opportunityId', 'opportunityName', 'type', 'subType']
  const locationFieldKeys: OpportunityHeaderField['key'][] = ['accountId', 'region', 'country', 'state', 'timeZone']
  const lineThreeKeys: OpportunityHeaderField['key'][] = [
    'accountId',
    'region',
    'country',
    ...(currentDraft.country === 'USA' ? (['state'] as OpportunityHeaderField['key'][]) : []),
    'timeZone',
  ]
  const commercialTermKeys: OpportunityHeaderField['key'][] = [
    'warrantyRecordId',
    'deliveryDate',
    'pocStartDate',
    'pocEndDate',
    'warrantyServiceMonths',
  ]
  const orderedHeaderKeys = new Set<OpportunityHeaderField['key']>([
    ...lineOneKeys,
    ...lineTwoKeys,
    ...locationFieldKeys,
    ...commercialTermKeys,
  ])
  const operationalMetadataFields = metadata.headerFields.filter((field) => !orderedHeaderKeys.has(field.key))

  function renderHeaderFields(keys: OpportunityHeaderField['key'][]) {
    return keys.map((key) => {
      const field = headerFieldByKey.get(key)
      return field ? renderHeaderField(field) : null
    })
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
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
            onClick={discardChanges}
          >
            Revert
          </button>
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={cancelChanges}>
            Cancel
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
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-3">
            {renderHeaderFields(lineOneKeys)}
            {renderStageField()}
          </div>

          <div className="border-t border-sf-border" />

          <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(lineTwoKeys)}</div>

          <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(lineThreeKeys)}</div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase text-sf-text-muted">Commercial terms</h3>
            <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(commercialTermKeys)}</div>
          </div>

          {operationalMetadataFields.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-sf-text-muted">Operational metadata</h3>
              <div className="flex flex-wrap items-start gap-3">
                {operationalMetadataFields.map(renderHeaderField)}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {saveMessages.length > 0 && hiddenRequirementTypes.length > 0 ? (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Hidden requirement rows are preserved for Grid {hiddenRequirementTypes.join(', ')}. Change the type/subtype back
          or manually delete irrelevant rows later.
        </div>
      ) : null}

      <section className="sf-card overflow-hidden">
        <div className="flex border-b border-sf-border bg-sf-surface-alt">
          <button
            type="button"
            className={[
              'border-b-2 px-4 py-2 text-sm font-semibold',
              activeDetailTab === 'requirements'
                ? 'border-sf-brand bg-white text-sf-text'
                : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
            ].join(' ')}
            aria-selected={activeDetailTab === 'requirements'}
            onClick={() => switchDetailTab('requirements')}
          >
            Tenant Requirements
          </button>
          <button
            type="button"
            className={[
              'border-b-2 px-4 py-2 text-sm font-semibold',
              activeDetailTab === 'project'
                ? 'border-sf-brand bg-white text-sf-text'
                : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
            ].join(' ')}
            aria-selected={activeDetailTab === 'project'}
            onClick={() => switchDetailTab('project')}
          >
            Created Project
          </button>
        </div>

        <div className="min-h-[60vh]">
        {activeDetailTab === 'requirements' ? (
          <div className="space-y-4 p-3" role="tabpanel" aria-label="Tenant Requirements">
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
                saveMessages={saveMessages}
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
                saveMessages={saveMessages}
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
                saveMessages={saveMessages}
                onAddRow={() => addRequirement('C')}
                onDeleteRow={(rowId) => deleteRequirement('C', rowId)}
                onUpdateRow={(rowId, key, value) => updateRequirement('C', rowId, key, value)}
              />
            ) : null}
          </div>
        ) : (
          <div className="space-y-2 p-3" role="tabpanel" aria-label="Created Project">
            {createdProjects.length > 0 ? (
              <div className="overflow-x-auto rounded border border-sf-border bg-white">
                <table className="min-w-full border-collapse text-sm">
                  <thead className="bg-sf-surface-alt text-left">
                    <tr>
                      <th className="border border-sf-border px-2 py-1 font-semibold">PID</th>
                      <th className="border border-sf-border px-2 py-1 font-semibold">Project</th>
                      <th className="border border-sf-border px-2 py-1 font-semibold">Account</th>
                      <th className="border border-sf-border px-2 py-1 font-semibold">Delivery date</th>
                      <th className="border border-sf-border px-2 py-1 font-semibold">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {createdProjects.map((project) => (
                      <tr key={project.id}>
                        <td className="border border-sf-border px-2 py-1">{project.pid}</td>
                        <td className="border border-sf-border px-2 py-1">{project.opportunityName}</td>
                        <td className="border border-sf-border px-2 py-1">{project.accountName}</td>
                        <td className="border border-sf-border px-2 py-1">{project.deliveryDate ?? ''}</td>
                        <td className="border border-sf-border px-2 py-1">
                          <Link className="text-sf-brand hover:underline" to={`/projects/${project.pid}`}>
                            Open project
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
                No project created yet.
              </div>
            )}
          </div>
        )}
        </div>
      </section>
    </div>
  )
}
