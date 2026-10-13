import type { AppDataState, ReminderExecutionRecord, ReminderSourceType } from '@/data/seed.types'
import type { BusinessObjectReference, BusinessObjectType } from '@/domain/business-reference'
import { systemBusinessId } from '@/domain/business-reference'
import { linkedOpportunityForProject } from '@/domain/opportunity-lifecycle'
import {
  buildProjectMilestonesAndTasks,
  orderedProjectTasks,
  projectMilestonePlanMatchesTemplate,
  resolveProjectMilestoneTemplate,
} from '@/domain/milestone-plan'

export type ReminderStatus = 'PENDING' | 'EXECUTED'
export type ReminderUrgency = 'OVERDUE' | 'DUE_SOON' | 'FUTURE'

export interface ReminderReadModelRow {
  id: string
  sourceKey: string
  sourceType: ReminderSourceType
  sourceId: string
  sourceLabel: string
  parentObjectType: BusinessObjectType
  parentObjectId: string
  parentBusinessId: string
  parentLabel: string
  parentReference: BusinessObjectReference
  dueDate: string
  status: ReminderStatus
  urgency: ReminderUrgency
  message: string
  owner: string
  executedAt: string | null
  executedBy: string | null
  externalEventId?: string | null
  externalSyncState?: ReminderExecutionRecord['externalSyncState']
}

type ReminderCandidate = Omit<ReminderReadModelRow, 'id' | 'status' | 'urgency' | 'executedAt' | 'executedBy' | 'externalEventId' | 'externalSyncState'>

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function dateOnly(value: string | null | undefined): string {
  const rendered = text(value).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rendered)) return ''
  const parsed = new Date(`${rendered}T00:00:00`)
  return Number.isNaN(parsed.valueOf()) ? '' : rendered
}

