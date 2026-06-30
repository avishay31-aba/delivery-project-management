import { cn } from '@/utils/cn'
import { alertStatusPresentation, type AlertPresentationVariant } from '@/domain/status-presentation'

export type AlertStatusIconVariant = AlertPresentationVariant

export function AlertStatusIcon({
  variant,
  label,
  className,
}: {
  variant: AlertStatusIconVariant
  label?: string
  className?: string
}) {
  const presentation = alertStatusPresentation(variant)
  const Icon = presentation.icon

  return (
    <Icon
      className={cn('h-4 w-4 shrink-0 stroke-[2.5]', presentation.iconClassName, className)}
      aria-label={label ?? presentation.tooltip}
    />
  )
}
