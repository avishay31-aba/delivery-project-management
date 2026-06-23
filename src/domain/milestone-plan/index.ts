import type { ProgressStatus, Project } from '@/data/seed.types'
import {
  PROJECT_MILESTONE_TASK_TEMPLATES,
  buildProjectMilestonesAndTasks,
  resolveProjectMilestoneTemplate,
} from '@/config/project-milestone-templates'

export { PROJECT_MILESTONE_TASK_TEMPLATES, buildProjectMilestonesAndTasks, resolveProjectMilestoneTemplate }

export type MilestonePlan = Pick<Project, 'milestones' | 'tasks'>
export type ProjectMilestone = NonNullable<Project['milestones']>[number]
export type ProjectTask = NonNullable<Project['tasks']>[number]

export interface ProjectProgressSummary {
  lastMilestone: string
  currentMilestone: string
  percent: number
}

export type MilestoneDeadlineAlertStatus = 'NONE' | 'WARNING' | 'OVERDUE'

export function orderedProjectMilestones(project: MilestonePlan): ProjectMilestone[] {
  return [...(project.milestones ?? [])].sort((first, second) => first.order - second.order || first.name.localeCompare(second.name))
}

export function normalizeProjectMilestone(milestone: ProjectMilestone): ProjectMilestone {
  return {
    ...milestone,
    deadline: milestone.deadline ?? null,
    comment: milestone.comment ?? '',
  }
}

export function normalizeProjectTask(task: ProjectTask): ProjectTask {
  return {
    ...task,
    deadline: task.deadline ?? null,
    comment: task.comment ?? '',
  }
}

export function normalizeMilestonePlanProject<T extends MilestonePlan>(project: T): T {
  return {
    ...project,
    milestones: project.milestones?.map(normalizeProjectMilestone),
    tasks: project.tasks?.map(normalizeProjectTask),
  }
}

export function orderedProjectTasks(project: MilestonePlan): ProjectTask[] {
  const milestoneOrder = new Map(orderedProjectMilestones(project).map((milestone, index) => [milestone.id, index]))
  return [...(project.tasks ?? [])].sort((first, second) => {
    const milestoneCompare = (milestoneOrder.get(first.milestoneId) ?? 0) - (milestoneOrder.get(second.milestoneId) ?? 0)
    return milestoneCompare || first.order - second.order
  })
}

export function projectMilestoneStatus(project: MilestonePlan, milestoneId: string): ProgressStatus {
  const tasks = project.tasks?.filter((task) => task.milestoneId === milestoneId) ?? []
  if (tasks.length === 0) return 'OPEN'
  const doneCount = tasks.filter((task) => task.status === 'DONE').length
  if (doneCount === 0) return 'OPEN'
  if (doneCount === tasks.length) return 'DONE'
  return 'IN_PROGRESS'
}

export function projectMilestoneTaskProgress(project: MilestonePlan, milestoneId: string): number {
  const tasks = project.tasks?.filter((task) => task.milestoneId === milestoneId) ?? []
  if (tasks.length === 0) return 0
  return Math.round((tasks.filter((task) => task.status === 'DONE').length / tasks.length) * 100)
}

function dateOnlyTimestamp(value: string): number | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day).getTime()
}

