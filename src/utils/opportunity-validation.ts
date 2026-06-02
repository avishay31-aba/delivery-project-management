import { getVisibleRequirementTypes } from '@/config/opportunity-metadata'
import type {
  Account,
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  RequirementType,
  StandardRenewalRequirement,
  System,
  Tenant,
} from '@/data/seed.types'

export interface ValidationMessage {
  level: 'error' | 'warning'
  message: string
}

export interface OpportunityContext {
  accounts: Account[]
  systems: System[]
  tenants: Tenant[]
}

function hasRows(opportunity: Opportunity, requirementType: RequirementType): boolean {
  if (requirementType === 'A') return opportunity.newTenantRequirements.length > 0
  if (requirementType === 'B') return opportunity.changeRequestRequirements.length > 0
  return opportunity.standardRenewalRequirements.length > 0
}

export function getHiddenRequirementTypesWithRows(opportunity: Opportunity): RequirementType[] {
  const visibleTypes = new Set(getVisibleRequirementTypes(opportunity.type, opportunity.subType))
  const allTypes: RequirementType[] = ['A', 'B', 'C']

  return allTypes.filter((requirementType) => !visibleTypes.has(requirementType) && hasRows(opportunity, requirementType))
}

export function getAccountSystems(accountId: string, systems: System[]): System[] {
  return systems.filter((system) => system.accountId === accountId && Boolean(system.sid))
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

function accountOwnsSystem(accountId: string, systemId: string | null, systems: System[]): boolean {
  if (!systemId) return false

  return systems.some((system) => system.id === systemId && system.accountId === accountId)
}

function accountOwnsTenant(accountId: string, tenantId: string, tenants: Tenant[]): boolean {
  return tenants.some((tenant) => tenant.id === tenantId && tenant.accountId === accountId)
}

function requiredText(value: string | null | undefined, label: string): ValidationMessage[] {
  return value?.trim() ? [] : [{ level: 'error', message: `${label} is required.` }]
}

export function validateRequirementA(
  row: NewTenantRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    ...requiredText(row.requirementId, 'Requirement ID'),
    ...requiredText(row.deployTarget, 'Deploy target'),
  ]

  if (row.deployTarget === 'EXISTING_SID') {
    if (!row.existingSystemId) {
      messages.push({ level: 'error', message: 'Existing SID is required when deploy target is Existing SID.' })
    } else if (!accountOwnsSystem(opportunity.accountId, row.existingSystemId, context.systems)) {
      messages.push({ level: 'error', message: 'Existing SID must belong to the selected account.' })
    }
  }

  return messages
}

export function validateRequirementB(
  row: ChangeRequestRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [...requiredText(row.requirementId, 'Requirement ID')]

  if (!row.tenantId) {
    messages.push({ level: 'error', message: 'Existing tenant is required.' })
  } else if (!accountOwnsTenant(opportunity.accountId, row.tenantId, context.tenants)) {
    messages.push({ level: 'error', message: 'Selected tenant must belong to the selected account.' })
  }

  const tenant = context.tenants.find((candidate) => candidate.id === row.tenantId)
  if (tenant && row.systemId !== tenant.systemId) {
    messages.push({ level: 'warning', message: 'SID will be reset from the selected tenant.' })
  }

  return messages
}

export function validateRequirementC(
  row: StandardRenewalRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [...requiredText(row.requirementId, 'Requirement ID')]

  if (!row.tenantId) {
    messages.push({ level: 'error', message: 'Existing tenant is required.' })
  } else if (!accountOwnsTenant(opportunity.accountId, row.tenantId, context.tenants)) {
    messages.push({ level: 'error', message: 'Selected tenant must belong to the selected account.' })
  }

  return messages
}

export function validateRequirementTenantUniqueness(opportunity: Opportunity): ValidationMessage[] {
  const changeTenantIds = new Set(
    opportunity.changeRequestRequirements.map((requirement) => requirement.tenantId).filter(Boolean),
  )
  const duplicates = opportunity.standardRenewalRequirements
    .map((requirement) => requirement.tenantId)
    .filter((tenantId) => tenantId && changeTenantIds.has(tenantId))

  return duplicates.length > 0
    ? [
        {
          level: 'error',
          message: 'The same existing tenant cannot appear in both Grid B and Grid C for one opportunity.',
        },
      ]
    : []
}

export function validateOpportunityHeader(opportunity: Opportunity, context: OpportunityContext): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    ...requiredText(opportunity.opportunityId, 'Salesforce Opportunity ID'),
    ...requiredText(opportunity.opportunityName, 'Opportunity name'),
    ...requiredText(opportunity.accountId, 'Account'),
    ...requiredText(opportunity.salesManagerId, 'Sales Manager / Deal Owner'),
  ]

  if (opportunity.accountId && !context.accounts.some((account) => account.id === opportunity.accountId)) {
    messages.push({ level: 'error', message: 'Selected account does not exist.' })
  }

  return messages
}

export function validateOpportunityRequirements(
  opportunity: Opportunity,
  context: OpportunityContext,
): ValidationMessage[] {
  const visibleTypes = getVisibleRequirementTypes(opportunity.type, opportunity.subType)
  const visibleRows = visibleTypes.reduce((count, requirementType) => {
    if (requirementType === 'A') return count + opportunity.newTenantRequirements.length
    if (requirementType === 'B') return count + opportunity.changeRequestRequirements.length
    return count + opportunity.standardRenewalRequirements.length
  }, 0)
  const messages: ValidationMessage[] = []

  if (visibleRows === 0) {
    messages.push({ level: 'error', message: 'At least one visible tenant requirement row is required.' })
  }

  getHiddenRequirementTypesWithRows(opportunity).forEach((requirementType) => {
    messages.push({
      level: 'warning',
      message: `Grid ${requirementType} has stored rows that are hidden for the selected Opportunity Type/Subtype.`,
    })
  })

  opportunity.newTenantRequirements.forEach((row) => {
    validateRequirementA(row, opportunity, context).forEach((message) => messages.push(message))
  })
  opportunity.changeRequestRequirements.forEach((row) => {
    validateRequirementB(row, opportunity, context).forEach((message) => messages.push(message))
  })
  opportunity.standardRenewalRequirements.forEach((row) => {
    validateRequirementC(row, opportunity, context).forEach((message) => messages.push(message))
  })

  validateRequirementTenantUniqueness(opportunity).forEach((message) => messages.push(message))

  return messages
}

export function validateOpportunity(opportunity: Opportunity, context: OpportunityContext): ValidationMessage[] {
  return [...validateOpportunityHeader(opportunity, context), ...validateOpportunityRequirements(opportunity, context)]
}
