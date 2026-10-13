import { PROJECT_NAME_REQUIRED_MESSAGE } from './metadata'
import type { Project } from './types'
import type { ProjectLifecycleContext } from './types'
import { projectHasLocationValidationSource, projectTimeZoneResolution } from './service'
import { activeProjectSystemLinks } from '@/domain/allocation-context'

function hasActiveReusedInternalAllocation(project: Project, context: ProjectLifecycleContext): boolean {
  const activeLinks = activeProjectSystemLinks(context.projectSystems ?? []).filter((link) => link.projectId === project.id)
  if (activeLinks.some((link) => link.allocationType === 'REUSED_INTERNAL' || Boolean(link.sourceMachineId))) return true
  const systemById = new Map((context.systems ?? []).map((system) => [system.id, system]))
  return activeLinks.some((link) => systemById.get(link.systemId)?.source === 'Reused Internal Systems')
}

function validatePocProjectDates(project: Project, context: ProjectLifecycleContext): string[] {
  if (project.mainType !== 'POC') return []
  const messages: string[] = []
  if (project.pocStartDate && project.pocEndDate && project.pocEndDate < project.pocStartDate) {
    messages.push('POC End Date cannot be earlier than POC Start Date.')
  }
  if (project.progressStatus !== 'OPEN' || !hasActiveReusedInternalAllocation(project, context)) return messages
  if (!project.pocStartDate) messages.push(`Project ${project.pid} must have a POC Start Date while it has an active Reused Internal System allocation.`)
  if (!project.pocEndDate) messages.push(`Project ${project.pid} must have a POC End Date while it has an active Reused Internal System allocation.`)
  return messages
}

export function validateProjectHeader(project: Project): string[] {
  return project.opportunityName.trim() ? [] : [PROJECT_NAME_REQUIRED_MESSAGE]
}

export function validateProjectSave(project: Project, context: ProjectLifecycleContext = {}): string[] {
  const messages = validateProjectHeader(project)
  messages.push(...validatePocProjectDates(project, context))
  if (projectHasLocationValidationSource(project, context)) {
    const timeZoneResolution = projectTimeZoneResolution(project, context)
    if (timeZoneResolution.status !== 'RESOLVED') messages.push(timeZoneResolution.message)
  }
  return messages
}

export function projectTimeZoneValidationFieldKeys(project: Project, context: ProjectLifecycleContext = {}): Array<'country' | 'state'> {
  if (!projectHasLocationValidationSource(project, context)) return []
  const timeZoneResolution = projectTimeZoneResolution(project, context)
  if (timeZoneResolution.status === 'RESOLVED') return []
  if (timeZoneResolution.status === 'STATE_REQUIRED') return ['state']
  return timeZoneResolution.state ? ['country', 'state'] : ['country']
}
