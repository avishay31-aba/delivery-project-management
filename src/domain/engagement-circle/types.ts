import type { EngagementCircleContact, Opportunity, Project, System, Tenant } from '@/data/seed.types'

export type EngagementRole = string
export type ContactPersonRecord = EngagementCircleContact
export type EngagementCircle = ContactPersonRecord[]

export interface EngagementCircleSource {
  opportunity: Opportunity
}

export interface EngagementCircleProjectView {
  project: Project
  contacts: EngagementCircle
}

export interface EngagementCircleSystemView {
  system: System
  contacts: EngagementCircle
}

export interface EngagementCircleTenantView {
  tenant: Tenant
  contacts: EngagementCircle
}

export type {
  EngagementCircleContact,
  Opportunity,
  Project,
  System,
  Tenant,
}
