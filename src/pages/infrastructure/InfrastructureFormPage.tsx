import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActivityTimeline } from '@/components/activity'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { RemarksGrid } from '@/components/remarks'
import { PageHeader } from '@/components/record'
import {
  BusinessObjectLink,
  FormField,
  OperationalStatusIcon,
  PlaceholderCard,
  RichTextContent,
  RichTextEditor,
  SaveButtonLabel,
  StatusBadge,
  WarrantyStatusPresentation,
  formMessageClassName,
} from '@/components/ui'
import type { InfrastructureItem, ReferenceDataType } from '@/data/seed.types'
import {
  INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE,
  INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE,
  INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE,
  INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS,
  INFRASTRUCTURE_OWNER_REFERENCE_TYPE,
  INFRASTRUCTURE_TYPE_REFERENCE_TYPE,
  INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE,
  allSystemRecords,
  createInfrastructureDraft,
  infrastructureBillingMethods,
  infrastructureCategories,
  infrastructureDashboardRows,
  infrastructureManufacturersForType,
  infrastructureOwners,
  infrastructureTypesForCategory,
  infrastructureWarrantyAlert,
  infrastructureWarrantyStatus,
  infrastructureWarrantyTypes,
  validateInfrastructureItemDraft,
} from '@/domain/infrastructure-item'
import { activityEventsForObject } from '@/domain/activity-log'
import { infrastructureItemReference, systemBusinessId, systemReference } from '@/domain/business-reference'
import { REMARK_TYPE_OPTIONS, type RemarkRecord } from '@/domain/remarks'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import { useReactiveDraftSync } from '@/hooks/useReactiveDraftSync'
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning'
import { isRouteViewMode } from '@/utils/route-mode'
import { useAppStore } from '@/store/useAppStore'

type InfrastructureTab = 'linkedSystems' | 'documents' | 'activity'

