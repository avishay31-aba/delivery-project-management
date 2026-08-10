import { useAppStore } from '@/store/useAppStore'
import type { System } from '@/data/seed.types'
import { reusedInternalMachineIdsEqual } from '@/domain/system-inventory'

export const systemsApi = {
  list(): System[] {
    return useAppStore.getState().systems
  },

  getBySid(sid: string): System | undefined {
    return useAppStore.getState().systems.find((s) => s.sid === sid)
  },

  getByMachineId(machineId: string): System | undefined {
    return useAppStore.getState().systems.find((s) => reusedInternalMachineIdsEqual(s.machineId, machineId))
  },
}
