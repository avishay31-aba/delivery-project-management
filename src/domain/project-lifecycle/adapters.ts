import type { Project } from './types'

export function cloneProjectDraft(project: Project): Project {
  return JSON.parse(JSON.stringify(project)) as Project
}
