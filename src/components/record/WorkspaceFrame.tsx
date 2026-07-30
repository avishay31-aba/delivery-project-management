import type { ReactNode } from 'react'

interface WorkspaceFrameProps {
  children: ReactNode
  className?: string
}

interface WorkspaceScrollContentProps {
  children: ReactNode
  className?: string
  viewMode?: boolean
}

export function WorkspaceFrame({ children, className = '' }: WorkspaceFrameProps) {
  return (
    <div className={['flex h-full min-h-0 min-w-0 flex-col overflow-hidden', className].filter(Boolean).join(' ')}>
      {children}
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
      {children}
    </div>
  )
}
