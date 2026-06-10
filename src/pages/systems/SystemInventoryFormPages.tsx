import { type ReactNode, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { PageHeader } from '@/components/record'
import { FormField, PlaceholderCard } from '@/components/ui'
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

const DEFAULT_COLLAPSED_SECTIONS: Record<InventorySectionId, boolean> = {
  header: false,
  configuration: false,
  tabs: false,
}

const SYSTEM_CONFIGURATION_COLUMNS = requirementAColumns.slice(3)
const PICKLIST_OPTIONS: Record<string, string[]> = {
  hostingType: ['SaaS', 'On premise', 'Hybrid'],
  cloudPlatform: ['Azure', 'AWS', 'GCP', 'Local', "Customer's VPC"],
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
  Off: 'bg-slate-400',
  'Access blocked': 'bg-amber-500',
  'Service blocked': 'bg-orange-500',
  Deleted: 'bg-red-500',
  Canceled: 'bg-purple-500',
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

function OperationalStatusIndicator({ value }: { value: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-sf-text-muted">
      <span className={`h-2.5 w-2.5 rounded-full ${OPERATIONAL_STATUS_STYLES[value] ?? 'bg-slate-300'}`} aria-hidden="true" />
      {value || 'Not set'}
    </span>
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
      const nextValue = key === 'productType' ? value : value
      const next = { ...current, [key]: nextValue }
      if (key === 'productType') {
        return { ...next, logo: PRODUCT_LOGOS[String(value)] ?? 'SYS' } as T
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

    if (url.includes(' ')) {
      invalidFields.add('url')
      nextMessages.push('URL cannot contain spaces.')
    }

    return nextMessages
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

    onSave(activeDraft.id, activeDraft as Partial<T>)
    setMessages(['System inventory record saved.'])
    setSaveMenuOpen(false)
    if (!stayOnPage) {
      navigate(dashboardPath)
      return
    }
    navigate(recordPath(activeDraft), { replace: true })
  }

  function renderHeaderField(field: SystemInventoryHeaderField) {
    const value = derivedValue(activeDraft, field.key, projects, tenants)
    const isChanged = fieldChanged(field.key)
    const isInvalid = invalidFields.has(field.key) && messages.length > 0
    const width = field.key === 'alerts' || field.key === 'timeGroupAlert' || field.key === 'linkedProjects' ? 'w-80' : 'w-48'

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
      return (
        <FormField key={field.key} label={field.label} controlWidthClassName={width}>
          <div className="space-y-1">
            <select className={fieldClassName(isChanged, isInvalid)} value={value} onChange={(event) => updateField(field.key, event.target.value)}>
              {(field.options ?? []).map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            {field.key === 'operationalStatus' ? <OperationalStatusIndicator value={value} /> : null}
          </div>
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

    if (inputType === 'picklist') {
      return (
        <select className={fieldClassName(isChanged)} value={value} onChange={(event) => updateField(key, event.target.value)}>
          <option value="" />
          {(PICKLIST_OPTIONS[key] ?? []).map((option) => (
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
        title="System Configuration"
        subtitle="Uses the same configuration field structure as Opportunity tenant requirements from Hosting onward."
        collapsed={collapsedSections.configuration}
        onToggle={() => toggleSection('configuration')}
      >
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {SYSTEM_CONFIGURATION_COLUMNS.map((column) => (
                  <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-bottom text-sm font-semibold text-sf-text">
                    <span>{column.label}</span>
                    <span className="block text-xs font-normal text-sf-text-muted">{column.group}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {SYSTEM_CONFIGURATION_COLUMNS.map((column) => (
                  <td key={column.key} className="min-w-36 border border-sf-border px-1.5 py-1 align-top">
                    {renderConfigurationCell(column.key, column.inputType)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
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
            {metadata.tabs.find((tab) => tab.id === activeTab)?.label} workspace is reserved for later system execution phases.
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
