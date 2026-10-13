import type {
  Opportunity,
  AllocationSource,
  ProductionSystemInventoryItem,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  ReusedInternalSystem,
  System,
  Tenant,
} from '@/data/seed.types'
import type { AllocationMode } from './types'
import { allocationHasManualSource, normalizeAllocationSources } from './adapters'
import {
  REUSED_INTERNAL_PURPOSE_NONE,
  REUSED_INTERNAL_STATUS_AVAILABLE,
  SYSTEM_AVAILABILITY_AVAILABLE,
  SYSTEM_OPERATIONAL_STATUS_CANCELED,
  isSystemOperationallyVisible,
  reusedInternalAvailabilityStatus,
  reusedInternalMachineIdsEqual,
} from '@/domain/system-inventory'
import { applicableOpportunityRequirementSources } from '@/domain/opportunity-lifecycle'

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
  return inventory.filter((system) =>
    system.operationalStatus !== SYSTEM_OPERATIONAL_STATUS_CANCELED &&
    isSystemOperationallyVisible(system) &&
    (!('availability' in system) || system.availability === SYSTEM_AVAILABILITY_AVAILABLE),
  )
}

export function availableReusedInternalCandidates(
  reusedSystems: ReusedInternalSystem[],
  projectSystems: ProjectSystemLink[] = [],
  projects: Project[] = [],
  allocatedSystems: System[] = [],
): ReusedInternalSystem[] {
  const activeLinks = activeProjectSystemLinks(projectSystems)
  const hasCurrentAllocation = (system: ReusedInternalSystem) =>
    activeLinks.some((link) => {
      if (reusedInternalMachineIdsEqual(link.sourceMachineId, system.machineId)) return true
      const allocatedSystem = allocatedSystems.find((candidate) => candidate.id === link.systemId)
      return Boolean(allocatedSystem && reusedInternalMachineIdsEqual(allocatedSystem.machineId, system.machineId))
    })
  return reusedSystems.filter((system) =>
    system.operationalStatus !== SYSTEM_OPERATIONAL_STATUS_CANCELED &&
    isSystemOperationallyVisible(system) &&
    reusedInternalAvailabilityStatus(system, activeLinks, projects, allocatedSystems) === REUSED_INTERNAL_STATUS_AVAILABLE &&
    system.purpose === REUSED_INTERNAL_PURPOSE_NONE,
  ).filter((system) =>
    !hasCurrentAllocation(system),
  )
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
      isSystemOperationallyVisible(system) &&
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
  if (opportunity) {
    applicableOpportunityRequirementSources(opportunity).forEach((source) => {
      const requirement = source.requirement
      if (source.requirementType === 'A' && 'deployTarget' in requirement) {
        if (requirement.deployTarget === 'EXISTING_SID' && requirement.existingSystemId) {
          requestedSystemIds.add(requirement.existingSystemId)
        }
      }
    })
  }

  const activeLinks = activeProjectSystemLinks(projectSystems)
  return systems.filter(
    (system) =>
      requestedSystemIds.has(system.id) &&
      isSystemOperationallyVisible(system) &&
      !activeLinks.some((link) => link.projectId === project.id && link.systemId === system.id),
  )
}

export interface RequiredExistingTenantAllocation {
  projectId: string
  tenantId: string
  systemId: string
  sources: AllocationSource[]
}

export function tenantHostingSystemId(tenant: Pick<Tenant, 'hostedSystemId' | 'systemId'> | undefined): string {
  return tenant?.hostedSystemId || tenant?.systemId || ''
}

export function requiredExistingTenantAllocationsForProject(
  project: Project,
  opportunity: Opportunity | undefined,
  tenants: Tenant[],
): RequiredExistingTenantAllocation[] {
  if (!opportunity) return []
  const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
  const requirementsByTenant = new Map<string, AllocationSource[]>()

  applicableOpportunityRequirementSources(opportunity).forEach((source) => {
    if (source.requirementType !== 'B' && source.requirementType !== 'C') return
    const requirement = source.requirement
    if (!('tenantId' in requirement) || !requirement.tenantId) return
    const allocationSource: AllocationSource = source.requirementType === 'B' ? 'GRID_B' : 'GRID_C'
    const current = requirementsByTenant.get(requirement.tenantId) ?? []
    requirementsByTenant.set(requirement.tenantId, Array.from(new Set([...current, allocationSource])))
  })

  return Array.from(requirementsByTenant.entries())
    .map(([tenantId, sources]) => {
      const tenant = tenantById.get(tenantId)
      return {
        projectId: project.id,
        tenantId,
        systemId: tenantHostingSystemId(tenant),
        sources,
      }
    })
    .filter((allocation) => Boolean(allocation.systemId))
}

export function automaticAllocationSourcesForProjectSystem(
  project: Project,
  opportunity: Opportunity | undefined,
  tenants: Tenant[],
  systemId: string,
): AllocationSource[] {
  return Array.from(new Set(
    requiredExistingTenantAllocationsForProject(project, opportunity, tenants)
      .filter((allocation) => allocation.systemId === systemId)
      .flatMap((allocation) => allocation.sources),
  ))
}

export function automaticAllocationSourcesForProjectTenant(
  project: Project,
  opportunity: Opportunity | undefined,
  tenants: Tenant[],
  tenantId: string,
): AllocationSource[] {
  return Array.from(new Set(
    requiredExistingTenantAllocationsForProject(project, opportunity, tenants)
      .filter((allocation) => allocation.tenantId === tenantId)
      .flatMap((allocation) => allocation.sources),
  ))
}

export function resolvedProjectSystemAllocationSources(
  link: ProjectSystemLink,
  project: Project,
  opportunity: Opportunity | undefined,
  tenants: Tenant[],
): AllocationSource[] {
  const manualSources: AllocationSource[] = allocationHasManualSource(link) ? ['MANUAL'] : []
  const automaticSources = automaticAllocationSourcesForProjectSystem(project, opportunity, tenants, link.systemId)
  return normalizeAllocationSources([...manualSources, ...automaticSources], [])
}

export function resolvedProjectTenantAllocationSources(
  link: ProjectTenantLink,
  project: Project,
  opportunity: Opportunity | undefined,
  tenants: Tenant[],
): AllocationSource[] {
  const manualSources: AllocationSource[] = allocationHasManualSource(link) ? ['MANUAL'] : []
  const automaticSources = automaticAllocationSourcesForProjectTenant(project, opportunity, tenants, link.tenantId)
  return normalizeAllocationSources([...manualSources, ...automaticSources], [])
}
