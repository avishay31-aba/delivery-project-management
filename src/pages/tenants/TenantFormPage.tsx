import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Check, ChevronDown, Edit2, Plus, Save, Settings2, Trash2, X } from 'lucide-react'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { RemarksGrid } from '@/components/remarks'
import { ActivityTimeline } from '@/components/activity'
import { ConfigurationHistorySection } from '@/components/application-configuration/ConfigurationHistorySection'
import { ApplicationConfigurationSummaryTable } from '@/components/application-configuration/ApplicationConfigurationSummaryTable'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { LinkedProjectsTable } from '@/components/projects/LinkedProjectsTable'
import { projectMainTypeLabel } from '@/domain/project-lifecycle'
import {
  EditableChildObjectActionButton,
  useEditableChildObjectEditor,
} from '@/components/child-objects'
import {
  AlertStatusIcon,
  BusinessObjectLink,
  CheckboxMultiSelect,
  FormField,
  LinkedProjectsLinks,
  MetadataHeaderField,
  OperationalStatusIcon,
  OperationalStatusSelect,
  PlaceholderCard,
  ProductSubTabs,
  RequiredFieldMarker,
  RichTextContent,
  RichTextEditor,
  SaveButtonLabel,
  WarrantyStatusPresentation,
  formMessageClassName,
} from '@/components/ui'
import { ConfigurationColumnHeaders } from '@/components/configuration'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning'
import { useReactiveDraftSync } from '@/hooks/useReactiveDraftSync'
import { handleDateInputPaste } from '@/utils/date-input'
import { isRouteViewMode } from '@/utils/route-mode'
import { YES_NO_OPTIONS } from '@/config/opportunity-metadata'
import { PRODUCT_OPTIONS } from '@/config/cloud-platform-metadata'
import { ADDITIONAL_FEATURE_OPTIONS, AI_OPTIONS, CROSS_SYSTEM_OPTIONS } from '@/config/picklist-options'
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
  TenantWarranty,
  YesNo,
} from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'
import {
  configurationHistoryReadModel,
} from '@/domain/application-configuration'
import { formattedReusedInternalMachineId, tenantCountForSystem } from '@/domain/system-inventory'
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
  parseWarrantyPredecessorReference,
  predecessorRefsForWarranty,
  predecessorReference,
  splitWarrantyPredecessors,
  successorRefsForWarranty,
  WARRANTY_FIELD_LABELS,
  WARRANTY_DATE_ORDER_MESSAGE,
  WARRANTY_END_DATE_REQUIRED_MESSAGE,
  WARRANTY_OBJECT_CONTEXT_SCHEMAS,
  isSelfWarrantyPredecessorSelection,
  WARRANTY_START_DATE_REQUIRED_MESSAGE,
  validateWarrantyEditDraft,
  warrantyContextHasField,
  warrantyContextRequiresField,
  tenantWarrantyHeaderStatusReadModel,
  warrantyManageabilityMessage,
  warrantyRelatedProjectOptionLabel,
} from '@/domain/warranty-collection'
import {
  cloneTenant,
  derivedTenantOperationalMode,
  effectiveTenantOperationalMode,
  isManualTenantOperationalMode,
  isTenantLifecycleInactive,
  tenantConfigurationFromTenant,
  tenantDraftWithAttachedSystem,
  tenantActiveProjects,
  tenantActivePocProject,
  tenantFormType,
  tenantHasActiveWarrantyProject,
  tenantPocPidDisplay,
  tenantRelatedProjects,
  tenantTimeZoneDisplayValue,
  TENANT_MANUAL_OPERATIONAL_MODES,
  TENANT_HOSTING_FIELDS,
  validateTenantConfigurationSave,
} from '@/domain/tenant-operations'
import { systemReference } from '@/domain/business-reference'
import { activityEventsForTenant } from '@/domain/activity-log'
import { REMARK_TYPE_OPTIONS, type RemarkRecord } from '@/domain/remarks'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'
import { linkedProjectRowsForTenant } from '@/domain/linked-projects'
import { tenantTimeGroupFromLocation } from '@/domain/time-groups'

type TenantTab = 'tenantConfiguration' | 'hosting' | 'engagement' | 'linkedProjects' | 'usage' | 'documents' | 'activity'
type TenantHostingTab = 'environment' | 'systemApplicationConfiguration'
const TENANT_REMARK_TYPE_PICKLIST_KEY = 'tenantRemarkType'

const TENANT_TABS: Array<{ id: TenantTab; label: string }> = [
  { id: 'tenantConfiguration', label: 'Tenant Configuration' },
  { id: 'hosting', label: 'Hosting' },
  { id: 'linkedProjects', label: 'Linked Projects' },
  { id: 'usage', label: 'Usage' },
  { id: 'documents', label: 'Documents' },
  { id: 'engagement', label: ENGAGEMENT_CIRCLE_TAB_LABEL },
  { id: 'activity', label: 'Activity Log' },
]

const TENANT_HOSTING_TABS: Array<{ id: TenantHostingTab; label: string }> = [
  { id: 'environment', label: 'Environment' },
  { id: 'systemApplicationConfiguration', label: 'System Application Configuration' },
]

const TENANT_WARRANTY_SCHEMA = WARRANTY_OBJECT_CONTEXT_SCHEMAS.tenant
const TENANT_WARRANTY_HEADERS = [
  'Actions',
  WARRANTY_FIELD_LABELS.id,
  WARRANTY_FIELD_LABELS.type,
  WARRANTY_FIELD_LABELS.subType,
  'First',
  'Predecessors',
  'Successors',
  'Account ID / End User ID',
  ...(warrantyContextHasField(TENANT_WARRANTY_SCHEMA, 'relatedProjectId') ? [WARRANTY_FIELD_LABELS.relatedProjectId] : []),
  'Opportunity ID',
  ...(warrantyContextHasField(TENANT_WARRANTY_SCHEMA, 'initialWarrantyDate') ? [WARRANTY_FIELD_LABELS.initialWarrantyDate] : []),
  WARRANTY_FIELD_LABELS.startDate,
  WARRANTY_FIELD_LABELS.endDate,
  'Duration',
  'Days Before Expiration',
  WARRANTY_FIELD_LABELS.status,
  'Alerts',
  'Remark',
]

const CONFIGURATION_FIELDS: TenantConfigurationFieldMetadata[] = TENANT_CONFIGURATION_FIELDS

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function tenantParentSaveScope(tenant: Tenant): Partial<Tenant> {
  const {
    documents: _documents,
    remarks: _remarks,
    warranties: _warranties,
    updatedAt: _updatedAt,
    ...parentScope
  } = tenant
  return parentScope
}

