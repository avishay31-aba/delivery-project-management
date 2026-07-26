import { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ActivityTimeline } from '@/components/activity'
import { DocumentsPanel } from '@/components/documents/DocumentsPanel'
import { RemarksGrid } from '@/components/remarks'
import { PageHeader } from '@/components/record'
import { BusinessIdListLinks, BusinessObjectLink, FormField, PlaceholderCard, SaveButtonLabel, formMessageClassName } from '@/components/ui'
import type { InfrastructureItem } from '@/data/seed.types'
import {
  INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE,
  INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS,
  INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS,
  INFRASTRUCTURE_OWNER_OPTIONS,
  INFRASTRUCTURE_TYPE_REFERENCE_TYPE,
  allSystemRecords,
  createInfrastructureDraft,
  infrastructureCategories,
  infrastructureDashboardRows,
  infrastructureSystemReference,
  infrastructureTypesForCategory,
  infrastructureWarrantyStatus,
  linkedSystemBusinessIds,
  validateInfrastructureItemDraft,
} from '@/domain/infrastructure-item'
import { activityEventsForObject } from '@/domain/activity-log'
import { infrastructureItemReference, systemBusinessId } from '@/domain/business-reference'
import { REMARK_TYPE_OPTIONS, type RemarkRecord } from '@/domain/remarks'
import { useUndoHistory } from '@/hooks/useUndoHistory'
import { useReactiveDraftSync } from '@/hooks/useReactiveDraftSync'
import { useBeforeUnloadWarning } from '@/hooks/useBeforeUnloadWarning'
import { isRouteViewMode } from '@/utils/route-mode'
import { useAppStore } from '@/store/useAppStore'

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function text(value: unknown): string {
  return value == null ? '' : String(value)
}

function cloneInfrastructureItem(item: InfrastructureItem): InfrastructureItem {
  return JSON.parse(JSON.stringify(item)) as InfrastructureItem
}

