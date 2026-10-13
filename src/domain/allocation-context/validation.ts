import type { ProjectSystemLink, ProjectTenantLink, System, Tenant } from '@/data/seed.types'
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'
import { applicableOpportunityRequirementSources } from '@/domain/opportunity-lifecycle'
import { projectHeaderFieldValue } from '@/domain/project-lifecycle'
import {
  REUSED_INTERNAL_PURPOSE_NONE,
  REUSED_INTERNAL_STATUS_AVAILABLE,
  SYSTEM_AVAILABILITY_AVAILABLE,
  SYSTEM_OPERATIONAL_STATUS_DELETED,
  reusedInternalAvailabilityStatus,
  reusedInternalMachineIdsEqual,
} from '@/domain/system-inventory'
import { isTenantLifecycleInactive } from '@/domain/tenant-operations'
import { activeProjectSystemLinks, activeProjectTenantLinks, automaticAllocationSourcesForProjectSystem } from './service'
import type { AllocationActionResult, AllocationValidationContext, AllocationValidationInput } from './types'

function failed(message: string): AllocationActionResult {
  return { ok: false, message }
}

function projectFieldForAllocation(project: NonNullable<AllocationValidationContext['projects'][number]>, context: AllocationValidationContext, key: Parameters<typeof projectHeaderFieldValue>[1]): string {
  const linkedOpportunity = context.opportunities?.find((opportunity) => opportunity.id === project.opportunityId || opportunity.opportunityId === project.opportunityId)
  const account = context.accounts?.find((candidate) => candidate.accountName === project.accountName)
  return projectHeaderFieldValue(project, key, { linkedOpportunity, account }).trim()
}

export function projectBusinessRegionForAllocation(
  project: NonNullable<AllocationValidationContext['projects'][number]>,
  context: AllocationValidationContext,
): string {
  return getBusinessRegionForCountry(
    projectFieldForAllocation(project, context, 'country'),
    projectFieldForAllocation(project, context, 'state'),
  )
}

function projectPocDateForAllocation(
  project: NonNullable<AllocationValidationContext['projects'][number]>,
  context: AllocationValidationContext,
  key: 'pocStartDate' | 'pocEndDate',
): string {
  return projectFieldForAllocation(project, context, key)
}

function unmappedProjectRegionMessage(): AllocationActionResult {
  return failed('The Project country could not be mapped to a supported region. Update the Project country before allocating the System.')
}

function validateSystemRegionCompatibility(
  candidateRegion: string,
  activeLinks: ProjectSystemLink[],
  context: AllocationValidationContext,
  fallbackRegion?: string | null,
): AllocationActionResult | null {
  const sortedLinks = [...activeLinks].sort((first, second) => String(first.allocatedAt ?? '').localeCompare(String(second.allocatedAt ?? '')))
  const activeProjectRegions = sortedLinks.map((link) => {
    const project = context.projects.find((candidate) => candidate.id === link.projectId)
    return {
      pid: project?.pid ?? link.projectId,
      region: project ? projectBusinessRegionForAllocation(project, context) : '',
    }
  })
  const existingRegion = activeProjectRegions.find((entry) => entry.region)?.region ?? normalizeBusinessRegion(fallbackRegion)
  if (!existingRegion) return null
  if (existingRegion === candidateRegion) return null
  const pids = activeProjectRegions
    .filter((entry) => !entry.region || entry.region === existingRegion)
    .map((entry) => entry.pid)
  const pidText = pids.length > 1 ? `Project(s) ${pids.join(', ')}` : `Project ${pids[0] ?? sortedLinks[0]?.projectId ?? ''}`
  return failed(`System is already allocated and in use in ${existingRegion} by ${pidText}. A System cannot be used in two different regions.`)
}

