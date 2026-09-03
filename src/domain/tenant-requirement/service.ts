import type { Account, AppDataState, NewTenantRequirement, Opportunity, Project, ProjectSystemLink, ProjectTenantLink, RequirementType, System, Tenant } from '@/data/seed.types'
import { applicableOpportunityRequirementSources } from '@/domain/opportunity-lifecycle/applicability'
import { isSystemOperationallyVisible } from '@/domain/system-inventory'
import { tenantWarrantyHeaderStatusReadModel } from '@/domain/warranty-collection'

export function hasTenantRequirementRows(opportunity: Opportunity, requirementType: RequirementType): boolean {
  if (requirementType === 'A') return opportunity.newTenantRequirements.length > 0
  if (requirementType === 'B') return opportunity.changeRequestRequirements.length > 0
  return opportunity.standardRenewalRequirements.length > 0
}

export function getAccountSystems(accountId: string, systems: System[]): System[] {
  return systems.filter((system) => system.accountId === accountId && Boolean(system.sid))
}

const REQUIREMENT_ID_PATTERN = /^A-(\d{3,})$/i
const SUFFIXED_REQUIREMENT_ID_PATTERN = /^([A-Z])-(\d{3,})-[A-Z0-9]{6,}$/i

type RequirementRecord = Opportunity['newTenantRequirements'][number] | Opportunity['changeRequestRequirements'][number] | Opportunity['standardRenewalRequirements'][number]

export interface RequirementIdentityReference {
  requirementId: string
  source: string
  opportunityId?: string
  projectId?: string
  ownerId?: string
}

export interface RequirementIdentityContext {
  opportunities: Opportunity[]
  tenants: Tenant[]
  projects?: Project[]
  projectSystems?: ProjectSystemLink[]
  projectTenants?: ProjectTenantLink[]
}

export function allRequirementRecords(opportunity: Opportunity): RequirementRecord[] {
  return [
    ...(opportunity.newTenantRequirements ?? []),
    ...(opportunity.changeRequestRequirements ?? []),
    ...(opportunity.standardRenewalRequirements ?? []),
  ]
}

function requirementSequenceNumber(requirementId: string | null | undefined): number | null {
  const match = String(requirementId ?? '').trim().match(REQUIREMENT_ID_PATTERN)
  if (!match) return null
  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

function sequentialRequirementId(sequence: number): string {
  return `A-${String(sequence).padStart(3, '0')}`
}

function normalizedMalformedRequirementId(requirementId: string): string {
  const match = requirementId.trim().match(SUFFIXED_REQUIREMENT_ID_PATTERN)
  return match ? sequentialRequirementId(Number.parseInt(match[2], 10)) : requirementId.trim()
}

function normalizedRequirementIdentityId(requirementId: string | null | undefined): string {
  return normalizedMalformedRequirementId(String(requirementId ?? ''))
}

function pushRequirementReference(
  references: RequirementIdentityReference[],
  requirementId: string | null | undefined,
  source: string,
  details: Omit<RequirementIdentityReference, 'requirementId' | 'source'> = {},
): void {
  const normalized = normalizedRequirementIdentityId(requirementId)
  if (!normalized) return
  references.push({ requirementId: normalized, source, ...details })
}

function requirementIdsFromUnknownRecord(record: unknown, seen = new Set<unknown>()): string[] {
  if (!record || typeof record !== 'object' || seen.has(record)) return []
  seen.add(record)
  const ids: string[] = []
  Object.entries(record as Record<string, unknown>).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase()
    const keyCarriesRequirementIdentity =
      normalizedKey === 'requirementid' ||
      normalizedKey === 'requirementids' ||
      normalizedKey === 'sourcerequirementid' ||
      normalizedKey === 'releasedrequirementid'
    if (keyCarriesRequirementIdentity) {
      const values = Array.isArray(value) ? value : [value]
      values.forEach((candidate) => {
        const requirementId = normalizedRequirementIdentityId(String(candidate ?? ''))
        if (requirementId) ids.push(requirementId)
      })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => ids.push(...requirementIdsFromUnknownRecord(entry, seen)))
      return
    }
    if (value && typeof value === 'object') ids.push(...requirementIdsFromUnknownRecord(value, seen))
  })
  return ids
}

