import { type KeyboardEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/record'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { AlertStatusIcon, FormField, PlaceholderCard, RichTextContent, RichTextEditor } from '@/components/ui'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import {
  ADDITIONAL_FEATURE_OPTIONS,
  AI_OPTIONS,
  CROSS_SYSTEM_OPTIONS,
  YES_NO_OPTIONS,
  type RequirementColumnMetadata,
} from '@/config/opportunity-metadata'
import {
  TENANT_CONFIGURATION_FIELDS,
  type TenantConfigurationFieldMetadata,
} from '@/config/application-configuration-fields'
import type {
  Opportunity,
  Project,
  System,
  Tenant,
  TenantConfiguration,
  TenantConfigurationHistoryRecord,
  TenantFormType,
  TenantRemark,
  TenantWarranty,
  YesNo,
} from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'
import {
  applicationConfigurationValue,
} from '@/domain/application-configuration'
import {
  ENGAGEMENT_CIRCLE_EMPTY_TEXT,
  ENGAGEMENT_CIRCLE_TABLE_HEADERS,
  ENGAGEMENT_CIRCLE_TAB_LABEL,
  inheritedEngagementCircleForTenant,
} from '@/domain/engagement-circle'
import { hostingSnapshotFromSystem } from '@/domain/hosting-context'
import {
  canManageWarrantyCollection,
  computeTenantWarranties,
  createTenantWarranty,
  displayWarrantyStatus,
  parseWarrantyPredecessorReference,
  predecessorRefsForWarranty,
  predecessorReference,
  splitWarrantyPredecessors,
  successorRefsForWarranty,
  tenantWarrantyHeaderStatusReadModel,
  isSelfWarrantyPredecessorSelection,
  validateWarrantyEditDraft,
  warrantyManageabilityMessage,
  warrantyStatusSeverity,
} from '@/domain/warranty-collection'
import {
  cloneTenant,
  derivedTenantOperationalMode,
  effectiveTenantOperationalMode,
  isManualTenantOperationalMode,
  tenantConfigurationFromTenant,
  tenantConfigurationSaveDraft,
  tenantDraftWithAttachedSystem,
  tenantFormType,
  TENANT_MANUAL_OPERATIONAL_MODES,
  TENANT_HOSTING_FIELDS,
  TENANT_REMARK_TYPES,
  validateTenantConfigurationSave,
} from '@/domain/tenant-operations'
import { systemRoutePath } from '@/domain/system-inventory'

type TenantTab = 'configuration' | 'hosting' | 'engagement' | 'usage' | 'documents'
type ConfigKey = keyof TenantConfiguration
type TenantConfigurationColumn = TenantConfigurationFieldMetadata & RequirementColumnMetadata
type RemarkKey = keyof Pick<TenantRemark, 'type' | 'content' | 'dueDate' | 'eventCreated'>
type ActiveMultiSelect = { id: string; key: ConfigKey; selected: string[]; left: number; top: number; width: number }
type WarrantyDialogDraft = Pick<TenantWarranty, 'id' | 'relatedProjectId' | 'predecessor' | 'startDate' | 'endDate' | 'noWarranty' | 'remark'>

const TENANT_TABS: Array<{ id: TenantTab; label: string }> = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'hosting', label: 'Hosting' },
  { id: 'engagement', label: ENGAGEMENT_CIRCLE_TAB_LABEL },
  { id: 'usage', label: 'Usage' },
  { id: 'documents', label: 'Documents' },
]

const CONFIGURATION_FIELDS: TenantConfigurationColumn[] = TENANT_CONFIGURATION_FIELDS as TenantConfigurationColumn[]

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value == null ? '' : String(value)
}

function digitString(value: unknown): string {
  return value == null ? '' : String(value).replace(/\D/g, '')
}

function parseDigitValue(value: string): number | null {
  return value === '' ? null : Number(value)
}

function splitMultiValue(value: string): string[] {
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function preventNonDigitKey(event: KeyboardEvent<HTMLInputElement>) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
  if (!/^\d$/.test(event.key)) event.preventDefault()
}

