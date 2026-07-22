import type {
  Opportunity,
  ProductionSystemInventoryItem,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  ReusedInternalSystem,
  System,
} from '@/data/seed.types'
import type { AllocationMode } from './types'
import { REUSED_INTERNAL_PURPOSE_AVAILABLE, SYSTEM_PURPOSE_POC } from '@/domain/system-inventory'

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
  return isPocProject(project) ? ['REUSED_INTERNAL', 'EXISTING_SYSTEM'] : ['PRODUCTION', 'EXISTING_SYSTEM']
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
  return reusedSystems.filter((system) => system.purpose === REUSED_INTERNAL_PURPOSE_AVAILABLE || system.purpose === SYSTEM_PURPOSE_POC)
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

export function availableExistingSystemCandidatesForProject(
  project: Project,
  systems: System[],
  projectSystems: ProjectSystemLink[],
  projects: Project[],
): System[] {
  const activeLinks = activeProjectSystemLinks(projectSystems)
  const activeLinkForProject = (system: System) =>
    activeLinks.find((link) => link.projectId !== project.id && link.systemId === system.id)
  const projectById = new Map(projects.map((candidate) => [candidate.id, candidate]))

  return availableExistingSystemCandidates(project.id, systems, projectSystems).filter((system) => {
    const linkedProject = projectById.get(activeLinkForProject(system)?.projectId ?? '')
    if (isPocProject(project)) return linkedProject?.mainType === 'POC'
    return linkedProject?.mainType === 'DELIVERY' || linkedProject?.mainType === 'RENEWAL'
  })
}

export function requestedSystemCandidatesForProject(
  project: Project,
  opportunity: Opportunity | undefined,
  systems: System[],
  projectSystems: ProjectSystemLink[],
): System[] {
  const requestedSystemIds = new Set<string>()
  opportunity?.newTenantRequirements.forEach((requirement) => {
    if (requirement.deployTarget === 'EXISTING_SID' && requirement.existingSystemId) {
      requestedSystemIds.add(requirement.existingSystemId)
    }
  })
  if (isPocProject(project)) {
    opportunity?.changeRequestRequirements.forEach((requirement) => {
      if (requirement.systemId) requestedSystemIds.add(requirement.systemId)
    })
    opportunity?.standardRenewalRequirements.forEach((requirement) => {
      if (requirement.systemId) requestedSystemIds.add(requirement.systemId)
    })
  }

  const activeLinks = activeProjectSystemLinks(projectSystems)
  return systems.filter(
    (system) =>
      requestedSystemIds.has(system.id) &&
      !activeLinks.some((link) => link.projectId === project.id && link.systemId === system.id),
  )
}
