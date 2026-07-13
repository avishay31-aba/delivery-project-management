import { incrementCounter } from '@/data/id-generator'
import type { AllocationType, NewTenantRequirement, Project, System, Tenant, TenantConfiguration } from '@/data/seed.types'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { generateBusinessId } from '@/domain/business-identity'
import {
  applicationConfigurationFromRequirement,
  applicationConfigurationFromTenant,
} from '@/domain/application-configuration'
import { createProjectTenantLink } from '@/domain/allocation-context'
import {
  cloudPlatformOptionsForHosting,
  HOSTING_OPTIONS,
  hostingSnapshotFromTenant,
  hostingSnapshotFromSystem,
  tenantHostingPatchFromSystem,
} from '@/domain/hosting-context'
import { normalizeEngagementCircleSnapshot } from '@/domain/engagement-circle'
import { normalizeRemarks } from '@/domain/remarks'
import { SYSTEM_SOURCE_REUSED_INTERNAL, systemSource } from '@/domain/system-inventory'
import { daysBeforeExpiration, daysBetween, normalizeTenantWarranties } from '@/domain/warranty-collection'
import { tenantFormType, tenantFormTypeForSystem } from './service'
import type { TenantConfigurationSaveDraft, TenantCreationDraft, TenantCreationSource } from './types'

export function cloneTenant(tenant: Tenant): Tenant {
  return JSON.parse(JSON.stringify(tenant)) as Tenant
}