function normalizedWarrantySaveScope(record: TenantWarranty) {
  return {
    relatedProjectId: record.relatedProjectId ?? '',
    initialWarrantyDate: record.initialWarrantyDate ?? null,
    startDate: record.startDate ?? null,
    endDate: record.endDate ?? null,
    noWarranty: record.noWarranty ?? 'NO',
    predecessor: record.predecessor ?? '',
    remark: record.remark ?? '',
  }
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join('; ')
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return value == null ? '' : String(value)
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

function resolveProject(tenant: Tenant, projects: Project[], projectTenants: Array<{ tenantId: string; projectId: string; allocationStatus?: string }>, systems: System[]): Project | undefined {
  const activeLinkedProjectId = projectTenants.find((link) => link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED')?.projectId
  if (activeLinkedProjectId) return projects.find((project) => project.id === activeLinkedProjectId)
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
  useDateTimePresentationPreference()
  const { tid } = useParams<{ tid: string }>()
const navigate = useNavigate()
const location = useLocation()
const isViewMode = isRouteViewMode(location)
const isNewRecordSession = (location.state as { newRecordSession?: boolean } | null)?.newRecordSession === true
  const tenants = useAppStore((state) => state.tenants)
  const systems = useAppStore((state) => state.systems)
  const projects = useAppStore((state) => state.projects)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const accounts = useAppStore((state) => state.accounts)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const opportunities = useAppStore((state) => state.opportunities)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const timeGroupLookups = useAppStore((state) => state.timeGroupLookups)
  const updateTenant = useAppStore((state) => state.updateTenant)
  const saveTenantConfiguration = useAppStore((state) => state.saveTenantConfiguration)
  const savedTenant = useMemo(() => tenants.find((tenant) => tenant.tid === tid), [tenants, tid])
  const system = useMemo(
    () => systems.find((candidate) => candidate.id === (savedTenant?.hostedSystemId ?? savedTenant?.systemId)),
    [savedTenant, systems],
  )
  const tenantActivityEvents = useMemo(
    () => savedTenant ? activityEventsForTenant(activityEvents, savedTenant.tid || savedTenant.id) : [],
    [activityEvents, savedTenant],
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
  const [activeTab, setActiveTab] = useState<TenantTab>('tenantConfiguration')
  const [activeHostingTab, setActiveHostingTab] = useState<TenantHostingTab>('environment')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const warrantyEditor = useEditableChildObjectEditor<TenantWarranty>()
  const [advancedWarrantyId, setAdvancedWarrantyId] = useState<string | null>(null)
  const [advancedWarrantySnapshot, setAdvancedWarrantySnapshot] = useState<TenantWarranty | null>(null)
  const [predecessorSelections, setPredecessorSelections] = useState<Record<string, { tenantId: string; warrantyId: string }>>({})
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [bypassUnsavedPrompt, setBypassUnsavedPrompt] = useState(false)
  const isDirty = Boolean(savedTenant && draft && !valuesEqual(tenantParentSaveScope(savedTenant), tenantParentSaveScope(draft)))
  const navigationBlocker = useBlocker(isDirty && !isViewMode && !bypassUnsavedPrompt)
  useBeforeUnloadWarning(isDirty && !isViewMode)

  useReactiveDraftSync({
    source: savedTenant ? cloneTenant(savedTenant) : null,
    draft,
    resetDraft,
    clone: (value) => (value ? cloneTenant(value) : value),
    isEqual: valuesEqual,
  })

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
  const activeTenantProjects = tenantActiveProjects(tenantDraft, projects, projectTenants)
  const linkedProjects = activeTenantProjects.length > 0
    ? activeTenantProjects
    : projects.filter(
        (candidate) =>
          candidate.pid === tenantDraft.deliveryPid ||
          Boolean(activeSystem?.linkedProjectIds?.includes(candidate.id)),
      )
  const project = resolveProject(tenantDraft, projects, projectTenants, systems) ?? linkedProjects[0]
  const opportunity = resolveOpportunity(project, opportunities)
  const linkedOpportunityId = opportunity?.opportunityId ?? projectOpportunityReference(project)
  const canManageWarranties = canManageWarrantyCollection(project, linkedOpportunityId)
  const inheritedEngagementCircle = inheritedEngagementCircleForTenant(tenantDraft, opportunity)
  const formType = tenantFormType(tenantDraft)
  const tenantConfiguration = configurationFromTenant(tenantDraft, activeSystem)
  const configuration = tenantConfiguration
  const hosting = hostingSnapshotFromSystem(tenantDraft, activeSystem)
  const relatedProjects = tenantRelatedProjects(tenantDraft, projects, projectTenants, systems, projectSystems, opportunities)
  const linkedProjectRows = linkedProjectRowsForTenant(tenantDraft, { projects, projectSystems, projectTenants, opportunities, accounts, systems })
  const projectById = new Map(projects.map((candidate) => [candidate.id, candidate]))
  const pocPidDisplay = tenantPocPidDisplay(tenantDraft, projects, projectTenants)
  const originalDeliveryProject = tenantDraft.deliveryPid
    ? projects.find((candidate) => candidate.pid === tenantDraft.deliveryPid && candidate.mainType !== 'POC')
    : undefined
  const headerPocProject = tenantActivePocProject(tenantDraft, projects, projectTenants)
  const headerProject = formType === 'POC' ? headerPocProject : originalDeliveryProject
  const headerDeliveryPid = formType === 'POC' ? '' : tenantDraft.deliveryPid ?? ''
  const headerPocPid = formType === 'POC' ? headerPocProject?.pid ?? pocPidDisplay : ''
  const showWarrantySection = tenantHasActiveWarrantyProject(tenantDraft, projects, projectTenants)
  const computedWarrantiesForTenant = (tenant: Tenant, source: TenantWarranty[]): TenantWarranty[] =>
    computeTenantWarranties(source, tenant, projects, (selectedProject) => resolveOpportunity(selectedProject, opportunities), projectOpportunityReference)
      .map((warranty, index) => ({ ...warranty, firstWarranty: index === 0 }))
  const computedWarranties = (source: TenantWarranty[]): TenantWarranty[] => computedWarrantiesForTenant(tenantDraft, source)
  const committedWarrantyHeaderStatus = tenantWarrantyHeaderStatusReadModel(persistedTenant.warranties ?? [], persistedTenant.tid)
  const committedWarrantyIds = (tenantDraft.warranties ?? []).map((warranty) => warranty.id).join('|')

  useEffect(() => {
    warrantyEditor.reset()
  }, [tenantDraft.id, committedWarrantyIds])

  function warrantyRowsWithActiveDrafts(): TenantWarranty[] {
    const source = tenantDraft.warranties ?? []
    const sourceWithEditedDrafts = source.map((warranty) => warrantyEditor.draftFor(warranty.id) ?? warranty)
    const sourceWithNewDrafts = [
      ...sourceWithEditedDrafts,
      ...warrantyEditor.newDrafts.filter((draft) => !source.some((warranty) => warranty.id === draft.id)),
    ]
    return computedWarranties(sourceWithNewDrafts)
  }

  const advancedWarrantyDraft = advancedWarrantyId ? warrantyEditor.draftFor(advancedWarrantyId) ?? null : null

  function warrantyOptionsForTenant(selectedTenantId: string, currentWarrantyId: string): Array<{ tenant: Tenant; warranty: TenantWarranty }> {
    if (selectedTenantId === tenantDraft.id) {
      return warrantyRowsWithActiveDrafts()
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

  function updateConfiguration(field: TenantConfigurationFieldMetadata, value: string | string[] | number | null) {
    if (isViewMode || !field.editable) return
    setDraft((current) => current ? {
      ...current,
      configuration: {
        ...configurationFromTenant(current, activeSystem),
        [field.configKey]: value,
      },
    } : current)
    setMessages([])
  }

  function attachSystem(nextSystemId: string) {
    if (isViewMode) return
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
    if (isViewMode) return
    const nextMessages = validateTenantConfiguration()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      return
    }

    const normalizedDraft = {
      ...tenantDraft,
      warranties: computedWarranties(tenantDraft.warranties ?? []),
    }
    const returnTo = typeof location.state === 'object' && location.state && 'returnTo' in location.state
      ? String(location.state.returnTo ?? '')
      : ''
    const hasBusinessChanges = !valuesEqual(tenantParentSaveScope(persistedTenant), tenantParentSaveScope(normalizedDraft))
    if (!hasBusinessChanges) {
      setMessages(['No changes to save.'])
      setSaveMenuOpen(false)
      onSuccess?.()
      if (!stayOnPage && returnTo) {
        setBypassUnsavedPrompt(true)
        window.setTimeout(() => navigate(returnTo), 0)
      }
      return
    }

    setIsSaving(true)
    window.setTimeout(() => setIsSaving(false), 500)
    saveTenantConfiguration(persistedTenant.id, normalizedDraft, activeSystem?.id, { preserveNewState: isNewRecordSession })
    setMessages(['Tenant saved.'])
    setSaveMenuOpen(false)
    onSuccess?.()
    if (!stayOnPage && returnTo) {
      setBypassUnsavedPrompt(true)
      window.setTimeout(() => navigate(returnTo), 0)
    }
  }

  function revertTenant() {
    resetDraft(cloneTenant(persistedTenant))
    setMessages([])
  }

  function cancelTenant() {
    resetDraft(cloneTenant(persistedTenant))
    setBypassUnsavedPrompt(true)
    window.setTimeout(() => navigate('/tenants'), 0)
  }

  function editWarranty(warranty: TenantWarranty) {
    if (isViewMode) return
    warrantyEditor.beginEdit(warranty)
  }

  function openAdvancedWarrantyDialog(warranty: TenantWarranty) {
    if (isViewMode) return
    const currentDraft = warrantyEditor.draftFor(warranty.id) ?? warranty
    if (!warrantyEditor.isEditing(warranty.id)) {
      warrantyEditor.beginEdit(currentDraft)
    }
    setAdvancedWarrantySnapshot(currentDraft)
    setAdvancedWarrantyId(warranty.id)
    setPredecessorSelections((current) => ({
      ...current,
      [warranty.id]: current[warranty.id] ?? { tenantId: tenantDraft.id, warrantyId: '' },
    }))
  }

  function closeAdvancedWarrantyDialog() {
    if (advancedWarrantyId && advancedWarrantySnapshot) {
      warrantyEditor.replaceDraft(advancedWarrantySnapshot)
    }
    setAdvancedWarrantyId(null)
    setAdvancedWarrantySnapshot(null)
  }

  function saveAdvancedWarrantyDialog() {
    setAdvancedWarrantyId(null)
    setAdvancedWarrantySnapshot(null)
  }

  function updateWarrantyDraft(id: string, key: keyof TenantWarranty, value: string | null) {
    if (isViewMode) return
    if (key === 'relatedProjectId') {
      warrantyEditor.updateDraft(id, {
        relatedProjectId: value ?? '',
        warrantySubType: projectById.get(value ?? '')?.subType ?? '',
      })
      return
    }
    warrantyEditor.updateDraft(id, { [key]: value } as Partial<TenantWarranty>)
  }

  function addWarrantyDialogPredecessor() {
    if (isViewMode) return
    if (!advancedWarrantyId || !advancedWarrantyDraft) return
    const selection = predecessorSelections[advancedWarrantyId]
    if (!selection?.tenantId || !selection.warrantyId) return
    const dialogWarranties = warrantyRowsWithActiveDrafts()
    const currentWarranty = dialogWarranties.find((warranty) => warranty.id === advancedWarrantyId)
    if (currentWarranty && isSelfWarrantyPredecessorSelection(currentWarranty, tenantDraft.id, selection.tenantId, selection.warrantyId)) return
    const selectedTenant = selection.tenantId === tenantDraft.id ? tenantDraft : tenants.find((candidate) => candidate.id === selection.tenantId)
    if (!selectedTenant) return
    const predecessorValue = predecessorReference(selection.warrantyId, selectedTenant.tid)
    const currentValues = splitWarrantyPredecessors(advancedWarrantyDraft.predecessor)
    if (currentValues.includes(predecessorValue)) return
    warrantyEditor.updateDraft(advancedWarrantyId, {
      predecessor: [...currentValues, predecessorValue].join(';'),
    })
    setPredecessorSelections((current) => ({
      ...current,
      [advancedWarrantyId]: { tenantId: selection.tenantId, warrantyId: '' },
    }))
  }

  function removeWarrantyDialogPredecessor(value: string) {
    if (isViewMode) return
    if (!advancedWarrantyId || !advancedWarrantyDraft) return
    warrantyEditor.updateDraft(advancedWarrantyId, {
      predecessor: splitWarrantyPredecessors(advancedWarrantyDraft.predecessor).filter((candidate) => candidate !== value).join(';'),
    })
  }

  function saveWarranty(id: string) {
    if (isViewMode) return
    warrantyEditor.save(id, {
      validate: validateWarrantyEditDraft,
      normalize: normalizedWarrantySaveScope,
      commit: (committedDraft) => {
        const currentWarranties = persistedTenant.warranties ?? []
        const currentComputedWarranties = computedWarrantiesForTenant(persistedTenant, currentWarranties)
          const currentWarranty = currentComputedWarranties.find((warranty) => warranty.id === committedDraft.id)
          const hasSuccessors = currentWarranty
          ? successorRefsForWarranty(currentWarranty, currentComputedWarranties, persistedTenant.tid).length > 0
            : false
          const nextWarranty: TenantWarranty = {
            ...committedDraft,
            noWarranty: hasSuccessors ? 'NO' : committedDraft.noWarranty ?? 'NO',
          }
          const nextWarranties = currentWarranties.some((warranty) => warranty.id === committedDraft.id)
            ? currentWarranties.map((warranty) => (warranty.id === committedDraft.id ? nextWarranty : warranty))
            : [...currentWarranties, nextWarranty]
        const committedWarranties = computedWarrantiesForTenant(persistedTenant, nextWarranties)
        updateTenant(persistedTenant.id, { warranties: committedWarranties })
        setDraft((current) => (current ? { ...current, warranties: committedWarranties } : current))
        setMessages([])
      },
      successMessage: 'Warranty saved.',
    })
  }

  function addWarranty() {
    if (isViewMode) return
    if (!canManageWarranties) {
      setMessages([warrantyManageabilityMessage()])
      return
    }

    const warranties = tenantDraft.warranties ?? []
    const warranty = createTenantWarranty(tenantDraft, warranties, project, linkedOpportunityId)
    warrantyEditor.beginAdd(warranty)
  }

  function deleteWarranty(id: string) {
    if (isViewMode) return
    const persistedWarranties = persistedTenant.warranties ?? []
    warrantyEditor.commitDelete(id, {
      confirmMessage: 'Delete this Warranty record?\n\nThis change will be saved immediately and cannot be undone.',
      commit: () => {
        const nextWarranties = persistedWarranties.filter((warranty) => warranty.id !== id)
        const committedWarranties = computedWarrantiesForTenant(persistedTenant, nextWarranties)
        updateTenant(persistedTenant.id, { warranties: committedWarranties })
        setDraft((current) => (current ? { ...current, warranties: committedWarranties } : current))
        setMessages([])
      },
      successMessage: 'Warranty deleted.',
    })
  }

  function cancelWarranty(id: string) {
    const shouldConfirmDiscard = warrantyEditor.isNew(id) && warrantyEditor.hasChanges(id, {
      isMeaningfulNewDraft: (record) => Boolean(record.relatedProjectId || record.startDate || record.endDate || record.initialWarrantyDate || record.remark),
    })
    if (shouldConfirmDiscard) {
      warrantyEditor.commitDelete(id, {
        commit: () => undefined,
        discardMessage: 'Discard this unsaved Warranty draft?\n\nThe entered changes will be lost.',
      })
      return
    }
    warrantyEditor.cancel(id)
  }

  function renderActionButtons() {
    function switchToEditMode() {
      const currentState = typeof location.state === 'object' && location.state ? location.state : {}
      navigate(`${location.pathname}${location.search}`, { replace: true, state: { ...currentState, mode: 'edit' } })
    }

    return (
      <div className="flex flex-wrap gap-2">
        {isViewMode ? (
          <button type="button" className="rounded bg-sf-brand px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700" onClick={switchToEditMode}>
            Edit
          </button>
        ) : null}
        {isViewMode ? null : (
          <>
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
          </>
        )}
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1 text-sm" onClick={cancelTenant}>
          {isViewMode ? 'Back' : 'Cancel'}
        </button>
        {isViewMode ? null : (
          <div className="relative inline-flex">
            <button
              type="button"
              className="rounded-l border border-sf-brand bg-sf-brand px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!isDirty || isSaving}
              onClick={() => saveTenant(false)}
            >
              <SaveButtonLabel saving={isSaving} />
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-r border border-l-0 border-sf-brand bg-sf-brand px-2 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Save actions"
              disabled={!isDirty || isSaving}
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
        )}
      </div>
    )
  }

  function renderHeaderField(label: string, value: ReactNode, width = 'w-44') {
    return (
      <MetadataHeaderField
        label={label}
        controlWidthClassName={width}
        businessEditable={false}
        editor={null}
        readOnlyValue={value}
      />
    )
  }

  function renderPidLinks(pidList: string) {
    return <LinkedProjectsLinks projectIds={pidList} />
  }

  function updateTenantOperationalMode(value: string) {
    if (isViewMode) return
    if (!isManualTenantOperationalMode(value)) return
    setDraft((current) => (current ? { ...current, operationalStatus: value, lastManualOperationalStatus: value } : current))
    setMessages([])
  }

  function renderOperationalStatusOption(value: string) {
    return (
      <OperationalStatusIcon
        status={value}
        showLabel
        className="h-5 w-5 stroke-[3]"
        wrapperClassName="min-w-0 gap-1.5"
        labelClassName="truncate"
      />
    )
  }

  function renderOperationalModeField() {
    const derivedMode = derivedTenantOperationalMode(activeSystem)
    const currentMode = effectiveTenantOperationalMode(tenantDraft, activeSystem)
    const hostedSystemIsOn = !activeSystem || activeSystem.operationalStatus.toLocaleLowerCase() === 'on'
    if (isTenantLifecycleInactive(tenantDraft) || derivedMode !== 'Active' || !hostedSystemIsOn) {
      return (
        <FormField label="Operational Status" controlWidthClassName="w-72">
          <div className="flex h-8 items-center rounded border border-sf-border bg-sf-surface-alt px-2 text-sm">
            {renderOperationalStatusOption(currentMode)}
          </div>
          <span className="block pt-1 text-xs text-sf-text-muted">
            {isTenantLifecycleInactive(tenantDraft) ? 'Derived from System Tenant action' : 'Derived from linked System'}
          </span>
        </FormField>
      )
    }
    const selectValue = isManualTenantOperationalMode(tenantDraft.lastManualOperationalStatus)
      ? tenantDraft.lastManualOperationalStatus
      : isManualTenantOperationalMode(tenantDraft.operationalStatus)
        ? tenantDraft.operationalStatus
        : 'Active'

    return (
      <FormField label="Operational Status" controlWidthClassName="w-72">
        <OperationalStatusSelect
          value={selectValue}
          options={TENANT_MANUAL_OPERATIONAL_MODES}
          disabled={isViewMode}
          onChange={updateTenantOperationalMode}
        />
        <span className="block pt-1 text-xs text-sf-text-muted">Manual Tenant status</span>
      </FormField>
    )
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
    if (formType !== 'CUSTOMER') return ''
    return (
      <WarrantyStatusPresentation
        status={committedWarrantyHeaderStatus.visualStatus}
        label={committedWarrantyHeaderStatus.label}
        tooltip={`Tenant warranty status: ${committedWarrantyHeaderStatus.label}`}
      />
    )
  }

  function renderTenantTypeField() {
    return renderHeaderField('Tenant Type', formType === 'CUSTOMER' ? 'Customer' : formType === 'INTERNAL' ? 'Internal' : 'POC', 'w-44')
  }

  function renderCurrentSidField() {
    if (activeSystem) {
      return renderHeaderField(
        'Current SID',
        <BusinessObjectLink reference={systemReference(activeSystem)}>{hosting.sid || activeSystem.sid || formattedReusedInternalMachineId(activeSystem.machineId)}</BusinessObjectLink>,
      )
    }

    if (tenantDraft.systemId) {
      return (
        <MetadataHeaderField
          label="Current SID"
          controlWidthClassName="w-52"
          businessEditable={false}
          editor={null}
          readOnlyValue={hosting.sid}
        />
      )
    }

    return (
      <FormField label="Current SID" controlWidthClassName="w-52">
        <select
          className="h-8 w-full rounded border border-sf-border bg-white px-2 py-1 text-sm"
          value={tenantDraft.systemId}
          onChange={(event) => attachSystem(event.target.value)}
        >
          <option value="">No system linked</option>
          {systems.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {systemReference(candidate).displayLabel || candidate.id} - {candidate.productType}
            </option>
          ))}
        </select>
      </FormField>
    )
  }

  function renderHeader() {
    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap items-start gap-3">
          {renderTenantTypeField()}
          {renderOperationalModeField()}
          {renderHeaderField('License Number', formType === 'CUSTOMER' ? licenseNumber(headerDeliveryPid, hosting.sid, tenantDraft.tid) : '', 'w-64')}
          {renderHeaderField('Delivery Date', <DateTimeValue value={headerProject?.deliveryDate} semanticType="date" fallback="-" />)}
          {headerPocProject ? renderHeaderField('POC Start Date', <DateTimeValue value={headerPocProject.pocStartDate} semanticType="date" fallback="-" />) : null}
          {headerPocProject ? renderHeaderField('POC End Date', <DateTimeValue value={headerPocProject.pocEndDate} semanticType="date" fallback="-" />) : null}
          {renderHeaderField('Warranty Status', renderWarrantyHeaderStatus())}
          {renderHeaderField('Alert', formType === 'POC' && tenantDraft.pocEndDate ? 'POC period tracked' : '')}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHeaderField('Delivery PID', renderPidLinks(headerDeliveryPid))}
          {renderHeaderField('POC PID', renderPidLinks(headerPocPid))}
          {renderHeaderField('Project Name', headerProject?.opportunityName ?? '')}
          {renderHeaderField('Project Type', projectMainTypeLabel(headerProject?.mainType))}
          {renderCurrentSidField()}
          {renderHeaderField('System Operational Status', renderSystemStatus(activeSystem?.operationalStatus ?? hosting.operationalStatus))}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderHeaderField('Account / End User', tenantDraft.accountName || project?.accountName || '')}
          {renderHeaderField('Region', opportunity?.region ?? activeSystem?.region ?? '')}
          {renderHeaderField('Country', tenantDraft.country || opportunity?.country || activeSystem?.country || '')}
          {renderHeaderField('State', opportunity?.state ?? activeSystem?.state ?? '')}
          {renderHeaderField('Time Zone', tenantTimeZoneDisplayValue(tenantDraft, opportunity, activeSystem))}
          {renderHeaderField('Time Group', tenantTimeGroupFromLocation({ ...tenantDraft, state: opportunity?.state ?? activeSystem?.state ?? '' }, timeGroupLookups).timeGroup || '')}
        </div>
      </section>
    )
  }

  function optionsWithCustom(key: string, options: string[]): string[] {
    return [
      ...options.filter((option) => option !== 'Add new...'),
      ...(customPicklistOptions[key] ?? []),
      ...(options.includes('Add new...') ? ['Add new...'] : []),
    ]
  }

  function renderHostingTab() {
    const hostingRows = activeSystem
      ? [TENANT_HOSTING_FIELDS.map((field) => {
          if (field.key === 'sid') {
            const sid = hosting.sid || activeSystem.sid || formattedReusedInternalMachineId(activeSystem.machineId)
            return sid ? <BusinessObjectLink reference={systemReference(activeSystem)}>{sid}</BusinessObjectLink> : '-'
          }
          if (field.key === 'tenantCount') return activeSystem ? String(tenantCountForSystem(activeSystem, tenants)) : '0'
          return textValue(hosting[field.key])
        })]
      : []

    return (
      <div className="space-y-3">
        <ProductSubTabs tabs={TENANT_HOSTING_TABS} activeTab={activeHostingTab} onTabChange={setActiveHostingTab} />
        <div role="tabpanel" aria-label={TENANT_HOSTING_TABS.find((tab) => tab.id === activeHostingTab)?.label}>
          {activeHostingTab === 'environment'
            ? (
              <ReadonlyTable
                headers={TENANT_HOSTING_FIELDS.map((field) => field.label)}
                rows={hostingRows}
                emptyText="No hosting system is linked to this tenant."
              />
            )
            : activeSystem
              ? <ApplicationConfigurationSummaryTable system={activeSystem} tenants={tenants} />
              : <div className="text-sm text-sf-text-muted">No hosting system is linked to this tenant.</div>}
        </div>
      </div>
    )
  }

  function renderApplicationConfigurationTab() {
    function optionsFor(field: TenantConfigurationFieldMetadata): string[] {
      if (field.configKey === 'product') return PRODUCT_OPTIONS
      if (field.configKey === 'mapCenter') return Array.from(new Set(accounts.map((account) => account.country).filter(Boolean))).sort()
      if (field.configKey === 'crossSystemFeatures') return CROSS_SYSTEM_OPTIONS
      if (field.configKey === 'aiFeatures') return AI_OPTIONS
      if (field.configKey === 'additionalFeatures') return ADDITIONAL_FEATURE_OPTIONS
      return field.options ?? YES_NO_OPTIONS
    }

    function editorFor(field: TenantConfigurationFieldMetadata) {
      const value = configuration[field.configKey]
      if (isViewMode || !field.editable) return textValue(value) || '-'
      if (field.inputType === 'multiselect') {
        return <CheckboxMultiSelect id={`tenant-configuration-${field.configKey}`} label={field.label} selected={Array.isArray(value) ? value.map(String) : []} options={optionsFor(field).filter(Boolean).map((option) => ({ value: option }))} onChange={(selected) => updateConfiguration(field, selected)} />
      }
      if (field.inputType === 'picklist') {
        return (
          <select className="h-8 w-40 rounded border border-sf-border bg-white px-2 py-1 text-sm" value={textValue(value)} onChange={(event) => updateConfiguration(field, event.target.value)}>
            {optionsFor(field).map((option) => <option key={option} value={option}>{option || 'Not set'}</option>)}
          </select>
        )
      }
      if (field.inputType === 'integer') {
        return <input className="h-8 w-24 rounded border border-sf-border px-2 py-1 text-sm" type="number" min="0" step="1" inputMode="numeric" value={value == null ? '' : String(value)} onChange={(event) => updateConfiguration(field, event.target.value === '' ? null : Math.max(0, Math.trunc(Number(event.target.value))))} />
      }
      return <input className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm" value={textValue(value)} onChange={(event) => updateConfiguration(field, event.target.value)} />
    }

    return (
      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="w-max border-collapse text-sm leading-tight" aria-label="Tenant Application Configuration">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              <ConfigurationColumnHeaders fields={CONFIGURATION_FIELDS} />
            </tr>
          </thead>
          <tbody>
            <tr>
              {CONFIGURATION_FIELDS.map((field) => <td key={field.key} className="border border-sf-border px-1.5 py-1 align-top text-sf-text">{editorFor(field)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
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
        readOnly={isViewMode}
        onChange={(documents) => {
          if (isViewMode) return
          updateTenant(persistedTenant.id, { documents })
          setDraft((current) => (current ? { ...current, documents } : current))
          setMessages([])
        }}
      />
    )
  }

  function renderLinkedProjectsTab() {
    return <LinkedProjectsTable rows={linkedProjectRows} />
  }

  function renderActiveTab() {
    if (activeTab === 'tenantConfiguration') return renderApplicationConfigurationTab()
    if (activeTab === 'hosting') return renderHostingTab()
    if (activeTab === 'engagement') return renderEngagementTab()
    if (activeTab === 'linkedProjects') return renderLinkedProjectsTab()
    if (activeTab === 'documents') return renderDocumentsTab()
    if (activeTab === 'activity') {
      return (
        <ActivityTimeline
          events={tenantActivityEvents}
          emptyText="No activity events are linked to this Tenant yet."
        />
      )
    }
    return <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">Usage will be defined in a later phase.</div>
  }

  function renderRemarks() {
    return (
      <section className="sf-card space-y-3 p-3">
        <RemarksGrid
          remarks={(tenantDraft.remarks ?? []) as RemarkRecord[]}
          onChange={(remarks) => {
            if (isViewMode) return
            updateTenant(persistedTenant.id, { remarks })
            setDraft((current) => (current ? { ...current, remarks } : current))
            setMessages([])
          }}
          typeOptions={optionsWithCustom(TENANT_REMARK_TYPE_PICKLIST_KEY, [...REMARK_TYPE_OPTIONS, 'Warranty', 'Add new...'])}
          onAddTypeOption={(value) => setCustomPicklistOptions((current) => addCustomPicklistOption(current, TENANT_REMARK_TYPE_PICKLIST_KEY, value))}
          readOnly={isViewMode}
        />
      </section>
    )
  }

  function renderConfigurationHistory() {
    const records = configurationHistoryReadModel(persistedTenant)
    return (
      <section className="sf-card space-y-3 p-3">
        <h2 className="text-lg font-semibold text-sf-text">Configuration History</h2>
        <ConfigurationHistorySection
          records={records}
          fields={CONFIGURATION_FIELDS}
          emptyText="No configuration changes have been recorded for this POC tenant."
          tidValue={() => 'this'}
        />
      </section>
    )
  }

  function renderWarranties() {
    const warranties = warrantyRowsWithActiveDrafts()
    if (!canManageWarranties) {
      return (
        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Warranties</h2>
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Warranty can be managed only after the tenant is linked to a Project/Opportunity.
          </div>
          <ReadonlyTable
            headers={TENANT_WARRANTY_HEADERS.slice(1)}
            rows={warranties.map((warranty, warrantyIndex) => [
              warranty.warrantyId,
              warranty.warrantyType,
              warranty.warrantySubType ?? projectById.get(warranty.relatedProjectId)?.subType ?? '',
              warrantyIndex === 0 ? <Check className="mx-auto h-4 w-4 text-black" aria-label="First warranty" /> : '',
              formatWarrantyRefs(predecessorRefsForWarranty(warranty, tenantDraft.tid)),
              formatWarrantyRefs(successorRefsForWarranty(warranty, warranties, tenantDraft.tid)),
              warranty.accountId,
              warranty.relatedProjectId,
              warranty.opportunityId,
              <DateTimeValue value={warranty.startDate} semanticType="date" />,
              <DateTimeValue value={warranty.endDate} semanticType="date" />,
              warranty.durationDays ?? '',
              warranty.daysBeforeExpiration ?? '',
              <WarrantyStatusPresentation status={warranty.warrantyStatus} />,
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
          {isViewMode ? null : (
            <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addWarranty}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add warranty
            </button>
          )}
        </div>
        {warrantyEditor.notification ? (
          <div
            className={[
              'rounded border px-3 py-2 text-sm',
              warrantyEditor.notification.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700',
            ].join(' ')}
            role="status"
          >
            {warrantyEditor.notification.message}
          </div>
        ) : null}
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {TENANT_WARRANTY_HEADERS.map((header) => (
                  <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold">
                    {header}
                    {header === WARRANTY_FIELD_LABELS.relatedProjectId && warrantyContextRequiresField(TENANT_WARRANTY_SCHEMA, 'relatedProjectId') ? <RequiredFieldMarker /> : null}
                    {header === WARRANTY_FIELD_LABELS.startDate && warrantyContextRequiresField(TENANT_WARRANTY_SCHEMA, 'startDate') ? <RequiredFieldMarker /> : null}
                    {header === WARRANTY_FIELD_LABELS.endDate && warrantyContextRequiresField(TENANT_WARRANTY_SCHEMA, 'endDate') ? <RequiredFieldMarker /> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {warranties.map((warranty, warrantyIndex) => {
                const isEditingWarranty = !isViewMode && warrantyEditor.isEditing(warranty.id)
                const isSavingWarranty = warrantyEditor.isSaving(warranty.id)
                const isDeletingWarranty = warrantyEditor.isDeleting(warranty.id)
                const warrantyErrors = warrantyEditor.errorsFor(warranty.id)
                const relatedProjectHasError = warrantyErrors.some((error) => error.toLowerCase().includes('project'))
                const startDateError = warrantyErrors.find((error) => error === WARRANTY_START_DATE_REQUIRED_MESSAGE || error === WARRANTY_DATE_ORDER_MESSAGE)
                const endDateError = warrantyErrors.find((error) => error === WARRANTY_END_DATE_REQUIRED_MESSAGE)
                const canAttemptWarrantySave = !isSavingWarranty && warrantyEditor.isEditing(warranty.id)
                return (
                <tr key={warranty.id}>
                  <td className="border border-sf-border px-1.5 py-1">
                    <div className="flex items-center gap-2">
                      {isViewMode ? null : (
                        isEditingWarranty ? (
                          <>
                            <EditableChildObjectActionButton
                              variant="primary"
                              disabled={!canAttemptWarrantySave}
                              onClick={() => saveWarranty(warranty.id)}
                            >
                              <Save className="h-3.5 w-3.5" aria-hidden="true" />
                              {isSavingWarranty ? 'Saving...' : 'Save'}
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton
                              disabled={isSavingWarranty || isDeletingWarranty}
                              onClick={() => cancelWarranty(warranty.id)}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancel
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton onClick={() => openAdvancedWarrantyDialog(warranty)}>
                              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Advanced Edit
                            </EditableChildObjectActionButton>
                          </>
                        ) : (
                          <>
                            <EditableChildObjectActionButton onClick={() => editWarranty(warranty)}>
                              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Inline Edit
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton onClick={() => openAdvancedWarrantyDialog(warranty)}>
                              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Advanced Edit
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton variant="danger" disabled={isDeletingWarranty} onClick={() => deleteWarranty(warranty.id)}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {isDeletingWarranty ? 'Deleting...' : 'Delete'}
                            </EditableChildObjectActionButton>
                          </>
                        )
                      )}
                    </div>
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantyId}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantyType}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.warrantySubType ?? projectById.get(warranty.relatedProjectId)?.subType ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1 text-center">{warrantyIndex === 0 ? <Check className="mx-auto h-4 w-4 text-black" aria-label="First warranty" /> : ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">{formatWarrantyRefs(predecessorRefsForWarranty(warranty, tenantDraft.tid))}</td>
                  <td className="border border-sf-border px-1.5 py-1">{formatWarrantyRefs(successorRefsForWarranty(warranty, warranties, tenantDraft.tid))}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.accountId}</td>
                  <td className="border border-sf-border px-1.5 py-1">
                    {isEditingWarranty ? (
                      <>
                        <select
                          className={[
                            'h-8 min-w-44 rounded border px-2 py-1 text-sm',
                            relatedProjectHasError ? 'border-red-500' : 'border-sf-border',
                          ].join(' ')}
                          value={warranty.relatedProjectId}
                          onChange={(event) => updateWarrantyDraft(warranty.id, 'relatedProjectId', event.target.value)}
                        >
                          <option value="">Select project</option>
                          {relatedProjects.map((candidate) => (
                            <option key={candidate.id} value={candidate.id}>
                              {warrantyRelatedProjectOptionLabel(candidate)}
                            </option>
                          ))}
                        </select>
                        {relatedProjectHasError ? (
                          <div className="mt-1 text-xs text-red-700">{warrantyErrors.join(' ')}</div>
                        ) : null}
                      </>
                    ) : (
                      warrantyRelatedProjectOptionLabel(relatedProjects.find((candidate) => candidate.id === warranty.relatedProjectId)) || warranty.relatedProjectId
                    )}
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.opportunityId}</td>
                  <td className="border border-sf-border px-1.5 py-1">
                    {isEditingWarranty ? (
                      <>
                        <input
                          className={['h-8 rounded border px-2 py-1 text-sm', startDateError ? 'border-red-500' : 'border-sf-border'].join(' ')}
                          type="date"
                          value={warranty.startDate ?? ''}
                          onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateWarrantyDraft(warranty.id, 'startDate', nextValue))}
                          onChange={(event) => updateWarrantyDraft(warranty.id, 'startDate', event.target.value || null)}
                        />
                        {startDateError ? <div className="mt-1 text-xs text-red-700">{startDateError}</div> : null}
                      </>
                    ) : (
                      <DateTimeValue value={warranty.startDate} semanticType="date" />
                    )}
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">
                    {isEditingWarranty ? (
                      <>
                        <input
                          className={['h-8 rounded border px-2 py-1 text-sm', endDateError ? 'border-red-500' : 'border-sf-border'].join(' ')}
                          type="date"
                          value={warranty.endDate ?? ''}
                          onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateWarrantyDraft(warranty.id, 'endDate', nextValue))}
                          onChange={(event) => updateWarrantyDraft(warranty.id, 'endDate', event.target.value || null)}
                        />
                        {endDateError ? <div className="mt-1 text-xs text-red-700">{endDateError}</div> : null}
                      </>
                    ) : (
                      <DateTimeValue value={warranty.endDate} semanticType="date" />
                    )}
                  </td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.durationDays ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.daysBeforeExpiration ?? ''}</td>
                  <td className="border border-sf-border px-1.5 py-1"><WarrantyStatusPresentation status={warranty.warrantyStatus} /></td>
                  <td className="border border-sf-border px-1.5 py-1">{warranty.alerts}</td>
                  <td className="min-w-80 border border-sf-border px-1.5 py-1">
                    {isEditingWarranty ? (
                      <RichTextEditor
                        value={warranty.remark}
                        onChange={(value) => updateWarrantyDraft(warranty.id, 'remark', value)}
                        minHeightClassName="min-h-16"
                        toolbarMode="focus"
                      />
                    ) : (
                      <RichTextContent value={warranty.remark} />
                    )}
                  </td>
                </tr>
                )
              })}
              {warranties.length === 0 ? (
                <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={TENANT_WARRANTY_HEADERS.length}>No warranty records yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  function renderWarrantyDialog() {
    if (!advancedWarrantyId || !advancedWarrantyDraft) return null
    const dialogWarranties = warrantyRowsWithActiveDrafts()
    const warranty = dialogWarranties.find((candidate) => candidate.id === advancedWarrantyId)
    if (!warranty) return null
    const selectedPredecessorTenantId = predecessorSelections[warranty.id]?.tenantId ?? tenantDraft.id
    const predecessorOptions = warrantyOptionsForTenant(selectedPredecessorTenantId, warranty.id)
    const predecessorValues = splitWarrantyPredecessors(advancedWarrantyDraft.predecessor)
    const hasSuccessors = successorRefsForWarranty(warranty, dialogWarranties, tenantDraft.tid).length > 0
    const advancedWarrantyErrors = warrantyEditor.errorsFor(warranty.id)
    const advancedRelatedProjectError = advancedWarrantyErrors.find((error) => error.toLowerCase().includes('project'))
    const advancedStartDateError = advancedWarrantyErrors.find((error) => error === WARRANTY_START_DATE_REQUIRED_MESSAGE || error === WARRANTY_DATE_ORDER_MESSAGE)
    const advancedEndDateError = advancedWarrantyErrors.find((error) => error === WARRANTY_END_DATE_REQUIRED_MESSAGE)

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="presentation">
        <div className="w-full max-w-2xl rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="false" aria-labelledby="warranty-dialog-title">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="warranty-dialog-title" className="text-lg font-semibold">Edit warranty {warranty.warrantyId}</h2>
              <p className="text-xs text-sf-text-muted">Advanced changes stay in the editable row draft until row Save is clicked.</p>
            </div>
            <EditableChildObjectActionButton
              className="rounded border border-sf-border bg-white px-3 py-1 text-sm"
              onClick={closeAdvancedWarrantyDialog}
            >
              Cancel
            </EditableChildObjectActionButton>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">
                {WARRANTY_FIELD_LABELS.relatedProjectId}
                {warrantyContextRequiresField(TENANT_WARRANTY_SCHEMA, 'relatedProjectId') ? <RequiredFieldMarker /> : null}
              </span>
              <select
                className={['h-9 w-full rounded border px-2 py-1', advancedRelatedProjectError ? 'border-red-500' : 'border-sf-border'].join(' ')}
                value={advancedWarrantyDraft.relatedProjectId}
                onChange={(event) => updateWarrantyDraft(advancedWarrantyId, 'relatedProjectId', event.target.value)}
              >
                <option value="">Select project</option>
                {relatedProjects.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {warrantyRelatedProjectOptionLabel(candidate)}
                  </option>
                ))}
              </select>
              {advancedRelatedProjectError ? <div className="mt-1 text-xs text-red-700">{advancedRelatedProjectError}</div> : null}
            </label>
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">{WARRANTY_FIELD_LABELS.subType}</span>
              <div className="flex h-9 items-center rounded border border-sf-border bg-sf-surface-alt px-2">
                {advancedWarrantyDraft.warrantySubType ?? projectById.get(advancedWarrantyDraft.relatedProjectId)?.subType ?? ''}
              </div>
            </div>
            <div className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Status</span>
              <div className="flex h-9 items-center rounded border border-sf-border bg-sf-surface-alt px-2"><WarrantyStatusPresentation status={warranty.warrantyStatus} /></div>
            </div>
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Start Date<RequiredFieldMarker /></span>
              <input
                className={['h-9 w-full rounded border px-2 py-1', advancedStartDateError ? 'border-red-500' : 'border-sf-border'].join(' ')}
                type="date"
                value={advancedWarrantyDraft.startDate ?? ''}
                onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateWarrantyDraft(advancedWarrantyId, 'startDate', nextValue))}
                onChange={(event) => updateWarrantyDraft(advancedWarrantyId, 'startDate', event.target.value || null)}
              />
              {advancedStartDateError ? <div className="mt-1 text-xs text-red-700">{advancedStartDateError}</div> : null}
            </label>
            <label className="space-y-1">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">End Date<RequiredFieldMarker /></span>
              <input
                className={['h-9 w-full rounded border px-2 py-1', advancedEndDateError ? 'border-red-500' : 'border-sf-border'].join(' ')}
                type="date"
                value={advancedWarrantyDraft.endDate ?? ''}
                onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateWarrantyDraft(advancedWarrantyId, 'endDate', nextValue))}
                onChange={(event) => updateWarrantyDraft(advancedWarrantyId, 'endDate', event.target.value || null)}
              />
              {advancedEndDateError ? <div className="mt-1 text-xs text-red-700">{advancedEndDateError}</div> : null}
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
                  <option value="">ID</option>
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
                value={hasSuccessors ? 'NO' : advancedWarrantyDraft.noWarranty === 'YES' ? 'YES' : 'NO'}
                disabled={hasSuccessors}
                title={hasSuccessors ? 'No Warranty is locked because this warranty has a successor.' : undefined}
                onChange={(event) => updateWarrantyDraft(advancedWarrantyId, 'noWarranty', event.target.value as YesNo)}
              >
                {YES_NO_OPTIONS.filter(Boolean).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="space-y-1 md:col-span-2">
              <span className="block text-xs font-semibold uppercase text-sf-text-muted">Remarks</span>
              <RichTextEditor value={advancedWarrantyDraft.remark} onChange={(value) => updateWarrantyDraft(advancedWarrantyId, 'remark', value)} />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <EditableChildObjectActionButton
              onClick={closeAdvancedWarrantyDialog}
            >
              Cancel
            </EditableChildObjectActionButton>
            <EditableChildObjectActionButton
              variant="primary"
              onClick={saveAdvancedWarrantyDialog}
            >
              Save
            </EditableChildObjectActionButton>
          </div>
        </div>
      </div>,
      document.body,
    )
  }

  return (
    <WorkspaceFrame>
      {navigationBlocker.state === 'blocked' ? (
        <UnsavedChangesDialog
          onSave={() => saveTenant(true, () => navigationBlocker.proceed?.())}
          onDiscardChanges={() => navigationBlocker.proceed?.()}
          onCancel={() => navigationBlocker.reset?.()}
        />
      ) : null}
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <OperationalStatusIcon status={effectiveTenantOperationalMode(tenantDraft, activeSystem)} />
            <span>{`Tenant ${tenantDraft.tid}`}</span>
          </span>
        }
        subtitle={`${formType === 'POC' ? 'Tenant form-POC' : 'Tenant form-Customer'} foundation`}
        actions={renderActionButtons()}
      />
      <WorkspaceScrollContent className="space-y-4" viewMode={isViewMode}>
      {messages.length > 0 ? (
        <div className={formMessageClassName(messages)}>
          {messages.map((message) => <div key={message}>{message}</div>)}
        </div>
      ) : null}
      {renderHeader()}
      {renderWarrantyDialog()}
      <section className="rounded border border-sf-border bg-sf-surface">
        <div className="sticky top-0 z-10 flex flex-nowrap overflow-x-auto border-b border-sf-border bg-sf-surface">
          {TENANT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'sf-view-mode-allow border-b-2 px-4 py-2 text-base font-semibold',
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
      {showWarrantySection ? renderWarranties() : null}
      {renderRemarks()}
      {renderConfigurationHistory()}
      </WorkspaceScrollContent>
    </WorkspaceFrame>
  )
}
