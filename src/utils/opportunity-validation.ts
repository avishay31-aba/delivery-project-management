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

export function getOpportunityExistingSidSystems(opportunity: Opportunity, accounts: Account[], systems: System[]): System[] {
  const account = accounts.find((candidate) => candidate.id === opportunity.accountId)
  if (!account || account.salesManagerId !== opportunity.salesManagerId) return []

  return systems.filter(
    (system) =>
      system.accountId === opportunity.accountId &&
      system.salesManagerId === opportunity.salesManagerId &&
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

function opportunityCanUseSystem(opportunity: Opportunity, systemId: string | null, context: OpportunityContext): boolean {
  if (!systemId) return false

  return getOpportunityExistingSidSystems(opportunity, context.accounts, context.systems).some(
    (system) => system.id === systemId,
  )
}

function accountOwnsTenant(accountId: string, tenantId: string, tenants: Tenant[]): boolean {
  return tenants.some((tenant) => tenant.id === tenantId && tenant.accountId === accountId)
}

function requiredText(value: string | null | undefined, label: string): ValidationMessage[] {
  return value?.trim() ? [] : [{ level: 'error', message: `${label} is required.` }]
}

const INTEGER_FIELD_LABELS: Array<[string, string]> = [
  ['licenses', 'Licenses'],
  ['users', 'Users'],
  ['concurrentSearches', 'Concurrent searches'],
  ['dailySearches', 'Daily searches'],
  ['monthlySearches', 'Monthly searches'],
  ['concurrentAnalyses', 'Concurrent analyses'],
  ['dailyAnalyses', 'Daily analyses'],
  ['monthlyAnalyses', 'Monthly analyses'],
  ['standardMonitors', 'Standard monitors'],
  ['fullMonitors', 'Full monitors'],
  ['apiDailyQty', 'API daily quantity'],
  ['apiMonthlyQty', 'API monthly quantity'],
]

function validateIntegerFields(row: NewTenantRequirement | ChangeRequestRequirement): ValidationMessage[] {
  const values = row as unknown as Record<string, unknown>

  return INTEGER_FIELD_LABELS.flatMap(([key, label]) => {
    const value = values[key]

    return value == null || value === '' || (typeof value === 'number' && Number.isInteger(value))
      ? []
      : [{ level: 'error' as const, message: `${label} must be an integer.` }]
  })
}

export function validateRequirementA(
  row: NewTenantRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    ...requiredText(row.requirementId, 'Requirement ID'),
    ...requiredText(row.deployTarget, 'System New/Existing?'),
  ]

  if (row.deployTarget === 'EXISTING_SID') {
    if (!row.existingSystemId) {
      messages.push({ level: 'error', message: 'Existing System SID is required when System New/Existing? is Existing System.' })
    } else if (!opportunityCanUseSystem(opportunity, row.existingSystemId, context)) {
      messages.push({
        level: 'error',
        message: 'Existing System SID must belong to a customer owned by the selected Sales Manager and account.',
      })
    }
  }

  return [...messages, ...validateIntegerFields(row)]
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

  return [...messages, ...validateIntegerFields(row)]
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

  if (!row.warrantyRecordId) {
    messages.push({ level: 'error', message: 'Warranty record to extend is required.' })
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

  if (opportunity.stage === 'WON' && visibleRows === 0) {
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