const TABS: Array<{ id: InfrastructureTab; label: string }> = [
  { id: 'linkedSystems', label: 'Linked Systems' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity Log' },
]

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

export function InfrastructureFormPage() {
  const { infrastructureId } = useParams<{ infrastructureId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = infrastructureId === 'new'
  const routeState = location.state as { returnTo?: string; mode?: string } | null
  const isViewMode = !isNew && (isRouteViewMode(location) || routeState?.mode !== 'edit')
  const returnTo = routeState?.returnTo ?? '/infrastructure'

  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const referenceData = useAppStore((state) => state.referenceData)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
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
  const initialDraft = useMemo(() => draftWithDefaultOwner(savedItem ? cloneInfrastructureItem(savedItem) : createInfrastructureDraft(), ownerOptions), [ownerOptions, savedItem])
  const { value: draft, setValue: setDraft, reset: resetDraft, undo: undoDraft, canUndo } = useUndoHistory<InfrastructureItem>(initialDraft, {
    clone: cloneInfrastructureItem,
    isEqual: valuesEqual,
  })

  const [messages, setMessages] = useState<string[]>([])
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<InfrastructureTab>('linkedSystems')

  const allSystems = useMemo(() => allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), [productionSystemInventory, reusedInternalSystems, systems])
  const categoryOptions = infrastructureCategories(referenceData)
  const typeOptions = infrastructureTypesForCategory(referenceData, draft.categoryRefId)
  const manufacturerOptions = infrastructureManufacturersForType(referenceData, draft.typeRefId)
  const billingMethodOptions = infrastructureBillingMethods(referenceData)
  const warrantyTypeOptions = infrastructureWarrantyTypes(referenceData)
  const dashboardPreview = infrastructureDashboardRows([draft], referenceData, allSystems)[0]
  const linkedSystems = draft.linkedSystemIds
    .map((systemId) => allSystems.find((system) => system.id === systemId))
    .filter((system): system is NonNullable<typeof system> => Boolean(system))
  const isDirty = isNew || !savedItem || !valuesEqual(savedItem, draft)
  const formActivityEvents = savedItem ? activityEventsForObject(activityEvents, 'INFRASTRUCTURE_ITEM', savedItem.infrastructureId) : []

  useBeforeUnloadWarning(isDirty && !isViewMode)
  useReactiveDraftSync({
    source: draftWithDefaultOwner(savedItem ? cloneInfrastructureItem(savedItem) : createInfrastructureDraft(), ownerOptions),
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
  if (messages.includes('Manufacturer is required.') || messages.includes('Manufacturer must belong to the selected Type.')) invalidFields.add('manufacturerRefId')
  if (messages.includes('Owner is required.') || messages.includes('Owner is invalid.')) invalidFields.add('owner')
  if (messages.includes('Contact Person Email must be valid.')) invalidFields.add('warrantyContact.email')

  function updateDraft(patch: Partial<InfrastructureItem>) {
    if (isViewMode) return
    const nextDraft = { ...draft, ...patch }
    setDraft(nextDraft)
    if (hasAttemptedSave) setMessages(validateInfrastructureItemDraft(nextDraft, infrastructureItems, referenceData))
  }

  function addReferenceData(referenceType: ReferenceDataType, parentId?: string) {
    const label = window.prompt(`Add ${referenceType.toLocaleLowerCase().replaceAll('_', ' ')}`)
    const trimmed = label?.trim()
    if (!trimmed) return
    const result = createReferenceDataRecord(referenceType, trimmed, parentId ? { versionNumberId: parentId } : undefined)
    if (!result.ok || !result.record) {
      setMessages([result.message])
      return
    }
    if (referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE) updateDraft({ categoryRefId: result.record.id, typeRefId: '', manufacturerRefId: '' })
    if (referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE) updateDraft({ typeRefId: result.record.id, manufacturerRefId: '' })
    if (referenceType === INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE) updateDraft({ manufacturerRefId: result.record.id })
    if (referenceType === INFRASTRUCTURE_OWNER_REFERENCE_TYPE) updateDraft({ ownerRefId: result.record.id, owner: result.record.label as InfrastructureItem['owner'] })
    if (referenceType === INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE) updateDraft({ billingMethodRefId: result.record.id })
    if (referenceType === INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE) updateDraft({ warrantyTypeRefId: result.record.id })
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
    setMessages([])
    navigate(`/infrastructure/${savedItem?.infrastructureId}`, { replace: true, state: { mode: 'view', returnTo } })
  }

  function fieldClass(key: string): string {
    return invalidFields.has(key) ? 'border-red-400 bg-red-50' : 'border-sf-border bg-white'
  }

  function renderTextInput(label: string, key: keyof InfrastructureItem, required = false) {
    return (
      <FormField label={label} required={required}>
        <input
          className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass(String(key))}`}
          value={text(draft[key])}
          readOnly={isViewMode}
          onChange={(event) => updateDraft({ [key]: event.target.value } as Partial<InfrastructureItem>)}
        />
      </FormField>
    )
  }

  function renderReferenceSelect(label: string, key: keyof InfrastructureItem, options: Array<{ id: string; label: string }>, referenceType: ReferenceDataType, required = false, parentId?: string, disabled = false) {
    return (
      <FormField label={label} required={required}>
        <div className="flex gap-2">
          <select
            className={`h-9 min-w-0 flex-1 rounded border px-2 py-1 text-sm ${fieldClass(String(key))}`}
            value={text(draft[key])}
            disabled={isViewMode || disabled}
            onChange={(event) => updateDraft({ [key]: event.target.value } as Partial<InfrastructureItem>)}
          >
            <option value="">Select {label}</option>
            {options.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
          </select>
          {!isViewMode ? (
            <button type="button" className="rounded border border-sf-border bg-white px-2 text-sm disabled:opacity-50" disabled={disabled} onClick={() => addReferenceData(referenceType, parentId)}>
              Add New
            </button>
          ) : null}
        </div>
      </FormField>
    )
  }

  function renderOwnerSelect() {
    return (
      <FormField label="Item Owner" required>
        <div className="flex gap-2">
          <select
            className={`h-9 min-w-0 flex-1 rounded border px-2 py-1 text-sm ${fieldClass('owner')}`}
            value={draft.ownerRefId ?? ''}
            disabled={isViewMode}
            onChange={(event) => {
              const owner = ownerOptions.find((record) => record.id === event.target.value)
              updateDraft({ ownerRefId: event.target.value, owner: (owner?.label ?? '') as InfrastructureItem['owner'] })
            }}
          >
            <option value="">Select Item Owner</option>
            {ownerOptions.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
          </select>
          {!isViewMode ? <button type="button" className="rounded border border-sf-border bg-white px-2 text-sm" onClick={() => addReferenceData(INFRASTRUCTURE_OWNER_REFERENCE_TYPE)}>Add New</button> : null}
        </div>
      </FormField>
    )
  }

  function renderLinkedSystemsTab() {
    return (
      <div className="sf-scroll-x rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {['SID', 'MID', 'Product', 'Purpose', 'Operational Status', 'URL', 'Time Group', 'Used In Region', 'Tenants'].map((label) => (
                <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 font-semibold text-sf-text">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linkedSystems.map((system) => (
              <tr key={system.id} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">
                  <BusinessObjectLink reference={systemReference(system)}>{systemBusinessId(system)}</BusinessObjectLink>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{'machineId' in system && system.machineId ? <BusinessObjectLink reference={systemReference(system)}>{system.machineId}</BusinessObjectLink> : '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{system.productType || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{'purpose' in system ? system.purpose : '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{text((system as unknown as Record<string, unknown>).operationalStatus ?? (system as unknown as Record<string, unknown>).status) || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{system.url || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{system.timeGroup || '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{'region' in system ? system.region ?? '-' : 'usedInRegion' in system ? system.usedInRegion ?? '-' : '-'}</td>
                <td className="whitespace-nowrap border border-sf-border px-1.5 py-1">{tenants.filter((tenant) => tenant.systemId === system.id || tenant.hostedSystemId === system.id).length}</td>
              </tr>
            ))}
            {linkedSystems.length === 0 ? (
              <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={9}>No Systems are linked to this Infrastructure Item.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    )
  }

  const title = (
    <span className="inline-flex flex-wrap items-center gap-3">
      <span>{draft.infrastructureId || 'New Infrastructure Item'}</span>
      {!isNew || draft.operationalStatus ? (
        <span className="inline-flex items-center gap-1 text-base font-medium">
          <OperationalStatusIcon status={draft.operationalStatus} className="h-6 w-6" />
          {draft.operationalStatus}
        </span>
      ) : null}
    </span>
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

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Item Details</h2>
          <div className="grid gap-3 lg:grid-cols-3 xl:grid-cols-4">
            {renderReferenceSelect('Category', 'categoryRefId', categoryOptions, INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE, true)}
            {renderReferenceSelect('Type', 'typeRefId', typeOptions, INFRASTRUCTURE_TYPE_REFERENCE_TYPE, true, draft.categoryRefId, !draft.categoryRefId)}
            {renderTextInput('Identifier', 'identifier', true)}
            {renderReferenceSelect('Manufacturer', 'manufacturerRefId', manufacturerOptions, INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE, true, draft.typeRefId, !draft.typeRefId)}
            {renderTextInput('Model', 'model')}
            <FormField label="Last Updated">
              <input type="date" readOnly={isViewMode} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.lastUpdatedDate ?? ''} onChange={(event) => updateDraft({ lastUpdatedDate: event.target.value || null })} />
            </FormField>
            <FormField label="Warranty Status">
              <div className="flex h-9 items-center gap-2 px-2 text-sm">
                <WarrantyStatusPresentation status={dashboardPreview?.warrantyStatus ?? infrastructureWarrantyStatus(draft)} />
                {infrastructureWarrantyAlert(draft) ? <StatusBadge label={infrastructureWarrantyAlert(draft)} variant="warning" /> : null}
              </div>
            </FormField>
            <FormField label="Maintenance Status">
              <div className="flex h-9 items-center px-2 text-sm"><StatusBadge label={dashboardPreview?.maintenanceStatus ?? draft.maintenanceStatus} variant={dashboardPreview?.maintenanceStatus === 'Expired' ? 'error' : dashboardPreview?.maintenanceStatus === 'Pending' ? 'warning' : 'default'} /></div>
            </FormField>
            <FormField label="Operational Status" required>
              <select className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass('operationalStatus')}`} value={draft.operationalStatus} disabled={isViewMode} onChange={(event) => updateDraft({ operationalStatus: event.target.value as InfrastructureItem['operationalStatus'] })}>
                {INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </FormField>
            {renderOwnerSelect()}
            {renderReferenceSelect('Billing Method', 'billingMethodRefId', billingMethodOptions, INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE)}
          </div>
          <RemarksGrid
            remarks={(draft.remarks ?? []) as RemarkRecord[]}
            onChange={(remarks) => updateDraft({ remarks })}
            typeOptions={[...REMARK_TYPE_OPTIONS, 'Add new...']}
            readOnly={isViewMode}
          />
        </section>

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Warranty Details</h2>
          <div className="grid gap-3 lg:grid-cols-3">
            <FormField label="Initial Warranty Start Date"><input type="date" readOnly={isViewMode || Boolean(savedItem?.initialWarrantyStartDate)} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.initialWarrantyStartDate ?? ''} onChange={(event) => updateDraft({ initialWarrantyStartDate: event.target.value || null })} /></FormField>
            <FormField label="Current Warranty Start Date"><input type="date" readOnly={isViewMode} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.currentWarrantyStartDate ?? ''} onChange={(event) => updateDraft({ currentWarrantyStartDate: event.target.value || null, initialWarrantyStartDate: draft.initialWarrantyStartDate || event.target.value || null })} /></FormField>
            <FormField label="Current Warranty End Date"><input type="date" readOnly={isViewMode} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.currentWarrantyEndDate ?? ''} onChange={(event) => updateDraft({ currentWarrantyEndDate: event.target.value || null })} /></FormField>
            {renderReferenceSelect('Warranty Type', 'warrantyTypeRefId', warrantyTypeOptions, INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE)}
          </div>
          <FormField label="Location Address">
            {isViewMode ? <RichTextContent value={draft.locationAddress} /> : <RichTextEditor value={draft.locationAddress} onChange={(value) => updateDraft({ locationAddress: value })} minHeightClassName="min-h-24" />}
          </FormField>
          <div className="grid gap-3 lg:grid-cols-3">
            <FormField label="Contact Person Name"><input className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" readOnly={isViewMode} value={draft.warrantyContact.name} onChange={(event) => updateDraft({ warrantyContact: { ...draft.warrantyContact, name: event.target.value } })} /></FormField>
            <FormField label="Contact Person Email"><input className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass('warrantyContact.email')}`} readOnly={isViewMode} value={draft.warrantyContact.email} onChange={(event) => updateDraft({ warrantyContact: { ...draft.warrantyContact, email: event.target.value } })} /></FormField>
            <FormField label="Contact Person Phone"><input className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" readOnly={isViewMode} value={draft.warrantyContact.phone} onChange={(event) => updateDraft({ warrantyContact: { ...draft.warrantyContact, phone: event.target.value } })} /></FormField>
          </div>
        </section>

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
          {activeTab === 'linkedSystems' ? renderLinkedSystemsTab() : null}
          {activeTab === 'documents' ? (
            <DocumentsPanel title="Documents" documents={draft.documents ?? []} emptyText="No Documents are attached to this Infrastructure Item." onChange={(documents) => updateDraft({ documents })} readOnly={isViewMode} />
          ) : null}
          {activeTab === 'activity' ? (
            <ActivityTimeline events={formActivityEvents} emptyText="No activity has been recorded for this Infrastructure Item." />
          ) : null}
        </section>
      </div>
    </div>
  )
}
