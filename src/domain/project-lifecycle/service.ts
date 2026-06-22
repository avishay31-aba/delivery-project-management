import { deriveProjectProgress } from '@/domain/milestone-plan'
import { opportunityRowsForRequirementSection } from '@/domain/opportunity-lifecycle'
import { activeProjectSystemLinks, activeProjectTenantLinks } from '@/domain/allocation-context'
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
  ProjectDeliveryDateStatus,
  ProjectHealthReadModel,
  ProjectHealthStatus,
  ProjectPortfolioHealthSummary,
  ProjectLifecycleContext,
  ProjectRequirementRow,
  ProjectSystemsTenantsContext,
  ProjectSystemLink,
  ProjectTenantLink,
  StandardRenewalRequirement,
  System,
  Tenant,
} from './types'

const UPCOMING_DELIVERY_RISK_DAYS = 14

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

export function projectStatusLabel(status: string): string {
  if (status === 'DONE') return 'Done'
  if (status === 'IN_PROGRESS') return 'In progress'
  return 'Open'
}

export function projectHealthStatusLabel(status: ProjectHealthStatus): string {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'AT_RISK') return 'At Risk'
  if (status === 'BLOCKED') return 'Blocked'
  if (status === 'WARNING') return 'Warning'
  return 'Healthy'
}

export function projectDeliveryDateStatusLabel(status: ProjectDeliveryDateStatus): string {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'OVERDUE') return 'Overdue'
  if (status === 'UPCOMING_RISK') return 'Upcoming Risk'
  if (status === 'ON_TRACK') return 'On Track'
  return 'Not Set'
}

function dateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate())
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? null : dateOnly(parsed)
}

export function projectDeliveryDateStatus(project: Project, completed: boolean, today = new Date()): ProjectDeliveryDateStatus {
  if (completed) return 'COMPLETED'
  const deliveryDate = parseDateOnly(project.deliveryDate)
  if (!deliveryDate) return 'NOT_SET'
  const todayDate = dateOnly(today)
  const dayDifference = Math.ceil((deliveryDate.getTime() - todayDate.getTime()) / 86_400_000)
  if (dayDifference < 0) return 'OVERDUE'
  if (dayDifference <= UPCOMING_DELIVERY_RISK_DAYS) return 'UPCOMING_RISK'
  return 'ON_TRACK'
}

export function projectTaskCounts(project: Project): { openTaskCount: number; completedTaskCount: number } {
  const tasks = project.tasks ?? []
  return {
    openTaskCount: tasks.filter((task) => task.status !== 'DONE').length,
    completedTaskCount: tasks.filter((task) => task.status === 'DONE').length,
  }
}

export function projectHealthReadModel(
  context: ProjectSystemsTenantsContext,
  today = new Date(),
): ProjectHealthReadModel {
  const progress = deriveProjectProgress(context.project)
  const completed = context.project.progressStatus === 'DONE' || progress.percent >= 100
  const activeSystemLinks = activeSystemLinksForProject(context.project.id, context.projectSystems)
  const linkedSystems = linkedSystemsForProject(context.project, context.systems, activeSystemLinks)
  const linkedTenants = linkedTenantsForProject(context.project, linkedSystems, context.projectTenants, context.tenants)
  const taskCounts = projectTaskCounts(context.project)
  const deliveryDateStatus = projectDeliveryDateStatus(context.project, completed, today)
  const missingSystems = activeSystemLinks.length === 0
  const missingTenants = linkedTenants.length === 0
  const healthAlerts = [
    deliveryDateStatus === 'OVERDUE' ? 'Delivery date overdue' : null,
    deliveryDateStatus === 'UPCOMING_RISK' ? 'Delivery date approaching' : null,
    missingSystems ? 'Missing system allocation' : null,
    missingTenants ? 'Missing tenant allocation' : null,
  ].filter((alert): alert is string => Boolean(alert))

  const healthStatus: ProjectHealthStatus = completed
    ? 'COMPLETED'
    : deliveryDateStatus === 'OVERDUE'
      ? 'AT_RISK'
      : healthAlerts.length > 0
        ? 'WARNING'
        : 'HEALTHY'

  return {
    projectId: context.project.id,
    pid: context.project.pid,
    healthStatus,
    healthLabel: projectHealthStatusLabel(healthStatus),
    healthAlerts,
    completionPercent: progress.percent,
    currentMilestone: progress.currentMilestone,
    lastCompletedMilestone: progress.lastMilestone,
    openTaskCount: taskCounts.openTaskCount,
    completedTaskCount: taskCounts.completedTaskCount,
    activeSystemCount: activeSystemLinks.length,
    activeTenantCount: linkedTenants.length,
    missingSystems,
    missingTenants,
    deliveryDateStatus,
    deliveryDateStatusLabel: projectDeliveryDateStatusLabel(deliveryDateStatus),
  }
}

export function projectPortfolioHealthSummary(
  projects: Project[],
  context: Omit<ProjectSystemsTenantsContext, 'project'>,
  today = new Date(),
): ProjectPortfolioHealthSummary {
  const healthRows = projects.map((project) =>
    projectHealthReadModel(
      {
        ...context,
        project,
      },
      today,
    ),
  )

  return {
    totalProjects: healthRows.length,
    healthyProjects: healthRows.filter((row) => row.healthStatus === 'HEALTHY').length,
    warningProjects: healthRows.filter((row) => row.healthStatus === 'WARNING').length,
    atRiskProjects: healthRows.filter((row) => row.healthStatus === 'AT_RISK').length,
    completedProjects: healthRows.filter((row) => row.healthStatus === 'COMPLETED').length,
    projectsMissingSystems: healthRows.filter((row) => row.missingSystems).length,
    projectsMissingTenants: healthRows.filter((row) => row.missingTenants).length,
  }
}

export function projectListRowClassName(project: Project): string {
  return project.progressStatus === 'DONE'
    ? 'bg-blue-50 hover:bg-blue-100'
    : 'bg-green-50 hover:bg-green-100'
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

export function activeSystemLinksForProject(projectId: string, projectSystems: ProjectSystemLink[]): ProjectSystemLink[] {
  return activeProjectSystemLinks(projectSystems).filter((link) => link.projectId === projectId)
}

export function linkedSystemsForProject(
  project: Project | undefined,
  systems: System[],
  activeSystemLinks: ProjectSystemLink[],
): System[] {
  if (!project) return []
  const linkedSystemIds = new Set(activeSystemLinks.map((link) => link.systemId))
  return systems.filter((system) => linkedSystemIds.has(system.id))
}

export function linkedTenantsForProject(
  project: Project | undefined,
  linkedSystems: System[],
  projectTenants: ProjectTenantLink[],
  tenants: Tenant[],
): Tenant[] {
  if (!project) return []
  const linkedTenantIds = new Set(
    activeProjectTenantLinks(projectTenants)
      .filter((link) => link.projectId === project.id)
      .map((link) => link.tenantId),
  )
  linkedSystems.forEach((system) => {
    tenants.filter((tenant) => tenant.systemId === system.id).forEach((tenant) => linkedTenantIds.add(tenant.id))
  })
  return tenants.filter((tenant) => linkedTenantIds.has(tenant.id))
}

export function activeSystemLinkMapBySystemId(activeSystemLinks: ProjectSystemLink[]): Map<string, ProjectSystemLink> {
  return new Map(activeSystemLinks.map((link) => [link.systemId, link]))
}
