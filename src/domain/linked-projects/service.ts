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
  createdAt: string
}

interface LinkedProjectContext {
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  opportunities: Opportunity[]
  accounts: Account[]
}

function isClosedProject(project: Project): boolean {
  return project.progressStatus === 'DONE' || Boolean(project.archivedAt || project.canceledAt)
}

function newestProjectFirst(first: Project, second: Project): number {
  const firstTime = Date.parse(first.createdAt)
  const secondTime = Date.parse(second.createdAt)
  if (Number.isFinite(firstTime) && Number.isFinite(secondTime) && firstTime !== secondTime) {
    return secondTime - firstTime
  }
  return second.pid.localeCompare(first.pid)
}

function orderLinkedProjects(projects: Project[]): Project[] {
  return [...projects].sort((first, second) => {
    const firstClosed = isClosedProject(first)
    const secondClosed = isClosedProject(second)
    if (firstClosed !== secondClosed) return firstClosed ? 1 : -1
    return newestProjectFirst(first, second)
  })
}

function projectAccountName(project: Project, context: Pick<LinkedProjectContext, 'opportunities' | 'accounts'>): string {
  if (project.accountName) return project.accountName
  const opportunity = context.opportunities.find(
    (candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId,
  )
  const account = opportunity ? context.accounts.find((candidate) => candidate.id === opportunity.accountId) : undefined
  return account?.accountName ?? ''
}

function toLinkedProjectRows(projects: Project[], context: Pick<LinkedProjectContext, 'opportunities' | 'accounts'>): LinkedProjectRow[] {
  return orderLinkedProjects(projects).map((project) => ({
    id: project.id,
    project,
    pid: project.pid,
    projectName: project.opportunityName,
    progressStatus: project.progressStatus,
    projectType: project.mainType,
    projectSubType: project.subType,
    accountName: projectAccountName(project, context),
    createdAt: project.createdAt,
  }))
}

export function linkedProjectRowsForTenant(tenant: Tenant, context: LinkedProjectContext & { systems: System[] }): LinkedProjectRow[] {
  return toLinkedProjectRows(
    tenantRelatedProjects(
      tenant,
      context.projects,
      activeProjectTenantLinks(context.projectTenants),
      context.systems,
      activeProjectSystemLinks(context.projectSystems),
      context.opportunities,
    ),
    context,
  )
}

export function linkedProjectRowsForSystem(system: SystemInventoryRecord, context: LinkedProjectContext): LinkedProjectRow[] {
  const projectIds = new Set(linkedProjectIdsForSystem(system, activeProjectSystemLinks(context.projectSystems)))
  return toLinkedProjectRows(
    context.projects.filter((project) => projectIds.has(project.id)),
    context,
  )
}
