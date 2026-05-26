import { useAppStore } from '@/store/useAppStore'
import type { Project } from '@/data/seed.types'

export const projectsApi = {
  list(): Project[] {
    return useAppStore.getState().projects
  },

  getByPid(pid: string): Project | undefined {
    return useAppStore.getState().projects.find((p) => p.pid === pid)
  },
}
