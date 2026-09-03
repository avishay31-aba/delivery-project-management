import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  StandardRenewalRequirement,
} from '@/data/seed.types'
import type { Opportunity, OpportunitySubType, OpportunityType, RequirementType } from './types'

export type OpportunityRequirementRow = NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement
export type OpportunityRequirementSource =
  | { requirementType: 'A'; requirementGrid: string; requirement: NewTenantRequirement }
  | { requirementType: 'B'; requirementGrid: string; requirement: ChangeRequestRequirement }
  | { requirementType: 'C'; requirementGrid: string; requirement: StandardRenewalRequirement }

function keyForOpportunity(type: OpportunityType, subType: OpportunitySubType): string {
  return `${type}:${subType}`
}

const VISIBLE_REQUIREMENT_TYPES_BY_TYPE = new Map<string, RequirementType[]>([
  [keyForOpportunity('POC', 'FREE'), ['A', 'B']],
  [keyForOpportunity('POC', 'PAID'), ['A', 'B']],
  [keyForOpportunity('DELIVERY', 'NEW'), ['A']],
  [keyForOpportunity('DELIVERY', 'UPSELL'), ['A', 'B']],
  [keyForOpportunity('RENEWAL', 'STANDARD'), ['C']],
  [keyForOpportunity('RENEWAL', 'UPSELL'), ['C', 'B', 'A']],
  [keyForOpportunity('RENEWAL', 'DOWN_SELL'), ['C', 'B']],
])

export function getVisibleRequirementTypes(type: OpportunityType, subType: OpportunitySubType): RequirementType[] {
  return VISIBLE_REQUIREMENT_TYPES_BY_TYPE.get(keyForOpportunity(type, subType)) ?? []
}

export function getVisibleRequirementTypesForOpportunity(opportunity: Opportunity): RequirementType[] {
  if (opportunity.stage === 'POC') {
    return getVisibleRequirementTypes('POC', opportunity.financialProfile ?? (opportunity.subType === 'PAID' ? 'PAID' : 'FREE'))
  }
  return getVisibleRequirementTypes(opportunity.type, opportunity.subType)
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

export function opportunityWithApplicableRequirements(opportunity: Opportunity): Opportunity {
  const visibleTypes = new Set(getVisibleRequirementTypesForOpportunity(opportunity))
  return {
    ...opportunity,
    newTenantRequirements: visibleTypes.has('A') ? opportunity.newTenantRequirements : [],
    changeRequestRequirements: visibleTypes.has('B') ? opportunity.changeRequestRequirements : [],
    standardRenewalRequirements: visibleTypes.has('C') ? opportunity.standardRenewalRequirements : [],
  }
}

export function applicableOpportunityRequirementRows(
  opportunity: Opportunity,
  kind: RequirementType,
): OpportunityRequirementRow[] {
  return opportunityRowsForRequirementSection(opportunityWithApplicableRequirements(opportunity), kind)
}

export function applicableOpportunityRequirementSources(opportunity: Opportunity): OpportunityRequirementSource[] {
  const applicable = opportunityWithApplicableRequirements(opportunity)
  return [
    ...applicable.newTenantRequirements.map((requirement) => ({
      requirementType: 'A' as const,
      requirementGrid: 'Grid A: New Tenant Requirements',
      requirement,
    })),
    ...applicable.changeRequestRequirements.map((requirement) => ({
      requirementType: 'B' as const,
      requirementGrid: 'Grid B: Change Request Requirements',
      requirement,
    })),
    ...applicable.standardRenewalRequirements.map((requirement) => ({
      requirementType: 'C' as const,
      requirementGrid: 'Grid C: Standard Renewal Requirements',
      requirement,
    })),
  ]
}

export function applicableOpportunityRequirementCount(opportunity: Opportunity): number {
  return applicableOpportunityRequirementSources(opportunity).length
}
