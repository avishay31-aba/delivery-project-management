import { PROJECT_NAME_REQUIRED_MESSAGE } from './metadata'
import type { Project } from './types'

export function validateProjectHeader(project: Project): string[] {
  return project.opportunityName.trim() ? [] : [PROJECT_NAME_REQUIRED_MESSAGE]
}

export function validateProjectSave(project: Project): string[] {
  return validateProjectHeader(project)
}
