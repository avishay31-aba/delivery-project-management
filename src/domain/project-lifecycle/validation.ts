import { PROJECT_NAME_REQUIRED_MESSAGE } from './metadata'
import type { Project } from './types'
import type { ProjectLifecycleContext } from './types'
import { projectTimeZoneResolution } from './service'

export function validateProjectHeader(project: Project): string[] {
  return project.opportunityName.trim() ? [] : [PROJECT_NAME_REQUIRED_MESSAGE]
}

export function validateProjectSave(project: Project, context: ProjectLifecycleContext = {}): string[] {
  const messages = validateProjectHeader(project)
  const timeZoneResolution = projectTimeZoneResolution(project, context)
  if (timeZoneResolution.status !== 'RESOLVED') messages.push(timeZoneResolution.message)
  return messages
}

export function projectTimeZoneValidationFieldKeys(project: Project, context: ProjectLifecycleContext = {}): Array<'country' | 'state'> {
  const timeZoneResolution = projectTimeZoneResolution(project, context)
  if (timeZoneResolution.status === 'RESOLVED') return []
  if (timeZoneResolution.status === 'STATE_REQUIRED') return ['state']
  return timeZoneResolution.state ? ['country', 'state'] : ['country']
}
