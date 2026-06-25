import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { mainNavigation } from '@/config/navigation'
import { cn } from '@/utils/cn'
import { useUnsavedChangesGuardStore } from '@/store/useUnsavedChangesGuardStore'

export function Sidebar() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const hasUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.hasUnsavedDashboardChanges)
  const requestNavigation = useUnsavedChangesGuardStore((state) => state.requestNavigation)

  return (
    <aside className={cn('flex shrink-0 flex-col bg-sf-sidebar text-white transition-[width]', collapsed ? 'w-16' : 'w-56')}>
      <div className={cn('flex items-start justify-between gap-2 border-b border-white/10 px-4 py-4', collapsed && 'px-3')}>
        <div className={cn(collapsed && 'sr-only')}>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Delivery PM
          </p>
          <p className="mt-1 text-sm font-medium">Console</p>
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/15 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label={collapsed ? 'Expand navigation menu' : 'Collapse navigation menu'}
          title={collapsed ? 'Expand' : 'Collapse'}
          onClick={() => setCollapsed((current) => !current)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      <nav className={cn('flex-1 space-y-1 p-3', collapsed && 'px-2')} aria-label="Main navigation">
        {mainNavigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path || (item.path !== '/systems' && pathname.startsWith(`${item.path}/`))
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              onClick={(event) => {
                if (hasUnsavedDashboardChanges && pathname !== item.path) {
                  event.preventDefault()
                  requestNavigation(item.path)
                }
              }}
              className={() =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  collapsed && 'justify-center px-2',
                  isActive
                    ? 'bg-sf-sidebar-active text-white'
                    : 'text-white/85 hover:bg-sf-sidebar-hover hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className={cn('border-t border-white/10 p-3 text-xs text-white/60', collapsed && 'sr-only')}>
        MVP - Phase A
      </div>
    </aside>
  )
}
