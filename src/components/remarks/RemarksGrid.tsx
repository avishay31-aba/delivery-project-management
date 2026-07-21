import { useEffect } from 'react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import {
  EditableChildObjectActionButton,
  editableChildObjectPermissions,
  useEditableChildObjectEditor,
} from '@/components/child-objects'
import { RichTextContent, RichTextEditor, TableSection } from '@/components/ui'
import {
  createRemarkRecord,
  remarkDeadlineAlertLabel,
  remarkDeadlineAlertStatus,
  type RemarkRecord,
} from '@/domain/remarks'
import { alertPresentationForDeadline } from '@/domain/status-presentation'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { handleDateInputPaste } from '@/utils/date-input'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'

interface RemarksGridProps {
  remarks: RemarkRecord[]
  onChange: (remarks: RemarkRecord[]) => void
  readOnly?: boolean
  typeOptions: string[]
  onAddTypeOption?: (value: string) => void
}

function isAddNewOption(value: string): boolean {
  return value === 'Add new...'
}

function plainTextContent(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

function normalizedRemark(record: RemarkRecord) {
  return {
    type: record.type.trim(),
    content: record.content,
    dueDate: record.dueDate ?? null,
  }
}

function renderDeadlineAlert(dueDate: string | null | undefined) {
  const status = remarkDeadlineAlertStatus(dueDate)
  if (status === 'NONE') return null

  const label = remarkDeadlineAlertLabel(status)
  const presentation = alertPresentationForDeadline(status)
  const Icon = presentation.icon

  return (
    <span className="inline-flex items-center gap-1.5 font-semibold" title={label}>
      <Icon className={['h-5 w-5 stroke-[2.5]', presentation.iconClassName].join(' ')} aria-label={label} />
      <span className={presentation.iconClassName}>{label}</span>
    </span>
  )
}

export function RemarksGrid({
  remarks,
  onChange,
  readOnly = false,
  typeOptions,
  onAddTypeOption,
}: RemarksGridProps) {
  useDateTimePresentationPreference()
  const editor = useEditableChildObjectEditor<RemarkRecord>()
  const permissions = editableChildObjectPermissions({ readOnly })
  const committedRemarkIds = remarks.map((remark) => remark.id).join('|')
  const renderedRemarks = [
    ...remarks,
    ...editor.newDrafts.filter((draft) => !remarks.some((remark) => remark.id === draft.id)),
  ]

  useEffect(() => {
    editor.reset()
  }, [committedRemarkIds])

  function commitRemark(draft: RemarkRecord, isNew: boolean) {
    const now = new Date().toISOString()
    const committedRemark = isNew
      ? draft
      : { ...draft, updatedAt: now, updatedBy: CURRENT_USER_DISPLAY_NAME }
    onChange(
      isNew
        ? [...remarks, committedRemark]
        : remarks.map((remark) => (remark.id === draft.id ? committedRemark : remark)),
    )
  }

  function addRemark() {
    const remark = createRemarkRecord(remarks)
    editor.beginAdd(remark)
  }

  function deleteRemark(id: string) {
    editor.commitDelete(id, {
      confirmMessage: 'Delete this Remark record?\n\nThis change will be saved immediately and cannot be undone.',
      commit: () => onChange(remarks.filter((remark) => remark.id !== id)),
      successMessage: 'Remark deleted.',
    })
  }

  function cancelRemark(id: string) {
    const shouldConfirmDiscard = editor.isNew(id) && editor.hasChanges(id, {
      isMeaningfulNewDraft: (draftRecord) => Boolean(plainTextContent(draftRecord.content)),
    })
    if (shouldConfirmDiscard) {
      editor.commitDelete(id, {
        commit: () => undefined,
        discardMessage: 'Discard this unsaved Remark draft?\n\nThe entered changes will be lost.',
      })
      return
    }
    editor.cancel(id)
  }

  function handleTypeChange(id: string, value: string) {
    if (isAddNewOption(value)) {
      const nextValue = window.prompt('Add remark type')
      const trimmed = nextValue?.trim()
      if (!trimmed) return
      onAddTypeOption?.(trimmed)
      editor.updateDraft(id, { type: trimmed })
      return
    }

    editor.updateDraft(id, { type: value })
  }

  function validateRemark(draft: RemarkRecord): string[] {
    const errors: string[] = []
    if (!draft.type.trim()) errors.push('Type is required.')
    if (!plainTextContent(draft.content)) errors.push('Content is required.')
    return errors
  }

  function saveRemark(id: string) {
    editor.save(id, {
      validate: validateRemark,
      commit: commitRemark,
      normalize: normalizedRemark,
      isMeaningfulNewDraft: (draft) => Boolean(plainTextContent(draft.content)),
      successMessage: 'Remark saved.',
    })
  }

  const actions = permissions.canAdd ? (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt"
      onClick={addRemark}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add remark
    </button>
  ) : null

  return (
    <TableSection title="Remarks" actions={actions} className="space-y-2">
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
              {['Actions', 'Remark ID', 'Created', 'Author', 'Type', 'Content', 'Due Date', 'DL Alert'].map((label) => (
                <th key={label} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedRemarks.map((remark) => {
              const draft = editor.draftFor(remark.id)
              const rowRemark = draft ?? remark
              const isEditing = permissions.canEdit && Boolean(draft)
              const errors = editor.errorsFor(remark.id)
              const isSaving = editor.isSaving(remark.id)
              const isDeleting = editor.isDeleting(remark.id)
              const canSave = editor.canSave(remark.id, {
                validate: validateRemark,
                normalize: normalizedRemark,
                isMeaningfulNewDraft: (draftRecord) => Boolean(plainTextContent(draftRecord.content)),
              })
              return (
                <tr key={remark.id} className="hover:bg-sf-surface-alt">
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                    {readOnly ? null : (
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          <>
                            <EditableChildObjectActionButton
                              variant="primary"
                              disabled={isSaving || !canSave}
                              onClick={() => saveRemark(remark.id)}
                            >
                              <Save className="h-3.5 w-3.5" aria-hidden="true" />
                              {isSaving ? 'Saving...' : 'Save'}
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton
                              disabled={isSaving || isDeleting}
                              onClick={() => cancelRemark(remark.id)}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancel
                            </EditableChildObjectActionButton>
                          </>
                        ) : (
                          <>
                            {permissions.canEdit ? (
                              <EditableChildObjectActionButton
                                onClick={() => editor.beginEdit(remark)}
                              >
                                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Edit
                              </EditableChildObjectActionButton>
                            ) : null}
                            {permissions.canDelete ? (
                            <EditableChildObjectActionButton
                              variant="danger"
                              disabled={isDeleting}
                              onClick={() => deleteRemark(remark.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              {isDeleting ? 'Deleting...' : 'Delete'}
                            </EditableChildObjectActionButton>
                            ) : null}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{rowRemark.remarkId}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    <DateTimeValue value={rowRemark.createdAt} semanticType="datetime" />
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{rowRemark.author}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <select
                        className={[
                          'h-8 w-56 rounded border px-2 py-1 text-sm',
                          errors.some((error) => error.includes('Type')) ? 'border-red-500' : 'border-sf-border',
                        ].join(' ')}
                        value={rowRemark.type}
                        onChange={(event) => handleTypeChange(remark.id, event.target.value)}
                      >
                        {typeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      rowRemark.type
                    )}
                  </td>
                  <td className="min-w-80 max-w-[36rem] border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <div className={errors.some((error) => error.includes('Content')) ? 'rounded border border-red-500' : undefined}>
                        <RichTextEditor
                          value={rowRemark.content}
                          onChange={(value) => editor.updateDraft(remark.id, { content: value })}
                          minHeightClassName="min-h-16"
                          toolbarMode="focus"
                        />
                      </div>
                    ) : (
                      <RichTextContent value={rowRemark.content} />
                    )}
                    {isEditing && errors.length > 0 ? (
                      <div className="mt-1 space-y-0.5 text-xs text-red-700">
                        {errors.map((error) => <div key={error}>{error}</div>)}
                      </div>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <input
                        className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm"
                        type="date"
                        value={rowRemark.dueDate ?? ''}
                        onPaste={(event) => handleDateInputPaste(event, (nextValue) => editor.updateDraft(remark.id, { dueDate: nextValue }))}
                        onChange={(event) => editor.updateDraft(remark.id, { dueDate: event.target.value || null })}
                      />
                    ) : (
                      <DateTimeValue value={rowRemark.dueDate} semanticType="date" />
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {renderDeadlineAlert(rowRemark.dueDate)}
                  </td>
                </tr>
              )
            })}
            {renderedRemarks.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={8}>
                  No remarks yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </TableSection>
  )
}
