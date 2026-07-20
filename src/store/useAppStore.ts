import { create } from 'zustand'
import type {
  AllocationType,
  AppDataState,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
} from '@/data/seed.types'
import { incrementCounter } from '@/data/id-generator'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { generateBusinessIdFromCounter, reserveBusinessId } from '@/domain/business-identity'
import {
  createActivityEvent,
  type ActivityObjectRefInput,
  type ActivityEventInput,
  type ActivityEvent,
} from '@/domain/activity-log'
import {
  accountReference,
  activityObjectRefFromBusinessReference,
  projectReference,
  systemBusinessId,
  systemReference,
  tenantReference,
} from '@/domain/business-reference'
import {
  createInitialState,
  loadPersistedState,
  persistState,
  clearPersistedState,
} from '@/store/persistence'
import {
  publishCommittedStateChange,
  subscribeToCommittedStateChanges,
} from '@/store/crossTabSync'
import {
  createProjectSystemLink,
  createProjectTenantLink,
  deallocateProjectSystemLink,
  deallocateProjectTenantLink,
  unlinkProjectFromSystem,
  validateExistingSystemLink,
  validateProductionAllocation,
  validateProjectSystemDeallocation,
  validateReusedInternalAllocation,
  type AllocationActionResult,
} from '@/domain/allocation-context'
import {
  createProductionInventorySystem,
  createReusedInternalInventorySystem,
  createStandaloneSystem,
  createSystemConfigurationHistoryRecord,
  occupyReusedInternalSystem,
  purposeHistoryContextFromProject,
  releaseReusedInternalSystem,
  systemApplicationConfigurationSummary,
  systemFromProductionInventoryAllocation,
  systemFromReusedInternalAllocation,
  updateReusedInternalPurpose,
} from '@/domain/system-inventory'
import {
  syncOpportunityProjectsFromOpportunity,
  type OpportunityProjectSyncOptions,
  type OpportunityProjectSyncResult,
  type ProjectLifecycleChange,
} from '@/domain/opportunity-lifecycle'
import { applyProjectLifecycleStatus, createStandaloneProject, projectHeaderFieldValue, projectTimeZoneResolution } from '@/domain/project-lifecycle'
import { applyGeographicTimeZone } from '@/domain/geographic-time-zone'
import {
  deletedTenantHostedSystemHistory,
  endedTenantHostedSystemHistory,
  movedTenantHostedSystemHistory,
  resolveTenantCreationSource,
  systemForTenant,
  TENANT_OPERATIONAL_STATUS_CANCELLED,
  TENANT_OPERATIONAL_STATUS_DELETED,
  tenantIsActivelyHostedBySystem,
  tenantCreationDraftFromSource,
  tenantConfigurationSaveDraft,
  validateTenantMoveDestination,
} from '@/domain/tenant-operations'

type ActivityEventDraft = Omit<ActivityEventInput, 'id' | 'occurredAt'>
type SaveTimestampOptions = { preserveNewState?: boolean }
let unsubscribeCommittedStateChanges: (() => void) | null = null

function appendActivityEvent(
  events: ActivityEvent[],
  now: string,
  draft: ActivityEventDraft,
): ActivityEvent[] {
  const eventId = reserveBusinessId('activity', events.map((event) => event.id))
  return [
    createActivityEvent({
      ...draft,
      id: eventId,
      occurredAt: now,
    }),
    ...events,
  ]
}

function projectRef(project: AppDataState['projects'][number]): ActivityObjectRefInput {
  return activityObjectRefFromBusinessReference(projectReference(project))
}

function tenantRef(tenant: AppDataState['tenants'][number]): ActivityObjectRefInput {
  return activityObjectRefFromBusinessReference(tenantReference(tenant))
}

function systemRef(system: AppDataState['systems'][number] | AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number]): ActivityObjectRefInput {
  return activityObjectRefFromBusinessReference(systemReference(system))
}

function allocationRef(allocation: AppDataState['projectSystems'][number]): ActivityObjectRefInput {
  return {
    objectType: 'ALLOCATION',
    id: allocation.id,
    businessId: allocation.id,
    displayLabel: allocation.id,
  }
}

function customerRef(account: AppDataState['accounts'][number] | undefined): ActivityObjectRefInput | null {
  if (!account) return null
  return activityObjectRefFromBusinessReference(accountReference(account))
}

function requirementRef(requirementId: string): ActivityObjectRefInput {
  return {
    objectType: 'REQUIREMENT',
    id: requirementId,
    businessId: requirementId,
    displayLabel: requirementId,
  }
}

function relatedRefs(...refs: Array<ActivityObjectRefInput | null | undefined>): ActivityObjectRefInput[] {
  return refs.filter((ref): ref is ActivityObjectRefInput => Boolean(ref))
}

function removeTenantsFromSystemTransaction(
  state: AppDataState,
  tenantIds: string[],
  now: string,
  reason: 'Deleted' | 'Cancelled' = 'Deleted',
): Pick<AppDataState, 'tenants' | 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  const tenantIdSet = new Set(tenantIds)
  const tenantsToRemove = state.tenants.filter((tenant) => tenantIdSet.has(tenant.id))
  if (tenantsToRemove.length === 0) {
    return {
      tenants: state.tenants,
      systems: state.systems,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      activityEvents: state.activityEvents,
    }
  }

  const systemIdsByTenantId = new Map(
    tenantsToRemove.map((tenant) => [
      tenant.id,
      [tenant.systemId, tenant.hostedSystemId].filter(Boolean),
    ]),
  )
  const removedSystemIds = new Set(Array.from(systemIdsByTenantId.values()).flat())
  let activityEvents = state.activityEvents

  tenantsToRemove.forEach((tenant) => {
    const system = state.systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId)
    const relatedProjects = state.projectTenants
      .filter((link) => link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED')
      .map((link) => state.projects.find((project) => project.id === link.projectId))
      .filter((project): project is AppDataState['projects'][number] => Boolean(project))

    activityEvents = appendActivityEvent(activityEvents, now, {
      category: 'TENANT',
      eventType: 'tenant.deletedFromSystem',
      severity: 'WARNING',
      summary: reason === 'Cancelled'
        ? `Tenant ${tenant.tid} cancelled and removed from active hosting.`
        : `Tenant ${tenant.tid} commercially deleted and removed from active hosting.`,
      primaryObject: tenantRef(tenant),
      relatedObjects: relatedRefs(system ? systemRef(system) : null, ...relatedProjects.map(projectRef)),
      before: {
        operationalStatus: tenant.operationalStatus,
        hostedSystemId: tenant.hostedSystemId || tenant.systemId,
      },
      after: {
        operationalStatus: reason,
        hostedSystemId: '',
      },
    })
  })

  return {
    tenants: state.tenants.map((tenant) => {
      if (!tenantIdSet.has(tenant.id)) return tenant
      return {
        ...tenant,
        systemId: '',
        hostedSystemId: '',
        hostingSid: '',
        operationalStatus: reason === 'Cancelled' ? TENANT_OPERATIONAL_STATUS_CANCELLED : TENANT_OPERATIONAL_STATUS_DELETED,
        hostedSystemHistory: reason === 'Cancelled'
          ? endedTenantHostedSystemHistory(tenant, now, 'Cancelled')
          : deletedTenantHostedSystemHistory(tenant, now),
        updatedAt: now,
      }
    }),
    systems: state.systems.map((system) =>
      removedSystemIds.has(system.id)
        ? {
            ...system,
            tenantIds: (system.tenantIds ?? []).filter((tenantId) => !tenantIdSet.has(tenantId)),
            updatedAt: now,
          }
        : system,
    ),
    projectSystems: state.projectSystems.map((link) =>
      removedSystemIds.has(link.systemId)
        ? { ...link, tenantIds: (link.tenantIds ?? []).filter((tenantId) => !tenantIdSet.has(tenantId)) }
        : link,
    ),
    projectTenants: reason === 'Cancelled'
      ? state.projectTenants.map((link) =>
          tenantIdSet.has(link.tenantId) && link.allocationStatus !== 'DEALLOCATED'
            ? deallocateProjectTenantLink(link, now)
            : link,
        )
      : state.projectTenants,
    activityEvents,
  }
}

