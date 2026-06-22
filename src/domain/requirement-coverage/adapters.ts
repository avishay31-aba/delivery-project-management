import type { RequirementCoverageContext, RequirementCoverageSource } from './types'
import { REQUIREMENT_COVERAGE_GRID_LABELS } from './metadata'

export function requirementCoverageSources(context: RequirementCoverageContext): RequirementCoverageSource[] {
  return context.opportunities.flatMap((opportunity) => {
    const account = context.accounts.find((candidate) => candidate.id === opportunity.accountId)
    return [
      ...opportunity.newTenantRequirements.map((requirement) => ({
        opportunity,
        account,
        requirement,
        requirementType: 'A' as const,
        requirementGrid: REQUIREMENT_COVERAGE_GRID_LABELS.A,
      })),
      ...opportunity.changeRequestRequirements.map((requirement) => ({
        opportunity,
        account,
        requirement,
        requirementType: 'B' as const,
        requirementGrid: REQUIREMENT_COVERAGE_GRID_LABELS.B,
      })),
      ...opportunity.standardRenewalRequirements.map((requirement) => ({
        opportunity,
        account,
        requirement,
        requirementType: 'C' as const,
        requirementGrid: REQUIREMENT_COVERAGE_GRID_LABELS.C,
      })),
    ]
  })
}
