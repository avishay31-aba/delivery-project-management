import type {
  ProductionSystemInventoryItem,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  ReusedInternalSystem,
  System,
} from '@/data/seed.types'
import type { AllocationMode } from './types'

export function activeProjectSystemLinks(links: ProjectSystemLink[]): ProjectSystemLink[] {
  return links.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

export function activeProjectTenantLinks(links: ProjectTenantLink[]): ProjectTenantLink[] {
  return links.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

export function isPocProject(project: Project): boolean {
  return project.mainType === 'POC'
}

export function allowedAllocationModes(project: Project): AllocationMode[] {
  return isPocProject(project) ? ['REUSED_INTERNAL'] : ['PRODUCTION', 'EXISTING_SYSTEM']
}

export function activeSystemLinksForProject(projectId: string, links: ProjectSystemLink[]): ProjectSystemLink[] {
  return activeProjectSystemLinks(links).filter((link) => link.projectId === projectId)
}

export function availableProductionCandidates(
  inventory: ProductionSystemInventoryItem[],
): ProductionSystemInventoryItem[] {
  return inventory
}

export function availableReusedInternalCandidates(
  reusedSystems: ReusedInternalSystem[],
): ReusedInternalSystem[] {
  return reusedSystems.filter((system) => system.status !== 'Occupied')
}

export function availableExistingSystemCandidates(
  projectId: string,
  systems: System[],
  projectSystems: ProjectSystemLink[],
): System[] {
  const activeLinks = activeProjectSystemLinks(projectSystems)
  return systems.filter(
    (system) =>
      Boolean(system.sid) &&
      !activeLinks.some((link) => link.projectId === projectId && link.systemId === system.id),
  )
}
