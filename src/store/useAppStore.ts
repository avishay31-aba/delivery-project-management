import { create } from 'zustand'
import type {
  AppDataState,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  Project,
  ProjectSubType,
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
  updateSystem: (id: string, patch: Partial<AppDataState['systems'][number]>) => void
  updateTenant: (id: string, patch: Partial<AppDataState['tenants'][number]>) => void
  updateOpportunity: (id: string, patch: Partial<AppDataState['opportunities'][number]>) => void
  createOpportunity: (type?: OpportunityType, subType?: OpportunitySubType) => AppDataState['opportunities'][number]
  createProject: () => AppDataState['projects'][number]
  saveOpportunityWithProjectSync: (
    opportunity: Opportunity,
    savedOpportunity: Opportunity,
    options?: OpportunityProjectSyncOptions,
  ) => OpportunityProjectSyncResult
  createSystem: () => AppDataState['systems'][number]
  createTenant: () => AppDataState['tenants'][number]
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

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function projectSubTypeForOpportunity(opportunity: Opportunity): ProjectSubType {
  return opportunity.subType === 'FREE' || opportunity.subType === 'PAID' ? 'NONE' : opportunity.subType
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
    const { counters: idCounters, id: nextSid } = incrementCounter(state.idCounters, 'sid')
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
      productType: '',
      hostingType: '',
      cloudPlatform: '',
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
    const defaultSystemId = state.systems[0]?.id ?? ''

    const tenant: AppDataState['tenants'][number] = {
      id: `ten-${crypto.randomUUID()}`,
      tid: nextTid,
      tenantName: `${nextTid} ${state.accounts[0]?.accountName ?? ''}`.trim(),
      accountId: state.accounts[0]?.id ?? '',
      systemId: defaultSystemId,
      deliveryPid: '',
      tenantType: 'CUSTOMER',
      accountName: '',
      country: '',
      timeGroup: '',
      operationalStatus: '',
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
}))
