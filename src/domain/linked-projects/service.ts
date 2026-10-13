import type { Account, Opportunity, Project, ProjectSystemLink, ProjectTenantLink, System, Tenant } from '@/data/seed.types'
import { activeProjectTenantLinks } from '@/domain/allocation-context'
import { formattedReusedInternalMachineId, isAllocatedSystem, linkedProjectIdsForSystem, reusedInternalMachineIdsEqual, systemIdentity, type SystemInventoryRecord } from '@/domain/system-inventory'
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
  allocatedSystems: System[]
}

interface LinkedProjectContext {
  projects: Project[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  systems: System[]
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
  context: Pick<LinkedProjectContext, 'opportunities' | 'accounts'> & { allocatedSystemsByProjectId?: Map<string, System[]> },
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
    allocatedSystems: context.allocatedSystemsByProjectId?.get(project.id) ?? [],
  }))
}

export function linkedProjectRowsForTenant(tenant: Tenant, context: LinkedProjectContext & { systems: System[] }): LinkedProjectRow[] {
  const relatedProjects = tenantRelatedProjects(
    tenant,
    context.projects,
    activeProjectTenantLinks(context.projectTenants),
    context.systems,
    context.projectSystems,
    context.opportunities,
  )
  return toLinkedProjectRows(
    relatedProjects,
    context,
  )
}

export function linkedProjectRowsForSystem(system: SystemInventoryRecord, context: LinkedProjectContext): LinkedProjectRow[] {
  const projectIds = new Set<string>()
  const linkBelongsToSystem = (link: ProjectSystemLink): boolean => {
    if (link.systemId === system.id) return true
    if (isAllocatedSystem(system)) return false
    if (!('machineId' in system) || !system.machineId) return false
    if (reusedInternalMachineIdsEqual(link.sourceMachineId, system.machineId)) return true
    const allocatedSystem = context.systems.find((candidate) => candidate.id === link.systemId)
    return Boolean(allocatedSystem && reusedInternalMachineIdsEqual(allocatedSystem.machineId, system.machineId))
  }
  linkedProjectIdsForSystem(system, context.projectSystems)
    .forEach((projectId) => projectIds.add(projectId))
  context.projectSystems
    .filter(linkBelongsToSystem)
    .forEach((link) => projectIds.add(link.projectId))
  const allocatedSystemsByProjectId = new Map<string, System[]>()
  context.projectSystems.forEach((link) => {
    if (!projectIds.has(link.projectId)) return
    const allocatedSystem = context.systems.find((candidate) => candidate.id === link.systemId)
    if (!allocatedSystem) return
    if (isAllocatedSystem(system) && allocatedSystem.id !== system.id) return
    if (!isAllocatedSystem(system) && 'machineId' in system && system.machineId && !reusedInternalMachineIdsEqual(allocatedSystem.machineId, system.machineId)) return
    allocatedSystemsByProjectId.set(link.projectId, [...(allocatedSystemsByProjectId.get(link.projectId) ?? []), allocatedSystem])
  })
  return toLinkedProjectRows(
    context.projects.filter((project) => projectIds.has(project.id)),
    { ...context, allocatedSystemsByProjectId },
  )
}

export function linkedProjectAllocatedSystemLabel(system: System): string {
  const { sid, mid } = linkedProjectAllocatedSystemIds(system)
  return mid && sid !== mid ? `${sid} (${mid})` : sid
}

export function linkedProjectAllocatedSystemIds(system: System): { sid: string; mid: string } {
  return {
    sid: systemIdentity(system),
    mid: system.machineId ? formattedReusedInternalMachineId(system.machineId) : '',
  }
}
