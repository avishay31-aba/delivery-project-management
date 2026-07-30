import { useEffect, useMemo } from 'react'
import { Edit2, Save, X } from 'lucide-react'
import { EditableChildObjectActionButton, editableChildObjectPermissions, useEditableChildObjectEditor } from '@/components/child-objects'
import { RequiredFieldMarker, RichTextContent, RichTextEditor, TableSection, WarrantyStatusPresentation } from '@/components/ui'
import type { TenantWarranty } from '@/data/seed.types'
import {
  createInfrastructureWarranty,
  normalizeInfrastructureWarrantyCollection,
} from '@/domain/infrastructure-item'
import {
  validateWarrantyDateDraft,
  WARRANTY_DATE_ORDER_MESSAGE,
  WARRANTY_END_DATE_REQUIRED_MESSAGE,
  WARRANTY_START_DATE_REQUIRED_MESSAGE,
} from '@/domain/warranty-collection'
import { hasMeaningfulRichText } from '@/domain/rich-text'
import { handleDateInputPaste } from '@/utils/date-input'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'

interface WarrantyCollectionGridProps {
  warranties: TenantWarranty[]
  onChange: (warranties: TenantWarranty[]) => void
  readOnly?: boolean
}

function normalizedWarranty(record: TenantWarranty) {
  return {
    initialWarrantyDate: record.initialWarrantyDate ?? null,
    startDate: record.startDate ?? null,
    endDate: record.endDate ?? null,
    noWarranty: record.noWarranty ?? 'NO',
    remark: record.remark,
  }
}

function validateWarranty(record: TenantWarranty): string[] {
  return validateWarrantyDateDraft(record)
}

export function WarrantyCollectionGrid({
  warranties,
  onChange,
  readOnly = false,
}: WarrantyCollectionGridProps) {
  const editor = useEditableChildObjectEditor<TenantWarranty>()
  const permissions = editableChildObjectPermissions({ readOnly })
  const committedIds = warranties.map((warranty) => warranty.id).join('|')
  const defaultWarranty = useMemo(
    () => normalizeInfrastructureWarrantyCollection([{ ...createInfrastructureWarranty([]), noWarranty: 'YES' }])[0],
    [committedIds],
  )
  const renderedWarranties = [warranties[0] ?? editor.newDrafts[0] ?? defaultWarranty]

  useEffect(() => {
    editor.reset()
  }, [committedIds])

  function updateDraft(id: string, patch: Partial<TenantWarranty>) {
    editor.updateDraft(id, patch)
  }

  function commitWarranty(draft: TenantWarranty) {
    onChange(normalizeInfrastructureWarrantyCollection([draft]))
  }

  function saveWarranty(id: string) {
    editor.save(id, {
      validate: validateWarranty,
      normalize: normalizedWarranty,
      isMeaningfulNewDraft: (record) => Boolean(record.initialWarrantyDate || record.startDate || record.endDate || record.noWarranty === 'YES' || hasMeaningfulRichText(record.remark)),
      commit: commitWarranty,
      successMessage: 'Warranty saved.',
    })
  }

  function cancelWarranty(id: string) {
    const shouldConfirmDiscard = editor.isNew(id) && editor.hasChanges(id, {
      isMeaningfulNewDraft: (record) => Boolean(record.initialWarrantyDate || record.startDate || record.endDate || record.noWarranty === 'YES' || hasMeaningfulRichText(record.remark)),
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

  return (
    <TableSection title="Warranty" className="space-y-2">
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
              {['Actions', 'Warranty ID', 'Initial Warranty', 'Start Date', 'End Date', 'Duration', 'Days Before Expiration', 'Warranty Status', 'Alerts', 'Remarks', 'No Warranty'].map((header) => (
                <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                  {header}
                  {header === 'Start Date' || header === 'End Date' ? <RequiredFieldMarker /> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedWarranties.map((warranty) => {
              const draft = editor.draftFor(warranty.id)
              const row = draft ?? warranty
              const isEditing = permissions.canEdit && Boolean(draft)
              const displayRow = isEditing ? normalizeInfrastructureWarrantyCollection([row])[0] : row
              const errors = editor.errorsFor(warranty.id)
              const startDateError = errors.find((error) => error === WARRANTY_START_DATE_REQUIRED_MESSAGE || error === WARRANTY_DATE_ORDER_MESSAGE)
              const endDateError = errors.find((error) => error === WARRANTY_END_DATE_REQUIRED_MESSAGE)
              const canAttemptSave = Boolean(draft) && !editor.isSaving(warranty.id)
              return (
                <tr key={warranty.id} className="hover:bg-sf-surface-alt">
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                    {readOnly ? null : (
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          <>
                            <EditableChildObjectActionButton variant="primary" disabled={!canAttemptSave} onClick={() => saveWarranty(warranty.id)}>
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
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top font-semibold text-sf-text">{row.warrantyId || '-'}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? <input className="h-8 rounded border border-sf-border px-2 py-1 text-sm" type="date" value={row.initialWarrantyDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => updateDraft(warranty.id, { initialWarrantyDate: value }))} onChange={(event) => updateDraft(warranty.id, { initialWarrantyDate: event.target.value || null })} /> : <DateTimeValue value={row.initialWarrantyDate} semanticType="date" />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <>
                        <input className={['h-8 rounded border px-2 py-1 text-sm', startDateError ? 'border-red-500' : 'border-sf-border'].join(' ')} type="date" value={row.startDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => updateDraft(warranty.id, { startDate: value }))} onChange={(event) => updateDraft(warranty.id, { startDate: event.target.value || null })} />
                        {startDateError ? <div className="mt-1 text-xs text-red-700">{startDateError}</div> : null}
                      </>
                    ) : <DateTimeValue value={row.startDate} semanticType="date" />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <>
                        <input className={['h-8 rounded border px-2 py-1 text-sm', endDateError ? 'border-red-500' : 'border-sf-border'].join(' ')} type="date" value={row.endDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => updateDraft(warranty.id, { endDate: value }))} onChange={(event) => updateDraft(warranty.id, { endDate: event.target.value || null })} />
                        {endDateError ? <div className="mt-1 text-xs text-red-700">{endDateError}</div> : null}
                      </>
                    ) : <DateTimeValue value={row.endDate} semanticType="date" />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{displayRow.durationDays ?? '-'}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{displayRow.daysBeforeExpiration ?? '-'}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text"><WarrantyStatusPresentation status={displayRow.warrantyStatus} /></td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{displayRow.alerts || '-'}</td>
                  <td className="min-w-80 border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? <RichTextEditor value={row.remark} onChange={(value) => updateDraft(warranty.id, { remark: value })} minHeightClassName="min-h-16" toolbarMode="focus" /> : <RichTextContent value={row.remark} />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={row.noWarranty === 'YES'}
                          onChange={(event) => updateDraft(warranty.id, { noWarranty: event.target.checked ? 'YES' : 'NO' })}
                        />
                        No Warranty
                      </label>
                    ) : (
                      row.noWarranty === 'YES' ? 'No Warranty' : '-'
                    )}
                  </td>
                </tr>
              )
            })}
            {renderedWarranties.length === 0 ? (
              <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={11}>No warranty records yet.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </TableSection>
  )
}
