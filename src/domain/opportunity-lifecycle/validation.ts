import {
  hasTenantRequirementRows,
  validateRequirementA,
  validateRequirementB,
  validateRequirementC,
  validateRequirementTenantUniqueness,
  type TenantRequirementContext,
  type ValidationMessage,
} from '@/domain/tenant-requirement'
import {
  getOpportunityMetadataForOpportunity,
  getVisibleRequirementTypesForOpportunity,
  WON_IRREVERSIBLE_MESSAGE,
} from './metadata'
import type { Opportunity, OpportunityValidationContext, Project, RequirementType } from './types'

export type OpportunityContext = TenantRequirementContext

export function getHiddenRequirementTypesWithRows(opportunity: Opportunity): RequirementType[] {
  const visibleTypes = new Set(getVisibleRequirementTypesForOpportunity(opportunity))
  const allTypes: RequirementType[] = ['A', 'B', 'C']

  return allTypes.filter((requirementType) => !visibleTypes.has(requirementType) && hasTenantRequirementRows(opportunity, requirementType))
}

function requiredText(value: string | null | undefined, label: string): ValidationMessage[] {
  return value?.trim() ? [] : [{ level: 'error', message: `${label} is required.` }]
}

export function validateOpportunityHeader(opportunity: Opportunity, context: OpportunityContext): ValidationMessage[] {
  const metadata = getOpportunityMetadataForOpportunity(opportunity)
  const visibleHeaderKeys = new Set(metadata.headerFields.map((field) => field.key))
  const messages: ValidationMessage[] = [
    ...requiredText(opportunity.opportunityId, 'Opportunity ID'),
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

  if (
    opportunity.stage === 'POC' &&
    opportunity.pocStartDate &&
    opportunity.pocEndDate &&
    opportunity.pocEndDate < opportunity.pocStartDate
  ) {
    messages.push({ level: 'error', message: 'POC End Date cannot be earlier than POC Start Date.' })
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
  const visibleTypes = getVisibleRequirementTypesForOpportunity(opportunity)
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

export function validateOpportunityTransition(opportunity: Opportunity, savedOpportunity: Opportunity): string[] {
  const messages: string[] = []

  if (savedOpportunity.stage === 'WON' && opportunity.stage !== 'WON') {
    messages.push(WON_IRREVERSIBLE_MESSAGE)
  }

  return messages
}

export function shouldConfirmWonTransition(opportunity: Opportunity, savedOpportunity: Opportunity): boolean {
  return savedOpportunity.stage !== 'WON' && opportunity.stage === 'WON'
}

export function shouldConfirmPocProjectSync(opportunity: Opportunity, _savedOpportunity: Opportunity, _projects: Project[]): boolean {
  return opportunity.stage === 'POC'
}

export function opportunityValidationContext(context: OpportunityValidationContext): OpportunityValidationContext {
  return context
}
