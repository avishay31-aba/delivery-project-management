import { deriveProjectProgress, projectDeadlineSummary } from '@/domain/milestone-plan'
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
  ProjectDeliveryDashboardContext,
  ProjectDeliveryDashboardReadModel,
  ProjectDeliveryDateStatus,
  ProjectHealthReadModel,
  ProjectHealthStatus,
  ProjectPortfolioHealthSummary,
  ProjectLifecycleContext,
  ProjectRequirementRow,
  ProjectSystemsTenantsContext,
  ProjectSystemLink,
  ProjectTenantLink,
  ProjectWorkspaceSystemSummary,
  ProjectWorkspaceTenantSummary,
  StandardRenewalRequirement,
  System,
  Tenant,
} from './types'

const UPCOMING_DELIVERY_RISK_DAYS = 14

const EMPTY_PROJECT_DEADLINE_SUMMARY = {
  overdueTaskCount: 0,
  overdueMilestoneCount: 0,
  upcomingTaskDeadlineCount: 0,
  upcomingMilestoneDeadlineCount: 0,
  nextDeadline: '',
  nextDeadlineLabel: '',
  deadlineRiskStatus: 'NONE' as const,
  deadlineRiskLabel: 'No deadline risk',
}

const EMPTY_REQUIREMENT_COVERAGE_SUMMARY = {
  totalRequirements: 0,
  covered: 0,
  partiallyCovered: 0,
  uncovered: 0,
  blocked: 0,
  unknown: 0,
  missingProject: 0,
  missingSystem: 0,
  missingTenant: 0,
}

const MODULE_FIELD_LABELS: Array<[string, string]> = [
  ['tangles', 'Tangles'],
  ['tanglesGo', 'Tangles Go'],
  ['webloc', 'Webloc'],
  ['webeye', 'Webeye'],
  ['ingest', 'Ingest'],
  ['blockchain', 'Blockchain'],
  ['apiEnabled', 'API'],
  ['crossSystemFeatures', 'Additional Sources'],
  ['aiFeatures', 'AI'],
  ['additionalFeatures', 'Additional Features'],
]

type DashboardSourceRecord = Record<string, unknown>

function linkedOpportunityForProject(project: Project, opportunities: Opportunity[]): Opportunity | undefined {
  return opportunities.find((opportunity) => opportunity.opportunityId === project.opportunityId)
}

function linkedAccountForProject(
  project: Project,
  opportunity: Opportunity | undefined,
  accounts: ProjectDeliveryDashboardContext['accounts'],
) {
  return accounts.find((account) => account.id === opportunity?.accountId) ??
    accounts.find((account) => account.accountName === project.accountName)
}

function linkedOwnerForProject(
  project: Project,
  account: ReturnType<typeof linkedAccountForProject>,
  salesManagers: ProjectDeliveryDashboardContext['salesManagers'],
): string {
  return salesManagers.find((manager) => manager.id === account?.salesManagerId)?.name ?? project.dealOwner
}

function uniqueText(values: unknown[]): string[] {
  return Array.from(new Set(values.map((value) => value == null ? '' : String(value).trim()).filter(Boolean)))
}

function joinUniqueText(values: unknown[]): string {
  return uniqueText(values).join('; ')
}

function opportunityRequirementRows(opportunity: Opportunity | undefined): ProjectRequirementRow[] {
  if (!opportunity) return []
  return [
    ...(opportunity.newTenantRequirements ?? []),
    ...(opportunity.changeRequestRequirements ?? []),
    ...(opportunity.standardRenewalRequirements ?? []),
  ]
}

function projectConfigurationSources(context: ProjectDeliveryDashboardContext, opportunity: Opportunity | undefined) {
  const activeSystemLinks = activeSystemLinksForProject(context.project.id, context.projectSystems)
  const systems = linkedSystemsForProject(context.project, context.systems, activeSystemLinks)
  const tenants = linkedTenantsForProject(context.project, systems, context.projectTenants, context.tenants)
  return {
    systems,
    tenants,
    requirements: opportunityRequirementRows(opportunity),
  }
}

function firstAvailableJoinedValue(sources: Array<Record<string, unknown>[]>, keys: string[]): string {
  for (const source of sources) {
    const values = joinUniqueText(source.flatMap((record) => keys.map((key) => record[key])))
    if (values) return values
  }
  return ''
}

function enabledModuleLabels(records: Array<Record<string, unknown>>): string[] {
  const labels: string[] = []
  records.forEach((record) => {
    MODULE_FIELD_LABELS.forEach(([field, label]) => {
      const value = record[field]
      if (Array.isArray(value) && value.length > 0) {
        labels.push(...value.map(String).filter(Boolean))
      } else if (typeof value === 'number' && value > 0) {
        labels.push(label)
      } else if (typeof value === 'string' && value && value !== 'NO') {
        labels.push(label)
      }
    })
  })
  return Array.from(new Set(labels))
}

