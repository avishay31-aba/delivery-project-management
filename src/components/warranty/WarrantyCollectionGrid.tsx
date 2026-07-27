import { useEffect } from 'react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import { EditableChildObjectActionButton, editableChildObjectPermissions, useEditableChildObjectEditor } from '@/components/child-objects'
import { RichTextContent, RichTextEditor, TableSection, WarrantyStatusPresentation } from '@/components/ui'
import type { TenantWarranty } from '@/data/seed.types'
import {
  ADD_NEW_REFERENCE_OPTION,
  createInfrastructureWarranty,
  normalizeInfrastructureWarrantyCollection,
} from '@/domain/infrastructure-item'
import { hasMeaningfulRichText } from '@/domain/rich-text'
import { handleDateInputPaste } from '@/utils/date-input'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'

interface WarrantyCollectionGridProps {
  warranties: TenantWarranty[]
  typeOptions: Array<{ id: string; label: string }>
  onAddTypeOption: () => string | null
  onChange: (warranties: TenantWarranty[]) => void
  readOnly?: boolean
}

function normalizedWarranty(record: TenantWarranty) {
  return {
    warrantyType: record.warrantyType,
    startDate: record.startDate ?? null,
    endDate: record.endDate ?? null,
    remark: record.remark,
  }
}

function validateWarranty(record: TenantWarranty): string[] {
  const messages: string[] = []
  if (!record.warrantyType.trim()) messages.push('Type is required.')
  if (record.startDate && record.endDate && record.startDate > record.endDate) messages.push('Start Date cannot be after End Date.')
  return messages
}

