import { create } from 'zustand'
import type {
  AppDataState,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  Tenant,
} from '@/data/seed.types'
import { incrementCounter } from '@/data/id-generator'
import {
  createInitialState,
  loadPersistedState,
  persistState,
  clearPersistedState,
} from '@/store/persistence'
import { applicationConfigurationFromRequirement } from '@/domain/application-configuration'
import {
  createProjectSystemLink,
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
  tenantHostingPatchFromSystem,
} from '@/domain/hosting-context'
import {
  createProductionInventorySystem,
  createReusedInternalInventorySystem,
  createStandaloneSystem,
  occupyReusedInternalSystem,
  releaseReusedInternalSystem,
  SYSTEM_SOURCE_REUSED_INTERNAL,
  systemFromProductionInventoryAllocation,
  systemFromReusedInternalAllocation,
  systemSource,
} from '@/domain/system-inventory'
import {
  syncOpportunityProjectsFromOpportunity,
  type OpportunityProjectSyncOptions,
  type OpportunityProjectSyncResult,
  type ProjectLifecycleChange,
} from '@/domain/opportunity-lifecycle'

interface AppStore extends AppDataState {
  projectLifecycleChangesByOpportunityId: Record<string, ProjectLifecycleChange[]>
  initialize: () => void
  saveToStorage: () => void
  resetToSeed: () => void
  hydrated: boolean

