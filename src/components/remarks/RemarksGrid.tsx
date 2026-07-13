import { useState } from 'react'
import { Edit2, Plus, Trash2 } from 'lucide-react'
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
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'

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
  useDateTimePresentationPreference()
  const [editingRemarkIds, setEditingRemarkIds] = useState<string[]>([])

  function updateRemark(id: string, patch: Partial<RemarkRecord>) {
    const now = new Date().toISOString()
    onChange(
      remarks.map((remark) =>
        remark.id === id
          ? { ...remark, ...patch, updatedAt: now, updatedBy: CURRENT_USER_DISPLAY_NAME }
          : remark,
      ),
    )
  }

  function addRemark() {
    const remark = createRemarkRecord(remarks)
    onChange([...remarks, remark])
    setEditingRemarkIds((current) => [...current, remark.id])
  }

  function deleteRemark(id: string) {
    onChange(remarks.filter((remark) => remark.id !== id))
    setEditingRemarkIds((current) => current.filter((remarkId) => remarkId !== id))
  }

  function setEditing(id: string, editing: boolean) {
    setEditingRemarkIds((current) =>
      editing
        ? Array.from(new Set([...current, id]))
        : current.filter((remarkId) => remarkId !== id),
    )
  }

  function handleTypeChange(id: string, value: string) {
    if (isAddNewOption(value)) {
      const nextValue = window.prompt('Add remark type')
      const trimmed = nextValue?.trim()
      if (!trimmed) return
      onAddTypeOption?.(trimmed)
      updateRemark(id, { type: trimmed })
      return
    }

    updateRemark(id, { type: value })
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
            {remarks.map((remark) => {
              const isEditing = !readOnly && editingRemarkIds.includes(remark.id)
              return (
                <tr key={remark.id} className="hover:bg-sf-surface-alt">
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                    {readOnly ? null : (
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-2 py-1 text-xs text-sf-text hover:bg-sf-surface-alt"
                          onClick={() => setEditing(remark.id, !isEditing)}
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {isEditing ? 'Done' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          onClick={() => deleteRemark(remark.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{remark.remarkId}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{formatDateTimeSeconds(remark.createdAt)}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">{remark.author}</td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <select
                        className="h-8 w-56 rounded border border-sf-border px-2 py-1 text-sm"
                        value={remark.type}
                        onChange={(event) => handleTypeChange(remark.id, event.target.value)}
                      >
                        {typeOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    ) : (
                      remark.type
                    )}
                  </td>
                  <td className="min-w-80 max-w-[36rem] border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <RichTextEditor
                        value={remark.content}
                        onChange={(value) => updateRemark(remark.id, { content: value })}
                        minHeightClassName="min-h-16"
                        toolbarMode="focus"
                      />
                    ) : (
                      <RichTextContent value={remark.content} />
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {isEditing ? (
                      <input
                        className="h-8 w-36 rounded border border-sf-border px-2 py-1 text-sm"
                        type="date"
                        value={remark.dueDate ?? ''}
                        onPaste={(event) => handleDateInputPaste(event, (nextValue) => updateRemark(remark.id, { dueDate: nextValue }))}
                        onChange={(event) => updateRemark(remark.id, { dueDate: event.target.value || null })}
                      />
                    ) : (
                      formatDate(remark.dueDate, { fallback: '' })
                    )}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                    {renderDeadlineAlert(remark.dueDate)}
                  </td>
                </tr>
              )
            })}
            {remarks.length === 0 ? (
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
