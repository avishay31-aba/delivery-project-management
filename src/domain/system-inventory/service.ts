import type { ProjectSystemLink, System, SystemInventoryRecord, Tenant } from './types'
import {
  REUSED_INTERNAL_STATUS_OCCUPIED,
  SYSTEM_SOURCE_PRODUCTION,
  SYSTEM_SOURCE_REUSED_INTERNAL,
} from './metadata'

export function isReusedInternalSystem(record: SystemInventoryRecord): boolean {
  return 'machineId' in record && record.source === SYSTEM_SOURCE_REUSED_INTERNAL
}

export function isProductionInventorySystem(record: SystemInventoryRecord): boolean {
  return 'sid' in record && record.source === SYSTEM_SOURCE_PRODUCTION
}

export function isAllocatedSystem(record: SystemInventoryRecord): record is System {
  return 'systemClass' in record && 'availability' in record
}

export function isReusedInternalOccupied(status: string | undefined): boolean {
  return status === REUSED_INTERNAL_STATUS_OCCUPIED
}

export function systemIdentity(record: SystemInventoryRecord): string {
  if ('sid' in record && record.sid) return record.sid
  if ('machineId' in record && record.machineId) return record.machineId
  return record.id
}

export function systemSource(record: SystemInventoryRecord): string {
  if ('source' in record && record.source) return record.source
  return 'machineId' in record && record.machineId ? SYSTEM_SOURCE_REUSED_INTERNAL : SYSTEM_SOURCE_PRODUCTION
}

export function hostedTenantsForSystem(systemId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) => tenant.systemId === systemId || tenant.hostedSystemId === systemId)
}

export function allocatedSystemsForActiveLinks(systems: System[], projectSystems: ProjectSystemLink[]): System[] {
  const allocatedSystemIds = new Set(
    projectSystems
      .filter((link) => link.allocationStatus !== 'DEALLOCATED')
      .map((link) => link.systemId),
  )
  return systems.filter((system) => Boolean(system.sid) && allocatedSystemIds.has(system.id))
}
