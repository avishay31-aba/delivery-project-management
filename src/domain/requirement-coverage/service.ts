import { createdProjectsForOpportunity } from '@/domain/opportunity-lifecycle'
import { activeProjectSystemLinks, activeProjectTenantLinks } from '@/domain/allocation-context'
import { systemIdentity, systemSource } from '@/domain/system-inventory'
import {
  REQUIREMENT_COVERAGE_MISSING_STEP_LABELS,
  REQUIREMENT_COVERAGE_STATUS_LABELS,
} from './metadata'
import { requirementCoverageSources } from './adapters'
import type {
  Account,
  Opportunity,
  Project,
  ProjectSystemLink,
  System,
  Tenant,
  RequirementCoverageContext,
  RequirementCoverageMissingStep,
  RequirementCoverageRow,
  RequirementCoverageSource,
  RequirementCoverageStatus,
  RequirementCoverageSummary,
} from './types'

function coverageRowId(source: RequirementCoverageSource): string {
  return [
    source.opportunity.opportunityId,
    source.requirementType,
    source.requirement.id,
  ].join(':')
}

function sourceProjects(source: RequirementCoverageSource, projects: Project[]): Project[] {
  return createdProjectsForOpportunity(source.opportunity, source.opportunity, projects)
}

function firstValue(values: Array<string | null | undefined>): string {
  return values.find((value): value is string => Boolean(value)) ?? ''
}

function requirementProduct(source: RequirementCoverageSource): string {
  return 'productType' in source.requirement ? source.requirement.productType ?? '' : ''
}

function requirementHostingType(source: RequirementCoverageSource): string {
  return 'hostingType' in source.requirement ? source.requirement.hostingType ?? '' : ''
}

function requirementCloudPlatform(source: RequirementCoverageSource): string {
  return 'cloudPlatform' in source.requirement ? source.requirement.cloudPlatform ?? '' : ''
}

function requirementDeploymentTarget(source: RequirementCoverageSource): string {
  return 'deployTarget' in source.requirement ? source.requirement.deployTarget : ''
}

function sourceRequirementIdCount(source: RequirementCoverageSource): number {
  if (!source.requirement.requirementId) return 0
  const rows =
    source.requirementType === 'A'
      ? source.opportunity.newTenantRequirements
      : source.requirementType === 'B'
        ? source.opportunity.changeRequestRequirements
        : source.opportunity.standardRenewalRequirements
  return rows.filter((row) => row.requirementId === source.requirement.requirementId).length
}

function activeSystemLinksForProjects(projects: Project[], projectSystems: ProjectSystemLink[]): ProjectSystemLink[] {
  const projectIds = new Set(projects.map((project) => project.id))
  return activeProjectSystemLinks(projectSystems).filter((link) => projectIds.has(link.projectId))
}

function systemsForLinks(links: ProjectSystemLink[], systems: System[]): System[] {
  const systemIds = new Set(links.map((link) => link.systemId))
  return systems.filter((system) => systemIds.has(system.id))
}

function tenantsForActiveLinks(projects: Project[], tenants: Tenant[], context: RequirementCoverageContext): Tenant[] {
  const projectIds = new Set(projects.map((project) => project.id))
  const tenantIds = new Set(
    activeProjectTenantLinks(context.projectTenants)
      .filter((link) => projectIds.has(link.projectId))
      .map((link) => link.tenantId),
  )
  return tenants.filter((tenant) => tenantIds.has(tenant.id))
}

function tenantSystemId(tenant: Tenant): string {
  return tenant.hostedSystemId ?? tenant.systemId
}

function firstSystemIdentity(systems: System[]): { systemId: string; sid: string; mid: string } {
  const system = systems[0]
  if (!system) return { systemId: '', sid: '', mid: '' }
  const identity = systemIdentity(system)
  return {
    systemId: system.id,
    sid: system.sid ?? '',
    mid: system.machineId ?? (systemSource(system) === 'Reused Internal Systems' ? identity : ''),
  }
}

function firstTenantIdentity(tenants: Tenant[]): { tenantId: string; tid: string } {
  const tenant = tenants[0]
  return {
    tenantId: tenant?.id ?? '',
    tid: tenant?.tid ?? '',
  }
}

function coverageMissingConfiguration(source: RequirementCoverageSource): RequirementCoverageMissingStep | null {
  if (!requirementHostingType(source)) return 'MISSING_HOSTING'
  if (!requirementProduct(source)) return 'MISSING_PRODUCT_CONFIGURATION'
  return null
}