export function requirementIdentityReferences(
  context: RequirementIdentityContext,
  options: { excludeOpportunityIds?: string[] } = {},
): RequirementIdentityReference[] {
  const excludedOpportunityIds = new Set(options.excludeOpportunityIds ?? [])
  const projects = context.projects ?? []
  const projectByIdOrPid = new Map<string, Project>()
  projects.forEach((project) => {
    projectByIdOrPid.set(project.id, project)
    projectByIdOrPid.set(project.pid, project)
  })
  const references: RequirementIdentityReference[] = []

  context.opportunities.forEach((opportunity) => {
    if (excludedOpportunityIds.has(opportunity.id)) return
    allRequirementRecords(opportunity).forEach((requirement) => {
      pushRequirementReference(references, requirement.requirementId, 'Opportunity requirement grid', {
        opportunityId: opportunity.id,
        ownerId: requirement.id,
      })
    })
  })

  projects.forEach((project) => {
    if (project.opportunityId && excludedOpportunityIds.has(project.opportunityId)) return
    requirementIdsFromUnknownRecord(project).forEach((requirementId) => {
      pushRequirementReference(references, requirementId, 'Project retained requirement structure', {
        opportunityId: project.opportunityId,
        projectId: project.id,
        ownerId: project.id,
      })
    })
  })

  context.tenants.forEach((tenant) => {
    const tenantProject = tenant.deliveryPid ? projectByIdOrPid.get(tenant.deliveryPid) : undefined
    if (!tenantProject || !tenantProject.opportunityId || !excludedOpportunityIds.has(tenantProject.opportunityId)) {
      pushRequirementReference(references, tenant.sourceRequirementId, 'Tenant sourceRequirementId', {
        opportunityId: tenantProject?.opportunityId,
        projectId: tenantProject?.id,
        ownerId: tenant.id,
      })
      pushRequirementReference(references, tenant.releasedRequirementId, 'Tenant releasedRequirementId', {
        opportunityId: tenantProject?.opportunityId,
        projectId: tenantProject?.id,
        ownerId: tenant.id,
      })
    }

    ;(tenant.requirementHistory ?? []).forEach((relationship) => {
      const relationshipProject = projectByIdOrPid.get(relationship.projectId) ?? projectByIdOrPid.get(relationship.pid)
      if (relationshipProject?.opportunityId && excludedOpportunityIds.has(relationshipProject.opportunityId)) return
      pushRequirementReference(references, relationship.requirementId, `Tenant requirementHistory ${relationship.status}`, {
        opportunityId: relationshipProject?.opportunityId,
        projectId: relationshipProject?.id ?? relationship.projectId,
        ownerId: tenant.id,
      })
    })
  })

  ;(context.projectTenants ?? []).forEach((link) => {
    const project = projectByIdOrPid.get(link.projectId)
    if (project?.opportunityId && excludedOpportunityIds.has(project.opportunityId)) return
    requirementIdsFromUnknownRecord(link).forEach((requirementId) => {
      pushRequirementReference(references, requirementId, 'Project tenant retained relationship', {
        opportunityId: project?.opportunityId,
        projectId: project?.id ?? link.projectId,
        ownerId: link.id,
      })
    })
  })

  ;(context.projectSystems ?? []).forEach((link) => {
    const project = projectByIdOrPid.get(link.projectId)
    if (project?.opportunityId && excludedOpportunityIds.has(project.opportunityId)) return
    requirementIdsFromUnknownRecord(link).forEach((requirementId) => {
      pushRequirementReference(references, requirementId, 'Project system retained relationship', {
        opportunityId: project?.opportunityId,
        projectId: project?.id ?? link.projectId,
        ownerId: link.id,
      })
    })
  })

  return references
}

export function tenantRequirementIdentityIds(tenants: Tenant[]): string[] {
  return requirementIdentityReferences({ opportunities: [], tenants }).map((reference) => reference.requirementId)
}

function nextSequentialRequirementId(usedIds: Set<string>, minimumSequence: number): { requirementId: string; sequence: number } {
  let sequence = minimumSequence + 1
  let requirementId = sequentialRequirementId(sequence)
  while (usedIds.has(requirementId)) {
    sequence += 1
    requirementId = sequentialRequirementId(sequence)
  }
  return { requirementId, sequence }
}

function maxRequirementSequence(requirementIds: Iterable<string>): number {
  return Array.from(requirementIds).reduce((max, requirementId) => {
    const sequence = requirementSequenceNumber(requirementId)
    return sequence == null ? max : Math.max(max, sequence)
  }, 0)
}

export function nextTenantRequirementIdForContext(context: RequirementIdentityContext, draft?: Opportunity): string {
  const usedIds = new Set([
    ...requirementIdentityReferences(context, { excludeOpportunityIds: draft ? [draft.id] : [] }).map((reference) => reference.requirementId),
    ...(draft ? allRequirementRecords(draft).map((requirement) => normalizedRequirementIdentityId(requirement.requirementId)) : []),
  ].filter(Boolean))
  return nextSequentialRequirementId(usedIds, maxRequirementSequence(usedIds)).requirementId
}

