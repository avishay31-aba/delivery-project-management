import { AlertTriangle, CheckCircle2, Info, OctagonAlert } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

export type AlertStatusIconVariant = 'danger' | 'warning' | 'info' | 'success'

const variantConfig: Record<AlertStatusIconVariant, { icon: LucideIcon; className: string; label: string }> = {
  danger: { icon: OctagonAlert, className: 'text-red-700', label: 'Danger' },
  warning: { icon: AlertTriangle, className: 'text-amber-600', label: 'Warning' },
  info: { icon: Info, className: 'text-sf-brand', label: 'Information' },
  success: { icon: CheckCircle2, className: 'text-sf-success', label: 'Success' },
}

export function AlertStatusIcon({
  variant,
  label,
  className,
}: {
  variant: AlertStatusIconVariant
  label?: string
  className?: string
}) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Icon
      className={cn('h-4 w-4 shrink-0 stroke-[2.5]', config.className, className)}
      aria-label={label ?? config.label}
    />
  )
}
