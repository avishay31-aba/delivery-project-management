import type { Opportunity, OpportunityValidationContext } from './types'
import { WON_IRREVERSIBLE_MESSAGE, WON_POC_MESSAGE } from './metadata'

export function validateOpportunityTransition(opportunity: Opportunity, savedOpportunity: Opportunity): string[] {
  const messages: string[] = []

  if (savedOpportunity.stage === 'WON' && opportunity.stage !== 'WON') {
    messages.push(WON_IRREVERSIBLE_MESSAGE)
  }

  if (opportunity.stage === 'WON' && opportunity.type === 'POC') {
    messages.push(WON_POC_MESSAGE)
  }

  return messages
}

export function opportunityValidationContext(context: OpportunityValidationContext): OpportunityValidationContext {
  return context
}
