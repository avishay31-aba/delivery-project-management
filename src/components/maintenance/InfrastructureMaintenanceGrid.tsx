import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Edit2, Maximize2, Plus, Save, Trash2, X } from 'lucide-react'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import {
  EditableChildObjectActionButton,
  editableChildObjectPermissions,
  useEditableChildObjectEditor,
} from '@/components/child-objects'
import { BusinessIdLink, BusinessNumericInput, MaintenanceStatusPresentation, RecordHistorySection, RequiredFieldMarker, RichTextContent, RichTextEditor, TableSection, TaskStatusPresentation, formMessageClassName, useFloatingOverlay, validationControlClassName, type RecordHistoryColumn } from '@/components/ui'
import type { InfrastructureMaintenanceRecurrence, InfrastructureMaintenanceTask, InfrastructureMaintenanceTaskStatus, ReferenceDataRecord } from '@/data/seed.types'
import {
  ADD_NEW_REFERENCE_OPTION,
  commitInfrastructureMaintenanceTask,
  createInfrastructureMaintenanceTask,
  generateInfrastructureMaintenanceOccurrences,
  infrastructureMaintenanceAssignedResources,
  infrastructureMaintenanceAlert,
  infrastructureMaintenanceTaskTypes,
  infrastructureReferenceDataLabel,
  INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS,
  recurrenceSummary,
} from '@/domain/infrastructure-item'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { handleDateInputPaste } from '@/utils/date-input'

interface InfrastructureMaintenanceGridProps {
  tasks: InfrastructureMaintenanceTask[]
  onChange: (tasks: InfrastructureMaintenanceTask[]) => void
  referenceData: ReferenceDataRecord[]
  onAddTaskType: (label: string) => { ok: boolean; message: string; record?: ReferenceDataRecord }
  onAddAssignedResource: (label: string) => { ok: boolean; message: string; record?: ReferenceDataRecord }
  readOnly?: boolean
}

function normalizedTask(record: InfrastructureMaintenanceTask) {
  return {
    taskTypeRefId: record.taskTypeRefId,
    task: record.task,
    startDate: record.startDate ?? null,
    dueDate: record.dueDate ?? null,
    assignedResourceRefId: record.assignedResourceRefId,
    taskStatus: record.taskStatus,
    recurrence: record.recurrence,
  }
}

function alertBadge(task: InfrastructureMaintenanceTask) {
  const alert = infrastructureMaintenanceAlert(task)
  if (!alert) return null
  return <MaintenanceStatusPresentation status={alert} />
}

const WEEKDAYS: Array<NonNullable<InfrastructureMaintenanceRecurrence['weeklyWeekdays']>[number]> = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const WEEKDAY_LABELS: Record<NonNullable<InfrastructureMaintenanceRecurrence['weeklyWeekdays']>[number], string> = {
  sunday: 'Sunday',
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
}

function TaskStatusSelect({ value, onChange }: { value: InfrastructureMaintenanceTaskStatus; onChange: (value: InfrastructureMaintenanceTaskStatus) => void }) {
  const [open, setOpen] = useState(false)
  const { triggerRef, overlayRef, style, containsEventTarget } = useFloatingOverlay<HTMLButtonElement, HTMLSpanElement>(open, {
    matchTriggerWidth: true,
    maxHeight: 224,
  })

  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (containsEventTarget(event.target)) return
      setOpen(false)
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [containsEventTarget, open])

  return (
    <span
      className="inline-block w-40"
      onBlur={(event) => {
        if (containsEventTarget(event.relatedTarget)) return
        setOpen(false)
      }}
    >
      <button ref={triggerRef} type="button" className="flex h-8 w-full items-center justify-between rounded border border-sf-border bg-white px-2 py-1 text-left text-sm" onClick={() => setOpen((current) => !current)}>
        <TaskStatusPresentation status={value} />
        <span className="text-sf-text-muted" aria-hidden="true">v</span>
      </button>
      {open ? createPortal(
        <span ref={overlayRef} className="fixed z-50 block overflow-y-auto rounded border border-sf-border bg-white py-1 shadow-lg" style={style}>
          {INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              className="flex w-full px-2 py-1 text-left hover:bg-sf-surface-alt"
              onClick={() => {
                onChange(status)
                setOpen(false)
              }}
            >
              <TaskStatusPresentation status={status} />
            </button>
          ))}
        </span>,
        document.body,
      ) : null}
    </span>
  )
}

