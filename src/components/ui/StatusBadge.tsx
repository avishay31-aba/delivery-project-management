import { cn } from '@/utils/cn'

type BadgeVariant = 'default' | 'open' | 'in_progress' | 'done' | 'warning' | 'error'

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-800',
  open: 'bg-gray-200 text-gray-800',
  in_progress: 'bg-blue-100 text-sf-brand-dark',
  done: 'bg-green-100 text-sf-success',
  warning: 'bg-orange-100 text-orange-800',
  error: 'bg-red-100 text-sf-error',
}

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
}

export function StatusBadge({
  label,
  variant = 'default',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        variantClasses[variant],
        className,
      )}
    >
      {label}
    </span>
  )
}