function todayTimestamp(today = new Date()): number {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

export function milestoneDeadlineAlertStatus(
  deadline: string | null | undefined,
  status: ProgressStatus,
  today = new Date(),
): MilestoneDeadlineAlertStatus {
  if (!deadline || status === 'DONE') return 'NONE'

  const deadlineTimestamp = dateOnlyTimestamp(deadline)
  if (deadlineTimestamp === null) return 'NONE'

  const daysUntilDeadline = Math.ceil((deadlineTimestamp - todayTimestamp(today)) / 86_400_000)
  if (daysUntilDeadline < 0) return 'OVERDUE'
  if (daysUntilDeadline < 90) return 'WARNING'
  return 'NONE'
}

export function milestoneDeadlineAlertLabel(status: MilestoneDeadlineAlertStatus): string {
  if (status === 'OVERDUE') return 'Overdue'
  if (status === 'WARNING') return 'Due in less than 90 days'
  return ''
}

export function deriveProjectProgress(project: MilestonePlan): ProjectProgressSummary {
  const milestones = orderedProjectMilestones(project)
  if (milestones.length === 0) return { lastMilestone: '', currentMilestone: '', percent: 0 }

  const statuses = milestones.map((milestone) => projectMilestoneStatus(project, milestone.id))
  const lastDoneIndex = statuses.reduce((lastIndex, status, index) => (status === 'DONE' ? index : lastIndex), -1)
  const currentIndex = statuses.findIndex((status) => status === 'OPEN' || status === 'IN_PROGRESS')
  const doneCount = statuses.filter((status) => status === 'DONE').length

  return {
    lastMilestone: lastDoneIndex >= 0 ? milestones[lastDoneIndex].name : '',
    currentMilestone: currentIndex >= 0 ? milestones[currentIndex].name : '',
    percent: Math.round((doneCount / milestones.length) * 100),
  }
}

function clampOrder(order: number, itemCount: number): number {
  if (!Number.isFinite(order)) return itemCount
  return Math.min(Math.max(Math.trunc(order), 1), Math.max(itemCount, 1))
}

function reorderItems<T extends { id: string; order: number }>(items: T[], itemId: string, targetOrder: number): T[] {
  const orderedItems = [...items].sort((first, second) => first.order - second.order || first.id.localeCompare(second.id))
  const currentIndex = orderedItems.findIndex((item) => item.id === itemId)
  if (currentIndex < 0) {
    return orderedItems.map((item, index) => ({ ...item, order: index + 1 }))
  }

  const [movingItem] = orderedItems.splice(currentIndex, 1)
  orderedItems.splice(clampOrder(targetOrder, orderedItems.length + 1) - 1, 0, movingItem)
  return orderedItems.map((item, index) => ({ ...item, order: index + 1 }))
}

export function normalizeMilestoneOrdersInPlan(project: Project): Project {
  return {
    ...project,
    milestones: reorderItems(project.milestones ?? [], '', Number.NaN),
    tasks: (project.tasks ?? []).map((task) => ({ ...task })),
  }
}

export function updateMilestoneOrderInPlan(project: Project, milestoneId: string, order: number): Project {
  return {
    ...project,
    milestones: reorderItems(project.milestones ?? [], milestoneId, order),
  }
}

export function updateTaskOrderInPlan(project: Project, taskId: string, order: number): Project {
  const task = project.tasks?.find((candidate) => candidate.id === taskId)
  if (!task) return project

  const taskGroup = (project.tasks ?? []).filter((candidate) => candidate.milestoneId === task.milestoneId)
  const reorderedTaskGroup = reorderItems(taskGroup, taskId, order)
  const taskById = new Map(reorderedTaskGroup.map((candidate) => [candidate.id, candidate]))

  return {
    ...project,
    tasks: (project.tasks ?? []).map((candidate) => taskById.get(candidate.id) ?? candidate),
  }
}

export function updateTaskInPlan(project: Project, taskId: string, patch: Partial<ProjectTask>): Project {
  const tasks = (project.tasks ?? []).map((task) =>
    task.id === taskId ? { ...task, ...patch } : task,
  )
  const nextProject = { ...project, tasks }

  return {
    ...nextProject,
    milestones: (project.milestones ?? []).map((milestone) => ({
      ...milestone,
      status: projectMilestoneStatus(nextProject, milestone.id),
    })),
  }
}

export function updateTasksStatusInPlan(project: Project, taskIds: string[], status: ProjectTask['status']): Project {
  const selectedTaskIds = new Set(taskIds)
  if (selectedTaskIds.size === 0) return project

  const tasks = (project.tasks ?? []).map((task) =>
    selectedTaskIds.has(task.id) ? { ...task, status } : task,
  )
  const nextProject = { ...project, tasks }

  return {
    ...nextProject,
    milestones: (project.milestones ?? []).map((milestone) => ({
      ...milestone,
      status: projectMilestoneStatus(nextProject, milestone.id),
    })),
  }
}

export function markTasksDoneInPlan(project: Project, taskIds: string[]): Project {
  return updateTasksStatusInPlan(project, taskIds, 'DONE')
}

export function resetAllTasksOpenInPlan(project: Project): Project {
  return updateTasksStatusInPlan(project, (project.tasks ?? []).map((task) => task.id), 'OPEN')
}
