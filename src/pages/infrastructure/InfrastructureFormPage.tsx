import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActivityTimeline } from '@/components/activity'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { InfrastructureMaintenanceGrid } from '@/components/maintenance/InfrastructureMaintenanceGrid'
import { RemarksGrid } from '@/components/remarks'
import { PageHeader } from '@/components/record'
import { SystemDeliveryTable } from '@/components/systems'
import { WarrantyCollectionGrid } from '@/components/warranty/WarrantyCollectionGrid'
import {
  FormField,
  MaintenanceStatusPresentation,
  OperationalStatusIcon,
  OperationalStatusSelect,
  PlaceholderCard,
  SaveButtonLabel,
  StatusBadge,
  WarrantyStatusPresentation,
  formMessageClassName,
} from '@/components/ui'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import type { InfrastructureItem, InfrastructureItemProperties, InfrastructureTokenProperty, InfrastructureVmProperty, ReferenceDataRecord, ReferenceDataType, YesNo } from '@/data/seed.types'
import {
  ADD_NEW_REFERENCE_OPTION,
  INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE,
  INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE,
  INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE,
  INFRASTRUCTURE_MAINTENANCE_TASK_TYPE_REFERENCE_TYPE,
  INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS,
  INFRASTRUCTURE_OWNER_REFERENCE_TYPE,
  INFRASTRUCTURE_PROPERTY_SCOPES,
  INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE,
  INFRASTRUCTURE_TYPE_REFERENCE_TYPE,
  allSystemRecords,
  createInfrastructureDraft,
  infrastructureBillingMethods,
  infrastructureCategories,
  infrastructureDashboardRows,
  infrastructureLastMaintenanceDate,
  infrastructureMaintenanceStatusesFromTasks,
  infrastructureManufacturerPropertyScope,
  infrastructureManufacturersForType,
  infrastructureDomainLinkLabel,
  infrastructureOwners,
  infrastructurePropertyValues,
  infrastructureReferenceDataLabel,
  infrastructureTypesForCategory,
  infrastructureWarrantyAlert,
  infrastructureWarrantyStatusFromCollection,
  linkedDomainItemsForSsl,
  validateInfrastructureItemDraft,
} from '@/domain/infrastructure-item'
import { activityEventsForObject } from '@/domain/activity-log'
import { reserveBusinessId } from '@/domain/business-identity'
import { infrastructureItemReference } from '@/domain/business-reference'
import { REMARK_TYPE_OPTIONS, type RemarkRecord } from '@/domain/remarks'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import { useReactiveDraftSync } from '@/hooks/useReactiveDraftSync'
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning'
import { routeMode } from '@/utils/route-mode'
import { useAppStore } from '@/store/useAppStore'

type InfrastructureTab = 'properties' | 'linkedSystems' | 'documents' | 'activity'

const STANDARD_FIELD_WIDTH = 'w-56'
const WIDE_FIELD_WIDTH = 'w-72'
const ADD_NEW_PROMPT_LABEL = 'Add New...'

