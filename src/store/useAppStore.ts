import { create } from 'zustand'
import type { AppDataState } from '@/data/seed.types'
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
projects: state.projects,
systems: state.systems,
tenants: state.tenants,
projectSystems: state.projectSystems,
projectTenants: state.projectTenants,
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

createProject: () => {
const state = get()
const maxPid = state.projects.reduce((max, p) => {
const n = Number.parseInt(p.pid.replace(/^P/, ''), 10)
return Number.isFinite(n) ? Math.max(max, n) : max
}, 999)
const nextPid = `P${maxPid + 1}`
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

set((s) => ({ projects: [project, ...s.projects] }))
get().saveToStorage()
return project
},

createSystem: () => {
const state = get()
const maxSid = state.systems.reduce((max, s) => {
const n = Number.parseInt((s.sid ?? '').replace(/^S/, ''), 10)
return Number.isFinite(n) ? Math.max(max, n) : max
}, 999)
const nextSid = `S${maxSid + 1}`
const now = new Date().toISOString()

const system: AppDataState['systems'][number] = {
  id: `sys-${crypto.randomUUID()}`,
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

set((s) => ({ systems: [system, ...s.systems] }))
get().saveToStorage()
return system
},

createTenant: () => {
const state = get()
const maxTid = state.tenants.reduce((max, t) => {
const n = Number.parseInt(t.tid.replace(/^T/, ''), 10)
return Number.isFinite(n) ? Math.max(max, n) : max
}, 999)
const nextTid = `T${maxTid + 1}`
const now = new Date().toISOString()
const defaultSystemId = state.systems[0]?.id ?? ''

const tenant: AppDataState['tenants'][number] = {
  id: `ten-${crypto.randomUUID()}`,
  tid: nextTid,
  systemId: defaultSystemId,
  tenantType: 'CUSTOMER',
  accountName: '',
  country: '',
  timeGroup: '',
  operationalStatus: '',
  productType: '',
  warrantyStatus: 'NOT_SET',
  warrantyEndDate: null,
  pocStartDate: null,
  pocEndDate: null,
  createdAt: now,
  updatedAt: now,
}

set((s) => ({ tenants: [tenant, ...s.tenants] }))
get().saveToStorage()
return tenant
},
}))