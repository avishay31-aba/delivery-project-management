import type { Account, Opportunity, RequirementType, System, Tenant } from '@/data/seed.types'

export function hasTenantRequirementRows(opportunity: Opportunity, requirementType: RequirementType): boolean {
  if (requirementType === 'A') return opportunity.newTenantRequirements.length > 0
  if (requirementType === 'B') return opportunity.changeRequestRequirements.length > 0
  return opportunity.standardRenewalRequirements.length > 0
}

export function getAccountSystems(accountId: string, systems: System[]): System[] {
  return systems.filter((system) => system.accountId === accountId && Boolean(system.sid))
}

export function getOpportunityExistingSidSystems(opportunity: Opportunity, accounts: Account[], systems: System[]): System[] {
  const ownedAccountIds = new Set(
    accounts
      .filter((account) => account.salesManagerId === opportunity.salesManagerId)
      .map((account) => account.id),
  )

  return systems.filter(
    (system) =>
      Boolean(system.accountId && ownedAccountIds.has(system.accountId)) &&
      Boolean(system.sid),
  )
}

export function getAccountTenants(accountId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) => tenant.accountId === accountId)
}

export function getSalesManagerAccounts(salesManagerId: string, accounts: Account[]): Account[] {
  return accounts.filter((account) => account.salesManagerId === salesManagerId)
}

export function resolveTenantSid(tenantId: string, tenants: Tenant[], systems: System[]): string {
  const tenant = tenants.find((candidate) => candidate.id === tenantId)
  const system = tenant ? systems.find((candidate) => candidate.id === tenant.systemId) : undefined

  return system?.sid ?? ''
}

export function opportunityCanUseSystem(opportunity: Opportunity, systemId: string | null, accounts: Account[], systems: System[]): boolean {
  if (!systemId) return false

  return getOpportunityExistingSidSystems(opportunity, accounts, systems).some(
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
