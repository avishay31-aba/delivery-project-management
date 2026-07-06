import type { Project } from './types'
import { normalizeMilestonePlanProject } from '@/domain/milestone-plan'

export function cloneProjectDraft(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project
}

export function projectSavePatch(project: Project): Partial<Project> {
  return {
    opportunityId: project.opportunityId,
    opportunityName: project.opportunityName.trim(),
    mainType: project.mainType,
    subType: project.subType,
    deliveryDate: project.deliveryDate,
    pocStartDate: project.pocStartDate ?? null,
    pocEndDate: project.pocEndDate ?? null,
    milestoneTemplateId: project.milestoneTemplateId,
    milestones: project.milestones,
    tasks: project.tasks,
    documents: project.documents ?? [],
  }
}

export function projectStatusFromTaskCompletion(project: Pick<Project, 'progressStatus' | 'tasks'>): Project['progressStatus'] {
  const tasks = project.tasks ?? []
  if (tasks.length > 0 && tasks.every((task) => task.status === 'DONE')) return 'DONE'
  if (tasks.some((task) => task.status !== 'DONE') && project.progressStatus === 'DONE') return 'OPEN'
  return project.progressStatus
}

export function applyProjectLifecycleStatus(project: Project): Project {
  const progressStatus = projectStatusFromTaskCompletion(project)
  return progressStatus === project.progressStatus ? project : { ...project, progressStatus }
}

export function projectSourceFor(project: Project): Project['projectSource'] {
  return project.projectSource ?? (project.mainType === 'POC' ? 'POC' : 'FINAL')
}

export function normalizeProjectLifecycleProject(project: Project): Project {
  return {
    ...normalizeMilestonePlanProject(project),
    projectSource: projectSourceFor(project),
    pocStartDate: project.pocStartDate ?? null,
    pocEndDate: project.pocEndDate ?? null,
  }
}

export function createStandaloneProject(nextPid: string, now: string): Project {
  return {
    id: `proj-${crypto.randomUUID()}`,
    pid: nextPid,
    opportunityId: undefined,
    projectSource: 'FINAL',
    accountName: '',
    mainType: 'DELIVERY',
    subType: 'NONE',
    deliveryDate: null,
    pocStartDate: null,
    pocEndDate: null,
    progressStatus: 'OPEN',
    dealOwner: '',
    opportunityName: '',
    canceledAt: null,
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}