function coverageRowBase(
  source: RequirementCoverageSource,
  linkedProjects: Project[],
  status: RequirementCoverageStatus,
  missingStep: RequirementCoverageMissingStep,
  alerts: string[],
): RequirementCoverageRow {
  return {
    id: coverageRowId(source),
    opportunityId: source.opportunity.opportunityId,
    opportunityName: source.opportunity.opportunityName,
    accountId: source.opportunity.accountId,
    customerName: source.account?.accountName ?? '',
    requirementId: source.requirement.requirementId,
    requirementType: source.requirementType,
    requirementGrid: source.requirementGrid,
    product: requirementProduct(source),
    hostingType: requirementHostingType(source),
    cloudPlatform: requirementCloudPlatform(source),
    deploymentTarget: requirementDeploymentTarget(source),
    projectId: firstValue(linkedProjects.map((project) => project.id)),
    pid: firstValue(linkedProjects.map((project) => project.pid)),
    systemId: '',
    sid: '',
    mid: '',
    tenantId: '',
    tid: '',
    coverageStatus: status,
    coverageStatusLabel: REQUIREMENT_COVERAGE_STATUS_LABELS[status],
    missingStep,
    missingStepLabel: REQUIREMENT_COVERAGE_MISSING_STEP_LABELS[missingStep],
    coverageAlerts: alerts,
    linkedProjectCount: linkedProjects.length,
    linkedSystemCount: 0,
    linkedTenantCount: 0,
  }
}

function coverageRowWithLinks(
  source: RequirementCoverageSource,
  linkedProjects: Project[],
  systems: System[],
  tenants: Tenant[],
  status: RequirementCoverageStatus,
  missingStep: RequirementCoverageMissingStep,
  alerts: string[],
): RequirementCoverageRow {
  const systemIdentityFields = firstSystemIdentity(systems)
  const tenantIdentityFields = firstTenantIdentity(tenants)
  return {
    ...coverageRowBase(source, linkedProjects, status, missingStep, alerts),
    ...systemIdentityFields,
    ...tenantIdentityFields,
    linkedSystemCount: systems.length,
    linkedTenantCount: tenants.length,
  }
}

function deriveNewTenantCoverageRow(
  source: RequirementCoverageSource,
  context: RequirementCoverageContext,
  linkedProjects: Project[],
): RequirementCoverageRow {
  const configurationMissingStep = coverageMissingConfiguration(source)
  if (configurationMissingStep) {
    return coverageRowWithLinks(
      source,
      linkedProjects,
      [],
      [],
      'PARTIALLY_COVERED',
      configurationMissingStep,
      [REQUIREMENT_COVERAGE_MISSING_STEP_LABELS[configurationMissingStep]],
    )
  }

  if (sourceRequirementIdCount(source) > 1) {
    return coverageRowWithLinks(
      source,
      linkedProjects,
      [],
      [],
      'UNKNOWN',
      'MISSING_RELATED_REQUIREMENT_LINK',
      ['Duplicate requirement ID prevents reliable tenant matching.'],
    )
  }

  const activeSystemLinks = activeSystemLinksForProjects(linkedProjects, context.projectSystems)
  const linkedSystems = systemsForLinks(activeSystemLinks, context.systems)
  if (linkedSystems.length === 0) {
    return coverageRowWithLinks(source, linkedProjects, [], [], 'PARTIALLY_COVERED', 'MISSING_SYSTEM_ALLOCATION', ['No active System allocation found.'])
  }

  const projectLinkedTenants = tenantsForActiveLinks(linkedProjects, context.tenants, context)
  const linkedSystemIds = new Set(linkedSystems.map((system) => system.id))
  const requirementTenants = context.tenants.filter(
    (tenant) =>
      tenant.sourceRequirementId === source.requirement.requirementId &&
      linkedSystemIds.has(tenantSystemId(tenant)) &&
      (projectLinkedTenants.length === 0 || projectLinkedTenants.some((linkedTenant) => linkedTenant.id === tenant.id)),
  )

  if (requirementTenants.length === 0) {
    return coverageRowWithLinks(source, linkedProjects, linkedSystems, [], 'PARTIALLY_COVERED', 'MISSING_TENANT_CREATION', ['No Tenant created from this requirement.'])
  }

  return coverageRowWithLinks(source, linkedProjects, linkedSystems, requirementTenants, 'COVERED', 'NONE', [])
}

