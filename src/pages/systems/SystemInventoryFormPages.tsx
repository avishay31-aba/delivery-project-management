import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import {
  Ban,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  Crosshair,
  Database,
  DoorOpen,
  Globe2,
  Grid3X3,
  LockKeyhole,
  Network,
  Plus,
  PowerOff,
  ServerOff,
  ShieldX,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react'
import { PageHeader } from '@/components/record'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { FormField, LinkId, PlaceholderCard } from '@/components/ui'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import {
  HOSTING_OPTIONS,
  cloudPlatformOptionsForHosting,
  cloudRegionOptionsForCloudPlatform,
  cspOptionsForCloudPlatform,
} from '@/config/cloud-platform-metadata'
import {
  APPLICATION_CONFIGURATION_SUMMARY_FIELDS,
  TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
  type SharedFieldMetadata,
  type TenantConfigurationFieldMetadata,
} from '@/config/application-configuration-fields'
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
import type { NewTenantRequirement, Opportunity, ProductionSystemInventoryItem, Project, ReusedInternalSystem, System, Tenant } from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'
import {
  activeProjectTenantLinks,
} from '@/domain/allocation-context'
import {
  hostingContextPatchForFieldChange,
  sanitizeHostingContext,
  validateHostingContext,
} from '@/domain/hosting-context'
import {
  hostedTenantsForSystem,
  linkedProjectDisplay,
  linkedProjectIdsForSystem,
  SYSTEM_SOURCE_REUSED_INTERNAL,
  systemIdentity,
  systemTimeGroup,
  systemTimeGroupAlert,
  tenantCountForSystem,
  validateReusedInternalMachineId,
} from '@/domain/system-inventory'
import { effectiveTenantOperationalMode } from '@/domain/tenant-operations'

type InventoryRecord = ProductionSystemInventoryItem | ReusedInternalSystem | System
type InventorySectionId = 'header' | 'configuration' | 'tabs'
type InfrastructureInnerTab = 'environment' | 'infrastructure'

const DEFAULT_COLLAPSED_SECTIONS: Record<InventorySectionId, boolean> = {
  header: false,
  configuration: false,
  tabs: false,
}

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

const OPERATIONAL_STATUS_ICON_STYLES: Record<string, string> = {
  On: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]',
  Off: 'text-red-500',
  'Access blocked': 'text-amber-500',
  'Service blocked': 'text-orange-500',
  Deleted: 'text-gray-500',
  Canceled: 'text-purple-500',
}

const APPLICATION_SUMMARY_FIELDS = APPLICATION_CONFIGURATION_SUMMARY_FIELDS
const TENANT_CONFIGURATION_FIELDS = TENANT_REQUIREMENT_CONFIGURATION_FIELDS
const APPLICATION_FIELD_BY_KEY = new Map(APPLICATION_CONFIGURATION_SUMMARY_FIELDS.map((field) => [field.key, field]))
const INTEGER_SUMMARY_KEYS = new Set([
  'licenses',
  'users',
  'concurrentSearches',
  'dailySearches',
  'monthlySearches',
  'concurrentAnalyses',
  'topicAnalyses',
  'dailyAnalyses',
  'monthlyAnalyses',
  'standardMonitors',
  'fullMonitors',
  'topicMonitors',
  'tangles',
  'tanglesGo',
  'webloc',
  'webeye',
  'ingest',
  'apiDailyQty',
  'apiMonthlyQty',
])

