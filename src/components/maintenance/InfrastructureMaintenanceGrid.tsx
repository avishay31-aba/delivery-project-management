import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Edit2, Maximize2, Plus, Save, Trash2, X } from 'lucide-react'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import {
  EditableChildObjectActionButton,
  editableChildObjectPermissions,
  useEditableChildObjectEditor,
} from '@/components/child-objects'
import { BusinessIdLink, BusinessNumericInput, MaintenanceStatusPresentation, RecurrenceIndicator, RecordHistorySection, RequiredFieldMarker, RichTextContent, RichTextEditor, TableSection, TaskStatusPresentation, formMessageClassName, useFloatingOverlay, validationControlClassName, type RecordHistoryColumn } from '@/components/ui'
import type { InfrastructureMaintenanceRecurrence, InfrastructureMaintenanceTask, InfrastructureMaintenanceTaskStatus, ReferenceDataRecord } from '@/data/seed.types'
import {
  ADD_NEW_REFERENCE_OPTION,
  commitInfrastructureMaintenanceTask,
  commitInfrastructureMaintenanceOccurrence,
  createInfrastructureMaintenanceTask,
  generateInfrastructureMaintenanceOccurrences,
  infrastructureMaintenanceAssignedResources,
  infrastructureMaintenanceAlert,
  infrastructureMaintenanceTaskBelongsToSeries,
  infrastructureMaintenanceTaskTypes,
  infrastructureReferenceDataLabel,
  INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS,
  MAINTENANCE_RECURRENCE_NUMBER_MAX,
  MAINTENANCE_RECURRENCE_NUMBER_MIN,
  recurrenceSummary,
  updateInfrastructureMaintenanceSeries,
  validateMaintenanceRecurrence,
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

type AdvancedEditScope = 'occurrence' | 'series'

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
const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]
const ORDINAL_OPTIONS: Array<NonNullable<InfrastructureMaintenanceRecurrence['monthlyOrdinal']>> = ['first', 'second', 'third', 'fourth', 'last']
const RECURRENCE_FREQUENCIES: Array<Exclude<InfrastructureMaintenanceRecurrence['frequency'], 'none'>> = ['daily', 'weekly', 'monthly', 'yearly']
const RECURRENCE_FREQUENCY_LABELS: Record<Exclude<InfrastructureMaintenanceRecurrence['frequency'], 'none'>, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
}

function recurrenceDateParts(dateValue: string | null | undefined) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date()
  const safeDate = Number.isNaN(date.valueOf()) ? new Date() : date
  return {
    month: safeDate.getMonth() + 1,
    day: safeDate.getDate(),
    weekday: WEEKDAYS[safeDate.getDay()],
  }
}