const TABS: Array<{ id: InfrastructureTab; label: string }> = [
  { id: 'properties', label: 'Properties' },
  { id: 'linkedSystems', label: 'Linked Systems' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity Log' },
]

const EMPTY_PROPERTIES: InfrastructureItemProperties = { disks: [], vms: [] }

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function text(value: unknown): string {
  return value == null ? '' : String(value)
}

function cloneInfrastructureItem(item: InfrastructureItem): InfrastructureItem {
  return JSON.parse(JSON.stringify(item)) as InfrastructureItem
}

function draftWithDefaultOwner(draft: InfrastructureItem, ownerOptions: Array<{ id: string; label: string }>): InfrastructureItem {
  if (draft.ownerRefId || ownerOptions.length === 0) return draft
  const defaultOwner = ownerOptions.find((owner) => owner.label === 'Penlink') ?? ownerOptions[0]
  return { ...draft, ownerRefId: defaultOwner.id, owner: defaultOwner.label as InfrastructureItem['owner'] }
}

function hasProperties(properties: InfrastructureItemProperties | undefined): boolean {
  if (!properties) return false
  const { disks = [], vms = [], ...rest } = properties
  return disks.length > 0 || vms.length > 0 || Object.values(rest).some((value) => value !== undefined && value !== null && value !== '')
}

function hasServerDependentProperties(properties: InfrastructureItemProperties | undefined): boolean {
  if (!properties) return false
  return Boolean(
    properties.hardwareTypeRefId ||
    properties.modelRefId ||
    properties.modelText ||
    properties.firmwareVersionRefId ||
    properties.firmwareLastUpdatedDate ||
    properties.esxiVersionRefId ||
    properties.esxiLastUpdatedDate ||
    properties.memoryTypeRefId ||
    properties.memorySizeRefId ||
    properties.memoryQuantity ||
    properties.cpuTypeRefId ||
    properties.cpuQuantity ||
    (properties.disks?.length ?? 0) > 0 ||
    (properties.vms?.length ?? 0) > 0,
  )
}

function parentScopeForFirewallModel(manufacturerLabel: string): string {
  return `firewall.model.${manufacturerLabel.trim().toLocaleLowerCase().replace(/\s+/g, '.')}`
}

function asPositiveInteger(value: string): number | null {
  if (!value.trim()) return null
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function clearServerDependentProperties(properties: InfrastructureItemProperties): InfrastructureItemProperties {
  return {
    ...properties,
    hardwareTypeRefId: '',
    modelRefId: '',
    modelText: '',
    firmwareVersionRefId: '',
    firmwareLastUpdatedDate: null,
    esxiVersionRefId: '',
    esxiLastUpdatedDate: null,
    memoryTypeRefId: '',
    memorySizeRefId: '',
    memoryQuantity: null,
    cpuTypeRefId: '',
    cpuQuantity: null,
    disks: [],
    vms: [],
  }
}

export function InfrastructureFormPage() {
  const { infrastructureId } = useParams<{ infrastructureId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = infrastructureId === 'new'
  const routeState = location.state as { returnTo?: string; mode?: string } | null
  const isViewMode = !isNew && routeMode(location) !== 'edit'
  const returnTo = routeState?.returnTo ?? '/infrastructure'

  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const referenceData = useAppStore((state) => state.referenceData)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const projects = useAppStore((state) => state.projects)
  const tenants = useAppStore((state) => state.tenants)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const createReferenceDataRecord = useAppStore((state) => state.createReferenceDataRecord)
  const createInfrastructureItem = useAppStore((state) => state.createInfrastructureItem)
  const updateInfrastructureItem = useAppStore((state) => state.updateInfrastructureItem)

  const ownerOptions = infrastructureOwners(referenceData)
  const savedItem = useMemo(
    () => infrastructureItems.find((item) => item.infrastructureId === infrastructureId || item.id === infrastructureId),
    [infrastructureId, infrastructureItems],
  )
  const newInfrastructureDraft = useMemo(() => {
    if (!isNew) return null
    return createInfrastructureDraft(undefined, reserveBusinessId('infrastructureItem', infrastructureItems.map((item) => item.infrastructureId)))
  }, [infrastructureItems, isNew])
  const initialDraft = useMemo(
    () => draftWithDefaultOwner(savedItem ? cloneInfrastructureItem(savedItem) : newInfrastructureDraft ?? createInfrastructureDraft(), ownerOptions),
    [newInfrastructureDraft, ownerOptions, savedItem],
  )
  const { value: draft, setValue: setDraft, reset: resetDraft, undo: undoDraft, canUndo } = useUndoHistory<InfrastructureItem>(initialDraft, {
    clone: cloneInfrastructureItem,
    isEqual: valuesEqual,
  })

  const [messages, setMessages] = useState<string[]>([])
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<InfrastructureTab>('properties')
  const [expandedSystemIds, setExpandedSystemIds] = useState<string[]>([])

  const allSystems = useMemo(() => allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), [productionSystemInventory, reusedInternalSystems, systems])
  const categoryOptions = infrastructureCategories(referenceData)
  const typeOptions = infrastructureTypesForCategory(referenceData, draft.categoryRefId)
  const selectedTypeLabel = infrastructureReferenceDataLabel(referenceData, draft.typeRefId)
  const selectedManufacturerLabel = infrastructureReferenceDataLabel(referenceData, draft.properties?.manufacturerRefId)
  const manufacturerOptions = infrastructureManufacturersForType(referenceData, draft.typeRefId)
  const billingMethodOptions = infrastructureBillingMethods(referenceData)
  const ownerPicklistOptions = infrastructureOwners(referenceData)
  const dashboardPreview = infrastructureDashboardRows([draft], referenceData, allSystems)[0]
  const linkedSystems = draft.linkedSystemIds
    .map((systemId) => allSystems.find((system) => system.id === systemId))
    .filter((system): system is NonNullable<typeof system> => Boolean(system))
  const isDirty = isNew || !savedItem || !valuesEqual(savedItem, draft)
  const formActivityEvents = savedItem ? activityEventsForObject(activityEvents, 'INFRASTRUCTURE_ITEM', savedItem.infrastructureId) : []

  useBeforeUnloadWarning(isDirty && !isViewMode)
  useReactiveDraftSync({
    source: draftWithDefaultOwner(savedItem ? cloneInfrastructureItem(savedItem) : newInfrastructureDraft ?? createInfrastructureDraft(), ownerOptions),
    draft,
    resetDraft,
    clone: cloneInfrastructureItem,
    isEqual: valuesEqual,
  })

  if (!isNew && !savedItem) {
    return <PlaceholderCard title="Infrastructure Item not found" description={`No Infrastructure Item exists for "${infrastructureId}".`} />
  }

  const invalidFields = new Set<string>()
  if (messages.includes('Category is required.')) invalidFields.add('categoryRefId')
  if (messages.includes('Type is required.') || messages.includes('Type must belong to the selected Category.')) invalidFields.add('typeRefId')
  if (messages.includes('Identifier is required.') || messages.includes('Identifier must be unique.')) invalidFields.add('identifier')
  if (messages.includes('Owner is required.') || messages.includes('Owner is invalid.')) invalidFields.add('owner')
  if (messages.some((message) => message.includes('Linked Domain') || message.includes('This Domain'))) invalidFields.add('linkedDomainInfrastructureItemId')

  function updateDraft(patch: Partial<InfrastructureItem>) {
    if (isViewMode) return
    const nextDraft = { ...draft, ...patch }
    setDraft(nextDraft)
    if (hasAttemptedSave) setMessages(validateInfrastructureItemDraft(nextDraft, infrastructureItems, referenceData))
  }

  function updateProperties(patch: Partial<InfrastructureItemProperties>) {
    updateDraft({ properties: { ...EMPTY_PROPERTIES, ...draft.properties, ...patch } })
  }

  function commitChildPatch(patch: Pick<InfrastructureItem, 'documents'> | Pick<InfrastructureItem, 'remarks'> | Pick<InfrastructureItem, 'warranties'> | Pick<InfrastructureItem, 'maintenanceTasks'>) {
    if (isViewMode) return
    if (isNew || !savedItem) {
      updateDraft(patch)
      return
    }

    const result = updateInfrastructureItem(savedItem.id, { ...savedItem, ...patch })
    if (!result.ok) {
      setMessages([result.message])
      return
    }

    const nextDraft = { ...draft, ...patch }
    setDraft(nextDraft)
    if (hasAttemptedSave) setMessages(validateInfrastructureItemDraft(nextDraft, infrastructureItems, referenceData))
  }

  function addReferenceData(referenceType: ReferenceDataType, label: string, parentId?: string): string | null {
    const nextLabel = window.prompt(`Add ${label}`)
    const trimmed = nextLabel?.trim()
    if (!trimmed) return null
    const result = createReferenceDataRecord(referenceType, trimmed, parentId ? { versionNumberId: parentId } : undefined)
    if (!result.ok || !result.record) {
      setMessages([result.message])
      return null
    }
    return result.record.id
  }

  function handleAddNewSelect(
    value: string,
    addLabel: string,
    referenceType: ReferenceDataType,
    parentId: string | undefined,
    onSelect: (value: string) => void,
  ) {
    if (value !== ADD_NEW_REFERENCE_OPTION) {
      onSelect(value)
      return
    }
    const newId = addReferenceData(referenceType, addLabel, parentId)
    if (newId) onSelect(newId)
  }

  function clearPropertiesWithConfirmation(): boolean {
    if (!hasProperties(draft.properties)) return true
    return window.confirm('Changing Item Type will clear incompatible Properties. Continue?')
  }

  function changeCategory(value: string) {
    if (draft.categoryRefId === value) return
    if (!clearPropertiesWithConfirmation()) return
    updateDraft({ categoryRefId: value, typeRefId: '', manufacturerRefId: '', model: '', properties: { ...EMPTY_PROPERTIES } })
  }

  function changeType(value: string) {
    if (draft.typeRefId === value) return
    if (!clearPropertiesWithConfirmation()) return
    updateDraft({ typeRefId: value, manufacturerRefId: '', model: '', properties: { ...EMPTY_PROPERTIES } })
  }

  function changeServerManufacturer(value: string) {
    const currentManufacturer = draft.properties?.manufacturerRefId ?? ''
    if (currentManufacturer === value) return
    if (hasServerDependentProperties(draft.properties) && !window.confirm('Changing Manufacturer will clear dependent Server/Storage Server Properties. Continue?')) return
    updateProperties({
      ...clearServerDependentProperties({ ...EMPTY_PROPERTIES, ...draft.properties }),
      manufacturerRefId: value,
    })
  }

  function save() {
    setHasAttemptedSave(true)
    const errors = validateInfrastructureItemDraft(draft, infrastructureItems, referenceData)
    if (errors.length > 0) {
      setMessages(errors)
      return
    }
    setIsSaving(true)
    const result = isNew ? createInfrastructureItem(draft) : updateInfrastructureItem(draft.id, draft)
    setIsSaving(false)
    if (!result.ok || !result.record) {
      setMessages([result.message])
      return
    }
    setHasAttemptedSave(false)
    resetDraft(cloneInfrastructureItem(result.record))
    setMessages([result.message])
    const routePath = infrastructureItemReference(result.record).routePath
    if (routePath) navigate(routePath, { replace: true, state: { mode: 'view', returnTo } })
  }

  function cancel() {
    if (isNew) {
      navigate(returnTo)
      return
    }
    resetDraft(savedItem ? cloneInfrastructureItem(savedItem) : createInfrastructureDraft())
    setHasAttemptedSave(false)
    setMessages([])
    navigate(`/infrastructure/${savedItem?.infrastructureId}`, { replace: true, state: { mode: 'view', returnTo } })
  }

  function fieldClass(key: string): string {
    return invalidFields.has(key) ? 'border-red-400 bg-red-50' : 'border-sf-border bg-white'
  }

  function renderTextInput(label: string, value: string | null | undefined, onChange: (value: string) => void, required = false, disabled = false) {
    return (
      <FormField label={label} required={required} controlWidthClassName={STANDARD_FIELD_WIDTH}>
        <input className={`h-9 w-full rounded border px-2 py-1 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted ${fieldClass(label)}`} value={value ?? ''} readOnly={isViewMode} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
      </FormField>
    )
  }

  function renderNumberInput(label: string, value: number | null | undefined, onChange: (value: number | null) => void, min = 0, disabled = false) {
    return (
      <FormField label={label} controlWidthClassName={STANDARD_FIELD_WIDTH}>
        <input className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" type="number" min={min} step={1} value={value ?? ''} readOnly={isViewMode} disabled={disabled} onChange={(event) => onChange(asPositiveInteger(event.target.value))} />
      </FormField>
    )
  }

  function renderDateInput(label: string, value: string | null | undefined, onChange: (value: string | null) => void, readOnly = isViewMode, disabled = false) {
    return (
      <FormField label={label} controlWidthClassName={STANDARD_FIELD_WIDTH}>
        <input className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" type="date" value={value ?? ''} readOnly={readOnly} disabled={disabled} onChange={(event) => onChange(event.target.value || null)} />
      </FormField>
    )
  }

  function renderSelect(
    label: string,
    value: string,
    options: Array<{ id: string; label: string }>,
    onChange: (value: string) => void,
    addLabel?: string,
    referenceType?: ReferenceDataType,
    parentId?: string,
    required = false,
    disabled = false,
  ) {
    return (
      <FormField label={label} required={required} controlWidthClassName={WIDE_FIELD_WIDTH}>
        <select
          className={`h-9 w-full rounded border px-2 py-1 pr-8 text-sm ${fieldClass(label)}`}
          value={value}
          disabled={isViewMode || disabled}
          onChange={(event) =>
            addLabel && referenceType
              ? handleAddNewSelect(event.target.value, addLabel, referenceType, parentId, onChange)
              : onChange(event.target.value)
          }
        >
          <option value=""></option>
          {options.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
          {addLabel && referenceType ? <option value={ADD_NEW_REFERENCE_OPTION}>{ADD_NEW_PROMPT_LABEL}</option> : null}
        </select>
      </FormField>
    )
  }

  function renderYesNo(label: string, value: YesNo | '', onChange: (value: YesNo) => void) {
    return (
      <FormField label={label} controlWidthClassName={STANDARD_FIELD_WIDTH}>
        <div className="flex h-9 items-center gap-4 text-sm">
          {(['YES', 'NO'] as YesNo[]).map((option) => (
            <label key={option} className="inline-flex items-center gap-1">
              <input type="radio" checked={value === option} disabled={isViewMode} onChange={() => onChange(option)} />
              {option === 'YES' ? 'Yes' : 'No'}
            </label>
          ))}
        </div>
      </FormField>
    )
  }

  function propertyOptions(scope: string): ReferenceDataRecord[] {
    return infrastructurePropertyValues(referenceData, scope)
  }

  function propertySelect(label: string, key: keyof InfrastructureItemProperties, scope: string, width = WIDE_FIELD_WIDTH, disabled = false) {
    return (
      <FormField label={label} controlWidthClassName={width}>
        <select
          className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
          value={text(draft.properties?.[key])}
          disabled={isViewMode || disabled}
          onChange={(event) => handleAddNewSelect(event.target.value, label, INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE, scope, (value) => updateProperties({ [key]: value }))}
        >
          <option value=""></option>
          {propertyOptions(scope).map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
          <option value={ADD_NEW_REFERENCE_OPTION}>{ADD_NEW_PROMPT_LABEL}</option>
        </select>
      </FormField>
    )
  }

  function renderHeader() {
    return (
      <section className="sf-card space-y-3 p-3">
        <h2 className="text-lg font-semibold text-sf-text">Header</h2>
        <div className="flex flex-wrap items-start gap-3">
          {renderSelect('Category', draft.categoryRefId, categoryOptions, changeCategory, 'Infrastructure Category', INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE, undefined, true)}
          {renderSelect('Item Type', draft.typeRefId, typeOptions, changeType, 'Infrastructure Type', INFRASTRUCTURE_TYPE_REFERENCE_TYPE, draft.categoryRefId, true, !draft.categoryRefId)}
          {renderTextInput('Identifier', draft.identifier, (value) => updateDraft({ identifier: value }), true)}
          <FormField label="Warranty Status" controlWidthClassName={WIDE_FIELD_WIDTH}>
            <div className="flex h-9 items-center gap-2 px-2 text-sm">
              <WarrantyStatusPresentation status={dashboardPreview?.warrantyStatus ?? infrastructureWarrantyStatusFromCollection(draft)} />
              {infrastructureWarrantyAlert(draft) ? <StatusBadge label={infrastructureWarrantyAlert(draft)} variant="warning" /> : null}
            </div>
          </FormField>
          <FormField label="Operational Status" required controlWidthClassName={WIDE_FIELD_WIDTH}>
            <OperationalStatusSelect
              value={draft.operationalStatus}
              options={INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS}
              disabled={isViewMode}
              onChange={(value) => updateDraft({ operationalStatus: value as InfrastructureItem['operationalStatus'] })}
            />
          </FormField>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderSelect('Item Owner', draft.ownerRefId ?? '', ownerPicklistOptions, (value) => {
            const owner = ownerPicklistOptions.find((record) => record.id === value)
            updateDraft({ ownerRefId: value, owner: (owner?.label ?? '') as InfrastructureItem['owner'] })
          }, 'Infrastructure Item Owner', INFRASTRUCTURE_OWNER_REFERENCE_TYPE, undefined, true)}
          {renderSelect('Billing Method', draft.billingMethodRefId, billingMethodOptions, (value) => updateDraft({ billingMethodRefId: value }), 'Infrastructure Billing Method', INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE)}
          <FormField label="Last Maintenance Date" controlWidthClassName={STANDARD_FIELD_WIDTH}>
            <div className="flex h-9 items-center px-2 text-sm text-sf-text"><DateTimeValue value={infrastructureLastMaintenanceDate(draft)} semanticType="date" /></div>
          </FormField>
          <FormField label="Maintenance Status" controlWidthClassName={STANDARD_FIELD_WIDTH}>
            <div className="flex h-9 items-center px-2 text-sm text-sf-text">
              <MaintenanceStatusPresentation status={infrastructureMaintenanceStatusesFromTasks(draft)} />
            </div>
          </FormField>
        </div>
      </section>
    )
  }

  function renderServerProperties() {
    const hasManufacturer = Boolean(draft.properties?.manufacturerRefId)
    const modelScope = infrastructureManufacturerPropertyScope(referenceData, draft.properties?.manufacturerRefId, 'model')
    const firmwareScope = infrastructureManufacturerPropertyScope(referenceData, draft.properties?.manufacturerRefId, 'firmwareVersion')
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          {renderSelect('Manufacturer', draft.properties?.manufacturerRefId ?? '', manufacturerOptions, changeServerManufacturer, 'Infrastructure Manufacturer', INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE, draft.typeRefId)}
          {propertySelect('Model', 'modelRefId', modelScope, WIDE_FIELD_WIDTH, !hasManufacturer)}
          {propertySelect('Rack Unit', 'hardwareTypeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.serverRackUnit, STANDARD_FIELD_WIDTH, !hasManufacturer)}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {propertySelect('Memory Type', 'memoryTypeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.serverMemoryType, STANDARD_FIELD_WIDTH, !hasManufacturer)}
          {propertySelect('Memory Size', 'memorySizeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.serverMemorySize, STANDARD_FIELD_WIDTH, !hasManufacturer)}
          {renderNumberInput('Memory Quantity', draft.properties?.memoryQuantity, (value) => updateProperties({ memoryQuantity: value }), 0, !hasManufacturer)}
          {propertySelect('CPU Type', 'cpuTypeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.serverCpuType, WIDE_FIELD_WIDTH, !hasManufacturer)}
          {renderNumberInput('CPU Quantity', draft.properties?.cpuQuantity, (value) => updateProperties({ cpuQuantity: value }), 0, !hasManufacturer)}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {propertySelect('Firmware Version', 'firmwareVersionRefId', firmwareScope, WIDE_FIELD_WIDTH, !hasManufacturer)}
          {renderDateInput('Last Updated', draft.properties?.firmwareLastUpdatedDate, (value) => updateProperties({ firmwareLastUpdatedDate: value }), isViewMode, !hasManufacturer)}
          {propertySelect('ESXi Version', 'esxiVersionRefId', INFRASTRUCTURE_PROPERTY_SCOPES.serverEsxiVersion, WIDE_FIELD_WIDTH, !hasManufacturer)}
          {renderDateInput('Last Updated', draft.properties?.esxiLastUpdatedDate, (value) => updateProperties({ esxiLastUpdatedDate: value }), isViewMode, !hasManufacturer)}
        </div>
        {renderDiskGroups(!hasManufacturer)}
        {renderVmGroups(!hasManufacturer)}
      </div>
    )
  }

  function renderDiskGroups(disabled = false) {
    const disks = draft.properties?.disks ?? []
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-sf-text">Disks</h3>
          {!isViewMode ? <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" disabled={disabled} onClick={() => updateProperties({ disks: [...disks, { id: `disk-${crypto.randomUUID()}`, diskTypeRefId: '', quantity: null }] })}>+ Add Disk</button> : null}
        </div>
        {disks.map((disk, index) => (
          <div key={disk.id} className="flex flex-wrap items-end gap-3 rounded border border-sf-border bg-white p-2">
            <span className="pb-2 text-sm font-semibold text-sf-text-muted">Disk {index + 1}</span>
            <FormField label="Disk Type" controlWidthClassName={WIDE_FIELD_WIDTH}>
              <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" value={disk.diskTypeRefId} disabled={isViewMode || disabled} onChange={(event) => handleAddNewSelect(event.target.value, 'Disk Type', INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE, INFRASTRUCTURE_PROPERTY_SCOPES.serverDiskType, (value) => updateProperties({ disks: disks.map((candidate) => candidate.id === disk.id ? { ...candidate, diskTypeRefId: value } : candidate) }))}>
                <option value=""></option>
                {propertyOptions(INFRASTRUCTURE_PROPERTY_SCOPES.serverDiskType).map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
                <option value={ADD_NEW_REFERENCE_OPTION}>{ADD_NEW_PROMPT_LABEL}</option>
              </select>
            </FormField>
            {renderNumberInput('Quantity', disk.quantity, (value) => updateProperties({ disks: disks.map((candidate) => candidate.id === disk.id ? { ...candidate, quantity: value } : candidate) }), 1, disabled)}
            {!isViewMode ? <button type="button" className="mb-0.5 rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700" onClick={() => updateProperties({ disks: disks.filter((candidate) => candidate.id !== disk.id) })}>Remove</button> : null}
          </div>
        ))}
        {disks.length === 0 ? <div className="rounded border border-dashed border-sf-border bg-white p-3 text-sm text-sf-text-muted">No disks configured.</div> : null}
      </div>
    )
  }

  function renderVmGroups(disabled = false) {
    const vms = draft.properties?.vms ?? []
    const updateVm = (id: string, patch: Partial<InfrastructureVmProperty>) => {
      updateProperties({ vms: vms.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate) })
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-sf-text">Virtual Machines</h3>
          {!isViewMode ? <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" disabled={disabled} onClick={() => updateProperties({ vms: [...vms, { id: `vm-${crypto.randomUUID()}`, vmTypeRefId: '', diskTypeRefId: '', diskSizeRefId: '', memoryTypeRefId: '', memorySizeRefId: '', osVersionRefId: '', rdmName: '' }] })}>+ Add VM</button> : null}
        </div>
        {vms.map((vm, index) => (
          <div key={vm.id} className="flex flex-wrap items-end gap-3 rounded border border-sf-border bg-white p-2">
            <span className="pb-2 text-sm font-semibold text-sf-text-muted">VM {index + 1}</span>
            {renderVmSelect('VM Type', vm.vmTypeRefId, INFRASTRUCTURE_PROPERTY_SCOPES.vmType, disabled, (value) => updateVm(vm.id, { vmTypeRefId: value }))}
            {renderVmSelect('Disk Type', vm.diskTypeRefId, INFRASTRUCTURE_PROPERTY_SCOPES.vmDiskType, disabled, (value) => updateVm(vm.id, { diskTypeRefId: value }))}
            {renderVmSelect('Disk Size', vm.diskSizeRefId, INFRASTRUCTURE_PROPERTY_SCOPES.vmDiskSize, disabled, (value) => updateVm(vm.id, { diskSizeRefId: value }))}
            {renderVmSelect('Memory Type', vm.memoryTypeRefId, INFRASTRUCTURE_PROPERTY_SCOPES.vmMemoryType, disabled, (value) => updateVm(vm.id, { memoryTypeRefId: value }))}
            {renderVmSelect('Memory Size', vm.memorySizeRefId, INFRASTRUCTURE_PROPERTY_SCOPES.vmMemorySize, disabled, (value) => updateVm(vm.id, { memorySizeRefId: value }))}
            {renderVmSelect('OS Version', vm.osVersionRefId, INFRASTRUCTURE_PROPERTY_SCOPES.vmOsVersion, disabled, (value) => updateVm(vm.id, { osVersionRefId: value }))}
            {renderTextInput('RDM Name', vm.rdmName, (value) => updateVm(vm.id, { rdmName: value }), false, disabled)}
            {!isViewMode ? <button type="button" className="mb-0.5 rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700" onClick={() => updateProperties({ vms: vms.filter((candidate) => candidate.id !== vm.id) })}>Remove</button> : null}
          </div>
        ))}
        {vms.length === 0 ? <div className="rounded border border-dashed border-sf-border bg-white p-3 text-sm text-sf-text-muted">No virtual machines configured.</div> : null}
      </div>
    )
  }

  function renderVmSelect(label: string, value: string, scope: string, disabled: boolean, onChange: (value: string) => void) {
    return (
      <FormField label={label} controlWidthClassName={STANDARD_FIELD_WIDTH}>
        <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" value={value} disabled={isViewMode || disabled} onChange={(event) => handleAddNewSelect(event.target.value, label, INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE, scope, onChange)}>
          <option value=""></option>
          {propertyOptions(scope).map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
          <option value={ADD_NEW_REFERENCE_OPTION}>{ADD_NEW_PROMPT_LABEL}</option>
        </select>
      </FormField>
    )
  }

  function renderFirewallProperties() {
    const modelScope = selectedManufacturerLabel ? parentScopeForFirewallModel(selectedManufacturerLabel) : INFRASTRUCTURE_PROPERTY_SCOPES.firewallModelFortiGate
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          {renderSelect('Manufacturer', draft.properties?.manufacturerRefId ?? '', manufacturerOptions, (value) => updateProperties({ manufacturerRefId: value, modelRefId: '', modelText: '' }), 'Infrastructure Manufacturer', INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE, draft.typeRefId)}
          {selectedManufacturerLabel === 'FortiGate' ? renderYesNo('FortiManager', draft.properties?.fortiManager ?? '', (value) => updateProperties({ fortiManager: value })) : null}
          {propertySelect('Model', 'modelRefId', modelScope)}
          {propertySelect('Firmware Version', 'firmwareVersionRefId', INFRASTRUCTURE_PROPERTY_SCOPES.firewallFirmwareVersion)}
          {renderDateInput('Last Updated', draft.properties?.firmwareLastUpdatedDate, (value) => updateProperties({ firmwareLastUpdatedDate: value }))}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {renderYesNo('Rackmount', draft.properties?.rackmount ?? '', (value) => updateProperties({ rackmount: value }))}
        </div>
        {renderTokenGroups()}
      </div>
    )
  }

  function renderTokenGroups() {
    const tokens = draft.properties?.tokens ?? []
    const updateToken = (id: string, patch: Partial<InfrastructureTokenProperty>) => {
      updateProperties({ tokens: tokens.map((candidate) => candidate.id === id ? { ...candidate, ...patch } : candidate) })
    }
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-sf-text">Tokens</h3>
          {!isViewMode ? <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={() => updateProperties({ tokens: [...tokens, { id: `token-${crypto.randomUUID()}`, tokenTypeRefId: '', serialNumber: '', licenseEndDate: null }] })}>+ Add Token</button> : null}
        </div>
        {tokens.map((token, index) => (
          <div key={token.id} className="flex flex-wrap items-end gap-3 rounded border border-sf-border bg-white p-2">
            <span className="pb-2 text-sm font-semibold text-sf-text-muted">Token {index + 1}</span>
            <FormField label="Type" controlWidthClassName={STANDARD_FIELD_WIDTH}>
              <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted" value={token.tokenTypeRefId} disabled={isViewMode} onChange={(event) => handleAddNewSelect(event.target.value, 'Token Type', INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE, INFRASTRUCTURE_PROPERTY_SCOPES.firewallTokenType, (value) => updateToken(token.id, { tokenTypeRefId: value }))}>
                <option value=""></option>
                {propertyOptions(INFRASTRUCTURE_PROPERTY_SCOPES.firewallTokenType).map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
                <option value={ADD_NEW_REFERENCE_OPTION}>{ADD_NEW_PROMPT_LABEL}</option>
              </select>
            </FormField>
            {renderTextInput('S/N', token.serialNumber, (value) => updateToken(token.id, { serialNumber: value }))}
            {renderDateInput('License End Date', token.licenseEndDate, (value) => updateToken(token.id, { licenseEndDate: value }))}
            {!isViewMode ? <button type="button" className="mb-0.5 rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-semibold text-red-700" onClick={() => updateProperties({ tokens: tokens.filter((candidate) => candidate.id !== token.id) })}>Remove</button> : null}
          </div>
        ))}
        {tokens.length === 0 ? <div className="rounded border border-dashed border-sf-border bg-white p-3 text-sm text-sf-text-muted">No tokens configured.</div> : null}
      </div>
    )
  }

  function renderDomainProperties() {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          {propertySelect('Domain Provider', 'domainProviderRefId', INFRASTRUCTURE_PROPERTY_SCOPES.domainProvider)}
          {propertySelect('Domain Type', 'domainTypeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.domainType)}
          {renderTextInput('Domain Name', draft.properties?.domainName, (value) => updateProperties({ domainName: value }))}
        </div>
      </div>
    )
  }

  function renderSslProperties() {
    const domainOptions = linkedDomainItemsForSsl(infrastructureItems, referenceData, draft.id, draft.properties?.linkedDomainInfrastructureItemId)
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start gap-3">
          {propertySelect('SSL Provider', 'sslProviderRefId', INFRASTRUCTURE_PROPERTY_SCOPES.sslProvider)}
          {propertySelect('SSL Type', 'sslTypeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.sslType)}
          {propertySelect('SSL Version', 'sslVersionRefId', INFRASTRUCTURE_PROPERTY_SCOPES.sslVersion)}
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <FormField label="Linked Domain" controlWidthClassName={WIDE_FIELD_WIDTH}>
            <select
              className={[
                'h-9 w-full rounded border px-2 py-1 pr-8 text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted',
                invalidFields.has('linkedDomainInfrastructureItemId') ? 'border-red-500' : 'border-sf-border',
              ].join(' ')}
              value={draft.properties?.linkedDomainInfrastructureItemId ?? ''}
              disabled={isViewMode}
              onChange={(event) => updateProperties({ linkedDomainInfrastructureItemId: event.target.value })}
            >
              <option value=""></option>
              {domainOptions.map((item) => <option key={item.id} value={item.id}>{infrastructureDomainLinkLabel(item)}</option>)}
            </select>
          </FormField>
        </div>
      </div>
    )
  }

  function renderLaptopProperties() {
    const modelScope = infrastructureManufacturerPropertyScope(referenceData, draft.properties?.manufacturerRefId, 'model')
    const hasManufacturer = Boolean(draft.properties?.manufacturerRefId)
    return (
      <div className="flex flex-wrap items-start gap-3">
        {renderSelect('Manufacturer', draft.properties?.manufacturerRefId ?? '', manufacturerOptions, (value) => updateProperties({ manufacturerRefId: value, modelRefId: '', modelText: '' }), 'Infrastructure Manufacturer', INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE, draft.typeRefId)}
        {propertySelect('Model', 'modelRefId', modelScope, WIDE_FIELD_WIDTH, !hasManufacturer)}
      </div>
    )
  }

  function renderVpnProperties() {
    return (
      <div className="flex flex-wrap items-start gap-3">
        {propertySelect('Type', 'vpnTypeRefId', INFRASTRUCTURE_PROPERTY_SCOPES.vpnType, STANDARD_FIELD_WIDTH)}
        {renderNumberInput('Number of Licenses', draft.properties?.vpnLicenseCount, (value) => updateProperties({ vpnLicenseCount: value }))}
      </div>
    )
  }

  function renderPropertiesTab() {
    if (!selectedTypeLabel) return <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">Select an Item Type to configure Properties.</div>
    if (selectedTypeLabel === 'Server' || selectedTypeLabel === 'Storage Server') return renderServerProperties()
    if (selectedTypeLabel === 'Firewall') return renderFirewallProperties()
    if (selectedTypeLabel === 'Domain') return renderDomainProperties()
    if (selectedTypeLabel === 'SSL') return renderSslProperties()
    if (selectedTypeLabel === 'Laptop') return renderLaptopProperties()
    if (selectedTypeLabel === 'Compute/Host') return renderVmGroups(false)
    if (selectedTypeLabel === 'VPN') return renderVpnProperties()
    return <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">No Properties are configured for this Item Type.</div>
  }

  function renderLinkedSystemsTab() {
    return (
      <SystemDeliveryTable
        systems={linkedSystems}
        tenants={tenants}
        projects={projects}
        emptyText="No Systems are linked to this Infrastructure Item."
        expandedSystemIds={expandedSystemIds}
        onToggleDetails={(systemId) => setExpandedSystemIds((current) => (current.includes(systemId) ? current.filter((id) => id !== systemId) : [...current, systemId]))}
        renderOperationalStatus={(status) => (
          <span className="inline-flex items-center gap-1">
            <OperationalStatusIcon status={status} className="h-5 w-5" />
            {status || '-'}
          </span>
        )}
      />
    )
  }

  function renderTabs() {
    return (
      <section className="sf-card space-y-3 p-3">
        <div className="flex flex-wrap border-b border-sf-border bg-sf-surface-alt">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={['sf-view-mode-allow border-b-2 px-4 py-2 text-sm font-semibold', activeTab === tab.id ? 'border-sf-brand bg-white text-sf-text' : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text'].join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" aria-label={TABS.find((tab) => tab.id === activeTab)?.label}>
          {activeTab === 'properties' ? renderPropertiesTab() : null}
          {activeTab === 'linkedSystems' ? renderLinkedSystemsTab() : null}
          {activeTab === 'documents' ? <DocumentsPanel title="Documents" documents={draft.documents ?? []} emptyText="No Documents are attached to this Infrastructure Item." onChange={(documents) => commitChildPatch({ documents })} readOnly={isViewMode} /> : null}
          {activeTab === 'activity' ? <ActivityTimeline events={formActivityEvents} emptyText="No activity has been recorded for this Infrastructure Item." /> : null}
        </div>
      </section>
    )
  }

  const title = draft.infrastructureId ? (
    <span className="inline-flex flex-wrap items-center gap-2">
      <OperationalStatusIcon status={draft.operationalStatus} className="h-7 w-7" />
      <span>{`Infrastructure Item ${draft.infrastructureId}`}</span>
    </span>
  ) : (
    'New Infrastructure Item'
  )

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col">
      <PageHeader
        title={title}
        subtitle="Infrastructure Item"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isViewMode && !isNew ? <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white" onClick={() => navigate(location.pathname, { replace: true, state: { mode: 'edit', returnTo } })}>Edit</button> : null}
            {!isViewMode ? (
              <>
                <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50" disabled={!isDirty || isSaving} onClick={save}>
                  <SaveButtonLabel saving={isSaving} />
                </button>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" disabled={!canUndo} onClick={undoDraft}>Undo</button>
                <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={cancel}>Cancel</button>
              </>
            ) : null}
          </div>
        }
      />

      <div className={['sf-form-content-scroll min-h-0 flex-1 space-y-4 pb-2 pr-1', isViewMode ? 'sf-view-mode' : ''].filter(Boolean).join(' ')}>
        {messages.length > 0 ? <div className={formMessageClassName(messages)}>{messages.map((message) => <div key={message}>{message}</div>)}</div> : null}
        {renderHeader()}
        {renderTabs()}
        <section className="sf-card space-y-3 p-3">
          <InfrastructureMaintenanceGrid
            tasks={draft.maintenanceTasks ?? []}
            onChange={(maintenanceTasks) => commitChildPatch({ maintenanceTasks })}
            referenceData={referenceData}
            onAddTaskType={(label) => createReferenceDataRecord(INFRASTRUCTURE_MAINTENANCE_TASK_TYPE_REFERENCE_TYPE, label)}
            readOnly={isViewMode}
          />
        </section>
        <section className="sf-card space-y-3 p-3">
          <WarrantyCollectionGrid
            warranties={draft.warranties ?? []}
            onChange={(warranties) => commitChildPatch({ warranties })}
            readOnly={isViewMode}
          />
        </section>
        <section className="sf-card space-y-3 p-3">
          <RemarksGrid
            remarks={(draft.remarks ?? []) as RemarkRecord[]}
            onChange={(remarks) => commitChildPatch({ remarks })}
            typeOptions={[...REMARK_TYPE_OPTIONS, 'Add new...']}
            readOnly={isViewMode}
          />
        </section>
      </div>
    </div>
  )
}
