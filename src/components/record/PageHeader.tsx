import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-sf-border bg-sf-surface px-1 pb-4">
      <div>
        <h1 className="text-xl font-semibold text-sf-text">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm text-sf-text-muted">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