export function WarrantyCollectionGrid({
  warranties,
  typeOptions,
  onAddTypeOption,
  onChange,
  readOnly = false,
}: WarrantyCollectionGridProps) {
  const editor = useEditableChildObjectEditor<TenantWarranty>()
  const permissions = editableChildObjectPermissions({ readOnly })
  const committedIds = warranties.map((warranty) => warranty.id).join('|')
  const renderedWarranties = [
    ...warranties,
    ...editor.newDrafts.filter((draft) => !warranties.some((warranty) => warranty.id === draft.id)),
  ]

  useEffect(() => {
    editor.reset()
  }, [committedIds])

  function addWarranty() {
    editor.beginAdd(createInfrastructureWarranty(warranties, typeOptions[0]?.id ?? ''))
  }

  function updateDraft(id: string, patch: Partial<TenantWarranty>) {
    editor.updateDraft(id, patch)
  }

  function handleTypeChange(id: string, value: string) {
    if (value === ADD_NEW_REFERENCE_OPTION) {
      const nextId = onAddTypeOption()
      if (nextId) updateDraft(id, { warrantyType: nextId })
      return
    }
    updateDraft(id, { warrantyType: value })
  }

  function commitWarranty(draft: TenantWarranty) {
    const next = warranties.some((warranty) => warranty.id === draft.id)
      ? warranties.map((warranty) => (warranty.id === draft.id ? draft : warranty))
      : [...warranties, draft]
    onChange(normalizeInfrastructureWarrantyCollection(next))
  }

  function saveWarranty(id: string) {
    editor.save(id, {
      validate: validateWarranty,
      normalize: normalizedWarranty,
      isMeaningfulNewDraft: (record) => Boolean(record.warrantyType || record.startDate || record.endDate || hasMeaningfulRichText(record.remark)),
      commit: commitWarranty,
      successMessage: 'Warranty saved.',
    })
  }

  function cancelWarranty(id: string) {
    const shouldConfirmDiscard = editor.isNew(id) && editor.hasChanges(id, {
      isMeaningfulNewDraft: (record) => Boolean(record.warrantyType || record.startDate || record.endDate || hasMeaningfulRichText(record.remark)),
    })
    if (shouldConfirmDiscard) {
      editor.commitDelete(id, {
        commit: () => undefined,
        discardMessage: 'Discard this unsaved Warranty draft?\n\nThe entered changes will be lost.',
      })
      return
    }
    editor.cancel(id)
  }

  function deleteWarranty(id: string) {
    editor.commitDelete(id, {
      confirmMessage: 'Delete this Warranty record?\n\nThis change will be saved immediately and cannot be undone.',
      commit: () => onChange(normalizeInfrastructureWarrantyCollection(warranties.filter((warranty) => warranty.id !== id))),
      successMessage: 'Warranty deleted.',
    })
  }

  const actions = permissions.canAdd ? (
    <button type="button" className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={addWarranty}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add warranty
    </button>
  ) : null

  return (
    <TableSection title="Warranty" actions={actions} className="space-y-2">
      {editor.notification ? (
        <div
          className={[
            'rounded border px-3 py-2 text-sm',
            editor.notification.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
          role="status"
        >
          {editor.notification.message}
        </div>
      ) : null}
      <div className="sf-scroll-x rounded border border-sf-border bg-white">
        <table className="w-max min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {['Actions', 'Type', 'Initial Warranty Start Date', 'Start Date', 'End Date', 'Duration', 'Days Before Expiration', 'Warranty Status', 'Alerts', 'Remarks'].map((header) => (
                <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedWarranties.map((warranty) => {
              const draft = editor.draftFor(warranty.id)
              const row = draft ?? warranty
              const isEditing = permissions.canEdit && Boolean(draft)
              const errors = editor.errorsFor(warranty.id)
              const canSave = editor.canSave(warranty.id, {
                validate: validateWarranty,
                normalize: normalizedWarranty,
                isMeaningfulNewDraft: (record) => Boolean(record.warrantyType || record.startDate || record.endDate || hasMeaningfulRichText(record.remark)),
              })
              return (
                <tr key={warranty.id} className="hover:bg-sf-surface-alt">
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                    {readOnly ? null : (
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          <>
                            <EditableChildObjectActionButton variant="primary" disabled={!canSave || editor.isSaving(warranty.id)} onClick={() => saveWarranty(warranty.id)}>
                              <Save className="h-3.5 w-3.5" aria-hidden="true" />
                              Save
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton onClick={() => cancelWarranty(warranty.id)}>
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancel
                            </EditableChildObjectActionButton>
                          </>
                        ) : (
                          <>
                            <EditableChildObjectActionButton onClick={() => editor.beginEdit(warranty)}>
                              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton variant="danger" onClick={() => deleteWarranty(warranty.id)}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Delete
                            </EditableChildObjectActionButton>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <>
                        <select className="h-8 w-56 rounded border border-sf-border px-2 py-1 pr-8 text-sm" value={row.warrantyType} onChange={(event) => handleTypeChange(warranty.id, event.target.value)}>
                          <option value="">Select Type</option>
                          {typeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                          <option value={ADD_NEW_REFERENCE_OPTION}>Add New...</option>
                        </select>
                        {errors.length > 0 ? <div className="mt-1 text-xs text-red-700">{errors.join(' ')}</div> : null}
                      </>
                    ) : (
                      typeOptions.find((option) => option.id === row.warrantyType)?.label || row.warrantyType || '-'
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text"><DateTimeValue value={warranties[0]?.startDate ?? row.startDate} semanticType="date" /></td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? <input className="h-8 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={row.startDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => updateDraft(warranty.id, { startDate: value }))} onChange={(event) => updateDraft(warranty.id, { startDate: event.target.value || null })} /> : <DateTimeValue value={row.startDate} semanticType="date" />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? <input className="h-8 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={row.endDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => updateDraft(warranty.id, { endDate: value }))} onChange={(event) => updateDraft(warranty.id, { endDate: event.target.value || null })} /> : <DateTimeValue value={row.endDate} semanticType="date" />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.durationDays ?? '-'}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.daysBeforeExpiration ?? '-'}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text"><WarrantyStatusPresentation status={row.warrantyStatus} /></td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{row.alerts || '-'}</td>
                  <td className="min-w-80 border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? <RichTextEditor value={row.remark} onChange={(value) => updateDraft(warranty.id, { remark: value })} minHeightClassName="min-h-16" toolbarMode="focus" /> : <RichTextContent value={row.remark} />}
                  </td>
                </tr>
              )
            })}
            {renderedWarranties.length === 0 ? (
              <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={10}>No warranty records yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </TableSection>
  )
}
