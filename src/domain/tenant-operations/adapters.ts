import { incrementCounter } from '@/data/id-generator'
import type { AllocationType, Tenant } from '@/data/seed.types'
import { applicationConfigurationFromRequirement } from '@/domain/application-configuration'
import { createProjectTenantLink } from '@/domain/allocation-context'
import { tenantHostingPatchFromSystem } from '@/domain/hosting-context'
import { SYSTEM_SOURCE_REUSED_INTERNAL, systemSource } from '@/domain/system-inventory'
import type { TenantCreationDraft, TenantCreationSource } from './types'

export function cloneTenant(tenant: Tenant): Tenant {
  return JSON.parse(JSON.stringify(tenant)) as Tenant
}

export function tenantCreationDraftFromSource(source: TenantCreationSource, now: string): TenantCreationDraft {
  const nextTenantId = incrementCounter(source.idCounters, 'tid')
  const tenantType = source.project.mainType === 'POC' || source.system.systemClass === 'POC_DEMO_TRAINING'
    ? 'POC'
    : 'CUSTOMER'
  const configuration = applicationConfigurationFromRequirement(source.requirement, source.system.productType)
  const tenant: Tenant = {
    id: `ten-${crypto.randomUUID()}`,
    tid: nextTenantId.id,
    tenantName: `${nextTenantId.id} ${source.project.accountName || (source.account?.accountName ?? '')}`.trim(),
    accountId: source.account?.id ?? source.system.accountId ?? '',
    systemId: source.system.id,
    deliveryPid: source.project.pid,
    tenantType,
    tenantFormType: tenantType === 'POC' ? 'POC' : 'CUSTOMER',
    hostedSystemId: source.system.id,
    hostingSid: source.system.sid ?? '',
    sourceRequirementId: source.requirement.requirementId,
    configuration,
    accountName: source.project.accountName || (source.account?.accountName ?? ''),
    country: source.opportunity.country ?? source.account?.country ?? source.system.country ?? '',
    timeGroup: source.opportunity.timeGroup ?? source.account?.timeGroup ?? source.system.timeGroup,
    operationalStatus: 'Active',
    contractStatus: 'UNDER_CONTRACT',
    hostedSystemHistory: [{ systemId: source.system.id, startedAt: now, endedAt: null, reason: 'Created' }],
    productType: configuration.product,
    ...tenantHostingPatchFromSystem(source.system),
    statisticsId: source.requirement.statisticsId,
    authId: source.requirement.authId,
    rdmId: source.requirement.rdmId,
    mapCenter: configuration.mapCenter,
    licenses: configuration.licenses,
    users: configuration.users,
    concurrentSearches: configuration.concurrentSearches,
    dailySearches: configuration.dailySearches,
    monthlySearches: configuration.monthlySearches,
    concurrentAnalyses: configuration.concurrentAnalyses,
    topicAnalyses: configuration.topicAnalyses,
    dailyAnalyses: configuration.dailyAnalyses,
    monthlyAnalyses: configuration.monthlyAnalyses,
    standardMonitors: configuration.standardMonitors,
    fullMonitors: configuration.fullMonitors,
    topicMonitors: configuration.topicMonitors,
    tangles: configuration.tangles,
    tanglesGo: configuration.tanglesGo,
    webloc: configuration.webloc,
    webeye: configuration.webeye,
    ingest: configuration.ingest,
    blockchain: configuration.blockchain,
    crossSystemFeatures: [...configuration.crossSystemFeatures],
    apiEnabled: configuration.apiEnabled,
    apiDailyQty: configuration.apiDailyQty,
    apiMonthlyQty: configuration.apiMonthlyQty,
    aiFeatures: [...configuration.aiFeatures],
    additionalFeatures: [...configuration.additionalFeatures],
    warrantyStatus: 'NOT_SET',
    warrantyStartDate: null,
    warrantyEndDate: null,
    pocStartDate: source.opportunity.pocStartDate ?? null,
    pocEndDate: source.opportunity.pocEndDate ?? null,
    createdAt: now,
    updatedAt: now,
  }
  const allocationType = source.projectSystemLink?.allocationType ?? tenantAllocationTypeForSystem(source.system)
  return {
    idCounters: nextTenantId.counters,
    projectTenant: createProjectTenantLink(source.project.id, tenant.id, source.system.id, allocationType, now),
    tenant,
  }
}

function tenantAllocationTypeForSystem(system: TenantCreationSource['system']): AllocationType {
  return systemSource(system) === SYSTEM_SOURCE_REUSED_INTERNAL ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM'
}
