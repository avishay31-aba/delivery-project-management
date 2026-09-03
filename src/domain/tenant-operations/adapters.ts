import type { AllocationType, NewTenantRequirement, Project, System, Tenant, TenantConfiguration } from '@/data/seed.types'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { generateBusinessIdFromCounter, reserveBusinessId } from '@/domain/business-identity'
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
  requiresCloudPlatform,
  tenantHostingPatchFromSystem,
} from '@/domain/hosting-context'
import { normalizeEngagementCircleSnapshot } from '@/domain/engagement-circle'
import { normalizeRemarks } from '@/domain/remarks'
import { SYSTEM_SOURCE_REUSED_INTERNAL, systemSource } from '@/domain/system-inventory'
import { daysBeforeExpiration, daysBetween, normalizeTenantWarranties } from '@/domain/warranty-collection'
import { isManualTenantOperationalMode, tenantFormType } from './service'
import type { TenantConfigurationSaveDraft, TenantCreationDraft, TenantCreationSource } from './types'

export function cloneTenant(tenant: Tenant): Tenant {
  return JSON.parse(JSON.stringify(tenant)) as Tenant
}

export function normalizeTenantOperationRecord(tenant: Tenant, systems: System[]): Tenant {
  const currentSystemId = (() => {
    const hostedSystem = tenant.hostedSystemId ? systems.find((system) => system.id === tenant.hostedSystemId) : undefined
    if (hostedSystem) return hostedSystem.id
    const system = tenant.systemId ? systems.find((candidate) => candidate.id === tenant.systemId) : undefined
    return system?.id ?? tenant.hostedSystemId ?? tenant.systemId ?? ''
  })()
  const history =
    tenant.hostedSystemHistory && tenant.hostedSystemHistory.length > 0
      ? tenant.hostedSystemHistory
      : currentSystemId
        ? [{ systemId: currentSystemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' as const }]
        : []

  const normalizedOperationalStatus =
    tenant.operationalStatus === 'Operative'
      ? 'Active'
      : tenant.operationalStatus === 'Deleted - By System'
        ? 'Deleted'
        : tenant.operationalStatus === 'Cancelled - By System'
          ? 'Cancelled'
          : tenant.operationalStatus || 'Active'
  const normalizedManualStatus = tenant.lastManualOperationalStatus === 'Operative'
    ? 'Active'
    : isManualTenantOperationalMode(tenant.lastManualOperationalStatus)
      ? tenant.lastManualOperationalStatus
      : isManualTenantOperationalMode(normalizedOperationalStatus)
        ? normalizedOperationalStatus
        : 'Active'

  const tenantWithoutLegacyName = { ...tenant } as Tenant & Record<string, unknown>
  delete tenantWithoutLegacyName[['tenant', 'Name'].join('')]

  return {
    ...tenantWithoutLegacyName,
    systemId: currentSystemId,
    operationalStatus: normalizedOperationalStatus,
    lastManualOperationalStatus: normalizedManualStatus,
    individualLifecyclePreviousOperationalStatus: tenant.individualLifecyclePreviousOperationalStatus ?? null,
    systemForcedPreviousOperationalStatus: tenant.systemForcedPreviousOperationalStatus ?? null,
    systemForcedBySystemId: tenant.systemForcedBySystemId ?? null,
    contractStatus: tenant.contractStatus ?? 'UNDER_CONTRACT',
    hostedSystemHistory: history,
    tenantFormType: tenant.tenantType === 'PENLINK_INTERNAL' ? 'INTERNAL' : tenant.tenantType === 'POC' ? 'POC' : 'CUSTOMER',
    hostedSystemId: currentSystemId,
    hostingSid: tenant.hostingSid ?? systems.find((system) => system.id === currentSystemId)?.sid ?? '',
    sourceRequirementId: normalizedOperationalStatus === 'Cancelled' ? undefined : tenant.sourceRequirementId,
    releasedRequirementId: normalizedOperationalStatus === 'Cancelled' ? tenant.sourceRequirementId ?? tenant.releasedRequirementId ?? null : tenant.releasedRequirementId ?? null,
    requirementHistory: Array.isArray(tenant.requirementHistory) ? tenant.requirementHistory : [],
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
  const nextTenantId = generateBusinessIdFromCounter('tenant', source.idCounters, source.existingTenantIds)
  const tenantType = source.project.mainType === 'POC' || source.system.systemClass === 'POC_DEMO_TRAINING'
    ? 'POC'
    : 'CUSTOMER'
  const configuration = applicationConfigurationFromRequirement(source.requirement, source.system.productType)
  const tenant: Tenant = {
    id: `ten-${crypto.randomUUID()}`,
    tid: nextTenantId.id,
    accountId: source.account?.id ?? source.system.accountId ?? '',
    systemId: source.system.id,
    deliveryPid: source.project.pid,
    tenantType,
    tenantFormType: tenantType === 'POC' ? 'POC' : 'CUSTOMER',
    hostedSystemId: source.system.id,
    hostingSid: source.system.sid ?? '',
    sourceRequirementId: source.requirement.requirementId,
    releasedRequirementId: null,
    requirementHistory: [{
      id: `tenant-req-${crypto.randomUUID()}`,
      pid: source.project.pid,
      projectId: source.project.id,
      requirementId: source.requirement.requirementId,
      relationshipType: 'A',
      status: 'CURRENT',
      startedAt: now,
      endedAt: null,
    }],
    configuration,
    accountName: source.project.accountName || (source.account?.accountName ?? ''),
    country: source.opportunity.country || source.account?.country || source.project.country || '',
    state: source.opportunity.state || source.account?.state || source.project.state || source.system.state || '',
    // Normalized by the authoritative Country -> Time Zone -> Time Group service.
    timeGroup: '',
    operationalStatus: 'Active',
    lastManualOperationalStatus: 'Active',
    individualLifecyclePreviousOperationalStatus: null,
    systemForcedPreviousOperationalStatus: null,
    systemForcedBySystemId: null,
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
  void system
  return applicationConfigurationFromTenant(tenant)
}

export function tenantRequirementFromConfiguration(
  tenant: Tenant,
  configuration: TenantConfiguration,
  system?: System,
): NewTenantRequirement {
  const hostingType = system?.hostingType ?? tenant.hostingType ?? HOSTING_OPTIONS[0]
  const cloudPlatform = requiresCloudPlatform(hostingType)
    ? system?.cloudPlatform ?? tenant.cloudPlatform ?? cloudPlatformOptionsForHosting(hostingType)[0] ?? ''
    : ''
  return {
    id: `tenant-config-${tenant.id}`,
    requirementId: tenant.sourceRequirementId ?? 'TENANT-CONFIG',
    deployTarget: 'NEW_SYSTEM',
    existingSystemId: null,
    hostingType,
    cloudPlatform,
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
      recordId: reserveBusinessId('configurationHistory', existingRecords.map((record) => record.recordId)),
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
      sourceRequirementId: draft.sourceRequirementId,
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
  return {
    ...tenant,
    systemId: nextSystemId,
    hostedSystemId: nextSystemId,
    hostingSid: nextSystem?.sid ?? '',
    deliveryPid: nextProject?.pid ?? '',
    // Tenant Type is creation-owned identity and is not recalculated by a move.
    tenantType: tenant.tenantType,
    tenantFormType: tenantFormType(tenant),
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