export function nextTenantRequirementId(opportunities: Opportunity[], draft?: Opportunity, tenants: Tenant[] = []): string {
  return nextTenantRequirementIdForContext({ opportunities, tenants }, draft)
}

export function unavailableRequirementIdsForOpportunitySave(
  opportunity: Opportunity,
  context: RequirementIdentityContext & { savedOpportunity?: Opportunity },
): string[] {
  const duplicateIds = new Set<string>()
  const proposedIds = allRequirementRecords(opportunity)
    .map((requirement) => normalizedRequirementIdentityId(requirement.requirementId))
    .filter(Boolean)
  const seen = new Set<string>()
  proposedIds.forEach((requirementId) => {
    if (seen.has(requirementId)) duplicateIds.add(requirementId)
    seen.add(requirementId)
  })
  const unavailableIds = new Set(
    requirementIdentityReferences(context, {
      excludeOpportunityIds: [opportunity.id, context.savedOpportunity?.id].filter((id): id is string => Boolean(id)),
    }).map((reference) => reference.requirementId),
  )
  proposedIds.forEach((requirementId) => {
    if (unavailableIds.has(requirementId)) duplicateIds.add(requirementId)
  })
  return Array.from(duplicateIds)
}

export function opportunityWithUniqueTenantRequirementIds(
  opportunity: Opportunity,
  context: {
    opportunities: Opportunity[]
    tenants: Tenant[]
    projects?: Project[]
    projectSystems?: ProjectSystemLink[]
    projectTenants?: ProjectTenantLink[]
    savedOpportunity?: Opportunity
  },
): Opportunity {
  const usedIds = new Set(
    requirementIdentityReferences(context, {
      excludeOpportunityIds: [opportunity.id, context.savedOpportunity?.id].filter((id): id is string => Boolean(id)),
    }).map((reference) => reference.requirementId),
  )
  let maxSequence = Array.from(new Set([
    ...usedIds,
    ...allRequirementRecords(opportunity).map((requirement) => normalizedRequirementIdentityId(requirement.requirementId)).filter(Boolean),
  ])).reduce((max, requirementId) => Math.max(max, requirementSequenceNumber(requirementId) ?? 0), 0)

  const assign = <T extends RequirementRecord>(requirement: T): T => {
    const normalized = normalizedRequirementIdentityId(requirement.requirementId)
    const canKeep = normalized && !usedIds.has(normalized)
    if (canKeep) {
      usedIds.add(normalized)
      return normalized === requirement.requirementId ? requirement : { ...requirement, requirementId: normalized }
    }

    const next = nextSequentialRequirementId(usedIds, maxSequence)
    maxSequence = next.sequence
    usedIds.add(next.requirementId)
    return { ...requirement, requirementId: next.requirementId }
  }

  return {
    ...opportunity,
    newTenantRequirements: opportunity.newTenantRequirements.map(assign),
    changeRequestRequirements: opportunity.changeRequestRequirements.map(assign),
    standardRenewalRequirements: opportunity.standardRenewalRequirements.map(assign),
  }
}

export interface RequirementAttachmentOption {
  project: Project
  requirement: NewTenantRequirement
  occupyingTenant?: Tenant
  disabled: boolean
}

