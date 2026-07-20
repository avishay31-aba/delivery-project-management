import type { Account, Opportunity, Project, ProjectSystemLink, ProjectTenantLink, System, Tenant } from '@/data/seed.types'
import { activeProjectSystemLinks, activeProjectTenantLinks } from '@/domain/allocation-context'
import { linkedProjectIdsForSystem, type SystemInventoryRecord } from '@/domain/system-inventory'
import { tenantRelatedProjects } from '@/domain/tenant-operations'

export interface LinkedProjectRow {
  id: string
  project: Project
  pid: string
  projectName: string
  progressStatus: string
  projectType: string
  projectSubType: string
  accountName: string
}

interface LinkedProjectContext {
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  opportunities: Opportunity[]
  accounts: Account[]
}

function projectAccountName(project: Project, context: Pick<LinkedProjectContext, 'opportunities' | 'accounts'>): string {
  if (project.accountName) return project.accountName
  const opportunity = context.opportunities.find(
    (candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId,
  )
  const account = opportunity ? context.accounts.find((candidate) => candidate.id === opportunity.accountId) : undefined
  return account?.accountName ?? ''
}

function compareProjectPid(first: Project, second: Project): number {
  return first.pid.localeCompare(second.pid, undefined, { numeric: true, sensitivity: 'base' })
}

function toLinkedProjectRows(
  projects: Project[],
  context: Pick<LinkedProjectContext, 'opportunities' | 'accounts'>,
): LinkedProjectRow[] {
  return [...projects].sort(compareProjectPid).map((project) => ({
    id: project.id,
    project,
    pid: project.pid,
    projectName: project.opportunityName,
    progressStatus: project.progressStatus,
    projectType: project.mainType,
    projectSubType: project.subType,
    accountName: projectAccountName(project, context),
  }))
}

export function linkedProjectRowsForTenant(tenant: Tenant, context: LinkedProjectContext & { systems: System[] }): LinkedProjectRow[] {
  const relatedProjects = tenantRelatedProjects(
    tenant,
    context.projects,
    activeProjectTenantLinks(context.projectTenants),
    context.systems,
    activeProjectSystemLinks(context.projectSystems),
    context.opportunities,
  )
  return toLinkedProjectRows(
    relatedProjects,
    context,
  )
}

export function linkedProjectRowsForSystem(system: SystemInventoryRecord, context: LinkedProjectContext): LinkedProjectRow[] {
  const projectIds = new Set<string>()
  linkedProjectIdsForSystem(system, activeProjectSystemLinks(context.projectSystems))
    .forEach((projectId) => projectIds.add(projectId))
  return toLinkedProjectRows(
    context.projects.filter((project) => projectIds.has(project.id)),
    context,
  )
}
