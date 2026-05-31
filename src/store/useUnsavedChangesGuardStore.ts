import { create } from 'zustand'

interface PendingNavigation {
  targetPath: string
}

type SaveUnsavedDashboardChangesHandler = (onSuccess?: () => void) => void

interface UnsavedChangesGuardStore {
  hasUnsavedDashboardChanges: boolean
  pendingNavigation: PendingNavigation | null
  saveUnsavedDashboardChanges: SaveUnsavedDashboardChangesHandler | null
  setHasUnsavedDashboardChanges: (hasUnsavedDashboardChanges: boolean) => void
  requestNavigation: (targetPath: string) => void
  clearPendingNavigation: () => void
  setSaveUnsavedDashboardChanges: (saveUnsavedDashboardChanges: SaveUnsavedDashboardChangesHandler | null) => void
}

export const useUnsavedChangesGuardStore = create<UnsavedChangesGuardStore>((set) => ({
  hasUnsavedDashboardChanges: false,
  pendingNavigation: null,
  saveUnsavedDashboardChanges: null,
  setHasUnsavedDashboardChanges: (hasUnsavedDashboardChanges) => set({ hasUnsavedDashboardChanges }),
  requestNavigation: (targetPath) => set({ pendingNavigation: { targetPath } }),
  clearPendingNavigation: () => set({ pendingNavigation: null }),
  setSaveUnsavedDashboardChanges: (saveUnsavedDashboardChanges) => set({ saveUnsavedDashboardChanges }),
}))