export function validateProductionAllocation(
  input: AllocationValidationInput,
  context: AllocationValidationContext,
): AllocationActionResult | null {
  const project = context.projects.find((candidate) => candidate.id === input.projectId)
  const productionSystem = context.productionSystemInventory.find((candidate) => candidate.id === input.systemId)
  if (!project) return failed('Project not found.')
  if (project.mainType === 'POC') return failed('POC projects cannot allocate Production Inventory.')
  if (!productionSystem) return failed('Production system not found.')
  if ('availability' in productionSystem && productionSystem.availability !== SYSTEM_AVAILABILITY_AVAILABLE) {
    return failed('Production system is not available for allocation.')
  }
  const projectRegion = projectBusinessRegionForAllocation(project, context)
  if (!projectRegion) return unmappedProjectRegionMessage()
  if (activeProjectSystemLinks(context.projectSystems).some((link) => link.systemId === input.systemId)) {
    return failed('Production system is already actively allocated.')
  }
  if (activeProjectSystemLinks(context.projectSystems).some((link) => link.projectId === input.projectId && link.systemId === input.systemId)) {
    return failed('This system is already allocated to the project.')
  }
  return null
}

export function validateReusedInternalAllocation(
  input: AllocationValidationInput,
  context: AllocationValidationContext,
): AllocationActionResult | null {
  const project = context.projects.find((candidate) => candidate.id === input.projectId)
  const reusedSystem = context.reusedInternalSystems.find((candidate) => candidate.id === input.systemId)
  if (!project) return failed('Project not found.')
  if (project.mainType !== 'POC') return failed('Delivery and Renewal projects cannot allocate Reused Internal Systems.')
  if (!reusedSystem) return failed('Reused internal system not found.')
  const allActiveLinks = activeProjectSystemLinks(context.projectSystems)
  const derivedAvailability = reusedInternalAvailabilityStatus(reusedSystem, allActiveLinks, context.projects, context.systems)
  const hasReusablePurpose =
    derivedAvailability === REUSED_INTERNAL_STATUS_AVAILABLE &&
    reusedSystem.purpose === REUSED_INTERNAL_PURPOSE_NONE
  if (!hasReusablePurpose) return failed(`Reused internal system is not available for allocation. Current Purpose is ${reusedSystem.purpose}.`)
  const projectRegion = projectBusinessRegionForAllocation(project, context)
  if (!projectRegion) return unmappedProjectRegionMessage()
  const hasCurrentAllocation = allActiveLinks.some((link) => {
    if (reusedInternalMachineIdsEqual(link.sourceMachineId, reusedSystem.machineId)) return true
    const allocatedSystem = context.systems.find((candidate) => candidate.id === link.systemId)
    return Boolean(allocatedSystem && reusedInternalMachineIdsEqual(allocatedSystem.machineId, reusedSystem.machineId))
  })
  if (hasCurrentAllocation) return failed('Reused internal system is already actively allocated.')
  const activeLinks = allActiveLinks.filter((link) =>
    (reusedInternalMachineIdsEqual(link.sourceMachineId, reusedSystem.machineId) || reusedSystem.currentProjectIds.includes(link.projectId)) &&
    reusedSystem.currentProjectIds.includes(link.projectId),
  )
  const regionConflict = validateSystemRegionCompatibility(projectRegion, activeLinks, context, reusedSystem.usedInRegion)
  if (regionConflict) return regionConflict
  if (!projectPocDateForAllocation(project, context, 'pocStartDate')) return failed(`Project ${project.pid} must have a POC Start Date before this Reused System can be allocated.`)
  if (!projectPocDateForAllocation(project, context, 'pocEndDate')) return failed(`Project ${project.pid} must have a POC End Date before this Reused System can be allocated.`)
  if (allActiveLinks.some((link) => link.projectId === input.projectId && reusedInternalMachineIdsEqual(link.sourceMachineId, reusedSystem.machineId))) {
    return failed('This MID is already allocated to the project.')
  }
  return null
}

