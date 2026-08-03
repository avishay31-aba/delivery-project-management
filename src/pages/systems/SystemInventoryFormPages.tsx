import { type ReactNode, useMemo, useState } from 'react'
import { useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown,
  ChevronRight,
  Crosshair,
  Database,
  DoorOpen,
  Edit2,
  Globe2,
  Grid3X3,
  Network,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader, WorkspaceFrame, WorkspaceScrollContent } from '@/components/record'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { ActivityTimeline } from '@/components/activity'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { OwnerGrid } from '@/components/owners'
import { LinkedProjectsTable } from '@/components/projects/LinkedProjectsTable'
import { RemarksGrid } from '@/components/remarks'
import { ConfigurationHistorySection } from '@/components/application-configuration/ConfigurationHistorySection'
import {
  EMPTY_SYSTEM_CANDIDATE_FILTERS,
  SystemCandidateDialog,
  SystemVersionUpdatePanel,
  type SystemCandidateFilters,
  type SystemCandidateSortKey,
} from '@/components/systems'
import { TenantWarrantyContractSections } from '@/components/tenants/TenantWarrantyContractSections'
import { BusinessIdListLinks, BusinessObjectLink, FormField, MaintenanceStatusPresentation, MetadataHeaderField, OperationalStatusIcon, PlaceholderCard, SaveButtonLabel, TableSection, formMessageClassName } from '@/components/ui'
import { EditableChildObjectActionButton } from '@/components/child-objects'
import { configurationColumnGroupLabel, formatConfigurationCellValue } from '@/components/configuration'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning'
import { useReactiveDraftSync } from '@/hooks/useReactiveDraftSync'
import { handleDateInputPaste } from '@/utils/date-input'
import { isRouteViewMode } from '@/utils/route-mode'
import {
  HOSTING_OPTIONS,
  cloudPlatformOptionsForHosting,
  cloudRegionOptionsForCloudPlatform,
  cspOptionsForCloudPlatform,
  isCloudRegionWithinUsedRegion,
  isCognitoRegionCompatibleWithUsedRegion,
  requiresCloudPlatform,
  requiresCloudRegion,
} from '@/config/cloud-platform-metadata'
import {
  APPLICATION_CONFIGURATION_SUMMARY_FIELDS,
  type TenantConfigurationFieldMetadata,
} from '@/config/application-configuration-fields'
import { configurationHistoryReadModel } from '@/domain/application-configuration'
import {
  PERFORMANCE_TIER_OPTIONS,
  VPN_TYPE_OPTIONS,
  YES_NO_REQUIRED_OPTIONS,
} from '@/config/picklist-options'
import {
  productionSystemMetadata,
  reusedInternalSystemMetadata,
  type SystemInventoryHeaderField,
  type SystemInventoryMetadata,
} from '@/config/system-inventory-metadata'
import type { NewTenantRequirement, Opportunity, ProductionSystemInventoryItem, Project, ProjectSystemLink, ReusedInternalSystem, System, Tenant } from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'
import {
  activeProjectTenantLinks,
} from '@/domain/allocation-context'
import { infrastructureItemReference, projectReference, tenantReference } from '@/domain/business-reference'
import {
  hostingContextPatchForFieldChange,
  sanitizeHostingContext,
  validateHostingContext,
} from '@/domain/hosting-context'
import {
  hostedTenantsForSystem,
  ACTIVE_POC_PURPOSE_LOCK_MESSAGE,
  currentProjectPidsForSystem,
  hasActiveOpenPocPurposeLock,
  isOccupationDateRequiredForPurpose,
  linkedProjectDisplay,
  linkedProjectIdsForSystem,
  reusedInternalPurposeHistory,
  shouldConfirmEarlyNonPocPurposeChange,
  SYSTEM_SOURCE_PRODUCTION,
  SYSTEM_SOURCE_REUSED_INTERNAL,
  systemApplicationConfigurationSummary,
  systemIdentity,
  systemTimeGroup,
  systemTimeGroupAlert,
  tenantCountForSystem,
  validateReusedInternalPurposeChange,
  validateReusedInternalMachineId,
  validateSystemInventoryRequiredFields,
} from '@/domain/system-inventory'
import { linkedProjectRowsForSystem } from '@/domain/linked-projects'
import { systemCurrentBuildLabel, systemCurrentVersionLabel } from '@/domain/system-version-update'
import { REMARK_TYPE_OPTIONS, type RemarkRecord } from '@/domain/remarks'
import {
  allSystemRecords,
  eligibleInfrastructureItemsForSystemLink,
  infrastructureItemsForSystem,
  infrastructureWarrantyAlert,
} from '@/domain/infrastructure-item'
import { displayWarrantyStatus } from '@/domain/warranty-collection'
import type { OwnerRecord } from '@/domain/owners'
import { activityEventsForSystem } from '@/domain/activity-log'
import {
  tenantMoveDefaultMode,
  tenantMoveDefaultRegion,
  tenantMoveDestinationCandidates,
  validateTenantMoveDestination,
  type TenantMoveMode,
} from '@/domain/tenant-operations'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'

type InventoryRecord = ProductionSystemInventoryItem | ReusedInternalSystem | System
type SaveTimestampOptions = { preserveNewState?: boolean }
type InventorySectionId = 'header' | 'configuration' | 'tabs' | 'purposeHistory'
type InfrastructureInnerTab = 'environment' | 'infrastructure'
type MoveTenantConfirmation = { tenantId: string; destinationSystemId: string }
const SYSTEM_REMARK_TYPE_PICKLIST_KEY = 'systemRemarkType'

const DEFAULT_COLLAPSED_SECTIONS: Record<InventorySectionId, boolean> = {
  header: false,
  configuration: false,
  tabs: false,
  purposeHistory: false,
}
const PRODUCT_CHANGE_WITH_TENANTS_MESSAGE =
  'Product cannot be changed because this system already has tenant(s) created for the current product type. Move or remove the related tenant(s) before changing the system product.'

const ENVIRONMENT_FIELDS = [
  { key: 'hostingType', label: 'Hosting', inputType: 'picklist' },
  { key: 'cloudPlatform', label: 'Cloud Platform', inputType: 'picklist' },
  { key: 'csp', label: 'CSP', inputType: 'picklist' },
  { key: 'cloudRegion', label: 'Cloud Region', inputType: 'picklist' },
  { key: 'performanceTier', label: 'Performance Tier', inputType: 'picklist' },
]
const INFRASTRUCTURE_IDENTIFIER_FIELDS = [
  { key: 'statisticsId', label: 'Statistics ID' },
  { key: 'authId', label: 'Auth ID' },
  { key: 'rdmId', label: 'RDM ID' },
]
const ACCESS_DETAIL_FIELDS = [
  { key: 'url', label: 'URL', inputType: 'text' },
  { key: 'ipRestrictionEnabled', label: 'IP Restriction', inputType: 'yesNo' },
  { key: 'vpnEnabled', label: 'VPN', inputType: 'yesNo' },
  { key: 'vpnType', label: 'VPN Type', inputType: 'picklist' },
]
const EXTERNAL_INTERFACE_FIELD = { key: 'externalInterface', label: 'External Interface', inputType: 'boolean' }
const PRODUCT_LOGO_COLORS: Record<string, string> = {
  Tangles: 'text-blue-600',
  'Tangles Light': 'text-cyan-600',
  Webloc: 'text-emerald-600',
  Weaver: 'text-violet-600',
  Trapdoor: 'text-amber-600',
  Lynx: 'text-rose-600',
  DataAPI: 'text-slate-700',
}

function ProductLogoIcon({ product }: { product: string }) {
  const Icon =
    product === 'Tangles'
      ? Network
      : product === 'Tangles Light'
        ? Sparkles
        : product === 'Webloc'
          ? Globe2
          : product === 'Weaver'
            ? Grid3X3
            : product === 'Trapdoor'
              ? DoorOpen
              : product === 'Lynx'
                ? Crosshair
                : product === 'DataAPI'
                  ? Database
                  : null

  if (!Icon) return null
  return <Icon className={['h-9 w-9', PRODUCT_LOGO_COLORS[product] ?? 'text-slate-500'].join(' ')} aria-label={`${product} logo`} />
}

const APPLICATION_SUMMARY_FIELDS = APPLICATION_CONFIGURATION_SUMMARY_FIELDS

