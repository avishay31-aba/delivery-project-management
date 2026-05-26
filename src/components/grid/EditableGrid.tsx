import type { ReactNode } from 'react'
import { PlaceholderCard } from '@/components/ui/PlaceholderCard'

interface EditableGridProps {
  title?: string
  description?: string
  footer?: ReactNode
}

/**
 * Placeholder for TanStack Table inline-edit grids (Phase B).
 */
export function EditableGrid({ title, description, footer }: EditableGridProps) {
  return (
    <PlaceholderCard title={title ?? 'Editable grid'} description={description}>
      <div className="rounded border border-dashed border-sf-border bg-sf-surface-alt px-4 py-8 text-center text-sm text-sf-text-muted">
        Grid component — Phase B
      </div>
      {footer}
    </PlaceholderCard>
  )
}
