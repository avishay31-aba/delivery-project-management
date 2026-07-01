import { NavLink, useLocation } from 'react-router-dom'
import { ProductionSystemInventoryPage } from './ProductionSystemInventoryPage'
import { ReusedInternalSystemsInventoryPage } from './ReusedInternalSystemsInventoryPage'
import { SystemListPage } from './SystemListPage'

const SYSTEMS_WORKSPACE_TABS = [
  { label: 'Allocated Systems', path: '/systems' },
  { label: 'Production Inventory', path: '/systems/production-inventory' },
  { label: 'Reused Internal Systems', path: '/systems/reused-internal' },
]

function activeSystemsWorkspaceView(pathname: string) {
  if (pathname.startsWith('/systems/production-inventory')) return 'production'
  if (pathname.startsWith('/systems/reused-internal')) return 'reused'
  return 'allocated'
}

export function SystemsWorkspacePage() {
  const { pathname } = useLocation()
  const activeView = activeSystemsWorkspaceView(pathname)

  return (
    <div className="space-y-4">
      <div className="border-b border-sf-border">
        <nav className="flex flex-wrap gap-2" aria-label="Systems Workspace views">
          {SYSTEMS_WORKSPACE_TABS.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.path === '/systems'}
              className={({ isActive }) =>
                [
                  'rounded-t border border-b-0 px-3 py-2 text-sm font-medium',
                  isActive
                    ? 'border-sf-border bg-white text-sf-text'
                    : 'border-transparent text-sf-text-muted hover:border-sf-border hover:bg-white',
                ].join(' ')
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {activeView === 'production' ? <ProductionSystemInventoryPage /> : null}
      {activeView === 'reused' ? <ReusedInternalSystemsInventoryPage /> : null}
      {activeView === 'allocated' ? <SystemListPage /> : null}
    </div>
  )
}
