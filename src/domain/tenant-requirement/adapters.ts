import type {
  ChangeRequestRequirement,
  NewTenantRequirement,
  StandardRenewalRequirement,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'
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

export function createNewTenantRequirement(index: number, mapCenter = ''): NewTenantRequirement {
  return {
    ...createBaseRequirement(`A-${String(index + 1).padStart(3, '0')}`),
    mapCenter,
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
