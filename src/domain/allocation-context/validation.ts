import type { ProjectSystemLink } from '@/data/seed.types'
import { projectHeaderFieldValue } from '@/domain/project-lifecycle'
import { isReusedInternalOccupied } from '@/domain/system-inventory'
import { activeProjectSystemLinks } from './service'
import type { AllocationActionResult, AllocationValidationContext, AllocationValidationInput } from './types'

function failed(message: string): AllocationActionResult {
  return { ok: false, message }
}

function projectRegionForAllocation(project: NonNullable<AllocationValidationContext['projects'][number]>, context: AllocationValidationContext): string {
  const linkedOpportunity = context.opportunities?.find((opportunity) => opportunity.id === project.opportunityId || opportunity.opportunityId === project.opportunityId)
  const account = context.accounts?.find((candidate) => candidate.accountName === project.accountName)
  return projectHeaderFieldValue(project, 'region', { linkedOpportunity, account }).trim()
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
  if (isReusedInternalOccupied(reusedSystem.status)) return failed('Reused internal system is already occupied.')
  const currentRegion = String(reusedSystem.usedInRegion ?? '').trim()
  const projectRegion = projectRegionForAllocation(project, context)
  if (currentRegion && projectRegion && currentRegion !== projectRegion) {
    return failed(`Conflict: current system used in region is ${currentRegion} and you are trying to allocate it to a project that its region is ${projectRegion}.`)
  }
  if (activeProjectSystemLinks(context.projectSystems).some((link) => link.projectId === input.projectId && link.sourceMachineId === reusedSystem.machineId)) {
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
  if (project.mainType === 'POC') {
    const opportunity = context.opportunities?.find((candidate) => candidate.opportunityId === project.opportunityId || candidate.id === project.opportunityId)
    const requestedSystemIds = new Set([
      ...(opportunity?.newTenantRequirements ?? [])
        .filter((requirement) => requirement.deployTarget === 'EXISTING_SID')
        .map((requirement) => requirement.existingSystemId),
      ...(opportunity?.changeRequestRequirements ?? []).map((requirement) => requirement.systemId),
      ...(opportunity?.standardRenewalRequirements ?? []).map((requirement) => requirement.systemId),
    ].filter(Boolean))
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
