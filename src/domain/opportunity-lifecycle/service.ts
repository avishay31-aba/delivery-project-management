import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  StandardRenewalRequirement,
} from '@/data/seed.types'
import type {
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  Project,
  ProjectMainType,
  ProjectSubType,
  RequirementType,
} from './types'
import { OPPORTUNITY_SUB_TYPE_OPTIONS } from './metadata'

export type OpportunityRequirementRow = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement

export function opportunitySubTypeOptions(type: OpportunityType): OpportunitySubType[] {
  return OPPORTUNITY_SUB_TYPE_OPTIONS[type]
}

export function hasOpportunityRequirementRows(opportunity: Opportunity): boolean {
  return (
    opportunity.newTenantRequirements.length > 0 ||
    opportunity.changeRequestRequirements.length > 0 ||
    opportunity.standardRenewalRequirements.length > 0
  )
}

export function opportunitySubTypeForTypeChange(
  currentSubType: OpportunitySubType,
  type: OpportunityType,
): OpportunitySubType {
  const nextSubTypes = opportunitySubTypeOptions(type)
  return nextSubTypes.includes(currentSubType) ? currentSubType : nextSubTypes[0]
}

export function isSameOpportunityTypeChange(
  opportunity: Opportunity,
  nextChange: Pick<Opportunity, 'type' | 'subType'>,
): boolean {
  return nextChange.type === opportunity.type && nextChange.subType === opportunity.subType
}

export function shouldConfirmOpportunityTypeChange(opportunity: Opportunity, nextChange: Pick<Opportunity, 'type' | 'subType'>): boolean {
  return !isSameOpportunityTypeChange(opportunity, nextChange) && hasOpportunityRequirementRows(opportunity)
}

export function opportunityTypeChangePatch(
  nextChange: Pick<Opportunity, 'type' | 'subType'>,
  deleteIrrelevantRequirements: boolean,
): Partial<Opportunity> {
  return {
    type: nextChange.type,
    subType: nextChange.subType,
    ...(deleteIrrelevantRequirements
      ? {
          newTenantRequirements: [],
          changeRequestRequirements: [],
          standardRenewalRequirements: [],
        }
      : {}),
  }
}

export function projectSubTypeForOpportunity(opportunity: Opportunity): ProjectSubType {
  return opportunity.subType === 'FREE' || opportunity.subType === 'PAID' ? 'NONE' : opportunity.subType
}

export function projectTypeForOpportunity(opportunity: Opportunity): { mainType: ProjectMainType; subType: ProjectSubType } {
  if (opportunity.type === 'POC') return { mainType: 'POC', subType: 'NONE' }
  if (opportunity.type === 'DELIVERY') return { mainType: 'DELIVERY', subType: opportunity.subType === 'UPSELL' ? 'UPSELL' : 'NEW' }
  if (opportunity.subType === 'UPSELL') return { mainType: 'RENEWAL', subType: 'UPSELL' }
  if (opportunity.subType === 'DOWN_SELL') return { mainType: 'RENEWAL', subType: 'DOWN_SELL' }
  return { mainType: 'RENEWAL', subType: 'STANDARD' }
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

export function createdProjectsForOpportunity(opportunity: Opportunity, savedOpportunity: Opportunity | undefined, projects: Project[]): Project[] {
  const linkedIds = new Set(uniqueOpportunityValues([...(opportunity.pocProjectIds ?? []), opportunity.finalProjectId ?? '']))
  return projects.filter((project) => {
    const isExplicitlyLinked = linkedIds.has(project.id)
    const isLegacyLinked =
      project.opportunityId === opportunity.opportunityId ||
      Boolean(savedOpportunity?.opportunityId && project.opportunityId === savedOpportunity.opportunityId)
    return isExplicitlyLinked || isLegacyLinked
  })
}

export function linkedOpportunityForProject(project: Project, opportunities: Opportunity[]): Opportunity | undefined {
  return opportunities.find(
    (opportunity) =>
      opportunity.opportunityId === project.opportunityId ||
      opportunity.id === project.opportunityId ||
      opportunity.pocProjectIds.includes(project.id) ||
      opportunity.finalProjectId === project.id,
  )
}

export function opportunityRowsForRequirementSection(
  opportunity: Opportunity | undefined,
  kind: RequirementType,
): OpportunityRequirementRow[] {
  if (!opportunity) return []
  if (kind === 'A') return opportunity.newTenantRequirements
  if (kind === 'B') return opportunity.changeRequestRequirements
  return opportunity.standardRenewalRequirements
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
