import { create } from 'zustand'
import type {
  AppDataState,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  Project,
  ProjectSystemLink,
  ProjectSubType,
  Tenant,
} from '@/data/seed.types'
import { incrementCounter } from '@/data/id-generator'
import {
  createInitialState,
  loadPersistedState,
  persistState,
  clearPersistedState,
} from '@/store/persistence'

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

export type PocProjectSyncAction = 'UPDATE_EXISTING_POC' | 'CREATE_NEW_POC'

export interface OpportunityProjectSyncOptions {
  pocAction?: PocProjectSyncAction
  allowDoneFinalUpdate?: boolean
}

export interface ProjectLifecycleChange {
  projectId: string
  changeStatus: 'New' | 'Updated'
}

export interface OpportunityProjectSyncResult {
  opportunity: Opportunity
  projectChanges: ProjectLifecycleChange[]
}

export interface AllocationActionResult {
  ok: boolean
  message: string
  allocationId?: string
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function projectSubTypeForOpportunity(opportunity: Opportunity): ProjectSubType {
  return opportunity.subType === 'FREE' || opportunity.subType === 'PAID' ? 'NONE' : opportunity.subType
}

function tenantConfigurationFromRequirement(
  requirement: NonNullable<Opportunity['newTenantRequirements']>[number],
  product: string,
): NonNullable<Tenant['configuration']> {
  return {
    product,
    licenses: requirement.licenses,
    users: requirement.users,
    concurrentSearches: requirement.concurrentSearches,
    dailySearches: requirement.dailySearches,
    monthlySearches: requirement.monthlySearches,
    concurrentAnalyses: requirement.concurrentAnalyses,
    dailyAnalyses: requirement.dailyAnalyses,
    monthlyAnalyses: requirement.monthlyAnalyses,
    topicAnalyses: requirement.topicAnalyses,
    standardMonitors: requirement.standardMonitors,
    fullMonitors: requirement.fullMonitors,
    topicMonitors: requirement.topicMonitors,
    mapCenter: requirement.mapCenter,
    tangles: requirement.tangles,
    tanglesGo: requirement.tanglesGo,
    webloc: requirement.webloc,
    webeye: requirement.webeye,
    ingest: requirement.ingest,
    blockchain: requirement.blockchain,
    crossSystemFeatures: [...requirement.crossSystemFeatures],
    apiEnabled: requirement.apiEnabled,
    apiDailyQty: requirement.apiDailyQty,
    apiMonthlyQty: requirement.apiMonthlyQty,
    aiFeatures: [...requirement.aiFeatures],
    additionalFeatures: [...requirement.additionalFeatures],
  }
}

function activeProjectSystemLinks(links: ProjectSystemLink[]): ProjectSystemLink[] {
  return links.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

function findLinkedPocProjects(opportunity: Opportunity, savedOpportunity: Opportunity, projects: Project[]): Project[] {
  const linkedIds = new Set(uniqueValues([...(opportunity.pocProjectIds ?? []), ...(savedOpportunity.pocProjectIds ?? [])]))
  const opportunityIds = new Set([opportunity.opportunityId, savedOpportunity.opportunityId])

  return projects.filter(
    (project) =>
      linkedIds.has(project.id) ||
      (project.projectSource === 'POC' && Boolean(project.opportunityId && opportunityIds.has(project.opportunityId))),
  )
}

function findFinalProject(opportunity: Opportunity, savedOpportunity: Opportunity, projects: Project[]): Project | undefined {
  const linkedId = opportunity.finalProjectId ?? savedOpportunity.finalProjectId
  if (linkedId) {
    const linkedProject = projects.find((project) => project.id === linkedId)
    if (linkedProject) return linkedProject
  }

  const opportunityIds = new Set([opportunity.opportunityId, savedOpportunity.opportunityId])
  return projects.find(
    (project) =>
      project.projectSource === 'FINAL' &&
      Boolean(project.opportunityId && opportunityIds.has(project.opportunityId)),
  )
}

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
    const tenantType: Tenant['tenantType'] = project.mainType === 'POC' || system.systemClass === 'POC_DEMO_TRAINING' ? 'POC' : 'CUSTOMER'
    const configuration = tenantConfigurationFromRequirement(requirement, system.productType)
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
      hostingType: system.hostingType,
      cloudPlatform: system.cloudPlatform,
      csp: system.csp,
      cloudRegion: system.cloudRegion,
      statisticsId: requirement.statisticsId,
      authId: requirement.authId,
      rdmId: requirement.rdmId,
      performanceTier: system.performanceTier,
      vpnEnabled: system.vpnEnabled,
      vpnType: system.vpnType,
      ipRestrictionEnabled: system.ipRestrictionEnabled,
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
      allocationType: projectSystemLink?.allocationType ?? (system.source === 'Reused Internal Systems' ? 'REUSED_INTERNAL' as const : 'EXISTING_SYSTEM' as const),
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
    const system: AppDataState['productionSystemInventory'][number] = {
      id: `prod-sys-${crypto.randomUUID()}`,
      sid: nextSid,
      source: 'Production',
      purpose: 'Delivery',
      logo: 'T',
      url: '',
      cognitoRegion: 'NA',
      productType: 'Tangles',
      hostingType: 'Cloud',
      cloudPlatform: 'AWS',
      csp: 'Automate IT',
      cloudRegion: 'us-east-1 (N. Virginia)',
      performanceTier: 'STANDARD',
      vpnEnabled: 'NO',
      vpnType: '',
      ipRestrictionEnabled: 'NO',
      mapCenter: '',
      licenses: 1,
      users: 1,
      concurrentSearches: 1,
      concurrentAnalyses: 1,
      standardMonitors: 10,
      region: '',
      country: '',
      state: '',
      timeGroup: '',
      timeGroupAlert: '',
      linkedProjects: [],
      operationalStatus: 'On',
      tenantCount: 0,
      alerts: [],
      createdAt: now,
      updatedAt: now,
    }

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
    const system: AppDataState['reusedInternalSystems'][number] = {
      id: `reused-sys-${crypto.randomUUID()}`,
      machineId: nextMid,
      source: 'Reused Internal Systems',
      purpose: 'POC',
      status: 'Available',
      logo: 'T',
      url: '',
      cognitoRegion: 'NA',
      productType: 'Tangles',
      hostingType: 'Cloud',
      cloudPlatform: 'AWS',
      csp: 'Automate IT',
      cloudRegion: 'us-east-1 (N. Virginia)',
      performanceTier: 'STANDARD',
      vpnEnabled: 'NO',
      vpnType: '',
      ipRestrictionEnabled: 'NO',
      mapCenter: '',
      licenses: 1,
      users: 1,
      concurrentSearches: 1,
      concurrentAnalyses: 1,
      standardMonitors: 10,
      usedInRegion: '',
      timeGroup: '',
      timeGroupAlert: '',
      occupationStartDate: null,
      occupationEndDate: null,
      currentProjectIds: [],
      tenantCount: 0,
      alerts: [],
      operationalStatus: 'On',
      createdAt: now,
      updatedAt: now,
    }

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
    let idCounters = state.idCounters
    let projects = state.projects
    const projectChanges: ProjectLifecycleChange[] = []
    const nextOpportunity: Opportunity = {
      ...opportunity,
      pocProjectIds: [...(opportunity.pocProjectIds ?? [])],
      finalProjectId: opportunity.finalProjectId ?? null,
      wonAt:
        opportunity.stage === 'WON'
          ? savedOpportunity.stage === 'WON'
            ? savedOpportunity.wonAt ?? opportunity.wonAt ?? now
            : now
          : null,
      updatedAt: now,
    }

    const buildProjectPatch = (projectSource: Project['projectSource']) => ({
      opportunityId: nextOpportunity.opportunityId,
      projectSource,
      accountName: account?.accountName ?? '',
      mainType: projectSource === 'POC' ? 'POC' : nextOpportunity.type,
      subType: projectSource === 'POC' ? 'NONE' : projectSubTypeForOpportunity(nextOpportunity),
      deliveryDate: nextOpportunity.deliveryDate,
      dealOwner: salesManager?.name ?? '',
      opportunityName: nextOpportunity.opportunityName,
      canceledAt: null,
      updatedAt: now,
    })

    const updateProjectFromOpportunity = (existingProject: Project, projectSource: Project['projectSource']): Project => {
      const project = {
        ...existingProject,
        ...buildProjectPatch(projectSource),
      }
      projects = projects.map((candidate) => (candidate.id === existingProject.id ? project : candidate))
      projectChanges.push({ projectId: project.id, changeStatus: 'Updated' })
      return project
    }

    const createProjectFromOpportunity = (projectSource: Project['projectSource']): Project => {
      const nextProjectId = incrementCounter(idCounters, 'pid')
      idCounters = nextProjectId.counters
      const project: Project = {
        id: `proj-${crypto.randomUUID()}`,
        pid: nextProjectId.id,
        ...buildProjectPatch(projectSource),
        progressStatus: 'OPEN',
        createdAt: now,
        updatedAt: now,
      }
      projects = [project, ...projects]
      projectChanges.push({ projectId: project.id, changeStatus: 'New' })
      return project
    }

    if (nextOpportunity.stage !== 'WON' && nextOpportunity.type === 'POC') {
      const pocProjects = findLinkedPocProjects(nextOpportunity, savedOpportunity, projects)
      const activePocProject = pocProjects.find((project) => project.progressStatus !== 'DONE')

      if (activePocProject && options?.pocAction === 'UPDATE_EXISTING_POC') {
        updateProjectFromOpportunity(activePocProject, 'POC')
      } else if (!activePocProject || options?.pocAction === 'CREATE_NEW_POC') {
        const project = createProjectFromOpportunity('POC')
        nextOpportunity.pocProjectIds = uniqueValues([...nextOpportunity.pocProjectIds, project.id])
      }
    }

    if (nextOpportunity.stage === 'WON' && nextOpportunity.type !== 'POC') {
      const finalProject = findFinalProject(nextOpportunity, savedOpportunity, projects)

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

    set((currentState) => ({
      idCounters,
      projects,
      projectLifecycleChangesByOpportunityId: {
        ...currentState.projectLifecycleChangesByOpportunityId,
        [nextOpportunity.id]: projectChanges,
      },
      opportunities: currentState.opportunities.map((candidate) =>
        candidate.id === savedOpportunity.id ? nextOpportunity : candidate,
      ),
    }))
    get().saveToStorage()
    return { opportunity: nextOpportunity, projectChanges }
  },

  createSystem: () => {
    const state = get()
    const nextSystemId = incrementCounter(state.idCounters, 'sid')
    const idCounters = nextSystemId.counters
    const nextSid = nextSystemId.id
    const now = new Date().toISOString()

    const system: AppDataState['systems'][number] = {
      id: `sys-${crypto.randomUUID()}`,
      accountId: null,
      salesManagerId: null,
      sid: nextSid,
      deliveryPid: '',
      machineId: null,
      systemClass: 'CUSTOMER',
      purpose: 'CUSTOMER',
      availability: 'AVAILABLE',
      tenantIds: [],
      productType: 'Tangles',
      hostingType: 'Cloud',
      cloudPlatform: 'AWS',
      csp: 'Automate IT',
      cloudRegion: 'us-east-1 (N. Virginia)',
      region: '',
      country: '',
      state: '',
      timeGroup: '',
      operationalStatus: '',
      createdAt: now,
      updatedAt: now,
    }

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
    if (!project) return { ok: false, message: 'Project not found.' }
    if (project.mainType === 'POC') return { ok: false, message: 'POC projects cannot allocate Production Inventory.' }
    if (!productionSystem) return { ok: false, message: 'Production system not found.' }
    if (activeProjectSystemLinks(state.projectSystems).some((link) => link.systemId === productionSystemId)) {
      return { ok: false, message: 'Production system is already actively allocated.' }
    }
    if (activeProjectSystemLinks(state.projectSystems).some((link) => link.projectId === projectId && link.systemId === productionSystemId)) {
      return { ok: false, message: 'This system is already allocated to the project.' }
    }

    const now = new Date().toISOString()
    const tenantIds: string[] = []

    const allocatedSystem = {
      ...productionSystem,
      accountId: null,
      salesManagerId: null,
      machineId: null,
      systemClass: 'CUSTOMER' as const,
      availability: 'OCCUPIED' as const,
      linkedProjectIds: [projectId],
      tenantIds,
      createdAt: productionSystem.createdAt,
      updatedAt: now,
    }
    const allocation: ProjectSystemLink = {
      id: `alloc-${crypto.randomUUID()}`,
      projectId,
      systemId: allocatedSystem.id,
      tenantIds,
      allocationStatus: 'ALLOCATED',
      allocationType: 'PRODUCTION',
      sourceMachineId: null,
      allocatedAt: now,
      deallocatedAt: null,
    }

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
    if (!project) return { ok: false, message: 'Project not found.' }
    if (project.mainType !== 'POC') return { ok: false, message: 'Delivery and Renewal projects cannot allocate Reused Internal Systems.' }
    if (!reusedSystem) return { ok: false, message: 'Reused internal system not found.' }
    if (reusedSystem.status === 'Occupied') return { ok: false, message: 'Reused internal system is already occupied.' }
    if (activeProjectSystemLinks(state.projectSystems).some((link) => link.projectId === projectId && link.sourceMachineId === reusedSystem.machineId)) {
      return { ok: false, message: 'This MID is already allocated to the project.' }
    }

    const now = new Date().toISOString()
    const nextSystemId = incrementCounter(state.idCounters, 'sid')
    const idCounters = nextSystemId.counters
    const tenantIds: string[] = []
    const allocatedSystemId = `sys-${crypto.randomUUID()}`

    const allocatedSystem = {
      id: allocatedSystemId,
      accountId: null,
      salesManagerId: null,
      sid: nextSystemId.id,
      deliveryPid: project.pid,
      machineId: reusedSystem.machineId,
      source: 'Reused Internal Systems' as const,
      linkedProjectIds: [projectId],
      tenantIds,
      systemClass: 'POC_DEMO_TRAINING' as const,
      purpose: reusedSystem.purpose,
      availability: 'OCCUPIED' as const,
      logo: reusedSystem.logo,
      url: reusedSystem.url,
      cognitoRegion: reusedSystem.cognitoRegion,
      productType: reusedSystem.productType,
      hostingType: reusedSystem.hostingType,
      cloudPlatform: reusedSystem.cloudPlatform,
      csp: reusedSystem.csp,
      cloudRegion: reusedSystem.cloudRegion,
      mapCenter: reusedSystem.mapCenter,
      performanceTier: reusedSystem.performanceTier,
      vpnEnabled: reusedSystem.vpnEnabled,
      vpnType: reusedSystem.vpnType,
      ipRestrictionEnabled: reusedSystem.ipRestrictionEnabled,
      region: reusedSystem.usedInRegion,
      country: '',
      state: '',
      timeGroup: reusedSystem.timeGroup,
      timeGroupAlert: reusedSystem.timeGroupAlert,
      operationalStatus: reusedSystem.operationalStatus,
      createdAt: now,
      updatedAt: now,
    }
    const allocation: ProjectSystemLink = {
      id: `alloc-${crypto.randomUUID()}`,
      projectId,
      systemId: allocatedSystem.id,
      tenantIds,
      allocationStatus: 'ALLOCATED',
      allocationType: 'REUSED_INTERNAL',
      sourceMachineId: reusedSystem.machineId,
      allocatedAt: now,
      deallocatedAt: null,
    }

    set((current) => ({
      idCounters,
      reusedInternalSystems: current.reusedInternalSystems.map((candidate) =>
        candidate.id === reusedSystemId
          ? {
              ...candidate,
              status: 'Occupied',
              currentProjectIds: Array.from(new Set([...candidate.currentProjectIds, projectId])),
              occupationStartDate: candidate.occupationStartDate ?? now,
              occupationEndDate: null,
              updatedAt: now,
            }
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
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const system = state.systems.find((candidate) => candidate.id === systemId)
    if (!project) return { ok: false, message: 'Project not found.' }
    if (project.mainType === 'POC') return { ok: false, message: 'POC projects cannot link existing production systems in F1.' }
    if (!system) return { ok: false, message: 'Existing system not found.' }
    if (activeProjectSystemLinks(state.projectSystems).some((link) => link.projectId === projectId && link.systemId === systemId)) {
      return { ok: false, message: 'This system is already allocated to the project.' }
    }

    const now = new Date().toISOString()
    const tenantIds: string[] = []

    const allocation: ProjectSystemLink = {
      id: `alloc-${crypto.randomUUID()}`,
      projectId,
      systemId,
      tenantIds,
      allocationStatus: 'ALLOCATED',
      allocationType: 'EXISTING_SYSTEM',
      sourceMachineId: null,
      allocatedAt: now,
      deallocatedAt: null,
    }

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
    if (!allocation) return { ok: false, message: 'Allocation not found.' }
    if (allocation.allocationStatus === 'DEALLOCATED') return { ok: false, message: 'Allocation is already deallocated.' }
    const now = new Date().toISOString()

    set((current) => ({
      projectSystems: current.projectSystems.map((candidate) =>
        candidate.id === allocationId
          ? { ...candidate, allocationStatus: 'DEALLOCATED', deallocatedAt: now }
          : candidate,
      ),
      projectTenants: current.projectTenants.map((candidate) =>
        candidate.projectId === allocation.projectId && candidate.systemId === allocation.systemId && candidate.allocationStatus !== 'DEALLOCATED'
          ? { ...candidate, allocationStatus: 'DEALLOCATED', deallocatedAt: now }
          : candidate,
      ),
      systems: current.systems.map((system) =>
        system.id === allocation.systemId
          ? {
              ...system,
              linkedProjectIds: (system.linkedProjectIds ?? []).filter((projectId) => projectId !== allocation.projectId),
              updatedAt: now,
            }
          : system,
      ),
      reusedInternalSystems: current.reusedInternalSystems.map((system) =>
        allocation.allocationType === 'REUSED_INTERNAL' && system.machineId === allocation.sourceMachineId
          ? {
              ...system,
              status: 'Available',
              currentProjectIds: system.currentProjectIds.filter((projectId) => projectId !== allocation.projectId),
              occupationEndDate: now,
              updatedAt: now,
            }
          : system,
      ),
    }))
    get().saveToStorage()
    return { ok: true, message: 'System deallocated from project.', allocationId }
  },
}))
