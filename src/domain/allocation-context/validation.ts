import type { ProjectSystemLink } from '@/data/seed.types'
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'
import { applicableOpportunityRequirementSources } from '@/domain/opportunity-lifecycle'
import { projectHeaderFieldValue } from '@/domain/project-lifecycle'
import { REUSED_INTERNAL_PURPOSE_AVAILABLE, REUSED_INTERNAL_STATUS_AVAILABLE, reusedInternalMachineIdsEqual } from '@/domain/system-inventory'
import { activeProjectSystemLinks } from './service'
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
  if (reusedSystem.status !== REUSED_INTERNAL_STATUS_AVAILABLE) return failed('Reused internal system is not available for allocation.')
  if (reusedSystem.purpose !== REUSED_INTERNAL_PURPOSE_AVAILABLE) return failed(`Reused internal system is not available for allocation. Current Purpose is ${reusedSystem.purpose}.`)
  const projectRegion = projectBusinessRegionForAllocation(project, context)
  if (!projectRegion) return unmappedProjectRegionMessage()
  const activeLinks = activeProjectSystemLinks(context.projectSystems).filter((link) =>
    (reusedInternalMachineIdsEqual(link.sourceMachineId, reusedSystem.machineId) || reusedSystem.currentProjectIds.includes(link.projectId)) &&
    reusedSystem.currentProjectIds.includes(link.projectId),
  )
  const regionConflict = validateSystemRegionCompatibility(projectRegion, activeLinks, context, reusedSystem.usedInRegion)
  if (regionConflict) return regionConflict
  if (!projectPocDateForAllocation(project, context, 'pocStartDate')) return failed(`Project ${project.pid} must have a POC Start Date before this Reused System can be allocated.`)
  if (!projectPocDateForAllocation(project, context, 'pocEndDate')) return failed(`Project ${project.pid} must have a POC End Date before this Reused System can be allocated.`)
  if (activeProjectSystemLinks(context.projectSystems).some((link) => link.projectId === input.projectId && reusedInternalMachineIdsEqual(link.sourceMachineId, reusedSystem.machineId))) {
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
  if (project.mainType === 'POC') {
    const opportunity = context.opportunities?.find((candidate) => candidate.opportunityId === project.opportunityId || candidate.id === project.opportunityId)
    const requestedSystemIds = new Set(
      opportunity
        ? applicableOpportunityRequirementSources(opportunity)
            .map((source) => {
              const requirement = source.requirement
              if ('deployTarget' in requirement) {
                return requirement.deployTarget === 'EXISTING_SID' ? requirement.existingSystemId : ''
              }
              return 'systemId' in requirement ? requirement.systemId : ''
            })
            .filter(Boolean)
        : [],
    )
    if (!requestedSystemIds.has(input.systemId)) {
      return failed('POC projects can only link existing systems specified in the Opportunity tenant requirements.')
    }
  }
  if (activeProjectSystemLinks(context.projectSystems).some((link) => link.projectId === input.projectId && link.systemId === input.systemId)) {
    return failed('This system is already allocated to the project.')
  }
  return null
}

export function validateProjectSystemDeallocation(
  allocationId: string,
  projectSystems: ProjectSystemLink[],
): AllocationActionResult | null {
  const allocation = projectSystems.find((candidate) => candidate.id === allocationId)
  if (!allocation) return failed('Allocation not found.')
  if (allocation.allocationStatus === 'DEALLOCATED') return failed('Allocation is already deallocated.')
  return null
}
