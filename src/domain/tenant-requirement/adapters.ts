import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  OpportunityDealPackage,
  StandardRenewalRequirement,
  Tenant,
  TenantConfiguration,
  WarrantyRecord,
} from '@/data/seed.types'
import { ADDITIONAL_FEATURE_OPTIONS, AI_OPTIONS } from '@/config/picklist-options'
import { applicationConfigurationFromTenant, applicationConfigurationPatchFromTenant } from '@/domain/application-configuration'
import { defaultHostingIntent, requiresCloudPlatform } from '@/domain/hosting-context'
import { warrantyRecordPatch } from '@/domain/warranty-collection'
import { activeTenantSystemId } from './service'

function generatedRequirementId(index: number): string {
  return `A-${String(index + 1).padStart(3, '0')}`
}

export function createBaseRequirement(requirementId: string): Omit<
  NewTenantRequirement,
  'deployTarget' | 'existingSystemId'
> {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId,
    ...defaultHostingIntent(),
    productType: 'Tangles',
    mapCenter: '',
    licenses: null,
    users: null,
    concurrentSearches: null,
    dailySearches: null,
    monthlySearches: null,
    concurrentAnalyses: null,
    topicAnalyses: null,
    dailyAnalyses: null,
    monthlyAnalyses: null,
    tangles: null,
    tanglesGo: null,
    webloc: null,
    webeye: null,
    ingest: null,
    blockchain: null,
    crossSystemFeatures: [],
    apiEnabled: '',
    apiDailyQty: null,
    apiMonthlyQty: null,
    aiFeatures: [],
    additionalFeatures: [],
    standardMonitors: 10,
    fullMonitors: null,
    topicMonitors: null,
  }
}

function dealPackagePatch(dealPackage: OpportunityDealPackage, mapCenter: string): Partial<NewTenantRequirement> {
  if (dealPackage === 'Platinum') {
    return {
      hostingType: 'Cloud',
      cloudPlatform: 'AWS',
      productType: 'Tangles',
      mapCenter,
      users: 25,
      licenses: 25,
      concurrentSearches: 50,
      concurrentAnalyses: 25,
      standardMonitors: 40,
      tangles: 25,
      tanglesGo: 25,
      webloc: 25,
      webeye: 25,
      ingest: 25,
      aiFeatures: AI_OPTIONS,
      additionalFeatures: ADDITIONAL_FEATURE_OPTIONS,
    }
  }

  if (dealPackage === 'Gold') {
    return {
      hostingType: 'Cloud',
      cloudPlatform: 'AWS',
      productType: 'Tangles',
      mapCenter,
      users: 10,
      licenses: 10,
      concurrentSearches: 20,
      concurrentAnalyses: 10,
      standardMonitors: 20,
      tangles: 10,
      webloc: 10,
      aiFeatures: ['OCR', 'Landmark', 'Face Detection'],
      additionalFeatures: ['Post Translation', 'Advanced Search'],
    }
  }

  return {
    hostingType: 'Cloud',
    cloudPlatform: 'AWS',
    productType: 'Tangles',
    mapCenter,
    users: 5,
    licenses: 5,
    concurrentSearches: 10,
    concurrentAnalyses: 5,
    standardMonitors: 10,
    tangles: 5,
  }
}

export function createNewTenantRequirement(
  index: number,
  mapCenter = '',
  dealPackage: OpportunityDealPackage = 'Silver',
  requirementId = generatedRequirementId(index),
): NewTenantRequirement {
  return {
    ...createBaseRequirement(requirementId),
    ...dealPackagePatch(dealPackage, mapCenter),
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
  }
}

export function newTenantRequirementWithDealPackage(
  requirement: NewTenantRequirement,
  mapCenter = '',
  dealPackage: OpportunityDealPackage = 'Silver',
): NewTenantRequirement {
  return {
    ...requirement,
    ...dealPackagePatch(dealPackage, mapCenter),
  }
}

export function createChangeRequestRequirement(index: number, tenant?: Tenant, mapCenter = '', requirementId = generatedRequirementId(index)): ChangeRequestRequirement {
  return {
    ...createBaseRequirement(requirementId),
    mapCenter,
    ...applicationConfigurationPatchFromTenant(tenant),
    tenantId: tenant?.id ?? '',
    systemId: tenant ? activeTenantSystemId(tenant) : '',
    baselineConfiguration: changeRequestBaselineConfigurationFromTenant(tenant),
  }
}

export function changeRequestBaselineConfigurationFromTenant(tenant?: Tenant): TenantConfiguration | undefined {
  return tenant ? applicationConfigurationFromTenant(tenant) : undefined
}

export function changeRequestRequirementWithTenantBaseline(
  requirement: ChangeRequestRequirement,
  tenant?: Tenant,
  options: { replaceExisting?: boolean } = {},
): ChangeRequestRequirement {
  if (!tenant) return requirement
  if (requirement.baselineConfiguration && !options.replaceExisting) {
    return {
      ...requirement,
      cloudPlatform: requiresCloudPlatform(requirement.hostingType) ? requirement.cloudPlatform : '',
    }
  }
  return {
    ...requirement,
    baselineConfiguration: changeRequestBaselineConfigurationFromTenant(tenant),
    cloudPlatform: requiresCloudPlatform(requirement.hostingType) ? requirement.cloudPlatform : '',
  }
}

export function createStandardRenewalRequirement(index: number, tenant?: Tenant, warrantyRecord?: WarrantyRecord, requirementId = generatedRequirementId(index)): StandardRenewalRequirement {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId,
    ...applicationConfigurationPatchFromTenant(tenant),
    tenantId: tenant?.id ?? '',
    systemId: tenant ? activeTenantSystemId(tenant) : '',
    warrantyRecordId: warrantyRecord?.warrantyRecordId ?? '',
    warrantyStatus: warrantyRecordPatch(warrantyRecord).warrantyStatus ?? tenant?.warrantyStatus ?? 'NOT_SET',
    warrantyEndDate: warrantyRecordPatch(warrantyRecord).warrantyEndDate ?? tenant?.warrantyEndDate ?? null,
  }
}
