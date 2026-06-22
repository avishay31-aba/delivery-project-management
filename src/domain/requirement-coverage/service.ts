import { createdProjectsForOpportunity } from '@/domain/opportunity-lifecycle'
import {
  REQUIREMENT_COVERAGE_MISSING_STEP_LABELS,
  REQUIREMENT_COVERAGE_STATUS_LABELS,
} from './metadata'
import { requirementCoverageSources } from './adapters'
import type {
  Project,
  RequirementCoverageContext,
  RequirementCoverageMissingStep,
  RequirementCoverageRow,
  RequirementCoverageSource,
  RequirementCoverageStatus,
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

function deriveProjectOnlyCoverageRow(
  source: RequirementCoverageSource,
  context: RequirementCoverageContext,
): RequirementCoverageRow {
  const linkedProjects = sourceProjects(source, context.projects)
  if (linkedProjects.length === 0) {
    return coverageRowBase(source, linkedProjects, 'UNCOVERED', 'MISSING_PROJECT', ['No linked Project found.'])
  }

  return coverageRowBase(source, linkedProjects, 'PARTIALLY_COVERED', 'MISSING_SYSTEM_ALLOCATION', ['Project exists; coverage needs system and tenant checks.'])
}

export function requirementCoverageRows(context: RequirementCoverageContext): RequirementCoverageRow[] {
  return requirementCoverageSources(context).map((source) => deriveProjectOnlyCoverageRow(source, context))
}