function deriveExistingTenantCoverageRow(
  source: RequirementCoverageSource,
  context: RequirementCoverageContext,
  linkedProjects: Project[],
): RequirementCoverageRow {
  if (!('tenantId' in source.requirement) || !('systemId' in source.requirement)) {
    return coverageRowWithLinks(source, linkedProjects, [], [], 'UNKNOWN', 'MISSING_DATA', ['Requirement is missing tenant or system references.'])
  }

  const requirement = source.requirement as { tenantId: string; systemId: string; warrantyRecordId?: string }
  const tenant = context.tenants.find((candidate) => candidate.id === requirement.tenantId)
  const system = context.systems.find((candidate) => candidate.id === requirement.systemId)
  const warrantyExists =
    source.requirementType !== 'C' ||
    (Boolean(requirement.warrantyRecordId) && context.warrantyRecords.some((warranty) => warranty.warrantyRecordId === requirement.warrantyRecordId))

  if (!tenant || !system) {
    const missingStep = !tenant ? 'MISSING_TENANT_CREATION' : 'MISSING_SYSTEM_ALLOCATION'
    return coverageRowWithLinks(
      source,
      linkedProjects,
      system ? [system] : [],
      tenant ? [tenant] : [],
      'PARTIALLY_COVERED',
      missingStep,
      [!tenant ? 'Referenced Tenant was not found.' : 'Referenced System was not found.'],
    )
  }

  if (tenantSystemId(tenant) !== system.id) {
    return coverageRowWithLinks(
      source,
      linkedProjects,
      [system],
      [tenant],
      'UNKNOWN',
      'MISSING_RELATED_REQUIREMENT_LINK',
      ['Referenced Tenant is not hosted on the referenced System.'],
    )
  }

  if (!warrantyExists) {
    return coverageRowWithLinks(source, linkedProjects, [system], [tenant], 'PARTIALLY_COVERED', 'MISSING_DATA', ['Referenced warranty context was not found.'])
  }

  return coverageRowWithLinks(source, linkedProjects, [system], [tenant], 'COVERED', 'NONE', [])
}

function deriveProjectOnlyCoverageRow(
  source: RequirementCoverageSource,
  context: RequirementCoverageContext,
): RequirementCoverageRow {
  const linkedProjects = sourceProjects(source, context.projects)
  if (linkedProjects.length === 0) {
    return coverageRowBase(source, linkedProjects, 'UNCOVERED', 'MISSING_PROJECT', ['No linked Project found.'])
  }

  if (source.requirementType === 'A') return deriveNewTenantCoverageRow(source, context, linkedProjects)
  return deriveExistingTenantCoverageRow(source, context, linkedProjects)
}

export function requirementCoverageRows(context: RequirementCoverageContext): RequirementCoverageRow[] {
  return requirementCoverageSources(context).map((source) => deriveProjectOnlyCoverageRow(source, context))
}

export function requirementCoverageRowsForProject(
  rows: RequirementCoverageRow[],
  project: Pick<Project, 'id' | 'pid'> | null | undefined,
): RequirementCoverageRow[] {
  if (!project) return []
  return rows.filter((row) => row.projectId === project.id || row.pid === project.pid)
}

export function requirementCoverageRowsForAccount(
  rows: RequirementCoverageRow[],
  account: Pick<Account, 'id'> | null | undefined,
): RequirementCoverageRow[] {
  if (!account) return []
  return rows.filter((row) => row.accountId === account.id)
}

export function requirementCoverageRowsForOpportunity(
  rows: RequirementCoverageRow[],
  opportunity: Pick<Opportunity, 'opportunityId'> | string | null | undefined,
): RequirementCoverageRow[] {
  if (!opportunity) return []
  const opportunityId = typeof opportunity === 'string' ? opportunity : opportunity.opportunityId
  return rows.filter((row) => row.opportunityId === opportunityId)
}

export function requirementCoverageSummary(rows: RequirementCoverageRow[]): RequirementCoverageSummary {
  return {
    totalRequirements: rows.length,
    covered: rows.filter((row) => row.coverageStatus === 'COVERED').length,
    partiallyCovered: rows.filter((row) => row.coverageStatus === 'PARTIALLY_COVERED').length,
    uncovered: rows.filter((row) => row.coverageStatus === 'UNCOVERED').length,
    blocked: rows.filter((row) => row.coverageStatus === 'BLOCKED').length,
    unknown: rows.filter((row) => row.coverageStatus === 'UNKNOWN').length,
    missingProject: rows.filter((row) => row.missingStep === 'MISSING_PROJECT').length,
    missingSystem: rows.filter((row) => row.missingStep === 'MISSING_SYSTEM_ALLOCATION').length,
    missingTenant: rows.filter((row) => row.missingStep === 'MISSING_TENANT_CREATION').length,
  }
}

export function requirementCoverageSummaryForContext(context: RequirementCoverageContext): RequirementCoverageSummary {
  return requirementCoverageSummary(requirementCoverageRows(context))
}