export function InfrastructureFormPage() {
  const { infrastructureId } = useParams<{ infrastructureId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isViewMode = isRouteViewMode(location)
  const isNew = infrastructureId === 'new'
  const routeState = location.state as { returnTo?: string } | null
  const returnTo = routeState?.returnTo ?? '/infrastructure'
  const infrastructureItems = useAppStore((state) => state.infrastructureItems)
  const referenceData = useAppStore((state) => state.referenceData)
  const systems = useAppStore((state) => state.systems)
  const productionSystemInventory = useAppStore((state) => state.productionSystemInventory)
  const reusedInternalSystems = useAppStore((state) => state.reusedInternalSystems)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const createReferenceDataRecord = useAppStore((state) => state.createReferenceDataRecord)
  const createInfrastructureItem = useAppStore((state) => state.createInfrastructureItem)
  const updateInfrastructureItem = useAppStore((state) => state.updateInfrastructureItem)
  const savedItem = useMemo(
    () => infrastructureItems.find((item) => item.infrastructureId === infrastructureId || item.id === infrastructureId),
    [infrastructureId, infrastructureItems],
  )
  const initialDraft = useMemo(() => savedItem ? cloneInfrastructureItem(savedItem) : createInfrastructureDraft(), [savedItem])
  const { value: draft, setValue: setDraft, reset: resetDraft, undo: undoDraft, canUndo } = useUndoHistory<InfrastructureItem>(initialDraft, {
    clone: cloneInfrastructureItem,
    isEqual: valuesEqual,
  })
  const [messages, setMessages] = useState<string[]>([])
  const [hasAttemptedSave, setHasAttemptedSave] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedSystemId, setSelectedSystemId] = useState('')
  const allSystems = useMemo(() => allSystemRecords(systems, productionSystemInventory, reusedInternalSystems), [productionSystemInventory, reusedInternalSystems, systems])
  const categoryOptions = infrastructureCategories(referenceData)
  const typeOptions = infrastructureTypesForCategory(referenceData, draft.categoryRefId)
  const isDirty = isNew || !savedItem || !valuesEqual(savedItem, draft)
  useBeforeUnloadWarning(isDirty && !isViewMode)
  useReactiveDraftSync({
    source: savedItem ? cloneInfrastructureItem(savedItem) : createInfrastructureDraft(),
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
  if (messages.includes('Warranty Contact Email must be valid.')) invalidFields.add('warrantyContact.email')

  function updateDraft(patch: Partial<InfrastructureItem>) {
    if (isViewMode) return
    setDraft((current) => ({ ...current, ...patch }))
    if (hasAttemptedSave) setMessages(validateInfrastructureItemDraft({ ...draft, ...patch }, infrastructureItems, referenceData))
  }

  function addReferenceData(referenceType: typeof INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE | typeof INFRASTRUCTURE_TYPE_REFERENCE_TYPE) {
    const label = window.prompt(referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE ? 'Add Infrastructure Category' : 'Add Infrastructure Type')
    const trimmed = label?.trim()
    if (!trimmed) return
    const result = createReferenceDataRecord(referenceType, trimmed, referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE ? { versionNumberId: draft.categoryRefId } : undefined)
    if (!result.ok || !result.record) {
      setMessages([result.message])
      return
    }
    if (referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE) {
      updateDraft({ categoryRefId: result.record.id, typeRefId: '' })
    } else {
      updateDraft({ typeRefId: result.record.id })
    }
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

  function switchToEditMode() {
    navigate(location.pathname, { replace: true, state: { mode: 'edit', returnTo } })
  }

  function linkSystem() {
    if (!selectedSystemId || draft.linkedSystemIds.includes(selectedSystemId)) return
    updateDraft({ linkedSystemIds: [...draft.linkedSystemIds, selectedSystemId] })
    setSelectedSystemId('')
  }

  function unlinkSystem(systemId: string) {
    if (!window.confirm('Remove this System relationship from the Infrastructure Item draft?')) return
    updateDraft({ linkedSystemIds: draft.linkedSystemIds.filter((id) => id !== systemId) })
  }

  function fieldClass(key: string): string {
    return invalidFields.has(key) ? 'border-red-400 bg-red-50' : 'border-sf-border bg-white'
  }

  function renderInput(label: string, key: keyof InfrastructureItem, required = false) {
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

  const linkedBusinessIds = linkedSystemBusinessIds(draft, allSystems)
  const formActivityEvents = savedItem ? activityEventsForObject(activityEvents, 'INFRASTRUCTURE_ITEM', savedItem.infrastructureId) : []
  const dashboardPreview = infrastructureDashboardRows([draft], referenceData, allSystems)[0]

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-0 flex-col">
      <PageHeader
        title={`Infrastructure Item ${draft.infrastructureId || 'New'}`}
        subtitle="Global infrastructure resource"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isViewMode && !isNew ? <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white" onClick={switchToEditMode}>Edit</button> : null}
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
          <h2 className="text-lg font-semibold text-sf-text">Basic Details</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Item ID">
              <div className="flex h-9 items-center rounded border border-transparent bg-white px-2 text-sm font-semibold text-sf-text">{draft.infrastructureId || '-'}</div>
            </FormField>
            {renderInput('Identifier', 'identifier', true)}
            <FormField label="Operational Status" required>
              <select className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass('operationalStatus')}`} value={draft.operationalStatus} disabled={isViewMode} onChange={(event) => updateDraft({ operationalStatus: event.target.value as InfrastructureItem['operationalStatus'] })}>
                {INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </FormField>
            <FormField label="Maintenance Status" required>
              <select className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass('maintenanceStatus')}`} value={draft.maintenanceStatus} disabled={isViewMode} onChange={(event) => updateDraft({ maintenanceStatus: event.target.value as InfrastructureItem['maintenanceStatus'] })}>
                {INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </FormField>
            <FormField label="Category" required>
              <div className="flex gap-2">
                <select className={`h-9 min-w-0 flex-1 rounded border px-2 py-1 text-sm ${fieldClass('categoryRefId')}`} value={draft.categoryRefId} disabled={isViewMode} onChange={(event) => updateDraft({ categoryRefId: event.target.value, typeRefId: '' })}>
                  <option value="">Select Category</option>
                  {categoryOptions.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
                </select>
                {!isViewMode ? <button type="button" className="rounded border border-sf-border bg-white px-2 text-sm" onClick={() => addReferenceData(INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE)}>Add New</button> : null}
              </div>
            </FormField>
            <FormField label="Type" required>
              <div className="flex gap-2">
                <select className={`h-9 min-w-0 flex-1 rounded border px-2 py-1 text-sm ${fieldClass('typeRefId')}`} value={draft.typeRefId} disabled={isViewMode || !draft.categoryRefId} onChange={(event) => updateDraft({ typeRefId: event.target.value })}>
                  <option value="">Select Type</option>
                  {typeOptions.map((record) => <option key={record.id} value={record.id}>{record.label}</option>)}
                </select>
                {!isViewMode ? <button type="button" className="rounded border border-sf-border bg-white px-2 text-sm disabled:opacity-50" disabled={!draft.categoryRefId} onClick={() => addReferenceData(INFRASTRUCTURE_TYPE_REFERENCE_TYPE)}>Add New</button> : null}
              </div>
            </FormField>
            <FormField label="Owner" required>
              <select className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass('owner')}`} value={draft.owner} disabled={isViewMode} onChange={(event) => updateDraft({ owner: event.target.value as InfrastructureItem['owner'] })}>
                <option value="">Select Owner</option>
                {INFRASTRUCTURE_OWNER_OPTIONS.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
              </select>
            </FormField>
          </div>
        </section>

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Linked Systems</h2>
          <div className="text-sm text-sf-text">{linkedBusinessIds.length > 0 ? <BusinessIdListLinks objectType="SYSTEM" businessIds={linkedBusinessIds} /> : '-'}</div>
          {!isViewMode ? (
            <div className="flex flex-wrap gap-2">
              <select className="h-9 min-w-72 rounded border border-sf-border px-2 py-1 text-sm" value={selectedSystemId} onChange={(event) => setSelectedSystemId(event.target.value)}>
                <option value="">Link existing System</option>
                {allSystems.map((system) => (
                  <option key={system.id} value={system.id} disabled={draft.linkedSystemIds.includes(system.id)}>
                    {systemBusinessId(system)} {draft.linkedSystemIds.includes(system.id) ? '- Already linked' : ''}
                  </option>
                ))}
              </select>
              <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" disabled={!selectedSystemId} onClick={linkSystem}>Link System</button>
            </div>
          ) : null}
          <div className="sf-scroll-x rounded border border-sf-border bg-white">
            <table className="min-w-full border-collapse text-sm">
              <thead className="bg-sf-surface-alt text-left">
                <tr>{['SID', 'Actions'].map((label) => <th key={label} className="border border-sf-border px-1.5 py-1 font-semibold">{label}</th>)}</tr>
              </thead>
              <tbody>
                {draft.linkedSystemIds.map((systemId) => {
                  const system = allSystems.find((candidate) => candidate.id === systemId)
                  return (
                    <tr key={systemId}>
                      <td className="border border-sf-border px-1.5 py-1">{system ? <BusinessObjectLink reference={infrastructureSystemReference(system)}>{systemBusinessId(system)}</BusinessObjectLink> : systemId}</td>
                      <td className="border border-sf-border px-1.5 py-1">{!isViewMode ? <button type="button" className="text-sm font-semibold text-red-700 hover:underline" onClick={() => unlinkSystem(systemId)}>Remove SID</button> : null}</td>
                    </tr>
                  )
                })}
                {draft.linkedSystemIds.length === 0 ? <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={2}>No linked Systems.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Warranty & Expiration</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <FormField label="Initial Warranty Start Date"><input type="date" readOnly={isViewMode} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.initialWarrantyStartDate ?? ''} onChange={(event) => updateDraft({ initialWarrantyStartDate: event.target.value || null })} /></FormField>
            <FormField label="Current Warranty Start Date"><input type="date" readOnly={isViewMode} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.currentWarrantyStartDate ?? ''} onChange={(event) => updateDraft({ currentWarrantyStartDate: event.target.value || null, initialWarrantyStartDate: draft.initialWarrantyStartDate || event.target.value || null })} /></FormField>
            <FormField label="Current Warranty End Date"><input type="date" readOnly={isViewMode} className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.currentWarrantyEndDate ?? ''} onChange={(event) => updateDraft({ currentWarrantyEndDate: event.target.value || null })} /></FormField>
            <FormField label="Manual Status">
              <select className="h-9 w-full rounded border border-sf-border px-2 py-1 text-sm" value={draft.manualWarrantyStatus} disabled={isViewMode} onChange={(event) => updateDraft({ manualWarrantyStatus: event.target.value as InfrastructureItem['manualWarrantyStatus'] })}>
                <option value="">Automatic</option>
                <option value="NO_WARRANTY">No Warranty</option>
                <option value="OBSOLETE">Obsolete</option>
              </select>
            </FormField>
            <FormField label="Warranty Status"><div className="flex h-9 items-center px-2 text-sm">{dashboardPreview?.warrantyStatus ?? infrastructureWarrantyStatus(draft)}</div></FormField>
            <FormField label="Days Before Expiration"><div className="flex h-9 items-center px-2 text-sm">{dashboardPreview?.daysBeforeExpiration ?? '-'}</div></FormField>
          </div>
        </section>

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Warranty Contact</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {(['name', 'email', 'phone'] as const).map((key) => (
              <FormField key={key} label={key === 'name' ? 'Name' : key === 'email' ? 'Email' : 'Phone'}>
                <input className={`h-9 w-full rounded border px-2 py-1 text-sm ${fieldClass(`warrantyContact.${key}`)}`} readOnly={isViewMode} value={draft.warrantyContact[key]} onChange={(event) => updateDraft({ warrantyContact: { ...draft.warrantyContact, [key]: event.target.value } })} />
              </FormField>
            ))}
            <FormField label="Address">
              <textarea className="min-h-20 w-full rounded border border-sf-border px-2 py-1 text-sm" readOnly={isViewMode} value={draft.warrantyContact.address} onChange={(event) => updateDraft({ warrantyContact: { ...draft.warrantyContact, address: event.target.value } })} />
            </FormField>
          </div>
        </section>

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Physical Address</h2>
          <textarea className="min-h-24 w-full rounded border border-sf-border px-2 py-1 text-sm" readOnly={isViewMode} value={draft.physicalAddress} onChange={(event) => updateDraft({ physicalAddress: event.target.value })} />
        </section>

        <RemarksGrid
          remarks={(draft.remarks ?? []) as RemarkRecord[]}
          onChange={(remarks) => updateDraft({ remarks })}
          typeOptions={[...REMARK_TYPE_OPTIONS, 'Add new...']}
          readOnly={isViewMode}
        />

        <DocumentsPanel
          title="Documents"
          documents={draft.documents ?? []}
          emptyText="No Documents are attached to this Infrastructure Item."
          onChange={(documents) => updateDraft({ documents })}
          readOnly={isViewMode}
        />

        <section className="sf-card space-y-3 p-3">
          <h2 className="text-lg font-semibold text-sf-text">Activity Log</h2>
          <ActivityTimeline events={formActivityEvents} emptyText="No activity has been recorded for this Infrastructure Item." />
        </section>
      </div>
    </div>
  )
}
