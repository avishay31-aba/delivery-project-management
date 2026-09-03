import { activeProjectSystemLinks } from '@/domain/allocation-context'
import { systemApplicationConfigurationSummary } from '@/domain/system-inventory'
import { validateRequirementA } from '@/domain/tenant-requirement'
import type { Account, Opportunity, System, Tenant, TenantConfiguration } from '@/data/seed.types'
import { tenantRequirementFromConfiguration } from './adapters'
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
  const requirement = opportunity?.newTenantRequirements.find(
    (candidate) => candidate.id === input.requirementId || candidate.requirementId === input.requirementId,
  )
  if (!opportunity || !requirement) {
    return { error: tenantOperationError('New tenant requirement not found for this project.') }
  }

  return {
    source: {
      account: context.accounts.find((candidate) => candidate.id === opportunity.accountId),
      existingTenantIds: context.tenants.map((tenant) => tenant.tid),
      idCounters: context.idCounters,
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

export function validateTenantConfigurationSave(
  tenant: Tenant,
  configuration: TenantConfiguration,
  opportunity: Opportunity,
  context: { accounts: Account[]; systems: System[]; tenants: Tenant[]; activeSystem?: System },
): string[] {
  const systemConfiguration = context.activeSystem
    ? systemApplicationConfigurationSummary(context.activeSystem, context.tenants)
    : null
  const effectiveConfiguration = {
    ...configuration,
    mapCenter: context.activeSystem ? systemConfiguration?.mapCenter || '' : configuration.mapCenter,
  }
  return validateRequirementA(
    tenantRequirementFromConfiguration(tenant, effectiveConfiguration, context.activeSystem),
    opportunity,
    { accounts: context.accounts, systems: context.systems, tenants: context.tenants },
  )
    .filter((message) => message.level === 'error')
    .map((message) => {
      const normalized = message.message.replace(/^Grid A row 1: /, 'Configuration: ')
      return normalized === 'Configuration: Map Center is required.'
        ? 'Linked System configuration: Map Center is required.'
        : normalized
    })
}
