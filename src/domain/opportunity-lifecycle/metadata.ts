import type { OpportunitySubType, OpportunityType } from './types'

export const OPPORTUNITY_SUB_TYPE_OPTIONS: Record<OpportunityType, OpportunitySubType[]> = {
  POC: ['FREE', 'PAID'],
  DELIVERY: ['NEW', 'UPSELL'],
  RENEWAL: ['STANDARD', 'UPSELL', 'DOWN_SELL'],
}

export const WON_IRREVERSIBLE_MESSAGE = 'WON is irreversible. A WON Opportunity cannot be changed back to Open.'
export const WON_POC_MESSAGE = 'WON Opportunities must be Delivery or Renewal to create a final Project.'
