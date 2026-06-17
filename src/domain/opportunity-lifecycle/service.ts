import type { Opportunity, OpportunitySubType, OpportunityType, Project, ProjectSubType } from './types'
import { OPPORTUNITY_SUB_TYPE_OPTIONS } from './metadata'

export function opportunitySubTypeOptions(type: OpportunityType): OpportunitySubType[] {
  return OPPORTUNITY_SUB_TYPE_OPTIONS[type]
}

export function projectSubTypeForOpportunity(opportunity: Opportunity): ProjectSubType {
  return opportunity.subType === 'FREE' || opportunity.subType === 'PAID' ? 'NONE' : opportunity.subType
}

export function uniqueOpportunityValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

export function linkedPocProjectsForOpportunity(opportunity: Opportunity, savedOpportunity: Opportunity, projects: Project[]): Project[] {
  const linkedIds = new Set(uniqueOpportunityValues([...(opportunity.pocProjectIds ?? []), ...(savedOpportunity.pocProjectIds ?? [])]))
  const opportunityIds = new Set([opportunity.opportunityId, savedOpportunity.opportunityId])

  return projects.filter(
    (project) =>
      linkedIds.has(project.id) ||
      (project.projectSource === 'POC' && Boolean(project.opportunityId && opportunityIds.has(project.opportunityId))),
  )
}

export function activePocProjectForOpportunity(opportunity: Opportunity, savedOpportunity: Opportunity, projects: Project[]): Project | undefined {
  return linkedPocProjectsForOpportunity(opportunity, savedOpportunity, projects).find((project) => project.progressStatus !== 'DONE')
}

export function finalProjectForOpportunity(opportunity: Opportunity, savedOpportunity: Opportunity, projects: Project[]): Project | undefined {
  const linkedId = opportunity.finalProjectId ?? savedOpportunity.finalProjectId
  if (linkedId) {
    const linkedProject = projects.find((project) => project.id === linkedId)
    if (linkedProject) return linkedProject
  }

  const opportunityIds = new Set([opportunity.opportunityId, savedOpportunity.opportunityId])
  return projects.find(
    (project) =>
      project.projectSource === 'FINAL' &&
      Boolean(project.opportunityId && opportunityIds.has(project.opportunityId)),
  )
}
