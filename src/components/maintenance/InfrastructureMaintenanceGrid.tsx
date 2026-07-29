import { useEffect } from 'react'
import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import {
  EditableChildObjectActionButton,
  editableChildObjectPermissions,
  useEditableChildObjectEditor,
} from '@/components/child-objects'
import { BusinessIdLink, MaintenanceStatusPresentation, RichTextContent, RichTextEditor, TableSection } from '@/components/ui'
import type { InfrastructureMaintenanceTask, InfrastructureMaintenanceTaskStatus, ReferenceDataRecord } from '@/data/seed.types'
import {
  ADD_NEW_REFERENCE_OPTION,
  commitInfrastructureMaintenanceTask,
  createInfrastructureMaintenanceTask,
  infrastructureMaintenanceAlert,
  infrastructureMaintenanceTaskTypes,
  infrastructureReferenceDataLabel,
  INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS,
} from '@/domain/infrastructure-item'
import { hasMeaningfulRichText } from '@/domain/rich-text'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { handleDateInputPaste } from '@/utils/date-input'

interface InfrastructureMaintenanceGridProps {
  tasks: InfrastructureMaintenanceTask[]
  onChange: (tasks: InfrastructureMaintenanceTask[]) => void
  referenceData: ReferenceDataRecord[]
  onAddTaskType: (label: string) => { ok: boolean; message: string; record?: ReferenceDataRecord }
  readOnly?: boolean
}

function normalizedTask(record: InfrastructureMaintenanceTask) {
  return {
    taskTypeRefId: record.taskTypeRefId,
    task: record.task,
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    taskStatus: record.taskStatus,
  }
}

function alertBadge(task: InfrastructureMaintenanceTask) {
  const alert = infrastructureMaintenanceAlert(task)
  if (!alert) return null
  return <MaintenanceStatusPresentation status={alert} />
}

