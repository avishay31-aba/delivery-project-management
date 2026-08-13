import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'

interface WorkspaceFrameProps {
  children: ReactNode
  className?: string
}

interface WorkspaceScrollContentProps {
  children: ReactNode
  className?: string
  viewMode?: boolean
}

export interface WorkspaceTabDefinition {
  label: string
  path?: string
  id?: string
}

interface WorkspaceTabsProps {
  tabs: WorkspaceTabDefinition[]
  ariaLabel: string
  activeId?: string
  onSelect?: (id: string) => void
}

export function WorkspaceFrame({ children, className = '' }: WorkspaceFrameProps) {
  return (
    <div className={['flex h-full min-h-0 min-w-0 flex-col overflow-hidden', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

function workspaceTabClassName(isActive: boolean): string {
  return [
    'rounded-t border border-b-0 px-3 py-2 text-sm font-medium',
    isActive
      ? 'border-sf-border bg-white text-sf-text'
      : 'border-transparent text-sf-text-muted hover:border-sf-border hover:bg-white',
  ].join(' ')
}

export function WorkspaceTabs({ tabs, ariaLabel, activeId, onSelect }: WorkspaceTabsProps) {
  return (
    <div className="shrink-0 border-b border-sf-border bg-sf-surface">
      <nav className="flex flex-wrap gap-2" aria-label={ariaLabel}>
        {tabs.map((tab) => {
          if (tab.path) {
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                end
                className={({ isActive }) => workspaceTabClassName(isActive)}
              >
                {tab.label}
              </NavLink>
            )
          }
          const id = tab.id ?? tab.label
          return (
            <button
              key={id}
              type="button"
              className={workspaceTabClassName(activeId === id)}
              onClick={() => onSelect?.(id)}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}

export function WorkspaceScrollContent({ children, className = '', viewMode = false }: WorkspaceScrollContentProps) {
  return (
    <div
      className={[
        'sf-form-content-scroll min-h-0 min-w-0 flex-1 pb-2 pr-1',
        viewMode ? 'sf-view-mode' : '',
        className,
      ].filter(Boolean).join(' ')}
      tabIndex={0}
    >
      <div className="min-w-[64rem]">{children}</div>
    </div>
  )
}