function cloneRecord<T extends InventoryRecord>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function systemParentSaveScope<T extends InventoryRecord>(record: T): Partial<T> {
  const {
    documents: _documents,
    owners: _owners,
    remarks: _remarks,
    updatedAt: _updatedAt,
    ...parentScope
  } = record
  return parentScope as Partial<T>
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

function normalizeProduct(value: unknown): string {
  return textValue(value).trim().toLocaleLowerCase()
}

function readRecordValue(record: InventoryRecord, key: string): unknown {
  return (record as unknown as Record<string, unknown>)[key]
}

function generatedSystemUrl(record: InventoryRecord): string {
  if ('machineId' in record && record.machineId) return `https://${record.machineId}.example.internal`
  if ('sid' in record && record.sid) return `https://${record.sid}.example.production`
  return ''
}

function fieldClassName(isChanged: boolean, isInvalid = false): string {
  return [
    'h-8 w-full rounded border border-sf-border px-2 py-1 text-sm leading-tight',
    isChanged ? 'bg-yellow-100' : 'bg-white',
    isInvalid ? 'border-red-500 ring-1 ring-red-500' : '',
  ].join(' ')
}

function CollapsibleSection({
  title,
  subtitle,
  collapsed,
  onToggle,
  children,
}: {
  title: string
  subtitle?: string
  collapsed: boolean
  onToggle: () => void
  children: ReactNode
}) {
  const Indicator = collapsed ? ChevronRight : ChevronDown

  return (
    <section className="sf-card space-y-3 p-3">
      <button type="button" className="sf-view-mode-allow flex min-w-0 items-start gap-2 text-left" onClick={onToggle} aria-expanded={!collapsed}>
        <Indicator className="mt-0.5 h-4 w-4 shrink-0 text-sf-text-muted" aria-hidden="true" />
        <span>
          <span className="block text-lg font-semibold text-sf-text">{title}</span>
          {subtitle ? <span className="block text-sm text-sf-text-muted">{subtitle}</span> : null}
        </span>
      </button>
      {collapsed ? null : children}
    </section>
  )
}

function deriveLinkedProjects(record: InventoryRecord, projects: Project[], projectSystems: ProjectSystemLink[] = []): string {
  return linkedProjectDisplay(record, projects, projectSystems)
}

function deriveCurrentPid(record: InventoryRecord, projects: Project[], projectSystems: ProjectSystemLink[] = []): string {
  return currentProjectPidsForSystem(record, projects, projectSystems).join('; ')
}

function deriveTenantCount(record: InventoryRecord, tenants: Tenant[]): number {
  return tenantCountForSystem(record, tenants)
}

function deriveTimeGroup(record: InventoryRecord, tenants: Tenant[]): string {
  return systemTimeGroup(record, tenants)
}

function deriveCurrentSid(record: InventoryRecord, systems: System[]): string {
  if ('sid' in record && record.sid) return record.sid
  if (!('machineId' in record) || !record.machineId) return ''
  return systems
    .filter((system) => system.machineId === record.machineId && system.sid)
    .map((system) => system.sid as string)
    .filter((sid, index, all) => all.indexOf(sid) === index)
    .join('; ')
}

function derivedValue(
  record: InventoryRecord,
  key: string,
  projects: Project[],
  tenants: Tenant[],
  projectSystems: ProjectSystemLink[] = [],
  systems: System[] = [],
  versionUpdates: ReturnType<typeof useAppStore.getState>['versionUpdates'] = [],
  referenceData: ReturnType<typeof useAppStore.getState>['referenceData'] = [],
): string {
  if (key === 'currentSid') return deriveCurrentSid(record, systems)
  if (key === 'currentPid') return deriveCurrentPid(record, projects, projectSystems)
  if (key === 'currentVersion') return systemCurrentVersionLabel(versionUpdates, referenceData, record.id, record.currentVersionUpdateId)
  if (key === 'currentBuild') return systemCurrentBuildLabel(versionUpdates, referenceData, record.id, record.currentVersionUpdateId)
  if (key === 'linkedProjects') return deriveLinkedProjects(record, projects, projectSystems)
  if (key === 'tenantCount') return String(deriveTenantCount(record, tenants))
  if (key === 'usedInRegion') return textValue(readRecordValue(record, 'usedInRegion')) || textValue(readRecordValue(record, 'region')) || textValue(readRecordValue(record, 'timeGroup'))
  if (key === 'timeGroup') return deriveTimeGroup(record, tenants)
  if (key === 'availability' && 'source' in record && record.source === SYSTEM_SOURCE_PRODUCTION) return 'Available'
  if (key === 'timeGroupAlert') {
    return systemTimeGroupAlert(record, tenants, readRecordValue(record, key))
  }
  return textValue(readRecordValue(record, key))
}

function OperationalStatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <OperationalStatusIcon status={value} showLabel className="h-5 w-5 stroke-[3]" />
    </span>
  )
}

