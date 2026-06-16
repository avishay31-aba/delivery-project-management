import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  Opportunity,
  StandardRenewalRequirement,
} from '@/data/seed.types'
import {
  validateApplicationConfigurationIntegerFields,
  validateApplicationLicensesDoNotExceedUsers,
  validateApplicationModuleQuantitiesDoNotExceedUsers,
} from '@/domain/application-configuration'
import {
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
} from './metadata'
import {
  accountOwnsTenant,
  findDuplicateValue,
  isEmpty,
  opportunityCanUseSystem,
} from './service'
import type { RequirementColumnMetadata, TenantRequirementContext, ValidationMessage } from './types'

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
  context: TenantRequirementContext,
  rowIndex = 0,
): ValidationMessage[] {
  const messages: ValidationMessage[] = [
    ...validateRequiredGridFields(row, requirementAColumns, 'Grid A', rowIndex),
  ]

  if (row.deployTarget === 'EXISTING_SID') {
    if (!row.existingSystemId) {
      messages.push({ level: 'error', message: 'Existing System SID is required when System New/Existing? is Existing System.' })
    } else if (!opportunityCanUseSystem(opportunity, row.existingSystemId, context.accounts, context.systems)) {
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
    ...validateApplicationConfigurationIntegerFields(row as unknown as Record<string, unknown>),
    ...validateApplicationLicensesDoNotExceedUsers(row as unknown as Record<string, unknown>, 'Grid A', rowIndex),
    ...validateApplicationModuleQuantitiesDoNotExceedUsers(row as unknown as Record<string, unknown>, 'Grid A', rowIndex),
  ]
}

export function validateRequirementB(
  row: ChangeRequestRequirement,
  opportunity: Opportunity,
  context: TenantRequirementContext,
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
    ...validateApplicationConfigurationIntegerFields(row as unknown as Record<string, unknown>),
    ...validateApplicationLicensesDoNotExceedUsers(row as unknown as Record<string, unknown>, 'Grid B', rowIndex),
    ...validateApplicationModuleQuantitiesDoNotExceedUsers(row as unknown as Record<string, unknown>, 'Grid B', rowIndex),
  ]
}

export function validateRequirementC(
  row: StandardRenewalRequirement,
  opportunity: Opportunity,
  context: TenantRequirementContext,
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