export function requirementAttachmentOptionsForProject(
  projectId: string,
  projects: Project[],
  opportunities: Opportunity[],
  tenants: Tenant[],
): RequirementAttachmentOption[] {
  const project = projects.find((candidate) => candidate.id === projectId)
  const opportunity = project
    ? opportunities.find((candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId)
    : undefined
  if (!project || !opportunity) return []
  const occupancy = new Map<string, Tenant>()
  tenants.forEach((tenant) => {
    if (tenant.operationalStatus === 'Cancelled' || tenant.operationalStatus === 'Cancelled - By System') return
    const requirementIds = tenant.requirementHistory?.length
      ? tenant.requirementHistory.filter((relationship) => relationship.status === 'CURRENT').map((relationship) => relationship.requirementId)
      : [tenant.sourceRequirementId].filter((requirementId): requirementId is string => Boolean(requirementId))
    requirementIds.forEach((requirementId) => {
      if (!occupancy.has(requirementId)) occupancy.set(requirementId, tenant)
    })
  })
  return applicableOpportunityRequirementSources(opportunity)
    .filter((source): source is Extract<ReturnType<typeof applicableOpportunityRequirementSources>[number], { requirementType: 'A' }> => source.requirementType === 'A')
    .map((source) => source.requirement)
    .map((requirement) => {
    const occupyingTenant = occupancy.get(requirement.requirementId)
    return {
      project,
      requirement,
      occupyingTenant,
      disabled: false,
    }
  })
}

export function repairGlobalRequirementIds(state: AppDataState): AppDataState {
  const requirementRefs: Array<{ opportunityId: string; requirement: RequirementRecord }> = []
  state.opportunities.forEach((opportunity) => {
    allRequirementRecords(opportunity).forEach((requirement) => {
      requirementRefs.push({ opportunityId: opportunity.id, requirement })
    })
  })

  const used = new Set<string>()
  let maxSequence = requirementRefs.reduce((max, { requirement }) => {
    const sequence = requirementSequenceNumber(normalizedMalformedRequirementId(requirement.requirementId))
    return sequence == null ? max : Math.max(max, sequence)
  }, 0)
  const changedByOpportunityAndOldId = new Map<string, string>()
  const globalChangesByOldId = new Map<string, Set<string>>()

  requirementRefs.forEach(({ opportunityId, requirement }) => {
    const oldRequirementId = String(requirement.requirementId ?? '').trim()
    const normalized = normalizedMalformedRequirementId(oldRequirementId)
    let nextRequirementId = normalized || sequentialRequirementId(++maxSequence)
    if (used.has(nextRequirementId)) {
      nextRequirementId = sequentialRequirementId(++maxSequence)
      while (used.has(nextRequirementId)) nextRequirementId = sequentialRequirementId(++maxSequence)
    }
    used.add(nextRequirementId)
    if (nextRequirementId !== oldRequirementId) {
      changedByOpportunityAndOldId.set(`${opportunityId}::${oldRequirementId}`, nextRequirementId)
      const changedValues = globalChangesByOldId.get(oldRequirementId) ?? new Set<string>()
      changedValues.add(nextRequirementId)
      globalChangesByOldId.set(oldRequirementId, changedValues)
      requirement.requirementId = nextRequirementId
    }
  })

  if (changedByOpportunityAndOldId.size === 0) return state

  const projectByPid = new Map(state.projects.map((project) => [project.pid, project]))
  const tenants = state.tenants.map((tenant) => {
    const project = tenant.deliveryPid ? projectByPid.get(tenant.deliveryPid) : undefined
    const opportunityId = project?.opportunityId
    const updateRequirementReference = (requirementId: string | null | undefined, scopedOpportunityId = opportunityId): string | null | undefined => {
      if (!requirementId) return requirementId
      const projectScoped = scopedOpportunityId ? changedByOpportunityAndOldId.get(`${scopedOpportunityId}::${requirementId}`) : undefined
      if (projectScoped) return projectScoped
      const globalChanges = globalChangesByOldId.get(requirementId)
      return globalChanges?.size === 1 ? Array.from(globalChanges)[0] : requirementId
    }
    const sourceRequirementId = updateRequirementReference(tenant.sourceRequirementId)
    const releasedRequirementId = updateRequirementReference(tenant.releasedRequirementId)
    const requirementHistory = (tenant.requirementHistory ?? []).map((relationship) => {
      const historyProject = state.projects.find((candidate) => candidate.id === relationship.projectId || candidate.pid === relationship.pid)
      const requirementId = updateRequirementReference(relationship.requirementId, historyProject?.opportunityId)
      return requirementId === relationship.requirementId ? relationship : { ...relationship, requirementId: requirementId ?? relationship.requirementId }
    })
    const requirementHistoryChanged = JSON.stringify(requirementHistory) !== JSON.stringify(tenant.requirementHistory ?? [])
    return sourceRequirementId === tenant.sourceRequirementId && releasedRequirementId === tenant.releasedRequirementId && !requirementHistoryChanged
      ? tenant
      : { ...tenant, sourceRequirementId: sourceRequirementId ?? undefined, releasedRequirementId: releasedRequirementId ?? null, requirementHistory }
  })

  return { ...state, tenants }
}

function tenantFormTypeValue(tenant: Tenant): string {
  return tenant.tenantFormType ?? (tenant.tenantType === 'PENLINK_INTERNAL' ? 'INTERNAL' : tenant.tenantType)
}

function tenantIsLifecycleInactive(tenant: Tenant): boolean {
  return ['Deleted - By System', 'Cancelled - By System', 'Deleted', 'Cancelled'].includes(tenant.operationalStatus)
}

export function activeTenantSystemId(tenant: Tenant): string {
  if (tenantIsLifecycleInactive(tenant)) return ''
  return tenant.hostedSystemId || tenant.systemId || ''
}

export function tenantCurrentSystem(tenant: Tenant, systems: System[]): System | undefined {
  const systemId = activeTenantSystemId(tenant)
  return systemId ? systems.find((system) => system.id === systemId && isSystemOperationallyVisible(system)) : undefined
}

export function tenantIsEligibleCustomerExistingAsset(tenant: Tenant, systems: System[]): boolean {
  if (tenantFormTypeValue(tenant) !== 'CUSTOMER' && tenant.tenantType !== 'CUSTOMER') return false
  if (!tenantCurrentSystem(tenant, systems)) return false
  const warrantyStatus = tenantWarrantyHeaderStatusReadModel(tenant.warranties ?? [], tenant.tid).status
  return warrantyStatus === 'UNDER_CONTRACT' || warrantyStatus === 'NOT_SET_YET'
}

export function getEligibleCustomerExistingTenants(accountId: string, tenants: Tenant[], systems: System[]): Tenant[] {
  return tenants.filter((tenant) => tenant.accountId === accountId && tenantIsEligibleCustomerExistingAsset(tenant, systems))
}

function dedupeSystemsByCurrentTenantHost(tenants: Tenant[], systems: System[]): System[] {
  const seen = new Set<string>()
  const rows: System[] = []
  tenants.forEach((tenant) => {
    const system = tenantCurrentSystem(tenant, systems)
    if (!system?.sid) return
    if (seen.has(system.id)) return
    seen.add(system.id)
    rows.push(system)
  })
  return rows
}

export function opportunityExistingAssetTenants(opportunity: Opportunity, tenants: Tenant[], systems: System[]): Tenant[] {
  return getEligibleCustomerExistingTenants(opportunity.accountId, tenants, systems)
}

export function opportunityExistingSystemGroups(
  opportunity: Opportunity,
  accounts: Account[],
  tenants: Tenant[],
  systems: System[],
): { accountSystems: System[]; dealOwnerSystems: System[]; allSystems: System[] } {
  const accountSystemIds = new Set<string>()
  const accountSystems = dedupeSystemsByCurrentTenantHost(
    getEligibleCustomerExistingTenants(opportunity.accountId, tenants, systems),
    systems,
  )
  accountSystems.forEach((system) => accountSystemIds.add(system.id))

  const ownedAccountIds = new Set(
    accounts
      .filter((account) => account.salesManagerId === opportunity.salesManagerId)
      .map((account) => account.id),
  )
  const dealOwnerSystems = dedupeSystemsByCurrentTenantHost(
    tenants.filter(
      (tenant) =>
        tenant.accountId !== opportunity.accountId &&
        ownedAccountIds.has(tenant.accountId) &&
        tenantIsEligibleCustomerExistingAsset(tenant, systems),
    ),
    systems,
  ).filter((system) => !accountSystemIds.has(system.id))

  return { accountSystems, dealOwnerSystems, allSystems: [...accountSystems, ...dealOwnerSystems] }
}

export function getOpportunityExistingSidSystems(opportunity: Opportunity, accounts: Account[], systems: System[], tenants: Tenant[] = []): System[] {
  if (tenants.length > 0) return opportunityExistingSystemGroups(opportunity, accounts, tenants, systems).allSystems
  return []
}

export function getAccountTenants(accountId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) => tenant.accountId === accountId)
}

export function getSalesManagerAccounts(salesManagerId: string, accounts: Account[]): Account[] {
  return accounts.filter((account) => account.salesManagerId === salesManagerId)
}

export function resolveTenantSid(tenantId: string, tenants: Tenant[], systems: System[]): string {
  const tenant = tenants.find((candidate) => candidate.id === tenantId)
  const system = tenant ? tenantCurrentSystem(tenant, systems) : undefined

  return system?.sid ?? ''
}

export function opportunityCanUseSystem(opportunity: Opportunity, systemId: string | null, accounts: Account[], systems: System[], tenants: Tenant[] = []): boolean {
  if (!systemId) return false

  return getOpportunityExistingSidSystems(opportunity, accounts, systems, tenants).some(
    (system) => system.id === systemId,
  )
}

export function accountOwnsTenant(accountId: string, tenantId: string, tenants: Tenant[]): boolean {
  return tenants.some((tenant) => tenant.id === tenantId && tenant.accountId === accountId)
}

export function findDuplicateValue(values: string[]): string | null {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) return value
    seen.add(value)
  }
  return null
}

export function isEmpty(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0)
}
