import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from '@/layouts/Sidebar'
import { TopHeader } from '@/layouts/TopHeader'
import { mainNavigation } from '@/config/navigation'

function resolveHeaderTitle(pathname: string): string {
  const match = mainNavigation.find((item) => pathname.startsWith(item.path))
  return match ? match.label : 'Delivery Project Management'
}

export function AppShell() {
  const { pathname } = useLocation()
  const headerTitle = resolveHeaderTitle(pathname)

  return (
    <div className="flex h-full min-h-screen">
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