function OperationalStatusSelect({
  value,
  options,
  isChanged,
  isInvalid,
  onChange,
}: {
  value: string
  options: string[]
  isChanged: boolean
  isInvalid: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        className={[fieldClassName(isChanged, isInvalid), 'flex items-center justify-between gap-2 text-left'].join(' ')}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <OperationalStatusBadge value={value} />
        <ChevronDown className="h-4 w-4 shrink-0 text-sf-text-muted" aria-hidden="true" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-20 mt-1 w-full rounded border border-sf-border bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="flex w-full items-center px-2 py-1 text-left hover:bg-sf-surface-alt"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
            >
              <OperationalStatusBadge value={option} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export function InventoryForm<T extends InventoryRecord>({
  record,
  records,
  metadata,
  onSave,
  dashboardPath,
}: {
  record: T | undefined
  records: T[]
  metadata: SystemInventoryMetadata
  onSave: (id: string, patch: Partial<T>, options?: SaveTimestampOptions, tenantRemovalIds?: string[]) => void
  dashboardPath: string
}) {
  useDateTimePresentationPreference()
  const navigate = useNavigate()
  const location = useLocation()
  const isViewMode = isRouteViewMode(location)
  const isNewRecordSession = (location.state as { newRecordSession?: boolean } | null)?.newRecordSession === true
  const accounts = useAppStore((state) => state.accounts)
  const projects = useAppStore((state) => state.projects)
  const opportunities = useAppStore((state) => state.opportunities)
  const tenants = useAppStore((state) => state.tenants)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const referenceData = useAppStore((state) => state.referenceData)
  const versionUpdates = useAppStore((state) => state.versionUpdates)
  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const allocatedSystems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const createTenantFromSystemRequirement = useAppStore((state) => state.createTenantFromSystemRequirement)
  const createInternalTenantForSystem = useAppStore((state) => state.createInternalTenantForSystem)
  const rollbackSystemFormTenantCreation = useAppStore((state) => state.rollbackSystemFormTenantCreation)
  const deleteTenantFromSystem = useAppStore((state) => state.deleteTenantFromSystem)
  const cancelTenantFromSystem = useAppStore((state) => state.cancelTenantFromSystem)
  const moveTenantToSystem = useAppStore((state) => state.moveTenantToSystem)
  const linkInfrastructureItemToSystem = useAppStore((state) => state.linkInfrastructureItemToSystem)
  const unlinkInfrastructureItemFromSystem = useAppStore((state) => state.unlinkInfrastructureItemFromSystem)
  const {
    value: draft,
    setValue: setDraft,
    reset: resetDraft,
    undo: undoDraft,
    canUndo,
  } = useUndoHistory<T | null>(record ? cloneRecord(record) : null, {
    clone: (value) => (value ? cloneRecord(value) : value),
    isEqual: valuesEqual,
  })
  const [activeTab, setActiveTab] = useState(metadata.tabs[0]?.id ?? 'tenant')
  const [activeInfrastructureTab, setActiveInfrastructureTab] = useState<InfrastructureInnerTab>('environment')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [addTenantOpen, setAddTenantOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedRequirementId, setSelectedRequirementId] = useState('')
  const [moveTenantId, setMoveTenantId] = useState('')
  const [moveMode, setMoveMode] = useState<TenantMoveMode>('DELIVERED')
  const [selectedMoveDestinationIds, setSelectedMoveDestinationIds] = useState<string[]>([])
  const [addInfrastructureOpen, setAddInfrastructureOpen] = useState(false)
  const [selectedInfrastructureItemIds, setSelectedInfrastructureItemIds] = useState<string[]>([])
  const [infrastructureSearch, setInfrastructureSearch] = useState('')
  const [infrastructureCategoryFilter, setInfrastructureCategoryFilter] = useState('')
  const [infrastructureTypeFilter, setInfrastructureTypeFilter] = useState('')
  const [moveCandidateSearch, setMoveCandidateSearch] = useState('')
  const [moveCandidateFilters, setMoveCandidateFilters] = useState<SystemCandidateFilters>(EMPTY_SYSTEM_CANDIDATE_FILTERS)
  const [moveCandidateSortKey, setMoveCandidateSortKey] = useState<SystemCandidateSortKey>('id')
  const [moveCandidateSortDirection, setMoveCandidateSortDirection] = useState<'asc' | 'desc'>('asc')
  const [moveResult, setMoveResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [moveConfirmation, setMoveConfirmation] = useState<MoveTenantConfirmation | null>(null)
  const [isMoveCommitting, setIsMoveCommitting] = useState(false)
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [pendingAddNew, setPendingAddNew] = useState<{ key: string; value: string } | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<InventorySectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)
  const [bypassUnsavedPrompt, setBypassUnsavedPrompt] = useState(false)
  const [pendingTenantCreationIds, setPendingTenantCreationIds] = useState<string[]>([])
  const [pendingTenantRemovalIds, setPendingTenantRemovalIds] = useState<string[]>([])
  const isDirty = Boolean(record && draft && (isNewRecordSession || !valuesEqual(systemParentSaveScope(record), systemParentSaveScope(draft)) || pendingTenantCreationIds.length > 0 || pendingTenantRemovalIds.length > 0))
  const navigationBlocker = useBlocker(isDirty && !isViewMode && !bypassUnsavedPrompt)
  useBeforeUnloadWarning(isDirty && !isViewMode)

  useReactiveDraftSync({
    source: record ? cloneRecord(record) : null,
    draft,
    resetDraft,
    clone: (value) => (value ? cloneRecord(value) : value),
    isEqual: valuesEqual,
  })

  if (!record || !draft) {
    return (
      <PlaceholderCard
        title="System inventory record not found"
        description="No inventory record exists for this ID."
      />
    )
  }

  const activeRecord = record
  const activeDraft = draft
  const systemTabs = [...metadata.tabs, { id: 'activity', label: 'Activity Log' }]
  const systemActivityEvents = (() => {
    const ids = [systemIdentity(activeRecord), readRecordValue(activeRecord, 'sid'), readRecordValue(activeRecord, 'machineId'), activeRecord.id]
      .map((value) => textValue(value))
      .filter(Boolean)
    const seen = new Set<string>()
    return ids.flatMap((id) => activityEventsForSystem(activityEvents, id)).filter((event) => {
      if (seen.has(event.id)) return false
      seen.add(event.id)
      return true
    })
  })()
  const invalidFields = new Set<string>()

  function allocatedSystemForTenantCreation(): System | undefined {
    if ('systemClass' in activeRecord) return activeRecord
    return allocatedSystems.find((system) => {
      const sameSid = 'sid' in activeRecord && activeRecord.sid && system.sid === activeRecord.sid
      const sameMachine = 'machineId' in activeRecord && activeRecord.machineId && system.machineId === activeRecord.machineId
      return sameSid || sameMachine
    })
  }

  function productChangeBlocked(value: unknown): boolean {
    if (normalizeProduct(value) === normalizeProduct(readRecordValue(activeDraft, 'productType'))) return false
    return hostedTenantsForDraft().length > 0
  }

  function updateField(key: string, value: unknown) {
    if (isViewMode) return
    if (key === 'productType' && productChangeBlocked(value)) {
      setMessages([PRODUCT_CHANGE_WITH_TENANTS_MESSAGE])
      return
    }
    setDraft((current) => {
      if (!current) return current
      const previousUrl = textValue(readRecordValue(current, 'url'))
      const previousGeneratedUrl = generatedSystemUrl(current)
      const next = { ...current, [key]: value }
      if ((key === 'sid' || key === 'machineId') && (!previousUrl || previousUrl === previousGeneratedUrl)) {
        ;(next as Record<string, unknown>).url = generatedSystemUrl(next)
      }
      return { ...next, ...hostingContextPatchForFieldChange(key, value) } as T
    })
    setMessages([])
  }

  function toggleSection(sectionId: InventorySectionId) {
    setCollapsedSections((current) => ({ ...current, [sectionId]: !current[sectionId] }))
  }

  function fieldChanged(key: string): boolean {
    return !valuesEqual(readRecordValue(activeRecord, key), readRecordValue(activeDraft, key))
  }

  function optionsWithCustom(key: string, options: string[]): string[] {
    return [...options.filter((option) => option !== 'Add new...'), ...(customPicklistOptions[key] ?? []), ...(options.includes('Add new...') ? ['Add new...'] : [])]
  }

  function handlePicklistChange(key: string, value: string) {
    if (isViewMode) return
    if (value === 'Add new...') {
      setPendingAddNew({ key, value: '' })
      return
    }
    updateField(key, value)
  }

  function validationMessageForField(label: string, key: string): string | undefined {
    if (!invalidFields.has(key) || messages.length === 0) return undefined
    if (key === 'machineId') return messages.find((message) => message === 'MID is required.' || message === 'MID must be unique.')
    if (key === 'url') return messages.find((message) => message === 'URL is required.' || message.startsWith('URL must '))
    if (key === 'purpose') return messages.find((message) => message === ACTIVE_POC_PURPOSE_LOCK_MESSAGE)
    return messages.find((message) => message === `${label} is required.`)
  }

  function isFieldLevelValidationMessage(message: string): boolean {
    return [
      'MID is required.',
      'MID must be unique.',
      'Cognito Region is required.',
      'Used In Region is required.',
      'URL is required.',
      'Hosting is required.',
      'Cloud Platform is required.',
      'CSP is required.',
      'Cloud Region is required.',
      'VPN Type is required.',
      'Occupation Start Date is required.',
      'Occupation End Date is required.',
      ACTIVE_POC_PURPOSE_LOCK_MESSAGE,
    ].includes(message) || message.startsWith('URL must ')
  }

  function renderAddNewEditor(key: string) {
    if (pendingAddNew?.key !== key) return null

    return (
      <div className="mt-1 flex items-center gap-1">
        <input
          className="h-8 w-full rounded border border-sf-border px-2 py-1 text-sm"
          value={pendingAddNew.value}
          autoFocus
          onChange={(event) => setPendingAddNew({ key, value: event.target.value })}
        />
        <button
          type="button"
          className="rounded border border-sf-brand bg-sf-brand px-2 py-1 text-xs font-semibold text-white"
          onClick={() => {
            const nextValue = pendingAddNew.value.trim()
            if (!nextValue) return
            setCustomPicklistOptions((current) => addCustomPicklistOption(current, key, nextValue))
            updateField(key, nextValue)
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

  function validate(): string[] {
    const nextMessages: string[] = []

    if (metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL) {
      validateReusedInternalMachineId(activeDraft, records).forEach((message) => {
        if (message.field) invalidFields.add(message.field)
        nextMessages.push(message.message)
      })
      validateReusedInternalPurposeChange(
        activeRecord as ReusedInternalSystem,
        activeDraft as ReusedInternalSystem,
        projects,
        projectSystems,
      ).forEach((message) => {
        if (message.field) invalidFields.add(message.field)
        nextMessages.push(message.message)
      })
    }

    validateSystemInventoryRequiredFields(activeDraft).forEach((message) => {
      if (message.field) invalidFields.add(message.field)
      nextMessages.push(message.message)
    })

    validateHostingContext(activeDraft).forEach((message) => {
      if (message.field) invalidFields.add(message.field)
      nextMessages.push(message.message)
    })

    return nextMessages
  }

  function sanitizedDraftForSave(): T {
    return sanitizeHostingContext(activeDraft)
  }

  function regionWarningMessages(record: T): string[] {
    const hostingType = textValue(readRecordValue(record, 'hostingType'))
    if (!requiresCloudPlatform(hostingType)) return []
    const usedInRegion = textValue(readRecordValue(record, 'usedInRegion'))
    const cognitoRegion = textValue(readRecordValue(record, 'cognitoRegion'))
    const cloudRegion = textValue(readRecordValue(record, 'cloudRegion'))
    return [
      cognitoRegion && !isCognitoRegionCompatibleWithUsedRegion(cognitoRegion, usedInRegion)
        ? 'Cognito Region does not match Used In Region. Please confirm that this is intentional.'
        : '',
      cloudRegion && !isCloudRegionWithinUsedRegion(cloudRegion, usedInRegion)
        ? `Cloud Region is not geographically located in ${usedInRegion}. Please confirm that this is intentional.`
        : '',
    ].filter(Boolean)
  }

  function confirmRegionWarnings(record: T): boolean {
    const warnings = regionWarningMessages(record)
    if (warnings.length === 0) return true
    return window.confirm(warnings.join('\n\n'))
  }

  function confirmPurposeChangeIfRequired(record: T): boolean {
    if (metadata.source !== SYSTEM_SOURCE_REUSED_INTERNAL) return true
    const previous = activeRecord as ReusedInternalSystem
    const next = record as ReusedInternalSystem
    if (!shouldConfirmEarlyNonPocPurposeChange(previous, next)) return true
    const accepted = window.confirm(
      `The occupation period for this System ends on ${previous.occupationEndDate}.\n\nChanging the Purpose before the occupation period ends may affect its current usage.\n\nDo you want to continue?`,
    )
    if (accepted) return true
    setDraft((current) => current ? ({ ...current, purpose: previous.purpose } as T) : current)
    setMessages(['Purpose change cancelled. Other draft changes were preserved.'])
    return false
  }

  validate()
  const lines = new Map<number, SystemInventoryHeaderField[]>()
  metadata.headerFields.forEach((field) => {
    lines.set(field.line, [...(lines.get(field.line) ?? []), field])
  })
  const headerLines = Array.from(lines.entries()).sort(([first], [second]) => first - second)
  const summaryMessages = messages.filter((message) => !isFieldLevelValidationMessage(message))
  const activePocPurposeLock = metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL
    ? hasActiveOpenPocPurposeLock(activeRecord as ReusedInternalSystem, projects, projectSystems)
    : false
  function save(stayOnPage: boolean) {
    if (isViewMode) return
    const nextMessages = validate()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      return
    }

    const nextDraft = sanitizedDraftForSave()
    if (!confirmRegionWarnings(nextDraft)) return
    if (!confirmPurposeChangeIfRequired(nextDraft)) return
    const returnTo = typeof location.state === 'object' && location.state && 'returnTo' in location.state
      ? String(location.state.returnTo ?? '')
      : ''
    const hasBusinessChanges = !valuesEqual(systemParentSaveScope(activeRecord), systemParentSaveScope(nextDraft)) || pendingTenantCreationIds.length > 0 || pendingTenantRemovalIds.length > 0
    if (!hasBusinessChanges) {
      setMessages(['No changes to save.'])
      setSaveMenuOpen(false)
      if (!stayOnPage && returnTo) {
        setBypassUnsavedPrompt(true)
        window.setTimeout(() => navigate(returnTo), 0)
      }
      return
    }

    setIsSaving(true)
    window.setTimeout(() => setIsSaving(false), 500)
    onSave(nextDraft.id, nextDraft as Partial<T>, { preserveNewState: isNewRecordSession }, pendingTenantRemovalIds)
    setPendingTenantCreationIds([])
    setPendingTenantRemovalIds([])
    setMessages(['System inventory record saved.'])
    setSaveMenuOpen(false)
    if (!stayOnPage && returnTo) {
      setBypassUnsavedPrompt(true)
      window.setTimeout(() => navigate(returnTo), 0)
    }
  }

  function saveBlockedNavigation() {
    if (isViewMode) return
    const nextMessages = validate()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      navigationBlocker.reset?.()
      return
    }

    const nextDraft = sanitizedDraftForSave()
    if (!confirmRegionWarnings(nextDraft)) {
      navigationBlocker.reset?.()
      return
    }
    if (!confirmPurposeChangeIfRequired(nextDraft)) {
      navigationBlocker.reset?.()
      return
    }
    setIsSaving(true)
    window.setTimeout(() => setIsSaving(false), 500)
    onSave(nextDraft.id, nextDraft as Partial<T>, { preserveNewState: isNewRecordSession }, pendingTenantRemovalIds)
    setPendingTenantCreationIds([])
    setPendingTenantRemovalIds([])
    setMessages(['System inventory record saved.'])
    navigationBlocker.proceed?.()
  }

  function cancelSystemForm() {
    pendingTenantCreationIds.forEach((tenantId) => rollbackSystemFormTenantCreation(tenantId))
    setPendingTenantCreationIds([])
    setPendingTenantRemovalIds([])
    resetDraft(cloneRecord(activeRecord))
    setBypassUnsavedPrompt(true)
    window.setTimeout(() => navigate(dashboardPath), 0)
  }

  function discardSystemChangesAndProceed() {
    pendingTenantCreationIds.forEach((tenantId) => rollbackSystemFormTenantCreation(tenantId))
    setPendingTenantCreationIds([])
    setPendingTenantRemovalIds([])
    navigationBlocker.proceed?.()
  }

  function renderHeaderField(field: SystemInventoryHeaderField) {
    const hostingType = textValue(readRecordValue(activeDraft, 'hostingType'))
    if (field.key === 'cognitoRegion' && !requiresCloudPlatform(hostingType)) return null

    const hasActiveSystemAllocation = projectSystems.some(
      (link) =>
        link.allocationStatus !== 'DEALLOCATED' &&
        (link.systemId === activeRecord.id || ('machineId' in activeRecord && link.sourceMachineId === activeRecord.machineId)),
    )
    const hasPocPurposeLock =
      activePocPurposeLock &&
      (field.key === 'purpose' || field.key === 'status' || field.key === 'occupationStartDate' || field.key === 'occupationEndDate')
    const businessEditable = field.editable && !(field.key === 'usedInRegion' && hasActiveSystemAllocation) && !hasPocPurposeLock
    const sourceRecord = businessEditable ? activeDraft : activeRecord
    const value = derivedValue(sourceRecord, field.key, projects, tenants, projectSystems, allocatedSystems, versionUpdates, referenceData)
    const isChanged = fieldChanged(field.key)
    const isInvalid = invalidFields.has(field.key) && messages.length > 0
    const error = validationMessageForField(field.label, field.key)
    const isRequired =
      field.key === 'cognitoRegion'
        ? requiresCloudPlatform(hostingType)
        : (field.key === 'occupationStartDate' || field.key === 'occupationEndDate')
          ? isOccupationDateRequiredForPurpose(textValue(readRecordValue(activeDraft, 'purpose')))
          : field.required
    const width =
      field.key === 'url'
        ? 'w-96'
        : field.key === 'alerts' || field.key === 'timeGroupAlert' || field.key === 'currentPid'
          ? 'w-80'
          : 'w-48'

    if (!businessEditable) {
      if (field.key === 'logo') {
        const productType = applicationSummaryProduct()
        return (
          <MetadataHeaderField
            key={field.key}
            label={field.label}
            controlWidthClassName={width}
            required={false}
            businessEditable={false}
            editor={null}
            readOnlyValue={productType ? <ProductLogoIcon product={productType} /> : ''}
          />
        )
      }

      return (
        <MetadataHeaderField
          key={field.key}
          label={field.label}
          controlWidthClassName={width}
          required={false}
          businessEditable={false}
          editor={null}
          readOnlyValue={field.inputType === 'date' ? (
            <DateTimeValue value={value} semanticType="date" fallback="-" />
          ) : (
            value || '-'
          )}
        />
      )
    }

    if (field.inputType === 'picklist') {
      if (field.key === 'operationalStatus') {
        return (
          <FormField key={field.key} label={field.label} controlWidthClassName={width} required={field.required}>
            <OperationalStatusSelect
              value={value}
              options={field.options ?? []}
              isChanged={isChanged}
              isInvalid={isInvalid}
              onChange={(nextValue) => updateField(field.key, nextValue)}
            />
          </FormField>
        )
      }

      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={width} required={isRequired} error={error}>
          <select className={fieldClassName(isChanged, isInvalid)} value={value} onChange={(event) => updateField(field.key, event.target.value)}>
            <option value="" />
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.inputType === 'date') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-40" required={isRequired} error={error}>
          <input
            className={fieldClassName(isChanged, isInvalid)}
            type="date"
            value={value}
            onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateField(field.key, nextValue))}
            onChange={(event) => updateField(field.key, event.target.value || null)}
          />
        </FormField>
      )
    }

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName={width} required={isRequired} error={error}>
        <input className={fieldClassName(isChanged, isInvalid)} value={value} onChange={(event) => updateField(field.key, event.target.value)} />
      </FormField>
    )
  }

  function renderEnvironmentField(field: { key: string; label: string; inputType?: string }) {
    const value = textValue(readRecordValue(activeDraft, field.key))
    const isChanged = fieldChanged(field.key)
    const isInvalid = invalidFields.has(field.key) && messages.length > 0
    const hostingType = textValue(readRecordValue(activeDraft, 'hostingType'))
    const cloudPlatform = textValue(readRecordValue(activeDraft, 'cloudPlatform'))

    if (field.key === 'cloudPlatform' && !requiresCloudPlatform(hostingType)) return null
    if ((field.key === 'csp' || field.key === 'cloudRegion') && (!requiresCloudPlatform(hostingType) || !cloudPlatform)) return null
    if (field.key === 'cloudRegion' && cloudPlatform === "Customer's datacenter") return null

    const optionsByKey: Record<string, string[]> = {
      hostingType: HOSTING_OPTIONS,
      cloudPlatform: cloudPlatformOptionsForHosting(hostingType),
      csp: cspOptionsForCloudPlatform(cloudPlatform),
      cloudRegion: cloudRegionOptionsForCloudPlatform(cloudPlatform),
      performanceTier: PERFORMANCE_TIER_OPTIONS,
    }
    const options = optionsByKey[field.key] ?? []
    const isDisabled = field.key === 'cloudPlatform' && options.length === 0
    const isRequired =
      field.key === 'hostingType' ||
      field.key === 'performanceTier' ||
      (field.key === 'cloudPlatform' && requiresCloudPlatform(hostingType)) ||
      (field.key === 'csp' && options.length > 0) ||
      (field.key === 'cloudRegion' && requiresCloudRegion(cloudPlatform))
    const error = validationMessageForField(field.label, field.key)

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName="w-56" required={isRequired} error={error}>
        <select
          className={fieldClassName(isChanged, isInvalid)}
          value={isDisabled ? '' : value}
          disabled={isDisabled}
          onChange={(event) => handlePicklistChange(field.key, event.target.value)}
        >
          <option value="" />
          {optionsWithCustom(field.key, options).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {renderAddNewEditor(field.key)}
      </FormField>
    )
  }

  function renderIdentifierField(field: { key: string; label: string }) {
    const value = textValue(readRecordValue(activeDraft, field.key))
    const isChanged = fieldChanged(field.key)

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName="w-56">
        <input className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(field.key, event.target.value)} />
      </FormField>
    )
  }

  function renderAccessDetailField(field: { key: string; label: string; inputType?: string }) {
    const rawValue = readRecordValue(activeDraft, field.key)
    const value = field.inputType === 'boolean' ? Boolean(rawValue) : textValue(rawValue)
    const isChanged = fieldChanged(field.key)
    const isInvalid = invalidFields.has(field.key) && messages.length > 0
    const vpnEnabled = textValue(readRecordValue(activeDraft, 'vpnEnabled'))

    if (field.key === 'vpnType' && vpnEnabled !== 'YES') return null
    const isRequired = field.key === 'url' || field.key === 'ipRestrictionEnabled' || field.key === 'vpnEnabled' || (field.key === 'vpnType' && vpnEnabled === 'YES')
    const error = field.key === 'url'
      ? messages.find((message) => invalidFields.has(field.key) && (message === 'URL is required.' || message.startsWith('URL must ')))
      : validationMessageForField(field.label, field.key)

    if (field.inputType === 'text') {
      const textInputValue = textValue(value)
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-96" required={isRequired} error={error}>
          <input className={fieldClassName(isChanged, isInvalid)} value={textInputValue} onChange={(event) => updateField(field.key, event.target.value)} />
        </FormField>
      )
    }

    if (field.inputType === 'yesNo') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-36" required={isRequired} error={error}>
          <div className={[fieldClassName(isChanged), 'flex items-center gap-3'].join(' ')}>
            {YES_NO_REQUIRED_OPTIONS.map((option) => (
              <label key={option} className="inline-flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={`${activeRecord.id}-${field.key}`}
                  value={option}
                  checked={value === option}
                  onChange={() => updateField(field.key, option)}
                />
                <span>{option === 'YES' ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </FormField>
      )
    }

    if (field.inputType === 'boolean') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-48" required={false} error={error}>
          <div className={[fieldClassName(isChanged), 'flex items-center gap-3'].join(' ')}>
            {[true, false].map((option) => (
              <label key={String(option)} className="inline-flex items-center gap-1 text-sm">
                <input
                  type="radio"
                  name={`${activeRecord.id}-${field.key}`}
                  value={String(option)}
                  checked={value === option}
                  onChange={() => updateField(field.key, option)}
                />
                <span>{option ? 'Yes' : 'No'}</span>
              </label>
            ))}
          </div>
        </FormField>
      )
    }

    const selectValue = textValue(value)
    return (
      <FormField key={field.key} label={field.label} controlWidthClassName="w-56" required={isRequired} error={error}>
        <select className={fieldClassName(isChanged, isInvalid)} value={selectValue} onChange={(event) => handlePicklistChange(field.key, event.target.value)}>
          <option value="" />
          {optionsWithCustom(field.key, VPN_TYPE_OPTIONS).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        {renderAddNewEditor(field.key)}
      </FormField>
    )
  }

  function hostedTenantsForDraft(): Tenant[] {
    return hostedTenantsForSystem((allocatedSystemForTenantCreation() ?? activeRecord).id, tenants)
  }

  function applicationSummaryProduct(): string {
    return textValue(readRecordValue(activeDraft, 'productType')) || (hostedTenantsForDraft().find((tenant) => textValue(tenant.configuration?.product ?? tenant.productType))?.productType ?? '')
  }

  function applicationConfigurationSummaryRecord(): Record<string, unknown> {
    return systemApplicationConfigurationSummary((allocatedSystemForTenantCreation() ?? activeRecord) as System, tenants) as unknown as Record<string, unknown>
  }

  function tenantSummaryValue(field: TenantConfigurationFieldMetadata, summary: Record<string, unknown>): string {
    return formatConfigurationCellValue(summary[field.configKey])
  }

  function tenantRequirementOptionLabel(requirement: NewTenantRequirement): string {
    const moduleKeys: Array<keyof NewTenantRequirement> = ['tangles', 'tanglesGo', 'webloc', 'webeye', 'ingest', 'blockchain']
    const moduleCount = moduleKeys.reduce((count, key) => {
      const value = requirement[key]
      if (typeof value === 'number') return value > 0 ? count + 1 : count
      return value === 'YES' ? count + 1 : count
    }, 0)
    const aiCount = requirement.aiFeatures?.length ?? 0
    return `${requirement.requirementId} | Users: ${requirement.users ?? '-'} | Licenses: ${requirement.licenses ?? '-'} | Modules: ${moduleCount} | AI: ${aiCount}`
  }

  function projectOpportunity(project: Project): Opportunity | undefined {
    return opportunities.find(
      (opportunity) =>
        opportunity.opportunityId === project.opportunityId ||
        opportunity.id === project.opportunityId ||
        opportunity.pocProjectIds.includes(project.id) ||
        opportunity.finalProjectId === project.id,
    )
  }

  function linkedProjectsForSystem(): Project[] {
    const linkRecord = allocatedSystemForTenantCreation() ?? activeRecord
    const projectIds = new Set(
      linkedProjectIdsForSystem(linkRecord, projectSystems),
    )
    return projects.filter((project) => projectIds.has(project.id))
  }

  function newTenantRequirementsForProject(projectId: string): NewTenantRequirement[] {
    const project = projects.find((candidate) => candidate.id === projectId)
    if (!project) return []
    return projectOpportunity(project)?.newTenantRequirements ?? []
  }

  function usedRequirementIdsForProject(projectId: string): Set<string> {
    const activeTenantLinks = activeProjectTenantLinks(projectTenants)
    const linkedTenantIds = new Set(
      activeTenantLinks.filter((link) => link.projectId === projectId).map((link) => link.tenantId),
    )
    return new Set(
      tenants
        .filter((tenant) => linkedTenantIds.has(tenant.id) && tenant.sourceRequirementId)
        .map((tenant) => tenant.sourceRequirementId as string),
    )
  }

  function firstAvailableRequirementId(projectId: string): string {
    const usedRequirementIds = usedRequirementIdsForProject(projectId)
    return newTenantRequirementsForProject(projectId)
      .find((requirement) => !usedRequirementIds.has(requirement.requirementId))?.id ?? ''
  }

  function openAddTenantDialog() {
    if (isViewMode) return
    const linkedProjects = linkedProjectsForSystem()
    const firstProjectId = linkedProjects[0]?.id ?? ''
    const firstRequirementId = firstProjectId ? firstAvailableRequirementId(firstProjectId) : ''
    setSelectedProjectId(firstProjectId)
    setSelectedRequirementId(firstRequirementId || 'INTERNAL')
    setAddTenantOpen(true)
    setMessages([])
  }

  function handleSelectedProjectChange(projectId: string) {
    setSelectedProjectId(projectId)
    setSelectedRequirementId(firstAvailableRequirementId(projectId) || 'INTERNAL')
  }

  function createTenantFromSelection() {
    if (isViewMode) return
    if (!selectedProjectId || !selectedRequirementId) return
    const systemForTenant = allocatedSystemForTenantCreation() ?? activeRecord
    if (selectedRequirementId === 'INTERNAL') {
      const result = createInternalTenantForSystem(selectedProjectId, systemForTenant.id)
      setMessages([result.message])
      if (result.ok) {
        if (result.tenantId) setPendingTenantCreationIds((current) => Array.from(new Set([...current, result.tenantId as string])))
        setAddTenantOpen(false)
        setSelectedProjectId('')
        setSelectedRequirementId('')
      }
      return
    }
    const selectedRequirement = newTenantRequirementsForProject(selectedProjectId).find(
      (requirement) => requirement.id === selectedRequirementId,
    )
    const systemProduct = normalizeProduct(readRecordValue(systemForTenant, 'productType'))
    const requirementProduct = normalizeProduct(selectedRequirement?.productType)
    if (selectedRequirement && systemProduct && requirementProduct && systemProduct !== requirementProduct) {
      setMessages([
        `Tenant cannot be added because the requirement product (${selectedRequirement.productType}) does not match this system product (${textValue(readRecordValue(systemForTenant, 'productType'))}).`,
      ])
      return
    }

    const systemId = systemForTenant.id
    const result = createTenantFromSystemRequirement(selectedProjectId, systemId, selectedRequirementId)
    setMessages([result.message])
    if (result.ok) {
      if (result.tenantId) setPendingTenantCreationIds((current) => Array.from(new Set([...current, result.tenantId as string])))
      setAddTenantOpen(false)
      setSelectedProjectId('')
      setSelectedRequirementId('')
    }
  }

  function deleteHostedTenant(tenant: Tenant) {
    if (isViewMode) return
    if (!window.confirm(`Delete Tenant ${tenant.tid}?\n\nThe Tenant will be removed from active System hosting and configuration, but will remain in its linked Projects and historical records.\n\nThis change will be saved immediately.`)) return
    deleteTenantFromSystem(tenant.id)
    const routePath = tenantReference(tenant).routePath
    const opened = routePath ? window.open(`${window.location.origin}${window.location.pathname}#${routePath}`, '_blank', 'noopener,noreferrer') : null
    setMessages([
      opened
        ? `Tenant ${tenant.tid} deleted and removed from active System hosting.`
        : `Tenant ${tenant.tid} deleted and removed from active System hosting. Open Tenant ${tenant.tid} from the Tenant dashboard to review it.`,
    ])
  }

  function cancelHostedTenant(tenant: Tenant) {
    if (isViewMode) return
    if (!window.confirm(`Cancel Tenant ${tenant.tid}?\n\nThe Tenant will be removed from active System hosting and from all linked Projects because it was created by mistake.\n\nThe historical audit record will be preserved.\n\nThis change will be saved immediately.`)) return
    cancelTenantFromSystem(tenant.id)
    const routePath = tenantReference(tenant).routePath
    const opened = routePath ? window.open(`${window.location.origin}${window.location.pathname}#${routePath}`, '_blank', 'noopener,noreferrer') : null
    setMessages([
      opened
        ? `Tenant ${tenant.tid} cancelled and removed from active System hosting.`
        : `Tenant ${tenant.tid} cancelled and removed from active System hosting. Open Tenant ${tenant.tid} from the Tenant dashboard to review it.`,
    ])
  }

  function moveHostedTenant(tenant: Tenant) {
    if (isViewMode) return
    const defaultMode = tenantMoveDefaultMode(tenant, projects, projectTenants)
    const defaultRegion = tenantMoveDefaultRegion({ tenant, projects, projectTenants, opportunities, accounts })
    setMoveTenantId(tenant.id)
    setMoveMode(defaultMode)
    setSelectedMoveDestinationIds([])
    setMoveCandidateSearch('')
    setMoveCandidateFilters({ ...EMPTY_SYSTEM_CANDIDATE_FILTERS, regionTimeGroup: defaultRegion })
    setMoveCandidateSortKey('id')
    setMoveCandidateSortDirection('asc')
    setMoveResult(null)
    setMoveConfirmation(null)
  }

  function changeMoveMode(mode: TenantMoveMode) {
    if (isViewMode) return
    const tenant = tenants.find((candidate) => candidate.id === moveTenantId)
    setMoveMode(mode)
    setSelectedMoveDestinationIds([])
    setMoveCandidateSearch('')
    setMoveCandidateFilters({
      ...EMPTY_SYSTEM_CANDIDATE_FILTERS,
      regionTimeGroup: tenant ? tenantMoveDefaultRegion({ tenant, projects, projectTenants, opportunities, accounts }) : '',
    })
    setMoveResult(null)
    setMoveConfirmation(null)
  }

  function toggleMoveCandidate(candidateId: string, selected: boolean) {
    if (isViewMode) return
    setSelectedMoveDestinationIds(selected ? [candidateId] : [])
    setMoveConfirmation(null)
    setMoveResult(null)
  }

  function requestMoveConfirmation() {
    if (isViewMode || isMoveCommitting) return
    const tenant = tenants.find((candidate) => candidate.id === moveTenantId)
    const destinationSystemId = selectedMoveDestinationIds[0]
    if (!tenant || !destinationSystemId) {
      setMoveResult({ ok: false, message: 'Select one destination System before moving the Tenant.' })
      return
    }
    const validationMessage = validateTenantMoveDestination({
      tenant,
      systems: allocatedSystems,
      projects,
      projectSystems,
      projectTenants,
      opportunities,
      accounts,
    }, destinationSystemId)
    if (validationMessage) {
      setMoveResult({ ok: false, message: validationMessage })
      return
    }
    setMoveConfirmation({ tenantId: tenant.id, destinationSystemId })
    setMoveResult(null)
  }

  function confirmMoveTenant() {
    if (isViewMode || isMoveCommitting || !moveConfirmation) return
    setIsMoveCommitting(true)
    const tenant = tenants.find((candidate) => candidate.id === moveConfirmation.tenantId)
    const destinationSystem = allocatedSystems.find((candidate) => candidate.id === moveConfirmation.destinationSystemId)
    const result = moveTenantToSystem(moveConfirmation.tenantId, moveConfirmation.destinationSystemId)
    setIsMoveCommitting(false)
    if (!result.ok) {
      setMoveResult(result)
      return
    }
    setMoveTenantId('')
    setSelectedMoveDestinationIds([])
    setMoveConfirmation(null)
    setMoveResult(null)
    setMessages([result.message || `Tenant ${tenant?.tid ?? ''} moved to ${destinationSystem ? systemIdentity(destinationSystem) : 'destination System'}.`])
  }

  function closeMoveDialog() {
    if (isMoveCommitting) return
    setMoveTenantId('')
    setSelectedMoveDestinationIds([])
    setMoveConfirmation(null)
    setMoveResult(null)
  }

  function renderHostedTenantActions(tenant: Tenant) {
    return (
      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          className="rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
          onClick={() => deleteHostedTenant(tenant)}
        >
          Delete
        </button>
        <button
          type="button"
          className="rounded border border-sf-border bg-white px-2 py-1 text-xs text-sf-text hover:bg-sf-surface-alt"
          onClick={() => {
            const routePath = tenantReference(tenant).routePath
            if (routePath) navigate(routePath)
          }}
        >
          Edit
        </button>
        <button
          type="button"
          className="rounded border border-sf-border bg-white px-2 py-1 text-xs text-sf-text hover:bg-sf-surface-alt"
          onClick={() => moveHostedTenant(tenant)}
        >
          Move
        </button>
        <button
          type="button"
          className="rounded border border-purple-200 bg-white px-2 py-1 text-xs text-purple-700 hover:bg-purple-50"
          onClick={() => cancelHostedTenant(tenant)}
        >
          Cancel
        </button>
      </div>
    )
  }

  function renderTenantTab() {
    const hostedTenants = hostedTenantsForDraft().filter((tenant) => !pendingTenantRemovalIds.includes(tenant.id))

    return (
      <div className="space-y-4">
        <section className="sf-card space-y-3 p-3" aria-labelledby="system-tenants-section-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="system-tenants-section-title" className="text-lg font-semibold text-sf-text">Tenants</h3>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt disabled:opacity-50"
              disabled={linkedProjectsForSystem().length === 0}
              onClick={openAddTenantDialog}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Tenant
            </button>
          </div>
          {linkedProjectsForSystem().length === 0 ? (
            <div className="text-sm text-sf-text-muted">Link this system to a project before adding tenants.</div>
          ) : null}

          <TenantWarrantyContractSections
            tenants={hostedTenants}
            systems={allocatedSystems}
            emptyTextForSection={() => 'No hosted tenants in this section.'}
            actions={(tenant) => renderHostedTenantActions(tenant)}
          />
        </section>
        {renderApplicationConfigurationSummarySection()}
      </div>
    )
  }

  function renderApplicationConfigurationSummarySection() {
    const applicationSummary = applicationConfigurationSummaryRecord()

    return (
      <section className="sf-card" aria-labelledby="system-application-summary-section-title">
        <div className="border-b border-sf-border bg-sf-surface-alt px-3 py-2">
          <h3 id="system-application-summary-section-title" className="whitespace-nowrap text-lg font-semibold text-sf-text">Application Configuration Summary</h3>
        </div>
        <div className="sf-scroll-x bg-white">
          <table className="w-max border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {APPLICATION_SUMMARY_FIELDS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                    <span>{column.label}</span>
                    <span className="block text-xs font-normal text-sf-text-muted">{configurationColumnGroupLabel(column)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {APPLICATION_SUMMARY_FIELDS.map((column) => (
                  <td key={column.key} className="max-w-64 border border-sf-border px-1.5 py-1 text-sf-text">
                    {tenantSummaryValue(column, applicationSummary)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  function renderInfrastructureTab() {
    const innerTabs: Array<{ id: InfrastructureInnerTab; label: string }> = [
      { id: 'environment', label: 'Environment' },
      { id: 'infrastructure', label: 'Infrastructure' },
    ]
    const systemRecords = allSystemRecords(allocatedSystems, productionSystemInventory, reusedInternalSystems)
    const infrastructureRows = infrastructureItemsForSystem(infrastructureItems, activeRecord.id, referenceData, systemRecords)
    const infrastructureCandidates = eligibleInfrastructureItemsForSystemLink(infrastructureItems, referenceData, systemRecords)
    const infrastructureCategoryOptions = Array.from(new Set(infrastructureCandidates.map((item) => item.categoryLabel).filter(Boolean)))
      .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }))
    const infrastructureTypeOptions = Array.from(new Set(infrastructureCandidates
      .filter((item) => infrastructureCategoryFilter ? item.categoryLabel === infrastructureCategoryFilter : true)
      .map((item) => item.typeLabel)
      .filter(Boolean)))
      .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }))
    const normalizedInfrastructureSearch = infrastructureSearch.trim().toLocaleLowerCase()
    const visibleInfrastructureCandidates = infrastructureCandidates
      .filter((item) => infrastructureCategoryFilter ? item.categoryLabel === infrastructureCategoryFilter : true)
      .filter((item) => infrastructureTypeFilter ? item.typeLabel === infrastructureTypeFilter : true)
      .filter((item) => {
        if (!normalizedInfrastructureSearch) return true
        return [
          item.infrastructureId,
          item.identifier,
          item.categoryLabel,
          item.typeLabel,
        ].join(' ').toLocaleLowerCase().includes(normalizedInfrastructureSearch)
      })
    const selectedLinkableInfrastructureIds = selectedInfrastructureItemIds.filter((itemId) =>
      infrastructureCandidates.some((item) => item.id === itemId && !item.linkedSystemIds.includes(activeRecord.id)),
    )

    function resetInfrastructureDialog() {
      setSelectedInfrastructureItemIds([])
      setInfrastructureSearch('')
      setInfrastructureCategoryFilter('')
      setInfrastructureTypeFilter('')
    }

    function clearInfrastructureFilters() {
      setInfrastructureSearch('')
      setInfrastructureCategoryFilter('')
      setInfrastructureTypeFilter('')
    }

    function openInfrastructureDialog() {
      resetInfrastructureDialog()
      setAddInfrastructureOpen(true)
    }

    function closeInfrastructureDialog() {
      setAddInfrastructureOpen(false)
      resetInfrastructureDialog()
    }

    function toggleInfrastructureCandidate(itemId: string, selected: boolean) {
      const candidate = infrastructureCandidates.find((item) => item.id === itemId)
      if (!candidate || candidate.linkedSystemIds.includes(activeRecord.id)) return
      setSelectedInfrastructureItemIds((current) =>
        selected
          ? Array.from(new Set([...current, itemId]))
          : current.filter((id) => id !== itemId),
      )
    }

    function addInfrastructureItems() {
      if (selectedLinkableInfrastructureIds.length === 0) return
      const results = selectedLinkableInfrastructureIds.map((itemId) => linkInfrastructureItemToSystem(itemId, activeRecord.id))
      setMessages(results.map((result) => result.message))
      if (results.every((result) => result.ok)) closeInfrastructureDialog()
    }

    function removeInfrastructureRelationship(itemId: string) {
      if (!window.confirm('Remove this Infrastructure Item relationship from the current System?')) return
      const result = unlinkInfrastructureItemFromSystem(itemId, activeRecord.id)
      setMessages([result.message])
    }

    function renderInfrastructureDialog() {
      if (!addInfrastructureOpen) return null

      return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/35 p-4 pt-8">
          <div className="flex h-[82vh] w-full max-w-6xl resize overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="false" aria-labelledby="infrastructure-add-dialog-title">
            <div className="flex min-h-0 w-full flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
                <div>
                  <h2 id="infrastructure-add-dialog-title" className="text-xl font-semibold text-sf-text">Add Infrastructure Items</h2>
                  <p className="text-sm text-sf-text-muted">Select one or more operational Infrastructure Items to link to this System.</p>
                </div>
                <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close add Infrastructure Item dialog" onClick={closeInfrastructureDialog}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                <div className="flex flex-wrap items-end gap-2 rounded border border-sf-border bg-white p-2">
                  <label className="block text-sm font-medium text-sf-text">
                    Search
                    <input
                      className="mt-1 h-8 rounded border border-sf-border px-2 text-sm"
                      placeholder="Search Infrastructure"
                      value={infrastructureSearch}
                      onChange={(event) => setInfrastructureSearch(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-sf-text">
                    Category
                    <select
                      className="mt-1 h-8 max-w-44 rounded border border-sf-border px-2 text-sm"
                      value={infrastructureCategoryFilter}
                      onChange={(event) => {
                        setInfrastructureCategoryFilter(event.target.value)
                        setInfrastructureTypeFilter('')
                      }}
                    >
                      <option value="">All</option>
                      {infrastructureCategoryOptions.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm font-medium text-sf-text">
                    Item Type
                    <select
                      className="mt-1 h-8 max-w-44 rounded border border-sf-border px-2 text-sm"
                      value={infrastructureTypeFilter}
                      onChange={(event) => setInfrastructureTypeFilter(event.target.value)}
                    >
                      <option value="">All</option>
                      {infrastructureTypeOptions.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  {(infrastructureSearch || infrastructureCategoryFilter || infrastructureTypeFilter) ? (
                    <button
                      type="button"
                      className="h-8 rounded border border-sf-border bg-white px-3 text-sm hover:bg-sf-surface-alt"
                      onClick={clearInfrastructureFilters}
                    >
                      Clear filters
                    </button>
                  ) : null}
                </div>

                <div className="sf-scroll-x rounded border border-sf-border bg-white">
                  <table className="min-w-full border-collapse text-sm leading-tight">
                    <thead className="bg-sf-surface-alt text-left">
                      <tr>
                        {['Select', 'ID', 'Identifier', 'Category', 'Item Type', 'Manufacturer', 'Model', 'Linked System(s)', 'Warranty Status'].map((label) => (
                          <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visibleInfrastructureCandidates.map((item) => {
                        const alreadyLinked = item.linkedSystemIds.includes(activeRecord.id)
                        return (
                          <tr key={item.id} className={alreadyLinked ? 'bg-sf-surface-alt text-sf-text-muted' : 'hover:bg-sf-surface-alt'}>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedInfrastructureItemIds.includes(item.id)}
                                  disabled={alreadyLinked}
                                  onChange={(event) => toggleInfrastructureCandidate(item.id, event.target.checked)}
                                />
                                {alreadyLinked ? <span className="text-xs font-semibold text-sf-text-muted">Already Selected</span> : null}
                              </label>
                            </td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.infrastructureId}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.identifier || '-'}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.categoryLabel || '-'}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.typeLabel || '-'}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.manufacturerLabel || '-'}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.model || '-'}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{item.linkedSystemBusinessIds.join(', ') || '-'}</td>
                            <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{displayWarrantyStatus(item.warrantyStatus)}</td>
                          </tr>
                        )
                      })}
                      {visibleInfrastructureCandidates.length === 0 ? (
                        <tr>
                          <td className="border border-sf-border px-1.5 py-4 text-center text-sm text-sf-text-muted" colSpan={9}>
                            No Infrastructure Items match the current filters.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2 border-t border-sf-border p-4">
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={closeInfrastructureDialog}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={selectedLinkableInfrastructureIds.length === 0}
                  onClick={addInfrastructureItems}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
          {innerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'sf-view-mode-allow border-b-2 px-4 py-2 text-sm font-semibold',
                activeInfrastructureTab === tab.id
                  ? 'border-sf-brand bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
              ].join(' ')}
              onClick={() => setActiveInfrastructureTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeInfrastructureTab === 'environment' ? (
          <div className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-sf-text">Access Details</h3>
              <div className="flex flex-wrap items-start gap-3">
                {ACCESS_DETAIL_FIELDS.map(renderAccessDetailField)}
                {renderAccessDetailField(EXTERNAL_INTERFACE_FIELD)}
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-sf-text">Hosting</h3>
              <div className="flex flex-wrap items-start gap-3">
                {ENVIRONMENT_FIELDS.map(renderEnvironmentField)}
              </div>
            </section>
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-sf-text">Identifiers</h3>
              <div className="flex flex-wrap items-start gap-3">
                {INFRASTRUCTURE_IDENTIFIER_FIELDS.map(renderIdentifierField)}
              </div>
            </section>
          </div>
        ) : (
          <TableSection
            title="Infrastructure"
            actions={!isViewMode ? (
              <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt" onClick={openInfrastructureDialog}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Item
              </button>
            ) : null}
            className="space-y-3"
          >
            {renderInfrastructureDialog()}
            <div className="sf-scroll-x rounded border border-sf-border bg-white">
              <table className="min-w-full border-collapse text-sm leading-tight">
                <thead className="bg-sf-surface-alt text-left">
                  <tr>
                    {['Actions', 'Item ID', 'Identifier', 'Category', 'Type', 'Manufacturer', 'Owner', 'Operational Status', 'Maintenance Status', 'Products', 'Linked Systems', 'Initial Warranty', 'Current Warranty Start', 'Current Warranty End', 'Item Warranty Days Left', 'Warranty Status', 'Contact Person', 'Address'].map((label) => (
                      <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {infrastructureRows.map((row) => (
                    <tr key={row.id} className="hover:bg-sf-surface-alt">
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">
                        <div className="flex flex-wrap gap-1">
                          <EditableChildObjectActionButton onClick={() => navigate(`/infrastructure/${row.infrastructureId}`, { state: { mode: 'edit', returnTo: `${location.pathname}${location.search}` } })}>
                            <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </EditableChildObjectActionButton>
                          {!isViewMode ? (
                            <EditableChildObjectActionButton variant="danger" onClick={() => removeInfrastructureRelationship(row.id)}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Remove
                            </EditableChildObjectActionButton>
                          ) : null}
                        </div>
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">
                        <BusinessObjectLink reference={infrastructureItemReference(row)}>{row.infrastructureId}</BusinessObjectLink>
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.identifier}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.categoryLabel}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.typeLabel}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.manufacturerLabel}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.ownerLabel}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.operationalStatus}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text"><MaintenanceStatusPresentation status={row.maintenanceStatuses} /></td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.productsDisplay || '-'}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">
                        <BusinessIdListLinks objectType="SYSTEM" businessIds={row.linkedSystemBusinessIds} />
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text"><DateTimeValue value={row.initialWarrantyStartDate} semanticType="date" /></td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text"><DateTimeValue value={row.currentWarrantyStartDate} semanticType="date" /></td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text"><DateTimeValue value={row.currentWarrantyEndDate} semanticType="date" /></td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.itemWarrantyDaysLeft ?? '-'}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{displayWarrantyStatus(row.warrantyStatus)}{infrastructureWarrantyAlert(row) ? ` - ${infrastructureWarrantyAlert(row)}` : ''}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.warrantyContactDisplay}</td>
                      <td className="max-w-80 whitespace-pre-wrap border border-sf-border px-1.5 py-1 text-sf-text">{row.locationAddress}</td>
                    </tr>
                  ))}
                  {infrastructureRows.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="border border-sf-border px-3 py-4 text-sf-text-muted">No Infrastructure Items are linked to this System.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TableSection>
        )}
      </div>
    )
  }

  function renderActionButtons() {
    function switchToEditMode() {
      const currentState = typeof location.state === 'object' && location.state ? location.state : {}
      navigate(`${location.pathname}${location.search}`, { replace: true, state: { ...currentState, mode: 'edit' } })
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {isViewMode ? (
          <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={switchToEditMode}>
            Edit
          </button>
        ) : null}
        {isViewMode ? null : (
          <>
            <div className="relative inline-flex">
              <button
                type="button"
                className="rounded-l bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!isDirty || isSaving}
                onClick={() => save(false)}
              >
                <SaveButtonLabel saving={isSaving} />
              </button>
              <button
                type="button"
                className="rounded-r border-l border-blue-500 bg-sf-brand px-2 py-1.5 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="More save actions"
                aria-expanded={saveMenuOpen}
                disabled={!isDirty || isSaving}
                onClick={() => setSaveMenuOpen((current) => !current)}
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
              {saveMenuOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-40 rounded border border-sf-border bg-white py-1 shadow-lg">
                  <button type="button" className="block w-full px-3 py-2 text-left text-sm text-sf-text hover:bg-sf-surface-alt" onClick={() => save(true)}>
                    Apply Changes
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt disabled:opacity-50" disabled={!canUndo} onClick={undoDraft}>
              Undo
            </button>
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt disabled:opacity-50" disabled={!isDirty} onClick={() => resetDraft(cloneRecord(activeRecord))}>
              Revert
            </button>
          </>
        )}
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={cancelSystemForm}>
          {isViewMode ? 'Back' : 'Cancel'}
        </button>
      </div>
    )
  }

  function renderDocumentsTab() {
    return (
      <DocumentsPanel
        documents={activeDraft.documents ?? []}
        emptyText="No documents uploaded for this system."
        readOnly={isViewMode}
        onChange={(documents) => {
          if (isViewMode) return
          onSave(activeRecord.id, { documents } as Partial<T>)
          setDraft((current) => (current ? ({ ...current, documents } as T) : current))
          setMessages([])
        }}
      />
    )
  }

  function renderVersionUpdateTab() {
    const systemCollection: 'production' | 'reused' | 'allocated' =
      'systemClass' in activeRecord
        ? 'allocated'
        : metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL
          ? 'reused'
          : 'production'
    const mid = 'machineId' in activeRecord ? activeRecord.machineId ?? '' : ''
    const sid = 'sid' in activeRecord && activeRecord.sid ? activeRecord.sid : deriveCurrentSid(activeRecord, allocatedSystems)

    return (
      <SystemVersionUpdatePanel
        systemId={activeRecord.id}
        systemCollection={systemCollection}
        mid={mid}
        sid={sid}
        currentVersionUpdateId={activeRecord.currentVersionUpdateId}
        readOnly={isViewMode}
      />
    )
  }

  function renderLinkedProjectsTab() {
    const rows = linkedProjectRowsForSystem(
      allocatedSystemForTenantCreation() ?? activeRecord,
      { projects, projectSystems, projectTenants, opportunities, accounts },
    )
    return <LinkedProjectsTable rows={rows} includeAccountName />
  }

  function renderMoveTenantDialog() {
    const tenant = tenants.find((candidate) => candidate.id === moveTenantId)
    if (!tenant) return null
    const sourceSystem = allocatedSystems.find((system) => system.id === (tenant.hostedSystemId || tenant.systemId))
    const destinationSystem = moveConfirmation
      ? allocatedSystems.find((system) => system.id === moveConfirmation.destinationSystemId)
      : selectedMoveDestinationIds[0]
        ? allocatedSystems.find((system) => system.id === selectedMoveDestinationIds[0])
        : undefined
    const candidates = tenantMoveDestinationCandidates({
      tenant,
      systems: allocatedSystems,
      projects,
      projectSystems,
      projectTenants,
      opportunities,
      accounts,
    }, moveMode)
    const resultMessage = moveResult ? (
      <div className={moveResult.ok ? 'rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700' : 'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700'}>
        {moveResult.message}
      </div>
    ) : null
    const confirmationMessage = moveConfirmation && destinationSystem ? (
      <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-semibold">
          Move Tenant {tenant.tid} from System {sourceSystem ? systemIdentity(sourceSystem) : tenant.hostingSid || tenant.systemId} to System {systemIdentity(destinationSystem)}?
        </p>
        <p className="mt-1">Only the hosted System will change. The Tenant and all of its data and linked Projects will remain unchanged.</p>
        <p className="mt-1">This change will be saved immediately.</p>
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt"
            disabled={isMoveCommitting}
            onClick={() => setMoveConfirmation(null)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isMoveCommitting}
            onClick={confirmMoveTenant}
          >
            {isMoveCommitting ? 'Moving...' : 'Confirm Move'}
          </button>
        </div>
      </div>
    ) : null

    return (
      <SystemCandidateDialog
        title={`Move tenant ${tenant.tid}`}
        description="Select an already allocated destination System. Tenant-owned data and Project links remain unchanged."
        closeLabel="Close move tenant dialog"
        confirmLabel="Review Move"
        modes={[
          { id: 'DELIVERED', label: 'Allocate Delivered System', icon: <Database className="h-4 w-4" aria-hidden="true" /> },
          { id: 'POC_ASSIGNED', label: 'Allocate POC Assigned System', icon: <Sparkles className="h-4 w-4" aria-hidden="true" /> },
        ]}
        selectedMode={moveMode}
        onModeChange={(mode) => changeMoveMode(mode as TenantMoveMode)}
        result={
          <div className="space-y-2">
            {resultMessage}
            {confirmationMessage}
          </div>
        }
        candidates={candidates}
        selectedCandidateIds={selectedMoveDestinationIds}
        onToggleCandidate={toggleMoveCandidate}
        search={moveCandidateSearch}
        onSearchChange={setMoveCandidateSearch}
        filters={moveCandidateFilters}
        onFiltersChange={(filters) => {
          setMoveCandidateFilters(filters)
          setMoveConfirmation(null)
        }}
        sortKey={moveCandidateSortKey}
        onSortKeyChange={setMoveCandidateSortKey}
        sortDirection={moveCandidateSortDirection}
        onSortDirectionChange={setMoveCandidateSortDirection}
        onClose={closeMoveDialog}
        onConfirm={requestMoveConfirmation}
        emptyText="No eligible destination Systems for this Move mode."
        allowMultiple={false}
        confirmDisabled={selectedMoveDestinationIds.length === 0 || Boolean(moveConfirmation) || isMoveCommitting}
        getCandidateVersion={(candidate) => systemCurrentVersionLabel(versionUpdates, referenceData, candidate.id, 'currentVersionUpdateId' in candidate ? candidate.currentVersionUpdateId : null)}
      />
    )
  }

  function renderAddTenantDialog() {
    if (!addTenantOpen) return null
    const linkedProjects = linkedProjectsForSystem()
    const selectedRequirements = newTenantRequirementsForProject(selectedProjectId)
    const selectedProject = linkedProjects.find((project) => project.id === selectedProjectId)
    const usedRequirementIds = usedRequirementIdsForProject(selectedProjectId)
    const addTenantMessages = messages.filter((message) =>
      message.includes('tenant') ||
      message.includes('Tenant') ||
      message.includes('requirement') ||
      message.includes('Requirement') ||
      message.includes('product'),
    )

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
        <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="false" aria-labelledby="add-tenant-title">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 id="add-tenant-title" className="text-lg font-semibold text-sf-text">Add tenant</h2>
              <p className="text-sm text-sf-text-muted">Create a tenant from a linked Project new tenant requirement.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close add tenant dialog" onClick={() => setAddTenantOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid min-w-0 grid-cols-1 gap-4 overflow-auto p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            {addTenantMessages.length > 0 ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 lg:col-span-2" role="alert">
                {addTenantMessages.map((message) => (
                  <div key={message}>{message}</div>
                ))}
              </div>
            ) : null}
            <FormField label="PID" controlWidthClassName="w-full min-w-0 max-w-full">
              <select className="h-9 w-full min-w-0 max-w-full rounded border border-sf-border px-2 py-1 text-sm" value={selectedProjectId} onChange={(event) => handleSelectedProjectChange(event.target.value)}>
                {linkedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.pid} - {project.opportunityName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tenant Requirement ID" controlWidthClassName="w-full min-w-0 max-w-full">
              <select
                className="h-9 w-full min-w-0 max-w-full truncate rounded border border-sf-border px-2 py-1 text-sm"
                value={selectedRequirementId}
                disabled={linkedProjects.length === 0}
                onChange={(event) => setSelectedRequirementId(event.target.value)}
              >
                <option value="INTERNAL">Internal</option>
                {selectedRequirements.map((requirement) => (
                  <option
                    key={requirement.id}
                    value={requirement.id}
                    disabled={usedRequirementIds.has(requirement.requirementId)}
                  >
                    {tenantRequirementOptionLabel(requirement)}
                    {usedRequirementIds.has(requirement.requirementId) ? ' - Already used' : ''}
                  </option>
                ))}
              </select>
            </FormField>

            <div className="rounded border border-sf-border bg-sf-surface-alt p-3 text-sm text-sf-text-muted lg:col-span-2">
              {selectedProject
                ? `Only New Tenant Requirement rows from ${selectedProject.pid} are available here. Change Request and Standard Renewal rows are excluded.`
                : 'No linked project is available for this system.'}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-sf-border p-4">
            <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => setAddTenantOpen(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              disabled={!selectedProjectId || !selectedRequirementId}
              onClick={createTenantFromSelection}
            >
              Create Tenant
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderOwnerTab() {
    if (metadata.source !== SYSTEM_SOURCE_REUSED_INTERNAL) {
      return `${metadata.tabs.find((tab) => tab.id === activeTab)?.label} workspace is reserved for later system execution phases.`
    }

    return (
      <OwnerGrid
        owners={(activeDraft.owners ?? []) as OwnerRecord[]}
        onChange={(owners) => {
          if (isViewMode) return
          onSave(activeRecord.id, { owners } as Partial<T>)
          updateField('owners', owners)
        }}
        readOnly={isViewMode}
      />
    )
  }

  function renderActivityTab() {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-base font-semibold text-sf-text">Activity Log</h3>
          <p className="text-sm text-sf-text-muted">Read-only System activity records from Activity Log.</p>
        </div>
        <ActivityTimeline events={systemActivityEvents} emptyText="No activity has been recorded for this system." />
      </div>
    )
  }

  function renderConfigurationHistorySection() {
    const records = configurationHistoryReadModel(activeRecord)
    return (
      <section className="sf-card space-y-3 p-3">
        <h2 className="text-lg font-semibold text-sf-text">Configuration History</h2>
        <ConfigurationHistorySection
          records={records}
          fields={APPLICATION_SUMMARY_FIELDS}
          emptyText="No configuration history has been recorded for this system."
          tidValue={(record) => record.tid ?? ''}
        />
      </section>
    )
  }

  function renderRemarksSection() {
    return (
      <RemarksGrid
        remarks={(activeDraft.remarks ?? []) as RemarkRecord[]}
        onChange={(remarks) => {
          if (isViewMode) return
          onSave(activeRecord.id, { remarks } as Partial<T>)
          updateField('remarks', remarks)
        }}
        typeOptions={optionsWithCustom(SYSTEM_REMARK_TYPE_PICKLIST_KEY, [...REMARK_TYPE_OPTIONS, 'Add new...'])}
        onAddTypeOption={(value) => setCustomPicklistOptions((current) => addCustomPicklistOption(current, SYSTEM_REMARK_TYPE_PICKLIST_KEY, value))}
        readOnly={isViewMode}
      />
    )
  }

  function renderPurposeHistorySection() {
    if (metadata.source !== SYSTEM_SOURCE_REUSED_INTERNAL) return null
    const rows = reusedInternalPurposeHistory(activeRecord as ReusedInternalSystem | System, projects, projectSystems, allocatedSystems)

    return (
      <CollapsibleSection
        title="Purpose history"
        subtitle="Historical project usage for this reused internal system."
        collapsed={collapsedSections.purposeHistory}
        onToggle={() => toggleSection('purposeHistory')}
      >
        {rows.length > 0 ? (
          <div className="sf-scroll-x rounded border border-sf-border bg-white">
            <table className="min-w-full border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {['Record ID', 'Start Date', 'End Date', 'Purpose Type', 'PID', 'SID', 'Project Name', 'Account Name', 'Product', 'Project Status'].map((label) => (
                    <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const project = projects.find((candidate) => candidate.pid === row.pid)
                  return (
                    <tr key={row.id} className="hover:bg-sf-surface-alt">
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.recordId}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">
                        <DateTimeValue value={row.startDate} semanticType="datetime" />
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">
                        <DateTimeValue value={row.endDate} semanticType="datetime" />
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.purposeType}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">
                        {project ? <BusinessObjectLink reference={projectReference(project)}>{row.pid}</BusinessObjectLink> : row.pid}
                      </td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.sid}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.projectName}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.accountName}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.product}</td>
                      <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sf-text">{row.projectStatus}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            No project purpose history has been recorded for this reused internal system.
          </div>
        )}
      </CollapsibleSection>
    )
  }

  return (
    <WorkspaceFrame>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <OperationalStatusIcon status={textValue(readRecordValue(activeDraft, 'operationalStatus'))} />
            <span>{`${metadata.titleLabel} ${systemIdentity(activeDraft)}`}</span>
          </span>
        }
        subtitle={metadata.sourceSheet}
        actions={renderActionButtons()}
      />

      <WorkspaceScrollContent className="space-y-4" viewMode={isViewMode}>
      {summaryMessages.length > 0 ? (
        <div className={formMessageClassName(summaryMessages)}>
          {summaryMessages.map((message) => (
            <div key={message}>{message}</div>
          ))}
        </div>
      ) : null}

      {activePocPurposeLock ? (
        <div className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {ACTIVE_POC_PURPOSE_LOCK_MESSAGE}
        </div>
      ) : null}

      <CollapsibleSection
        title="System header"
        subtitle="Compact Excel-derived header fields."
        collapsed={collapsedSections.header}
        onToggle={() => toggleSection('header')}
      >
        <div className="space-y-3">
          {headerLines.map(([line, fields]) => (
            <div key={line} className="flex flex-wrap items-start gap-3">
              {fields.map(renderHeaderField)}
            </div>
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="System tabs"
        subtitle="Tab structure is available now; detailed execution workflows remain out of scope for Phase D.1."
        collapsed={collapsedSections.tabs}
        onToggle={() => toggleSection('tabs')}
      >
        <div className="overflow-hidden rounded border border-sf-border bg-sf-surface">
          <div className="sticky top-0 z-10 flex flex-nowrap overflow-x-auto border-b border-sf-border bg-sf-surface-alt">
            {systemTabs.map((tab) => (
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
          <div className="min-h-48 p-4 text-sm text-sf-text-muted" role="tabpanel" aria-label={systemTabs.find((tab) => tab.id === activeTab)?.label}>
            {activeTab === 'infrastructure'
              ? renderInfrastructureTab()
              : activeTab === 'tenant'
                ? renderTenantTab()
                : activeTab === 'versionUpdate'
                  ? renderVersionUpdateTab()
                  : activeTab === 'linkedProjects'
                    ? renderLinkedProjectsTab()
                    : activeTab === 'documents'
                      ? renderDocumentsTab()
                      : activeTab === 'owner'
                        ? renderOwnerTab()
                        : activeTab === 'activity'
                          ? renderActivityTab()
                          : `${systemTabs.find((tab) => tab.id === activeTab)?.label} workspace is reserved for later system execution phases.`}
          </div>
        </div>
      </CollapsibleSection>
      {renderPurposeHistorySection()}
      {renderRemarksSection()}
      {renderConfigurationHistorySection()}
      </WorkspaceScrollContent>

      {navigationBlocker.state === 'blocked' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-sf-border bg-white p-4 shadow-xl" role="dialog" aria-modal="false" aria-labelledby="system-unsaved-changes-title">
            <h2 id="system-unsaved-changes-title" className="text-lg font-semibold text-sf-text">Unsaved changes</h2>
            <p className="mt-2 text-sm text-sf-text-muted">
              You have unsaved system changes. What would you like to do before leaving this form?
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={saveBlockedNavigation}>
                Save Changes
              </button>
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={discardSystemChangesAndProceed}>
                Discard Changes
              </button>
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => navigationBlocker.reset?.()}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {renderAddTenantDialog()}
      {renderMoveTenantDialog()}
    </WorkspaceFrame>
  )
}

export function ProductionSystemInventoryFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const inventoryRecords = useAppStore((state) => state.productionSystemInventory)
  const systems = useAppStore((state) => state.systems)
  const saveSystemFormTransaction = useAppStore((state) => state.saveSystemFormTransaction)
  const allocatedRecords = useMemo(() => systems.filter((system) => system.source !== SYSTEM_SOURCE_REUSED_INTERNAL), [systems])
  const records = useMemo(() => [...inventoryRecords, ...allocatedRecords], [inventoryRecords, allocatedRecords])
  const record = useMemo(() => records.find((system) => system.sid === sid), [records, sid])

  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={productionSystemMetadata}
      onSave={(id, patch, options, tenantRemovalIds) => {
        if (inventoryRecords.some((system) => system.id === id)) {
          saveSystemFormTransaction('production', id, patch as Partial<ProductionSystemInventoryItem>, tenantRemovalIds, options)
          return
        }
        saveSystemFormTransaction('allocated', id, patch as Partial<System>, tenantRemovalIds, options)
      }}
      dashboardPath="/systems/production-inventory"
    />
  )
}

export function ReusedInternalSystemFormPage() {
  const { mid } = useParams<{ mid: string }>()
  const inventoryRecords = useAppStore((state) => state.reusedInternalSystems)
  const systems = useAppStore((state) => state.systems)
  const saveSystemFormTransaction = useAppStore((state) => state.saveSystemFormTransaction)
  const allocatedRecords = useMemo(() => systems.filter((system) => system.source === SYSTEM_SOURCE_REUSED_INTERNAL), [systems])
  const records = useMemo(() => [...inventoryRecords, ...allocatedRecords], [inventoryRecords, allocatedRecords])
  const record = useMemo(() => records.find((system) => system.machineId === mid || system.id === mid), [records, mid])

  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={reusedInternalSystemMetadata}
      onSave={(id, patch, options, tenantRemovalIds) => {
        if (inventoryRecords.some((system) => system.id === id)) {
          saveSystemFormTransaction('reused', id, patch as Partial<ReusedInternalSystem>, tenantRemovalIds, options)
          return
        }
        saveSystemFormTransaction('allocated', id, patch as Partial<System>, tenantRemovalIds, options)
      }}
      dashboardPath="/systems/reused-internal"
    />
  )
}