function maxDayForRecurrenceMonth(month: number | null | undefined): number {
  return new Date(2024, month || 1, 0).getDate()
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
  const [advancedEditScope, setAdvancedEditScope] = useState<AdvancedEditScope>('occurrence')
  const [scopePromptTaskId, setScopePromptTaskId] = useState<string | null>(null)
  const [scopePromptChoice, setScopePromptChoice] = useState<AdvancedEditScope | null>(null)
  const [pendingEditScopes, setPendingEditScopes] = useState<Record<string, AdvancedEditScope>>({})
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
    setPendingEditScopes({})
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
    if (previous && infrastructureMaintenanceTaskBelongsToSeries(previous)) {
      const scope = pendingEditScopes[draft.id] ?? 'occurrence'
      if (scope === 'series') {
        onChange(updateInfrastructureMaintenanceSeries(draft, tasks, new Date().toISOString(), CURRENT_USER_DISPLAY_NAME))
      } else {
        const definition = tasks.find((task) => task.id === previous.recurrenceDefinitionTaskId) ?? previous
        const occurrence = commitInfrastructureMaintenanceOccurrence(draft, previous, definition, new Date().toISOString(), CURRENT_USER_DISPLAY_NAME)
        onChange(tasks.map((task) => task.id === previous.id ? occurrence : task))
      }
      setPendingEditScopes((current) => {
        const next = { ...current }
        delete next[draft.id]
        return next
      })
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

  function cancelTask(id: string) {
    editor.cancel(id)
    setPendingEditScopes((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function beginInlineEdit(task: InfrastructureMaintenanceTask) {
    setPendingEditScopes((current) => {
      const next = { ...current }
      delete next[task.id]
      return next
    })
    editor.beginEdit(task)
  }

  function validateTask(draft: InfrastructureMaintenanceTask, validateRecurrence = true): string[] {
    const errors: string[] = []
    if (!draft.taskTypeRefId) errors.push('Task Type is required.')
    if (draft.startDate && Number.isNaN(new Date(`${draft.startDate}T00:00:00`).valueOf())) errors.push('Start Date is invalid.')
    if (draft.dueDate && Number.isNaN(new Date(`${draft.dueDate}T00:00:00`).valueOf())) errors.push('Due Date is invalid.')
    if (!INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.includes(draft.taskStatus)) errors.push('Task Status is invalid.')
    if (validateRecurrence && draft.recurrence.frequency !== 'none') {
      errors.push(...validateMaintenanceRecurrence(draft.recurrence, draft.startDate))
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

  function openAdvancedEditWithScope(task: InfrastructureMaintenanceTask, scope: AdvancedEditScope) {
    const current = editor.draftFor(task.id) ?? task
    if (!editor.isEditing(task.id)) editor.beginEdit(task)
    setAdvancedTaskId(task.id)
    if (scope === 'series') {
      const definition = tasks.find((candidate) => candidate.id === task.recurrenceDefinitionTaskId) ?? task
      setAdvancedDraft({
        ...current,
        taskTypeRefId: definition.taskTypeRefId,
        task: definition.task,
        startDate: definition.startDate,
        dueDate: definition.dueDate,
        assignedResourceRefId: definition.assignedResourceRefId,
        taskStatus: definition.taskStatus,
        recurrence: definition.recurrence,
      })
    } else {
      setAdvancedDraft(current)
    }
    setAdvancedEditScope(scope)
  }

  function requestAdvancedEdit(task: InfrastructureMaintenanceTask) {
    if (!infrastructureMaintenanceTaskBelongsToSeries(task)) {
      openAdvancedEditWithScope(task, 'occurrence')
      return
    }
    setScopePromptTaskId(task.id)
    setScopePromptChoice(null)
  }

  function confirmScopePrompt() {
    const task = tasks.find((candidate) => candidate.id === scopePromptTaskId)
    if (!task || !scopePromptChoice) return
    setScopePromptTaskId(null)
    openAdvancedEditWithScope(task, scopePromptChoice)
  }

  function updateAdvancedDraft(patch: Partial<InfrastructureMaintenanceTask>) {
    setAdvancedDraft((current) => current ? { ...current, ...patch } : current)
    setAdvancedErrors([])
  }

  function updateAdvancedRecurrence(patch: Partial<InfrastructureMaintenanceRecurrence>) {
    setAdvancedDraft((current) => current ? { ...current, recurrence: { ...current.recurrence, ...patch } } : current)
    setAdvancedErrors([])
  }

  function changeAdvancedRecurrenceFrequency(frequency: Exclude<InfrastructureMaintenanceRecurrence['frequency'], 'none'>) {
    setAdvancedDraft((current) => {
      if (!current) return current
      const dateParts = recurrenceDateParts(current.recurrence.startDate ?? current.startDate)
      const recurrence = current.recurrence
      const switchingToYearly = frequency === 'yearly' && recurrence.frequency !== 'yearly'
      return {
        ...current,
        recurrence: {
          ...recurrence,
          frequency,
          interval: recurrence.interval || 1,
          startDate: recurrence.startDate ?? current.startDate ?? null,
          endType: recurrence.endType ?? 'none',
          dailyMode: recurrence.dailyMode ?? 'interval',
          weeklyWeekdays: recurrence.weeklyWeekdays?.length ? recurrence.weeklyWeekdays : [dateParts.weekday],
          monthlyMode: recurrence.monthlyMode ?? 'day',
          monthlyDay: recurrence.monthlyDay ?? dateParts.day,
          monthlyOrdinal: recurrence.monthlyOrdinal ?? 'first',
          monthlyRelativeDay: recurrence.monthlyRelativeDay ?? dateParts.weekday,
          yearlyMode: recurrence.yearlyMode ?? 'date',
          yearlyMonth: switchingToYearly ? dateParts.month : recurrence.yearlyMonth ?? dateParts.month,
          yearlyDay: switchingToYearly ? Math.min(dateParts.day, maxDayForRecurrenceMonth(dateParts.month)) : recurrence.yearlyDay ?? Math.min(dateParts.day, maxDayForRecurrenceMonth(recurrence.yearlyMonth ?? dateParts.month)),
          yearlyOrdinal: recurrence.yearlyOrdinal ?? 'first',
          yearlyRelativeDay: recurrence.yearlyRelativeDay ?? dateParts.weekday,
          endAfterOccurrences: recurrence.endAfterOccurrences ?? 10,
        },
      }
    })
    setAdvancedErrors([])
  }

  function setAdvancedRecurrenceEnabled(enabled: boolean) {
    if (!enabled) {
      updateAdvancedRecurrence({ frequency: 'none' })
      return
    }
    changeAdvancedRecurrenceFrequency(advancedDraft?.recurrence.frequency === 'none' ? 'daily' : advancedDraft?.recurrence.frequency ?? 'daily')
  }

  function showAdvancedRecurrenceNumberError(message: string) {
    setAdvancedErrors([message])
  }

  function confirmAdvancedEdit() {
    if (!advancedDraft || !advancedTaskId) return
    const errors = validateTask(advancedDraft, advancedEditScope === 'series' || !infrastructureMaintenanceTaskBelongsToSeries(advancedDraft))
    if (errors.length > 0) {
      setAdvancedErrors(errors)
      return
    }
    editor.replaceDraft(advancedDraft)
    setPendingEditScopes((current) => ({ ...current, [advancedTaskId]: advancedEditScope }))
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
                  <EditableChildObjectActionButton onClick={() => cancelTask(task.id)}>
                    <X className="h-3.5 w-3.5" aria-hidden="true" /> Cancel
                  </EditableChildObjectActionButton>
                  {permissions.canEdit ? (
                    <EditableChildObjectActionButton onClick={() => requestAdvancedEdit(task)}>
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" /> Advanced Edit
                    </EditableChildObjectActionButton>
                  ) : null}
                </>
              ) : (
                <>
                  {permissions.canEdit ? (
                    <EditableChildObjectActionButton onClick={() => beginInlineEdit(task)}>
                      <Edit2 className="h-3.5 w-3.5" aria-hidden="true" /> Inline Edit
                    </EditableChildObjectActionButton>
                  ) : null}
                  {permissions.canEdit ? (
                    <EditableChildObjectActionButton onClick={() => requestAdvancedEdit(task)}>
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
        return (
          <span className="inline-flex items-center gap-2">
            <BusinessIdLink objectType="INFRASTRUCTURE_MAINTENANCE_TASK" businessId={row.taskId}>{row.taskId}</BusinessIdLink>
            <RecurrenceIndicator recurring={infrastructureMaintenanceTaskBelongsToSeries(row)} done={row.taskStatus === 'Done'} />
          </span>
        )
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
      {scopePromptTaskId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded border border-sf-border bg-white p-4 shadow-xl" role="dialog" aria-modal="true" aria-labelledby="maintenance-edit-scope-title">
            <h3 id="maintenance-edit-scope-title" className="text-lg font-semibold text-sf-text">Edit recurring task</h3>
            <p className="mt-1 text-sm text-sf-text-muted">Choose whether this change applies to one occurrence or the complete recurrence series.</p>
            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2 text-sm text-sf-text">
                <input type="radio" name="maintenance-edit-scope" className="h-4 w-4 border-sf-border text-sf-brand" checked={scopePromptChoice === 'occurrence'} onChange={() => setScopePromptChoice('occurrence')} />
                <span>Edit this task</span>
              </label>
              <label className="flex items-center gap-2 text-sm text-sf-text">
                <input type="radio" name="maintenance-edit-scope" className="h-4 w-4 border-sf-border text-sf-brand" checked={scopePromptChoice === 'series'} onChange={() => setScopePromptChoice('series')} />
                <span>Edit entire series</span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <EditableChildObjectActionButton onClick={() => { setScopePromptTaskId(null); setScopePromptChoice(null) }}>Cancel</EditableChildObjectActionButton>
              <EditableChildObjectActionButton variant="primary" disabled={!scopePromptChoice} onClick={confirmScopePrompt}>Continue</EditableChildObjectActionButton>
            </div>
          </div>
        </div>
      ) : null}
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

              <fieldset disabled={advancedEditScope === 'occurrence' && infrastructureMaintenanceTaskBelongsToSeries(advancedDraft)} className={advancedEditScope === 'occurrence' && infrastructureMaintenanceTaskBelongsToSeries(advancedDraft) ? 'space-y-5 opacity-60' : 'space-y-5'} aria-label={advancedEditScope === 'occurrence' ? 'Recurrence settings (read only)' : 'Recurrence settings'}>
              <section className="space-y-3">
                <h4 className="text-sm font-semibold uppercase text-sf-text-muted">Recurrence pattern</h4>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-sf-text">
                    <span className="font-medium">Recurrence:</span>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="maintenance-recurrence-enabled"
                        className="h-4 w-4 border-sf-border text-sf-brand"
                        checked={advancedDraft.recurrence.frequency !== 'none'}
                        onChange={() => setAdvancedRecurrenceEnabled(true)}
                      />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="maintenance-recurrence-enabled"
                        className="h-4 w-4 border-sf-border text-sf-brand"
                        checked={advancedDraft.recurrence.frequency === 'none'}
                        onChange={() => setAdvancedRecurrenceEnabled(false)}
                      />
                      <span>No</span>
                    </label>
                  </div>
                  {advancedDraft.recurrence.frequency !== 'none' ? (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[9rem_1fr]">
                      <div className="space-y-2 border-b border-sf-border pb-3 md:border-b-0 md:border-r md:pb-0 md:pr-4">
                        {RECURRENCE_FREQUENCIES.map((frequency) => (
                          <label key={frequency} className="flex items-center gap-2 text-sm text-sf-text">
                            <input
                              type="radio"
                              name="maintenance-recurrence-frequency"
                              className="h-4 w-4 border-sf-border text-sf-brand"
                              checked={advancedDraft.recurrence.frequency === frequency}
                              onChange={() => changeAdvancedRecurrenceFrequency(frequency)}
                            />
                            <span>{RECURRENCE_FREQUENCY_LABELS[frequency]}</span>
                          </label>
                        ))}
                      </div>
                      <div className="min-h-28 space-y-3 text-sm text-sf-text">
                    {advancedDraft.recurrence.frequency === 'daily' ? (
                      <div className="space-y-3">
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="radio"
                            name="maintenance-recurrence-daily-mode"
                            className="h-4 w-4 border-sf-border text-sf-brand"
                            checked={(advancedDraft.recurrence.dailyMode ?? 'interval') === 'interval'}
                            onChange={() => updateAdvancedRecurrence({ dailyMode: 'interval' })}
                          />
                          <span>Every</span>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.interval}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={MAINTENANCE_RECURRENCE_NUMBER_MAX}
                            label="Recurrence interval"
                            disabled={(advancedDraft.recurrence.dailyMode ?? 'interval') !== 'interval'}
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(interval) => updateAdvancedRecurrence({ interval: interval ?? 1 })}
                          />
                          <span>day(s)</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="maintenance-recurrence-daily-mode"
                            className="h-4 w-4 border-sf-border text-sf-brand"
                            checked={(advancedDraft.recurrence.dailyMode ?? 'interval') === 'weekday'}
                            onChange={() => updateAdvancedRecurrence({ dailyMode: 'weekday' })}
                          />
                          <span>Every weekday</span>
                        </label>
                      </div>
                    ) : null}
                    {advancedDraft.recurrence.frequency === 'weekly' ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Recur every</span>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.interval}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={MAINTENANCE_RECURRENCE_NUMBER_MAX}
                            label="Recurrence interval"
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(interval) => updateAdvancedRecurrence({ interval: interval ?? 1 })}
                          />
                          <span>week(s) on:<RequiredFieldMarker /></span>
                        </div>
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
                          <p className="text-xs text-red-700">Select at least one weekday.</p>
                        ) : null}
                      </div>
                    ) : null}
                    {advancedDraft.recurrence.frequency === 'monthly' ? (
                      <div className="space-y-3">
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="radio"
                            name="maintenance-recurrence-monthly-mode"
                            className="h-4 w-4 border-sf-border text-sf-brand"
                            checked={(advancedDraft.recurrence.monthlyMode ?? 'day') === 'day'}
                            onChange={() => updateAdvancedRecurrence({ monthlyMode: 'day' })}
                          />
                          <span>Day</span>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.monthlyDay}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={31}
                            label="Monthly day"
                            disabled={(advancedDraft.recurrence.monthlyMode ?? 'day') !== 'day'}
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(monthlyDay) => updateAdvancedRecurrence({ monthlyDay })}
                          />
                          <span>of every</span>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.interval}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={MAINTENANCE_RECURRENCE_NUMBER_MAX}
                            label="Monthly interval"
                            disabled={(advancedDraft.recurrence.monthlyMode ?? 'day') !== 'day'}
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(interval) => updateAdvancedRecurrence({ interval: interval ?? 1 })}
                          />
                          <span>month(s)</span>
                        </label>
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="radio"
                            name="maintenance-recurrence-monthly-mode"
                            className="h-4 w-4 border-sf-border text-sf-brand"
                            checked={(advancedDraft.recurrence.monthlyMode ?? 'day') === 'relative'}
                            onChange={() => updateAdvancedRecurrence({ monthlyMode: 'relative' })}
                          />
                          <span>The</span>
                          <select
                            className="h-9 rounded border border-sf-border px-2 py-1 pr-8 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                            value={advancedDraft.recurrence.monthlyOrdinal ?? 'first'}
                            disabled={(advancedDraft.recurrence.monthlyMode ?? 'day') !== 'relative'}
                            onChange={(event) => updateAdvancedRecurrence({ monthlyOrdinal: event.target.value as InfrastructureMaintenanceRecurrence['monthlyOrdinal'] })}
                          >
                            {ORDINAL_OPTIONS.map((ordinal) => <option key={ordinal} value={ordinal}>{ordinal}</option>)}
                          </select>
                          <select
                            className="h-9 rounded border border-sf-border px-2 py-1 pr-8 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                            value={advancedDraft.recurrence.monthlyRelativeDay ?? 'monday'}
                            disabled={(advancedDraft.recurrence.monthlyMode ?? 'day') !== 'relative'}
                            onChange={(event) => updateAdvancedRecurrence({ monthlyRelativeDay: event.target.value as InfrastructureMaintenanceRecurrence['monthlyRelativeDay'] })}
                          >
                            {WEEKDAYS.map((day) => <option key={day} value={day}>{WEEKDAY_LABELS[day]}</option>)}
                          </select>
                          <span>of every</span>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.interval}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={MAINTENANCE_RECURRENCE_NUMBER_MAX}
                            label="Monthly interval"
                            disabled={(advancedDraft.recurrence.monthlyMode ?? 'day') !== 'relative'}
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(interval) => updateAdvancedRecurrence({ interval: interval ?? 1 })}
                          />
                          <span>month(s)</span>
                        </label>
                      </div>
                    ) : null}
                    {advancedDraft.recurrence.frequency === 'yearly' ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Recur every</span>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.interval}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={MAINTENANCE_RECURRENCE_NUMBER_MAX}
                            label="Recurrence interval"
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(interval) => updateAdvancedRecurrence({ interval: interval ?? 1 })}
                          />
                          <span>year(s)</span>
                        </div>
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="radio"
                            name="maintenance-recurrence-yearly-mode"
                            className="h-4 w-4 border-sf-border text-sf-brand"
                            checked={(advancedDraft.recurrence.yearlyMode ?? 'date') === 'date'}
                            onChange={() => updateAdvancedRecurrence({ yearlyMode: 'date' })}
                          />
                          <span>On:</span>
                          <select
                            className="h-9 rounded border border-sf-border px-2 py-1 pr-8 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                            value={advancedDraft.recurrence.yearlyMonth ?? recurrenceDateParts(advancedDraft.recurrence.startDate ?? advancedDraft.startDate).month}
                            disabled={(advancedDraft.recurrence.yearlyMode ?? 'date') !== 'date'}
                            onChange={(event) => {
                              const yearlyMonth = Number(event.target.value)
                              updateAdvancedRecurrence({
                                yearlyMonth,
                                yearlyDay: Math.min(advancedDraft.recurrence.yearlyDay ?? 1, maxDayForRecurrenceMonth(yearlyMonth)),
                              })
                            }}
                          >
                            {MONTH_OPTIONS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                          </select>
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.yearlyDay}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={maxDayForRecurrenceMonth(advancedDraft.recurrence.yearlyMonth)}
                            label="Yearly day"
                            disabled={(advancedDraft.recurrence.yearlyMode ?? 'date') !== 'date'}
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(yearlyDay) => updateAdvancedRecurrence({ yearlyDay })}
                          />
                        </label>
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="radio"
                            name="maintenance-recurrence-yearly-mode"
                            className="h-4 w-4 border-sf-border text-sf-brand"
                            checked={(advancedDraft.recurrence.yearlyMode ?? 'date') === 'relative'}
                            onChange={() => updateAdvancedRecurrence({ yearlyMode: 'relative' })}
                          />
                          <span>On the:</span>
                          <select
                            className="h-9 rounded border border-sf-border px-2 py-1 pr-8 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                            value={advancedDraft.recurrence.yearlyOrdinal ?? 'first'}
                            disabled={(advancedDraft.recurrence.yearlyMode ?? 'date') !== 'relative'}
                            onChange={(event) => updateAdvancedRecurrence({ yearlyOrdinal: event.target.value as InfrastructureMaintenanceRecurrence['yearlyOrdinal'] })}
                          >
                            {ORDINAL_OPTIONS.map((ordinal) => <option key={ordinal} value={ordinal}>{ordinal}</option>)}
                          </select>
                          <select
                            className="h-9 rounded border border-sf-border px-2 py-1 pr-8 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                            value={advancedDraft.recurrence.yearlyRelativeDay ?? 'monday'}
                            disabled={(advancedDraft.recurrence.yearlyMode ?? 'date') !== 'relative'}
                            onChange={(event) => updateAdvancedRecurrence({ yearlyRelativeDay: event.target.value as InfrastructureMaintenanceRecurrence['yearlyRelativeDay'] })}
                          >
                            {WEEKDAYS.map((day) => <option key={day} value={day}>{WEEKDAY_LABELS[day]}</option>)}
                          </select>
                          <span>of</span>
                          <select
                            className="h-9 rounded border border-sf-border px-2 py-1 pr-8 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                            value={advancedDraft.recurrence.yearlyMonth ?? recurrenceDateParts(advancedDraft.recurrence.startDate ?? advancedDraft.startDate).month}
                            disabled={(advancedDraft.recurrence.yearlyMode ?? 'date') !== 'relative'}
                            onChange={(event) => updateAdvancedRecurrence({ yearlyMonth: Number(event.target.value) })}
                          >
                            {MONTH_OPTIONS.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
                          </select>
                        </label>
                      </div>
                    ) : null}
                      </div>
                    </div>
                  ) : null}
                  </div>
              </section>

              {advancedDraft.recurrence.frequency !== 'none' ? (
                <section className="space-y-3">
                  <h4 className="text-sm font-semibold uppercase text-sf-text-muted">Range of recurrence</h4>
                  <div className="grid grid-cols-[auto_auto] items-start justify-start gap-x-10 text-sm text-sf-text">
                    <label className="grid grid-cols-[auto_10rem] items-center gap-2">
                      <span className="font-medium">Start:<RequiredFieldMarker /></span>
                      <input type="date" className="h-9 w-40 rounded border border-sf-border px-2 py-1" value={advancedDraft.recurrence.startDate ?? advancedDraft.startDate ?? ''} onChange={(event) => updateAdvancedRecurrence({ startDate: event.target.value || null })} />
                    </label>
                    <div className="grid grid-cols-[1rem_auto_10rem] items-center gap-x-2 gap-y-3">
                      <label className="contents">
                        <input
                          type="radio"
                          name="maintenance-recurrence-end-type"
                          className="h-4 w-4 border-sf-border text-sf-brand"
                          checked={advancedDraft.recurrence.endType === 'by'}
                          onChange={() => updateAdvancedRecurrence({ endType: 'by' })}
                        />
                        <span>End by:</span>
                        <input
                          type="date"
                          className="h-9 w-40 rounded border border-sf-border px-2 py-1 disabled:bg-sf-surface-alt disabled:text-sf-text-muted"
                          value={advancedDraft.recurrence.endByDate ?? ''}
                          disabled={advancedDraft.recurrence.endType !== 'by'}
                          onChange={(event) => updateAdvancedRecurrence({ endByDate: event.target.value || null })}
                        />
                      </label>
                      <label className="contents">
                        <input
                          type="radio"
                          name="maintenance-recurrence-end-type"
                          className="h-4 w-4 border-sf-border text-sf-brand"
                          checked={advancedDraft.recurrence.endType === 'after'}
                          onChange={() => updateAdvancedRecurrence({ endType: 'after', endAfterOccurrences: advancedDraft.recurrence.endAfterOccurrences ?? 10 })}
                        />
                        <span>End after:</span>
                        <span className="flex items-center gap-2">
                          <BusinessNumericInput
                            value={advancedDraft.recurrence.endAfterOccurrences}
                            min={MAINTENANCE_RECURRENCE_NUMBER_MIN}
                            max={MAINTENANCE_RECURRENCE_NUMBER_MAX}
                            label="End After occurrences"
                            disabled={advancedDraft.recurrence.endType !== 'after'}
                            onInvalidValue={showAdvancedRecurrenceNumberError}
                            onChange={(endAfterOccurrences) => updateAdvancedRecurrence({ endAfterOccurrences })}
                          />
                          <span>occurrences</span>
                        </span>
                      </label>
                      <label className="contents">
                        <input
                          type="radio"
                          name="maintenance-recurrence-end-type"
                          className="h-4 w-4 border-sf-border text-sf-brand"
                          checked={advancedDraft.recurrence.endType === 'none'}
                          onChange={() => updateAdvancedRecurrence({ endType: 'none' })}
                        />
                        <span>No end date</span>
                        <span />
                      </label>
                    </div>
                  </div>
                </section>
              ) : null}
              </fieldset>
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
        initialSort={{ key: 'startDate', direction: 'desc' }}
        logicalTableType="infrastructure-maintenance"
        logicalTableLabel="Maintenance Tasks"
        actions={actions}
      />
    </TableSection>
  )
}
