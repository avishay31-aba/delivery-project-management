import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  OpportunityDealPackage,
  StandardRenewalRequirement,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'
import { ADDITIONAL_FEATURE_OPTIONS, AI_OPTIONS } from '@/config/picklist-options'
import { applicationConfigurationPatchFromTenant } from '@/domain/application-configuration'
import { defaultHostingIntent } from '@/domain/hosting-context'
import { warrantyRecordPatch } from '@/domain/warranty-collection'

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
    blockchain: '',
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
): NewTenantRequirement {
  return {
    ...createBaseRequirement(`A-${String(index + 1).padStart(3, '0')}`),
    ...dealPackagePatch(dealPackage, mapCenter),
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
  }
}

export function createChangeRequestRequirement(index: number, tenant?: Tenant, mapCenter = ''): ChangeRequestRequirement {
  return {
    ...createBaseRequirement(`B-${String(index + 1).padStart(3, '0')}`),
    mapCenter,
    ...applicationConfigurationPatchFromTenant(tenant),
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
  }
}

export function createStandardRenewalRequirement(index: number, tenant?: Tenant, warrantyRecord?: WarrantyRecord): StandardRenewalRequirement {
  return {
    id: `req-${crypto.randomUUID()}`,
    requirementId: `C-${String(index + 1).padStart(3, '0')}`,
    ...applicationConfigurationPatchFromTenant(tenant),
    tenantId: tenant?.id ?? '',
    systemId: tenant?.systemId ?? '',
    warrantyRecordId: warrantyRecord?.warrantyRecordId ?? '',
    warrantyStatus: warrantyRecordPatch(warrantyRecord).warrantyStatus ?? tenant?.warrantyStatus ?? 'NOT_SET',
    warrantyEndDate: warrantyRecordPatch(warrantyRecord).warrantyEndDate ?? tenant?.warrantyEndDate ?? null,
  }
}
