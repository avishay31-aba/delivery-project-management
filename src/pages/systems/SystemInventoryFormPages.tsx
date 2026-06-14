import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
import type { ProductionSystemInventoryItem, Project, ReusedInternalSystem, Tenant } from '@/data/seed.types'
import { useAppStore } from '@/store/useAppStore'

type InventoryRecord = ProductionSystemInventoryItem | ReusedInternalSystem
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

const OPERATIONAL_STATUS_STYLES: Record<string, string> = {
  On: 'bg-green-500',
  Off: 'bg-red-500',
  'Access blocked': 'bg-amber-500',
  'Service blocked': 'bg-orange-500',
  Deleted: 'bg-gray-500',
  Canceled: 'bg-purple-500',
}

const OPERATIONAL_STATUS_COLORS: Record<string, string> = {
  On: '#22c55e',
  Off: '#ef4444',
  'Access blocked': '#f59e0b',
  'Service blocked': '#f97316',
  Deleted: '#6b7280',
  Canceled: '#a855f7',
}

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
  if ('sid' in record) return tenants.filter((tenant) => tenant.systemId === record.id).length || record.tenantCount || 0
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
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-sm font-semibold" style={{ color: OPERATIONAL_STATUS_COLORS[value] ?? '#64748b' }}>
      <span className={['h-2.5 w-2.5 rounded-full', OPERATIONAL_STATUS_STYLES[value] ?? 'bg-slate-300'].join(' ')} aria-hidden="true" />
      {value || 'Not set'}
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
  const [collapsedSections, setCollapsedSections] = useState<Record<InventorySectionId, boolean>>(DEFAULT_COLLAPSED_SECTIONS)

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
  const isDirty = !valuesEqual(activeRecord, activeDraft)
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
          onChange={(event) => updateField(field.key, event.target.value)}
        >
          <option value="" />
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
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
        <select className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(field.key, event.target.value)}>
          <option value="" />
          {VPN_TYPE_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </FormField>
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
            <section className="space-y-2">
              <h3 className="text-lg font-semibold text-sf-text">Access Details</h3>
              <div className="flex flex-wrap items-start gap-3">
                {ACCESS_DETAIL_FIELDS.map(renderAccessDetailField)}
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
        title={`${metadata.titleLabel} ${derivedValue(activeDraft, metadata.source === 'Production' ? 'sid' : 'machineId', projects, tenants)}`}
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
              : `${metadata.tabs.find((tab) => tab.id === activeTab)?.label} workspace is reserved for later system execution phases.`}
          </div>
        </div>
      </CollapsibleSection>
    </div>
  )
}

export function ProductionSystemInventoryFormPage() {
  const { sid } = useParams<{ sid: string }>()
  const records = useAppStore((state) => state.productionSystemInventory)
  const record = records.find((system) => system.sid === sid)
  const updateRecord = useAppStore((state) => state.updateProductionSystemInventoryItem)

  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={productionSystemMetadata}
      onSave={updateRecord}
      dashboardPath="/systems/production-inventory"
      recordPath={(system) => `/systems/production-inventory/${system.sid}`}
    />
  )
}

export function ReusedInternalSystemFormPage() {
  const { mid } = useParams<{ mid: string }>()
  const records = useAppStore((state) => state.reusedInternalSystems)
  const record = records.find((system) => system.machineId === mid)
  const updateRecord = useAppStore((state) => state.updateReusedInternalSystem)

  return (
    <InventoryForm
      record={record}
      records={records}
      metadata={reusedInternalSystemMetadata}
      onSave={updateRecord}
      dashboardPath="/systems/reused-internal"
      recordPath={(system) => `/systems/reused-internal/${system.machineId}`}
    />
  )
}
