import type { ReactNode } from 'react'

interface DataDashboardProps {
  title: string
  recordCount: number
  toolbar?: ReactNode
  children: ReactNode
}

/**
 * Shell for list dashboards — table/grid content supplied in Phase B.
 */
export function DataDashboard({
  title,
  recordCount,
  toolbar,
  children,
}: DataDashboardProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-sf-text-muted">
          <span className="font-semibold text-sf-text">{title}</span>
          {' · '}
          Showing {recordCount} record{recordCount === 1 ? '' : 's'}
        </p>
        {toolbar}
      </div>
      <div className="sf-card overflow-hidden">{children}</div>
    </div>
  )
}