function projectAssignmentLocation(state: AppDataState, project: AppDataState['projects'][number]) {
  const linkedOpportunity = state.opportunities.find((opportunity) => opportunity.id === project.opportunityId)
  const account = state.accounts.find((candidate) => candidate.accountName === project.accountName)
  const context = { linkedOpportunity, account }
  return {
    region: projectHeaderFieldValue(project, 'region', context),
    timeZone: projectHeaderFieldValue(project, 'timeZone', context),
    timeGroup: projectHeaderFieldValue(project, 'timeGroup', context),
  }
}

function projectWithDerivedTimeZone(state: AppDataState, project: AppDataState['projects'][number]) {
  const location = projectAssignmentLocation(state, project)
  return {
    ...project,
    timeZone: location.timeZone,
  }
}

function appendUniqueSemicolonValue(current: string | null | undefined, value: string | null | undefined): string {
  const nextValue = String(value ?? '').trim()
  const values = String(current ?? '')
    .split(';')
    .map((candidate) => candidate.trim())
    .filter(Boolean)
  if (nextValue && !values.includes(nextValue)) values.push(nextValue)
  return values.join('; ')
}

function existingTenantIdsForOpportunityFinalProject(opportunity: Opportunity): string[] {
  return Array.from(new Set([
    ...(opportunity.changeRequestRequirements ?? []).map((requirement) => requirement.tenantId),
    ...(opportunity.standardRenewalRequirements ?? []).map((requirement) => requirement.tenantId),
  ].filter(Boolean)))
}

function relationshipAllocationTypeForSystem(system: AppDataState['systems'][number]): AllocationType {
  return system.source === 'Reused Internal Systems' ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM'
}

function validateProjectTenantHostingRelationshipSync(
  state: AppDataState,
  tenantIds: string[],
): string[] {
  return tenantIds.flatMap((tenantId) => {
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    if (!tenant) return [`Selected Tenant ${tenantId} was not found.`]
    const hostingSystem = systemForTenant(tenant, state.systems)
    if (!hostingSystem) {
      return [`Tenant ${tenant.tid} cannot be linked because it has no valid hosting System.`]
    }
    return []
  })
}

function originatingProjectForTenant(
  state: Pick<AppDataState, 'opportunities' | 'projects'>,
  tenant: AppDataState['tenants'][number],
): AppDataState['projects'][number] | undefined {
  const projectByPid = tenant.deliveryPid
    ? state.projects.find((project) => project.pid === tenant.deliveryPid)
    : undefined
  if (projectByPid) return projectByPid

  const sourceRequirementId = String(tenant.sourceRequirementId ?? '').trim()
  if (!sourceRequirementId) return undefined

  const opportunity = state.opportunities.find((candidate) =>
    candidate.stage === 'WON' &&
    Boolean(candidate.finalProjectId) &&
    (candidate.newTenantRequirements ?? []).some(
      (requirement) => requirement.requirementId === sourceRequirementId || requirement.id === sourceRequirementId,
    ),
  )
  return opportunity?.finalProjectId
    ? state.projects.find((project) => project.id === opportunity.finalProjectId)
    : undefined
}

