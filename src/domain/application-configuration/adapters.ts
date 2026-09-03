import type { NewTenantRequirement, Tenant, TenantConfiguration } from '@/data/seed.types'
import { defaultHostingIntent } from '@/domain/hosting-context'
import { numericOrNull } from './service'

export function applicationConfigurationFromRequirement(
  requirement: NewTenantRequirement,
  product: string,
): TenantConfiguration {
  return {
    product,
    licenses: requirement.licenses,
    users: requirement.users,
    concurrentSearches: requirement.concurrentSearches,
    dailySearches: requirement.dailySearches,
    monthlySearches: requirement.monthlySearches,
    concurrentAnalyses: requirement.concurrentAnalyses,
    dailyAnalyses: requirement.dailyAnalyses,
    monthlyAnalyses: requirement.monthlyAnalyses,
    topicAnalyses: requirement.topicAnalyses,
    standardMonitors: requirement.standardMonitors,
    fullMonitors: requirement.fullMonitors,
    topicMonitors: requirement.topicMonitors,
    mapCenter: requirement.mapCenter,
    tangles: requirement.tangles,
    tanglesGo: requirement.tanglesGo,
    webloc: requirement.webloc,
    webeye: requirement.webeye,
    ingest: requirement.ingest,
    blockchain: numericOrNull(requirement.blockchain),
    crossSystemFeatures: [...requirement.crossSystemFeatures],
    apiEnabled: requirement.apiEnabled,
    apiDailyQty: requirement.apiDailyQty,
    apiMonthlyQty: requirement.apiMonthlyQty,
    aiFeatures: [...requirement.aiFeatures],
    additionalFeatures: [...requirement.additionalFeatures],
  }
}

export function applicationConfigurationFromTenant(tenant: Tenant, productOverride?: string): TenantConfiguration {
  return {
    product: productOverride ?? tenant.configuration?.product ?? tenant.productType ?? '',
    licenses: tenant.configuration?.licenses ?? tenant.licenses ?? null,
    users: tenant.configuration?.users ?? tenant.users ?? null,
    concurrentSearches: tenant.configuration?.concurrentSearches ?? tenant.concurrentSearches ?? null,
    dailySearches: tenant.configuration?.dailySearches ?? tenant.dailySearches ?? null,
    monthlySearches: tenant.configuration?.monthlySearches ?? tenant.monthlySearches ?? null,
    concurrentAnalyses: tenant.configuration?.concurrentAnalyses ?? tenant.concurrentAnalyses ?? null,
    dailyAnalyses: tenant.configuration?.dailyAnalyses ?? tenant.dailyAnalyses ?? null,
    monthlyAnalyses: tenant.configuration?.monthlyAnalyses ?? tenant.monthlyAnalyses ?? null,
    topicAnalyses: tenant.configuration?.topicAnalyses ?? tenant.topicAnalyses ?? null,
    standardMonitors: tenant.configuration?.standardMonitors ?? tenant.standardMonitors ?? null,
    fullMonitors: tenant.configuration?.fullMonitors ?? tenant.fullMonitors ?? null,
    topicMonitors: tenant.configuration?.topicMonitors ?? tenant.topicMonitors ?? null,
    mapCenter: tenant.configuration?.mapCenter ?? tenant.mapCenter ?? '',
    tangles: tenant.configuration?.tangles ?? tenant.tangles ?? null,
    tanglesGo: tenant.configuration?.tanglesGo ?? tenant.tanglesGo ?? null,
    webloc: tenant.configuration?.webloc ?? tenant.webloc ?? null,
    webeye: tenant.configuration?.webeye ?? tenant.webeye ?? null,
    ingest: tenant.configuration?.ingest ?? tenant.ingest ?? null,
    blockchain: numericOrNull(tenant.configuration?.blockchain ?? tenant.blockchain),
    crossSystemFeatures: tenant.configuration?.crossSystemFeatures ?? tenant.crossSystemFeatures ?? [],
    apiEnabled: tenant.configuration?.apiEnabled ?? tenant.apiEnabled ?? '',
    apiDailyQty: tenant.configuration?.apiDailyQty ?? tenant.apiDailyQty ?? null,
    apiMonthlyQty: tenant.configuration?.apiMonthlyQty ?? tenant.apiMonthlyQty ?? null,
    aiFeatures: tenant.configuration?.aiFeatures ?? tenant.aiFeatures ?? [],
    additionalFeatures: tenant.configuration?.additionalFeatures ?? tenant.additionalFeatures ?? [],
  }
}

export function applicationConfigurationPatchFromTenant(tenant?: Tenant): Partial<NewTenantRequirement> {
  if (!tenant) return {}
  const defaultIntent = defaultHostingIntent()

  return {
    hostingType: tenant.hostingType ?? defaultIntent.hostingType,
    cloudPlatform: tenant.cloudPlatform ?? defaultIntent.cloudPlatform,
    productType: tenant.productType,
    mapCenter: tenant.mapCenter ?? tenant.country,
    licenses: numericOrNull(tenant.licenses),
    users: numericOrNull(tenant.users),
    concurrentSearches: numericOrNull(tenant.concurrentSearches),
    dailySearches: numericOrNull(tenant.dailySearches),
    monthlySearches: numericOrNull(tenant.monthlySearches),
    concurrentAnalyses: numericOrNull(tenant.concurrentAnalyses),
    topicAnalyses: numericOrNull(tenant.topicAnalyses),
    dailyAnalyses: numericOrNull(tenant.dailyAnalyses),
    monthlyAnalyses: numericOrNull(tenant.monthlyAnalyses),
    tangles: numericOrNull(tenant.tangles),
    tanglesGo: numericOrNull(tenant.tanglesGo),
    webloc: numericOrNull(tenant.webloc),
    webeye: numericOrNull(tenant.webeye),
    ingest: numericOrNull(tenant.ingest),
    blockchain: numericOrNull(tenant.blockchain),
    crossSystemFeatures: tenant.crossSystemFeatures ?? [],
    apiEnabled: tenant.apiEnabled ?? '',
    apiDailyQty: numericOrNull(tenant.apiDailyQty),
    apiMonthlyQty: numericOrNull(tenant.apiMonthlyQty),
    aiFeatures: tenant.aiFeatures ?? [],
    additionalFeatures: tenant.additionalFeatures ?? [],
    standardMonitors: numericOrNull(tenant.standardMonitors),
    fullMonitors: numericOrNull(tenant.fullMonitors),
    topicMonitors: numericOrNull(tenant.topicMonitors),
  }
}
