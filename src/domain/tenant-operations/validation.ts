import { activeProjectSystemLinks, activeProjectTenantLinks } from '@/domain/allocation-context'
import type {
  TenantCreationContext,
  TenantCreationInput,
  TenantCreationSource,
  TenantOperationResult,
} from './types'

export function tenantOperationSuccess(message: string, allocationId?: string): TenantOperationResult {
  return { ok: true, message, allocationId }
}

export function tenantOperationError(message: string): TenantOperationResult {
  return { ok: false, message }
}

export function resolveTenantCreationSource(
  input: TenantCreationInput,
  context: TenantCreationContext,
): { source: TenantCreationSource; error?: never } | { source?: never; error: TenantOperationResult } {
  const project = context.projects.find((candidate) => candidate.id === input.projectId)
  const system = context.systems.find((candidate) => candidate.id === input.systemId)
  if (!project) return { error: tenantOperationError('Project not found.') }
  if (!system) return { error: tenantOperationError('System not found.') }

  const opportunity = context.opportunities.find(
    (candidate) =>
      candidate.opportunityId === project.opportunityId ||
      candidate.id === project.opportunityId ||
      candidate.pocProjectIds.includes(project.id) ||
      candidate.finalProjectId === project.id,
  )
  const requirement = opportunity?.newTenantRequirements.find((candidate) => candidate.id === input.requirementId)
  if (!opportunity || !requirement) {
    return { error: tenantOperationError('New tenant requirement not found for this project.') }
  }

  const activeTenantLinks = activeProjectTenantLinks(context.projectTenants)
  const alreadyLinked = context.tenants.some((tenant) => {
    const linkedToProject = activeTenantLinks.some(
      (link) => link.projectId === input.projectId && link.tenantId === tenant.id,
    )
    return linkedToProject && tenant.systemId === input.systemId && tenant.sourceRequirementId === requirement.requirementId
  })
  if (alreadyLinked) return { error: tenantOperationError('A tenant already exists for this requirement on this system.') }

  return {
    source: {
      account: context.accounts.find((candidate) => candidate.id === opportunity.accountId),
      opportunity,
      project,
      projectSystemLink: activeProjectSystemLinks(context.projectSystems).find(
        (link) => link.projectId === input.projectId && link.systemId === input.systemId,
      ),
      requirement,
      system,
    },
  }
}
