import type { Project } from './types'

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
    milestoneTemplateId: project.milestoneTemplateId,
    milestones: project.milestones,
    tasks: project.tasks,
    documents: project.documents ?? [],
  }
}
