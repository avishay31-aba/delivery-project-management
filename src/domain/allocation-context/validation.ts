import type { ProjectSystemLink } from '@/data/seed.types'
import { activeProjectSystemLinks } from './service'
import type { AllocationActionResult, AllocationValidationContext, AllocationValidationInput } from './types'

function failed(message: string): AllocationActionResult {
  return { ok: false, message }
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
  if (reusedSystem.status === 'Occupied') return failed('Reused internal system is already occupied.')
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
  if (project.mainType === 'POC') return failed('POC projects cannot link existing production systems in F1.')
  if (!system) return failed('Existing system not found.')
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
