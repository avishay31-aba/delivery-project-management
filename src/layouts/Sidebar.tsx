import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { consoleNavigation, type NavItem } from '@/config/navigation'
import { cn } from '@/utils/cn'
import { useUnsavedChangesGuardStore } from '@/store/useUnsavedChangesGuardStore'

function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (!item.path) return item.children?.some((child) => isNavItemActive(pathname, child)) ?? false
  return pathname === item.path || (item.path !== '/systems' && pathname.startsWith(`${item.path}/`))
}

export function Sidebar() {
  const { pathname } = useLocation()
  const [collapsed, setCollapsed] = useState(false)
  const hasUnsavedDashboardChanges = useUnsavedChangesGuardStore((state) => state.hasUnsavedDashboardChanges)
  const requestNavigation = useUnsavedChangesGuardStore((state) => state.requestNavigation)

  return (
    <aside className={cn('flex shrink-0 flex-col bg-sf-sidebar text-white transition-[width]', collapsed ? 'w-16' : 'w-64')}>
      <div className={cn('flex items-start justify-between gap-2 border-b border-white/10 px-4 py-4', collapsed && 'px-3')}>
        <div className={cn(collapsed && 'sr-only')}>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            ERP
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

      <nav className={cn('flex-1 space-y-4 overflow-y-auto p-3', collapsed && 'space-y-2 px-2')} aria-label="Main navigation">
        {consoleNavigation.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className={cn('px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white/50', collapsed && 'sr-only')}>
              {group.label}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon
              const isActive = isNavItemActive(pathname, item)
              if (!item.path) {
                return (
                  <div key={item.label} className="space-y-1">
                    <div
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-white/85',
                        collapsed && 'justify-center px-2',
                        isActive && 'bg-white/5 text-white',
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className={cn(collapsed && 'sr-only')}>{item.label}</span>
                    </div>
                    <div className={cn('space-y-1 pl-4', collapsed && 'pl-0')}>
                      {item.children?.map((child) => {
                        const ChildIcon = child.icon
                        const childIsActive = isNavItemActive(pathname, child)
                        return (
                          <NavLink
                            key={child.path}
                            to={child.path ?? '#'}
                            title={collapsed ? child.label : undefined}
                            onClick={(event) => {
                              if (child.path && hasUnsavedDashboardChanges && pathname !== child.path) {
                                event.preventDefault()
                                requestNavigation(child.path)
                              }
                            }}
                            className={() =>
                              cn(
                                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                collapsed && 'justify-center px-2',
                                childIsActive
                                  ? 'bg-sf-sidebar-active text-white'
                                  : 'text-white/75 hover:bg-sf-sidebar-hover hover:text-white',
                              )
                            }
                          >
                            <ChildIcon className="h-4 w-4 shrink-0" aria-hidden />
                            <span className={cn(collapsed && 'sr-only')}>{child.label}</span>
                          </NavLink>
                        )
                      })}
                    </div>
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={collapsed ? item.label : undefined}
                  onClick={(event) => {
                    if (item.path && hasUnsavedDashboardChanges && pathname !== item.path) {
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
          </div>
        ))}
      </nav>

      <div className={cn('border-t border-white/10 p-3 text-xs text-white/60', collapsed && 'sr-only')}>
        Phase B - Product Completion
      </div>
    </aside>
  )
}
