import type { Project } from './types'
import { normalizeMilestonePlanProject } from '@/domain/milestone-plan'
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'

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
    region: project.region ?? '',
    country: project.country ?? '',
    state: project.state ?? '',
    timeGroup: project.timeGroup ?? '',
    milestoneTemplateId: project.milestoneTemplateId,
    milestones: project.milestones,
    tasks: project.tasks,
    documents: project.documents ?? [],
    projectComments: project.projectComments ?? '',
  }
}

export function projectStatusFromTaskCompletion(project: Pick<Project, 'tasks'>): Project['progressStatus'] {
  const tasks = project.tasks ?? []
  if (tasks.length > 0 && tasks.every((task) => task.status === 'DONE')) return 'DONE'
  return 'OPEN'
}

export function applyProjectLifecycleStatus(project: Project): Project {
  if (project.progressStatus === 'DELETED') return project
  const progressStatus = projectStatusFromTaskCompletion(project)
  return progressStatus === project.progressStatus ? project : { ...project, progressStatus }
}

export function projectSourceFor(project: Project): Project['projectSource'] {
  return project.projectSource ?? (project.mainType === 'POC' ? 'POC' : 'FINAL')
}

export function normalizeProjectLifecycleProject(project: Project): Project {
  const region = getBusinessRegionForCountry(project.country, project.state) || normalizeBusinessRegion(project.region)
  return {
    ...normalizeMilestonePlanProject(project),
    projectSource: projectSourceFor(project),
    pocStartDate: project.pocStartDate ?? null,
    pocEndDate: project.pocEndDate ?? null,
    region,
    timeGroup: region || normalizeBusinessRegion(project.timeGroup),
    progressStatus: project.progressStatus === 'DELETED' ? 'DELETED' : projectStatusFromTaskCompletion(project),
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
    region: '',
    country: '',
    state: '',
    timeGroup: '',
    dealOwner: '',
    opportunityName: '',
    canceledAt: null,
    archivedAt: null,
    deletionReason: '',
    projectComments: '',
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}
