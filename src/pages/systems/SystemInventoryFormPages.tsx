import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/record'
import { FormField, PlaceholderCard } from '@/components/ui'
import {
  PRODUCT_OPTIONS,
  HOSTING_OPTIONS,
  cloudPlatformOptionsForHosting,
  cloudRegionOptionsForCloudPlatform,
  cspOptionsForCloudPlatform,
  requiresCloudRegion,
} from '@/config/cloud-platform-metadata'
import { requirementAColumns } from '@/config/opportunity-metadata'
import {
  productionSystemMetadata,
  reusedInternalSystemMetadata,
  type SystemInventoryHeaderField,
  type SystemInventoryMetadata,
} from '@/config/system-inventory-metadata'
import { timeGroupForCountry } from '@/config/time-groups'
import type { ProductionSystemInventoryItem, Project, ReusedInternalSystem, System, Tenant } from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'
import { addCustomPicklistOption, loadCustomPicklistOptions } from '@/utils/custom-picklist-options'

type InventoryRecord = ProductionSystemInventoryItem | ReusedInternalSystem | System
type InventorySectionId = 'header' | 'configuration' | 'tabs'
type InfrastructureInnerTab = 'environment' | 'infrastructure'

const DEFAULT_COLLAPSED_SECTIONS: Record<InventorySectionId, boolean> = {
  header: false,
  configuration: false,
  tabs: false,
}

const APPLICATION_CONFIGURATION_COLUMNS = requirementAColumns.slice(3).filter((column) => column.key !== 'hostingType' && column.key !== 'cloudPlatform')
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
  { key: 'vpnEnabled', label: 'VPN', inputType: 'yesNo' },
  { key: 'vpnType', label: 'VPN Type', inputType: 'picklist' },
  { key: 'ipRestrictionEnabled', label: 'IP Restriction', inputType: 'yesNo' },
]
const PERFORMANCE_TIER_OPTIONS = ['STANDARD', 'POWERED']
const VPN_TYPE_OPTIONS = ['OpenVPN', 'FortiGate', 'CheckPoint', 'Cisco', 'Palo Alto', 'Jump server', 'Apache Guacamole', 'Add new...']
const PICKLIST_OPTIONS: Record<string, string[]> = {
  mapCenter: ['USA', 'Canada', 'Germany', 'UK', 'Australia', 'Japan', 'Singapore', 'Israel'],
  blockchain: ['Yes', 'No'],
  apiEnabled: ['Yes', 'No'],
}

const PRODUCT_LOGOS: Record<string, string> = {
  Tangles: 'T',
  'Tangles Light': 'TL',
  Webloc: 'Wb',
  Weaver: 'Wv',
  Trapdoor: 'Tr',
  Lynx: 'L',
  DataAPI: 'API',
}

const PRODUCT_LOGO_COLORS: Record<string, string> = {
  Tangles: 'bg-blue-600',
  'Tangles Light': 'bg-cyan-600',
  Webloc: 'bg-emerald-600',
  Weaver: 'bg-violet-600',
  Trapdoor: 'bg-amber-600',
  Lynx: 'bg-rose-600',
  DataAPI: 'bg-slate-700',
}

const OPERATIONAL_STATUS_STYLES: Record<string, string> = {
  On: 'bg-green-500',
  Off: 'bg-red-500',
  'Access blocked': 'bg-amber-500',
  'Service blocked': 'bg-orange-500',
  Deleted: 'bg-gray-500',
  Canceled: 'bg-purple-500',
}

const APPLICATION_SUMMARY_FIELDS = APPLICATION_CONFIGURATION_COLUMNS.filter((column) => column.key !== 'existingSystemId' && column.key !== 'deployTarget')
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

function readRecordValue(record: InventoryRecord, key: string): unknown {
  if (key === 'logo') return PRODUCT_LOGOS[textValue(readRecordValue(record, 'productType'))] ?? 'SYS'
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
  const projectIds =
    'linkedProjects' in record
      ? record.linkedProjects ?? []
      : 'currentProjectIds' in record
        ? record.currentProjectIds
        : []
  return projectIds
    .map((projectId) => projects.find((project) => project.id === projectId)?.pid ?? projectId)
    .join(', ')
}

function deriveTenantCount(record: InventoryRecord, tenants: Tenant[]): number {
  if ('sid' in record) {
    const hostedTenantCount = tenants.filter((tenant) => tenant.systemId === record.id).length
    const storedTenantCount = 'tenantCount' in record ? record.tenantCount : 0
    return hostedTenantCount || storedTenantCount || 0
  }
  return record.tenantCount || 0
}