export function InfrastructureMaintenanceGrid({ tasks, onChange, referenceData, onAddTaskType, readOnly = false }: InfrastructureMaintenanceGridProps) {
  const editor = useEditableChildObjectEditor<InfrastructureMaintenanceTask>()
  const permissions = editableChildObjectPermissions({ readOnly })
  const taskTypeOptions = infrastructureMaintenanceTaskTypes(referenceData)
  const committedTaskIds = tasks.map((task) => task.id).join('|')
  const renderedTasks = [
    ...tasks,
    ...editor.newDrafts.filter((draft) => !tasks.some((task) => task.id === draft.id)),
  ]

  useEffect(() => {
    editor.reset()
  }, [committedTaskIds])

  function addTask() {
    editor.beginAdd(createInfrastructureMaintenanceTask(tasks))
  }

  function commitTask(draft: InfrastructureMaintenanceTask, isNew: boolean) {
    const previous = tasks.find((task) => task.id === draft.id)
    const committedTask = commitInfrastructureMaintenanceTask(draft, previous, new Date().toISOString(), CURRENT_USER_DISPLAY_NAME)
    onChange(isNew ? [...tasks, committedTask] : tasks.map((task) => (task.id === draft.id ? committedTask : task)))
  }

  function deleteTask(id: string) {
    editor.commitDelete(id, {
      confirmMessage: 'Delete this Maintenance Task?\n\nThis change will be saved immediately and cannot be undone.',
      commit: () => onChange(tasks.filter((task) => task.id !== id)),
      successMessage: 'Maintenance Task deleted.',
    })
  }

  function validateTask(draft: InfrastructureMaintenanceTask): string[] {
    const errors: string[] = []
    if (!hasMeaningfulRichText(draft.task)) errors.push('Description is required.')
    if (draft.startDate && Number.isNaN(new Date(`${draft.startDate}T00:00:00`).valueOf())) errors.push('Start Date is invalid.')
    if (draft.dueDate && Number.isNaN(new Date(`${draft.dueDate}T00:00:00`).valueOf())) errors.push('Due Date is invalid.')
    if (!INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.includes(draft.taskStatus)) errors.push('Task Status is invalid.')
    return errors
  }

  function changeTaskType(taskId: string, value: string) {
    if (value !== ADD_NEW_REFERENCE_OPTION) {
      editor.updateDraft(taskId, { taskTypeRefId: value })
      return
    }
    const label = window.prompt('Add Infrastructure Maintenance Task Type')
    if (!label) {
      editor.updateDraft(taskId, { taskTypeRefId: '' })
      return
    }
    const result = onAddTaskType(label)
    if (result.ok && result.record) {
      editor.updateDraft(taskId, { taskTypeRefId: result.record.id })
      return
    }
    window.alert(result.message)
  }

  function saveTask(id: string) {
    editor.save(id, {
      validate: validateTask,
      commit: commitTask,
      normalize: normalizedTask,
      isMeaningfulNewDraft: (draft) => hasMeaningfulRichText(draft.task) || Boolean(draft.taskTypeRefId || draft.startDate || draft.dueDate) || draft.taskStatus !== 'Open',
      successMessage: 'Maintenance Task saved.',
    })
  }

  const actions = permissions.canAdd ? (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt"
      onClick={addTask}
    >
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add Task
    </button>
  ) : null

  return (
    <TableSection title="Maintenance" actions={actions}>
      {editor.notification ? (
        <div className={editor.notification.tone === 'error' ? 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700' : 'rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'}>
          {editor.notification.message}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-sf-surface-alt text-left text-xs uppercase tracking-wide text-sf-text-muted">
            <tr>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Actions</th>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Task ID</th>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Task Type</th>
              <th className="min-w-[24rem] border border-sf-border px-2 py-2">Description</th>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Start Date</th>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Due Date</th>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Task Status</th>
              <th className="whitespace-nowrap border border-sf-border px-2 py-2">Alert</th>
            </tr>
          </thead>
          <tbody>
            {renderedTasks.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-sf-border px-3 py-4 text-center text-sf-text-muted">No Maintenance Tasks yet.</td>
              </tr>
            ) : renderedTasks.map((task) => {
              const draft = editor.draftFor(task.id)
              const row = draft ?? task
              const isEditing = editor.isEditing(task.id)
              const errors = editor.errorsFor(task.id)
              return (
                <tr key={task.id} className="align-top">
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">
                    <div className="flex flex-wrap gap-1">
                      {isEditing ? (
                        <>
                          <EditableChildObjectActionButton variant="primary" disabled={editor.isSaving(task.id)} onClick={() => saveTask(task.id)}>
                            <Save className="h-3.5 w-3.5" aria-hidden="true" /> Save
                          </EditableChildObjectActionButton>
                          <EditableChildObjectActionButton onClick={() => editor.cancel(task.id)}>
                            <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
                          </EditableChildObjectActionButton>
                        </>
                      ) : (
                        <>
                          {permissions.canEdit ? (
                            <EditableChildObjectActionButton onClick={() => editor.beginEdit(task)}>
                              <Edit2 className="h-3.5 w-3.5" aria-hidden="true" /> Edit
                            </EditableChildObjectActionButton>
                          ) : null}
                          {permissions.canDelete ? (
                            <EditableChildObjectActionButton variant="danger" disabled={editor.isDeleting(task.id)} onClick={() => deleteTask(task.id)}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
                            </EditableChildObjectActionButton>
                          ) : null}
                        </>
                      )}
                    </div>
                    {errors.length > 0 ? <div className="mt-2 space-y-1 text-xs text-red-700">{errors.map((error) => <div key={error}>{error}</div>)}</div> : null}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">
                    <BusinessIdLink objectType="INFRASTRUCTURE_MAINTENANCE_TASK" businessId={row.taskId}>{row.taskId}</BusinessIdLink>
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">
                    {isEditing ? (
                      <select className="h-8 w-56 rounded border border-sf-border px-2 py-1 pr-8 text-sm" value={row.taskTypeRefId} onChange={(event) => changeTaskType(task.id, event.target.value)}>
                        <option value=""></option>
                        {taskTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                        <option value={ADD_NEW_REFERENCE_OPTION}>Add New...</option>
                      </select>
                    ) : infrastructureReferenceDataLabel(referenceData, row.taskTypeRefId) || '-'}
                  </td>
                  <td className="border border-sf-border px-2 py-2">
                    {isEditing ? <RichTextEditor value={row.task} onChange={(value) => editor.updateDraft(task.id, { task: value })} minHeightClassName="min-h-24" /> : <RichTextContent value={row.task} />}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">
                    {isEditing ? <input type="date" className="h-8 rounded border border-sf-border px-2 py-1 text-sm" value={row.startDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => editor.updateDraft(task.id, { startDate: value }))} onChange={(event) => editor.updateDraft(task.id, { startDate: event.target.value || null })} /> : row.startDate || '-'}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">
                    {isEditing ? <input type="date" className="h-8 rounded border border-sf-border px-2 py-1 text-sm" value={row.dueDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => editor.updateDraft(task.id, { dueDate: value }))} onChange={(event) => editor.updateDraft(task.id, { dueDate: event.target.value || null })} /> : row.dueDate || '-'}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">
                    {isEditing ? (
                      <select className="h-8 w-32 rounded border border-sf-border px-2 py-1 pr-8 text-sm" value={row.taskStatus} onChange={(event) => editor.updateDraft(task.id, { taskStatus: event.target.value as InfrastructureMaintenanceTaskStatus })}>
                        {INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    ) : row.taskStatus}
                  </td>
                  <td className="whitespace-nowrap border border-sf-border px-2 py-2">{alertBadge(row) ?? '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </TableSection>
  )
}
