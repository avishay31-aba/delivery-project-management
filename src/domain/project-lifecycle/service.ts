import { deriveProjectProgress } from '@/domain/milestone-plan'
import type { Project } from './types'

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
