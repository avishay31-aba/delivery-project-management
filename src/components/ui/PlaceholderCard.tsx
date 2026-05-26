import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface PlaceholderCardProps {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function PlaceholderCard({
  title,
  description,
  children,
  className,
}: PlaceholderCardProps) {
  return (
    <div className={cn('sf-card p-6', className)}>
      <h2 className="text-lg font-semibold text-sf-text">{title}</h2>
      {description && (
        <p className="mt-2 text-sm text-sf-text-muted">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