export function InfrastructureMaintenanceGrid({ tasks, onChange, referenceData, onAddTaskType, onAddAssignedResource, readOnly = false }: InfrastructureMaintenanceGridProps) {
  const editor = useEditableChildObjectEditor<InfrastructureMaintenanceTask>()
  const [advancedTaskId, setAdvancedTaskId] = useState<string | null>(null)
  const [advancedDraft, setAdvancedDraft] = useState<InfrastructureMaintenanceTask | null>(null)
  const [advancedErrors, setAdvancedErrors] = useState<string[]>([])
  const permissions = editableChildObjectPermissions({ readOnly })
  const taskTypeOptions = infrastructureMaintenanceTaskTypes(referenceData)
  const assignedResourceOptions = infrastructureMaintenanceAssignedResources(referenceData)
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
    const generationBaseTasks = tasks.filter((task) => task.id !== draft.id)
    const generatedTasks = committedTask.recurrence.frequency !== 'none'
      ? generateInfrastructureMaintenanceOccurrences(committedTask, generationBaseTasks, new Date().toISOString())
      : [committedTask]
    if (isNew) {
      onChange([...tasks, ...generatedTasks])
      return
    }
    const updatedTasks = tasks.map((task) => (task.id === draft.id ? generatedTasks[0] ?? committedTask : task))
    const generatedNewTasks = generatedTasks.slice(1).filter((generatedTask) =>
      !updatedTasks.some((task) =>
        task.recurrenceSeriesId === generatedTask.recurrenceSeriesId &&
        task.recurrenceOccurrenceDate === generatedTask.recurrenceOccurrenceDate,
      ),
    )
    onChange([...updatedTasks, ...generatedNewTasks])
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
    if (!draft.taskTypeRefId) errors.push('Task Type is required.')
    if (draft.startDate && Number.isNaN(new Date(`${draft.startDate}T00:00:00`).valueOf())) errors.push('Start Date is invalid.')
    if (draft.dueDate && Number.isNaN(new Date(`${draft.dueDate}T00:00:00`).valueOf())) errors.push('Due Date is invalid.')
    if (!INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.includes(draft.taskStatus)) errors.push('Task Status is invalid.')
    if (draft.recurrence.frequency !== 'none') {
      const recurrenceStartDate = draft.recurrence.startDate ?? draft.startDate
      if (!recurrenceStartDate) errors.push('Recurrence Start is required.')
      if (draft.recurrence.frequency === 'weekly' && (draft.recurrence.weeklyWeekdays ?? []).length === 0) errors.push('Select at least one recurrence weekday.')
      if (draft.recurrence.endType === 'after' && (!draft.recurrence.endAfterOccurrences || draft.recurrence.endAfterOccurrences <= 0)) errors.push('End After occurrences must be greater than 0.')
      if (draft.recurrence.endType === 'by' && (!draft.recurrence.endByDate || (recurrenceStartDate && draft.recurrence.endByDate < recurrenceStartDate))) errors.push('End By date must be on or after Recurrence Start.')
    }
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

  function changeAssignedResource(taskId: string, value: string) {
    if (value !== ADD_NEW_REFERENCE_OPTION) {
      editor.updateDraft(taskId, { assignedResourceRefId: value })
      return
    }
    const label = window.prompt('Add Infrastructure Maintenance Assigned Resource')
    if (!label) {
      editor.updateDraft(taskId, { assignedResourceRefId: '' })
      return
    }
    const result = onAddAssignedResource(label)
    if (result.ok && result.record) {
      editor.updateDraft(taskId, { assignedResourceRefId: result.record.id })
      return
    }
    window.alert(result.message)
  }

  function saveTask(id: string) {
    editor.save(id, {
      validate: validateTask,
      commit: commitTask,
      normalize: normalizedTask,
      isMeaningfulNewDraft: () => true,
      successMessage: 'Maintenance Task saved.',
    })
  }

  function openAdvancedEdit(task: InfrastructureMaintenanceTask) {
    const current = editor.draftFor(task.id) ?? task
    if (!editor.isEditing(task.id)) editor.beginEdit(task)
    setAdvancedTaskId(task.id)
    setAdvancedDraft(current)
  }

  function updateAdvancedDraft(patch: Partial<InfrastructureMaintenanceTask>) {
    setAdvancedDraft((current) => current ? { ...current, ...patch } : current)
    setAdvancedErrors([])
  }

  function updateAdvancedRecurrence(patch: Partial<InfrastructureMaintenanceRecurrence>) {
    setAdvancedDraft((current) => current ? { ...current, recurrence: { ...current.recurrence, ...patch } } : current)
    setAdvancedErrors([])
  }

  function confirmAdvancedEdit() {
    if (!advancedDraft || !advancedTaskId) return
    const errors = validateTask(advancedDraft)
    if (errors.length > 0) {
      setAdvancedErrors(errors)
      return
    }
    editor.replaceDraft(advancedDraft)
    setAdvancedTaskId(null)
    setAdvancedDraft(null)
    setAdvancedErrors([])
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

  const columns: Array<RecordHistoryColumn<InfrastructureMaintenanceTask>> = [
    {
      key: 'actions',
      label: 'Actions',
      render: (task) => {
        const draft = editor.draftFor(task.id)
        const isEditing = editor.isEditing(task.id)
        const errors = editor.errorsFor(task.id)
        return (
          <>
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
                      <Edit2 className="h-3.5 w-3.5" aria-hidden="true" /> Inline Edit
                    </EditableChildObjectActionButton>
                  ) : null}
                  {permissions.canEdit ? (
                    <EditableChildObjectActionButton onClick={() => openAdvancedEdit(task)}>
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Advanced Edit
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
            {draft && errors.length > 0 ? <div className="mt-2 space-y-1 text-xs text-red-700">{errors.map((error) => <div key={error}>{error}</div>)}</div> : null}
          </>
        )
      },
    },
    {
      key: 'taskId',
      label: 'Task ID',
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        return <BusinessIdLink objectType="INFRASTRUCTURE_MAINTENANCE_TASK" businessId={row.taskId}>{row.taskId}</BusinessIdLink>
      },
      sortValue: (task) => task.taskId,
    },
    {
      key: 'taskType',
      label: <>Task Type<RequiredFieldMarker /></>,
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        const isEditing = editor.isEditing(task.id)
        const errors = editor.errorsFor(task.id)
        return isEditing ? (
          <select
            className={[
              'h-8 w-56 rounded border px-2 py-1 pr-8 text-sm',
              errors.some((error) => error.includes('Task Type')) ? 'border-red-500' : 'border-sf-border',
            ].join(' ')}
            value={row.taskTypeRefId}
            onChange={(event) => changeTaskType(task.id, event.target.value)}
          >
            <option value=""></option>
            {taskTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            <option value={ADD_NEW_REFERENCE_OPTION}>Add New...</option>
          </select>
        ) : infrastructureReferenceDataLabel(referenceData, row.taskTypeRefId) || '-'
      },
      sortValue: (task) => infrastructureReferenceDataLabel(referenceData, task.taskTypeRefId),
    },
    {
      key: 'description',
      label: 'Description',
      className: 'min-w-[24rem] border border-sf-border px-2 py-2 align-top text-sf-text',
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        return editor.isEditing(task.id)
          ? <RichTextEditor value={row.task} onChange={(value) => editor.updateDraft(task.id, { task: value })} minHeightClassName="min-h-24" />
          : <RichTextContent value={row.task} />
      },
      sortValue: (task) => task.task,
    },
    {
      key: 'startDate',
      label: 'Start Date',
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        return editor.isEditing(task.id)
          ? <input type="date" className="h-8 rounded border border-sf-border px-2 py-1 text-sm" value={row.startDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => editor.updateDraft(task.id, { startDate: value }))} onChange={(event) => editor.updateDraft(task.id, { startDate: event.target.value || null })} />
          : <DateTimeValue value={row.startDate} semanticType="date" fallback="-" />
      },
      sortValue: (task) => task.startDate ?? '',
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        return editor.isEditing(task.id)
          ? <input type="date" className="h-8 rounded border border-sf-border px-2 py-1 text-sm" value={row.dueDate ?? ''} onPaste={(event) => handleDateInputPaste(event, (value) => editor.updateDraft(task.id, { dueDate: value }))} onChange={(event) => editor.updateDraft(task.id, { dueDate: event.target.value || null })} />
          : <DateTimeValue value={row.dueDate} semanticType="date" fallback="-" />
      },
      sortValue: (task) => task.dueDate ?? '',
    },
    {
      key: 'assignedResource',
      label: 'Assigned Resource',
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        return editor.isEditing(task.id) ? (
          <select
            className="h-8 w-56 rounded border border-sf-border px-2 py-1 pr-8 text-sm"
            value={row.assignedResourceRefId}
            onChange={(event) => changeAssignedResource(task.id, event.target.value)}
          >
            <option value=""></option>
            {assignedResourceOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            <option value={ADD_NEW_REFERENCE_OPTION}>Add New...</option>
          </select>
        ) : infrastructureReferenceDataLabel(referenceData, row.assignedResourceRefId) || '-'
      },
      sortValue: (task) => infrastructureReferenceDataLabel(referenceData, task.assignedResourceRefId),
    },
    {
      key: 'taskStatus',
      label: 'Task Status',
      render: (task) => {
        const row = editor.draftFor(task.id) ?? task
        return editor.isEditing(task.id)
          ? <TaskStatusSelect value={row.taskStatus} onChange={(taskStatus) => editor.updateDraft(task.id, { taskStatus })} />
          : <TaskStatusPresentation status={row.taskStatus} />
      },
      sortValue: (task) => task.taskStatus,
    },
    {
      key: 'alert',
      label: 'Alert',
      render: (task) => alertBadge(editor.draftFor(task.id) ?? task) ?? '-',
      sortValue: (task) => infrastructureMaintenanceAlert(task) ?? '',
    },
    {
      key: 'recurrence',
      label: 'Recurrence',
      render: (task) => recurrenceSummary((editor.draftFor(task.id) ?? task).recurrence),
      sortValue: (task) => recurrenceSummary(task.recurrence),
    },
  ]

  return (
    <TableSection title="Maintenance">
      {advancedDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded border border-sf-border bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-sf-text">Advanced Edit Maintenance Task</h3>
                <p className="text-xs text-sf-text-muted">Advanced changes stay in the editable row draft until row Save is clicked.</p>
              </div>
              <button type="button" className="rounded border border-sf-border px-2 py-1 text-sm hover:bg-sf-surface-alt" onClick={() => { setAdvancedDraft(null); setAdvancedErrors([]) }}>Close</button>
            </div>

            <div className="space-y-5">
              {advancedErrors.length > 0 ? (
                <div className={formMessageClassName(advancedErrors)}>
                  {advancedErrors.map((error) => <div key={error}>{error}</div>)}
                </div>
              ) : null}
              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase text-sf-text-muted">Task Details</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Task ID</span>
                    <div className="h-9 rounded border border-sf-border bg-sf-surface-alt px-2 py-1.5 text-sf-text-muted">{advancedDraft.taskId}</div>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Task Type<RequiredFieldMarker /></span>
                    <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8" value={advancedDraft.taskTypeRefId} onChange={(event) => updateAdvancedDraft({ taskTypeRefId: event.target.value })}>
                      <option value=""></option>
                      {taskTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Task Status</span>
                    <TaskStatusSelect value={advancedDraft.taskStatus} onChange={(taskStatus) => updateAdvancedDraft({ taskStatus })} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Start Date</span>
                    <input type="date" className="h-9 w-full rounded border border-sf-border px-2 py-1" value={advancedDraft.startDate ?? ''} onChange={(event) => updateAdvancedDraft({ startDate: event.target.value || null })} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Due Date</span>
                    <input type="date" className="h-9 w-full rounded border border-sf-border px-2 py-1" value={advancedDraft.dueDate ?? ''} onChange={(event) => updateAdvancedDraft({ dueDate: event.target.value || null })} />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Assigned Resource</span>
                    <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8" value={advancedDraft.assignedResourceRefId} onChange={(event) => {
                      if (event.target.value === ADD_NEW_REFERENCE_OPTION) {
                        const label = window.prompt('Add Infrastructure Maintenance Assigned Resource')
                        if (!label) return
                        const result = onAddAssignedResource(label)
                        if (result.ok && result.record) updateAdvancedDraft({ assignedResourceRefId: result.record.id })
                        else window.alert(result.message)
                        return
                      }
                      updateAdvancedDraft({ assignedResourceRefId: event.target.value })
                    }}>
                      <option value=""></option>
                      {assignedResourceOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
                      <option value={ADD_NEW_REFERENCE_OPTION}>Add New...</option>
                    </select>
                  </label>
                  <label className="block text-sm md:col-span-3">
                    <span className="mb-1 block font-medium text-sf-text">Description</span>
                    <RichTextEditor value={advancedDraft.task} onChange={(value) => updateAdvancedDraft({ task: value })} minHeightClassName="min-h-24" />
                  </label>
                  <div className="text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Alert</span>
                    {alertBadge(advancedDraft) ?? <span className="text-sf-text-muted">-</span>}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase text-sf-text-muted">Recurrence Pattern</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-sf-text">Repeats</span>
                    <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8" value={advancedDraft.recurrence.frequency} onChange={(event) => updateAdvancedRecurrence({ frequency: event.target.value as InfrastructureMaintenanceRecurrence['frequency'] })}>
                      <option value="none">Does not repeat</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </label>
                  {advancedDraft.recurrence.frequency !== 'none' ? (
                    <>
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-sf-text">Every</span>
                        <BusinessNumericInput value={advancedDraft.recurrence.interval} onChange={(interval) => updateAdvancedRecurrence({ interval: interval ?? 1 })} />
                      </label>
                      {advancedDraft.recurrence.frequency === 'daily' ? (
                        <label className="block text-sm">
                          <span className="mb-1 block font-medium text-sf-text">Daily Mode</span>
                          <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8" value={advancedDraft.recurrence.dailyMode ?? 'interval'} onChange={(event) => updateAdvancedRecurrence({ dailyMode: event.target.value as 'interval' | 'weekday' })}>
                            <option value="interval">Days</option>
                            <option value="weekday">Every weekday</option>
                          </select>
                        </label>
                      ) : null}
                      {advancedDraft.recurrence.frequency === 'weekly' ? (
                        <div className="block text-sm md:col-span-3">
                          <span className="mb-1 block font-medium text-sf-text">Recur every {advancedDraft.recurrence.interval} week(s) on:<RequiredFieldMarker /></span>
                          <div className={['grid grid-cols-2 gap-2 rounded border border-sf-border p-2 md:grid-cols-4', validationControlClassName(advancedErrors.includes('Select at least one recurrence weekday.'))].filter(Boolean).join(' ')}>
                            {WEEKDAYS.map((day) => {
                              const selected = advancedDraft.recurrence.weeklyWeekdays ?? []
                              return (
                                <label key={day} className="inline-flex items-center gap-2 text-sm text-sf-text">
                                  <input
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-sf-border text-sf-brand"
                                    checked={selected.includes(day)}
                                    onChange={() => {
                                      const nextSelected = selected.includes(day)
                                        ? selected.filter((selectedDay) => selectedDay !== day)
                                        : [...selected, day]
                                      updateAdvancedRecurrence({ weeklyWeekdays: nextSelected })
                                    }}
                                  />
                                  <span>{WEEKDAY_LABELS[day]}</span>
                                </label>
                              )
                            })}
                          </div>
                          {advancedErrors.includes('Select at least one recurrence weekday.') ? (
                            <p className="mt-1 text-xs text-red-700">Select at least one weekday.</p>
                          ) : null}
                        </div>
                      ) : null}
                      {advancedDraft.recurrence.frequency === 'monthly' ? (
                        <>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-sf-text">Monthly Mode</span>
                            <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8" value={advancedDraft.recurrence.monthlyMode ?? 'day'} onChange={(event) => updateAdvancedRecurrence({ monthlyMode: event.target.value as InfrastructureMaintenanceRecurrence['monthlyMode'] })}>
                              <option value="day">Day of month</option>
                              <option value="relative">Relative day</option>
                            </select>
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-sf-text">Day</span>
                            <BusinessNumericInput value={advancedDraft.recurrence.monthlyDay} max={31} onChange={(monthlyDay) => updateAdvancedRecurrence({ monthlyDay })} />
                          </label>
                        </>
                      ) : null}
                      {advancedDraft.recurrence.frequency === 'yearly' ? (
                        <>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-sf-text">Month</span>
                            <BusinessNumericInput value={advancedDraft.recurrence.yearlyMonth} max={12} onChange={(yearlyMonth) => updateAdvancedRecurrence({ yearlyMonth })} />
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block font-medium text-sf-text">Day</span>
                            <BusinessNumericInput value={advancedDraft.recurrence.yearlyDay} max={31} onChange={(yearlyDay) => updateAdvancedRecurrence({ yearlyDay })} />
                          </label>
                        </>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </section>

              {advancedDraft.recurrence.frequency !== 'none' ? (
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase text-sf-text-muted">Range of Recurrence</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-sf-text">Recurrence Start<RequiredFieldMarker /></span>
                      <input type="date" className="h-9 w-full rounded border border-sf-border px-2 py-1" value={advancedDraft.recurrence.startDate ?? advancedDraft.startDate ?? ''} onChange={(event) => updateAdvancedRecurrence({ startDate: event.target.value || null })} />
                    </label>
                    <label className="block text-sm">
                      <span className="mb-1 block font-medium text-sf-text">Ends</span>
                      <select className="h-9 w-full rounded border border-sf-border px-2 py-1 pr-8" value={advancedDraft.recurrence.endType} onChange={(event) => updateAdvancedRecurrence({ endType: event.target.value as InfrastructureMaintenanceRecurrence['endType'] })}>
                        <option value="none">No End Date</option>
                        <option value="after">End After</option>
                        <option value="by">End By</option>
                      </select>
                    </label>
                    {advancedDraft.recurrence.endType === 'after' ? (
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-sf-text">Occurrences</span>
                        <BusinessNumericInput value={advancedDraft.recurrence.endAfterOccurrences} onChange={(endAfterOccurrences) => updateAdvancedRecurrence({ endAfterOccurrences })} />
                      </label>
                    ) : null}
                    {advancedDraft.recurrence.endType === 'by' ? (
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-sf-text">End By</span>
                        <input type="date" className="h-9 w-full rounded border border-sf-border px-2 py-1" value={advancedDraft.recurrence.endByDate ?? ''} onChange={(event) => updateAdvancedRecurrence({ endByDate: event.target.value || null })} />
                      </label>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <EditableChildObjectActionButton onClick={() => { setAdvancedDraft(null); setAdvancedErrors([]) }}>
                <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
              </EditableChildObjectActionButton>
              <EditableChildObjectActionButton variant="primary" onClick={confirmAdvancedEdit}>
                <Save className="h-3.5 w-3.5" aria-hidden="true" /> Confirm
              </EditableChildObjectActionButton>
            </div>
          </div>
        </div>
      ) : null}
      {editor.notification ? (
        <div className={editor.notification.tone === 'error' ? 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700' : 'rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700'}>
          {editor.notification.message}
        </div>
      ) : null}
      <RecordHistorySection
        records={renderedTasks}
        columns={columns}
        getRowKey={(task) => task.id}
        getSearchText={(task) => [
          task.taskId,
          infrastructureReferenceDataLabel(referenceData, task.taskTypeRefId),
          task.task,
          infrastructureReferenceDataLabel(referenceData, task.assignedResourceRefId),
          task.taskStatus,
          recurrenceSummary(task.recurrence),
          infrastructureMaintenanceAlert(task) ?? '',
        ].join(' ')}
        getDateValue={(task) => task.startDate}
        dateFilterLabel="Maintenance Start Date"
        emptyText="No records available."
        filteredEmptyText="No matching records."
        searchLabel="Search / Filter"
        searchPlaceholder="Search Maintenance"
        recordsPerPageLabel="Records per page"
        logicalTableType="infrastructure-maintenance"
        logicalTableLabel="Maintenance Tasks"
        actions={actions}
      />
    </TableSection>
  )
}