  updateProject: (id: string, patch: Partial<AppDataState['projects'][number]>) => void
  updateProductionSystemInventoryItem: (id: string, patch: Partial<AppDataState['productionSystemInventory'][number]>) => void
  updateReusedInternalSystem: (id: string, patch: Partial<AppDataState['reusedInternalSystems'][number]>) => void
  updateSystem: (id: string, patch: Partial<AppDataState['systems'][number]>) => void
  updateTenant: (id: string, patch: Partial<AppDataState['tenants'][number]>) => void
  deleteTenantFromSystem: (id: string) => void
  moveTenantToSystem: (id: string, destinationSystemId: string) => void
  createTenantFromSystemRequirement: (projectId: string, systemId: string, requirementId: string) => AllocationActionResult
  updateAccount: (id: string, patch: Partial<AppDataState['accounts'][number]>) => void
  updateOpportunity: (id: string, patch: Partial<AppDataState['opportunities'][number]>) => void
  createOpportunity: (type?: OpportunityType, subType?: OpportunitySubType) => AppDataState['opportunities'][number]
  createProject: () => AppDataState['projects'][number]
  createProductionSystemInventoryItem: () => AppDataState['productionSystemInventory'][number]
  createReusedInternalSystem: () => AppDataState['reusedInternalSystems'][number]
  saveOpportunityWithProjectSync: (
    opportunity: Opportunity,
    savedOpportunity: Opportunity,
    options?: OpportunityProjectSyncOptions,
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

  updateProject: (id, patch) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p,
      ),
    }))
    get().saveToStorage()
  },

  updateSystem: (id, patch) => {
    set((state) => ({
      systems: state.systems.map((s) =>
        s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
      ),
    }))
    get().saveToStorage()
  },

  updateTenant: (id, patch) => {
    set((state) => ({
      tenants: state.tenants.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: new Date().toISOString() } : t,
      ),
    }))
    get().saveToStorage()
  },

  deleteTenantFromSystem: (id) => {
    const now = new Date().toISOString()
    set((state) => ({
      tenants: state.tenants.map((tenant) => {
        if (tenant.id !== id) return tenant
        const history = tenant.hostedSystemHistory ?? [
          { systemId: tenant.systemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' as const },
        ]
        return {
          ...tenant,
          systemId: '',
          operationalStatus: 'Deleted',
          hostedSystemHistory: history.map((entry, index) =>
            index === history.length - 1 && entry.endedAt == null
              ? { ...entry, endedAt: now, reason: 'Deleted' as const }
              : entry,
          ),
          updatedAt: now,
        }
      }),
    }))
    get().saveToStorage()
  },

  moveTenantToSystem: (id, destinationSystemId) => {
    const now = new Date().toISOString()
    set((state) => ({
      tenants: state.tenants.map((tenant) => {
        if (tenant.id !== id) return tenant
        const history = tenant.hostedSystemHistory ?? [
          { systemId: tenant.systemId, startedAt: tenant.createdAt, endedAt: null, reason: 'Created' as const },
        ]
        const closedHistory = history.map((entry, index) =>
          index === history.length - 1 && entry.endedAt == null
            ? { ...entry, endedAt: now, reason: 'Moved' as const }
            : entry,
        )
        return {
          ...tenant,
          systemId: destinationSystemId,
          contractStatus: tenant.contractStatus ?? 'UNDER_CONTRACT',
          hostedSystemHistory: [
            ...closedHistory,
            { systemId: destinationSystemId, startedAt: now, endedAt: null, reason: 'Moved' as const },
          ],
          updatedAt: now,
        }
      }),
    }))
    get().saveToStorage()
  },

  createTenantFromSystemRequirement: (projectId, systemId, requirementId) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const system = state.systems.find((candidate) => candidate.id === systemId)
    if (!project) return { ok: false, message: 'Project not found.' }
    if (!system) return { ok: false, message: 'System not found.' }

    const opportunity = state.opportunities.find(
      (candidate) =>
        candidate.opportunityId === project.opportunityId ||
        candidate.id === project.opportunityId ||
        candidate.pocProjectIds.includes(project.id) ||
        candidate.finalProjectId === project.id,
    )
    const requirement = opportunity?.newTenantRequirements.find((candidate) => candidate.id === requirementId)
    if (!requirement) return { ok: false, message: 'New tenant requirement not found for this project.' }

    const alreadyLinked = state.tenants.some((tenant) => {
      const linkedToProject = state.projectTenants.some(
        (link) => link.projectId === projectId && link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED',
      )
      return linkedToProject && tenant.systemId === systemId && tenant.sourceRequirementId === requirement.requirementId
    })
    if (alreadyLinked) return { ok: false, message: 'A tenant already exists for this requirement on this system.' }

    const account = opportunity ? state.accounts.find((candidate) => candidate.id === opportunity.accountId) : undefined
    const nextTenantId = incrementCounter(state.idCounters, 'tid')
    const idCounters = nextTenantId.counters
    const now = new Date().toISOString()
    const projectSystemLink = state.projectSystems.find(
      (link) => link.projectId === projectId && link.systemId === systemId && link.allocationStatus !== 'DEALLOCATED',
    )
    const tenantType = project.mainType === 'POC' || system.systemClass === 'POC_DEMO_TRAINING' ? 'POC' : 'CUSTOMER'
    const configuration = applicationConfigurationFromRequirement(requirement, system.productType)
    const tenant: Tenant = {
      id: `ten-${crypto.randomUUID()}`,
      tid: nextTenantId.id,
      tenantName: `${nextTenantId.id} ${project.accountName || (account?.accountName ?? '')}`.trim(),
      accountId: account?.id ?? system.accountId ?? '',
      systemId,
      deliveryPid: project.pid,
      tenantType,
      tenantFormType: tenantType === 'POC' ? 'POC' : 'CUSTOMER',
      hostedSystemId: systemId,
      hostingSid: system.sid ?? '',
      sourceRequirementId: requirement.requirementId,
      configuration,
      accountName: project.accountName || (account?.accountName ?? ''),
      country: opportunity?.country ?? account?.country ?? system.country ?? '',
      timeGroup: opportunity?.timeGroup ?? account?.timeGroup ?? system.timeGroup,
      operationalStatus: 'Active',
      contractStatus: 'UNDER_CONTRACT',
      hostedSystemHistory: [{ systemId, startedAt: now, endedAt: null, reason: 'Created' }],
      productType: configuration.product,
      ...tenantHostingPatchFromSystem(system),
      statisticsId: requirement.statisticsId,
      authId: requirement.authId,
      rdmId: requirement.rdmId,
      mapCenter: configuration.mapCenter,
      licenses: configuration.licenses,
      users: configuration.users,
      concurrentSearches: configuration.concurrentSearches,
      dailySearches: configuration.dailySearches,
      monthlySearches: configuration.monthlySearches,
      concurrentAnalyses: configuration.concurrentAnalyses,
      topicAnalyses: configuration.topicAnalyses,
      dailyAnalyses: configuration.dailyAnalyses,
      monthlyAnalyses: configuration.monthlyAnalyses,
      standardMonitors: configuration.standardMonitors,
      fullMonitors: configuration.fullMonitors,
      topicMonitors: configuration.topicMonitors,
      tangles: configuration.tangles,
      tanglesGo: configuration.tanglesGo,
      webloc: configuration.webloc,
      webeye: configuration.webeye,
      ingest: configuration.ingest,
      blockchain: configuration.blockchain,
      crossSystemFeatures: [...configuration.crossSystemFeatures],
      apiEnabled: configuration.apiEnabled,
      apiDailyQty: configuration.apiDailyQty,
      apiMonthlyQty: configuration.apiMonthlyQty,
      aiFeatures: [...configuration.aiFeatures],
      additionalFeatures: [...configuration.additionalFeatures],
      warrantyStatus: 'NOT_SET',
      warrantyStartDate: null,
      warrantyEndDate: null,
      pocStartDate: opportunity?.pocStartDate ?? null,
      pocEndDate: opportunity?.pocEndDate ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const projectTenant = {
      id: `proj-ten-${crypto.randomUUID()}`,
      projectId,
      tenantId: tenant.id,
      systemId,
      allocationStatus: 'ALLOCATED' as const,
      allocationType: projectSystemLink?.allocationType ?? (systemSource(system) === SYSTEM_SOURCE_REUSED_INTERNAL ? 'REUSED_INTERNAL' as const : 'EXISTING_SYSTEM' as const),
      allocatedAt: now,
      deallocatedAt: null,
    }

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

  updateProductionSystemInventoryItem: (id, patch) => {
    set((state) => ({
      productionSystemInventory: state.productionSystemInventory.map((system) =>
        system.id === id ? { ...system, ...patch, updatedAt: new Date().toISOString() } : system,
      ),
    }))
    get().saveToStorage()
  },

  updateReusedInternalSystem: (id, patch) => {
    set((state) => ({
      reusedInternalSystems: state.reusedInternalSystems.map((system) =>
        system.id === id ? { ...system, ...patch, updatedAt: new Date().toISOString() } : system,
      ),
    }))
    get().saveToStorage()
  },

  updateOpportunity: (id, patch) => {
    set((state) => ({
      opportunities: state.opportunities.map((opportunity) =>
        opportunity.id === id ? { ...opportunity, ...patch, updatedAt: new Date().toISOString() } : opportunity,
      ),
    }))
    get().saveToStorage()
  },

  createOpportunity: (type = 'POC', subType = 'FREE') => {
    const state = get()
    const now = new Date().toISOString()
    const defaultAccount = state.accounts[0]
    const defaultSalesManagerId = defaultAccount?.salesManagerId ?? state.salesManagers[0]?.id ?? ''

    const opportunity: AppDataState['opportunities'][number] = {
      id: `opp-${crypto.randomUUID()}`,
      opportunityId: `SF-OPP-${new Date().getFullYear()}-DRAFT`,
      opportunityName: 'New opportunity',
      stage: 'OPEN',
      accountId: defaultAccount?.id ?? '',
      salesManagerId: defaultSalesManagerId,
      type,
      subType,
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

    const project: AppDataState['projects'][number] = {
      id: `proj-${crypto.randomUUID()}`,
      pid: nextPid,
      opportunityId: undefined,
      projectSource: 'FINAL',
      accountName: '',
      mainType: 'DELIVERY',
      subType: 'NONE',
      deliveryDate: null,
      progressStatus: 'OPEN',
      dealOwner: '',
      opportunityName: '',
      canceledAt: null,
      documents: [],
      createdAt: now,
      updatedAt: now,
    }

    set((s) => ({ idCounters, projects: [project, ...s.projects] }))
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
    }))
    get().saveToStorage()
    return system
  },

  saveOpportunityWithProjectSync: (opportunity, savedOpportunity, options) => {
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

    set((s) => ({ idCounters, systems: [system, ...s.systems] }))
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

    const allocatedSystem = systemFromProductionInventoryAllocation(productionSystem, projectId, tenantIds, now)
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
      projectId,
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
          ? occupyReusedInternalSystem(candidate, projectId, now)
          : candidate,
      ),
      systems: [allocatedSystem, ...current.systems],
      projectSystems: [allocation, ...current.projectSystems],
    }))
    get().saveToStorage()
    return { ok: true, message: 'Reused internal system allocated.', allocationId: allocation.id }
  },

  linkExistingSystemToProject: (projectId, systemId) => {
    const state = get()
    const invalid = validateExistingSystemLink({ projectId, systemId }, state)
    if (invalid) return invalid

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
          ? releaseReusedInternalSystem(system, allocation.projectId, now)
          : system,
      ),
    }))
    get().saveToStorage()
    return { ok: true, message: 'System deallocated from project.', allocationId }
  },
}))
