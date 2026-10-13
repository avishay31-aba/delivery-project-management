import type {
  AllocationSource,
  AllocationType,
  ProjectSystemLink,
  ProjectTenantLink,
  System,
} from '@/data/seed.types'
import { reusedInternalMachineIdRouteKey } from '@/domain/system-inventory'
export {
  releaseReusedInternalSystem,
  systemFromProductionInventoryAllocation,
  systemFromReusedInternalAllocation,
} from '@/domain/system-inventory'

export function normalizeProjectSystemLink(link: ProjectSystemLink): ProjectSystemLink {
  const deallocatedAt = link.deallocatedAt ?? null
  return {
    ...link,
    tenantIds: Array.isArray(link.tenantIds) ? link.tenantIds : [],
    allocationStatus: deallocatedAt ? 'DEALLOCATED' : link.allocationStatus ?? 'ALLOCATED',
    allocationType: link.allocationType ?? 'EXISTING_SYSTEM',
    allocationSources: normalizeAllocationSources(link.allocationSources),
    sourceMachineId: link.sourceMachineId ? reusedInternalMachineIdRouteKey(link.sourceMachineId) : null,
    deallocatedAt,
  }
}

export function normalizeProjectTenantLink(link: ProjectTenantLink): ProjectTenantLink {
  const deallocatedAt = link.deallocatedAt ?? null
  return {
    ...link,
    systemId: link.systemId ?? '',
    allocationStatus: deallocatedAt ? 'DEALLOCATED' : link.allocationStatus ?? 'ALLOCATED',
    allocationType: link.allocationType ?? 'EXISTING_SYSTEM',
    allocationSources: normalizeAllocationSources(link.allocationSources),
    allocatedAt: link.allocatedAt ?? '',
    deallocatedAt,
  }
}

export function normalizeAllocationSources(sources: AllocationSource[] | undefined, fallback: AllocationSource[] = ['MANUAL']): AllocationSource[] {
  const allowed = new Set<AllocationSource>(['MANUAL', 'GRID_B', 'GRID_C'])
  const normalized = Array.from(new Set((sources ?? fallback).filter((source): source is AllocationSource => allowed.has(source))))
  return normalized.length > 0 ? normalized : [...fallback]
}

export function allocationHasAutomaticSource(link: Pick<ProjectSystemLink | ProjectTenantLink, 'allocationSources'>): boolean {
  return (link.allocationSources ?? ['MANUAL']).some((source) => source === 'GRID_B' || source === 'GRID_C')
}

export function allocationHasManualSource(link: Pick<ProjectSystemLink | ProjectTenantLink, 'allocationSources'>): boolean {
  return (link.allocationSources ?? ['MANUAL']).includes('MANUAL')
}

export function createProjectSystemLink(
  projectId: string,
  systemId: string,
  allocationType: AllocationType,
  allocatedAt: string,
  options: { tenantIds?: string[]; sourceMachineId?: string | null; allocationSources?: AllocationSource[] } = {},
): ProjectSystemLink {
  return {
    id: `alloc-${crypto.randomUUID()}`,
    projectId,
    systemId,
    tenantIds: options.tenantIds ?? [],
    allocationStatus: 'ALLOCATED',
    allocationType,
    allocationSources: normalizeAllocationSources(options.allocationSources),
    sourceMachineId: options.sourceMachineId ? reusedInternalMachineIdRouteKey(options.sourceMachineId) : null,
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
  allocationSources: AllocationSource[] = ['MANUAL'],
): ProjectTenantLink {
  return {
    id: `proj-ten-${crypto.randomUUID()}`,
    projectId,
    tenantId,
    systemId,
    allocationStatus: 'ALLOCATED',
    allocationType,
    allocationSources: normalizeAllocationSources(allocationSources),
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
