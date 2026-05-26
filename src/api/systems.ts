import { useAppStore } from '@/store/useAppStore'
import type { System } from '@/data/seed.types'

export const systemsApi = {
  list(): System[] {
    return useAppStore.getState().systems
  },

  getBySid(sid: string): System | undefined {
    return useAppStore.getState().systems.find((s) => s.sid === sid)
  },

  getByMachineId(machineId: string): System | undefined {
    return useAppStore.getState().systems.find((s) => s.machineId === machineId)
  },
}
