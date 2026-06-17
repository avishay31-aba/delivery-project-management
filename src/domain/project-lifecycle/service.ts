import { deriveProjectProgress } from '@/domain/milestone-plan'
import type { ProjectHeaderFieldKey } from './metadata'
import type { Opportunity, Project, ProjectLifecycleContext } from './types'

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
