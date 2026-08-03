import { useEffect } from 'react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import {
  EditableChildObjectActionButton,
  editableChildObjectPermissions,
  useEditableChildObjectEditor,
} from '@/components/child-objects'
import { RecordHistorySection, RequiredFieldMarker, RichTextContent, RichTextEditor, TableSection, type RecordHistoryColumn } from '@/components/ui'
import {
  createRemarkRecord,
  remarkDeadlineAlertLabel,
  remarkDeadlineAlertStatus,
  type RemarkRecord,
} from '@/domain/remarks'
import { alertPresentationForDeadline } from '@/domain/status-presentation'
import { hasMeaningfulRichText } from '@/domain/rich-text'
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
      isMeaningfulNewDraft: (draftRecord) => hasMeaningfulRichText(draftRecord.content),
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
    if (!hasMeaningfulRichText(draft.content)) errors.push('Content is required.')
    return errors
  }

  function saveRemark(id: string) {
    editor.save(id, {
      validate: validateRemark,
      commit: commitRemark,
      normalize: normalizedRemark,
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
      Add Remark
    </button>
  ) : null

  const columns: Array<RecordHistoryColumn<RemarkRecord>> = [
    {
      key: 'actions',
      label: 'Actions',
      render: (remark) => {
        const draft = editor.draftFor(remark.id)
        const isEditing = permissions.canEdit && Boolean(draft)
        const isSaving = editor.isSaving(remark.id)
        const isDeleting = editor.isDeleting(remark.id)
        const canAttemptSave = Boolean(draft) && !isSaving && (
          editor.isNew(remark.id) ||
          editor.hasChanges(remark.id, { normalize: normalizedRemark })
        )

        if (readOnly) return null

        return (
          <div className="flex flex-wrap gap-1">
            {isEditing ? (
              <>
                <EditableChildObjectActionButton
                  variant="primary"
                  disabled={!canAttemptSave}
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
                  <EditableChildObjectActionButton onClick={() => editor.beginEdit(remark)}>
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
        )
      },
    },
    {
      key: 'remarkId',
      label: 'Remark ID',
      render: (remark) => (editor.draftFor(remark.id) ?? remark).remarkId,
      sortValue: (remark) => remark.remarkId,
    },
    {
      key: 'created',
      label: 'Created',
      render: (remark) => <DateTimeValue value={(editor.draftFor(remark.id) ?? remark).createdAt} semanticType="datetime" />,
      sortValue: (remark) => remark.createdAt,
    },
    {
      key: 'author',
      label: 'Author',
      render: (remark) => (editor.draftFor(remark.id) ?? remark).author,
      sortValue: (remark) => remark.author,
    },
    {
      key: 'type',
      label: 'Type',
      render: (remark) => {
        const rowRemark = editor.draftFor(remark.id) ?? remark
        const isEditing = permissions.canEdit && Boolean(editor.draftFor(remark.id))
        const errors = editor.errorsFor(remark.id)

        return isEditing ? (
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
        ) : rowRemark.type
      },
      sortValue: (remark) => remark.type,
    },
    {
      key: 'content',
      label: <>Content<RequiredFieldMarker /></>,
      className: 'min-w-80 max-w-[36rem] border border-sf-border px-1.5 py-1 align-top text-sf-text',
      render: (remark) => {
        const rowRemark = editor.draftFor(remark.id) ?? remark
        const isEditing = permissions.canEdit && Boolean(editor.draftFor(remark.id))
        const errors = editor.errorsFor(remark.id)

        return (
          <>
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
          </>
        )
      },
      sortValue: (remark) => remark.content,
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (remark) => {
        const rowRemark = editor.draftFor(remark.id) ?? remark
        const isEditing = permissions.canEdit && Boolean(editor.draftFor(remark.id))

        return isEditing ? (
          <input
            className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm"
            type="date"
            value={rowRemark.dueDate ?? ''}
            onPaste={(event) => handleDateInputPaste(event, (nextValue) => editor.updateDraft(remark.id, { dueDate: nextValue }))}
            onChange={(event) => editor.updateDraft(remark.id, { dueDate: event.target.value || null })}
          />
        ) : (
          <DateTimeValue value={rowRemark.dueDate} semanticType="date" />
        )
      },
      sortValue: (remark) => remark.dueDate ?? '',
    },
    {
      key: 'deadlineAlert',
      label: 'DL Alert',
      render: (remark) => renderDeadlineAlert((editor.draftFor(remark.id) ?? remark).dueDate) ?? '-',
      sortValue: (remark) => remarkDeadlineAlertLabel(remarkDeadlineAlertStatus(remark.dueDate)),
    },
  ]

  function remarkSearchText(remark: RemarkRecord): string {
    return [
      remark.remarkId,
      remark.type,
      remark.content,
      remark.author,
      remark.updatedBy ?? '',
      remarkDeadlineAlertLabel(remarkDeadlineAlertStatus(remark.dueDate)),
    ].join(' ')
  }

  return (
    <TableSection title="Remarks" className="space-y-2">
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

      <RecordHistorySection
        records={renderedRemarks}
        columns={columns}
        getRowKey={(remark) => remark.id}
        getSearchText={remarkSearchText}
        getDateValue={(remark) => remark.createdAt}
        dateFilterLabel="Remark Created Date"
        emptyText="No records available."
        filteredEmptyText="No matching records."
        searchLabel="Search / Filter"
        searchPlaceholder="Search Remarks"
        recordsPerPageLabel="Records per page"
        actions={actions}
        resetPageSignal={committedRemarkIds}
      />
    </TableSection>
  )
}
