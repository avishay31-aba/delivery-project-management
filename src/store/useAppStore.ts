import { create } from 'zustand'
import type { AppDataState, OpportunitySubType, OpportunityType } from '@/data/seed.types'
import { incrementCounter } from '@/data/id-generator'
import {
  createInitialState,
  loadPersistedState,
  persistState,
  clearPersistedState,
} from '@/store/persistence'

interface AppStore extends AppDataState {
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
  createSystem: () => AppDataState['systems'][number]
  createTenant: () => AppDataState['tenants'][number]
}

export const useAppStore = create<AppStore>((set, get) => ({
  ...createInitialState(),
  hydrated: false,

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
    set({ ...createInitialState(), hydrated: true })
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

  createSystem: () => {
    const state = get()
    const { counters: idCounters, id: nextSid } = incrementCounter(state.idCounters, 'sid')
    const now = new Date().toISOString()

    const system: AppDataState['systems'][number] = {
      id: `sys-${crypto.randomUUID()}`,
      accountId: null,
      salesManagerId: null,
      sid: nextSid,
      machineId: null,
      systemClass: 'CUSTOMER',
      purpose: 'CUSTOMER',
      availability: 'AVAILABLE',
      productType: '',
      hostingType: '',
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
      accountId: state.accounts[0]?.id ?? '',
      systemId: defaultSystemId,
      tenantType: 'CUSTOMER',
      accountName: '',
      country: '',
      timeGroup: '',
      operationalStatus: '',
      productType: '',
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
