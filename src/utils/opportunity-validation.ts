import {
  getOpportunityMetadata,
  getVisibleRequirementTypes,
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
  type RequirementColumnMetadata,
} from '@/config/opportunity-metadata'
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

function isEmpty(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0)
}

function findDuplicateValue(values: string[]): string | null {
  const seen = new Set<string>()
  for (const value of values) {
    if (seen.has(value)) return value
    seen.add(value)
  }
  return null
}

const INTEGER_FIELD_LABELS: Array<[string, string]> = [
  ['licenses', 'Licenses'],
  ['users', 'Users'],
  ['concurrentSearches', 'Concurrent searches'],
  ['dailySearches', 'Daily searches'],
  ['monthlySearches', 'Monthly searches'],
  ['concurrentAnalyses', 'Concurrent analyses'],
  ['topicAnalyses', 'Topic analysis'],
  ['dailyAnalyses', 'Daily analyses'],
  ['monthlyAnalyses', 'Monthly analyses'],
  ['tangles', 'Tangles'],
  ['tanglesGo', 'Tangles Go'],
  ['webloc', 'Webloc'],
  ['webeye', 'Webeye'],
  ['ingest', 'Ingest'],
  ['standardMonitors', 'Standard monitors'],
  ['fullMonitors', 'Full monitors'],
  ['topicMonitors', 'Topic monitors'],
  ['apiDailyQty', 'API daily quantity'],
  ['apiMonthlyQty', 'API monthly quantity'],
]

const MODULE_QUANTITY_FIELD_LABELS: Array<[string, string]> = [
  ['tangles', 'Tangles'],
  ['tanglesGo', 'Tangles Go'],
  ['webloc', 'Webloc'],
  ['webeye', 'Webeye'],
  ['ingest', 'Ingest'],
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

function validateModuleQuantitiesDoNotExceedUsers(
  row: NewTenantRequirement | ChangeRequestRequirement,
  gridName: string,
  rowIndex: number,
): ValidationMessage[] {
  const values = row as unknown as Record<string, unknown>
  const users = values.users
  if (typeof users !== 'number' || !Number.isInteger(users)) return []

  return MODULE_QUANTITY_FIELD_LABELS.flatMap(([key, label]) => {
    const value = values[key]
    return typeof value === 'number' && value > users
      ? [
          {
            level: 'error' as const,
            message: `${gridName} row ${rowIndex + 1}: ${label} - Module quantity cannot exceed number of users.`,
          },
        ]
      : []
  })
}

function validateLicensesDoNotExceedUsers(
  row: NewTenantRequirement | ChangeRequestRequirement,
  gridName: string,
  rowIndex: number,
): ValidationMessage[] {
  const values = row as unknown as Record<string, unknown>
  const users = values.users
  const licenses = values.licenses

  return typeof users === 'number' && typeof licenses === 'number' && licenses > users
    ? [
        {
          level: 'error' as const,
          message: `${gridName} row ${rowIndex + 1}: Licenses cannot exceed number of users.`,
        },
      ]
    : []
}

function validateRequiredGridFields(
  row: NewTenantRequirement | ChangeRequestRequirement | StandardRenewalRequirement,
  columns: RequirementColumnMetadata[],
  gridName: string,
  rowIndex: number,
): ValidationMessage[] {
  const values = row as unknown as Record<string, unknown>

  return columns.flatMap((column) => {
    if (column.key === 'existingSystemId' && values.deployTarget !== 'EXISTING_SID') return []
    if (!column.required) return []

    return isEmpty(values[column.key])
      ? [{ level: 'error' as const, message: `${gridName} row ${rowIndex + 1}: ${column.label} is required.` }]
      : []
  })
}

export function validateRequirementA(
  row: NewTenantRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
  rowIndex = 0,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    ...validateRequiredGridFields(row, requirementAColumns, 'Grid A', rowIndex),
  ]

  if (row.deployTarget === 'EXISTING_SID') {
    if (!row.existingSystemId) {
      messages.push({ level: 'error', message: 'Existing System SID is required when System New/Existing? is Existing System.' })
    } else if (!opportunityCanUseSystem(opportunity, row.existingSystemId, context)) {
      messages.push({
        level: 'error',
        message: "Existing System SID must belong to one of the selected deal owner's accounts.",
      })
    }
  }

  if (isEmpty(row.tangles) && isEmpty(row.webloc)) {
    messages.push({ level: 'error', message: `Grid A row ${rowIndex + 1}: Tangles or Webloc is required.` })
  }

  return [
    ...messages,
    ...validateIntegerFields(row),
    ...validateLicensesDoNotExceedUsers(row, 'Grid A', rowIndex),
    ...validateModuleQuantitiesDoNotExceedUsers(row, 'Grid A', rowIndex),
  ]
}

