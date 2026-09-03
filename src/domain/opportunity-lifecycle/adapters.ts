import { ensureBusinessId, generateBusinessIdFromCounter } from '@/domain/business-identity'
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'
import { normalizeOpportunityEngagementCircles } from '@/domain/engagement-circle'
import { buildProjectMilestonesAndTasks, projectMilestonePlanMatchesTemplate, resolveProjectMilestoneTemplate } from '@/config/project-milestone-templates'
import {
  activePocProjectForOpportunity,
  finalProjectForOpportunity,
  projectSubTypeForOpportunity,
  uniqueOpportunityValues,
} from './service'
import type {
  Opportunity,
  OpportunityProjectSyncContext,
  OpportunityProjectSyncOptions,
  OpportunityProjectSyncResult,
  Project,
  ProjectLifecycleChange,
} from './types'

export function cloneOpportunityDraft(opportunity: Opportunity): Opportunity {
  const clone = JSON.parse(JSON.stringify(opportunity)) as Opportunity
  return {
    ...clone,
    warrantyRecordId: clone.warrantyRecordId ?? clone.standardRenewalRequirements[0]?.warrantyRecordId ?? '',
    pocProjectIds: clone.pocProjectIds ?? [],
    finalProjectId: clone.finalProjectId ?? null,
    wonAt: clone.wonAt ?? null,
  }
}

export function createOpportunityDraft(
  accounts: OpportunityProjectSyncContext['account'][],
  salesManagers: OpportunityProjectSyncContext['salesManager'][],
  now: string,
  type: Opportunity['type'] = 'DELIVERY',
  subType: Opportunity['subType'] = 'NEW',
): Opportunity {
  const defaultAccount = accounts[0]
  const defaultSalesManagerId = defaultAccount?.salesManagerId ?? salesManagers[0]?.id ?? ''
  return {
    id: `opp-${crypto.randomUUID()}`,
    opportunityId: '',
    opportunityName: '',
    stage: 'OPEN',
    accountId: defaultAccount?.id ?? '',
    salesManagerId: defaultSalesManagerId,
    type,
    subType,
    dealPackage: 'Silver',
    deliveryDate: null,
    pocStartDate: null,
    pocEndDate: null,
    warrantyServiceMonths: null,
    warrantyRecordId: '',
    region: defaultAccount?.region ?? '',
    country: defaultAccount?.country ?? '',
    state: defaultAccount?.state ?? '',
    timeZone: '',
    timeGroup: defaultAccount?.timeGroup ?? '',
    currentMilestone: 'Not started',
    projectAlerts: [],
    newTenantRequirements: [],
    changeRequestRequirements: [],
    standardRenewalRequirements: [],
    pocProjectIds: [],
    finalProjectId: null,
    wonAt: null,
    createdAt: now,
    updatedAt: now,
  }
}

