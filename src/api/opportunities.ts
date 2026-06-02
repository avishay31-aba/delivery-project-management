import { useAppStore } from '@/store/useAppStore'
import type { Opportunity } from '@/data/seed.types'

export const opportunitiesApi = {
  list(): Opportunity[] {
    return useAppStore.getState().opportunities
  },

  getByOpportunityId(opportunityId: string): Opportunity | undefined {
    return useAppStore.getState().opportunities.find((opportunity) => opportunity.opportunityId === opportunityId)
  },
}
