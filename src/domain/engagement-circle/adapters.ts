import type { EngagementCircle, Opportunity, Tenant } from './types'
import { defaultEngagementCircles, engagementCircleSnapshot } from './service'

export function normalizeEngagementCircleSnapshot(contacts: EngagementCircle | undefined): EngagementCircle {
  return engagementCircleSnapshot(contacts)
}

export function normalizeOpportunityEngagementCircles(opportunity: Opportunity): EngagementCircle {
  return Array.isArray(opportunity.engagementCircles) && opportunity.engagementCircles.length > 0
    ? opportunity.engagementCircles
    : defaultEngagementCircles(opportunity)
}

export function normalizeTenantEngagementCircle(tenant: Tenant): EngagementCircle {
  return normalizeEngagementCircleSnapshot(tenant.engagementCircle)
}