function formatLocalTimestamp(value = new Date()): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  const hour = String(value.getHours()).padStart(2, '0')
  const minute = String(value.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

function configurationFromTenant(tenant: Tenant, system?: System): TenantConfiguration {
  return tenantConfigurationFromTenant(tenant, system)
}

function formatWarrantyRefs(refs: Array<{ warrantyId: string; tenantId: string }>): string {
  return refs.map((ref) => `${ref.warrantyId};${ref.tenantId}`).join('; ')
}

function formatWarrantyCompatibilityRef(value: string, fallbackTenantId: string): string {
  const ref = parseWarrantyPredecessorReference(value, fallbackTenantId)
  return `${ref.warrantyId};${ref.tenantId}`
}

function licenseNumber(pid: string, sid: string, tid: string): string {
  return [pid, sid, tid].filter(Boolean).join('')
}

function configurationValue(configuration: TenantConfiguration, column: TenantConfigurationColumn): unknown {
  return applicationConfigurationValue(configuration, column)
}

function resolveProject(tenant: Tenant, projects: Project[], projectTenants: Array<{ tenantId: string; projectId: string }>, systems: System[]): Project | undefined {
  const linkedProjectId = projectTenants.find((link) => link.tenantId === tenant.id)?.projectId
  if (linkedProjectId) return projects.find((project) => project.id === linkedProjectId)
  const system = systems.find((candidate) => candidate.id === tenant.systemId)
  return projects.find((project) => project.pid === tenant.deliveryPid || system?.linkedProjectIds?.includes(project.id))
}

function normalizeReference(value: string | undefined | null): string {
  return value?.trim().toLocaleLowerCase() ?? ''
}

function projectOpportunityReference(project: Project | undefined): string {
  if (!project) return ''
  if (project.opportunityId) return project.opportunityId
  return normalizeReference(project.opportunityName).startsWith('sf-opp-') ? project.opportunityName : ''
}

function resolveOpportunity(project: Project | undefined, opportunities: Opportunity[]): Opportunity | undefined {
  if (!project) return undefined
  const opportunityReference = normalizeReference(projectOpportunityReference(project))
  const projectName = normalizeReference(project.opportunityName)

  return opportunities.find(
    (opportunity) =>
      opportunity.opportunityId === project.opportunityId ||
      opportunity.id === project.opportunityId ||
      normalizeReference(opportunity.opportunityId) === opportunityReference ||
      normalizeReference(opportunity.id) === opportunityReference ||
      normalizeReference(opportunity.opportunityName) === projectName ||
      opportunity.pocProjectIds.includes(project.id) ||
      opportunity.finalProjectId === project.id,
  )
}

function ReadonlyTable({ headers, rows, emptyText }: { headers: ReactNode[]; rows: ReactNode[][]; emptyText: string }) {
  return rows.length > 0 ? (
    <div className="overflow-x-auto rounded border border-sf-border bg-white">
      <table className="min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {headers.map((header, index) => (
              <th key={index} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="hover:bg-sf-surface-alt">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-sf-border px-1.5 py-1 align-top text-sf-text">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">{emptyText}</div>
  )
}

export function TenantFormPage() {
  const { tid } = useParams<{ tid: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const tenants = useAppStore((state) => state.tenants)
  const systems = useAppStore((state) => state.systems)
  const projects = useAppStore((state) => state.projects)
  const accounts = useAppStore((state) => state.accounts)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const opportunities = useAppStore((state) => state.opportunities)
  const updateTenant = useAppStore((state) => state.updateTenant)
  const savedTenant = useMemo(() => tenants.find((tenant) => tenant.tid === tid), [tenants, tid])
  const system = useMemo(
    () => systems.find((candidate) => candidate.id === (savedTenant?.hostedSystemId ?? savedTenant?.systemId)),
    [savedTenant, systems],
  )
  const {
    value: draft,
    setValue: setDraft,
    reset: resetDraft,
    undo: undoDraft,
    canUndo,
  } = useUndoHistory<Tenant | null>(savedTenant ? cloneTenant(savedTenant) : null, {
    clone: (value) => (value ? cloneTenant(value) : value),
    isEqual: valuesEqual,
  })
  const [activeTab, setActiveTab] = useState<TenantTab>('configuration')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [editingRemarkIds, setEditingRemarkIds] = useState<string[]>([])
  const [predecessorSelections, setPredecessorSelections] = useState<Record<string, { tenantId: string; warrantyId: string }>>({})
  const [editingWarrantyId, setEditingWarrantyId] = useState<string | null>(null)
  const [warrantyDialogDraft, setWarrantyDialogDraft] = useState<WarrantyDialogDraft | null>(null)
  const [warrantyDialogErrors, setWarrantyDialogErrors] = useState<string[]>([])
  const [activeMultiSelect, setActiveMultiSelect] = useState<ActiveMultiSelect | null>(null)
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [pendingAddNew, setPendingAddNew] = useState<{ key: ConfigKey; value: string } | null>(null)
  const [operationalStatusOpen, setOperationalStatusOpen] = useState(false)
  const isDirty = Boolean(savedTenant && draft && !valuesEqual(savedTenant, draft))
  const navigationBlocker = useBlocker(isDirty)

  useEffect(() => {
    resetDraft(savedTenant ? cloneTenant(savedTenant) : null)
  }, [savedTenant, resetDraft])

  useEffect(() => {
    if (!activeMultiSelect) return
    const activePickerId = activeMultiSelect.id

    function closeMultiSelectOnOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement | null
      if (
        target?.closest(`[data-multiselect-picker="${activePickerId}"]`) ||
        target?.closest(`[data-multiselect-trigger="${activePickerId}"]`)
      ) {
        return
      }
      setActiveMultiSelect(null)
    }

    document.addEventListener('mousedown', closeMultiSelectOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeMultiSelectOnOutsideClick)
  }, [activeMultiSelect])

  if (!savedTenant || !draft) {
    return (
      <PlaceholderCard
        title="Tenant not found"
        description={`No tenant with TID "${tid}" in mock store.`}
      />
    )
  }

  const persistedTenant = savedTenant
  const tenantDraft = draft
  const activeSystem = systems.find((candidate) => candidate.id === (tenantDraft.hostedSystemId ?? tenantDraft.systemId)) ?? system
  const linkedProjects = projects.filter(
    (candidate) =>
      projectTenants.some((link) => link.tenantId === tenantDraft.id && link.projectId === candidate.id) ||
      candidate.pid === tenantDraft.deliveryPid ||
      Boolean(activeSystem?.linkedProjectIds?.includes(candidate.id)),
  )
  const project = resolveProject(tenantDraft, projects, projectTenants, systems) ?? linkedProjects[0]
  const opportunity = resolveOpportunity(project, opportunities)
  const linkedOpportunityId = opportunity?.opportunityId ?? projectOpportunityReference(project)
  const canManageWarranties = canManageWarrantyCollection(project, linkedOpportunityId)
  const inheritedEngagementCircle = inheritedEngagementCircleForTenant(tenantDraft, opportunity)
  const formType = tenantFormType(tenantDraft)
  const configuration = configurationFromTenant(tenantDraft, activeSystem)
  const hosting = hostingSnapshotFromSystem(tenantDraft, activeSystem)
  const countryOptions = Array.from(
    new Set(
      [
        ...accounts.map((account) => account.country),
        opportunity?.country,
        tenantDraft.country,
        activeSystem?.country,
      ].filter((value): value is string => Boolean(value)),
    ),
  ).sort((first, second) => first.localeCompare(second))
  const relatedProjects = linkedProjects
  const computedWarrantiesForTenant = (tenant: Tenant, source: TenantWarranty[]): TenantWarranty[] =>
    computeTenantWarranties(source, tenant, projects, (selectedProject) => resolveOpportunity(selectedProject, opportunities), projectOpportunityReference)
      .map((warranty, index) => ({ ...warranty, firstWarranty: index === 0 }))
  const computedWarranties = (source: TenantWarranty[]): TenantWarranty[] => computedWarrantiesForTenant(tenantDraft, source)
  const draftComputedWarranties = computedWarranties(tenantDraft.warranties ?? [])
  const tenantWarrantyHeaderStatus = tenantWarrantyHeaderStatusReadModel(draftComputedWarranties, tenantDraft.tid).label

  function warrantyOptionsForTenant(selectedTenantId: string, currentWarrantyId: string): Array<{ tenant: Tenant; warranty: TenantWarranty }> {
    if (selectedTenantId === tenantDraft.id) {
      return draftComputedWarranties
        .filter((warranty) => warranty.id !== currentWarrantyId)
        .map((warranty) => ({ tenant: tenantDraft, warranty }))
    }

    const selectedTenant = tenants.find((candidate) => candidate.id === selectedTenantId)
    return selectedTenant
      ? (selectedTenant.warranties ?? []).map((warranty) => ({ tenant: selectedTenant, warranty }))
      : []
  }

  function validationOpportunity(): Opportunity {
    const now = new Date().toISOString()
    return opportunity ?? {
      id: `tenant-config-opportunity-${tenantDraft.id}`,
      opportunityId: linkedOpportunityId,
      opportunityName: project?.opportunityName ?? tenantDraft.tenantName ?? tenantDraft.tid,
      stage: 'OPEN',
      accountId: tenantDraft.accountId,
      salesManagerId: '',
      type: formType === 'POC' ? 'POC' : 'DELIVERY',
      subType: formType === 'POC' ? 'PAID' : 'NEW',
      deliveryDate: project?.deliveryDate ?? null,
      pocStartDate: tenantDraft.pocStartDate ?? null,
      pocEndDate: tenantDraft.pocEndDate ?? null,
      warrantyServiceMonths: null,
      region: activeSystem?.region ?? '',
      country: tenantDraft.country,
      state: activeSystem?.state ?? '',
      timeZone: '',
      timeGroup: tenantDraft.timeGroup,
      currentMilestone: '',
      projectAlerts: [],
      engagementCircles: [],
      newTenantRequirements: [],
      changeRequestRequirements: [],
      standardRenewalRequirements: [],
      pocProjectIds: [],
      finalProjectId: null,
      wonAt: null,
      createdAt: now,
      updatedAt: now,
    }
  }

  function validateTenantConfiguration(): string[] {
    return validateTenantConfigurationSave(
      tenantDraft,
      configuration,
      validationOpportunity(),
      { accounts, systems, tenants, activeSystem },
    )
  }

  function updateConfiguration(key: ConfigKey, value: string | string[] | number | null) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        configuration: {
          ...configurationFromTenant(current, activeSystem),
          [key]: value,
        },
      }
    })
    setMessages([])
  }

  function updateTenantType(nextType: TenantFormType) {
    setDraft((current) =>
      current
        ? {
            ...current,
            tenantType: nextType === 'INTERNAL' ? 'PENLINK_INTERNAL' : nextType === 'POC' ? 'POC' : 'CUSTOMER',
            tenantFormType: nextType,
          }
        : current,
    )
    setMessages([])
  }

  function attachSystem(nextSystemId: string) {
    const nextSystem = systems.find((candidate) => candidate.id === nextSystemId)
    const nextProject = nextSystem?.linkedProjectIds?.[0]
      ? projects.find((candidate) => candidate.id === nextSystem.linkedProjectIds?.[0])
      : undefined
    setDraft((current) =>
      current
        ? tenantDraftWithAttachedSystem(current, nextSystemId, nextSystem, nextProject, new Date().toISOString())
        : current,
    )
    setMessages([])
  }

  function saveTenant(stayOnPage: boolean, onSuccess?: () => void) {
    const nextMessages = validateTenantConfiguration()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      return
    }

    const normalizedDraft = {
      ...tenantDraft,
      warranties: computedWarranties(tenantDraft.warranties ?? []),
    }
    updateTenant(persistedTenant.id, tenantConfigurationSaveDraft(normalizedDraft, persistedTenant, activeSystem).patch)
    setMessages(['Tenant saved.'])
    setSaveMenuOpen(false)
    onSuccess?.()
    const returnTo = typeof location.state === 'object' && location.state && 'returnTo' in location.state
      ? String(location.state.returnTo ?? '')
      : ''
    if (!stayOnPage && returnTo) navigate(returnTo)
  }

  function revertTenant() {
    resetDraft(cloneTenant(persistedTenant))
    setMessages([])
  }

  function cancelTenant() {
    resetDraft(cloneTenant(persistedTenant))
    navigate('/tenants')
  }

  function updateRemark(id: string, key: RemarkKey, value: string | boolean | null) {
    setDraft((current) => {
      if (!current) return current
      return {
        ...current,
        remarks: (current.remarks ?? []).map((remark) => (remark.id === id ? { ...remark, [key]: value } : remark)),
      }
    })
  }

  function saveRemark(id: string) {
    const remarks = tenantDraft.remarks ?? []
    updateTenant(persistedTenant.id, { remarks })
    setEditingRemarkIds((current) => current.filter((remarkId) => remarkId !== id))
    setMessages([`Remark ${remarks.find((remark) => remark.id === id)?.recordId ?? ''} saved.`])
  }

  function editRemark(id: string) {
    setEditingRemarkIds((current) => (current.includes(id) ? current : [...current, id]))
  }

  function addRemark() {
    const now = formatLocalTimestamp()
    const remarkId = `tenant-remark-${crypto.randomUUID()}`
    setDraft((current) => {
      if (!current) return current
      const remarks = current.remarks ?? []
      const remark: TenantRemark = {
        id: remarkId,
        recordId: `R-${String(remarks.length + 1).padStart(3, '0')}`,
        timestamp: now,
        author: 'Current user',
        type: 'Note',
        content: '',
        dueDate: null,
        eventCreated: false,
      }
      return { ...current, remarks: [...remarks, remark] }
    })
    setEditingRemarkIds((current) => [...current, remarkId])
  }

  function deleteRemark(id: string) {
    const remarks = (tenantDraft.remarks ?? []).filter((remark) => remark.id !== id)
    setDraft((current) => (current ? { ...current, remarks } : current))
    updateTenant(persistedTenant.id, { remarks })
  }

  function openWarrantyDialog(warranty: TenantWarranty) {
    setEditingWarrantyId(warranty.id)
    setWarrantyDialogErrors([])
    setWarrantyDialogDraft({
      id: warranty.id,
      relatedProjectId: warranty.relatedProjectId,
      predecessor: warranty.predecessor,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      noWarranty: warranty.noWarranty ?? 'NO',
      remark: warranty.remark,
    })
  }

  function closeWarrantyDialog() {
    setEditingWarrantyId(null)
    setWarrantyDialogDraft(null)
    setWarrantyDialogErrors([])
  }

  function updateWarrantyDialogDraft(key: keyof WarrantyDialogDraft, value: string | null) {
    setWarrantyDialogDraft((current) => (current ? { ...current, [key]: value } : current))
    setWarrantyDialogErrors([])
  }

  function updateWarrantyInline(id: string, patch: Partial<Pick<TenantWarranty, 'relatedProjectId' | 'startDate' | 'endDate'>>) {
    setDraft((current) => {
      if (!current) return current
      const nextWarranties = (current.warranties ?? []).map((warranty) =>
        warranty.id === id ? { ...warranty, ...patch } : warranty,
      )
      return { ...current, warranties: computedWarrantiesForTenant(current, nextWarranties) }
    })
    setMessages([])
  }

  function addWarrantyDialogPredecessor() {
    if (!editingWarrantyId || !warrantyDialogDraft) return
    const selection = predecessorSelections[editingWarrantyId]
    if (!selection?.tenantId || !selection.warrantyId) return
    const currentWarranty = draftComputedWarranties.find((warranty) => warranty.id === editingWarrantyId)
    if (currentWarranty && isSelfWarrantyPredecessorSelection(currentWarranty, tenantDraft.id, selection.tenantId, selection.warrantyId)) return
    const selectedTenant = selection.tenantId === tenantDraft.id ? tenantDraft : tenants.find((candidate) => candidate.id === selection.tenantId)
    if (!selectedTenant) return
    const predecessorValue = predecessorReference(selection.warrantyId, selectedTenant.tid)
    const currentValues = splitWarrantyPredecessors(warrantyDialogDraft.predecessor)
    if (currentValues.includes(predecessorValue)) return
    setWarrantyDialogDraft({
      ...warrantyDialogDraft,
      predecessor: [...currentValues, predecessorValue].join(';'),
    })
    setPredecessorSelections((current) => ({
      ...current,
      [editingWarrantyId]: { tenantId: selection.tenantId, warrantyId: '' },
    }))
  }

  function removeWarrantyDialogPredecessor(value: string) {
    if (!warrantyDialogDraft) return
    setWarrantyDialogDraft({
      ...warrantyDialogDraft,
      predecessor: splitWarrantyPredecessors(warrantyDialogDraft.predecessor).filter((candidate) => candidate !== value).join(';'),
    })
  }

  function saveWarrantyDialog() {
    if (!warrantyDialogDraft) return
    const errors = validateWarrantyEditDraft(warrantyDialogDraft)
    if (errors.length > 0) {
      setWarrantyDialogErrors(errors)
      return
    }
    setDraft((current) => {
      if (!current) return current
      const currentWarranties = current.warranties ?? []
      const currentComputedWarranties = computedWarrantiesForTenant(current, currentWarranties)
      const currentWarranty = currentComputedWarranties.find((warranty) => warranty.id === warrantyDialogDraft.id)
      const hasSuccessors = currentWarranty
        ? successorRefsForWarranty(currentWarranty, currentComputedWarranties, current.tid).length > 0
        : false
      const nextWarranties = currentWarranties.map((warranty) =>
        warranty.id === warrantyDialogDraft.id
          ? {
              ...warranty,
              relatedProjectId: warrantyDialogDraft.relatedProjectId,
              predecessor: warrantyDialogDraft.predecessor,
              startDate: warrantyDialogDraft.startDate,
              endDate: warrantyDialogDraft.endDate,
              noWarranty: hasSuccessors ? 'NO' : warrantyDialogDraft.noWarranty ?? 'NO',
              remark: warrantyDialogDraft.remark,
            }
          : warranty,
      )
      return {
        ...current,
        warranties: computedWarrantiesForTenant(current, nextWarranties),
      }
    })
    closeWarrantyDialog()
  }

  function addWarranty() {
    if (!canManageWarranties) {
      setMessages([warrantyManageabilityMessage()])
      return
    }

    setDraft((current) => {
      if (!current) return current
      const warranties = current.warranties ?? []
      const warranty = createTenantWarranty(current, warranties, project, linkedOpportunityId)
      const nextWarranties = [...warranties, warranty]
      return { ...current, warranties: computedWarrantiesForTenant(current, nextWarranties) }
    })
  }

  function deleteWarranty(id: string) {
    setDraft((current) => {
      if (!current) return current
      const nextWarranties = (current.warranties ?? []).filter((warranty) => warranty.id !== id)
      return { ...current, warranties: computedWarrantiesForTenant(current, nextWarranties) }
    })
  }

  function renderActionButtons() {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canUndo}
          onClick={undoDraft}
        >
          Undo
        </button>
        <button
          type="button"
          className="rounded border border-sf-border bg-white px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!isDirty}
          onClick={revertTenant}
        >
          Revert
        </button>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={cancelTenant}>
          Cancel
        </button>
        <div className="relative inline-flex">
          <button type="button" className="rounded-l border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white" onClick={() => saveTenant(false)}>
            Save
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-r border border-l-0 border-sf-brand bg-sf-brand px-2 py-1 text-sm text-white"
            aria-label="Save actions"
            onClick={() => setSaveMenuOpen((current) => !current)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </button>
          {saveMenuOpen ? (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded border border-sf-border bg-white py-1 text-sm shadow-lg">
              <button type="button" className="block w-full px-3 py-2 text-left hover:bg-sf-surface-alt" onClick={() => saveTenant(true)}>
                Apply Changes
              </button>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  function renderHeaderField(label: string, value: ReactNode, width = 'w-44') {
    return (
      <FormField label={label} controlWidthClassName={width}>
        <div className="min-h-8 px-2 py-1 text-sm text-sf-text">{value || '-'}</div>
      </FormField>
    )
  }

  function updateTenantOperationalMode(value: string) {
    const nextOperationalStatus =
      value === '__DERIVED__'
        ? derivedTenantOperationalMode(activeSystem)
        : value
    setDraft((current) => (current ? { ...current, operationalStatus: nextOperationalStatus } : current))
    setMessages([])
  }

  function renderOperationalModeField() {
    const derivedMode = derivedTenantOperationalMode(activeSystem)
    const currentMode = effectiveTenantOperationalMode(tenantDraft, activeSystem)
    const selectValue = isManualTenantOperationalMode(tenantDraft.operationalStatus) ? tenantDraft.operationalStatus : '__DERIVED__'
    const selectedLabel = selectValue === '__DERIVED__' ? derivedMode : selectValue
    const options = [
      { value: '__DERIVED__', label: derivedMode },
      ...TENANT_MANUAL_OPERATIONAL_MODES.map((mode) => ({ value: mode, label: mode })),
    ]

    return (
      <FormField label="Operational Status" controlWidthClassName="w-72">
        <div className="relative">
          <button
            type="button"
            className="flex h-8 min-w-0 w-full items-center justify-between gap-2 rounded border border-sf-border bg-white px-2 py-1 text-left text-sm"
            aria-expanded={operationalStatusOpen}
            onClick={() => setOperationalStatusOpen((current) => !current)}
          >
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <AlertStatusIcon variant={operationalStatusVariant(currentMode)} />
              <span className="truncate">{selectedLabel || 'Not set'}</span>
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-sf-text-muted" aria-hidden="true" />
          </button>
          {operationalStatusOpen ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-full rounded border border-sf-border bg-white py-1 text-sm shadow-lg">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-left hover:bg-sf-surface-alt"
                  onClick={() => {
                    updateTenantOperationalMode(option.value)
                    setOperationalStatusOpen(false)
                  }}
                >
                  <AlertStatusIcon variant={operationalStatusVariant(option.label)} />
                  <span className="truncate">{option.label || 'Not set'}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <span className="block pt-1 text-xs text-sf-text-muted">
          {currentMode === derivedMode ? 'Derived from linked System' : 'Manual override'}
        </span>
      </FormField>
    )
  }

  function operationalStatusVariant(value: string): 'success' | 'warning' | 'danger' | 'info' {
    const normalized = value.toLocaleLowerCase()
    if (normalized.includes('service')) return 'warning'
    if (normalized.includes('blocked') || normalized.includes('off') || normalized.includes('deleted')) return 'danger'
    return value ? 'success' : 'info'
  }

  function renderSystemStatus(value: string) {
    const normalized = value.toLocaleLowerCase()
    const variant = normalized.includes('service')
        ? 'warning'
        : normalized.includes('blocked') || normalized.includes('off') || normalized.includes('deleted')
          ? 'danger'
          : 'success'
    return (
      <span className="inline-flex items-center gap-1.5">
        <AlertStatusIcon variant={variant} />
        <span>{value || '-'}</span>
      </span>
    )
  }

  function renderWarrantyHeaderStatus() {
    const latestStatus = draftComputedWarranties.at(-1)?.warrantyStatus ?? tenantDraft.warrantyStatus
    return (
      <span className="inline-flex items-center gap-1.5">
        <AlertStatusIcon variant={warrantyStatusSeverity(latestStatus)} />
        <span>{tenantWarrantyHeaderStatus}</span>
      </span>
    )
  }

  function renderTenantTypeField() {
    return (
      <FormField label="Tenant Type" controlWidthClassName="w-44">
        <select
          className="h-8 w-full rounded border border-sf-border bg-white px-2 py-1 text-sm"
          value={formType}
          onChange={(event) => updateTenantType(event.target.value as TenantFormType)}
        >
          <option value="POC">POC</option>
          <option value="CUSTOMER">Customer</option>
          <option value="INTERNAL">Internal</option>
        </select>
      </FormField>
    )
  }

  function renderHostingSidField() {
    return (
      <FormField label="Hosting SID" controlWidthClassName="w-52">
        {tenantDraft.systemId ? (
          <div className="min-h-8 px-2 py-1 text-sm text-sf-text">{hosting.sid || '-'}</div>
        ) : (
          <select
            className="h-8 w-full rounded border border-sf-border bg-white px-2 py-1 text-sm"
            value={tenantDraft.systemId}
            onChange={(event) => attachSystem(event.target.value)}
          >
            <option value="">No system linked</option>
            {systems.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.sid ?? candidate.machineId ?? candidate.id} - {candidate.productType}
              </option>
            ))}
          </select>
        )}
      </FormField>
    )
  }

  function renderHeader() {
    const commonFields = [
      renderTenantTypeField(),
      renderOperationalModeField(),
      formType === 'CUSTOMER' ? renderHeaderField('License Number', licenseNumber(tenantDraft.deliveryPid ?? '', hosting.sid, tenantDraft.tid), 'w-64') : null,
      formType === 'CUSTOMER' ? renderHeaderField('Warranty status', renderWarrantyHeaderStatus()) : null,
      renderHeaderField('Alert', formType === 'POC' && tenantDraft.pocEndDate ? 'POC period tracked' : ''),
    ].filter(Boolean)

    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-start gap-3">{commonFields}</div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHeaderField('Project Type', project?.mainType ?? '')}
          {renderHeaderField('Project Name', project?.opportunityName ?? '')}
          {renderHeaderField('Delivery PID', project ? <Link className="text-sf-brand hover:underline" to={`/projects/${project.pid}`}>{project.pid}</Link> : '')}
          {renderHeaderField('SID', activeSystem ? <Link className="text-sf-brand hover:underline" to={systemRoutePath(activeSystem)}>{hosting.sid || activeSystem.sid || activeSystem.machineId}</Link> : hosting.sid)}
          {renderHeaderField('System Operational Status', renderSystemStatus(activeSystem?.operationalStatus ?? hosting.operationalStatus))}
          {formType === 'POC'
            ? renderHeaderField('POC Start Date', tenantDraft.pocStartDate ?? opportunity?.pocStartDate ?? '')
            : renderHeaderField('Delivery Date', project?.deliveryDate ?? '')}
          {formType === 'POC' ? renderHeaderField('POC End Date', tenantDraft.pocEndDate ?? opportunity?.pocEndDate ?? '') : null}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHeaderField('Account / End User', tenantDraft.accountName || project?.accountName || '')}
          {renderHeaderField('Region', opportunity?.region ?? activeSystem?.region ?? '')}
          {renderHeaderField('Country', tenantDraft.country || opportunity?.country || activeSystem?.country || '')}
          {renderHeaderField('State', opportunity?.state ?? activeSystem?.state ?? '')}
          {renderHeaderField('Time Zone', opportunity?.timeZone ?? '')}
          {renderHeaderField('Time Group', tenantDraft.timeGroup || opportunity?.timeGroup || activeSystem?.timeGroup || '')}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHostingSidField()}
          {renderHeaderField('Hosting System Operational status', hosting.operationalStatus)}
          {renderHeaderField('Hosting System version', hosting.versionNumber)}
        </div>
      </section>
    )
  }

  function optionsWithCustom(key: ConfigKey, options: string[]): string[] {
    return [
      ...options.filter((option) => option !== 'Add new...'),
      ...(customPicklistOptions[key] ?? []),
      ...(options.includes('Add new...') ? ['Add new...'] : []),
    ]
  }

  function configurationOptions(field: TenantConfigurationColumn): string[] {
    if (field.key === 'mapCenter') return [...countryOptions, 'Add new...']
    if (field.key === 'crossSystemFeatures') return CROSS_SYSTEM_OPTIONS
    if (field.key === 'aiFeatures') return AI_OPTIONS
    if (field.key === 'additionalFeatures') return ADDITIONAL_FEATURE_OPTIONS
    if (field.inputType === 'picklist') return YES_NO_OPTIONS
    return []
  }

  function handleConfigurationPicklistChange(field: TenantConfigurationColumn, value: string) {
    if (value === 'Add new...') {
      setPendingAddNew({ key: field.configKey, value: '' })
      return
    }
    updateConfiguration(field.configKey, value)
  }

  function renderConfigurationAddNew(field: TenantConfigurationColumn) {
    if (pendingAddNew?.key !== field.configKey) return null

    return (
      <div className="mt-1 flex w-40 items-center gap-1">
        <input
          className="h-7 min-w-0 flex-1 rounded border border-sf-border px-2 py-1 text-sm"
          value={pendingAddNew.value}
          autoFocus
          onChange={(event) => setPendingAddNew({ key: field.configKey, value: event.target.value })}
        />
        <button
          type="button"
          className="rounded border border-sf-brand bg-sf-brand px-2 py-1 text-xs font-semibold text-white"
          onClick={() => {
            const nextValue = pendingAddNew.value.trim()
            if (!nextValue) return
            setCustomPicklistOptions((current) => addCustomPicklistOption(current, field.configKey, nextValue))
            updateConfiguration(field.configKey, nextValue)
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

  function renderMultiSelect(field: TenantConfigurationColumn, selected: string[]) {
    const pickerId = `tenant-config:${field.configKey}`
    const isOpen = activeMultiSelect?.id === pickerId
    const selectedText = selected.length > 0 ? selected.join('; ') : 'Select'
    const triggerWidth = `${Math.min(48, Math.max(16, selectedText.length + 3))}ch`
    const options = configurationOptions(field)

    function toggleOption(option: string) {
      const nextSelected = selected.includes(option)
        ? selected.filter((value) => value !== option)
        : [...selected, option]
      updateConfiguration(field.configKey, nextSelected)
    }

    return (
      <>
        <button
          type="button"
          data-multiselect-trigger={pickerId}
          className="h-7 min-w-56 max-w-[42rem] whitespace-nowrap rounded border border-sf-border bg-white px-2 py-1 text-left text-sm"
          style={{ width: triggerWidth }}
          title={selected.join('; ')}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            setActiveMultiSelect((current) =>
              current?.id === pickerId
                ? null
                : {
                    id: pickerId,
                    key: field.configKey,
                    selected,
                    left: rect.left,
                    top: rect.bottom + 4,
                    width: Math.max(rect.width, 256),
                  },
            )
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

  function renderConfigurationCell(field: TenantConfigurationColumn) {
    const value = configurationValue(configuration, field)
    const isProduct = field.configKey === 'product'

    if (isProduct) {
      return <div className="min-h-7 px-1 py-1 text-sm text-sf-text">{textValue(value) || '-'}</div>
    }

    if (field.inputType === 'picklist') {
      const options = configurationOptions(field)
      return (
        <>
          <select
            className="h-7 w-40 rounded border border-sf-border bg-white px-2 py-1 text-sm"
            value={textValue(value)}
            onChange={(event) => handleConfigurationPicklistChange(field, event.target.value)}
          >
            {optionsWithCustom(field.configKey, options).map((option) => (
              <option key={option} value={option}>{option || 'Not set'}</option>
            ))}
          </select>
          {renderConfigurationAddNew(field)}
        </>
      )
    }

    if (field.inputType === 'multiselect') {
      return renderMultiSelect(field, Array.isArray(value) ? value : splitMultiValue(textValue(value)))
    }

    if (field.inputType === 'integer') {
      return (
        <input
          className="h-7 w-24 rounded border border-sf-border px-2 py-1 text-sm"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={digitString(value)}
          onKeyDown={preventNonDigitKey}
          onPaste={(event) => {
            event.preventDefault()
            updateConfiguration(field.configKey, parseDigitValue(event.clipboardData.getData('text').replace(/\D/g, '')))
          }}
          onChange={(event) => updateConfiguration(field.configKey, parseDigitValue(event.target.value.replace(/\D/g, '')))}
        />
      )
    }

    return (
      <input
        className="h-7 w-36 rounded border border-sf-border px-2 py-1 text-sm"
        value={textValue(value)}
        onChange={(event) => updateConfiguration(field.configKey, event.target.value)}
      />
    )
  }

  function renderConfigurationTab() {
    return (
      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {CONFIGURATION_FIELDS.map((field) => (
                <th key={field.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                  <span>{field.label}</span>
                  <span className="block text-xs font-normal text-sf-text-muted">{field.group}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {CONFIGURATION_FIELDS.map((field) => {
                return (
                  <td key={field.key} className="border border-sf-border px-1.5 py-1 align-top">
                    {renderConfigurationCell(field)}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  function renderHostingTab() {
    return (
      <ReadonlyTable
        headers={TENANT_HOSTING_FIELDS.map((field) => field.label)}
        rows={[TENANT_HOSTING_FIELDS.map((field) => textValue(hosting[field.key]))]}
        emptyText="No hosting system is linked to this tenant."
      />
    )
  }

  function renderEngagementTab() {
    return (
      <ReadonlyTable
        headers={ENGAGEMENT_CIRCLE_TABLE_HEADERS}
        rows={inheritedEngagementCircle.map((circle) => [
          circle.subject,
          circle.role,
          circle.userName,
          circle.email,
          circle.phone ?? '',
        ])}
        emptyText={ENGAGEMENT_CIRCLE_EMPTY_TEXT}
      />
    )
  }

  function renderDocumentsTab() {
    return (
      <DocumentsPanel
        documents={tenantDraft.documents ?? []}
        emptyText="No documents uploaded for this tenant."
        onChange={(documents) => {
          setDraft((current) => (current ? { ...current, documents } : current))
          setMessages([])
        }}
      />
    )
  }

  function renderActiveTab() {
    if (activeTab === 'configuration') return renderConfigurationTab()
    if (activeTab === 'hosting') return renderHostingTab()
    if (activeTab === 'engagement') return renderEngagementTab()
    if (activeTab === 'documents') return renderDocumentsTab()
    return <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">Usage will be defined in a later phase.</div>
  }

  function renderRemarks() {
    const remarks = tenantDraft.remarks ?? []
    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-sf-text">Remarks</h2>
            <p className="text-sm text-sf-text-muted">Editable tenant remarks. Outlook event creation is not implemented in this phase.</p>
          </div>
          <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addRemark}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add remark
          </button>
        </div>
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {['Record ID', 'Timestamp', 'User / author', 'Type', 'Remark content', 'Due date', 'Event created', 'Action'].map((header) => (
                  <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {remarks.map((remark) => {
                const isEditing = editingRemarkIds.includes(remark.id)
                return (
                    <tr key={remark.id}>
                      <td className="border border-sf-border px-1.5 py-1">{remark.recordId}</td>
                      <td className="border border-sf-border px-1.5 py-1">{remark.timestamp}</td>
                      <td className="border border-sf-border px-1.5 py-1">{remark.author}</td>
                      <td className="border border-sf-border px-1.5 py-1">
                        {isEditing ? (
                          <select className="h-8 rounded border border-sf-border px-2 py-1" value={remark.type} onChange={(event) => updateRemark(remark.id, 'type', event.target.value)}>
                            {TENANT_REMARK_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                          </select>
                        ) : remark.type}
                      </td>
                      <td className="min-w-96 border border-sf-border px-1.5 py-1">
                        {isEditing ? (
                          <RichTextEditor value={remark.content} onChange={(value) => updateRemark(remark.id, 'content', value)} />
                        ) : <RichTextContent value={remark.content} />}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1">
                        {isEditing ? (
                          <input className="h-8 rounded border border-sf-border px-2 py-1" type="date" value={remark.dueDate ?? ''} onChange={(event) => updateRemark(remark.id, 'dueDate', event.target.value || null)} />
                        ) : remark.dueDate ?? ''}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1 text-center">
                        {isEditing ? (
                          <input type="checkbox" checked={remark.eventCreated} onChange={(event) => updateRemark(remark.id, 'eventCreated', event.target.checked)} />
                        ) : remark.eventCreated ? 'Yes' : 'No'}
                      </td>
                      <td className="border border-sf-border px-1.5 py-1">
                        <div className="flex gap-2">
                          {isEditing ? (
                            <button type="button" className="text-sf-brand hover:underline" onClick={() => saveRemark(remark.id)}>
                              Save
                            </button>
                          ) : (
                            <button type="button" className="text-sf-brand hover:underline" onClick={() => editRemark(remark.id)}>
                              Edit
                            </button>
                          )}
                          <button type="button" className="inline-flex items-center gap-1 text-red-700 hover:underline" onClick={() => deleteRemark(remark.id)}>
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                )
              })}
              {remarks.length === 0 ? (
                <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={8}>No remarks yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  function renderConfigurationHistory() {
    const records = tenantDraft.configurationHistory ?? []
    return (
      <section className="sf-card space-y-3 p-3">
        <h2 className="text-lg font-semibold text-sf-text">Configuration History</h2>
        <ReadonlyTable
          headers={[
            'Record ID',
            'Timestamp',
            'Recorded By',
            ...CONFIGURATION_FIELDS.map((field) => (
              <span key={field.key}>
                <span>{field.label}</span>
                <span className="block text-xs font-normal text-sf-text-muted">{field.group}</span>
              </span>
            )),
          ]}
          rows={records.map((record: TenantConfigurationHistoryRecord) => [
            record.recordId,
            record.timestamp,
            record.recordedBy,
            ...CONFIGURATION_FIELDS.map((field) => textValue(configurationValue(record.configuration, field))),
          ])}
          emptyText="No configuration changes have been recorded for this POC tenant."
        />
      </section>
    )
  }

  function renderWarranties() {
    const warranties = draftComputedWarranties
    if (!canManageWarranties) {
      return (
        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Warranties</h2>
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Warranty can be managed only after the tenant is linked to a Project/Opportunity.
          </div>
          <ReadonlyTable
            headers={['Warranty ID', 'Warranty Type', 'First', 'Predecessor', 'Successor', 'Account ID / End User ID', 'Related Project ID', 'Opportunity ID', 'Start Date', 'End Date', 'Duration', 'Days Before Expiration', 'Warranty Status', 'Alerts', 'Remark']}
            rows={warranties.map((warranty, warrantyIndex) => [
              warranty.warrantyId,
              warranty.warrantyType,
              warrantyIndex === 0 ? <Check className="mx-auto h-4 w-4 text-black" aria-label="First warranty" /> : '',
              formatWarrantyRefs(predecessorRefsForWarranty(warranty, tenantDraft.tid)),
              formatWarrantyRefs(successorRefsForWarranty(warranty, warranties, tenantDraft.tid)),
              warranty.accountId,
              warranty.relatedProjectId,
              warranty.opportunityId,
              warranty.startDate ?? '',
              warranty.endDate ?? '',
              warranty.durationDays ?? '',
              warranty.daysBeforeExpiration ?? '',
              displayWarrantyStatus(warranty.warrantyStatus),
              warranty.alerts,
              warranty.remark,
            ])}
            emptyText="No warranty records are available for this tenant."
          />
        </section>
      )
    }

    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-sf-text">Warranties</h2>
          <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addWarranty}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add warranty
          </button>
        </div>
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {['Warranty ID', 'Warranty Type', 'First', 'Predecessors', 'Successors', 'Account ID / End User ID', 'Related Project ID', 'Opportunity ID', 'Start Date', 'End Date', 'Duration', 'Days Before Expiration', 'Warranty Status', 'Alerts', 'Remark', 'Action'].map((header) => (
                  <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {warranties.map((warranty, warrantyIndex) => {
                return (
                <tr key={warranty.id}>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantyId}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantyType}</td>
                  <td className="border border-sf-border px-1.5 py-1 text-center">{warrantyIndex === 0 ? <Check className="mx-auto h-4 w-4 text-black" aria-label="First warranty" /> : ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">{formatWarrantyRefs(predecessorRefsForWarranty(warranty, tenantDraft.tid))}</td>
                  <td className="border border-sf-border px-1.5 py-1">{formatWarrantyRefs(successorRefsForWarranty(warranty, warranties, tenantDraft.tid))}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.accountId}</td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <select className="h-8 min-w-44 rounded border border-sf-border px-2 py-1 text-sm" value={warranty.relatedProjectId} onChange={(event) => updateWarrantyInline(warranty.id, { relatedProjectId: event.target.value })}>
                      <option value="">Select project</option>
                      {relatedProjects.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.pid}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.opportunityId}</td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <input className="h-8 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={warranty.startDate ?? ''} onChange={(event) => updateWarrantyInline(warranty.id, { startDate: event.target.value || null })} />
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <input className="h-8 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={warranty.endDate ?? ''} onChange={(event) => updateWarrantyInline(warranty.id, { endDate: event.target.value || null })} />
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.durationDays ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.daysBeforeExpiration ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">{displayWarrantyStatus(warranty.warrantyStatus)}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.alerts}</td>
                  <td className="border border-sf-border px-1.5 py-1"><RichTextContent value={warranty.remark} /></td>
                  <td className="border border-sf-border px-1.5 py-1">
                    <div className="flex items-center gap-2">
                      <button type="button" className="text-sf-brand hover:underline" onClick={() => openWarrantyDialog(warranty)}>Edit</button>
                      <button type="button" className="text-red-700 hover:underline" onClick={() => deleteWarranty(warranty.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
                )
              })}
              {warranties.length === 0 ? (
                <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={16}>No warranty records yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  function renderWarrantyDialog() {
    if (!editingWarrantyId || !warrantyDialogDraft) return null
    const warranty = draftComputedWarranties.find((candidate) => candidate.id === editingWarrantyId)
    if (!warranty) return null
    const selectedPredecessorTenantId = predecessorSelections[warranty.id]?.tenantId ?? tenantDraft.id
    const predecessorOptions = warrantyOptionsForTenant(selectedPredecessorTenantId, warranty.id)
    const predecessorValues = splitWarrantyPredecessors(warrantyDialogDraft.predecessor)
    const hasSuccessors = successorRefsForWarranty(warranty, draftComputedWarranties, tenantDraft.tid).length > 0

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="presentation">
        <div className="w-full max-w-2xl rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="true" aria-labelledby="warranty-dialog-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="warranty-dialog-title" className="text-lg font-semibold">Edit warranty {warranty.warrantyId}</h2>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={closeWarrantyDialog}>Cancel</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {warrantyDialogErrors.length > 0 ? (
              <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 md:col-span-2">
                {warrantyDialogErrors.map((error) => <div key={error}>{error}</div>)}
              </div>
            ) : null}
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Related Project ID</span>
              <select className="h-9 w-full rounded border border-sf-border px-2 py-1" value={warrantyDialogDraft.relatedProjectId} onChange={(event) => updateWarrantyDialogDraft('relatedProjectId', event.target.value)}>
                <option value="">Select project</option>
                {relatedProjects.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.opportunityName} - {candidate.pid}
                  </option>
                ))}
              </select>
            </label>
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Status</span>
              <div className="flex h-9 items-center rounded border border-sf-border bg-sf-surface-alt px-2">{displayWarrantyStatus(warranty.warrantyStatus)}</div>
            </div>
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Start Date</span>
              <input className="h-9 w-full rounded border border-sf-border px-2 py-1" type="date" value={warrantyDialogDraft.startDate ?? ''} onChange={(event) => updateWarrantyDialogDraft('startDate', event.target.value || null)} />
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">End Date</span>
              <input className="h-9 w-full rounded border border-sf-border px-2 py-1" type="date" value={warrantyDialogDraft.endDate ?? ''} onChange={(event) => updateWarrantyDialogDraft('endDate', event.target.value || null)} />
            </label>
            <div className="space-y-2 md:col-span-2">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Predecessors</span>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="h-9 rounded border border-sf-border px-2 py-1"
                  value={selectedPredecessorTenantId}
                  onChange={(event) =>
                    setPredecessorSelections((current) => ({
                      ...current,
                      [warranty.id]: { tenantId: event.target.value, warrantyId: '' },
                    }))
                  }
                >
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>{tenant.tid}</option>
                  ))}
                </select>
                <select
                  className="h-9 rounded border border-sf-border px-2 py-1"
                  value={predecessorSelections[warranty.id]?.warrantyId ?? ''}
                  onChange={(event) =>
                    setPredecessorSelections((current) => ({
                      ...current,
                      [warranty.id]: {
                        tenantId: current[warranty.id]?.tenantId ?? tenantDraft.id,
                        warrantyId: event.target.value,
                      },
                    }))
                  }
                >
                  <option value="">Warranty ID</option>
                  {predecessorOptions.map(({ tenant, warranty: option }) => (
                    <option key={`${tenant.id}-${option.warrantyId}`} value={option.warrantyId}>
                      {option.warrantyId}
                    </option>
                  ))}
                </select>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addWarrantyDialogPredecessor}>
                  Add predecessor
                </button>
              </div>
              <div className="flex min-h-9 flex-wrap gap-2 rounded border border-sf-border bg-sf-surface-alt p-2">
                {predecessorValues.length > 0 ? predecessorValues.map((value) => (
                  <span key={value} className="inline-flex items-center gap-2 rounded border border-sf-border bg-white px-2 py-1 text-xs">
                    {formatWarrantyCompatibilityRef(value, tenantDraft.tid)}
                    <button type="button" className="font-semibold text-red-700" aria-label={`Remove ${formatWarrantyCompatibilityRef(value, tenantDraft.tid)}`} onClick={() => removeWarrantyDialogPredecessor(value)}>
                      ×
                    </button>
                  </span>
                )) : <span className="text-sm text-sf-text-muted">No predecessors selected.</span>}
              </div>
            </div>
            <label className="space-y-1 md:col-span-2">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">No Warranty</span>
              <select
                className="h-9 w-full rounded border border-sf-border px-2 py-1 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                value={hasSuccessors ? 'NO' : warrantyDialogDraft.noWarranty === 'YES' ? 'YES' : 'NO'}
                disabled={hasSuccessors}
                title={hasSuccessors ? 'No Warranty is locked because this warranty has a successor.' : undefined}
                onChange={(event) => updateWarrantyDialogDraft('noWarranty', event.target.value as YesNo)}
              >
                {YES_NO_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Remarks</span>
              <RichTextEditor value={warrantyDialogDraft.remark} onChange={(value) => updateWarrantyDialogDraft('remark', value)} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={closeWarrantyDialog}>Cancel</button>
            <button type="button" className="rounded border border-sf-brand bg-sf-brand px-3 py-1.5 text-sm text-white" onClick={saveWarrantyDialog}>Save</button>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col">
      {navigationBlocker.state === 'blocked' ? (
        <UnsavedChangesDialog
          onSave={() => saveTenant(true, () => navigationBlocker.proceed?.())}
          onDiscardChanges={() => navigationBlocker.proceed?.()}
          onCancel={() => navigationBlocker.reset?.()}
        />
      ) : null}
      <PageHeader
        title={`Tenant ${tenantDraft.tid}`}
        subtitle={`${formType === 'POC' ? 'Tenant form-POC' : 'Tenant form-Customer'} foundation`}
        actions={renderActionButtons()}
      />
      <div className="sf-form-content-scroll min-h-0 flex-1 space-y-4 pb-2 pr-1">
      {messages.length > 0 ? (
        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {messages.map((message) => <div key={message}>{message}</div>)}
        </div>
      ) : null}
      {renderHeader()}
      {renderWarrantyDialog()}
      <section className="rounded border border-sf-border bg-sf-surface">
        <div className="sticky top-0 z-30 flex flex-wrap border-b border-sf-border bg-sf-surface">
          {TENANT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'border-b-2 px-4 py-2 text-base font-semibold',
                activeTab === tab.id
                  ? 'border-sf-brand bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
              ].join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-80 p-3" role="tabpanel" aria-label={TENANT_TABS.find((tab) => tab.id === activeTab)?.label}>
          {renderActiveTab()}
        </div>
      </section>
      {renderRemarks()}
      {formType === 'POC' ? renderConfigurationHistory() : renderWarranties()}
      </div>
    </div>
  )
}
