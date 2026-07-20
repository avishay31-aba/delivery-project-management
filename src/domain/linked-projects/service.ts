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
  operationalRelationshipAt: string | null
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

function relationshipDateSortValue(value: string | null): number {
  if (!value) return Number.POSITIVE_INFINITY
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY
}

function toLinkedProjectRows(
  projects: Project[],
  relationshipDatesByProjectId: Map<string, string | null>,
  context: Pick<LinkedProjectContext, 'opportunities' | 'accounts'>,
): LinkedProjectRow[] {
  return [...projects].sort((first, second) => {
    const firstDate = relationshipDatesByProjectId.get(first.id) ?? null
    const secondDate = relationshipDatesByProjectId.get(second.id) ?? null
    const firstSortValue = relationshipDateSortValue(firstDate)
    const secondSortValue = relationshipDateSortValue(secondDate)
    if (firstSortValue !== secondSortValue) return firstSortValue - secondSortValue
    return 0
  }).map((project) => ({
    id: project.id,
    project,
    pid: project.pid,
    projectName: project.opportunityName,
    progressStatus: project.progressStatus,
    projectType: project.mainType,
    projectSubType: project.subType,
    accountName: projectAccountName(project, context),
    operationalRelationshipAt: relationshipDatesByProjectId.get(project.id) ?? null,
  }))
}

function setEarliestRelationshipDate(relationshipDatesByProjectId: Map<string, string | null>, projectId: string, relationshipDate: string | null | undefined): void {
  const nextDate = relationshipDate ?? null
  const currentDate = relationshipDatesByProjectId.get(projectId)
  if (currentDate === undefined) {
    relationshipDatesByProjectId.set(projectId, nextDate)
    return
  }
  if (!nextDate) return
  if (!currentDate || relationshipDateSortValue(nextDate) < relationshipDateSortValue(currentDate)) {
    relationshipDatesByProjectId.set(projectId, nextDate)
  }
}

export function linkedProjectRowsForTenant(tenant: Tenant, context: LinkedProjectContext & { systems: System[] }): LinkedProjectRow[] {
  const relationshipDatesByProjectId = new Map<string, string | null>()
  activeProjectTenantLinks(context.projectTenants)
    .filter((link) => link.tenantId === tenant.id)
    .forEach((link) => setEarliestRelationshipDate(relationshipDatesByProjectId, link.projectId, link.allocatedAt))
  activeProjectSystemLinks(context.projectSystems)
    .filter((link) => (link.tenantIds ?? []).includes(tenant.id))
    .forEach((link) => setEarliestRelationshipDate(relationshipDatesByProjectId, link.projectId, link.allocatedAt))

  const relatedProjects = tenantRelatedProjects(
    tenant,
    context.projects,
    activeProjectTenantLinks(context.projectTenants),
    context.systems,
    activeProjectSystemLinks(context.projectSystems),
    context.opportunities,
  )
  relatedProjects.forEach((project) => {
    if (!relationshipDatesByProjectId.has(project.id)) relationshipDatesByProjectId.set(project.id, null)
  })

  return toLinkedProjectRows(
    relatedProjects,
    relationshipDatesByProjectId,
    context,
  )
}

export function linkedProjectRowsForSystem(system: SystemInventoryRecord, context: LinkedProjectContext): LinkedProjectRow[] {
  const relationshipDatesByProjectId = new Map<string, string | null>()
  activeProjectSystemLinks(context.projectSystems)
    .filter((link) => link.systemId === system.id)
    .forEach((link) => setEarliestRelationshipDate(relationshipDatesByProjectId, link.projectId, link.allocatedAt))
  linkedProjectIdsForSystem(system, activeProjectSystemLinks(context.projectSystems))
    .forEach((projectId) => {
      if (!relationshipDatesByProjectId.has(projectId)) relationshipDatesByProjectId.set(projectId, null)
    })
  const projectIds = new Set(relationshipDatesByProjectId.keys())
  return toLinkedProjectRows(
    context.projects.filter((project) => projectIds.has(project.id)),
    relationshipDatesByProjectId,
    context,
  )
}
