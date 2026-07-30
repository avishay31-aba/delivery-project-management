import type { AppDataState, System, Tenant, TenantHostingSnapshot } from '@/data/seed.types'
import { DEFAULT_HOSTING_CONTEXT, DEFAULT_HOSTING_INTENT } from './metadata'
import type { HostingContext, HostingIntent } from './types'
import { systemCurrentVersionLabel } from '@/domain/system-version-update'

export function defaultHostingIntent(): HostingIntent {
  return { ...DEFAULT_HOSTING_INTENT }
}

export function defaultHostingContext(): HostingContext {
  return { ...DEFAULT_HOSTING_CONTEXT }
}

export function defaultSystemHostingContext(): Pick<HostingContext, 'hostingType' | 'cloudPlatform' | 'csp' | 'cloudRegion'> {
  const context = defaultHostingContext()
  return {
    hostingType: context.hostingType,
    cloudPlatform: context.cloudPlatform,
    csp: context.csp,
    cloudRegion: context.cloudRegion,
  }
}

export function hostingContextFromSource(source: Partial<HostingContext>): HostingContext {
  return {
    hostingType: source.hostingType ?? '',
    cloudPlatform: source.cloudPlatform ?? '',
    csp: source.csp,
    cloudRegion: source.cloudRegion,
    url: source.url,
    performanceTier: source.performanceTier,
    vpnEnabled: source.vpnEnabled,
    vpnType: source.vpnType,
    externalInterface: source.externalInterface ?? false,
    ipRestrictionEnabled: source.ipRestrictionEnabled,
  }
}

export function tenantHostingPatchFromSystem(system: Partial<HostingContext>): Pick<
  Tenant,
  'hostingType' | 'cloudPlatform' | 'csp' | 'cloudRegion' | 'performanceTier' | 'vpnEnabled' | 'vpnType' | 'externalInterface' | 'ipRestrictionEnabled'
> {
  return {
    hostingType: system.hostingType,
    cloudPlatform: system.cloudPlatform,
    csp: system.csp,
    cloudRegion: system.cloudRegion,
    performanceTier: system.performanceTier,
    vpnEnabled: system.vpnEnabled,
    vpnType: system.vpnType,
    externalInterface: system.externalInterface ?? false,
    ipRestrictionEnabled: system.ipRestrictionEnabled,
  }
}

export function hostingSnapshotFromSystem(
  tenant: Tenant,
  system?: System,
  context?: Pick<AppDataState, 'versionUpdates' | 'referenceData'>,
): TenantHostingSnapshot {
  const platform = system?.cloudPlatform ?? tenant.cloudPlatform ?? ''
  const cloudRegion = system?.cloudRegion ?? tenant.cloudRegion ?? ''
  const versionNumber = system && context
    ? systemCurrentVersionLabel(context.versionUpdates, context.referenceData, system.id, system.currentVersionUpdateId)
    : ''
  return {
    currentSystem: Boolean(system),
    sid: system?.sid ?? tenant.hostingSid ?? '',
    operationalStatus: system?.operationalStatus ?? tenant.operationalStatus ?? '',
    machineNumber: system?.machineId ?? '',
    versionNumber,
    hostingType: system?.hostingType ?? tenant.hostingType ?? '',
    url: system?.url ?? '',
    performanceTier: system?.performanceTier ?? tenant.performanceTier ?? '',
    vpnEnabled: system?.vpnEnabled ?? tenant.vpnEnabled ?? '',
    vpnType: system?.vpnType ?? tenant.vpnType ?? '',
    externalInterface: system?.externalInterface ?? tenant.externalInterface ?? false,
    ipRestrictionEnabled: system?.ipRestrictionEnabled ?? tenant.ipRestrictionEnabled ?? '',
    platform,
    csp: system?.csp ?? tenant.csp ?? '',
    awsRegion: platform.includes('AWS') ? cloudRegion : '',
    azureRegion: platform.includes('Azure') ? cloudRegion : '',
  }
}

export function hostingSnapshotFromTenant(
  tenant: Tenant,
  systems: AppDataState['systems'],
  context?: Pick<AppDataState, 'versionUpdates' | 'referenceData'>,
): TenantHostingSnapshot {
  const system = systems.find((candidate) => candidate.id === (tenant.hostedSystemId ?? tenant.systemId))
  return {
    ...hostingSnapshotFromSystem(tenant, system, context),
    currentSystem: Boolean(tenant.systemId || tenant.hostedSystemId),
  }
}
