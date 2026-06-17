import type { Opportunity } from './types'

export function cloneOpportunityDraft(opportunity: Opportunity): Opportunity {
  const clone = JSON.parse(JSON.stringify(opportunity)) as Opportunity
  return {
    ...clone,
    warrantyRecordId: clone.warrantyRecordId ?? clone.standardRenewalRequirements[0]?.warrantyRecordId ?? '',
    pocProjectIds: clone.pocProjectIds ?? [],
    finalProjectId: clone.finalProjectId ?? null,
    wonAt: clone.wonAt ?? null,
  }
}
