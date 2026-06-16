import type { AppDataState, System, Tenant, TenantHostingSnapshot } from '@/data/seed.types'

export function hostingSnapshotFromSystem(tenant: Tenant, system?: System): TenantHostingSnapshot {
  const platform = system?.cloudPlatform ?? tenant.cloudPlatform ?? ''
  const cloudRegion = system?.cloudRegion ?? tenant.cloudRegion ?? ''
  return {
    currentSystem: Boolean(system),
    sid: system?.sid ?? tenant.hostingSid ?? '',
    operationalStatus: system?.operationalStatus ?? tenant.operationalStatus ?? '',
    machineNumber: system?.machineId ?? '',
    versionNumber: system?.cognitoRegion ?? '',
    hostingType: system?.hostingType ?? tenant.hostingType ?? '',
    url: system?.url ?? '',
    performanceTier: system?.performanceTier ?? tenant.performanceTier ?? '',
    vpnEnabled: system?.vpnEnabled ?? tenant.vpnEnabled ?? '',
    vpnType: system?.vpnType ?? tenant.vpnType ?? '',
    ipRestrictionEnabled: system?.ipRestrictionEnabled ?? tenant.ipRestrictionEnabled ?? '',
    platform,
    csp: system?.csp ?? tenant.csp ?? '',
    awsRegion: platform.includes('AWS') ? cloudRegion : '',
    azureRegion: platform.includes('Azure') ? cloudRegion : '',
  }
}

export function hostingSnapshotFromTenant(tenant: Tenant, systems: AppDataState['systems']): TenantHostingSnapshot {
  const system = systems.find((candidate) => candidate.id === (tenant.hostedSystemId ?? tenant.systemId))
  return {
    ...hostingSnapshotFromSystem(tenant, system),
    currentSystem: Boolean(tenant.systemId || tenant.hostedSystemId),
  }
}
