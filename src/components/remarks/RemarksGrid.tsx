import { useState } from 'react'
import { Check, Edit2, Plus, Trash2, X } from 'lucide-react'
import { RichTextContent, RichTextEditor } from '@/components/ui'
import {
  createRemarkRecord,
  remarkDeadlineAlertLabel,
  remarkDeadlineAlertStatus,
  type RemarkRecord,
} from '@/domain/remarks'
import { alertPresentationForDeadline } from '@/domain/status-presentation'
import { formatDate, formatDateTimeSeconds } from '@/domain/date-time-presentation'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { handleDateInputPaste } from '@/utils/date-input'

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
  const [editingRemarkIds, setEditingRemarkIds] = useState<string[]>([])
  const [newRemarkIds, setNewRemarkIds] = useState<string[]>([])
  const [remarkDrafts, setRemarkDrafts] = useState<Record<string, RemarkRecord>>({})

  const visibleRemarks = [
    ...remarks,
    ...newRemarkIds.map((id) => remarkDrafts[id]).filter((remark): remark is RemarkRecord => Boolean(remark)),
  ]

  function startEditing(remark: RemarkRecord) {
    setRemarkDrafts((current) => ({ ...current, [remark.id]: { ...remark } }))
    setEditingRemarkIds((current) => Array.from(new Set([...current, remark.id])))
  }

  function updateRemarkDraft(id: string, patch: Partial<RemarkRecord>) {
    const now = new Date().toISOString()
    setRemarkDrafts((current) => {
      const base = current[id] ?? remarks.find((remark) => remark.id === id)
      if (!base) return current
      return {
        ...current,
        [id]: { ...base, ...patch, updatedAt: now, updatedBy: CURRENT_USER_DISPLAY_NAME },
      }
    })
  }

  function addRemark() {
    const remark = createRemarkRecord(remarks)
    setRemarkDrafts((current) => ({ ...current, [remark.id]: remark }))
    setNewRemarkIds((current) => [...current, remark.id])
    setEditingRemarkIds((current) => [...current, remark.id])
  }

  function deleteRemark(id: string) {
    onChange(remarks.filter((remark) => remark.id !== id))
    clearDraft(id)
  }

  function clearDraft(id: string) {
    setEditingRemarkIds((current) => current.filter((remarkId) => remarkId !== id))
    setNewRemarkIds((current) => current.filter((remarkId) => remarkId !== id))
    setRemarkDrafts((current) => {
      const { [id]: _removed, ...rest } = current
      return rest
    })
  }

  function saveRemark(id: string) {
    const draft = remarkDrafts[id]
    if (!draft) return
    const exists = remarks.some((remark) => remark.id === id)
    onChange(exists ? remarks.map((remark) => (remark.id === id ? draft : remark)) : [...remarks, draft])
    clearDraft(id)
  }

  function handleTypeChange(id: string, value: string) {
    if (isAddNewOption(value)) {
      const nextValue = window.prompt('Add remark type')
      const trimmed = nextValue?.trim()
      if (!trimmed) return
      onAddTypeOption?.(trimmed)
      updateRemarkDraft(id, { type: trimmed })
      return
    }

    updateRemarkDraft(id, { type: value })
  }

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-sf-text">Remarks</h3>
        {readOnly ? null : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt"
            onClick={addRemark}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add remark
          </button>
        )}
      </div>

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
            {visibleRemarks.map((remark) => {
              const isEditing = !readOnly && editingRemarkIds.includes(remark.id)
              const visibleRemark = isEditing ? remarkDrafts[remark.id] ?? remark : remark
              return (
                <tr key={remark.id} className="hover:bg-sf-surface-alt">
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                    {readOnly ? null : (
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded border border-sf-brand bg-sf-brand px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                              onClick={() => saveRemark(remark.id)}
                            >
                              <Check className="h-3.5 w-3.5" aria-hidden="true" />
                              Save
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-2 py-1 text-xs text-sf-text hover:bg-sf-surface-alt"
                              onClick={() => clearDraft(remark.id)}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-2 py-1 text-xs text-sf-text hover:bg-sf-surface-alt"
                              onClick={() => startEditing(remark)}
                            >
                              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                              onClick={() => deleteRemark(remark.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{visibleRemark.remarkId}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{formatDateTimeSeconds(visibleRemark.createdAt)}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{visibleRemark.author}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <select
                        className="h-8 w-56 rounded border border-sf-border px-2 py-1 text-sm"
                        value={visibleRemark.type}
                        onChange={(event) => handleTypeChange(remark.id, event.target.value)}
                      >
                        {typeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      visibleRemark.type
                    )}
                  </td>
                  <td className="min-w-80 max-w-[36rem] border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <RichTextEditor
                        value={visibleRemark.content}
                        onChange={(value) => updateRemarkDraft(remark.id, { content: value })}
                        minHeightClassName="min-h-16"
                        toolbarMode="focus"
                      />
                    ) : (
                      <RichTextContent value={visibleRemark.content} />
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <input
                        className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm"
                        type="date"
                        value={visibleRemark.dueDate ?? ''}
                        onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateRemarkDraft(remark.id, { dueDate: nextValue }))}
                        onChange={(event) => updateRemarkDraft(remark.id, { dueDate: event.target.value || null })}
                      />
                    ) : (
                      formatDate(visibleRemark.dueDate, { fallback: '' })
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {renderDeadlineAlert(visibleRemark.dueDate)}
                  </td>
                </tr>
              )
            })}
            {visibleRemarks.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={8}>
                  No remarks yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