export function validateExistingSystemLink(
  input: AllocationValidationInput,
  context: AllocationValidationContext,
): AllocationActionResult | null {
  const project = context.projects.find((candidate) => candidate.id === input.projectId)
  const system = context.systems.find((candidate) => candidate.id === input.systemId)
  if (!project) return failed('Project not found.')
  if (!system) return failed('Existing system not found.')
  const projectRegion = projectBusinessRegionForAllocation(project, context)
  if (!projectRegion) return unmappedProjectRegionMessage()
  const regionConflict = validateSystemRegionCompatibility(
    projectRegion,
    activeProjectSystemLinks(context.projectSystems).filter((link) => link.systemId === input.systemId),
    context,
    system.region || system.timeGroup,
  )
  if (regionConflict) return regionConflict
  const opportunity = context.opportunities?.find((candidate) => candidate.opportunityId === project.opportunityId || candidate.id === project.opportunityId)
  const requestedSystemIds = new Set(
    opportunity
      ? applicableOpportunityRequirementSources(opportunity)
          .map((source) => {
            const requirement = source.requirement
            if (source.requirementType === 'A' && 'deployTarget' in requirement) {
              return requirement.deployTarget === 'EXISTING_SID' ? requirement.existingSystemId : ''
            }
            return ''
          })
          .filter(Boolean)
      : [],
  )
  if (!requestedSystemIds.has(input.systemId)) {
    return failed('Projects can only manually link existing systems requested in Grid A New Tenant requirements.')
  }
  if (activeProjectSystemLinks(context.projectSystems).some((link) => link.projectId === input.projectId && link.systemId === input.systemId)) {
    return failed('This system is already allocated to the project.')
  }
  return null
}

export function validateProjectSystemDeallocation(
  allocationId: string,
  context: {
    projects?: AllocationValidationContext['projects']
    opportunities?: AllocationValidationContext['opportunities']
    projectSystems: ProjectSystemLink[]
    projectTenants?: ProjectTenantLink[]
    systems?: System[]
    tenants?: Tenant[]
  },
): AllocationActionResult | null {
  const allocation = context.projectSystems.find((candidate) => candidate.id === allocationId)
  if (!allocation) return failed('Allocation not found.')
  if (allocation.allocationStatus === 'DEALLOCATED') return failed('Allocation is already deallocated.')
  const project = context.projects?.find((candidate) => candidate.id === allocation.projectId)
  const opportunity = project
    ? context.opportunities?.find((candidate) =>
        candidate.id === project.opportunityId ||
        candidate.opportunityId === project.opportunityId,
      )
    : undefined
  const automaticSources = project
    ? automaticAllocationSourcesForProjectSystem(project, opportunity, context.tenants ?? [], allocation.systemId)
    : []
  if (automaticSources.length > 0) {
    return failed('This System is auto-allocated from existing Tenant requirements and cannot be manually deallocated while Grid B/C requires it.')
  }
  const system = context.systems?.find((candidate) => candidate.id === allocation.systemId)
  if (system?.operationalStatus === SYSTEM_OPERATIONAL_STATUS_DELETED) {
    return failed(`System ${system.sid ?? allocation.systemId} cannot be deallocated because its Operational Status is Deleted.`)
  }

  const tenantById = new Map((context.tenants ?? []).map((tenant) => [tenant.id, tenant]))
  const blockingTenants = activeProjectTenantLinks(context.projectTenants ?? [])
    .filter((link) =>
      link.projectId === allocation.projectId &&
      link.systemId === allocation.systemId,
    )
    .map((link) => tenantById.get(link.tenantId))
    .filter((tenant): tenant is Tenant => Boolean(tenant))
    .filter((tenant) => !isTenantLifecycleInactive(tenant))
  if (blockingTenants.length > 0) {
    const systemId = system?.sid ?? allocation.systemId
    const tenantIds = blockingTenants
      .map((tenant) => tenant.tid)
      .sort((first, second) => first.localeCompare(second, undefined, { numeric: true }))
      .join('; ')
    return failed(`Deallocating a system with existing tenants is not allowed.
Please delete or cancel them first.

System ${systemId} with tenants ${tenantIds}`)
  }
  return null
}
