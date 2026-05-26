import { NavLink } from 'react-router-dom'
import { mainNavigation } from '@/config/navigation'
import { cn } from '@/utils/cn'

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col bg-sf-sidebar text-white">
      <div className="border-b border-white/10 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
          Delivery PM
        </p>
        <p className="mt-1 text-sm font-medium">Console</p>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {mainNavigation.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-sf-sidebar-active text-white'
                    : 'text-white/85 hover:bg-sf-sidebar-hover hover:text-white',
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              <span>{item.label}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3 text-xs text-white/60">
        MVP · Phase A
      </div>
    </aside>
  )
}