function deriveTimeGroup(record: InventoryRecord, tenants: Tenant[]): string {
  const oldestTenant = tenants
    .filter((tenant) => tenant.systemId === record.id)
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt))[0]
  return timeGroupForCountry(oldestTenant?.country) || textValue(readRecordValue(record, 'timeGroup'))
}

function derivedValue(record: InventoryRecord, key: string, projects: Project[], tenants: Tenant[]): string {
  if (key === 'linkedProjects') return deriveLinkedProjects(record, projects)
  if (key === 'tenantCount') return String(deriveTenantCount(record, tenants))
  if (key === 'timeGroup') return deriveTimeGroup(record, tenants)
  if (key === 'timeGroupAlert') {
    const systemTimeGroup = deriveTimeGroup(record, tenants)
    const tenant = tenants.find((candidate) => candidate.systemId === record.id && timeGroupForCountry(candidate.country) && timeGroupForCountry(candidate.country) !== systemTimeGroup)
    return tenant ? `Tenant ${tenant.tid} does not belong to system time group` : textValue(readRecordValue(record, key))
  }
  return textValue(readRecordValue(record, key))
}

function OperationalStatusBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <span className={['h-2.5 w-2.5 rounded-full', OPERATIONAL_STATUS_STYLES[value] ?? 'bg-slate-300'].join(' ')} aria-hidden="true" />
      {value || 'Not set'}
    </span>
  )
}