function cloneRecord<T extends InventoryRecord>(record: T): T {
  return JSON.parse(JSON.stringify(record)) as T
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
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
      <button type="button" className="flex min-w-0 items-start gap-2 text-left" onClick={onToggle} aria-expanded={!collapsed}>
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

function deriveLinkedProjects(record: InventoryRecord, projects: Project[]): string {
  return linkedProjectDisplay(record, projects)
}

function deriveTenantCount(record: InventoryRecord, tenants: Tenant[]): number {
  return tenantCountForSystem(record, tenants)
}

function deriveTimeGroup(record: InventoryRecord, tenants: Tenant[]): string {
  return systemTimeGroup(record, tenants)
}

function derivedValue(record: InventoryRecord, key: string, projects: Project[], tenants: Tenant[]): string {
  if (key === 'linkedProjects') return deriveLinkedProjects(record, projects)
  if (key === 'tenantCount') return String(deriveTenantCount(record, tenants))
  if (key === 'timeGroup') return deriveTimeGroup(record, tenants)
  if (key === 'timeGroupAlert') {
    return systemTimeGroupAlert(record, tenants, readRecordValue(record, key))
  }
  return textValue(readRecordValue(record, key))
}

function OperationalStatusBadge({ value }: { value: string }) {
  const Icon =
    value === 'On'
      ? CircleCheck
      : value === 'Off'
        ? PowerOff
        : value === 'Access blocked'
          ? LockKeyhole
          : value === 'Service blocked'
            ? ShieldX
            : value === 'Deleted'
              ? Trash2
              : value === 'Canceled'
                ? Ban
                : ServerOff

  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <Icon className={['h-5 w-5 stroke-[3]', OPERATIONAL_STATUS_ICON_STYLES[value] ?? 'text-slate-400'].join(' ')} aria-hidden="true" />
      {value || 'Not set'}
    </span>
  )
}

