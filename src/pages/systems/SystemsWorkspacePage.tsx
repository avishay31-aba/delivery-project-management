import { useLocation } from 'react-router-dom'
import { WorkspaceFrame, WorkspaceTabs } from '@/components/record'
import { ProductionSystemInventoryPage } from './ProductionSystemInventoryPage'
import { ReusedInternalSystemsInventoryPage } from './ReusedInternalSystemsInventoryPage'
import { SystemListPage } from './SystemListPage'

const SYSTEMS_WORKSPACE_TABS = [
  { label: 'Allocated Systems', path: '/systems' },
  { label: 'Production Inventory', path: '/systems/production-inventory' },
  { label: 'Reused Internal Systems', path: '/systems/reused-internal' },
  { label: 'Cancelled Systems', path: '/systems/cancelled' },
]

function activeSystemsWorkspaceView(pathname: string) {
  if (pathname.startsWith('/systems/cancelled')) return 'cancelled'
  if (pathname.startsWith('/systems/production-inventory')) return 'production'
  if (pathname.startsWith('/systems/reused-internal')) return 'reused'
  return 'allocated'
}

export function SystemsWorkspacePage() {
  const { pathname } = useLocation()
  const activeView = activeSystemsWorkspaceView(pathname)

  return (
    <WorkspaceFrame className="gap-4">
      <WorkspaceTabs tabs={SYSTEMS_WORKSPACE_TABS} ariaLabel="Systems Workspace views" />

      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        {activeView === 'production' ? <ProductionSystemInventoryPage /> : null}
        {activeView === 'reused' ? <ReusedInternalSystemsInventoryPage /> : null}
        {activeView === 'allocated' ? <SystemListPage /> : null}
        {activeView === 'cancelled' ? <SystemListPage mode="cancelled" /> : null}
      </div>
    </WorkspaceFrame>
  )
}