export function normalizeTenantOperationRecord(tenant: Tenant, systems: System[]): Tenant {
  const history =
    tenant.hostedSystemHistory && tenant.hostedSystemHistory.length > 0
      ? tenant.hostedSystemHistory
      : tenant.systemId
        ? [{ systemId: tenant.systemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' as const }]
        : []

  return {
    ...tenant,
    contractStatus: tenant.contractStatus ?? 'UNDER_CONTRACT',
    hostedSystemHistory: history,
    tenantFormType: tenant.tenantType === 'PENLINK_INTERNAL' ? 'INTERNAL' : tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER',
    hostedSystemId: tenant.hostedSystemId ?? tenant.systemId,
    hostingSid: tenant.hostingSid ?? systems.find((system) => system.id === tenant.systemId)?.sid ?? '',
    configuration: applicationConfigurationFromTenant(tenant),
    hostingSnapshot: tenant.hostingSnapshot ?? hostingSnapshotFromTenant(tenant, systems),
    engagementCircle: normalizeEngagementCircleSnapshot(tenant.engagementCircle),
    remarks: normalizeRemarks(tenant.remarks),
    configurationHistory: Array.isArray(tenant.configurationHistory) ? tenant.configurationHistory : [],
    warranties: normalizeTenantWarranties(tenant.warranties),
    documents: Array.isArray(tenant.documents) ? tenant.documents : [],
  }
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

export function tenantConfigurationFromTenant(tenant: Tenant, system?: System): TenantConfiguration {
  const configuration = applicationConfigurationFromTenant(tenant, system?.productType)
  return {
    ...configuration,
    mapCenter: system ? system.mapCenter ?? '' : configuration.mapCenter,
  }
}

export function tenantRequirementFromConfiguration(
  tenant: Tenant,
  configuration: TenantConfiguration,
  system?: System,
): NewTenantRequirement {
  const hostingType = system?.hostingType ?? tenant.hostingType ?? HOSTING_OPTIONS[0]
  return {
    id: `tenant-config-${tenant.id}`,
    requirementId: tenant.sourceRequirementId ?? 'TENANT-CONFIG',
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
    hostingType,
    cloudPlatform: system?.cloudPlatform ?? tenant.cloudPlatform ?? cloudPlatformOptionsForHosting(hostingType)[0] ?? '',
    csp: system?.csp ?? tenant.csp,
    cloudRegion: system?.cloudRegion ?? tenant.cloudRegion,
    statisticsId: tenant.statisticsId,
    authId: tenant.authId,
    rdmId: tenant.rdmId,
    performanceTier: system?.performanceTier ?? tenant.performanceTier,
    vpnEnabled: system?.vpnEnabled ?? tenant.vpnEnabled,
    vpnType: system?.vpnType ?? tenant.vpnType,
    ipRestrictionEnabled: system?.ipRestrictionEnabled ?? tenant.ipRestrictionEnabled,
    productType: configuration.product,
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
    tangles: configuration.tangles,
    tanglesGo: configuration.tanglesGo,
    webloc: configuration.webloc,
    webeye: configuration.webeye,
    ingest: configuration.ingest,
    blockchain: configuration.blockchain,
    crossSystemFeatures: configuration.crossSystemFeatures,
    apiEnabled: configuration.apiEnabled,
    apiDailyQty: configuration.apiDailyQty,
    apiMonthlyQty: configuration.apiMonthlyQty,
    aiFeatures: configuration.aiFeatures,
    additionalFeatures: configuration.additionalFeatures,
    standardMonitors: configuration.standardMonitors,
    fullMonitors: configuration.fullMonitors,
    topicMonitors: configuration.topicMonitors,
  }
}

export function tenantConfigurationSaveDraft(draft: Tenant, saved: Tenant, system?: System, now = new Date().toISOString()): TenantConfigurationSaveDraft {
  const configuration = tenantConfigurationFromTenant(draft, system)
  const configurationHistory = [...(saved.configurationHistory ?? [])]

  if (!valuesEqual(tenantConfigurationFromTenant(saved, system), configuration)) {
    const record = createTenantConfigurationHistoryRecord(configuration, configurationHistory, now, CURRENT_USER_DISPLAY_NAME, draft.tid)
    if (record) configurationHistory.unshift(record)
  }

  return {
    configuration,
    patch: tenantConfigurationPatch(draft, configuration, system, configurationHistory),
  }
}

export function createTenantConfigurationHistoryRecord(
  configuration: TenantConfiguration,
  existingRecords: Tenant['configurationHistory'] = [],
  timestamp = new Date().toISOString(),
  recordedBy = CURRENT_USER_DISPLAY_NAME,
  tid = '',
) {
  if (existingRecords[0] && valuesEqual(existingRecords[0].configuration, configuration)) return null
  return {
      id: `tenant-config-history-${crypto.randomUUID()}`,
      recordId: generateBusinessId('configurationHistory', existingRecords.map((record) => record.recordId)),
      timestamp,
      tid,
      recordedBy,
      configuration,
    }
}

function tenantConfigurationPatch(
  draft: Tenant,
  configuration: TenantConfiguration,
  system: System | undefined,
  configurationHistory: NonNullable<Tenant['configurationHistory']>,
): TenantConfigurationSaveDraft['patch'] {
  return {
    patch: {
      tenantFormType: tenantFormType(draft),
      hostedSystemId: system?.id ?? draft.systemId,
      hostingSid: system?.sid ?? draft.hostingSid ?? '',
      configuration,
      hostingSnapshot: hostingSnapshotFromSystem(draft, system),
      engagementCircle: normalizeEngagementCircleSnapshot(draft.engagementCircle),
      remarks: draft.remarks ?? [],
      configurationHistory,
      warranties: (draft.warranties ?? []).map((warranty) => ({
        ...warranty,
        durationDays: daysBetween(warranty.startDate, warranty.endDate),
        daysBeforeExpiration: daysBeforeExpiration(warranty.endDate),
      })),
      documents: draft.documents ?? [],
      productType: configuration.product,
      licenses: configuration.licenses,
      users: configuration.users,
      concurrentSearches: configuration.concurrentSearches,
      dailySearches: configuration.dailySearches,
      monthlySearches: configuration.monthlySearches,
      concurrentAnalyses: configuration.concurrentAnalyses,
      dailyAnalyses: configuration.dailyAnalyses,
      monthlyAnalyses: configuration.monthlyAnalyses,
      topicAnalyses: configuration.topicAnalyses,
      standardMonitors: configuration.standardMonitors,
      fullMonitors: configuration.fullMonitors,
      topicMonitors: configuration.topicMonitors,
      mapCenter: configuration.mapCenter,
      tangles: configuration.tangles,
      tanglesGo: configuration.tanglesGo,
      webloc: configuration.webloc,
      webeye: configuration.webeye,
      ingest: configuration.ingest,
      blockchain: configuration.blockchain,
      crossSystemFeatures: configuration.crossSystemFeatures,
      apiEnabled: configuration.apiEnabled,
      apiDailyQty: configuration.apiDailyQty,
      apiMonthlyQty: configuration.apiMonthlyQty,
      aiFeatures: configuration.aiFeatures,
      additionalFeatures: configuration.additionalFeatures,
    },
  }.patch
}

export function tenantDraftWithAttachedSystem(
  tenant: Tenant,
  nextSystemId: string,
  nextSystem: System | undefined,
  nextProject: Project | undefined,
  attachedAt: string,
): Tenant {
  const nextType = nextSystem ? tenantFormTypeForSystem(nextSystem) : tenantFormType(tenant)
  return {
    ...tenant,
    systemId: nextSystemId,
    hostedSystemId: nextSystemId,
    hostingSid: nextSystem?.sid ?? '',
    deliveryPid: nextProject?.pid ?? '',
    tenantType: nextType === 'INTERNAL' ? 'PENLINK_INTERNAL' : nextType === 'POC' ? 'POC' : 'CUSTOMER',
    tenantFormType: nextType,
    productType: nextSystem?.productType ?? tenant.productType,
    hostedSystemHistory: nextSystemId
      ? [
          ...(tenant.hostedSystemHistory ?? []),
          { systemId: nextSystemId, startedAt: attachedAt, endedAt: null, reason: 'Moved' as const },
        ]
      : tenant.hostedSystemHistory ?? [],
  }
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}