export function syncOpportunityProjectsFromOpportunity(
  opportunity: Opportunity,
  savedOpportunity: Opportunity,
  context: OpportunityProjectSyncContext,
  options?: OpportunityProjectSyncOptions,
): OpportunityProjectSyncResult & Pick<OpportunityProjectSyncContext, 'idCounters' | 'projects'> {
  let idCounters = context.idCounters
  let projects = context.projects
  const projectChanges: ProjectLifecycleChange[] = []
  const nextOpportunity: Opportunity = {
    ...opportunity,
    pocProjectIds: [...(opportunity.pocProjectIds ?? [])],
    finalProjectId: opportunity.finalProjectId ?? null,
    wonAt:
      opportunity.stage === 'WON'
        ? savedOpportunity.stage === 'WON'
          ? savedOpportunity.wonAt ?? opportunity.wonAt ?? context.now
          : context.now
        : null,
    updatedAt: context.preserveOpportunityUpdatedAt ?? context.now,
  }

  const buildProjectPatch = (projectSource: Project['projectSource']) => ({
    opportunityId: nextOpportunity.opportunityId,
    projectSource,
    accountName: context.account?.accountName ?? '',
    mainType: projectSource === 'POC' ? 'POC' : nextOpportunity.type,
    subType: projectSource === 'POC' ? 'NONE' : projectSubTypeForOpportunity(nextOpportunity),
    deliveryDate: nextOpportunity.deliveryDate,
    dealOwner: context.salesManager?.name ?? '',
    opportunityName: nextOpportunity.opportunityName,
    canceledAt: null,
    updatedAt: context.now,
  })

  const updateProjectFromOpportunity = (existingProject: Project, projectSource: Project['projectSource']): Project => {
    const projectPatch = {
      ...existingProject,
      ...buildProjectPatch(projectSource),
      ...(projectSource === 'POC'
        ? {
            pocStartDate: existingProject.pocStartDate !== undefined ? existingProject.pocStartDate : nextOpportunity.pocStartDate,
            pocEndDate: existingProject.pocEndDate !== undefined ? existingProject.pocEndDate : nextOpportunity.pocEndDate,
          }
        : {}),
    }
    const resolution = resolveProjectMilestoneTemplate(projectPatch, nextOpportunity)
    const templateData = buildProjectMilestonesAndTasks(resolution.templateId)
    const project = existingProject.milestoneTemplateId === resolution.templateId && projectMilestonePlanMatchesTemplate(existingProject, resolution.templateId)
      ? projectPatch
      : {
          ...projectPatch,
          milestoneTemplateId: resolution.templateId,
          milestones: templateData.milestones,
          tasks: templateData.tasks,
        }
    projects = projects.map((candidate) => (candidate.id === existingProject.id ? project : candidate))
    projectChanges.push({ projectId: project.id, changeStatus: 'Updated' })
    return project
  }

  const createProjectFromOpportunity = (projectSource: Project['projectSource']): Project => {
    const nextProjectId = generateBusinessIdFromCounter(
      'project',
      idCounters,
      projects.map((project) => project.pid),
    )
    idCounters = nextProjectId.counters
    const projectPatch: Project = {
      id: `proj-${crypto.randomUUID()}`,
      pid: nextProjectId.id,
      ...buildProjectPatch(projectSource),
      ...(projectSource === 'POC'
        ? {
            pocStartDate: nextOpportunity.pocStartDate,
            pocEndDate: nextOpportunity.pocEndDate,
          }
        : {}),
      progressStatus: 'OPEN',
      documents: [],
      createdAt: context.now,
      updatedAt: context.now,
    }
    const resolution = resolveProjectMilestoneTemplate(projectPatch, nextOpportunity)
    const templateData = buildProjectMilestonesAndTasks(resolution.templateId)
    const project: Project = {
      ...projectPatch,
      milestoneTemplateId: resolution.templateId,
      milestones: templateData.milestones,
      tasks: templateData.tasks,
    }
    projects = [project, ...projects]
    projectChanges.push({ projectId: project.id, changeStatus: 'New' })
    return project
  }

  if (nextOpportunity.stage === 'POC') {
    const activePocProject = activePocProjectForOpportunity(nextOpportunity, savedOpportunity, projects)

    if (activePocProject && options?.pocAction === 'UPDATE_EXISTING_POC') {
      updateProjectFromOpportunity(activePocProject, 'POC')
    } else if (options?.pocAction === 'CREATE_NEW_POC') {
      const project = createProjectFromOpportunity('POC')
      nextOpportunity.pocProjectIds = uniqueOpportunityValues([...nextOpportunity.pocProjectIds, project.id])
    }
  }

  if (nextOpportunity.stage === 'WON' && nextOpportunity.type !== 'POC') {
    const finalProject = finalProjectForOpportunity(nextOpportunity, savedOpportunity, projects)

    if (!finalProject) {
      const project = createProjectFromOpportunity('FINAL')
      nextOpportunity.finalProjectId = project.id
    } else {
      nextOpportunity.finalProjectId = finalProject.id
      if (finalProject.progressStatus !== 'DONE' || options?.allowDoneFinalUpdate) {
        updateProjectFromOpportunity(finalProject, 'FINAL')
      }
    }
  }

  return { idCounters, projects, opportunity: nextOpportunity, projectChanges }
}

function linkedOpportunityProjectSource(project: Project): 'POC' | 'FINAL' {
  return project.projectSource === 'POC' ? 'POC' : 'FINAL'
}

export function normalizeOpportunityLifecycleOpportunity(
  opportunity: Opportunity,
  projects: Project[],
  existingOpportunityIds: Array<string | null | undefined> = [],
): Opportunity {
  const opportunityId = ensureBusinessId('opportunity', opportunity.opportunityId, existingOpportunityIds)
  const region = getBusinessRegionForCountry(opportunity.country, opportunity.state) || normalizeBusinessRegion(opportunity.region)
  const linkedProjects = projects.filter(
    (project) => project.opportunityId === opportunity.opportunityId || project.opportunityId === opportunityId,
  )
  const pocProjectIds = Array.from(
    new Set([
      ...(Array.isArray(opportunity.pocProjectIds) ? opportunity.pocProjectIds : []),
      ...linkedProjects
        .filter((project) => linkedOpportunityProjectSource(project) === 'POC')
        .map((project) => project.id),
    ]),
  )
  const finalProjectId =
    opportunity.finalProjectId ??
    linkedProjects.find((project) => linkedOpportunityProjectSource(project) === 'FINAL')?.id ??
    null

  return {
    ...opportunity,
    opportunityId,
    region,
    timeGroup: opportunity.timeGroup ?? '',
    stage: opportunity.stage === 'WON' ? 'WON' : opportunity.stage === 'POC' ? 'POC' : 'OPEN',
    engagementCircles: normalizeOpportunityEngagementCircles(opportunity),
    pocProjectIds,
    finalProjectId,
    wonAt: opportunity.wonAt ?? (opportunity.stage === 'WON' ? opportunity.updatedAt : null),
  }
}