function LargeStatusIcon({ status }: { status: string }) {
  const Icon =
    status === 'On'
      ? CircleCheck
      : status === 'Off'
        ? PowerOff
        : status === 'Access blocked'
          ? LockKeyhole
          : status === 'Service blocked'
            ? ShieldX
            : status === 'Deleted'
              ? Trash2
              : status === 'Canceled'
                ? Ban
                : ServerOff

  return (
    <Icon className={['h-9 w-9 stroke-[3]', OPERATIONAL_STATUS_ICON_STYLES[status] ?? 'text-slate-400'].join(' ')} aria-label={`Operational status: ${status || 'Not set'}`} />
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

function InventoryForm<T extends InventoryRecord>({
  record,
  records,
  metadata,
  onSave,
  dashboardPath,
  recordPath,
}: {
  record: T | undefined
  records: T[]
  metadata: SystemInventoryMetadata
  onSave: (id: string, patch: Partial<T>) => void
  dashboardPath: string
  recordPath: (record: T) => string
}) {
  const navigate = useNavigate()
  const projects = useAppStore((state) => state.projects)
  const opportunities = useAppStore((state) => state.opportunities)
  const tenants = useAppStore((state) => state.tenants)
  const allocatedSystems = useAppStore((state) => state.systems)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const createTenantFromSystemRequirement = useAppStore((state) => state.createTenantFromSystemRequirement)
  const createTenant = useAppStore((state) => state.createTenant)
  const updateTenant = useAppStore((state) => state.updateTenant)
  const updateSystem = useAppStore((state) => state.updateSystem)
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
  const [messages, setMessages] = useState<string[]>([])
  const [addTenantOpen, setAddTenantOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedRequirementId, setSelectedRequirementId] = useState('')
  const [tenantAddedInSession, setTenantAddedInSession] = useState(false)
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [pendingAddNew, setPendingAddNew] = useState<{ key: string; value: string } | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<InventorySectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)
  const isDirty = Boolean(record && draft && !valuesEqual(record, draft))
  const navigationBlocker = useBlocker(isDirty)

  useEffect(() => {
    resetDraft(record ? cloneRecord(record) : null)
  }, [record, resetDraft])

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
  const invalidFields = new Set<string>()

  function allocatedSystemForTenantCreation(): System | undefined {
    if ('systemClass' in activeRecord) return activeRecord
    return allocatedSystems.find((system) => {
      const sameSid = 'sid' in activeRecord && activeRecord.sid && system.sid === activeRecord.sid
      const sameMachine = 'machineId' in activeRecord && activeRecord.machineId && system.machineId === activeRecord.machineId
      return sameSid || sameMachine
    })
  }

  function updateField(key: string, value: unknown) {
    setDraft((current) => {
      if (!current) return current
      const next = { ...current, [key]: value }
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
    if (value === 'Add new...') {
      setPendingAddNew({ key, value: '' })
      return
    }
    updateField(key, value)
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
    }

    validateHostingContext(activeDraft).forEach((message) => {
      if (message.field) invalidFields.add(message.field)
      nextMessages.push(message.message)
    })

    return nextMessages
  }

  function sanitizedDraftForSave(): T {
    return sanitizeHostingContext(activeDraft)
  }

  validate()
  const lines = new Map<number, SystemInventoryHeaderField[]>()
  metadata.headerFields.forEach((field) => {
    lines.set(field.line, [...(lines.get(field.line) ?? []), field])
  })
  const headerLines = Array.from(lines.entries()).sort(([first], [second]) => first - second)
  const currentTemporarySids =
    metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL
      ? allocatedSystems
          .filter((system) => system.machineId && system.machineId === readRecordValue(activeDraft, 'machineId') && system.sid)
          .map((system) => system.sid as string)
      : []

  function save(stayOnPage: boolean) {
    const nextMessages = validate()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      return
    }

    const nextDraft = sanitizedDraftForSave()
    onSave(nextDraft.id, nextDraft as Partial<T>)
    setMessages(['System inventory record saved.'])
    setSaveMenuOpen(false)
    if (!stayOnPage && !tenantAddedInSession) {
      navigate(dashboardPath)
      return
    }
    setTenantAddedInSession(false)
    navigate(recordPath(nextDraft), { replace: true })
  }

  function saveBlockedNavigation() {
    const nextMessages = validate()
    if (nextMessages.length > 0) {
      setMessages(nextMessages)
      navigationBlocker.reset?.()
      return
    }

    const nextDraft = sanitizedDraftForSave()
    onSave(nextDraft.id, nextDraft as Partial<T>)
    setMessages(['System inventory record saved.'])
    navigationBlocker.proceed?.()
  }

  function renderHeaderField(field: SystemInventoryHeaderField) {
    const value = derivedValue(activeDraft, field.key, projects, tenants)
    const isChanged = fieldChanged(field.key)
    const isInvalid = invalidFields.has(field.key) && messages.length > 0
    const width =
      field.key === 'url'
        ? 'w-96'
        : field.key === 'alerts' || field.key === 'timeGroupAlert' || field.key === 'linkedProjects'
          ? 'w-80'
          : 'w-48'

    if (!field.editable) {
      if (field.key === 'logo') {
        const productType = applicationSummaryProduct()
        return (
          <FormField key={field.key} label={field.label} controlWidthClassName={width}>
            {productType ? <ProductLogoIcon product={productType} /> : null}
          </FormField>
        )
      }

      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={width}>
          <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
            {value || '-'}
          </div>
        </FormField>
      )
    }

    if (field.inputType === 'picklist') {
      if (field.key === 'operationalStatus') {
        return (
          <FormField key={field.key} label={field.label} controlWidthClassName={width}>
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
        <FormField key={field.key} label={field.label} controlWidthClassName={width}>
          <select className={fieldClassName(isChanged, isInvalid)} value={value} onChange={(event) => updateField(field.key, event.target.value)}>
            {(field.options ?? []).map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </FormField>
      )
    }

    if (field.inputType === 'date') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-40">
          <input className={fieldClassName(isChanged, isInvalid)} type="date" value={value} onChange={(event) => updateField(field.key, event.target.value || null)} />
        </FormField>
      )
    }

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName={width}>
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

    if (field.key === 'cloudPlatform' && hostingType === 'On premise') return null
    if ((field.key === 'csp' || field.key === 'cloudRegion') && !cloudPlatform) return null
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

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName="w-56">
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
    const value = textValue(readRecordValue(activeDraft, field.key))
    const isChanged = fieldChanged(field.key)
    const vpnEnabled = textValue(readRecordValue(activeDraft, 'vpnEnabled'))

    if (field.key === 'vpnType' && vpnEnabled !== 'YES') return null

    if (field.inputType === 'text') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-96">
          <input className={fieldClassName(isChanged, invalidFields.has(field.key) && messages.length > 0)} value={value} onChange={(event) => updateField(field.key, event.target.value)} />
        </FormField>
      )
    }

    if (field.inputType === 'yesNo') {
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName="w-36">
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

    return (
      <FormField key={field.key} label={field.label} controlWidthClassName="w-56">
        <select className={fieldClassName(isChanged)} value={value} onChange={(event) => handlePicklistChange(field.key, event.target.value)}>
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
    return hostedTenantsForSystem(activeRecord.id, tenants)
  }

  function applicationSummaryProduct(): string {
    return textValue(readRecordValue(activeDraft, 'productType')) || (hostedTenantsForDraft().find((tenant) => textValue(tenant.configuration?.product ?? tenant.productType))?.productType ?? '')
  }

  function tenantConfigurationValue(tenant: Tenant, field: SharedFieldMetadata): unknown {
    const applicationField = APPLICATION_FIELD_BY_KEY.get(field.key) as TenantConfigurationFieldMetadata | undefined
    if (applicationField) {
      if (applicationField.configKey === 'product') return tenant.configuration?.product ?? tenant.productType
      return tenant.configuration?.[applicationField.configKey] ?? (tenant as unknown as Record<string, unknown>)[field.key]
    }
    return (tenant as unknown as Record<string, unknown>)[field.key]
  }

  function tenantSummaryValue(field: TenantConfigurationFieldMetadata, hostedTenants: Tenant[]): string {
    if (hostedTenants.length === 0) return '-'
    if (field.configKey === 'product') return textValue(readRecordValue(activeDraft, 'productType')) || '-'
    if (INTEGER_SUMMARY_KEYS.has(field.key)) {
      return String(
        hostedTenants.reduce((total, tenant) => {
          const value = tenantConfigurationValue(tenant, field)
          return total + (typeof value === 'number' ? value : 0)
        }, 0),
      )
    }

    const values = hostedTenants
      .flatMap((tenant) => {
        const value = tenantConfigurationValue(tenant, field)
        return Array.isArray(value) ? value : [value]
      })
      .map((value) => textValue(value).trim())
      .filter(Boolean)

    return Array.from(new Set(values)).join('; ') || '-'
  }

  function tenantFieldValue(tenant: Tenant, field: SharedFieldMetadata): string {
    return textValue(tenantConfigurationValue(tenant, field)) || '-'
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
    if (!selectedProjectId || !selectedRequirementId) return
    const selectedProject = projects.find((project) => project.id === selectedProjectId)
    const systemForTenant = allocatedSystemForTenantCreation() ?? activeRecord
    if (selectedRequirementId === 'INTERNAL') {
      const tenant = createTenant()
      updateTenant(tenant.id, {
        tenantName: `${tenant.tid} Internal`,
        accountId: String(readRecordValue(systemForTenant, 'accountId') ?? ''),
        systemId: systemForTenant.id,
        hostedSystemId: systemForTenant.id,
        hostingSid: String(readRecordValue(systemForTenant, 'sid') ?? ''),
        deliveryPid: selectedProject?.pid ?? '',
        tenantType: 'PENLINK_INTERNAL',
        tenantFormType: 'INTERNAL',
        accountName: 'Internal',
        country: String(readRecordValue(systemForTenant, 'country') ?? ''),
        timeGroup: String(readRecordValue(systemForTenant, 'timeGroup') ?? ''),
        operationalStatus: '',
        contractStatus: 'UNDER_CONTRACT',
        hostedSystemHistory: [{ systemId: systemForTenant.id, startedAt: new Date().toISOString(), endedAt: null, reason: 'Created' }],
        productType: String(readRecordValue(systemForTenant, 'productType') ?? ''),
        hostingType: String(readRecordValue(systemForTenant, 'hostingType') ?? ''),
        cloudPlatform: String(readRecordValue(systemForTenant, 'cloudPlatform') ?? ''),
        users: null,
      })
      const currentTenantIds = (readRecordValue(systemForTenant, 'tenantIds') as string[] | undefined) ?? []
      updateSystem(systemForTenant.id, { tenantIds: Array.from(new Set([...currentTenantIds, tenant.id])) })
      setMessages([`Tenant ${tenant.tid} created.`])
      setTenantAddedInSession(true)
      setAddTenantOpen(false)
      setSelectedProjectId('')
      setSelectedRequirementId('')
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
      setTenantAddedInSession(true)
      setAddTenantOpen(false)
      setSelectedProjectId('')
      setSelectedRequirementId('')
    }
  }

  function renderTenantRows(hostedTenants: Tenant[]) {
    return hostedTenants.map((tenant) => (
      <tr key={tenant.id} className="hover:bg-sf-surface-alt">
        <td className="border border-sf-border px-1.5 py-1 text-sf-text"><LinkId to={`/tenants/${tenant.tid}`}>{tenant.tid}</LinkId></td>
        <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.accountName || '-'}</td>
        <td className="border border-sf-border px-1.5 py-1 text-sf-text">
          {tenant.deliveryPid ? <LinkId to={`/projects/${tenant.deliveryPid}`}>{tenant.deliveryPid}</LinkId> : '-'}
        </td>
        <td className="border border-sf-border px-1.5 py-1 text-sf-text"><OperationalStatusBadge value={effectiveTenantOperationalMode(tenant, activeRecord as System)} /></td>
        {TENANT_CONFIGURATION_FIELDS.map((column) => (
          <td key={column.key} className="max-w-64 border border-sf-border px-1.5 py-1 text-sf-text">
            {tenantFieldValue(tenant, column)}
          </td>
        ))}
      </tr>
    ))
  }

  function renderTenantTab() {
    const hostedTenants = hostedTenantsForDraft()
    const underContractTenants = hostedTenants.filter((tenant) => tenant.contractStatus !== 'OUT_OF_CONTRACT')
    const outOfContractTenants = hostedTenants.filter((tenant) => tenant.contractStatus === 'OUT_OF_CONTRACT')
    const tenantHeaders = ['TID', 'Customer / End User Name', 'Delivery PID', 'Operational Status']

    function renderHostedTenantSection(title: string, sectionTenants: Tenant[]) {
      return (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-sf-text">{title}</h3>
          {sectionTenants.length > 0 ? (
            <div className="sf-scroll-x rounded border border-sf-border bg-white">
              <table className="min-w-full border-collapse text-sm leading-tight">
                <thead className="bg-sf-surface-alt text-left">
                  <tr>
                    {tenantHeaders.map((label) => (
                      <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                        {label}
                      </th>
                    ))}
                    {TENANT_CONFIGURATION_FIELDS.map((column) => (
                      <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                        <span>{column.label}</span>
                        <span className="block text-xs font-normal text-sf-text-muted">{column.group}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>{renderTenantRows(sectionTenants)}</tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
              No hosted tenants in this section.
            </div>
          )}
        </section>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt disabled:opacity-50"
            disabled={linkedProjectsForSystem().length === 0}
            onClick={openAddTenantDialog}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Tenant
          </button>
          {linkedProjectsForSystem().length === 0 ? (
            <div className="text-sm text-sf-text-muted">Link this system to a project before adding tenants.</div>
          ) : null}
        </div>

        {renderHostedTenantSection('Under Contract', underContractTenants)}
        {renderHostedTenantSection('Out of Contract', outOfContractTenants)}

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-sf-text">Application Configuration Summary</h3>
          <div className="sf-scroll-x rounded border border-sf-border bg-white">
            <table className="w-max border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {APPLICATION_SUMMARY_FIELDS.map((column) => (
                    <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                      <span>{column.label}</span>
                      <span className="block text-xs font-normal text-sf-text-muted">{column.group}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {APPLICATION_SUMMARY_FIELDS.map((column) => (
                    <td key={column.key} className="max-w-64 border border-sf-border px-1.5 py-1 text-sf-text">
                      {tenantSummaryValue(column, hostedTenants)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    )
  }

  function renderInfrastructureTab() {
    const innerTabs: Array<{ id: InfrastructureInnerTab; label: string }> = [
      { id: 'environment', label: 'Environment' },
      { id: 'infrastructure', label: 'Infrastructure' },
    ]

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
          {innerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'border-b-2 px-4 py-2 text-sm font-semibold',
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
          <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
            Infrastructure workspace is reserved for later system execution phases.
          </div>
        )}
      </div>
    )
  }

  function renderActionButtons() {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative inline-flex">
          <button type="button" className="rounded-l bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={() => save(false)}>
            Save
          </button>
          <button
            type="button"
            className="rounded-r border-l border-blue-500 bg-sf-brand px-2 py-1.5 text-white hover:bg-blue-700"
            aria-label="More save actions"
            aria-expanded={saveMenuOpen}
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
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => navigate(dashboardPath)}>
          Cancel
        </button>
      </div>
    )
  }

  function renderDocumentsTab() {
    return (
      <DocumentsPanel
        documents={activeDraft.documents ?? []}
        emptyText="No documents uploaded for this system."
        onChange={(documents) => {
          setDraft((current) => (current ? ({ ...current, documents } as T) : current))
          setMessages([])
        }}
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
        <div className="w-full max-w-3xl rounded border border-sf-border bg-white shadow-xl" role="dialog" aria-modal="true" aria-labelledby="add-tenant-title">
          <div className="flex items-start justify-between gap-3 border-b border-sf-border p-4">
            <div>
              <h2 id="add-tenant-title" className="text-lg font-semibold text-sf-text">Add tenant</h2>
              <p className="text-sm text-sf-text-muted">Create a tenant from a linked Project new tenant requirement.</p>
            </div>
            <button type="button" className="rounded border border-sf-border bg-white p-1.5 hover:bg-sf-surface-alt" aria-label="Close add tenant dialog" onClick={() => setAddTenantOpen(false)}>
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {addTenantMessages.length > 0 ? (
              <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 lg:col-span-2" role="alert">
                {addTenantMessages.map((message) => (
                  <div key={message}>{message}</div>
                ))}
              </div>
            ) : null}
            <FormField label="PID" controlWidthClassName="w-full min-w-0">
              <select className="h-9 w-full min-w-0 rounded border border-sf-border px-2 py-1 text-sm" value={selectedProjectId} onChange={(event) => handleSelectedProjectChange(event.target.value)}>
                {linkedProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.pid} - {project.opportunityName}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Tenant Requirement ID" controlWidthClassName="w-full min-w-0">
              <select
                className="h-9 w-full min-w-0 rounded border border-sf-border px-2 py-1 text-sm"
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

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <LargeStatusIcon status={textValue(readRecordValue(activeDraft, 'operationalStatus'))} />
            <span>{`${metadata.titleLabel} ${systemIdentity(activeDraft)}`}</span>
          </span>
        }
        subtitle={metadata.sourceSheet}
        actions={renderActionButtons()}
      />

      <div className="sf-form-content-scroll min-h-0 flex-1 space-y-4 pb-2 pr-1">
      {messages.length > 0 ? (
        <div className={messages.some((message) => message.includes('cannot') || message.includes('required') || message.includes('unique')) ? 'rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700' : 'rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700'}>
          {messages.map((message) => (
            <div key={message}>{message}</div>
          ))}
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
          {metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL ? (
            <div className="flex flex-wrap items-start gap-3">
              <FormField label="Current SID" controlWidthClassName="w-56">
                <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
                  {currentTemporarySids.length > 0 ? currentTemporarySids.join(', ') : '-'}
                </div>
              </FormField>
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="System tabs"
        subtitle="Tab structure is available now; detailed execution workflows remain out of scope for Phase D.1."
        collapsed={collapsedSections.tabs}
        onToggle={() => toggleSection('tabs')}
      >
        <div className="overflow-hidden rounded border border-sf-border bg-sf-surface">
          <div className="sticky top-0 z-30 flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
            {metadata.tabs.map((tab) => (
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
          <div className="min-h-48 p-4 text-sm text-sf-text-muted" role="tabpanel" aria-label={metadata.tabs.find((tab) => tab.id === activeTab)?.label}>
            {activeTab === 'infrastructure'
              ? renderInfrastructureTab()
              : activeTab === 'tenant'
                ? renderTenantTab()
                : activeTab === 'documents'
                  ? renderDocumentsTab()
                  : `${metadata.tabs.find((tab) => tab.id === activeTab)?.label} workspace is reserved for later system execution phases.`}
          </div>
        </div>
      </CollapsibleSection>
      </div>

      {navigationBlocker.state === 'blocked' ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-sf-border bg-white p-4 shadow-xl">
            <h2 className="text-lg font-semibold text-sf-text">Unsaved changes</h2>
            <p className="mt-2 text-sm text-sf-text-muted">
              You have unsaved system changes. What would you like to do before leaving this form?
            </p>
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700" onClick={saveBlockedNavigation}>
                Save Changes
              </button>
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => navigationBlocker.proceed?.()}>
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
    </div>
  )
}

export function ProductionSystemInventoryFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const inventoryRecords = useAppStore((state) => state.productionSystemInventory)
  const systems = useAppStore((state) => state.systems)
  const updateInventoryRecord = useAppStore((state) => state.updateProductionSystemInventoryItem)
  const updateAllocatedRecord = useAppStore((state) => state.updateSystem)
  const allocatedRecords = useMemo(() => systems.filter((system) => system.source !== SYSTEM_SOURCE_REUSED_INTERNAL), [systems])
  const records = useMemo(() => [...inventoryRecords, ...allocatedRecords], [inventoryRecords, allocatedRecords])
  const record = useMemo(() => records.find((system) => system.sid === sid), [records, sid])

  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={productionSystemMetadata}
      onSave={(id, patch) => {
        if (inventoryRecords.some((system) => system.id === id)) {
          updateInventoryRecord(id, patch as Partial<ProductionSystemInventoryItem>)
          return
        }
        updateAllocatedRecord(id, patch as Partial<System>)
      }}
      dashboardPath="/systems/production-inventory"
      recordPath={(system) => `/systems/production-inventory/${system.sid ?? ''}`}
    />
  )
}

export function ReusedInternalSystemFormPage() {
  const { mid } = useParams<{ mid: string }>()
  const inventoryRecords = useAppStore((state) => state.reusedInternalSystems)
  const systems = useAppStore((state) => state.systems)
  const updateInventoryRecord = useAppStore((state) => state.updateReusedInternalSystem)
  const updateAllocatedRecord = useAppStore((state) => state.updateSystem)
  const allocatedRecords = useMemo(() => systems.filter((system) => system.source === SYSTEM_SOURCE_REUSED_INTERNAL), [systems])
  const records = useMemo(() => [...inventoryRecords, ...allocatedRecords], [inventoryRecords, allocatedRecords])
  const record = useMemo(() => records.find((system) => system.machineId === mid), [records, mid])

  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={reusedInternalSystemMetadata}
      onSave={(id, patch) => {
        if (inventoryRecords.some((system) => system.id === id)) {
          updateInventoryRecord(id, patch as Partial<ReusedInternalSystem>)
          return
        }
        updateAllocatedRecord(id, patch as Partial<System>)
      }}
      dashboardPath="/systems/reused-internal"
      recordPath={(system) => `/systems/reused-internal/${system.machineId}`}
    />
  )
}
