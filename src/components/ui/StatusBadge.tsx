import { cn } from '@/utils/cn'
import { statusBadgePresentation, type StatusBadgeVariant } from '@/domain/status-presentation'

interface StatusBadgeProps {
  label: string
  variant?: StatusBadgeVariant
  className?: string
}

export function StatusBadge({
  label,
  variant = 'default',
  className,
}: StatusBadgeProps) {
  const presentation = statusBadgePresentation(variant)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        presentation.badgeClassName,
        className,
      )}
    >
      {label}
    </span>
  )
}
