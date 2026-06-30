import { timeGroupForCountry } from '@/config/time-groups'
import type { Project, ProjectSystemLink, System, SystemInventoryRecord, Tenant } from './types'
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

export function joinUniqueValues(values: Array<string | null | undefined>, separator = '; '): string {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).join(separator)
}

export function hostedTenantsForSystem(systemId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) => tenant.systemId === systemId || tenant.hostedSystemId === systemId)
}

export function tenantCountForSystem(record: SystemInventoryRecord, tenants: Tenant[]): number {
  if ('sid' in record) {
    const hostedTenantCount = hostedTenantsForSystem(record.id, tenants).length
    const storedTenantCount = 'tenantCount' in record ? record.tenantCount : 0
    return hostedTenantCount || storedTenantCount || 0
  }
  return record.tenantCount || 0
}

export function linkedProjectIdsForSystem(record: SystemInventoryRecord, projectSystems: ProjectSystemLink[] = []): string[] {
  const projectIds = new Set(
    projectSystems
      .filter((link) => link.allocationStatus !== 'DEALLOCATED' && link.systemId === record.id)
      .map((link) => link.projectId),
  )
  if ('linkedProjectIds' in record) record.linkedProjectIds?.forEach((projectId) => projectIds.add(projectId))
  if ('linkedProjects' in record) record.linkedProjects?.forEach((projectId) => projectIds.add(projectId))
  if ('currentProjectIds' in record) record.currentProjectIds.forEach((projectId) => projectIds.add(projectId))
  return Array.from(projectIds)
}

export function linkedProjectDisplay(record: SystemInventoryRecord, projects: Project[], projectSystems: ProjectSystemLink[] = []): string {
  return linkedProjectIdsForSystem(record, projectSystems)
    .map((projectId) => projects.find((project) => project.id === projectId)?.pid ?? projectId)
    .join(', ')
}

export function systemTimeGroup(record: SystemInventoryRecord, tenants: Tenant[]): string {
  const oldestTenant = hostedTenantsForSystem(record.id, tenants)
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt))[0]
  return timeGroupForCountry(oldestTenant?.country) || String(('timeGroup' in record ? record.timeGroup : '') ?? '')
}

export function systemTimeGroupAlert(record: SystemInventoryRecord, tenants: Tenant[], fallback: unknown): string {
  const activeTimeGroup = systemTimeGroup(record, tenants)
  const tenant = hostedTenantsForSystem(record.id, tenants).find(
    (candidate) => timeGroupForCountry(candidate.country) && timeGroupForCountry(candidate.country) !== activeTimeGroup,
  )
  return tenant ? `Tenant ${tenant.tid} does not belong to system time group` : String(fallback ?? '')
}

export function allocatedSystemsForActiveLinks(systems: System[], projectSystems: ProjectSystemLink[]): System[] {
  const allocatedSystemIds = new Set(
    projectSystems
      .filter((link) => link.allocationStatus !== 'DEALLOCATED')
      .map((link) => link.systemId),
  )
  return systems.filter((system) => allocatedSystemIds.has(system.id))
}

export function systemRoutePath(record: SystemInventoryRecord): string {
  if (systemSource(record) === SYSTEM_SOURCE_REUSED_INTERNAL && 'machineId' in record && record.machineId) {
    return `/systems/reused-internal/${record.machineId}`
  }
  return `/systems/production-inventory/${'sid' in record ? record.sid ?? '' : ''}`
}
