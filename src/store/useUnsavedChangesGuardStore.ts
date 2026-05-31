import { create } from 'zustand'

interface PendingNavigation {
  targetPath: string
}

interface UnsavedChangesGuardStore {
  hasUnsavedDashboardChanges: boolean
  pendingNavigation: PendingNavigation | null
  setHasUnsavedDashboardChanges: (hasUnsavedDashboardChanges: boolean) => void
  requestNavigation: (targetPath: string) => void
  clearPendingNavigation: () => void
}

export const useUnsavedChangesGuardStore = create<UnsavedChangesGuardStore>((set) => ({
  hasUnsavedDashboardChanges: false,
  pendingNavigation: null,
  setHasUnsavedDashboardChanges: (hasUnsavedDashboardChanges) => set({ hasUnsavedDashboardChanges }),
  requestNavigation: (targetPath) => set({ pendingNavigation: { targetPath } }),
  clearPendingNavigation: () => set({ pendingNavigation: null }),
}))