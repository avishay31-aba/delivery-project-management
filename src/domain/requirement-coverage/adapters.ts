import type { RequirementCoverageContext, RequirementCoverageSource } from './types'
import { REQUIREMENT_COVERAGE_GRID_LABELS } from './metadata'
import { applicableOpportunityRequirementSources } from '@/domain/opportunity-lifecycle'

export function requirementCoverageSources(context: RequirementCoverageContext): RequirementCoverageSource[] {
  return context.opportunities.flatMap((opportunity) => {
    const account = context.accounts.find((candidate) => candidate.id === opportunity.accountId)
    return applicableOpportunityRequirementSources(opportunity).map((source) => ({
        opportunity,
        account,
        requirement: source.requirement,
        requirementType: source.requirementType,
        requirementGrid: REQUIREMENT_COVERAGE_GRID_LABELS[source.requirementType],
      }))
  })
}