function projectConfigurationSummary(context: ProjectDeliveryDashboardContext, opportunity: Opportunity | undefined) {
  const sources = projectConfigurationSources(context, opportunity)
  const sourcePriority = [
    sources.systems as unknown as DashboardSourceRecord[],
    sources.tenants as unknown as DashboardSourceRecord[],
    sources.requirements as unknown as DashboardSourceRecord[],
  ]
  const allRecords = sourcePriority.flat()

  return {
    hosting: firstAvailableJoinedValue(sourcePriority, ['hostingType']),
    product: firstAvailableJoinedValue(sourcePriority, ['productType', 'product']),
    modules: enabledModuleLabels(allRecords),
    licenses: firstAvailableJoinedValue(sourcePriority, ['licenses']),
    users: firstAvailableJoinedValue(sourcePriority, ['users']),
  }
}

function projectFinancialProfile(project: Project, opportunity: Opportunity | undefined): string {
  if (project.mainType === 'POC') {
    return opportunity?.subType === 'FREE' || opportunity?.subType === 'PAID' ? opportunity.subType : ''
  }
  return project.mainType === 'DELIVERY' || project.mainType === 'RENEWAL' ? 'PAID' : ''
}

function projectDashboardAlertSeverity(status: ProjectHealthStatus): ProjectDeliveryDashboardReadModel['projectAlertSeverity'] {
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'danger'
  if (status === 'WARNING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  return 'info'
}

function projectDashboardDeadlineRiskSeverity(
  status: ProjectHealthReadModel['deadlineRiskStatus'],
): ProjectDeliveryDashboardReadModel['deadlineRiskSeverity'] {
  if (status === 'OVERDUE') return 'danger'
  if (status === 'WARNING') return 'warning'
  return 'info'
}

function isPastDate(value: string | null | undefined, today = new Date()): boolean {
  const date = parseDateOnly(value)
  if (!date) return false
  return date.getTime() < dateOnly(today).getTime()
}

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

export function projectDeliveryDashboardReadModel(context: ProjectDeliveryDashboardContext): ProjectDeliveryDashboardReadModel {
  const opportunity = linkedOpportunityForProject(context.project, context.opportunities)
  const account = linkedAccountForProject(context.project, opportunity, context.accounts)
  const progress = deriveProjectProgress(context.project)
  const configuration = projectConfigurationSummary(context, opportunity)
  const health = projectHealthReadModel(context)
  const completed = context.project.progressStatus === 'DONE' || progress.percent >= 100
  const projectAlerts = [
    ...health.healthAlerts,
    !completed && isPastDate(context.project.pocStartDate ?? opportunity?.pocStartDate) ? 'POC start date overdue' : null,
  ].filter((alert): alert is string => Boolean(alert))

  return {
    projectId: context.project.id,
    pid: context.project.pid,
    projectName: context.project.opportunityName,
    endUser: account?.accountName ?? context.project.accountName,
    payingCustomer: account?.accountName ?? context.project.accountName,
    region: opportunity?.region ?? account?.region ?? '',
    country: opportunity?.country ?? account?.country ?? '',
    status: context.project.progressStatus,
    statusLabel: projectStatusLabel(context.project.progressStatus),
    deliveryDate: context.project.deliveryDate ?? '',
    pocStartDate: context.project.pocStartDate ?? opportunity?.pocStartDate ?? '',
    pocEndDate: context.project.pocEndDate ?? opportunity?.pocEndDate ?? '',
    type: context.project.mainType,
    hosting: configuration.hosting,
    product: configuration.product,
    modules: configuration.modules,
    licenses: configuration.licenses,
    users: configuration.users,
    projectAlerts,
    projectAlertSeverity: projectAlerts.some((alert) => alert.toLowerCase().includes('overdue')) ? 'danger' : projectDashboardAlertSeverity(health.healthStatus),
    deadlineRiskLabel: health.deadlineRiskLabel,
    deadlineRiskSeverity: projectDashboardDeadlineRiskSeverity(health.deadlineRiskStatus),
    nextDeadline: health.nextDeadline,
    overdueTaskCount: health.overdueTaskCount,
    overdueMilestoneCount: health.overdueMilestoneCount,
    milestoneCompletionPercent: progress.percent,
    milestoneCompletion: `${progress.percent}%`,
    lastMilestone: progress.lastMilestone,
    currentMilestone: progress.currentMilestone,
    financialProfile: projectFinancialProfile(context.project, opportunity),
    owner: linkedOwnerForProject(context.project, account, context.salesManagers),
  }
}

export function projectStatusLabel(status: string): string {
  if (status === 'DONE') return 'Done'
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
  const deadlineSummary = completed ? EMPTY_PROJECT_DEADLINE_SUMMARY : projectDeadlineSummary(context.project, today)
  const activeSystemLinks = activeSystemLinksForProject(context.project.id, context.projectSystems)
  const linkedSystems = linkedSystemsForProject(context.project, context.systems, activeSystemLinks)
  const linkedTenants = linkedTenantsForProject(context.project, linkedSystems, context.projectTenants, context.tenants)
  const taskCounts = projectTaskCounts(context.project)
  const deliveryDateStatus = projectDeliveryDateStatus(context.project, completed, today)
  const missingSystems = activeSystemLinks.length === 0
  const missingTenants = linkedTenants.length === 0
  const coverageSummary = context.requirementCoverageSummary ?? EMPTY_REQUIREMENT_COVERAGE_SUMMARY
  const healthAlerts = [
    deliveryDateStatus === 'OVERDUE' ? 'Delivery date overdue' : null,
    deliveryDateStatus === 'UPCOMING_RISK' ? 'Delivery date approaching' : null,
    deadlineSummary.overdueTaskCount > 0 ? `${deadlineSummary.overdueTaskCount} overdue task deadline${deadlineSummary.overdueTaskCount === 1 ? '' : 's'}` : null,
    deadlineSummary.overdueMilestoneCount > 0 ? `${deadlineSummary.overdueMilestoneCount} overdue milestone deadline${deadlineSummary.overdueMilestoneCount === 1 ? '' : 's'}` : null,
    deadlineSummary.deadlineRiskStatus === 'WARNING' && deadlineSummary.upcomingTaskDeadlineCount > 0 ? `${deadlineSummary.upcomingTaskDeadlineCount} upcoming task deadline${deadlineSummary.upcomingTaskDeadlineCount === 1 ? '' : 's'}` : null,
    deadlineSummary.deadlineRiskStatus === 'WARNING' && deadlineSummary.upcomingMilestoneDeadlineCount > 0 ? `${deadlineSummary.upcomingMilestoneDeadlineCount} upcoming milestone deadline${deadlineSummary.upcomingMilestoneDeadlineCount === 1 ? '' : 's'}` : null,
    missingSystems ? 'Missing system allocation' : null,
    missingTenants ? 'Missing tenant allocation' : null,
    coverageSummary.uncovered > 0 ? `${coverageSummary.uncovered} uncovered requirement${coverageSummary.uncovered === 1 ? '' : 's'}` : null,
    coverageSummary.partiallyCovered > 0 ? `${coverageSummary.partiallyCovered} partially covered requirement${coverageSummary.partiallyCovered === 1 ? '' : 's'}` : null,
    coverageSummary.missingSystem > 0 ? `${coverageSummary.missingSystem} requirement${coverageSummary.missingSystem === 1 ? '' : 's'} missing System coverage` : null,
    coverageSummary.missingTenant > 0 ? `${coverageSummary.missingTenant} requirement${coverageSummary.missingTenant === 1 ? '' : 's'} missing Tenant coverage` : null,
    coverageSummary.unknown > 0 ? `${coverageSummary.unknown} requirement coverage item${coverageSummary.unknown === 1 ? '' : 's'} need review` : null,
  ].filter((alert): alert is string => Boolean(alert))

  const healthStatus: ProjectHealthStatus = completed
    ? 'COMPLETED'
    : deliveryDateStatus === 'OVERDUE' || deadlineSummary.deadlineRiskStatus === 'OVERDUE'
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
    overdueTaskCount: deadlineSummary.overdueTaskCount,
    overdueMilestoneCount: deadlineSummary.overdueMilestoneCount,
    upcomingTaskDeadlineCount: deadlineSummary.upcomingTaskDeadlineCount,
    upcomingMilestoneDeadlineCount: deadlineSummary.upcomingMilestoneDeadlineCount,
    nextDeadline: deadlineSummary.nextDeadline,
    deadlineRiskStatus: deadlineSummary.deadlineRiskStatus,
    deadlineRiskLabel: deadlineSummary.deadlineRiskLabel,
    uncoveredRequirementCount: coverageSummary.uncovered,
    partiallyCoveredRequirementCount: coverageSummary.partiallyCovered,
    missingRequirementSystemCount: coverageSummary.missingSystem,
    missingRequirementTenantCount: coverageSummary.missingTenant,
    unknownRequirementCoverageCount: coverageSummary.unknown,
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

export function projectWorkspaceSystemSummary(context: ProjectSystemsTenantsContext): ProjectWorkspaceSystemSummary {
  const activeSystemLinks = activeSystemLinksForProject(context.project.id, context.projectSystems)
  const linkedSystems = linkedSystemsForProject(context.project, context.systems, activeSystemLinks)

  return {
    linkedSystems: linkedSystems.length,
    productionSystems: linkedSystems.filter((system) => system.source === 'Production').length,
    reusedInternalSystems: linkedSystems.filter((system) => system.source === 'Reused Internal Systems').length,
    missingSystemAllocation: activeSystemLinks.length === 0,
  }
}

export function projectWorkspaceTenantSummary(context: ProjectSystemsTenantsContext): ProjectWorkspaceTenantSummary {
  const activeSystemLinks = activeSystemLinksForProject(context.project.id, context.projectSystems)
  const linkedSystems = linkedSystemsForProject(context.project, context.systems, activeSystemLinks)
  const linkedTenants = linkedTenantsForProject(context.project, linkedSystems, context.projectTenants, context.tenants)

  return {
    linkedTenants: linkedTenants.length,
    customerTenants: linkedTenants.filter((tenant) => tenant.tenantType === 'CUSTOMER').length,
    pocTenants: linkedTenants.filter((tenant) => tenant.tenantType === 'POC').length,
    missingTenantCreation: linkedTenants.length === 0,
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
      return project.pocStartDate ?? context.linkedOpportunity?.pocStartDate ?? ''
    case 'pocEndDate':
      return project.pocEndDate ?? context.linkedOpportunity?.pocEndDate ?? ''
    case 'financialProfile':
      return context.linkedOpportunity?.financialProfile ?? projectFinancialProfile(project, context.linkedOpportunity)
    case 'warrantyServiceMonths':
      return textValue(context.linkedOpportunity?.warrantyServiceMonths)
    case 'currentMilestone':
      return deriveProjectProgress(project).currentMilestone
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
  if (key === 'warrantyServiceMonths' || key === 'currentMilestone' || key === 'projectAlerts') {
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

function referencedTenantIdsForOpportunity(opportunity: Opportunity | undefined): Set<string> {
  return new Set([
    ...(opportunity?.changeRequestRequirements ?? []).map((requirement) => requirement.tenantId),
    ...(opportunity?.standardRenewalRequirements ?? []).map((requirement) => requirement.tenantId),
  ].filter(Boolean))
}

function referencedSystemIdsForOpportunity(opportunity: Opportunity | undefined): Set<string> {
  return new Set([
    ...(opportunity?.changeRequestRequirements ?? []).map((requirement) => requirement.systemId),
    ...(opportunity?.standardRenewalRequirements ?? []).map((requirement) => requirement.systemId),
  ].filter(Boolean))
}

export function linkedSystemsForProject(
  project: Project | undefined,
  systems: System[],
  activeSystemLinks: ProjectSystemLink[],
  opportunity?: Opportunity,
  tenants: Tenant[] = [],
): System[] {
  if (!project) return []
  const linkedSystemIds = new Set(activeSystemLinks.map((link) => link.systemId))
  referencedSystemIdsForOpportunity(opportunity).forEach((systemId) => linkedSystemIds.add(systemId))
  const referencedTenantIds = referencedTenantIdsForOpportunity(opportunity)
  tenants.forEach((tenant) => {
    if (!referencedTenantIds.has(tenant.id)) return
    const systemId = tenant.hostedSystemId || tenant.systemId
    if (systemId) linkedSystemIds.add(systemId)
  })
  return systems.filter((system) => linkedSystemIds.has(system.id))
}

export function linkedTenantsForProject(
  project: Project | undefined,
  linkedSystems: System[],
  projectTenants: ProjectTenantLink[],
  tenants: Tenant[],
  opportunity?: Opportunity,
): Tenant[] {
  if (!project) return []
  const linkedTenantIds = new Set(
    activeProjectTenantLinks(projectTenants)
      .filter((link) => link.projectId === project.id)
      .map((link) => link.tenantId),
  )
  referencedTenantIdsForOpportunity(opportunity).forEach((tenantId) => linkedTenantIds.add(tenantId))
  linkedSystems.forEach((system) => {
    tenants.filter((tenant) => tenant.systemId === system.id).forEach((tenant) => linkedTenantIds.add(tenant.id))
  })
  return tenants.filter((tenant) => linkedTenantIds.has(tenant.id))
}

export function activeSystemLinkMapBySystemId(activeSystemLinks: ProjectSystemLink[]): Map<string, ProjectSystemLink> {
  return new Map(activeSystemLinks.map((link) => [link.systemId, link]))
}