export function validateRequirementB(
  row: ChangeRequestRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
  rowIndex = 0,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [...validateRequiredGridFields(row, requirementBColumns, 'Grid B', rowIndex)]

  if (!row.tenantId) {
    messages.push({ level: 'error', message: 'Existing tenant is required.' })
  } else if (!accountOwnsTenant(opportunity.accountId, row.tenantId, context.tenants)) {
    messages.push({ level: 'error', message: 'Selected tenant must belong to the selected account.' })
  }

  const tenant = context.tenants.find((candidate) => candidate.id === row.tenantId)
  if (tenant && row.systemId !== tenant.systemId) {
    messages.push({ level: 'warning', message: 'SID will be reset from the selected tenant.' })
  }

  if (isEmpty(row.tangles) && isEmpty(row.webloc)) {
    messages.push({ level: 'error', message: `Grid B row ${rowIndex + 1}: Tangles or Webloc is required.` })
  }

  return [
    ...messages,
    ...validateIntegerFields(row),
    ...validateLicensesDoNotExceedUsers(row, 'Grid B', rowIndex),
    ...validateModuleQuantitiesDoNotExceedUsers(row, 'Grid B', rowIndex),
  ]
}

export function validateRequirementC(
  row: StandardRenewalRequirement,
  opportunity: Opportunity,
  context: OpportunityContext,
  rowIndex = 0,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [...validateRequiredGridFields(row, requirementCColumns, 'Grid C', rowIndex)]

  if (!row.tenantId) {
    messages.push({ level: 'error', message: 'Existing tenant is required.' })
  } else if (!accountOwnsTenant(opportunity.accountId, row.tenantId, context.tenants)) {
    messages.push({ level: 'error', message: 'Selected tenant must belong to the selected account.' })
  }

  return messages
}

export function validateRequirementTenantUniqueness(opportunity: Opportunity): ValidationMessage[] {
  const messages: ValidationMessage[] = []
  const duplicateExistingSystem = findDuplicateValue(
    opportunity.newTenantRequirements
      .filter((requirement) => requirement.deployTarget === 'EXISTING_SID')
      .map((requirement) => requirement.existingSystemId ?? '')
      .filter(Boolean),
  )
  const duplicateChangeTenant = findDuplicateValue(
    opportunity.changeRequestRequirements.map((requirement) => requirement.tenantId).filter(Boolean),
  )
  const duplicateRenewalTenant = findDuplicateValue(
    opportunity.standardRenewalRequirements.map((requirement) => requirement.tenantId).filter(Boolean),
  )

  if (duplicateExistingSystem) {
    messages.push({ level: 'error', message: 'The same existing system cannot appear more than once in Grid A.' })
  }

  if (duplicateChangeTenant) {
    messages.push({ level: 'error', message: 'The same existing tenant cannot appear more than once in Grid B.' })
  }

  if (duplicateRenewalTenant) {
    messages.push({ level: 'error', message: 'The same existing tenant cannot appear more than once in Grid C.' })
  }

  return messages
}

export function validateOpportunityHeader(opportunity: Opportunity, context: OpportunityContext): ValidationMessage[] {
  const metadata = getOpportunityMetadata(opportunity.type, opportunity.subType)
  const visibleHeaderKeys = new Set(metadata.headerFields.map((field) => field.key))
  const messages: ValidationMessage[] = [
    ...requiredText(opportunity.opportunityId, 'Salesforce Opportunity ID'),
    ...requiredText(opportunity.opportunityName, 'Opportunity name'),
    ...requiredText(opportunity.accountId, 'Account'),
    ...requiredText(opportunity.salesManagerId, 'Sales Manager / Deal Owner'),
  ]

  if (visibleHeaderKeys.has('deliveryDate') && !opportunity.deliveryDate) {
    messages.push({ level: 'error', message: 'Delivery date is required.' })
  }

  if (visibleHeaderKeys.has('pocStartDate') && !opportunity.pocStartDate) {
    messages.push({ level: 'error', message: 'Start Date is required.' })
  }

  if (visibleHeaderKeys.has('pocEndDate') && !opportunity.pocEndDate) {
    messages.push({ level: 'error', message: 'End Date is required.' })
  }

  if (visibleHeaderKeys.has('warrantyRecordId') && !opportunity.warrantyRecordId?.trim()) {
    messages.push({ level: 'error', message: 'Warranty record to extend is required.' })
  }

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

  if (visibleTypes.includes('A')) {
    opportunity.newTenantRequirements.forEach((row, index) => {
      validateRequirementA(row, opportunity, context, index).forEach((message) => messages.push(message))
    })
  }
  if (visibleTypes.includes('B')) {
    opportunity.changeRequestRequirements.forEach((row, index) => {
      validateRequirementB(row, opportunity, context, index).forEach((message) => messages.push(message))
    })
  }
  if (visibleTypes.includes('C')) {
    opportunity.standardRenewalRequirements.forEach((row, index) => {
      validateRequirementC(row, opportunity, context, index).forEach((message) => messages.push(message))
    })
  }

  validateRequirementTenantUniqueness(opportunity).forEach((message) => messages.push(message))

  return messages
}

export function validateOpportunity(opportunity: Opportunity, context: OpportunityContext): ValidationMessage[] {
  return [...validateOpportunityHeader(opportunity, context), ...validateOpportunityRequirements(opportunity, context)]
}