function stripRichText(value: string): string {
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function sourceKey(sourceType: ReminderSourceType, parentObjectType: BusinessObjectType, parentId: string, sourceId: string): string {
  return `${sourceType}:${parentObjectType}:${parentId}:${sourceId}`
}

export function reminderExecutionIdForSource(sourceKeyValue: string): string {
  return `reminder-execution-${sourceKeyValue.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLocaleLowerCase()}`
}

function routeForParent(objectType: BusinessObjectType, businessId: string): string {
  if (objectType === 'PROJECT') return `/projects/${businessId}?mode=view`
  if (objectType === 'SYSTEM') return `/systems/${businessId}?mode=view`
  if (objectType === 'TENANT') return `/tenants/${businessId}?mode=view`
  if (objectType === 'INFRASTRUCTURE_ITEM') return `/infrastructure/${businessId}?mode=view`
  if (objectType === 'OPPORTUNITY') return `/opportunities/${businessId}?mode=view`
  if (objectType === 'ACCOUNT') return `/customers/${businessId}?mode=view`
  return ''
}

function parentReference(objectType: BusinessObjectType, parentId: string, businessId: string, label: string): BusinessObjectReference {
  return {
    objectType,
    internalId: parentId,
    businessId,
    displayLabel: label,
    routePath: routeForParent(objectType, businessId),
    isMissing: false,
    isStale: false,
  }
}

function candidate(input: {
  sourceType: ReminderSourceType
  sourceId: string
  sourceLabel: string
  parentObjectType: BusinessObjectType
  parentObjectId: string
  parentBusinessId: string
  parentLabel: string
  dueDate: string | null | undefined
  message: string
  owner?: string | null
}): ReminderCandidate | null {
  if (!isAuthorizedReminderSource(input.sourceType, input.parentObjectType)) return null
  const dueDate = dateOnly(input.dueDate)
  if (!dueDate) return null
  const key = sourceKey(input.sourceType, input.parentObjectType, input.parentObjectId, input.sourceId)
  const parent = parentReference(input.parentObjectType, input.parentObjectId, input.parentBusinessId, input.parentLabel)
  return {
    sourceKey: key,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceLabel: input.sourceLabel,
    parentObjectType: input.parentObjectType,
    parentObjectId: input.parentObjectId,
    parentBusinessId: input.parentBusinessId,
    parentLabel: input.parentLabel,
    parentReference: parent,
    dueDate,
    message: stripRichText(input.message) || input.sourceLabel,
    owner: text(input.owner) || '-',
  }
}

function urgencyFor(dueDate: string, now: Date): ReminderUrgency {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(`${dueDate}T00:00:00`)
  const days = Math.floor((due.valueOf() - today.valueOf()) / 86_400_000)
  if (days < 0) return 'OVERDUE'
  if (days < 30) return 'DUE_SOON'
  return 'FUTURE'
}

function normalizeExecutions(executions: ReminderExecutionRecord[]): Map<string, ReminderExecutionRecord> {
  const bySource = new Map<string, ReminderExecutionRecord>()
  executions.forEach((execution) => {
    if (!execution.sourceKey) return
    bySource.set(execution.sourceKey, execution)
  })
  return bySource
}

function isAuthorizedReminderSource(sourceType: ReminderSourceType, parentObjectType: string): boolean {
  return (
    (sourceType === 'PROJECT_TASK' && parentObjectType === 'PROJECT') ||
    (sourceType === 'REMARK' && (parentObjectType === 'SYSTEM' || parentObjectType === 'TENANT'))
  )
}

function remarkCandidates(state: Pick<AppDataState, 'systems' | 'productionSystemInventory' | 'reusedInternalSystems' | 'tenants'>): ReminderCandidate[] {
  const rows: Array<ReminderCandidate | null> = []
  state.systems.forEach((system) => {
    const sid = systemBusinessId(system)
    ;(system.remarks ?? []).forEach((remark) => rows.push(candidate({
      sourceType: 'REMARK',
      sourceId: remark.id,
      sourceLabel: remark.remarkId,
      parentObjectType: 'SYSTEM',
      parentObjectId: system.id,
      parentBusinessId: sid,
      parentLabel: `System ${sid}`,
      dueDate: remark.dueDate,
      message: remark.content,
      owner: remark.author,
    })))
  })
  state.productionSystemInventory.forEach((system) => {
    ;(system.remarks ?? []).forEach((remark) => rows.push(candidate({
      sourceType: 'REMARK',
      sourceId: remark.id,
      sourceLabel: remark.remarkId,
      parentObjectType: 'SYSTEM',
      parentObjectId: system.id,
      parentBusinessId: system.sid,
      parentLabel: `System ${system.sid}`,
      dueDate: remark.dueDate,
      message: remark.content,
      owner: remark.author,
    })))
  })
  state.reusedInternalSystems.forEach((system) => {
    ;(system.remarks ?? []).forEach((remark) => rows.push(candidate({
      sourceType: 'REMARK',
      sourceId: remark.id,
      sourceLabel: remark.remarkId,
      parentObjectType: 'SYSTEM',
      parentObjectId: system.id,
      parentBusinessId: system.machineId,
      parentLabel: `RIS ${system.machineId}`,
      dueDate: remark.dueDate,
      message: remark.content,
      owner: remark.author,
    })))
  })
  state.tenants.forEach((tenant) => {
    ;(tenant.remarks ?? []).forEach((remark) => rows.push(candidate({
      sourceType: 'REMARK',
      sourceId: remark.id,
      sourceLabel: remark.remarkId,
      parentObjectType: 'TENANT',
      parentObjectId: tenant.id,
      parentBusinessId: tenant.tid,
      parentLabel: `Tenant ${tenant.tid}`,
      dueDate: remark.dueDate,
      message: remark.content,
      owner: remark.author,
    })))
  })
  return rows.filter((row): row is ReminderCandidate => Boolean(row))
}

function projectWithDisplayedTaskPlan(project: AppDataState['projects'][number], opportunities: AppDataState['opportunities']) {
  const linkedOpportunity = linkedOpportunityForProject(project, opportunities)
  const resolution = resolveProjectMilestoneTemplate(project, linkedOpportunity)
  if (project.milestoneTemplateId === resolution.templateId && projectMilestonePlanMatchesTemplate(project, resolution.templateId)) {
    return project
  }
  const templateData = buildProjectMilestonesAndTasks(resolution.templateId)
  return {
    ...project,
    milestoneTemplateId: resolution.templateId,
    milestones: templateData.milestones,
    tasks: templateData.tasks,
  }
}

function taskCandidates(state: Pick<AppDataState, 'projects' | 'opportunities'>): ReminderCandidate[] {
  const rows: Array<ReminderCandidate | null> = []
  state.projects.forEach((project) => {
    const displayedProject = projectWithDisplayedTaskPlan(project, state.opportunities)
    orderedProjectTasks(displayedProject).forEach((task) => rows.push(candidate({
      sourceType: 'PROJECT_TASK',
      sourceId: task.id,
      sourceLabel: task.name,
      parentObjectType: 'PROJECT',
      parentObjectId: project.id,
      parentBusinessId: project.pid,
      parentLabel: `Project ${project.pid}`,
      dueDate: task.deadline,
      message: task.comment || task.name,
      owner: task.resource,
    })))
  })
  return rows.filter((row): row is ReminderCandidate => Boolean(row))
}

export function deriveReminderRows(
  state: Pick<AppDataState,
    | 'projects'
    | 'systems'
    | 'productionSystemInventory'
    | 'reusedInternalSystems'
    | 'tenants'
    | 'opportunities'
    | 'reminderExecutions'
  >,
  now = new Date(),
): ReminderReadModelRow[] {
  const candidates = [...remarkCandidates(state), ...taskCandidates(state)]
  const byExecution = normalizeExecutions(state.reminderExecutions ?? [])
  const rows = candidates.map((item): ReminderReadModelRow => {
    const execution = byExecution.get(item.sourceKey)
    const isExecuted = Boolean(execution?.executedAt)
    return {
      ...item,
      id: item.sourceKey,
      status: isExecuted ? 'EXECUTED' : 'PENDING',
      urgency: urgencyFor(item.dueDate, now),
      executedAt: execution?.executedAt ?? null,
      executedBy: execution?.executedBy ?? null,
      externalEventId: execution?.externalEventId ?? null,
      externalSyncState: execution?.externalSyncState ?? null,
    }
  })
  return rows.sort((first, second) => first.dueDate.localeCompare(second.dueDate) || first.parentBusinessId.localeCompare(second.parentBusinessId))
}

export function normalizeReminderExecutions(values: unknown): ReminderExecutionRecord[] {
  if (!Array.isArray(values)) return []
  return values.flatMap((value): ReminderExecutionRecord[] => {
    if (!value || typeof value !== 'object') return []
    const record = value as Partial<ReminderExecutionRecord>
    const sourceKeyValue = text(record.sourceKey)
    const sourceId = text(record.sourceId)
    const parentObjectType = text(record.parentObjectType)
    const parentObjectId = text(record.parentObjectId)
    const parentBusinessId = text(record.parentBusinessId)
    if (!sourceKeyValue || !sourceId || !parentObjectType || !parentObjectId || !parentBusinessId) return []
    return [{
      id: text(record.id) || reminderExecutionIdForSource(sourceKeyValue),
      sourceKey: sourceKeyValue,
      sourceType: record.sourceType ?? 'REMARK',
      sourceId,
      parentObjectType,
      parentObjectId,
      parentBusinessId,
      executedAt: text(record.executedAt) || null,
      executedBy: text(record.executedBy) || null,
      sourceDueDateAtExecution: dateOnly(record.sourceDueDateAtExecution) || null,
      restoredAt: text(record.restoredAt) || null,
      restoredBy: text(record.restoredBy) || null,
      externalEventId: text(record.externalEventId) || null,
      externalSyncState: record.externalSyncState === 'SYNCED' || record.externalSyncState === 'ERROR' ? record.externalSyncState : 'NOT_SYNCED',
      externalSyncedAt: text(record.externalSyncedAt) || null,
      createdAt: text(record.createdAt) || new Date().toISOString(),
      updatedAt: text(record.updatedAt) || new Date().toISOString(),
    }]
  })
}
