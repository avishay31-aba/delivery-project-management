import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Sidebar } from '@/layouts/Sidebar'
import { TopHeader } from '@/layouts/TopHeader'
import { mainNavigation } from '@/config/navigation'
import { UnsavedChangesDialog } from '@/components/dashboard/UnsavedChangesDialog'
import { useUnsavedChangesGuardStore } from '@/store/useUnsavedChangesGuardStore'

function resolveHeaderTitle(pathname: string): string {
  const match = mainNavigation.find((item) => pathname.startsWith(item.path))
  return match ? match.label : 'Delivery Project Management'
}

export function AppShell() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pendingNavigation = useUnsavedChangesGuardStore((state) => state.pendingNavigation)
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

  return (
    <div className="flex h-full min-h-screen">
      {pendingNavigation ? (
        <UnsavedChangesDialog onDiscardChanges={discardChangesAndNavigate} onCancel={clearPendingNavigation} />
      ) : null}
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader title={headerTitle} />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}