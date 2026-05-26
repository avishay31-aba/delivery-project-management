import { useAppStore } from '@/store/useAppStore'
import type { Tenant } from '@/data/seed.types'

export const tenantsApi = {
  list(): Tenant[] {
    return useAppStore.getState().tenants
  },

  getByTid(tid: string): Tenant | undefined {
    return useAppStore.getState().tenants.find((t) => t.tid === tid)
  },
}
