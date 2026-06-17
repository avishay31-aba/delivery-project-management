import { deriveProjectProgress } from '@/domain/milestone-plan'
import { opportunityRowsForRequirementSection } from '@/domain/opportunity-lifecycle'
import type { RequirementColumnMetadata } from '@/config/opportunity-metadata'
import type { ProjectHeaderFieldKey } from './metadata'
import type { ProjectRequirementSectionKind, ProjectRequirementSectionMetadata } from './metadata'
import {
  CHANGE_REQUEST_PROJECT_SECTION,
  NEW_TENANT_PROJECT_SECTION,
  STANDARD_RENEWAL_PROJECT_SECTION,
} from './metadata'
import type {
  ChangeRequestRequirement,
  Opportunity,
  Project,
  ProjectLifecycleContext,
  ProjectRequirementRow,
  StandardRenewalRequirement,
  System,
  Tenant,
} from './types'

export function projectLifecycleIdentity(project: Project): Project {
  return project
}

export function projectDashboardProjectName(project: Project): string {
  return project.opportunityName
}

export function projectDashboardEndUser(project: Project): string {
  return project.accountName
}

export function projectDashboardPayingCustomer(project: Project): string {
  return project.accountName
}

export function projectDashboardStatus(project: Project): string {
  return project.progressStatus
}

export function projectDashboardDeliveryDate(project: Project): string {
  return project.deliveryDate ?? ''
}

export function projectDashboardType(project: Project): string {
  return project.mainType
}

export function projectDashboardOwner(project: Project): string {
  return project.dealOwner
}

export function projectDashboardLastMilestone(project: Project): string {
  return deriveProjectProgress(project).lastMilestone
}

export function projectDashboardCurrentMilestone(project: Project): string {
  return deriveProjectProgress(project).currentMilestone
}

export function projectDashboardPercent(project: Project): number {
  return deriveProjectProgress(project).percent
}

export function projectDashboardMilestonesCompletion(project: Project): string {
  return `${projectDashboardPercent(project)}%`
}

export function projectDashboardEmptyValue(): string {
  return ''
}

function textValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ')
  return value == null ? '' : String(value)
}

export function projectHeaderFieldValue(
  project: Project,
  key: ProjectHeaderFieldKey,
  context: ProjectLifecycleContext = {},
): string {
  switch (key) {
    case 'accountName':
      return context.account?.accountName ?? project.accountName
    case 'region':
      return context.linkedOpportunity?.region ?? context.account?.region ?? ''
    case 'country':
      return context.linkedOpportunity?.country ?? context.account?.country ?? ''
    case 'state':
      return context.linkedOpportunity?.state ?? context.account?.state ?? ''
    case 'timeZone':
      return context.linkedOpportunity?.timeZone ?? context.account?.timeZone ?? ''
    case 'timeGroup':
      return context.linkedOpportunity?.timeGroup ?? context.account?.timeGroup ?? ''
    case 'pocStartDate':
      return context.linkedOpportunity?.pocStartDate ?? ''
    case 'pocEndDate':
      return context.linkedOpportunity?.pocEndDate ?? ''
    case 'warrantyServiceMonths':
      return textValue(context.linkedOpportunity?.warrantyServiceMonths)
    case 'currentMilestone':
      return context.linkedOpportunity?.currentMilestone ?? ''
    case 'projectAlerts':
      return context.linkedOpportunity?.projectAlerts?.join(', ') ?? ''
    case 'reportToDirect':
    case 'reportToLevel2':
      return ''
    case 'dealOwner':
      return context.salesManager?.name ?? project.dealOwner
    default:
      return textValue(project[key as keyof Project])
  }
}

export function isProjectHeaderFieldChanged(
  persistedProject: Project,
  projectDraft: Project,
  key: ProjectHeaderFieldKey,
  context: ProjectLifecycleContext = {},
): boolean {
  if (key === 'pocStartDate' || key === 'pocEndDate' || key === 'warrantyServiceMonths' || key === 'currentMilestone' || key === 'projectAlerts') {
    return false
  }
  return JSON.stringify(projectHeaderFieldValue(persistedProject, key, context) ?? null) !==
    JSON.stringify(projectHeaderFieldValue(projectDraft, key, context) ?? null)
}