function ensureProjectTenantHostingRelationships(
  state: AppDataState,
  project: AppDataState['projects'][number],
  tenantIds: string[],
  now: string,
  source: 'opportunityWon' | 'tenantSave' = 'opportunityWon',
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  let systems = state.systems
  let projectSystems = state.projectSystems
  let projectTenants = state.projectTenants
  let activityEvents = state.activityEvents
  const sourceLabel = source === 'opportunityWon' ? 'Opportunity Won' : 'Tenant Save'

  tenantIds.forEach((tenantId) => {
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    if (!tenant) return
    const hostingSystem = systemForTenant(tenant, systems)
    const allocationType = hostingSystem
      ? relationshipAllocationTypeForSystem(hostingSystem)
      : 'EXISTING_SYSTEM'

    const activeTenantLink = projectTenants.find(
      (link) =>
        link.projectId === project.id &&
        link.tenantId === tenant.id &&
        link.allocationStatus !== 'DEALLOCATED',
    )
    if (!activeTenantLink) {
      const projectTenant = createProjectTenantLink(project.id, tenant.id, hostingSystem?.id ?? '', allocationType, now)
      projectTenants = [projectTenant, ...projectTenants]
      activityEvents = appendActivityEvent(activityEvents, now, {
        category: 'TENANT',
        eventType: source === 'opportunityWon'
          ? 'project.tenantLinkedFromOpportunityWon'
          : 'project.tenantLinkedFromTenantSave',
        severity: 'SUCCESS',
        summary: `Tenant ${tenant.tid} linked to project ${project.pid} from ${sourceLabel}.`,
        primaryObject: projectRef(project),
        relatedObjects: relatedRefs(tenantRef(tenant), hostingSystem ? systemRef(hostingSystem) : null),
      })
    }

    if (!hostingSystem) return

    const activeSystemLink = projectSystems.find(
      (link) =>
        link.projectId === project.id &&
        link.systemId === hostingSystem.id &&
        link.allocationStatus !== 'DEALLOCATED',
    )
    const committedAllocationType = activeSystemLink?.allocationType ?? allocationType
    if (activeSystemLink) {
      projectSystems = projectSystems.map((link) =>
        link.id === activeSystemLink.id
          ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])) }
          : link,
      )
    } else {
      const allocation = createProjectSystemLink(project.id, hostingSystem.id, committedAllocationType, now, {
        tenantIds: [tenant.id],
        sourceMachineId: committedAllocationType === 'REUSED_INTERNAL' ? hostingSystem.machineId : null,
      })
      projectSystems = [allocation, ...projectSystems]
      activityEvents = appendActivityEvent(activityEvents, now, {
        category: 'ALLOCATION',
        eventType: source === 'opportunityWon'
          ? 'allocation.hostingSystemLinkedFromOpportunityWon'
          : 'allocation.hostingSystemLinkedFromTenantSave',
        severity: 'SUCCESS',
        summary: `Hosting system ${systemBusinessId(hostingSystem)} linked to project ${project.pid} from ${sourceLabel}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(projectRef(project), systemRef(hostingSystem), tenantRef(tenant)),
      })
    }

    projectTenants = projectTenants.map((link) =>
      link.projectId === project.id && link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED'
        ? { ...link, systemId: hostingSystem.id, allocationType: committedAllocationType }
        : link,
    )

    const assignmentLocation = projectAssignmentLocation({ ...state, systems, projectSystems, projectTenants }, project)
    systems = systems.map((system) =>
      system.id === hostingSystem.id
        ? {
            ...system,
            linkedProjectIds: Array.from(new Set([...(system.linkedProjectIds ?? []), project.id])),
            tenantIds: Array.from(new Set([...(system.tenantIds ?? []), tenant.id])),
            timeGroup: appendUniqueSemicolonValue(system.timeGroup, assignmentLocation.region || assignmentLocation.timeGroup),
            updatedAt: now,
          }
        : system,
    )
  })

  return { systems, projectSystems, projectTenants, activityEvents }
}

function ensureTenantCommittedProjectRelationships(
  state: AppDataState,
  tenant: AppDataState['tenants'][number],
  _activeSystemId: string | undefined,
  now: string,
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  const linkedProject = originatingProjectForTenant(state, tenant)
  if (!linkedProject) {
    return {
      systems: state.systems,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      activityEvents: state.activityEvents,
    }
  }
  return ensureProjectTenantHostingRelationships(state, linkedProject, [tenant.id], now, 'tenantSave')
}

function appendProjectSaveActivityEvents(
  events: ActivityEvent[],
  now: string,
  previousProject: AppDataState['projects'][number],
  nextProject: AppDataState['projects'][number],
  context: {
    linkedOpportunity?: AppDataState['opportunities'][number]
    account?: AppDataState['accounts'][number]
  } = {},
): ActivityEvent[] {
  let nextEvents = events
  const projectReference = projectRef(nextProject)
  const previousTasksById = new Map((previousProject.tasks ?? []).map((task) => [task.id, task]))
  const nextTasks = nextProject.tasks ?? []
  const changedTasks = nextTasks.filter((task) => {
    const previousTask = previousTasksById.get(task.id)
    return previousTask && previousTask.status !== task.status
  })

  changedTasks.forEach((task) => {
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'MILESTONE',
      eventType: 'project.taskStatusChanged',
      severity: task.status === 'DONE' ? 'SUCCESS' : 'INFO',
      summary: `Task "${task.name}" marked ${task.status === 'DONE' ? 'DONE' : 'OPEN'} on project ${nextProject.pid}.`,
      primaryObject: projectReference,
    })
  })

  const changedTaskIds = new Set(changedTasks.map((task) => task.id))
  ;(nextProject.milestones ?? []).forEach((milestone) => {
    const milestoneTasks = nextTasks.filter((task) => task.milestoneId === milestone.id)
    if (milestoneTasks.length === 0) return
    const everyTaskChanged = milestoneTasks.every((task) => changedTaskIds.has(task.id))
    const status = milestoneTasks[0]?.status
    const oneStatus = status && milestoneTasks.every((task) => task.status === status)
    if (!everyTaskChanged || !oneStatus) return
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'MILESTONE',
      eventType: 'project.milestoneTasksStatusChanged',
      severity: status === 'DONE' ? 'SUCCESS' : 'INFO',
      summary: `Milestone "${milestone.name}" tasks marked ${status === 'DONE' ? 'DONE' : 'OPEN'} on project ${nextProject.pid}.`,
      primaryObject: projectReference,
    })
  })

  if (previousProject.progressStatus !== nextProject.progressStatus) {
    const statusSummary = previousProject.progressStatus === 'OPEN' && nextProject.progressStatus === 'DONE'
      ? `All Tasks were completed and Project ${nextProject.pid} status changed to DONE.`
      : previousProject.progressStatus === 'DONE' && nextProject.progressStatus === 'OPEN'
        ? `One or more Tasks were reopened and Project ${nextProject.pid} status changed to OPEN.`
        : `Project ${nextProject.pid} status changed from ${previousProject.progressStatus} to ${nextProject.progressStatus}.`
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'PROJECT',
      eventType: 'project.statusChanged',
      severity: nextProject.progressStatus === 'DONE' ? 'SUCCESS' : 'INFO',
      summary: statusSummary,
      primaryObject: projectReference,
    })
  }

  const previousTimeZone = projectTimeZoneResolution(previousProject, context)
  const nextTimeZone = projectTimeZoneResolution(nextProject, context)
  const locationFieldsChanged =
    projectHeaderFieldValue(previousProject, 'country', context) !== projectHeaderFieldValue(nextProject, 'country', context) ||
    projectHeaderFieldValue(previousProject, 'state', context) !== projectHeaderFieldValue(nextProject, 'state', context) ||
    previousProject.deliveryDate !== nextProject.deliveryDate
  if (locationFieldsChanged && previousTimeZone.utcOffset !== nextTimeZone.utcOffset) {
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'PROJECT',
      eventType: 'project.timeZoneChanged',
      severity: nextTimeZone.status === 'RESOLVED' ? 'INFO' : 'WARNING',
      summary: nextTimeZone.status === 'RESOLVED'
        ? `Project ${nextProject.pid} Time Zone changed from ${previousTimeZone.utcOffset || 'unresolved'} to ${nextTimeZone.utcOffset}.`
        : `Project ${nextProject.pid} Time Zone is unresolved: ${nextTimeZone.message}`,
      primaryObject: projectReference,
      before: { timeZone: previousTimeZone.utcOffset || '', ianaTimeZone: previousTimeZone.ianaTimeZone || '' },
      after: { timeZone: nextTimeZone.utcOffset || '', ianaTimeZone: nextTimeZone.ianaTimeZone || '' },
    })
  }

  return nextEvents
}

function hostedTenantCountForSystemId(state: AppDataState, systemId: string): number {
  return state.tenants.filter((tenant) => tenantIsActivelyHostedBySystem(tenant, systemId)).length
}

function updateSystemMapCenterTransaction(
  state: AppDataState,
  systemId: string,
  mapCenter: string,
  now: string,
  sourceTenantId?: string,
): Pick<AppDataState, 'systems' | 'activityEvents'> {
  const system = state.systems.find((candidate) => candidate.id === systemId)
  if (!system || String(system.mapCenter ?? '') === mapCenter) {
    return { systems: state.systems, activityEvents: state.activityEvents }
  }

  const beforeSummary = systemApplicationConfigurationSummary(system, state.tenants)
  const nextSystem = { ...system, mapCenter, updatedAt: now }
  const afterSummary = systemApplicationConfigurationSummary(nextSystem, state.tenants)
  const existingHistory = system.configurationHistory ?? []
  const sourceTenant = sourceTenantId ? state.tenants.find((tenant) => tenant.id === sourceTenantId) : undefined
  const historyRecord = createSystemConfigurationHistoryRecord(
    afterSummary,
    existingHistory,
    now,
    CURRENT_USER_DISPLAY_NAME,
    sourceTenant?.tid ?? '',
  )
  const hostedCount = hostedTenantCountForSystemId(state, systemId)

  return {
    systems: state.systems.map((candidate) =>
      candidate.id === systemId
        ? {
            ...nextSystem,
            configurationHistory: historyRecord ? [historyRecord, ...existingHistory] : existingHistory,
          }
        : candidate,
    ),
    activityEvents: appendActivityEvent(state.activityEvents, now, {
      category: 'SYSTEM',
      eventType: 'system.mapCenterChanged',
      severity: 'INFO',
      summary: `System ${systemBusinessId(system)} Map Center changed from ${beforeSummary.mapCenter || '-'} to ${afterSummary.mapCenter || '-'}.`,
      primaryObject: systemRef(system),
      relatedObjects: relatedRefs(sourceTenant ? tenantRef(sourceTenant) : null),
      before: { mapCenter: beforeSummary.mapCenter || '' },
      after: { mapCenter: afterSummary.mapCenter || '' },
      metadata: { affectedTenantCount: hostedCount },
    }),
  }
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

interface AppStore extends AppDataState {
  projectLifecycleChangesByOpportunityId: Record<string, ProjectLifecycleChange[]>
  initialize: () => void
  saveToStorage: () => void
  resetToSeed: () => void
  hydrated: boolean

  updateProject: (id: string, patch: Partial<AppDataState['projects'][number]>, options?: SaveTimestampOptions) => AppDataState['projects'][number] | undefined
  archiveProject: (id: string, reason: string) => void
  updateProductionSystemInventoryItem: (id: string, patch: Partial<AppDataState['productionSystemInventory'][number]>, options?: SaveTimestampOptions) => void
  updateReusedInternalSystem: (id: string, patch: Partial<AppDataState['reusedInternalSystems'][number]>, options?: SaveTimestampOptions) => void
  updateSystem: (id: string, patch: Partial<AppDataState['systems'][number]>, options?: SaveTimestampOptions) => void
  updateSystemMapCenter: (
    systemId: string,
    mapCenter: string,
    options?: { confirmedMultiTenantChange?: boolean; sourceTenantId?: string },
  ) => AllocationActionResult & { affectedTenantCount?: number }
  saveSystemFormTransaction: (
    collection: 'production' | 'reused' | 'allocated',
    id: string,
    patch: Partial<AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number] | AppDataState['systems'][number]>,
    tenantRemovalIds?: string[],
    options?: SaveTimestampOptions,
  ) => void
  updateTenant: (id: string, patch: Partial<AppDataState['tenants'][number]>, options?: SaveTimestampOptions) => void
  saveTenantConfiguration: (id: string, draft: AppDataState['tenants'][number], activeSystemId?: string, options?: SaveTimestampOptions) => void
  deleteTenantFromSystem: (id: string) => void
  cancelTenantFromSystem: (id: string) => void
  rollbackSystemFormTenantCreation: (tenantId: string) => void
  moveTenantToSystem: (id: string, destinationSystemId: string) => AllocationActionResult
  createTenantFromSystemRequirement: (projectId: string, systemId: string, requirementId: string) => AllocationActionResult
  createInternalTenantForSystem: (projectId: string, systemId: string) => AllocationActionResult
  updateAccount: (id: string, patch: Partial<AppDataState['accounts'][number]>) => void
  updateOpportunity: (id: string, patch: Partial<AppDataState['opportunities'][number]>, options?: SaveTimestampOptions) => void
  createOpportunity: (type?: OpportunityType, subType?: OpportunitySubType) => AppDataState['opportunities'][number]
  createProject: () => AppDataState['projects'][number]
  createProductionSystemInventoryItem: () => AppDataState['productionSystemInventory'][number]
  createReusedInternalSystem: (machineId: string) => AppDataState['reusedInternalSystems'][number] | null
  saveOpportunityWithProjectSync: (
    opportunity: Opportunity,
    savedOpportunity: Opportunity,
    options?: OpportunityProjectSyncOptions,
    timestampOptions?: SaveTimestampOptions,
  ) => OpportunityProjectSyncResult
  createSystem: () => AppDataState['systems'][number]
  createTenant: () => AppDataState['tenants'][number]
  allocateProductionSystemToProject: (projectId: string, productionSystemId: string, requirementIds?: string[]) => AllocationActionResult
  allocateReusedInternalSystemToProject: (projectId: string, reusedSystemId: string, requirementIds?: string[]) => AllocationActionResult
  linkExistingSystemToProject: (projectId: string, systemId: string, requirementIds?: string[]) => AllocationActionResult
  deallocateProjectSystem: (allocationId: string) => AllocationActionResult
}

export type {
  OpportunityProjectSyncOptions,
  OpportunityProjectSyncResult,
  PocProjectSyncAction,
  ProjectLifecycleChange,
} from '@/domain/opportunity-lifecycle'

export const useAppStore = create<AppStore>((set, get) => ({
  ...createInitialState(),
  hydrated: false,
  projectLifecycleChangesByOpportunityId: {},

  initialize: () => {
    const persisted = loadPersistedState()
    const next = persisted ?? createInitialState()
    set({ ...next, hydrated: true })
    if (!unsubscribeCommittedStateChanges) {
      unsubscribeCommittedStateChanges = subscribeToCommittedStateChanges((state) => {
        set({ ...state, hydrated: true })
      })
    }
  },

  saveToStorage: () => {
    const state = get()
    const data: AppDataState = {
      version: state.version,
      salesManagers: state.salesManagers,
      accounts: state.accounts,
      opportunities: state.opportunities,
      projects: state.projects,
      productionSystemInventory: state.productionSystemInventory,
      reusedInternalSystems: state.reusedInternalSystems,
      systems: state.systems,
      tenants: state.tenants,
      warrantyRecords: state.warrantyRecords,
      activityEvents: state.activityEvents,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      idCounters: state.idCounters,
      lastPersistedAt: state.lastPersistedAt,
    }
    persistState(data)
    set({ lastPersistedAt: new Date().toISOString() })
    publishCommittedStateChange()
  },

  resetToSeed: () => {
    clearPersistedState()
    set({ ...createInitialState(), hydrated: true, projectLifecycleChangesByOpportunityId: {} })
  },

  updateProject: (id, patch, options) => {
    const now = new Date().toISOString()
    let committedProject: AppDataState['projects'][number] | undefined
    set((state) => {
      let updatedProject: AppDataState['projects'][number] | undefined
      let previousProject: AppDataState['projects'][number] | undefined
      const projects = state.projects.map((project) => {
        if (project.id !== id) return project
        previousProject = project
        updatedProject = applyProjectLifecycleStatus({
          ...projectWithDerivedTimeZone(state, {
            ...project,
            ...patch,
            updatedAt: options?.preserveNewState ? project.createdAt : now,
          }),
        })
        return updatedProject
      })
      committedProject = updatedProject
      const sourceMachineIds =
        updatedProject?.mainType === 'POC' && updatedProject.progressStatus === 'DONE'
          ? new Set(
              state.projectSystems
                .filter(
                  (link) =>
                    link.projectId === id &&
                    link.allocationStatus !== 'DEALLOCATED' &&
                    link.allocationType === 'REUSED_INTERNAL' &&
                    link.sourceMachineId,
                )
                .map((link) => link.sourceMachineId as string),
            )
          : new Set<string>()
      const sourceMachinePurposeContext = new Map<string, ReturnType<typeof purposeHistoryContextFromProject>>()
      if (updatedProject && sourceMachineIds.size > 0) {
        const completedProject = updatedProject
        state.projectSystems
          .filter((link) => link.projectId === id && link.sourceMachineId && sourceMachineIds.has(link.sourceMachineId))
          .forEach((link) => {
            const system = state.systems.find((candidate) => candidate.id === link.systemId)
            sourceMachinePurposeContext.set(
              link.sourceMachineId as string,
              system
                ? purposeHistoryContextFromProject(completedProject, system)
                : {
                    pid: completedProject.pid,
                    sid: '',
                    projectName: completedProject.opportunityName,
                    accountName: completedProject.accountName,
                    product: '',
                    projectStatus: completedProject.progressStatus,
                  },
            )
          })
      }

      return {
        projects,
        activityEvents:
          previousProject && updatedProject
            ? appendProjectSaveActivityEvents(state.activityEvents, now, previousProject, updatedProject, {
                linkedOpportunity: state.opportunities.find((opportunity) => opportunity.opportunityId === updatedProject?.opportunityId),
                account: state.accounts.find((candidate) => candidate.accountName === updatedProject?.accountName),
              })
            : state.activityEvents,
        reusedInternalSystems:
          sourceMachineIds.size > 0
            ? state.reusedInternalSystems.map((system) =>
                sourceMachineIds.has(system.machineId) && system.currentProjectIds.includes(id)
                  ? releaseReusedInternalSystem(system, id, now, sourceMachinePurposeContext.get(system.machineId))
                  : system,
              )
            : state.reusedInternalSystems,
      }
    })
    get().saveToStorage()
    return committedProject
  },

  archiveProject: (id, reason) => {
    const now = new Date().toISOString()
    set((state) => {
      const project = state.projects.find((candidate) => candidate.id === id)
      return {
        projects: state.projects.map((candidate) =>
          candidate.id === id
            ? {
                ...candidate,
                archivedAt: now,
                deletionReason: reason.trim(),
                updatedAt: now,
              }
            : candidate,
        ),
        activityEvents: project
          ? appendActivityEvent(state.activityEvents, now, {
              category: 'PROJECT',
              eventType: 'project.archived',
              severity: 'WARNING',
              summary: `Project ${project.pid} archived. Reason: ${reason.trim()}`,
              primaryObject: projectRef(project),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
  },

  updateSystem: (id, patch, options) => {
    set((state) => ({
      systems: state.systems.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: options?.preserveNewState ? s.createdAt : new Date().toISOString() } : s,
      ),
    }))
    get().saveToStorage()
  },

  updateSystemMapCenter: (systemId, mapCenter, options) => {
    const state = get()
    const system = state.systems.find((candidate) => candidate.id === systemId)
    if (!system) return { ok: false, message: 'System inventory record not found.' }

    const nextMapCenter = mapCenter.trim()
    if (String(system.mapCenter ?? '') === nextMapCenter) {
      return { ok: true, message: 'Map Center unchanged.', affectedTenantCount: hostedTenantCountForSystemId(state, systemId) }
    }

    const affectedTenantCount = hostedTenantCountForSystemId(state, systemId)
    if (affectedTenantCount >= 2 && !options?.confirmedMultiTenantChange) {
      return {
        ok: false,
        message: `Map Center is a System-level parameter. This change will affect ${affectedTenantCount} existing Tenants hosted by System ${systemBusinessId(system)}. Do you want to continue?`,
        affectedTenantCount,
      }
    }

    const now = new Date().toISOString()
    set((current) => updateSystemMapCenterTransaction(current, systemId, nextMapCenter, now, options?.sourceTenantId))
    get().saveToStorage()
    return { ok: true, message: 'System Map Center updated.', affectedTenantCount }
  },

  saveSystemFormTransaction: (collection, id, patch, tenantRemovalIds = [], options) => {
    const now = new Date().toISOString()
    set((state) => {
      const tenantRemovalState = removeTenantsFromSystemTransaction(state, tenantRemovalIds, now)
      const updatedAtFor = (createdAt: string | undefined) => options?.preserveNewState ? createdAt ?? now : now
      const productionPatch = patch as Partial<AppDataState['productionSystemInventory'][number]>
      const reusedPatch = patch as Partial<AppDataState['reusedInternalSystems'][number]>
      const allocatedPatch = patch as Partial<AppDataState['systems'][number]>
      const { mapCenter: allocatedMapCenter, ...allocatedRestPatch } = allocatedPatch
      const result = {
        ...tenantRemovalState,
        productionSystemInventory:
          collection === 'production'
            ? state.productionSystemInventory.map((system) =>
                system.id === id ? { ...system, ...productionPatch, updatedAt: updatedAtFor(system.createdAt) } : system,
              )
            : state.productionSystemInventory,
        reusedInternalSystems:
          collection === 'reused'
            ? state.reusedInternalSystems.map((system) => {
                if (system.id !== id) return system
                const { purposeHistory: _purposeHistory, ...safePatch } = reusedPatch
                const nextSystem = safePatch.purpose && safePatch.purpose !== system.purpose
                  ? updateReusedInternalPurpose(system, safePatch.purpose, now)
                  : { ...system, updatedAt: updatedAtFor(system.createdAt) }
                return { ...nextSystem, ...safePatch, updatedAt: updatedAtFor(system.createdAt) }
              })
            : state.reusedInternalSystems,
        systems:
          collection === 'allocated'
            ? tenantRemovalState.systems.map((system) =>
                system.id === id ? { ...system, ...allocatedRestPatch, updatedAt: updatedAtFor(system.createdAt) } : system,
              )
            : tenantRemovalState.systems,
      }
      if (collection !== 'allocated' || typeof allocatedMapCenter !== 'string') return result
      const mapCenterState = updateSystemMapCenterTransaction(
        { ...state, ...result },
        id,
        allocatedMapCenter,
        now,
      )
      return { ...result, systems: mapCenterState.systems, activityEvents: mapCenterState.activityEvents }
    })
    get().saveToStorage()
  },

  updateTenant: (id, patch, options) => {
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: options?.preserveNewState ? t.createdAt : new Date().toISOString() } : t,
      ),
    }))
    get().saveToStorage()
  },

  saveTenantConfiguration: (id, draft, activeSystemId, options) => {
    const now = new Date().toISOString()
    set((state) => {
      const savedTenant = state.tenants.find((tenant) => tenant.id === id)
      if (!savedTenant) return state

      const affectedSystemIds = Array.from(new Set([
        savedTenant.hostedSystemId ?? savedTenant.systemId,
        draft.hostedSystemId ?? draft.systemId,
        activeSystemId,
      ].filter((value): value is string => Boolean(value))))
      const systemSummariesBefore = new Map(
        affectedSystemIds
          .map((systemId) => state.systems.find((system) => system.id === systemId))
          .filter((system): system is AppDataState['systems'][number] => Boolean(system))
          .map((system) => [system.id, systemApplicationConfigurationSummary(system, state.tenants)]),
      )
      const activeSystem = state.systems.find((system) => system.id === activeSystemId)
        ?? state.systems.find((system) => system.id === (draft.hostedSystemId ?? draft.systemId))
      const { patch } = tenantConfigurationSaveDraft(draft, savedTenant, activeSystem, now)
      const tenants = state.tenants.map((tenant) =>
        tenant.id === id ? { ...tenant, ...patch, updatedAt: options?.preserveNewState ? tenant.createdAt : now } : tenant,
      )
      const committedTenant = {
        ...savedTenant,
        ...draft,
        ...patch,
      }
      const relationshipState = ensureTenantCommittedProjectRelationships(
        { ...state, tenants },
        committedTenant,
        activeSystem?.id,
        now,
      )
      const systems = relationshipState.systems.map((system) => {
        if (!affectedSystemIds.includes(system.id)) return system
        const beforeSummary = systemSummariesBefore.get(system.id)
        const afterSummary = systemApplicationConfigurationSummary(system, tenants)
        if (!beforeSummary || valuesEqual(beforeSummary, afterSummary)) return system

        const existingHistory = system.configurationHistory ?? []
        const record = createSystemConfigurationHistoryRecord(afterSummary, existingHistory, now, CURRENT_USER_DISPLAY_NAME, savedTenant.tid)
        if (!record) return system

        return {
          ...system,
          configurationHistory: [record, ...existingHistory],
          updatedAt: now,
        }
      })

      return {
        tenants,
        systems,
        projectSystems: relationshipState.projectSystems,
        projectTenants: relationshipState.projectTenants,
        activityEvents: relationshipState.activityEvents,
      }
    })
    get().saveToStorage()
  },

  deleteTenantFromSystem: (id) => {
    const now = new Date().toISOString()
    set((state) => removeTenantsFromSystemTransaction(state, [id], now, 'Deleted'))
    get().saveToStorage()
  },

  cancelTenantFromSystem: (id) => {
    const now = new Date().toISOString()
    set((state) => removeTenantsFromSystemTransaction(state, [id], now, 'Cancelled'))
    get().saveToStorage()
  },

  rollbackSystemFormTenantCreation: (tenantId) => {
    const state = get()
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    if (!tenant) return
    const systemIds = [tenant.systemId, tenant.hostedSystemId].filter(Boolean)
    set((current) => ({
      tenants: current.tenants.filter((candidate) => candidate.id !== tenantId),
      systems: current.systems.map((system) =>
        systemIds.includes(system.id)
          ? {
              ...system,
              tenantIds: (system.tenantIds ?? []).filter((id) => id !== tenantId),
            }
          : system,
      ),
      projectSystems: current.projectSystems.map((link) =>
        systemIds.includes(link.systemId)
          ? {
              ...link,
              tenantIds: (link.tenantIds ?? []).filter((id) => id !== tenantId),
            }
          : link,
      ),
      projectTenants: current.projectTenants.filter((link) => link.tenantId !== tenantId),
      activityEvents: current.activityEvents.filter((event) => {
        const refs = [event.primaryObject, ...event.relatedObjects]
        return !refs.some((ref) => ref.objectType.toUpperCase() === 'TENANT' && (ref.id === tenant.id || ref.businessId === tenant.tid))
      }),
    }))
    get().saveToStorage()
  },

  moveTenantToSystem: (id, destinationSystemId) => {
    const state = get()
    const tenant = state.tenants.find((candidate) => candidate.id === id)
    const sourceSystem = tenant ? state.systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId) : undefined
    const destinationSystem = state.systems.find((candidate) => candidate.id === destinationSystemId)
    if (!tenant) return { ok: false, message: 'Tenant not found.' }
    if (!destinationSystem) return { ok: false, message: 'Destination System was not found.' }
    const validationMessage = validateTenantMoveDestination({
      tenant,
      systems: state.systems,
      projects: state.projects,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      opportunities: state.opportunities,
      accounts: state.accounts,
    }, destinationSystemId)
    if (validationMessage) return { ok: false, message: validationMessage }
    const sourceSystemId = tenant.hostedSystemId || tenant.systemId
    if (!sourceSystemId || sourceSystemId === destinationSystemId) return { ok: false, message: 'Destination System must be different from the current hosted System.' }
    const linkedProjectIds = new Set(
      state.projectTenants
        .filter((link) => link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED')
        .map((link) => link.projectId),
    )
    const now = new Date().toISOString()
    set((state) => ({
      tenants: state.tenants.map((tenant) => {
        if (tenant.id !== id) return tenant
        return {
          ...tenant,
          systemId: destinationSystemId,
          hostedSystemId: destinationSystemId,
          hostingSid: systemBusinessId(destinationSystem),
          contractStatus: tenant.contractStatus ?? 'UNDER_CONTRACT',
          hostedSystemHistory: movedTenantHostedSystemHistory(tenant, destinationSystemId, now),
          updatedAt: now,
        }
      }),
      systems: state.systems.map((system) => {
        if (system.id === sourceSystemId) {
          return {
            ...system,
            tenantIds: (system.tenantIds ?? []).filter((tenantId) => tenantId !== tenant.id),
            updatedAt: now,
          }
        }
        if (system.id === destinationSystemId) {
          return {
            ...system,
            tenantIds: Array.from(new Set([...(system.tenantIds ?? []), tenant.id])),
            updatedAt: now,
          }
        }
        return system
      }),
      projectSystems: state.projectSystems.map((link) => {
        if (link.allocationStatus === 'DEALLOCATED') return link
        if (link.systemId === sourceSystemId) {
          return { ...link, tenantIds: (link.tenantIds ?? []).filter((tenantId) => tenantId !== tenant.id) }
        }
        if (link.systemId === destinationSystemId && linkedProjectIds.has(link.projectId)) {
          return { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])) }
        }
        return link
      }),
      projectTenants: state.projectTenants.map((link) =>
        link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED'
          ? { ...link, systemId: destinationSystemId }
          : link,
      ),
      activityEvents: appendActivityEvent(state.activityEvents, now, {
        category: 'TENANT',
        eventType: 'tenant.movedToSystem',
        severity: 'INFO',
        summary: `Tenant ${tenant.tid} moved from system ${sourceSystem ? systemBusinessId(sourceSystem) : sourceSystemId} to system ${systemBusinessId(destinationSystem)}.`,
        primaryObject: tenantRef(tenant),
        relatedObjects: relatedRefs(sourceSystem ? systemRef(sourceSystem) : null, systemRef(destinationSystem)),
        before: { hostedSystemId: sourceSystemId, operationalStatus: tenant.operationalStatus },
        after: { hostedSystemId: destinationSystemId, operationalStatus: tenant.operationalStatus },
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} moved to ${systemBusinessId(destinationSystem)}.` }
  },

  createTenantFromSystemRequirement: (projectId, systemId, requirementId) => {
    const state = get()
    const now = new Date().toISOString()
    const resolved = resolveTenantCreationSource({ projectId, systemId, requirementId }, state)
    if (resolved.error) return resolved.error
    const { tenant, projectTenant, idCounters } = tenantCreationDraftFromSource(resolved.source, now)

    set((current) => ({
      idCounters,
      tenants: [tenant, ...current.tenants],
      systems: current.systems.map((candidate) =>
        candidate.id === systemId
          ? {
              ...candidate,
              tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), tenant.id])),
              updatedAt: now,
            }
          : candidate,
      ),
      projectSystems: current.projectSystems.map((link) =>
        link.projectId === projectId && link.systemId === systemId && link.allocationStatus !== 'DEALLOCATED'
          ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])) }
          : link,
      ),
      projectTenants: [projectTenant, ...current.projectTenants],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'TENANT',
        eventType: 'tenant.createdFromRequirement',
        severity: 'SUCCESS',
        summary: `Tenant ${tenant.tid} created from requirement ${resolved.source.requirement.requirementId}.`,
        primaryObject: tenantRef(tenant),
        relatedObjects: relatedRefs(
          projectRef(resolved.source.project),
          systemRef(resolved.source.system),
          requirementRef(resolved.source.requirement.requirementId),
          customerRef(resolved.source.account),
        ),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} created.`, allocationId: projectTenant.id, tenantId: tenant.id }
  },

  createInternalTenantForSystem: (projectId, systemId) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const system = state.systems.find((candidate) => candidate.id === systemId)
    if (!project) return { ok: false, message: 'Project not found.' }
    if (!system) return { ok: false, message: 'System not found.' }

    const now = new Date().toISOString()
    const { counters: idCounters, id: nextTid } = incrementCounter(state.idCounters, 'tid')
    const tenant: AppDataState['tenants'][number] = {
      id: `ten-${crypto.randomUUID()}`,
      tid: nextTid,
      tenantName: `${nextTid} Internal`,
      accountId: system.accountId ?? '',
      systemId: system.id,
      hostedSystemId: system.id,
      hostingSid: system.sid ?? '',
      deliveryPid: project.pid,
      tenantType: 'PENLINK_INTERNAL',
      tenantFormType: 'INTERNAL',
      accountName: 'Internal',
      country: system.country ?? '',
      timeGroup: system.timeGroup,
      operationalStatus: '',
      contractStatus: 'UNDER_CONTRACT',
      hostedSystemHistory: [{ systemId: system.id, startedAt: now, endedAt: null, reason: 'Created' }],
      productType: system.productType,
      hostingType: system.hostingType,
      cloudPlatform: system.cloudPlatform ?? '',
      mapCenter: system.mapCenter ?? '',
      licenses: null,
      users: null,
      concurrentSearches: null,
      dailySearches: null,
      monthlySearches: null,
      concurrentAnalyses: null,
      topicAnalyses: null,
      dailyAnalyses: null,
      monthlyAnalyses: null,
      tangles: null,
      tanglesGo: null,
      webloc: null,
      webeye: null,
      ingest: null,
      blockchain: '',
      crossSystemFeatures: [],
      apiEnabled: '',
      apiDailyQty: null,
      apiMonthlyQty: null,
      aiFeatures: [],
      additionalFeatures: [],
      standardMonitors: null,
      fullMonitors: null,
      topicMonitors: null,
      warrantyStatus: 'NOT_SET',
      warrantyStartDate: null,
      warrantyEndDate: null,
      pocStartDate: null,
      pocEndDate: null,
      createdAt: now,
      updatedAt: now,
    }
    const projectTenant = createProjectTenantLink(
      project.id,
      tenant.id,
      system.id,
      system.source === 'Reused Internal Systems' ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM',
      now,
    )

    set((current) => ({
      idCounters,
      tenants: [tenant, ...current.tenants],
      systems: current.systems.map((candidate) =>
        candidate.id === system.id
          ? { ...candidate, tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), tenant.id])), updatedAt: now }
          : candidate,
      ),
      projectSystems: current.projectSystems.map((link) =>
        link.projectId === project.id && link.systemId === system.id && link.allocationStatus !== 'DEALLOCATED'
          ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])) }
          : link,
      ),
      projectTenants: [projectTenant, ...current.projectTenants],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'TENANT',
        eventType: 'tenant.internalCreatedForProject',
        severity: 'SUCCESS',
        summary: `Tenant ${tenant.tid} created for project ${project.pid}.`,
        primaryObject: tenantRef(tenant),
        relatedObjects: relatedRefs(projectRef(project), systemRef(system)),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} created.`, allocationId: projectTenant.id, tenantId: tenant.id }
  },

  updateAccount: (id, patch) => {
    set((state) => ({
      accounts: state.accounts.map((account) => {
        if (account.id !== id) return account
        const nextAccount = { ...account, ...patch, updatedAt: new Date().toISOString() }
        return applyGeographicTimeZone(nextAccount)
      }),
    }))
    get().saveToStorage()
  },

  updateProductionSystemInventoryItem: (id, patch, options) => {
    set((state) => ({
      productionSystemInventory: state.productionSystemInventory.map((system) =>
        system.id === id ? { ...system, ...patch, updatedAt: options?.preserveNewState ? system.createdAt : new Date().toISOString() } : system,
      ),
    }))
    get().saveToStorage()
  },

  updateReusedInternalSystem: (id, patch, options) => {
    const now = new Date().toISOString()
    set((state) => ({
      reusedInternalSystems: state.reusedInternalSystems.map((system) => {
        if (system.id !== id) return system
        const { purposeHistory: _purposeHistory, ...safePatch } = patch
        const nextSystem = patch.purpose && patch.purpose !== system.purpose
          ? updateReusedInternalPurpose(system, patch.purpose, now)
          : { ...system, updatedAt: options?.preserveNewState ? system.createdAt : now }
        return { ...nextSystem, ...safePatch, updatedAt: options?.preserveNewState ? system.createdAt : now }
      }),
    }))
    get().saveToStorage()
  },

  updateOpportunity: (id, patch, options) => {
    set((state) => ({
      opportunities: state.opportunities.map((opportunity) => {
        if (opportunity.id !== id) return opportunity
        const nextOpportunity = { ...opportunity, ...patch, updatedAt: options?.preserveNewState ? opportunity.createdAt : new Date().toISOString() }
        return applyGeographicTimeZone(nextOpportunity, nextOpportunity.deliveryDate ?? nextOpportunity.pocStartDate)
      }),
    }))
    get().saveToStorage()
  },

  createOpportunity: (type = 'DELIVERY', subType = 'NEW') => {
    const state = get()
    const now = new Date().toISOString()
    const defaultAccount = state.accounts[0]
    const defaultSalesManagerId = defaultAccount?.salesManagerId ?? state.salesManagers[0]?.id ?? ''
    const nextOpportunityId = generateBusinessIdFromCounter(
      'opportunity',
      state.idCounters,
      state.opportunities.map((opportunity) => opportunity.opportunityId),
    )

    const opportunity: AppDataState['opportunities'][number] = applyGeographicTimeZone({
      id: `opp-${crypto.randomUUID()}`,
      opportunityId: nextOpportunityId.id,
      opportunityName: 'New opportunity',
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
    })

    set((currentState) => ({ idCounters: nextOpportunityId.counters, opportunities: [opportunity, ...currentState.opportunities] }))
    get().saveToStorage()
    return opportunity
  },

  createProject: () => {
    const state = get()
    const { counters: idCounters, id: nextPid } = incrementCounter(state.idCounters, 'pid')
    const now = new Date().toISOString()
    const project = projectWithDerivedTimeZone(state, createStandaloneProject(nextPid, now))

    set((s) => ({
      idCounters,
      projects: [project, ...s.projects],
      activityEvents: appendActivityEvent(s.activityEvents, now, {
        category: 'PROJECT',
        eventType: 'project.created',
        severity: 'SUCCESS',
        summary: `Project ${project.pid} created.`,
        primaryObject: projectRef(project),
      }),
    }))
    get().saveToStorage()
    return project
  },

  createProductionSystemInventoryItem: () => {
    const state = get()
    const nextSystemId = incrementCounter(state.idCounters, 'sid')
    const idCounters = nextSystemId.counters
    const nextSid = nextSystemId.id
    const now = new Date().toISOString()
    const system = createProductionInventorySystem(nextSid, now)

    set((currentState) => ({
      idCounters,
      productionSystemInventory: [system, ...currentState.productionSystemInventory],
      activityEvents: appendActivityEvent(currentState.activityEvents, now, {
        category: 'SYSTEM',
        eventType: 'system.created',
        severity: 'SUCCESS',
        summary: `System ${system.sid} created.`,
        primaryObject: systemRef(system),
      }),
    }))
    get().saveToStorage()
    return system
  },

  createReusedInternalSystem: (machineId) => {
    const state = get()
    const nextMid = machineId.trim()
    const midExists = [
      ...state.reusedInternalSystems.map((system) => system.machineId),
      ...state.systems.map((system) => system.machineId),
    ].some((existingMid) => String(existingMid ?? '').trim().toLocaleUpperCase() === nextMid.toLocaleUpperCase())
    if (!nextMid || midExists) return null
    const now = new Date().toISOString()
    const system = createReusedInternalInventorySystem(nextMid, now)

    set((currentState) => ({
      reusedInternalSystems: [system, ...currentState.reusedInternalSystems],
      activityEvents: appendActivityEvent(currentState.activityEvents, now, {
        category: 'SYSTEM',
        eventType: 'system.created',
        severity: 'SUCCESS',
        summary: `System ${system.machineId} created.`,
        primaryObject: systemRef(system),
      }),
    }))
    get().saveToStorage()
    return system
  },

  saveOpportunityWithProjectSync: (opportunity, savedOpportunity, options, timestampOptions) => {
    const state = get()
    const account = state.accounts.find((candidate) => candidate.id === opportunity.accountId)
    const salesManager = state.salesManagers.find((candidate) => candidate.id === opportunity.salesManagerId)
    const now = new Date().toISOString()
    const result = syncOpportunityProjectsFromOpportunity(
      opportunity,
      savedOpportunity,
      {
        account,
        salesManager,
        idCounters: state.idCounters,
        projects: state.projects,
        now,
        preserveOpportunityUpdatedAt: timestampOptions?.preserveNewState ? savedOpportunity.createdAt : undefined,
      },
      options,
    )
    const shouldSyncWonRelationships = savedOpportunity.stage !== 'WON' && result.opportunity.stage === 'WON'
    const finalProject = shouldSyncWonRelationships && result.opportunity.finalProjectId
      ? result.projects.find((project) => project.id === result.opportunity.finalProjectId)
      : undefined
    const existingTenantIds = shouldSyncWonRelationships ? existingTenantIdsForOpportunityFinalProject(result.opportunity) : []
    const relationshipMessages = finalProject
      ? validateProjectTenantHostingRelationshipSync(state, existingTenantIds)
      : []
    if (relationshipMessages.length > 0) {
      return {
        opportunity: savedOpportunity,
        projectChanges: [],
        messages: relationshipMessages,
      }
    }

    set((currentState) => {
      const opportunities = currentState.opportunities.map((candidate) =>
        candidate.id === savedOpportunity.id
          ? applyGeographicTimeZone(result.opportunity, result.opportunity.deliveryDate ?? result.opportunity.pocStartDate)
          : candidate
      )
      const committedState = { ...currentState, opportunities }
      const projects = result.projects.map((project) => projectWithDerivedTimeZone(committedState, project))
      const projectForRelationshipSync = finalProject ? projects.find((project) => project.id === finalProject.id) : undefined
      const relationshipState = projectForRelationshipSync && existingTenantIds.length > 0
        ? ensureProjectTenantHostingRelationships(
            { ...currentState, opportunities, projects },
            projectForRelationshipSync,
            existingTenantIds,
            now,
          )
        : {
            systems: currentState.systems,
            projectSystems: currentState.projectSystems,
            projectTenants: currentState.projectTenants,
            activityEvents: currentState.activityEvents,
          }
      return {
        idCounters: result.idCounters,
        projects,
        systems: relationshipState.systems,
        projectSystems: relationshipState.projectSystems,
        projectTenants: relationshipState.projectTenants,
        activityEvents: relationshipState.activityEvents,
        projectLifecycleChangesByOpportunityId: {
          ...currentState.projectLifecycleChangesByOpportunityId,
          [result.opportunity.id]: result.projectChanges,
        },
        opportunities,
      }
    })
    get().saveToStorage()
    return {
      opportunity: applyGeographicTimeZone(result.opportunity, result.opportunity.deliveryDate ?? result.opportunity.pocStartDate),
      projectChanges: result.projectChanges,
    }
  },

  createSystem: () => {
    const state = get()
    const nextSystemId = incrementCounter(state.idCounters, 'sid')
    const idCounters = nextSystemId.counters
    const nextSid = nextSystemId.id
    const now = new Date().toISOString()
    const system = createStandaloneSystem(nextSid, now)

    set((s) => ({
      idCounters,
      systems: [system, ...s.systems],
      activityEvents: appendActivityEvent(s.activityEvents, now, {
        category: 'SYSTEM',
        eventType: 'system.created',
        severity: 'SUCCESS',
        summary: `System ${system.sid ?? system.id} created.`,
        primaryObject: systemRef(system),
      }),
    }))
    get().saveToStorage()
    return system
  },

  createTenant: () => {
    const state = get()
    const { counters: idCounters, id: nextTid } = incrementCounter(state.idCounters, 'tid')
    const now = new Date().toISOString()

    const tenant: AppDataState['tenants'][number] = {
      id: `ten-${crypto.randomUUID()}`,
      tid: nextTid,
      tenantName: nextTid,
      accountId: '',
      systemId: '',
      deliveryPid: '',
      tenantType: 'CUSTOMER',
      tenantFormType: 'CUSTOMER',
      hostedSystemId: '',
      hostingSid: '',
      accountName: '',
      country: '',
      timeGroup: '',
      operationalStatus: '',
      contractStatus: 'UNDER_CONTRACT',
      hostedSystemHistory: [],
      productType: '',
      hostingType: '',
      cloudPlatform: '',
      mapCenter: '',
      licenses: null,
      users: null,
      concurrentSearches: null,
      dailySearches: null,
      monthlySearches: null,
      concurrentAnalyses: null,
      topicAnalyses: null,
      dailyAnalyses: null,
      monthlyAnalyses: null,
      tangles: null,
      tanglesGo: null,
      webloc: null,
      webeye: null,
      ingest: null,
      blockchain: '',
      crossSystemFeatures: [],
      apiEnabled: '',
      apiDailyQty: null,
      apiMonthlyQty: null,
      aiFeatures: [],
      additionalFeatures: [],
      standardMonitors: null,
      fullMonitors: null,
      topicMonitors: null,
      warrantyStatus: 'NOT_SET',
      warrantyStartDate: null,
      warrantyEndDate: null,
      pocStartDate: null,
      pocEndDate: null,
      createdAt: now,
      updatedAt: now,
    }

    set((s) => ({ idCounters, tenants: [tenant, ...s.tenants] }))
    get().saveToStorage()
    return tenant
  },

  allocateProductionSystemToProject: (projectId, productionSystemId) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const productionSystem = state.productionSystemInventory.find((candidate) => candidate.id === productionSystemId)
    const invalid = validateProductionAllocation({ projectId, systemId: productionSystemId }, state)
    if (invalid) return invalid
    if (!project || !productionSystem) return { ok: false, message: 'Production system not found.' }

    const now = new Date().toISOString()
    const tenantIds: string[] = []

    const allocatedSystem = systemFromProductionInventoryAllocation(
      productionSystem,
      project.id,
      projectAssignmentLocation(state, project),
      tenantIds,
      now,
    )
    const allocation = createProjectSystemLink(
      projectId,
      allocatedSystem.id,
      'PRODUCTION',
      now,
      { tenantIds },
    )

    set((current) => ({
      productionSystemInventory: current.productionSystemInventory.filter((candidate) => candidate.id !== productionSystemId),
      systems: [allocatedSystem, ...current.systems],
      projectSystems: [allocation, ...current.projectSystems],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.systemAllocated',
        severity: 'SUCCESS',
        summary: `System ${systemBusinessId(allocatedSystem)} allocated to project ${project.pid}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(projectRef(project), systemRef(allocatedSystem)),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Production system allocated.', allocationId: allocation.id }
  },

  allocateReusedInternalSystemToProject: (projectId, reusedSystemId) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const reusedSystem = state.reusedInternalSystems.find((candidate) => candidate.id === reusedSystemId)
    const invalid = validateReusedInternalAllocation({ projectId, systemId: reusedSystemId }, state)
    if (invalid) return invalid
    if (!project || !reusedSystem) return { ok: false, message: 'Reused internal system not found.' }

    const now = new Date().toISOString()
    const nextSystemId = incrementCounter(state.idCounters, 'sid')
    const idCounters = nextSystemId.counters
    const tenantIds: string[] = []
    const allocatedSystemId = `sys-${crypto.randomUUID()}`

    const allocatedSystem = systemFromReusedInternalAllocation(
      reusedSystem,
      project.id,
      projectAssignmentLocation(state, project),
      allocatedSystemId,
      nextSystemId.id,
      project.pid,
      tenantIds,
      now,
    )
    const allocation = createProjectSystemLink(
      projectId,
      allocatedSystem.id,
      'REUSED_INTERNAL',
      now,
      { tenantIds, sourceMachineId: reusedSystem.machineId },
    )

    set((current) => ({
      idCounters,
      reusedInternalSystems: current.reusedInternalSystems.map((candidate) =>
        candidate.id === reusedSystemId
          ? occupyReusedInternalSystem(candidate, projectId, now, purposeHistoryContextFromProject(project, allocatedSystem))
          : candidate,
      ),
      systems: [allocatedSystem, ...current.systems],
      projectSystems: [allocation, ...current.projectSystems],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.systemAllocated',
        severity: 'SUCCESS',
        summary: `System ${systemBusinessId(allocatedSystem)} allocated to project ${project.pid}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(projectRef(project), systemRef(allocatedSystem), systemRef(reusedSystem)),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Reused internal system allocated.', allocationId: allocation.id }
  },

  linkExistingSystemToProject: (projectId, systemId) => {
    const state = get()
    const invalid = validateExistingSystemLink({ projectId, systemId }, state)
    if (invalid) return invalid
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const system = state.systems.find((candidate) => candidate.id === systemId)

    const now = new Date().toISOString()
    const tenantIds: string[] = []
    const assignmentLocation = project ? projectAssignmentLocation(state, project) : { region: '', timeGroup: '' }

    const allocation = createProjectSystemLink(
      projectId,
      systemId,
      'EXISTING_SYSTEM',
      now,
      { tenantIds },
    )

    set((current) => ({
      systems: current.systems.map((candidate) =>
        candidate.id === systemId
          ? {
              ...candidate,
              linkedProjectIds: Array.from(new Set([...(candidate.linkedProjectIds ?? []), projectId])),
              tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), ...tenantIds])),
              timeGroup: appendUniqueSemicolonValue(candidate.timeGroup, assignmentLocation.region || assignmentLocation.timeGroup),
              updatedAt: now,
            }
          : candidate,
      ),
      projectSystems: [allocation, ...current.projectSystems],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.existingSystemLinked',
        severity: 'SUCCESS',
        summary: `System ${system ? systemBusinessId(system) : systemId} linked to project ${project?.pid ?? projectId}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(project ? projectRef(project) : null, system ? systemRef(system) : null),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Existing system linked.', allocationId: allocation.id }
  },

  deallocateProjectSystem: (allocationId) => {
    const state = get()
    const allocation = state.projectSystems.find((candidate) => candidate.id === allocationId)
    const invalid = validateProjectSystemDeallocation(allocationId, state.projectSystems)
    if (invalid) return invalid
    if (!allocation) return { ok: false, message: 'Allocation not found.' }
    const project = state.projects.find((candidate) => candidate.id === allocation.projectId)
    const system = state.systems.find((candidate) => candidate.id === allocation.systemId)
    const allocatedSystemForPurposeHistory = system
    const now = new Date().toISOString()
    const hostedTenantIds = new Set([
      ...(allocation.tenantIds ?? []),
      ...state.tenants
        .filter((tenant) => tenant.systemId === allocation.systemId || tenant.hostedSystemId === allocation.systemId)
        .map((tenant) => tenant.id),
    ])
    const tenantLinksToUnlink = state.projectTenants.filter(
      (candidate) =>
        candidate.projectId === allocation.projectId &&
        (candidate.systemId === allocation.systemId || hostedTenantIds.has(candidate.tenantId)) &&
        candidate.allocationStatus !== 'DEALLOCATED',
    )

    set((current) => ({
      projectSystems: current.projectSystems.map((candidate) =>
        candidate.id === allocationId
          ? deallocateProjectSystemLink(candidate, now)
          : candidate,
      ),
      projectTenants: current.projectTenants.map((candidate) =>
        candidate.projectId === allocation.projectId &&
        (candidate.systemId === allocation.systemId || hostedTenantIds.has(candidate.tenantId)) &&
        candidate.allocationStatus !== 'DEALLOCATED'
          ? deallocateProjectTenantLink(candidate, now)
          : candidate,
      ),
      systems: current.systems.map((system) =>
        system.id === allocation.systemId
          ? unlinkProjectFromSystem(system, allocation.projectId, now)
          : system,
      ),
      reusedInternalSystems: current.reusedInternalSystems.map((system) =>
        allocation.allocationType === 'REUSED_INTERNAL' && system.machineId === allocation.sourceMachineId
          ? releaseReusedInternalSystem(system, allocation.projectId, now, project && allocatedSystemForPurposeHistory ? purposeHistoryContextFromProject(project, allocatedSystemForPurposeHistory) : {})
          : system,
      ),
      activityEvents: tenantLinksToUnlink.reduce(
        (events, link) => {
          const tenant = current.tenants.find((candidate) => candidate.id === link.tenantId)
          if (!project || !tenant) return events
          return appendActivityEvent(events, now, {
            category: 'TENANT',
            eventType: 'project.tenantUnlinkedFromDeallocatedSystem',
            severity: 'WARNING',
            summary: `Tenant ${tenant.tid} unlinked from project ${project.pid} because system ${system ? systemBusinessId(system) : allocation.systemId} was deallocated.`,
            primaryObject: projectRef(project),
            relatedObjects: relatedRefs(tenantRef(tenant), system ? systemRef(system) : null),
          })
        },
        appendActivityEvent(current.activityEvents, now, {
          category: 'ALLOCATION',
          eventType: 'allocation.systemDeallocated',
          severity: 'WARNING',
          summary: `System ${system ? systemBusinessId(system) : allocation.systemId} deallocated from project ${project?.pid ?? allocation.projectId}.`,
          primaryObject: allocationRef(allocation),
          relatedObjects: relatedRefs(project ? projectRef(project) : null, system ? systemRef(system) : null),
        }),
      ),
    }))
    get().saveToStorage()
    return { ok: true, message: 'System deallocated from project.', allocationId }
  },
}))
