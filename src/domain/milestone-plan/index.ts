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

export function updateMilestoneOrderInPlan(project: Project, milestoneId: string, order: number): Project {
  return {
    ...project,
    milestones: (project.milestones ?? []).map((milestone) =>
      milestone.id === milestoneId ? { ...milestone, order } : milestone,
    ),
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
