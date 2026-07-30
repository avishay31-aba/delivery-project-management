import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/layouts/Sidebar'
import { TopHeader } from '@/layouts/TopHeader'
import { mainNavigation } from '@/config/navigation'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { useUnsavedChangesGuardStore } from '@/store/useUnsavedChangesGuardStore'
import { useDraggableDialogs } from '@/hooks/useDraggableDialogs'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'

function resolveHeaderTitle(pathname: string): string {
  const match = mainNavigation
    .filter((item) => pathname === item.path || pathname.startsWith(`${item.path}/`))
    .sort((first, second) => second.path.length - first.path.length)[0]
  return match ? match.label : 'Delivery Project Management'
}

export function AppShell() {
  useDraggableDialogs()
  const regionalDateFormat = useDateTimePresentationPreference()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pendingNavigation = useUnsavedChangesGuardStore((state) => state.pendingNavigation)
  const saveUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.saveUnsavedDashboardChanges)
  const clearPendingNavigation = useUnsavedChangesGuardStore((state) => state.clearPendingNavigation)
  const setHasUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.setHasUnsavedDashboardChanges)
  const headerTitle = resolveHeaderTitle(pathname)

  function discardChangesAndNavigate() {
    if (!pendingNavigation) return

    const targetPath = pendingNavigation.targetPath
    setHasUnsavedDashboardChanges(false)
    clearPendingNavigation()
    navigate(targetPath)
  }

  function saveChangesAndNavigate() {
    if (!pendingNavigation || !saveUnsavedDashboardChanges) return

    const targetPath = pendingNavigation.targetPath
    saveUnsavedDashboardChanges(() => {
      clearPendingNavigation()
      navigate(targetPath)
    })
  }

  return (
    <div className="flex h-screen min-h-0 overflow-hidden">
      {pendingNavigation ? (
        <UnsavedChangesDialog
          onSave={saveUnsavedDashboardChanges ? saveChangesAndNavigate : undefined}
          onDiscardChanges={discardChangesAndNavigate}
          onCancel={clearPendingNavigation}
        />
      ) : null}
      <Sidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col" data-regional-date-format={regionalDateFormat}>
        <TopHeader title={headerTitle} />
        <main className="min-h-0 min-w-0 flex-1 overflow-hidden p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
