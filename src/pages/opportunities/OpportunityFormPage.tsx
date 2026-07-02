import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import {
  PRODUCT_OPTIONS,
  HOSTING_OPTIONS,
  cloudPlatformOptionsForHosting,
} from '@/config/cloud-platform-metadata'
import {
  ADDITIONAL_FEATURE_OPTIONS,
  AI_OPTIONS,
  CROSS_SYSTEM_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  getOpportunityMetadataForOpportunity,
  getVisibleRequirementTypesForOpportunity,
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
  OpportunityDealPackage,
  OpportunitySubType,
  OpportunityType,
  Project,
  RequirementDeployTarget,
  StandardRenewalRequirement,
  System,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'
import { PageHeader } from '@/components/record'
import { AlertStatusIcon, BusinessIdLink, BusinessObjectLink, FormField, PlaceholderCard, StatusBadge } from '@/components/ui'
import { configurationColumnGroupLabel } from '@/components/configuration'
import { type PocProjectSyncAction, type ProjectLifecycleChange, useAppStore } from '@/store/useAppStore'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import {
  getAccountSystems,
  getAccountTenants,
  getOpportunityExistingSidSystems,
  resolveTenantSid,
} from '@/utils/opportunity-validation'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'
import { applicationConfigurationPatchFromTenant } from '@/domain/application-configuration'
import {
  createChangeRequestRequirement,
  createNewTenantRequirement,
  createStandardRenewalRequirement,
  newTenantRequirementWithDealPackage,
} from '@/domain/tenant-requirement'
import {
  activePocProjectForOpportunity,
  cloneOpportunityDraft,
  createdProjectsForOpportunity,
  isSameOpportunityTypeChange,
  opportunitySubTypeOptions,
  opportunitySubTypeForTypeChange,
  opportunityTypeChangePatch,
  shouldConfirmOpportunityTypeChange,
  shouldConfirmPocProjectSync,
  shouldConfirmWonTransition,
  validateOpportunity,
  validateOpportunityTransition,
} from '@/domain/opportunity-lifecycle'
import {
  warrantyRecordById,
  warrantyRecordForTenant,
  warrantyRecordPatch,
  warrantyRecordsForTenant,
} from '@/domain/warranty-collection'
import { tenantFormType } from '@/domain/tenant-operations'
import { deriveProjectProgress, orderedProjectMilestones, projectMilestoneStatus } from '@/domain/milestone-plan'
import { accountReference, projectReference, systemReference, tenantReference } from '@/domain/business-reference'
import { alertVariantForWarrantyStatus, badgeVariantForProjectStatus } from '@/domain/status-presentation'
import { formatDate, formatDateTime } from '@/domain/date-time-presentation'

type RequirementGridKind = 'A' | 'B' | 'C'
type RequirementRow = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement
type OpportunityDetailTab = 'requirements' | 'project'
type ActiveMultiSelect = { id: string; rowId: string; columnKey: string; selected: string[]; left: number; top: number; width: number }
type PendingSave = { stayOnPage?: boolean }
type PendingOpportunityTypeChange = { type: OpportunityType; subType: OpportunitySubType }
type CollapsibleSectionId = 'opportunityHeader' | 'existingSystems' | 'gridA' | 'gridB' | 'gridC' | 'createdProject'
type ExistingActionValue =
  | 'Not selected'
  | 'New tenant'
  | 'Upsell change'
  | 'Downsell change'
  | 'Standard renewal'
  | 'Renewal + upsell'
  | 'Renewal + downsell'

const EMPTY_PROJECT_CHANGES: ProjectLifecycleChange[] = []
const DEFAULT_COLLAPSED_SECTIONS: Record<CollapsibleSectionId, boolean> = {
  opportunityHeader: false,
  existingSystems: false,
  gridA: false,
  gridB: false,
  gridC: false,
  createdProject: false,
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

function existingSystemOptionLabel(system: System, opportunity: Opportunity): string {
  const relationship = system.accountId && system.accountId === opportunity.accountId ? 'Same Account' : 'Deal Owner Related'
  const accountName = (system as System & { accountName?: string }).accountName
  return `${system.sid ?? system.machineId ?? system.id} | Customer: ${accountName || system.accountId || 'Unknown'} | Product: ${system.productType || '-'} | ${relationship}`
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

function sameStringSet(actual: unknown, expected: string[]): boolean {
  if (!Array.isArray(actual)) return expected.length === 0
  const actualValues = actual.map(String).sort()
  const expectedValues = [...expected].sort()
  return actualValues.length === expectedValues.length && actualValues.every((value, index) => value === expectedValues[index])
}

function displayedDealPackageForRequirement(row: RequirementRow): OpportunityDealPackage | '' {
  if (
    row.users === 25 &&
    row.licenses === 25 &&
    row.concurrentSearches === 50 &&
    row.concurrentAnalyses === 25 &&
    row.standardMonitors === 40 &&
    row.tangles === 25 &&
    row.tanglesGo === 25 &&
    row.webloc === 25 &&
    row.webeye === 25 &&
    row.ingest === 25 &&
    sameStringSet(row.aiFeatures, AI_OPTIONS) &&
    sameStringSet(row.additionalFeatures, ADDITIONAL_FEATURE_OPTIONS)
  ) {
    return 'Platinum'
  }

  if (
    row.users === 10 &&
    row.licenses === 10 &&
    row.concurrentSearches === 20 &&
    row.concurrentAnalyses === 10 &&
    row.standardMonitors === 20 &&
    row.tangles === 10 &&
    row.webloc === 10 &&
    sameStringSet(row.aiFeatures, ['OCR', 'Landmark', 'Face Detection']) &&
    sameStringSet(row.additionalFeatures, ['Post Translation', 'Advanced Search'])
  ) {
    return 'Gold'
  }

  if (
    row.users === 5 &&
    row.licenses === 5 &&
    row.concurrentSearches === 10 &&
    row.concurrentAnalyses === 5 &&
    row.standardMonitors === 10 &&
    row.tangles === 5
  ) {
    return 'Silver'
  }

  return ''
}

function moduleQuantityLabel(key: string): string | null {
  const labels: Record<string, string> = {
    tangles: 'Tangles',
    tanglesGo: 'Tangles Go',
    webloc: 'Webloc',
    webeye: 'Webeye',
    ingest: 'Ingest',
  }
  return labels[key] ?? null
}

function digitString(value: unknown): string {
  return value == null ? '' : String(value).replace(/\D/g, '')
}

function parseDigitValue(value: string): number | null {
  return value === '' ? null : Number(value)
}

function preventNonDigitKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  if (!/^\d$/.test(event.key)) event.preventDefault()
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

function opportunityActionBadgeClassName(action: ExistingActionValue): string {
  const classes: Record<ExistingActionValue, string> = {
    'Not selected': 'border-gray-300 bg-gray-100 text-gray-700',
    'New tenant': 'border-emerald-300 bg-emerald-100 text-emerald-800',
    'Upsell change': 'border-blue-300 bg-blue-100 text-blue-800',
    'Downsell change': 'border-orange-300 bg-orange-100 text-orange-800',
    'Standard renewal': 'border-violet-300 bg-violet-100 text-violet-800',
    'Renewal + upsell': 'border-cyan-300 bg-cyan-100 text-cyan-800',
    'Renewal + downsell': 'border-amber-300 bg-amber-100 text-amber-900',
  }
  return classes[action]
}

function changeActionLabel(opportunity: Opportunity): 'Upsell change' | 'Downsell change' {
  return opportunity.subType === 'DOWN_SELL' ? 'Downsell change' : 'Upsell change'
}

function combinedRenewalActionLabel(opportunity: Opportunity): 'Renewal + upsell' | 'Renewal + downsell' {
  return opportunity.subType === 'DOWN_SELL' ? 'Renewal + downsell' : 'Renewal + upsell'
}

function CollapsibleSection({
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
  className = 'sf-card space-y-3 p-3',
  headerActions,
}: {
  title: string
  subtitle?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
  className?: string
  headerActions?: ReactNode
}) {
  const Indicator = collapsed ? ChevronRight : ChevronDown

  return (
    <section className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" className="sf-view-mode-allow flex min-w-0 items-start gap-2 text-left" onClick={onToggle} aria-expanded={!collapsed}>
          <Indicator className="mt-0.5 h-4 w-4 shrink-0 text-sf-text-muted" aria-hidden="true" />
          <span>
            <span className="block text-lg font-semibold text-sf-text">{title}</span>
            {subtitle ? <span className="block text-sm text-sf-text-muted">{subtitle}</span> : null}
          </span>
        </button>
        {headerActions ? <div className="flex flex-wrap items-center gap-2">{headerActions}</div> : null}
      </div>
      {collapsed ? null : children}
    </section>
  )
}

function RequirementGrid({
  title,
  kind,
  collapsed,
  columns,
  draft,
  saved,
  accountTenants,
  sidSystems,
  warrantyRecords,
  countryOptions,
  saveMessages,
  isTenantOptionDisabled,
  isSystemOptionDisabled,
  onSelectAllTenants,
  onAddRow,
  onDeleteRow,
  onChangePackage,
  onUpdateRow,
  onToggleCollapsed,
}: {
  title: string
  kind: RequirementGridKind
  collapsed: boolean
  columns: RequirementColumnMetadata[]
  draft: Opportunity
  saved: Opportunity
  accountTenants: Tenant[]
  sidSystems: System[]
  warrantyRecords: WarrantyRecord[]
  countryOptions: string[]
  saveMessages: string[]
  isTenantOptionDisabled: (kind: RequirementGridKind, rowId: string, tenantId: string) => boolean
  isSystemOptionDisabled: (rowId: string, systemId: string) => boolean
  onSelectAllTenants?: () => void
  onAddRow: () => void
  onDeleteRow: (rowId: string) => void
  onChangePackage?: (rowId: string, dealPackage: OpportunityDealPackage) => void
  onUpdateRow: (rowId: string, key: string, value: string | string[] | number | null) => void
  onToggleCollapsed: () => void
}) {
  const [activeMultiSelect, setActiveMultiSelect] = useState<ActiveMultiSelect | null>(null)
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [pendingAddNew, setPendingAddNew] = useState<{ rowId: string; key: string; value: string } | null>(null)
  const rows =
    kind === 'A'
      ? draft.newTenantRequirements
      : kind === 'B'
        ? draft.changeRequestRequirements
        : draft.standardRenewalRequirements
  const availableTenantCount =
    kind === 'B' || kind === 'C'
      ? accountTenants.filter((tenant) => !isTenantOptionDisabled(kind, '', tenant.id)).length
      : accountTenants.length
  const tenantSelectionLimitReached = (kind === 'B' || kind === 'C') && availableTenantCount === 0

  useEffect(() => {
    if (!activeMultiSelect) return
    const active = activeMultiSelect

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (
        target?.closest(`[data-multiselect-picker="${active.id}"]`) ||
        target?.closest(`[data-multiselect-trigger="${active.id}"]`)
      ) {
        return
      }
      onUpdateRow(active.rowId, active.columnKey, active.selected)
      setActiveMultiSelect(null)
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [activeMultiSelect, onUpdateRow])

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
    if (column.key === 'licenses') {
      return saveMessages.some(
        (message) => message.startsWith(prefix) && message.includes('Licenses cannot exceed number of users.'),
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
    const draftSelected = isOpen ? activeMultiSelect.selected : selected
    const selectedText = selected.length > 0 ? selected.join('; ') : 'Select'
    const triggerWidth = `${Math.min(48, Math.max(16, selectedText.length + 3))}ch`

    function toggleOption(option: string) {
      setActiveMultiSelect((current) => {
        if (!current || current.id !== pickerId) return current
        const nextSelected = current.selected.includes(option)
          ? current.selected.filter((value) => value !== option)
          : [...current.selected, option]
        return { ...current, selected: nextSelected }
      })
    }

    return (
      <>
        <button
          type="button"
          data-multiselect-trigger={pickerId}
          className={inputClassName(isChanged, 'h-7 min-w-56 max-w-[42rem] whitespace-nowrap text-left text-sm')}
          style={{ width: triggerWidth }}
          title={selected.join('; ')}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setActiveMultiSelect((current) => {
              if (current?.id === pickerId) {
                onUpdateRow(current.rowId, current.columnKey, current.selected)
                return null
              }
              if (current) {
                onUpdateRow(current.rowId, current.columnKey, current.selected)
              }
              return {
                id: pickerId,
                rowId: row.id,
                columnKey: column.key,
                selected,
                left: rect.left,
                top: rect.bottom + 4,
                width: Math.max(rect.width, 256),
              }
            })
          }}
        >
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{selectedText}</span>
        </button>
        {isOpen
          ? createPortal(
              <div
                data-multiselect-picker={pickerId}
                className="fixed z-50 max-h-56 overflow-y-auto rounded border border-sf-border bg-white p-1 shadow-lg"
                style={{ left: activeMultiSelect.left, top: activeMultiSelect.top, width: activeMultiSelect.width }}
              >
                {options.map((option) => (
                  <label key={option} className="flex cursor-pointer items-center gap-2 px-2 py-1 text-sm hover:bg-sf-surface-alt">
                    <input type="checkbox" checked={draftSelected.includes(option)} onChange={() => toggleOption(option)} />
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

  function optionsWithCustom(key: string, options: string[]): string[] {
    return [...options.filter((option) => option !== 'Add new...'), ...(customPicklistOptions[key] ?? []), ...(options.includes('Add new...') ? ['Add new...'] : [])]
  }

  function handlePicklistChange(rowId: string, key: string, value: string) {
    if (value === 'Add new...') {
      setPendingAddNew({ rowId, key, value: '' })
      return
    }
    onUpdateRow(rowId, key, value)
  }

  function renderAddNewEditor(rowId: string, key: string) {
    if (pendingAddNew?.rowId !== rowId || pendingAddNew.key !== key) return null

    return (
      <div className="mt-1 flex w-40 items-center gap-1">
        <input
          className="h-7 min-w-0 flex-1 rounded border border-sf-border px-2 py-1 text-sm"
          value={pendingAddNew.value}
          autoFocus
          onChange={(event) => setPendingAddNew({ rowId, key, value: event.target.value })}
        />
        <button
          type="button"
          className="rounded border border-sf-brand bg-sf-brand px-2 py-1 text-xs font-semibold text-white"
          onClick={() => {
            const nextValue = pendingAddNew.value.trim()
            if (!nextValue) return
            setCustomPicklistOptions((current) => addCustomPicklistOption(current, key, nextValue))
            onUpdateRow(rowId, key, nextValue)
            setPendingAddNew(null)
          }}
        >
          Add
        </button>
        <button type="button" className="rounded border border-sf-border bg-white px-2 py-1 text-xs" onClick={() => setPendingAddNew(null)}>
          Cancel
        </button>
      </div>
    )
  }

  function renderCell(row: RequirementRow, column: RequirementColumnMetadata, rowIndex: number) {
    const isChanged = cellChanged(row, column.key)
    const isMissing = cellMissing(rowIndex, column)

    if ((column.key === 'tenantName' || column.key === 'deliveryPid') && (kind === 'B' || kind === 'C')) {
      const tenantId = (row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId
      const tenant = accountTenants.find((candidate) => candidate.id === tenantId)
      const value = column.key === 'tenantName' ? (tenant ? tenantDisplayName(tenant) : '') : tenant?.deliveryPid ?? ''
      return <span className="text-sm text-sf-text-muted">{value}</span>
    }

    if (column.key === 'deployTarget' && kind === 'A') {
      const requirement = row as NewTenantRequirement
      return (
        <select
          className={fieldClassName(isChanged, isMissing, 'h-7 w-36 text-sm')}
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
        return <span className="text-sm text-sf-text-muted">New System</span>
      }
      const availableSystems = sidSystems.filter((system) => !isSystemOptionDisabled(row.id, system.id))
      const alreadySelectedSystems = sidSystems.filter((system) => isSystemOptionDisabled(row.id, system.id))
      const sameAccountSystems = availableSystems.filter((system) => system.accountId && system.accountId === draft.accountId)
      const dealOwnerSystems = availableSystems.filter((system) => !system.accountId || system.accountId !== draft.accountId)

      return (
        <>
          <select
            className={fieldClassName(isChanged, isMissing, 'h-7 w-44 text-sm')}
            value={requirement.existingSystemId ?? ''}
            onChange={(event) => onUpdateRow(row.id, column.key, event.target.value || null)}
            disabled={sidSystems.length === 0}
          >
            <option value="">{sidSystems.length > 0 ? 'Select SID' : 'No eligible SIDs'}</option>
            {sameAccountSystems.length > 0 ? (
              <option value="" disabled>
                ---------- Same Account ----------
              </option>
            ) : null}
            {sameAccountSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {existingSystemOptionLabel(system, draft)}
              </option>
            ))}
            {dealOwnerSystems.length > 0 ? (
              <option value="" disabled>
                ---------- Deal Owner Related ----------
              </option>
            ) : null}
            {dealOwnerSystems.map((system) => (
              <option key={system.id} value={system.id}>
                {existingSystemOptionLabel(system, draft)}
              </option>
            ))}
            {alreadySelectedSystems.length > 0 ? (
              <option value="" disabled>
                ---------- Already selected ----------
              </option>
            ) : null}
            {alreadySelectedSystems.map((system) => (
              <option key={system.id} value={system.id} disabled>
                {existingSystemOptionLabel(system, draft)} | Already selected
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
      const availableTenants = accountTenants.filter((tenant) => !isTenantOptionDisabled(kind, row.id, tenant.id))
      const alreadySelectedTenants = accountTenants.filter((tenant) => isTenantOptionDisabled(kind, row.id, tenant.id))

      return (
        <select
          className={fieldClassName(isChanged, isMissing, 'h-7 w-72 text-sm')}
          value={(row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="">Select tenant</option>
          {availableTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenantOptionText(tenant, accountTenants, sidSystems)}
            </option>
          ))}
          {alreadySelectedTenants.length > 0 ? (
            <option value="" disabled>
              ---------- Already selected ----------
            </option>
          ) : null}
          {alreadySelectedTenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id} disabled>
              {tenantOptionText(tenant, accountTenants, sidSystems)} | Already selected
            </option>
          ))}
        </select>
      )
    }

    if (column.key === 'systemId' && (kind === 'B' || kind === 'C')) {
      const tenantId = (row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId
      return (
        <span className={isChanged ? 'bg-yellow-100 px-1 text-sm' : 'text-sm text-sf-text-muted'}>
          {resolveTenantSid(tenantId, accountTenants, sidSystems)}
        </span>
      )
    }

    if (column.key === 'warrantyRecordId' && kind === 'C') {
      const requirement = row as StandardRenewalRequirement
      const tenantWarrantyRecords = warrantyRecordsForTenant(requirement.tenantId, warrantyRecords)
      return (
        <select
          className={fieldClassName(isChanged, isMissing, 'h-7 w-44 text-sm')}
          value={requirement.warrantyRecordId}
          onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
        >
          <option value="">Select warranty</option>
          {tenantWarrantyRecords.map((record) => (
            <option key={record.warrantyRecordId} value={record.warrantyRecordId}>
              {record.warrantyRecordId} - {record.status} - {formatDate(record.endDate, { fallback: 'No end' })}
            </option>
          ))}
        </select>
      )
    }

    if (!column.editable) {
      return (
        <span className={isChanged ? 'bg-yellow-100 px-1 text-sm' : 'text-sm text-sf-text-muted'}>
          {textValue(rowValue(row, column.key))}
        </span>
      )
    }

    if (column.inputType === 'picklist') {
      const currentHosting = textValue(rowValue(row, 'hostingType'))
      const options =
        column.key === 'hostingType'
          ? HOSTING_OPTIONS
          : column.key === 'cloudPlatform'
            ? cloudPlatformOptionsForHosting(currentHosting)
            : column.key === 'productType'
              ? PRODUCT_OPTIONS
              : column.key === 'mapCenter'
                ? [...countryOptions, 'Add new...']
                : YES_NO_OPTIONS
      const isDisabled = column.key === 'cloudPlatform' && options.length === 0

      return (
        <>
          <select
            className={fieldClassName(isChanged, isMissing, 'h-7 w-40 text-sm')}
            value={isDisabled ? '' : textValue(rowValue(row, column.key))}
            disabled={isDisabled}
            onChange={(event) => handlePicklistChange(row.id, column.key, event.target.value)}
          >
            {optionsWithCustom(column.key, options).map((option) => (
              <option key={option} value={option}>
                {option || 'Not set'}
              </option>
            ))}
          </select>
          {renderAddNewEditor(row.id, column.key)}
        </>
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
          className={fieldClassName(isChanged, isMissing, 'h-7 w-24 text-sm')}
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
        className={fieldClassName(isChanged, isMissing, 'h-7 w-36 text-sm')}
        value={textValue(rowValue(row, column.key))}
        onChange={(event) => onUpdateRow(row.id, column.key, event.target.value)}
      />
    )
  }

  return (
    <CollapsibleSection
      title={title}
      subtitle="Each row represents one tenant requirement from Excel section 3."
      collapsed={collapsed}
      onToggle={onToggleCollapsed}
      className="space-y-2"
      headerActions={
        <>
          {kind === 'B' || kind === 'C' ? (
            <button
              type="button"
              className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={tenantSelectionLimitReached}
              onClick={onSelectAllTenants}
            >
              Select All
            </button>
          ) : null}
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            disabled={tenantSelectionLimitReached}
            onClick={onAddRow}
          >
            {kind === 'B' ? 'Select and Change Tenant' : kind === 'C' ? 'Select Tenant' : '+ Add Tenant Requirement'}
          </button>
        </>
      }
    >
      {tenantSelectionLimitReached ? (
        <div className="rounded border border-sf-border bg-sf-surface-alt px-3 py-2 text-sm text-sf-text-muted">
          All existing tenants for this account have already been selected.
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              <th className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                Action
              </th>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                  <span>
                    {column.label}
                    {column.required ? <span className="ml-0.5 text-red-600">*</span> : null}
                    {column.requiredWhen && column.key !== 'existingSystemId' ? <span className="ml-0.5 text-red-600">*</span> : null}
                  </span>
                  {column.key !== 'existingSystemId' ? (
                    <span className="block text-xs font-normal text-sf-text-muted">{configurationColumnGroupLabel(column)}</span>
                  ) : null}
                  {column.requiredWhen && column.key !== 'existingSystemId' ? (
                    <span className="block max-w-40 whitespace-normal text-xs font-normal leading-tight text-red-700">
                      {column.requiredWhen}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((row, rowIndex) => (
              <tr key={row.id} className="hover:bg-sf-surface-alt">
                <td className="min-w-40 border border-sf-border px-1.5 py-px align-top text-sm">
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      className="h-6 rounded border border-red-200 px-2 text-[11px] text-red-700 hover:bg-red-50"
                      onClick={() => onDeleteRow(row.id)}
                    >
                      Delete
                    </button>
                    {kind === 'A' && onChangePackage ? (
                      <select
                        className="h-6 rounded border border-sf-border bg-white px-1 text-[11px]"
                        value={displayedDealPackageForRequirement(row)}
                        aria-label={`Change package for ${row.requirementId}`}
                        onChange={(event) => {
                          if (!event.target.value) return
                          onChangePackage(row.id, event.target.value as OpportunityDealPackage)
                        }}
                      >
                        <option value="">Select Package</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                      </select>
                    ) : null}
                  </div>
                </td>
                {columns.map((column) => (
                  <td key={column.key} className="border border-sf-border px-1.5 py-px align-top text-sm">
                    {renderCell(row, column, rowIndex)}
                  </td>
                ))}
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
    </CollapsibleSection>
  )
}

export function OpportunityFormPage() {
  const { opportunityId } = useParams<{ opportunityId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isViewMode = (location.state as { mode?: string } | null)?.mode === 'view'
  const opportunities = useAppStore((state) => state.opportunities)
  const accounts = useAppStore((state) => state.accounts)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const projects = useAppStore((state) => state.projects)
  const saveOpportunityWithProjectSync = useAppStore((state) => state.saveOpportunityWithProjectSync)
  const storedProjectChanges = useAppStore((state) => {
    const opportunity = state.opportunities.find((candidate) => candidate.opportunityId === opportunityId)
    return opportunity ? state.projectLifecycleChangesByOpportunityId[opportunity.id] ?? EMPTY_PROJECT_CHANGES : EMPTY_PROJECT_CHANGES
  })
  const savedOpportunity = useMemo(
    () => opportunities.find((candidate) => candidate.opportunityId === opportunityId),
    [opportunities, opportunityId],
  )
  const {
    value: draft,
    setValue: setDraft,
    reset: resetDraft,
    undo,
    canUndo,
  } = useUndoHistory<Opportunity | null>(savedOpportunity ? cloneOpportunityDraft(savedOpportunity) : null, {
    clone: (value) => (value ? cloneOpportunityDraft(value) : value),
    isEqual: valuesEqual,
  })
  const [saveMessages, setSaveMessages] = useState<string[]>([])
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<OpportunityDetailTab>('requirements')
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState(false)
  const [projectChanges, setProjectChanges] = useState<ProjectLifecycleChange[]>([])
  const [pendingWonSave, setPendingWonSave] = useState<PendingSave | null>(null)
  const [pendingPocSave, setPendingPocSave] = useState<PendingSave | null>(null)
  const [pendingOpportunityTypeChange, setPendingOpportunityTypeChange] = useState<PendingOpportunityTypeChange | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<CollapsibleSectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)

  useEffect(() => {
    resetDraft(savedOpportunity ? cloneOpportunityDraft(savedOpportunity) : null)
    setSaveMessages([])
    setHasAttemptedSave(false)
  }, [resetDraft, savedOpportunity])

  useEffect(() => {
    setProjectChanges([])
  }, [opportunityId])

  const metadata = useMemo(() => (draft ? getOpportunityMetadataForOpportunity(draft) : null), [draft])
  const visibleRequirementTypes = useMemo(
    () => (draft ? getVisibleRequirementTypesForOpportunity(draft) : []),
    [draft],
  )
  const account = useMemo(
    () => (draft ? accounts.find((candidate) => candidate.id === draft.accountId) : undefined),
    [accounts, draft],
  )
  const sidSystems = useMemo(
    () => (draft ? getOpportunityExistingSidSystems(draft, accounts, systems) : []),
    [accounts, draft, systems],
  )
  const accountSystems = useMemo(
    () => (draft ? getAccountSystems(draft.accountId, systems) : []),
    [draft, systems],
  )
  const accountTenants = useMemo(
    () => (draft ? getAccountTenants(draft.accountId, tenants).filter((tenant) => tenantFormType(tenant) !== 'INTERNAL') : []),
    [draft, tenants],
  )
  const createdProjects = useMemo(
    () =>
      draft
        ? createdProjectsForOpportunity(draft, savedOpportunity, projects)
        : [],
    [draft, projects, savedOpportunity?.opportunityId],
  )
  const validationMessages = useMemo(
    () => (draft ? validateOpportunity(draft, { accounts, systems, tenants }) : []),
    [accounts, draft, systems, tenants],
  )
  const validationErrors = validationMessages.filter((message) => message.level === 'error')
  const validationWarnings = validationMessages.filter((message) => message.level === 'warning')
  const countryOptions = useMemo(
    () => Array.from(new Set(accounts.map((candidate) => candidate.country).filter(Boolean))).sort(),
    [accounts],
  )
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

  function opportunityProjectMilestoneSummary() {
    const activeProject = createdProjects.find((project) => project.progressStatus !== 'DONE') ?? createdProjects[0]
    if (!activeProject) return { current: '', next: '' }
    const progress = deriveProjectProgress(activeProject)
    const nextMilestone = orderedProjectMilestones(activeProject).find(
      (milestone) => milestone.name !== progress.currentMilestone && projectMilestoneStatus(activeProject, milestone.id) !== 'DONE',
    )
    return {
      current: progress.currentMilestone || '',
      next: nextMilestone?.name ?? '',
    }
  }

  function patchDraft(patch: Partial<Opportunity>) {
    if (isViewMode) return
    setDraft((current) => (current ? { ...current, ...patch } : current))
    setSaveMessages([])
  }

  function toggleSection(sectionId: CollapsibleSectionId) {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

  function headerChanged(field: keyof Opportunity): boolean {
    return !valuesEqual(currentDraft[field], currentSavedOpportunity[field])
  }

  function activePocProject(opportunity: Opportunity, saved: Opportunity): Project | undefined {
    return activePocProjectForOpportunity(opportunity, saved, projects)
  }

  function tenantAction(tenantId: string): ExistingActionValue {
    const hasChange =
      visibleRequirementTypes.includes('B') &&
      currentDraft.changeRequestRequirements.some((requirement) => requirement.tenantId === tenantId)
    const hasRenewal =
      visibleRequirementTypes.includes('C') &&
      currentDraft.standardRenewalRequirements.some((requirement) => requirement.tenantId === tenantId)

    if (hasChange && hasRenewal) return combinedRenewalActionLabel(currentDraft)
    if (hasChange) return changeActionLabel(currentDraft)
    if (hasRenewal) return 'Standard renewal'
    return 'Not selected'
  }

  function systemAction(systemId: string): ExistingActionValue {
    return visibleRequirementTypes.includes('A') &&
      currentDraft.newTenantRequirements.some(
        (requirement) => requirement.deployTarget === 'EXISTING_SID' && requirement.existingSystemId === systemId,
      )
      ? 'New tenant'
      : 'Not selected'
  }

  function systemSelectionDisabled(rowId: string, systemId: string): boolean {
    return currentDraft.newTenantRequirements.some(
      (requirement) =>
        requirement.id !== rowId &&
        requirement.deployTarget === 'EXISTING_SID' &&
        requirement.existingSystemId === systemId,
    )
  }

  function tenantSelectionDisabled(kind: RequirementGridKind, rowId: string, tenantId: string): boolean {
    if (kind !== 'B' && kind !== 'C') return false

    const duplicateInChangeGrid = currentDraft.changeRequestRequirements.some(
      (requirement) => requirement.id !== rowId && requirement.tenantId === tenantId,
    )
    const duplicateInRenewalGrid = currentDraft.standardRenewalRequirements.some(
      (requirement) => requirement.id !== rowId && requirement.tenantId === tenantId,
    )

    if (kind === 'B') return duplicateInChangeGrid
    return duplicateInRenewalGrid
  }

  function firstAvailableTenant(kind: 'B' | 'C'): Tenant | undefined {
    return accountTenants.find((tenant) => !tenantSelectionDisabled(kind, '', tenant.id))
  }

  function headerFieldWidthClass(key: OpportunityHeaderField['key'] | 'stage'): string {
    if (key === 'opportunityName' || key === 'accountId' || key === 'warrantyRecordId') return 'w-64'
    if (key === 'salesManagerId') return 'w-56'
    if (key === 'opportunityId' || key === 'timeZone') return 'w-48'
    if (key === 'deliveryDate' || key === 'pocStartDate' || key === 'pocEndDate') return 'w-40'
    if (key === 'warrantyServiceMonths' || key === 'dealPackage') return 'w-36'
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
      opportunityId: ['Opportunity ID is required.'],
      opportunityName: ['Opportunity name is required.'],
      accountId: ['Account is required.'],
      salesManagerId: ['Sales Manager / Deal Owner is required.'],
      deliveryDate: ['Delivery date is required.'],
      pocStartDate: ['Start Date is required.', 'POC End Date cannot be earlier than POC Start Date.'],
      pocEndDate: ['End Date is required.', 'POC End Date cannot be earlier than POC Start Date.'],
      warrantyRecordId: ['Warranty record to extend is required.'],
    }
    return (labels[fieldKey] ?? []).some((message) => saveMessages.includes(message))
  }

  function updateAccount(accountId: string) {
    if (isViewMode) return
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

  function applyOpportunityTypeChange(nextChange: PendingOpportunityTypeChange, deleteIrrelevantRequirements: boolean) {
    if (isViewMode) return
    patchDraft(opportunityTypeChangePatch(nextChange, deleteIrrelevantRequirements))
    setPendingOpportunityTypeChange(null)
  }

  function requestOpportunityTypeChange(nextChange: PendingOpportunityTypeChange) {
    if (isViewMode) return
    if (isSameOpportunityTypeChange(currentDraft, nextChange)) return
    if (!shouldConfirmOpportunityTypeChange(currentDraft, nextChange)) {
      applyOpportunityTypeChange(nextChange, false)
      return
    }
    setPendingOpportunityTypeChange(nextChange)
  }

  function updateType(type: OpportunityType) {
    if (isViewMode) return
    const nextSubType = opportunitySubTypeForTypeChange(currentDraft.subType, type)
    requestOpportunityTypeChange({ type, subType: nextSubType })
  }

  function updateStage(stage: Opportunity['stage']) {
    if (isViewMode) return
    if (stage === 'POC') {
      patchDraft({
        stage,
        financialProfile: currentDraft.financialProfile ?? (currentDraft.subType === 'PAID' ? 'PAID' : 'FREE'),
      })
      return
    }

    patchDraft({ stage })
  }

  function addRequirement(kind: RequirementGridKind) {
    if (isViewMode) return
    const firstTenant = kind === 'B' || kind === 'C' ? firstAvailableTenant(kind) : accountTenants[0]
    const firstWarranty = firstTenant
      ? warrantyRecordForTenant(firstTenant.id, warrantyRecords)
      : undefined

    if (kind === 'A') {
      patchDraft({
        newTenantRequirements: [
          ...currentDraft.newTenantRequirements,
          createNewTenantRequirement(
            currentDraft.newTenantRequirements.length,
            currentDraft.country,
            currentDraft.dealPackage ?? 'Silver',
          ),
        ],
      })
      return
    }

    if (kind === 'B') {
      if (!firstTenant) return
      patchDraft({
        changeRequestRequirements: [
          ...currentDraft.changeRequestRequirements,
          createChangeRequestRequirement(currentDraft.changeRequestRequirements.length, firstTenant, currentDraft.country),
        ],
      })
      return
    }

    if (!firstTenant) return
    patchDraft({
      standardRenewalRequirements: [
        ...currentDraft.standardRenewalRequirements,
        createStandardRenewalRequirement(currentDraft.standardRenewalRequirements.length, firstTenant, firstWarranty),
      ],
    })
  }

  function deleteRequirement(kind: RequirementGridKind, rowId: string) {
    if (isViewMode) return
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

  function changeRequirementPackage(rowId: string, dealPackage: OpportunityDealPackage) {
    if (isViewMode) return
    patchDraft({
      newTenantRequirements: currentDraft.newTenantRequirements.map((row) =>
        row.id === rowId
          ? newTenantRequirementWithDealPackage(row, currentDraft.country, dealPackage)
          : row,
      ),
    })
  }

  function updateRequirement(kind: RequirementGridKind, rowId: string, key: string, value: string | string[] | number | null) {
    if (isViewMode) return
    const configurationPatch =
      key === 'hostingType' && value === 'On premise'
        ? { [key]: value, cloudPlatform: '' }
        : { [key]: value }

    if (kind === 'A') {
      const nextRows = currentDraft.newTenantRequirements.map((row) => {
        if (row.id !== rowId) return row
        const patch =
          key === 'deployTarget' && value === 'NEW_SYSTEM'
            ? { deployTarget: value, existingSystemId: null }
            : configurationPatch
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
              ...configurationPatch,
              ...(key === 'tenantId' && selectedTenant
                ? { ...applicationConfigurationPatchFromTenant(selectedTenant), systemId: selectedTenant.systemId }
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
        ? warrantyRecordById(value, warrantyRecords)
        : undefined
    const nextRows = currentDraft.standardRenewalRequirements.map((row) =>
      row.id === rowId
        ? ({
            ...row,
            ...configurationPatch,
            ...(key === 'tenantId' && selectedTenant
              ? {
                  ...applicationConfigurationPatchFromTenant(selectedTenant),
                  systemId: selectedTenant.systemId,
                  warrantyRecordId:
                    warrantyRecordForTenant(selectedTenant.id, warrantyRecords)?.warrantyRecordId ?? '',
                  warrantyStatus: selectedTenant.warrantyStatus,
                  warrantyEndDate: selectedTenant.warrantyEndDate,
                }
              : {}),
            ...warrantyRecordPatch(selectedWarranty),
          } as StandardRenewalRequirement)
        : row,
    )
    patchDraft({ standardRenewalRequirements: nextRows })
  }

  function discardChanges() {
    resetDraft(cloneOpportunityDraft(currentSavedOpportunity))
    setSaveMessages([])
    setHasAttemptedSave(false)
  }

  function cancelChanges() {
    resetDraft(cloneOpportunityDraft(currentSavedOpportunity))
    setSaveMessages([])
    navigate('/opportunities')
  }

  function undoLastChange() {
    undo()
    setSaveMessages([])
  }

  function switchDetailTab(nextTab: OpportunityDetailTab) {
    const scrollX = window.scrollX
    const scrollY = window.scrollY
    setActiveDetailTab(nextTab)
    window.requestAnimationFrame(() => window.scrollTo(scrollX, scrollY))
  }

  function executeSave(options: PendingSave = {}, lifecycleOptions?: { pocAction?: PocProjectSyncAction }) {
    if (isViewMode) return
    const result = saveOpportunityWithProjectSync(currentDraft, currentSavedOpportunity, lifecycleOptions)
    resetDraft(cloneOpportunityDraft(result.opportunity))
    setProjectChanges(result.projectChanges)
    setSaveMessages([])
    setPendingPocSave(null)
    setPendingWonSave(null)
    const returnTo = typeof location.state === 'object' && location.state && 'returnTo' in location.state
      ? String(location.state.returnTo ?? '')
      : ''
    if (!options.stayOnPage && returnTo) navigate(returnTo)
  }

  function selectAllTenants(kind: 'B' | 'C') {
    if (isViewMode) return
    const tenantsToAdd = accountTenants.filter((tenant) => !tenantSelectionDisabled(kind, '', tenant.id))

    if (tenantsToAdd.length === 0) return

    if (kind === 'B') {
      patchDraft({
        changeRequestRequirements: [
          ...currentDraft.changeRequestRequirements,
          ...tenantsToAdd.map((tenant, index) =>
            createChangeRequestRequirement(
              currentDraft.changeRequestRequirements.length + index,
              tenant,
              currentDraft.country,
            ),
          ),
        ],
      })
      return
    }

    patchDraft({
      standardRenewalRequirements: [
        ...currentDraft.standardRenewalRequirements,
        ...tenantsToAdd.map((tenant, index) =>
            createStandardRenewalRequirement(
              currentDraft.standardRenewalRequirements.length + index,
              tenant,
              warrantyRecordForTenant(tenant.id, warrantyRecords),
            ),
        ),
      ],
    })
  }

  function saveChanges(options: PendingSave = {}) {
    if (isViewMode) return
    setIsSaveMenuOpen(false)
    setHasAttemptedSave(true)
    const messages = validateOpportunity(currentDraft, { accounts, systems, tenants })
      .filter((message) => message.level === 'error')
      .map((message) => message.message)

    validateOpportunityTransition(currentDraft, currentSavedOpportunity).forEach((message) => messages.push(message))

    if (messages.length > 0) {
      setSaveMessages(messages)
      return
    }

    if (shouldConfirmWonTransition(currentDraft, currentSavedOpportunity)) {
      setPendingWonSave(options)
      return
    }

    if (shouldConfirmPocProjectSync(currentDraft, currentSavedOpportunity, projects)) {
      setPendingPocSave(options)
      return
    }

    executeSave(options)
  }

  function renderHeaderField(field: OpportunityHeaderField) {
    if (field.key === 'type') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('type'), true, headerMissing(field.key))}
            value={currentDraft.type === 'POC' ? 'DELIVERY' : currentDraft.type}
            onChange={(event) => updateType(event.target.value as OpportunityType)}
          >
            {OPPORTUNITY_TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type === 'DELIVERY' ? 'Delivery' : 'Renewal'}
              </option>
            ))}
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
            onChange={(event) =>
              requestOpportunityTypeChange({
                type: currentDraft.type,
                subType: event.target.value as OpportunitySubType,
              })
            }
          >
            {opportunitySubTypeOptions(currentDraft.type).map((subType) => (
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

    if (field.key === 'dealPackage') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={headerFieldWidthClass(field.key)}>
          <select
            className={headerControlClassName(headerChanged('dealPackage'), true, headerMissing(field.key))}
            value={currentDraft.dealPackage ?? 'Silver'}
            onChange={(event) => patchDraft({ dealPackage: event.target.value as OpportunityDealPackage })}
          >
            <option value="Silver">Silver</option>
            <option value="Gold">Gold</option>
            <option value="Platinum">Platinum</option>
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
                {record.warrantyRecordId} - {record.status} - {formatDate(record.endDate, { fallback: 'No end' })}
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
    const isWonLocked = currentSavedOpportunity.stage === 'WON'
    return (
      <div className="flex flex-wrap items-start gap-3">
        <FormField label="Stage" controlWidthClassName={headerFieldWidthClass('stage')}>
          <select
            className={headerControlClassName(headerChanged('stage'), !isWonLocked, headerMissing('stage'))}
            value={currentDraft.stage}
            disabled={isWonLocked}
            onChange={(event) => updateStage(event.target.value as Opportunity['stage'])}
          >
            <option value="OPEN">Open</option>
            <option value="POC">POC</option>
            <option value="WON">Won</option>
          </select>
        </FormField>
        {currentDraft.stage === 'POC' ? (
          <FormField label="Financial Profile" controlWidthClassName="w-32">
            <select
              className={headerControlClassName(headerChanged('subType'), true, false)}
              value={currentDraft.financialProfile ?? (currentDraft.subType === 'PAID' ? 'PAID' : 'FREE')}
              onChange={(event) => patchDraft({ financialProfile: event.target.value as Opportunity['financialProfile'] })}
            >
              <option value="FREE">Free</option>
              <option value="PAID">Paid</option>
            </select>
          </FormField>
        ) : null}
      </div>
    )
  }

  const headerFieldByKey = new Map(metadata.headerFields.map((field) => [field.key, field]))
  const lineOneKeys: OpportunityHeaderField['key'][] = ['salesManagerId', 'opportunityId', 'opportunityName']
  const commercialLineOneKeys: OpportunityHeaderField['key'][] = ['type', 'subType', 'dealPackage']
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
    ...commercialLineOneKeys,
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

  function renderActionBadge(action: ExistingActionValue) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${opportunityActionBadgeClassName(action)}`}>
        {action}
      </span>
    )
  }

  function projectChangeStatus(projectId: string): ProjectLifecycleChange['changeStatus'] | null {
    const currentChanges = projectChanges.length > 0 ? projectChanges : storedProjectChanges
    return currentChanges.find((change) => change.projectId === projectId)?.changeStatus ?? null
  }

  function renderProjectChangeBadge(changeStatus: ProjectLifecycleChange['changeStatus'] | null) {
    if (!changeStatus) return null
    return <StatusBadge label={changeStatus} variant={changeStatus === 'New' ? 'done' : 'in_progress'} />
  }

  function renderExistingTenantsAndSystemsSection() {
    const tenantSystemIds = new Set(accountTenants.map((tenant) => tenant.systemId))
    const systemOnlyRows = accountSystems.filter((system) => !tenantSystemIds.has(system.id))
    const colSpan = 8

    return (
      <CollapsibleSection
        title="Customer Existing Tenants / Systems"
        subtitle={`Existing tenant and system references for ${account?.accountName ?? 'the selected account'}.`}
        collapsed={collapsedSections.existingSystems}
        onToggle={() => toggleSection('existingSystems')}
      >

        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Action Chosen</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">TID</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Tenant Name</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">SID</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Delivery PID</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Current product/config summary</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Warranty status</th>
                <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Warranty end date</th>
              </tr>
            </thead>
            <tbody>
              {accountTenants.map((tenant) => {
                const action = tenantAction(tenant.id)
                const tenantSid = resolveTenantSid(tenant.id, tenants, systems)
                return (
                  <tr key={`tenant-${tenant.id}`}>
                    <td className="border border-sf-border px-2 py-1">{renderActionBadge(action)}</td>
                    <td className="border border-sf-border px-2 py-1">
                      <BusinessObjectLink reference={tenantReference(tenant)}>{tenant.tid}</BusinessObjectLink>
                    </td>
                    <td className="border border-sf-border px-2 py-1">{tenantDisplayName(tenant)}</td>
                    <td className="border border-sf-border px-2 py-1">
                      {tenantSid ? <BusinessIdLink objectType="SYSTEM" businessId={tenantSid}>{tenantSid}</BusinessIdLink> : ''}
                    </td>
                    <td className="border border-sf-border px-2 py-1">
                      {tenant.deliveryPid ? <BusinessIdLink objectType="PROJECT" businessId={tenant.deliveryPid}>{tenant.deliveryPid}</BusinessIdLink> : ''}
                    </td>
                    <td className="border border-sf-border px-2 py-1">{tenantConfigurationSummary(tenant)}</td>
                    <td className="border border-sf-border px-2 py-1">
                      {tenant.warrantyStatus ? (
                        <span className="inline-flex items-center gap-1.5">
                          <AlertStatusIcon variant={alertVariantForWarrantyStatus(tenant.warrantyStatus)} label={tenant.warrantyStatus} />
                          {tenant.warrantyStatus}
                        </span>
                      ) : ''}
                    </td>
                    <td className="border border-sf-border px-2 py-1">{tenant.warrantyEndDate ?? ''}</td>
                  </tr>
                )
              })}
              {systemOnlyRows.map((system) => {
                const action = systemAction(system.id)
                return (
                  <tr key={`system-${system.id}`}>
                    <td className="border border-sf-border px-2 py-1">{renderActionBadge(action)}</td>
                    <td className="border border-sf-border px-2 py-1" />
                    <td className="border border-sf-border px-2 py-1" />
                    <td className="border border-sf-border px-2 py-1">
                      <BusinessObjectLink reference={systemReference(system)}>{system.sid ?? system.machineId ?? system.id}</BusinessObjectLink>
                    </td>
                    <td className="border border-sf-border px-2 py-1">
                      {system.deliveryPid ? <BusinessIdLink objectType="PROJECT" businessId={system.deliveryPid}>{system.deliveryPid}</BusinessIdLink> : ''}
                    </td>
                    <td className="border border-sf-border px-2 py-1">
                      {[system.productType, system.hostingType, system.cloudPlatform].filter(Boolean).join(' | ')}
                    </td>
                    <td className="border border-sf-border px-2 py-1" />
                    <td className="border border-sf-border px-2 py-1" />
                  </tr>
                )
              })}
              {accountTenants.length === 0 && systemOnlyRows.length === 0 ? (
                <tr>
                  <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={colSpan}>
                    No existing tenants or systems for this customer.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CollapsibleSection>
    )
  }

  function renderRequirementGrid(kind: RequirementGridKind) {
    if (kind === 'A') {
      return (
        <RequirementGrid
          key={kind}
          title="Grid A: New Tenant Requirements"
          kind="A"
          collapsed={collapsedSections.gridA}
          columns={requirementAColumns}
          draft={currentDraft}
          saved={currentSavedOpportunity}
          accountTenants={accountTenants}
          sidSystems={sidSystems}
          warrantyRecords={warrantyRecords}
          countryOptions={countryOptions}
          saveMessages={saveMessages}
          isTenantOptionDisabled={tenantSelectionDisabled}
          isSystemOptionDisabled={systemSelectionDisabled}
          onAddRow={() => addRequirement('A')}
          onDeleteRow={(rowId) => deleteRequirement('A', rowId)}
          onChangePackage={changeRequirementPackage}
          onUpdateRow={(rowId, key, value) => updateRequirement('A', rowId, key, value)}
          onToggleCollapsed={() => toggleSection('gridA')}
        />
      )
    }

    if (kind === 'B') {
      return (
        <RequirementGrid
          key={kind}
          title="Grid B: Change Request Requirements"
          kind="B"
          collapsed={collapsedSections.gridB}
          columns={requirementBColumns}
          draft={currentDraft}
          saved={currentSavedOpportunity}
          accountTenants={accountTenants}
          sidSystems={sidSystems}
          warrantyRecords={warrantyRecords}
          countryOptions={countryOptions}
          saveMessages={saveMessages}
          isTenantOptionDisabled={tenantSelectionDisabled}
          isSystemOptionDisabled={systemSelectionDisabled}
          onSelectAllTenants={() => selectAllTenants('B')}
          onAddRow={() => addRequirement('B')}
          onDeleteRow={(rowId) => deleteRequirement('B', rowId)}
          onUpdateRow={(rowId, key, value) => updateRequirement('B', rowId, key, value)}
          onToggleCollapsed={() => toggleSection('gridB')}
        />
      )
    }

    return (
      <RequirementGrid
        key={kind}
        title="Tenants to Renew"
        kind="C"
        collapsed={collapsedSections.gridC}
        columns={requirementCColumns}
        draft={currentDraft}
        saved={currentSavedOpportunity}
        accountTenants={accountTenants}
        sidSystems={sidSystems}
        warrantyRecords={warrantyRecords}
        countryOptions={countryOptions}
        saveMessages={saveMessages}
        isTenantOptionDisabled={tenantSelectionDisabled}
        isSystemOptionDisabled={systemSelectionDisabled}
        onSelectAllTenants={() => selectAllTenants('C')}
        onAddRow={() => addRequirement('C')}
        onDeleteRow={(rowId) => deleteRequirement('C', rowId)}
        onUpdateRow={(rowId, key, value) => updateRequirement('C', rowId, key, value)}
        onToggleCollapsed={() => toggleSection('gridC')}
      />
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col">
      <PageHeader
        title="Opportunity Workspace"
        subtitle={`${currentDraft.opportunityId} - ${currentDraft.opportunityName || 'Unnamed opportunity'} - ${metadata.sourceSheet} - ${visibleRequirementTypes.join('+') || 'No'} visible requirement grids`}
        actions={
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold text-sf-text hover:bg-sf-surface-alt"
            onClick={() => navigate('/opportunities')}
          >
            Back to Opportunities
          </button>
        }
      />

      <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border border-sf-border bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 text-sm text-sf-text-muted">
          <span>{isViewMode ? 'View mode.' : isDirty ? 'Unsaved changes are highlighted in yellow.' : 'No unsaved changes.'}</span>
          <StatusBadge
            label={hasAttemptedSave && validationErrors.length > 0 ? 'Needs attention' : hasAttemptedSave && validationWarnings.length > 0 ? 'Warnings' : 'Ready'}
            variant={hasAttemptedSave && validationErrors.length > 0 ? 'error' : hasAttemptedSave && validationWarnings.length > 0 ? 'warning' : 'done'}
          />
        </div>
        <div className="flex gap-2">
          {isViewMode ? null : (
            <>
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canUndo}
                onClick={undoLastChange}
              >
                Undo
              </button>
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={discardChanges}
              >
                Revert
              </button>
            </>
          )}
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={cancelChanges}>
            {isViewMode ? 'Back' : 'Cancel'}
          </button>
          {isViewMode ? null : (
            <div className="relative inline-flex">
              <button
                type="button"
                className="rounded-l border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white hover:opacity-90"
                onClick={() => saveChanges()}
              >
                Save
              </button>
              <button
                type="button"
                className="inline-flex items-center rounded-r border border-l-0 border-sf-brand bg-sf-brand px-2 py-1 text-sm text-white hover:opacity-90"
                aria-haspopup="menu"
                aria-expanded={isSaveMenuOpen}
                title="Save actions"
                onClick={() => setIsSaveMenuOpen((current) => !current)}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              {isSaveMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded border border-sf-border bg-white py-1 text-sm shadow-lg" role="menu">
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sf-text hover:bg-sf-surface-alt"
                    role="menuitem"
                    onClick={() => saveChanges({ stayOnPage: true })}
                  >
                    Apply Changes
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <div className={['sf-form-content-scroll min-h-0 flex-1 space-y-4 pb-2 pr-1', isViewMode ? 'sf-view-mode' : ''].filter(Boolean).join(' ')}>
      {hasAttemptedSave && validationMessages.length > 0 ? (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="font-semibold">Opportunity validation</p>
          <ul className="mt-1 list-inside list-disc">
            {validationMessages.map((message) => (
              <li key={`${message.level}:${message.message}`}>
                <span className="font-semibold capitalize">{message.level}</span>: {message.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

      {pendingWonSave ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded border border-sf-border bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-sf-text">Mark Opportunity as WON?</h2>
            <p className="mt-2 text-sm text-sf-text-muted">
              WON is irreversible. After this, no new POC projects can be created and one final Delivery/Renewal project
              will be created or updated.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={() => setPendingWonSave(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white hover:opacity-90"
                onClick={() => executeSave(pendingWonSave)}
              >
                Mark as WON
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingPocSave ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded border border-sf-border bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-sf-text">Create POC project?</h2>
            <p className="mt-2 text-sm text-sf-text-muted">
              {activePocProject(currentDraft, currentSavedOpportunity)
                ? `POC Project ${activePocProject(currentDraft, currentSavedOpportunity)?.pid} is not Done. What would you like to do?`
                : 'This Opportunity is in POC stage. What would you like to do?'}
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={() => executeSave(pendingPocSave, { pocAction: 'DO_NOT_CREATE' })}
              >
                Do Not Create
              </button>
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={() => executeSave(pendingPocSave, { pocAction: 'CREATE_NEW_POC' })}
              >
                Create New POC
              </button>
              {activePocProject(currentDraft, currentSavedOpportunity) ? (
                <button
                  type="button"
                  className="rounded border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white hover:opacity-90"
                  onClick={() => executeSave(pendingPocSave, { pocAction: 'UPDATE_EXISTING_POC' })}
                >
                  Update Latest POC
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {pendingOpportunityTypeChange ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 shadow-xl">
            <h2 className="text-base font-semibold text-sf-text">Opportunity Type Change</h2>
            <p className="mt-2 text-sm text-sf-text-muted">
              Changing the Opportunity Type/Subtype may make existing requirement records irrelevant.
            </p>
            <p className="mt-2 text-sm text-sf-text-muted">
              What would you like to do with the existing requirement records?
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={() => setPendingOpportunityTypeChange(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
                onClick={() => applyOpportunityTypeChange(pendingOpportunityTypeChange, false)}
              >
                Keep Existing Requirements
              </button>
              <button
                type="button"
                className="rounded border border-red-200 bg-red-50 px-3 py-1 text-sm text-red-700 hover:bg-red-100"
                onClick={() => applyOpportunityTypeChange(pendingOpportunityTypeChange, true)}
              >
                Delete Existing Requirements
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CollapsibleSection
        title="Commercial Profile"
        subtitle="Sales-owned opportunity identity, lifecycle, commercial terms, and delivery intent."
        collapsed={collapsedSections.opportunityHeader}
        onToggle={() => toggleSection('opportunityHeader')}
        headerActions={
          <span className="rounded-full border border-sf-border px-2 py-0.5 text-sm text-sf-text-muted">
            Account/End User:{' '}
            {account ? (
              <BusinessObjectLink reference={accountReference(account)}>{account.accountName}</BusinessObjectLink>
            ) : (
              'Not set'
            )}
          </span>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(lineOneKeys)}</div>

          <div className="border-t border-sf-border" />

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase text-sf-text-muted">Commercial Data</h3>
            <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(commercialLineOneKeys)}</div>
            <div className="flex flex-wrap items-start gap-3">{renderStageField()}</div>
            <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(commercialTermKeys)}</div>
          </div>

          <div className="flex flex-wrap items-start gap-3">{renderHeaderFields(lineThreeKeys)}</div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold uppercase text-sf-text-muted">Operational Data</h3>
            <div className="flex flex-wrap items-start gap-3">
              <FormField label="Current Milestone" controlWidthClassName="w-56">
                <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
                  {opportunityProjectMilestoneSummary().current || '-'}
                </div>
              </FormField>
              <FormField label="Next Milestone" controlWidthClassName="w-56">
                <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
                  {opportunityProjectMilestoneSummary().next || '-'}
                </div>
              </FormField>
            </div>
          </div>

          {operationalMetadataFields.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase text-sf-text-muted">Operational metadata</h3>
              <div className="flex flex-wrap items-start gap-3">
                {operationalMetadataFields.map(renderHeaderField)}
              </div>
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      {renderExistingTenantsAndSystemsSection()}

      <section className="sf-card overflow-hidden">
        <div className="sticky top-0 z-10 flex border-b border-sf-border bg-sf-surface-alt">
          <button
            type="button"
            className={[
              'sf-view-mode-allow border-b-2 px-4 py-2 text-base font-semibold',
              activeDetailTab === 'requirements'
                ? 'border-sf-brand bg-white text-sf-text'
                : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
            ].join(' ')}
            aria-selected={activeDetailTab === 'requirements'}
            onClick={() => switchDetailTab('requirements')}
          >
            Requirements
          </button>
          <button
            type="button"
            className={[
              'sf-view-mode-allow border-b-2 px-4 py-2 text-base font-semibold',
              activeDetailTab === 'project'
                ? 'border-sf-brand bg-white text-sf-text'
                : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
            ].join(' ')}
            aria-selected={activeDetailTab === 'project'}
            onClick={() => switchDetailTab('project')}
          >
            Related Projects
          </button>
        </div>

        <div className="min-h-[60vh]">
        {activeDetailTab === 'requirements' ? (
          <div className="space-y-4 p-3" role="tabpanel" aria-label="Requirements">
            {visibleRequirementTypes.map((kind) => renderRequirementGrid(kind))}
          </div>
        ) : (
          <div className="space-y-2 p-3" role="tabpanel" aria-label="Related Projects">
            <CollapsibleSection
              title="Related Projects"
              collapsed={collapsedSections.createdProject}
              onToggle={() => toggleSection('createdProject')}
              className="space-y-2"
            >
              {createdProjects.length > 0 ? (
                <div className="overflow-x-auto rounded border border-sf-border bg-white">
                  <table className="min-w-full border-collapse text-sm">
                    <thead className="bg-sf-surface-alt text-left">
                      <tr>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Change Status</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">PID</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Project Type</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Project Subtype</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Project Status</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Created Date</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Updated Date</th>
                        <th className="border border-sf-border px-2 py-1 text-sm font-semibold">Link to Project</th>
                      </tr>
                    </thead>
                    <tbody>
                      {createdProjects.map((project) => (
                        <tr
                          key={project.id}
                          className={project.progressStatus === 'DONE' ? 'bg-blue-50 hover:bg-blue-100' : 'bg-green-50 hover:bg-green-100'}
                        >
                          <td className="border border-sf-border px-2 py-1 text-sm">{renderProjectChangeBadge(projectChangeStatus(project.id))}</td>
                          <td className="border border-sf-border px-2 py-1 text-sm">
                            <BusinessObjectLink reference={projectReference(project)} className="font-medium">
                              {project.pid}
                            </BusinessObjectLink>
                          </td>
                          <td className="border border-sf-border px-2 py-1 text-sm">{project.mainType}</td>
                          <td className="border border-sf-border px-2 py-1 text-sm">{project.subType}</td>
                          <td className="border border-sf-border px-2 py-1 text-sm">
                            <StatusBadge
                              label={project.progressStatus === 'DONE' ? 'Done' : 'Open'}
                              variant={badgeVariantForProjectStatus(project.progressStatus)}
                            />
                          </td>
                          <td className="border border-sf-border px-2 py-1 text-sm">{formatDateTime(project.createdAt)}</td>
                          <td className="border border-sf-border px-2 py-1 text-sm">{formatDateTime(project.updatedAt)}</td>
                          <td className="border border-sf-border px-2 py-1 text-sm">
                            <BusinessObjectLink reference={projectReference(project)}>
                              Open project
                            </BusinessObjectLink>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
                  No related projects yet.
                </div>
              )}
            </CollapsibleSection>
          </div>
        )}
        </div>
      </section>
      </div>
    </div>
  )
}
