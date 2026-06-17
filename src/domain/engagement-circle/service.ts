import type { EngagementCircle, Opportunity, Tenant } from './types'
import {
  DEFAULT_ENGAGEMENT_CIRCLE_ROLES,
  DEFAULT_ENGAGEMENT_SUBJECT,
  SUPPORT_MANAGER_ROLE,
  SUPPORT_MANAGER_SUBJECT,
} from './metadata'

export function engagementCircleSnapshot(contacts: EngagementCircle | undefined): EngagementCircle {
  return Array.isArray(contacts) ? contacts : []
}

export function engagementRoleSlug(role: string): string {
  return role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function engagementSubjectForRole(role: string): string {
  return role === SUPPORT_MANAGER_ROLE ? SUPPORT_MANAGER_SUBJECT : DEFAULT_ENGAGEMENT_SUBJECT
}

export function defaultEngagementCircles(opportunity: Opportunity): EngagementCircle {
  const region = opportunity.region || 'Global'
  return DEFAULT_ENGAGEMENT_CIRCLE_ROLES.map((role) => {
    const slug = engagementRoleSlug(role)
    return {
      id: `circle-${opportunity.id}-${slug}`,
      subject: engagementSubjectForRole(role),
      role,
      userName: `${region} ${role}`,
      email: `${slug}.${region.toLowerCase()}@example.com`,
      phone: '',
    }
  })
}

export function inheritedEngagementCircleForTenant(tenant: Tenant, opportunity?: Opportunity): EngagementCircle {
  return tenant.engagementCircle?.length
    ? tenant.engagementCircle
    : opportunity?.engagementCircles ?? []
}