export function projectPatchFromOpportunitySelection(
  current: Project,
  selectedOpportunity: Opportunity,
  projectType: Pick<Project, 'mainType' | 'subType'>,
): Project {
  return {
    ...current,
    opportunityId: selectedOpportunity.opportunityId,
    opportunityName: selectedOpportunity.opportunityName,
    mainType: projectType.mainType,
    subType: projectType.subType,
    deliveryDate: selectedOpportunity.deliveryDate,
  }
}

export function projectRequirementTitle(section: ProjectRequirementSectionMetadata): string {
  if (section.kind === 'A') return 'Grid A: New Tenant Requirements'
  if (section.kind === 'B') return 'Grid B: Change Request Requirements'
  return 'Tenants to Renew'
}

export function completeProjectRequirementSections(
  sections: ProjectRequirementSectionMetadata[],
  opportunity: Opportunity | undefined,
): ProjectRequirementSectionMetadata[] {
  const sectionsByKind = new Map(sections.map((section) => [section.kind, section]))
  const fallbackSections: ProjectRequirementSectionMetadata[] = [
    NEW_TENANT_PROJECT_SECTION,
    CHANGE_REQUEST_PROJECT_SECTION,
    STANDARD_RENEWAL_PROJECT_SECTION,
  ]

  fallbackSections.forEach((section) => {
    if (!sectionsByKind.has(section.kind) && opportunityRowsForRequirementSection(opportunity, section.kind).length > 0) {
      sectionsByKind.set(section.kind, section)
    }
  })

  return fallbackSections
    .map((section) => sectionsByKind.get(section.kind))
    .filter((section): section is ProjectRequirementSectionMetadata => Boolean(section))
}

export function projectRequirementRows(opportunity: Opportunity | undefined, kind: ProjectRequirementSectionKind): ProjectRequirementRow[] {
  return opportunityRowsForRequirementSection(opportunity, kind)
}

function rowValue(row: ProjectRequirementRow, key: string): unknown {
  return (row as unknown as Record<string, unknown>)[key]
}

export function projectTenantDisplayName(tenant: Tenant): string {
  return tenant.tenantName ? `${tenant.tid} - ${tenant.tenantName}` : tenant.tid
}

export function resolveProjectSystemSid(systemId: string | null | undefined, systems: System[]): string {
  if (!systemId) return ''
  return systems.find((system) => system.id === systemId)?.sid ?? ''
}

export function resolveProjectTenant(tenantId: string, tenants: Tenant[]): Tenant | undefined {
  return tenants.find((tenant) => tenant.id === tenantId)
}

export function projectRequirementReadonlyCellValue(
  row: ProjectRequirementRow,
  column: RequirementColumnMetadata,
  kind: ProjectRequirementSectionKind,
  tenants: Tenant[],
  systems: System[],
): string {
  if (column.key === 'existingSystemId' && kind === 'A') {
    const requirement = row as ProjectRequirementRow & { deployTarget?: string; existingSystemId?: string | null }
    if (requirement.deployTarget !== 'EXISTING_SID') return 'New System'
    return resolveProjectSystemSid(requirement.existingSystemId, systems)
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'tenantId') {
    const tenant = resolveProjectTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return tenant ? projectTenantDisplayName(tenant) : ''
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'tenantName') {
    const tenant = resolveProjectTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return tenant?.tenantName ?? ''
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'systemId') {
    const tenant = resolveProjectTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return resolveProjectSystemSid(tenant?.systemId ?? rowValue(row, column.key) as string, systems)
  }

  if ((kind === 'B' || kind === 'C') && column.key === 'deliveryPid') {
    const tenant = resolveProjectTenant((row as ChangeRequestRequirement | StandardRenewalRequirement).tenantId, tenants)
    return tenant?.deliveryPid ?? ''
  }

  return textValue(rowValue(row, column.key))
}