function LargeStatusIcon({ status }: { status: string }) {
  return (
    <span
      className={['inline-block h-5 w-5 rounded-full align-middle shadow-sm ring-2 ring-white', OPERATIONAL_STATUS_STYLES[status] ?? 'bg-slate-300'].join(' ')}
      title={status || 'Not set'}
      aria-label={`Operational status: ${status || 'Not set'}`}
    />
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
  const tenants = useAppStore((state) => state.tenants)
  const [draft, setDraft] = useState<T | null>(record ? cloneRecord(record) : null)
  const [activeTab, setActiveTab] = useState(metadata.tabs[0]?.id ?? 'tenant')
  const [activeInfrastructureTab, setActiveInfrastructureTab] = useState<InfrastructureInnerTab>('environment')
  const [saveMenuOpen, setSaveMenuOpen] = useState(false)
  const [messages, setMessages] = useState<string[]>([])
  const [customPicklistOptions, setCustomPicklistOptions] = useState<Record<string, string[]>>(() => loadCustomPicklistOptions())
  const [pendingAddNew, setPendingAddNew] = useState<{ key: string; value: string } | null>(null)
  const [collapsedSections, setCollapsedSections] = useState<Record<InventorySectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)
  const isDirty = Boolean(record && draft && !valuesEqual(record, draft))
  const navigationBlocker = useBlocker(isDirty)

  useEffect(() => {
    setDraft(record ? cloneRecord(record) : null)
  }, [record])

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

  function updateField(key: string, value: unknown) {
    setDraft((current) => {
      if (!current) return current
      const next = { ...current, [key]: value }
      if (key === 'productType') {
        return { ...next, logo: PRODUCT_LOGOS[String(value)] ?? 'SYS' } as T
      }
      if (key === 'hostingType') {
        return { ...next, cloudPlatform: '', csp: '', cloudRegion: '' } as T
      }
      if (key === 'cloudPlatform') {
        return { ...next, csp: '', cloudRegion: '' } as T
      }
      if (key === 'vpnEnabled' && value !== 'YES') {
        return { ...next, vpnType: '' } as T
      }
      return next as T
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
    const url = textValue(readRecordValue(activeDraft, 'url'))
    const mid = textValue(readRecordValue(activeDraft, 'machineId')).trim()

    if (metadata.source === 'Reused Internal Systems') {
      const duplicateMid = records.some((candidate) => candidate.id !== activeRecord.id && textValue(readRecordValue(candidate, 'machineId')).trim() === mid)
      if (!mid) {
        invalidFields.add('machineId')
        nextMessages.push('MID is required.')
      } else if (duplicateMid) {
        invalidFields.add('machineId')
        nextMessages.push('MID must be unique.')
      }
    }

    if (url && (!/^https?:\/\/\S+$/.test(url) || url.includes(' '))) {
      invalidFields.add('url')
      nextMessages.push('URL must start with http:// or https:// and contain no spaces.')
    }

    if (requiresCloudRegion(textValue(readRecordValue(activeDraft, 'cloudPlatform'))) && !textValue(readRecordValue(activeDraft, 'cloudRegion'))) {
      invalidFields.add('cloudRegion')
      nextMessages.push('Cloud Region is required when Cloud Platform is AWS, AWS Gov, Azure, or Azure Gov.')
    }

    return nextMessages
  }

  function sanitizedDraftForSave(): T {
    const hostingType = textValue(readRecordValue(activeDraft, 'hostingType'))
    const cloudPlatform = textValue(readRecordValue(activeDraft, 'cloudPlatform'))
    const vpnEnabled = textValue(readRecordValue(activeDraft, 'vpnEnabled'))
    const next = { ...activeDraft } as T & Record<string, unknown>

    if (hostingType === 'On premise') {
      next.cloudPlatform = ''
      next.csp = ''
      next.cloudRegion = ''
    } else if (!cloudPlatform) {
      next.csp = ''
      next.cloudRegion = ''
    } else if (cloudPlatform === "Customer's datacenter") {
      next.cloudRegion = ''
    }

    if (vpnEnabled !== 'YES') {
      next.vpnType = ''
    }

    return next as T
  }

  validate()
  const lines = new Map<number, SystemInventoryHeaderField[]>()
  metadata.headerFields.forEach((field) => {
    lines.set(field.line, [...(lines.get(field.line) ?? []), field])
  })
  const headerLines = Array.from(lines.entries()).sort(([first], [second]) => first - second)

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
    if (!stayOnPage) {
      navigate(dashboardPath)
      return
    }
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
        const productType = textValue(readRecordValue(activeDraft, 'productType'))
        return (
          <FormField key={field.key} label={field.label} controlWidthClassName={width}>
            <div className="min-h-8 rounded border border-sf-border bg-sf-surface-alt px-2 py-1 text-sm text-sf-text">
              <span className={['inline-flex h-6 min-w-6 items-center justify-center rounded text-xs font-bold text-white', PRODUCT_LOGO_COLORS[productType] ?? 'bg-slate-500'].join(' ')}>
                {value || 'SYS'}
              </span>
            </div>
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

  function renderConfigurationCell(key: string, inputType?: string) {
    const value = textValue(readRecordValue(activeDraft, key))
    const isChanged = fieldChanged(key)
    const hostingType = textValue(readRecordValue(activeDraft, 'hostingType'))
    const cloudPlatform = textValue(readRecordValue(activeDraft, 'cloudPlatform'))

    if (key === 'cloudPlatform' && hostingType === 'On premise') {
      return <input className={fieldClassName(isChanged)} value="" disabled />
    }

    if (key === 'csp' && !cloudPlatform) return null
    if (key === 'cloudRegion' && (!cloudPlatform || cloudPlatform === "Customer's datacenter")) return null

    if (inputType === 'picklist') {
      const options =
        key === 'hostingType'
          ? HOSTING_OPTIONS
          : key === 'cloudPlatform'
            ? cloudPlatformOptionsForHosting(hostingType)
            : key === 'csp'
              ? cspOptionsForCloudPlatform(cloudPlatform)
              : key === 'cloudRegion'
                ? cloudRegionOptionsForCloudPlatform(cloudPlatform)
                : key === 'productType'
                  ? PRODUCT_OPTIONS
                  : PICKLIST_OPTIONS[key] ?? []
      const isDisabled = key === 'cloudPlatform' && options.length === 0
      return (
        <select className={fieldClassName(isChanged, invalidFields.has(key) && messages.length > 0)} value={isDisabled ? '' : value} disabled={isDisabled} onChange={(event) => updateField(key, event.target.value)}>
          <option value="" />
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )
    }

    if (inputType === 'integer') {
      return (
        <input
          className={fieldClassName(isChanged)}
          inputMode="numeric"
          value={value}
          onChange={(event) => updateField(key, event.target.value === '' ? null : Number(event.target.value.replace(/\D/g, '')))}
        />
      )
    }

    return <input className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(key, event.target.value)} />
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
            {['YES', 'NO'].map((option) => (
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
    return tenants.filter((tenant) => tenant.systemId === activeRecord.id)
  }

  function tenantSummaryValue(key: string, hostedTenants: Tenant[]): string {
    if (hostedTenants.length === 0) return '-'
    if (INTEGER_SUMMARY_KEYS.has(key)) {
      return String(
        hostedTenants.reduce((total, tenant) => {
          const value = (tenant as unknown as Record<string, unknown>)[key]
          return total + (typeof value === 'number' ? value : 0)
        }, 0),
      )
    }

    const values = hostedTenants
      .flatMap((tenant) => {
        const value = (tenant as unknown as Record<string, unknown>)[key]
        return Array.isArray(value) ? value : [value]
      })
      .map((value) => textValue(value).trim())
      .filter(Boolean)

    return Array.from(new Set(values)).join('; ') || '-'
  }

  function renderTenantTab() {
    const hostedTenants = hostedTenantsForDraft()

    return (
      <div className="space-y-4">
        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-sf-text">Hosted Tenants</h3>
          {hostedTenants.length > 0 ? (
            <div className="overflow-x-auto rounded border border-sf-border bg-white">
              <table className="min-w-full border-collapse text-sm leading-tight">
                <thead className="bg-sf-surface-alt text-left">
                  <tr>
                    {[
                      'TID',
                      'Customer / End User Name',
                      'Tenant Name',
                      'Delivery PID',
                      'Product',
                      'Hosting',
                      'Cloud Platform',
                      'Users',
                      'Licenses',
                      'Operational Status',
                    ].map((label) => (
                      <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hostedTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-sf-surface-alt">
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.tid}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.accountName}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.tenantName ?? '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.deliveryPid ?? '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.productType}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.hostingType ?? '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.cloudPlatform ?? '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.users ?? '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.licenses ?? '-'}</td>
                      <td className="border border-sf-border px-1.5 py-1 text-sf-text">{tenant.operationalStatus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">
              No tenants are hosted in this system.
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-lg font-semibold text-sf-text">Application Configuration Summary</h3>
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
            <table className="w-max border-collapse text-sm leading-tight">
              <thead className="bg-sf-surface-alt text-left">
                <tr>
                  {APPLICATION_SUMMARY_FIELDS.map((column) => (
                    <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {APPLICATION_SUMMARY_FIELDS.map((column) => (
                    <td key={column.key} className="max-w-64 border border-sf-border px-1.5 py-1 text-sf-text">
                      {tenantSummaryValue(column.key, hostedTenants)}
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
              <div className="space-y-3">
                {ACCESS_DETAIL_FIELDS.map((field) => (
                  <div key={field.key}>{renderAccessDetailField(field)}</div>
                ))}
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
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt disabled:opacity-50" disabled={!isDirty} onClick={() => setDraft(cloneRecord(activeRecord))}>
          Revert
        </button>
        <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt" onClick={() => navigate(dashboardPath)}>
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={
          <span className="inline-flex items-center gap-2">
            <LargeStatusIcon status={textValue(readRecordValue(activeDraft, 'operationalStatus'))} />
            <span>{`${metadata.titleLabel} ${derivedValue(activeDraft, metadata.source === 'Production' ? 'sid' : 'machineId', projects, tenants)}`}</span>
          </span>
        }
        subtitle={metadata.sourceSheet}
        actions={renderActionButtons()}
      />

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
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Application Configuration"
        subtitle="Application and product configuration fields aligned with Opportunity tenant requirements."
        collapsed={collapsedSections.configuration}
        onToggle={() => toggleSection('configuration')}
      >
        <div className="space-y-2">
          <div className="overflow-x-auto rounded border border-sf-border bg-white">
              <table className="w-max border-collapse text-sm leading-tight">
                <thead className="bg-sf-surface-alt text-left">
                  <tr>
                    {APPLICATION_CONFIGURATION_COLUMNS.map((column) => (
                      <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                        <span>{column.label}</span>
                        <span className="block text-xs font-normal text-sf-text-muted">{column.group}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {APPLICATION_CONFIGURATION_COLUMNS.map((column) => (
                      <td key={column.key} className="min-w-36 border border-sf-border px-1.5 py-1 align-top">
                        {renderConfigurationCell(column.key, column.inputType)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="System tabs"
        subtitle="Tab structure is available now; detailed execution workflows remain out of scope for Phase D.1."
        collapsed={collapsedSections.tabs}
        onToggle={() => toggleSection('tabs')}
      >
        <div className="overflow-hidden rounded border border-sf-border bg-sf-surface">
          <div className="flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
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
                : `${metadata.tabs.find((tab) => tab.id === activeTab)?.label} workspace is reserved for later system execution phases.`}
          </div>
        </div>
      </CollapsibleSection>

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
    </div>
  )
}

export function ProductionSystemInventoryFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const inventoryRecords = useAppStore((state) => state.productionSystemInventory)
  const systems = useAppStore((state) => state.systems)
  const updateInventoryRecord = useAppStore((state) => state.updateProductionSystemInventoryItem)
  const updateAllocatedRecord = useAppStore((state) => state.updateSystem)
  const allocatedRecords = useMemo(() => systems.filter((system) => system.source !== 'Reused Internal Systems'), [systems])
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
  const allocatedRecords = useMemo(() => systems.filter((system) => system.source === 'Reused Internal Systems'), [systems])
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
