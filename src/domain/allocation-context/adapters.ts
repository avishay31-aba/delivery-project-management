import type {
  AllocationType,
  ProjectSystemLink,
  ProjectTenantLink,
  ReusedInternalSystem,
  System,
} from '@/data/seed.types'
export {
  systemFromProductionInventoryAllocation,
  systemFromReusedInternalAllocation,
} from '@/domain/system-inventory'

export function normalizeProjectSystemLink(link: ProjectSystemLink): ProjectSystemLink {
  return {
    ...link,
    tenantIds: Array.isArray(link.tenantIds) ? link.tenantIds : [],
    allocationStatus: link.allocationStatus ?? 'ALLOCATED',
    allocationType: link.allocationType ?? 'EXISTING_SYSTEM',
    sourceMachineId: link.sourceMachineId ?? null,
    deallocatedAt: link.deallocatedAt ?? null,
  }
}

export function normalizeProjectTenantLink(link: ProjectTenantLink): ProjectTenantLink {
  return {
    ...link,
    systemId: link.systemId ?? '',
    allocationStatus: link.allocationStatus ?? 'ALLOCATED',
    allocationType: link.allocationType ?? 'EXISTING_SYSTEM',
    allocatedAt: link.allocatedAt ?? '',
    deallocatedAt: link.deallocatedAt ?? null,
  }
}

export function createProjectSystemLink(
  projectId: string,
  systemId: string,
  allocationType: AllocationType,
  allocatedAt: string,
  options: { tenantIds?: string[]; sourceMachineId?: string | null } = {},
): ProjectSystemLink {
  return {
    id: `alloc-${crypto.randomUUID()}`,
    projectId,
    systemId,
    tenantIds: options.tenantIds ?? [],
    allocationStatus: 'ALLOCATED',
    allocationType,
    sourceMachineId: options.sourceMachineId ?? null,
    allocatedAt,
    deallocatedAt: null,
  }
}

export function createProjectTenantLink(
  projectId: string,
  tenantId: string,
  systemId: string,
  allocationType: AllocationType,
  allocatedAt: string,
): ProjectTenantLink {
  return {
    id: `proj-ten-${crypto.randomUUID()}`,
    projectId,
    tenantId,
    systemId,
    allocationStatus: 'ALLOCATED',
    allocationType,
    allocatedAt,
    deallocatedAt: null,
  }
}

export function deallocateProjectSystemLink(link: ProjectSystemLink, deallocatedAt: string): ProjectSystemLink {
  return { ...link, allocationStatus: 'DEALLOCATED', deallocatedAt }
}

export function deallocateProjectTenantLink(link: ProjectTenantLink, deallocatedAt: string): ProjectTenantLink {
  return { ...link, allocationStatus: 'DEALLOCATED', deallocatedAt }
}

export function unlinkProjectFromSystem(system: System, projectId: string, updatedAt: string): System {
  return {
    ...system,
    linkedProjectIds: (system.linkedProjectIds ?? []).filter((candidateProjectId) => candidateProjectId !== projectId),
    updatedAt,
  }
}

export function releaseReusedInternalSystem(system: ReusedInternalSystem, projectId: string, updatedAt: string): ReusedInternalSystem {
  return {
    ...system,
    status: 'Available',
    currentProjectIds: system.currentProjectIds.filter((candidateProjectId) => candidateProjectId !== projectId),
    occupationEndDate: updatedAt,
    updatedAt,
  }
}
