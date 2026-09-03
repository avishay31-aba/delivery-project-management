export {
  getAccountTenants,
  getEligibleCustomerExistingTenants,
  getOpportunityExistingSidSystems,
  opportunityExistingAssetTenants,
  opportunityExistingSystemGroups,
  getSalesManagerAccounts,
  resolveTenantSid,
  validateRequirementA,
  validateRequirementB,
  validateRequirementC,
  validateRequirementTenantUniqueness,
} from '@/domain/tenant-requirement'
export {
  getHiddenRequirementTypesWithRows,
  validateOpportunity,
  validateOpportunityHeader,
  validateOpportunityRequirements,
  type OpportunityContext,
} from '@/domain/opportunity-lifecycle'
