import type { ReactNode } from 'react'

interface TableSectionProps {
  title: string
  description?: string
  actions?: ReactNode
  toolbar?: ReactNode
  children: ReactNode
  className?: string
}

export function TableSection({ title, description, actions, toolbar, children, className = 'space-y-3' }: TableSectionProps) {
  return (
    <section className={className}>
      <div className="space-y-2">
        <div>
          <h3 className="text-lg font-semibold text-sf-text">{title}</h3>
          {description ? <p className="text-sm text-sf-text-muted">{description}</p> : null}
        </div>
        {actions || toolbar ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0 flex-1">{toolbar}</div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  )
}
