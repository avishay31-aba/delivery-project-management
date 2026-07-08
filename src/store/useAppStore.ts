import { create } from 'zustand'
import type {
  AppDataState,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
} from '@/data/seed.types'
import { incrementCounter } from '@/data/id-generator'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { generateBusinessId } from '@/domain/business-identity'
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
import { applyProjectLifecycleStatus, createStandaloneProject, projectHeaderFieldValue } from '@/domain/project-lifecycle'
import {
  deletedTenantHostedSystemHistory,
  movedTenantHostedSystemHistory,
  resolveTenantCreationSource,
  tenantCreationDraftFromSource,
  tenantConfigurationSaveDraft,
} from '@/domain/tenant-operations'

type ActivityEventDraft = Omit<ActivityEventInput, 'occurredAt'>
type SaveTimestampOptions = { preserveNewState?: boolean }

function appendActivityEvent(
  events: ActivityEvent[],
  now: string,
  draft: ActivityEventDraft,
): ActivityEvent[] {
  return [
    createActivityEvent({
      ...draft,
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

function projectAssignmentLocation(state: AppDataState, project: AppDataState['projects'][number]) {
  const linkedOpportunity = state.opportunities.find((opportunity) => opportunity.id === project.opportunityId)
  const account = state.accounts.find((candidate) => candidate.accountName === project.accountName)
  const context = { linkedOpportunity, account }
  return {
    region: projectHeaderFieldValue(project, 'region', context),
    timeGroup: projectHeaderFieldValue(project, 'timeGroup', context),
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

  updateProject: (id: string, patch: Partial<AppDataState['projects'][number]>, options?: SaveTimestampOptions) => void
  archiveProject: (id: string, reason: string) => void
  updateProductionSystemInventoryItem: (id: string, patch: Partial<AppDataState['productionSystemInventory'][number]>, options?: SaveTimestampOptions) => void
  updateReusedInternalSystem: (id: string, patch: Partial<AppDataState['reusedInternalSystems'][number]>, options?: SaveTimestampOptions) => void
  updateSystem: (id: string, patch: Partial<AppDataState['systems'][number]>, options?: SaveTimestampOptions) => void
  updateTenant: (id: string, patch: Partial<AppDataState['tenants'][number]>, options?: SaveTimestampOptions) => void
  saveTenantConfiguration: (id: string, draft: AppDataState['tenants'][number], activeSystemId?: string, options?: SaveTimestampOptions) => void
  deleteTenantFromSystem: (id: string) => void
  moveTenantToSystem: (id: string, destinationSystemId: string) => void
  createTenantFromSystemRequirement: (projectId: string, systemId: string, requirementId: string) => AllocationActionResult
  createInternalTenantForSystem: (projectId: string, systemId: string) => AllocationActionResult
  updateAccount: (id: string, patch: Partial<AppDataState['accounts'][number]>) => void
  updateOpportunity: (id: string, patch: Partial<AppDataState['opportunities'][number]>, options?: SaveTimestampOptions) => void
  createOpportunity: (type?: OpportunityType, subType?: OpportunitySubType) => AppDataState['opportunities'][number]
  createProject: () => AppDataState['projects'][number]
  createProductionSystemInventoryItem: () => AppDataState['productionSystemInventory'][number]
  createReusedInternalSystem: () => AppDataState['reusedInternalSystems'][number]
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
  },

  resetToSeed: () => {
    clearPersistedState()
    set({ ...createInitialState(), hydrated: true, projectLifecycleChangesByOpportunityId: {} })
  },

  updateProject: (id, patch, options) => {
    const now = new Date().toISOString()
    set((state) => {
      let updatedProject: AppDataState['projects'][number] | undefined
      const projects = state.projects.map((project) => {
        if (project.id !== id) return project
        updatedProject = applyProjectLifecycleStatus({
          ...project,
          ...patch,
          updatedAt: options?.preserveNewState ? project.createdAt : now,
        })
        return updatedProject
      })
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
                progressStatus: 'ARCHIVED',
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
      const systems = state.systems.map((system) => {
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

      return { tenants, systems }
    })
    get().saveToStorage()
  },

  deleteTenantFromSystem: (id) => {
    const state = get()
    const tenant = state.tenants.find((candidate) => candidate.id === id)
    const system = tenant ? state.systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId) : undefined
    const now = new Date().toISOString()
    set((state) => ({
      tenants: state.tenants.map((tenant) => {
        if (tenant.id !== id) return tenant
        return {
          ...tenant,
          systemId: '',
          hostedSystemId: '',
          hostingSid: '',
          operationalStatus: 'Deleted',
          hostedSystemHistory: deletedTenantHostedSystemHistory(tenant, now),
          updatedAt: now,
        }
      }),
      systems: state.systems.map((candidate) =>
        tenant && (candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId)
          ? {
              ...candidate,
              tenantIds: (candidate.tenantIds ?? []).filter((tenantId) => tenantId !== id),
              updatedAt: now,
            }
          : candidate,
      ),
      projectSystems: state.projectSystems.map((link) =>
        tenant && (link.systemId === tenant.systemId || link.systemId === tenant.hostedSystemId) && link.allocationStatus !== 'DEALLOCATED'
          ? { ...link, tenantIds: (link.tenantIds ?? []).filter((tenantId) => tenantId !== id) }
          : link,
      ),
      projectTenants: state.projectTenants.map((link) =>
        tenant && link.tenantId === id && (link.systemId === tenant.systemId || link.systemId === tenant.hostedSystemId) && link.allocationStatus !== 'DEALLOCATED'
          ? deallocateProjectTenantLink(link, now)
          : link,
      ),
      activityEvents: tenant
        ? appendActivityEvent(state.activityEvents, now, {
            category: 'TENANT',
            eventType: 'tenant.deletedFromSystem',
            severity: 'WARNING',
            summary: `Tenant ${tenant.tid} removed from system.`,
            primaryObject: tenantRef(tenant),
            relatedObjects: relatedRefs(system ? systemRef(system) : null),
          })
        : state.activityEvents,
    }))
    get().saveToStorage()
  },

  moveTenantToSystem: (id, destinationSystemId) => {
    const state = get()
    const tenant = state.tenants.find((candidate) => candidate.id === id)
    const sourceSystem = tenant ? state.systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId) : undefined
    const destinationSystem = state.systems.find((candidate) => candidate.id === destinationSystemId)
    const now = new Date().toISOString()
    set((state) => ({
      tenants: state.tenants.map((tenant) => {
        if (tenant.id !== id) return tenant
        return {
          ...tenant,
          systemId: destinationSystemId,
          contractStatus: tenant.contractStatus ?? 'UNDER_CONTRACT',
          hostedSystemHistory: movedTenantHostedSystemHistory(tenant, destinationSystemId, now),
          updatedAt: now,
        }
      }),
      activityEvents: tenant
        ? appendActivityEvent(state.activityEvents, now, {
            category: 'TENANT',
            eventType: 'tenant.movedToSystem',
            severity: 'INFO',
            summary: `Tenant ${tenant.tid} moved to system ${destinationSystem ? systemBusinessId(destinationSystem) : destinationSystemId}.`,
            primaryObject: tenantRef(tenant),
            relatedObjects: relatedRefs(sourceSystem ? systemRef(sourceSystem) : null, destinationSystem ? systemRef(destinationSystem) : null),
          })
        : state.activityEvents,
    }))
    get().saveToStorage()
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
    return { ok: true, message: `Tenant ${tenant.tid} created.`, allocationId: projectTenant.id }
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
    }))
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} created.`, allocationId: projectTenant.id }
  },

  updateAccount: (id, patch) => {
    set((state) => ({
      accounts: state.accounts.map((account) =>
        account.id === id ? { ...account, ...patch, updatedAt: new Date().toISOString() } : account,
      ),
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
      opportunities: state.opportunities.map((opportunity) =>
        opportunity.id === id ? { ...opportunity, ...patch, updatedAt: options?.preserveNewState ? opportunity.createdAt : new Date().toISOString() } : opportunity,
      ),
    }))
    get().saveToStorage()
  },

  createOpportunity: (type = 'DELIVERY', subType = 'NEW') => {
    const state = get()
    const now = new Date().toISOString()
    const defaultAccount = state.accounts[0]
    const defaultSalesManagerId = defaultAccount?.salesManagerId ?? state.salesManagers[0]?.id ?? ''

    const opportunity: AppDataState['opportunities'][number] = {
      id: `opp-${crypto.randomUUID()}`,
      opportunityId: generateBusinessId('opportunity', state.opportunities.map((opportunity) => opportunity.opportunityId)),
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
      timeZone: defaultAccount?.timeZone ?? '',
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

    set((currentState) => ({ opportunities: [opportunity, ...currentState.opportunities] }))
    get().saveToStorage()
    return opportunity
  },

  createProject: () => {
    const state = get()
    const { counters: idCounters, id: nextPid } = incrementCounter(state.idCounters, 'pid')
    const now = new Date().toISOString()
    const project = createStandaloneProject(nextPid, now)

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

  createReusedInternalSystem: () => {
    const state = get()
    const nextMachineId = incrementCounter(state.idCounters, 'mid')
    const idCounters = nextMachineId.counters
    const nextMid = nextMachineId.id
    const now = new Date().toISOString()
    const system = createReusedInternalInventorySystem(nextMid, now)

    set((currentState) => ({
      idCounters,
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

    set((currentState) => ({
      idCounters: result.idCounters,
      projects: result.projects,
      projectLifecycleChangesByOpportunityId: {
        ...currentState.projectLifecycleChangesByOpportunityId,
        [result.opportunity.id]: result.projectChanges,
      },
      opportunities: currentState.opportunities.map((candidate) =>
        candidate.id === savedOpportunity.id ? result.opportunity : candidate,
      ),
    }))
    get().saveToStorage()
    return { opportunity: result.opportunity, projectChanges: result.projectChanges }
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

    set((current) => ({
      projectSystems: current.projectSystems.map((candidate) =>
        candidate.id === allocationId
          ? deallocateProjectSystemLink(candidate, now)
          : candidate,
      ),
      projectTenants: current.projectTenants.map((candidate) =>
        candidate.projectId === allocation.projectId && candidate.systemId === allocation.systemId && candidate.allocationStatus !== 'DEALLOCATED'
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
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.systemDeallocated',
        severity: 'WARNING',
        summary: `System ${system ? systemBusinessId(system) : allocation.systemId} deallocated from project ${project?.pid ?? allocation.projectId}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(project ? projectRef(project) : null, system ? systemRef(system) : null),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'System deallocated from project.', allocationId }
  },
}))
