import { cn } from '@/utils/cn'
import { maintenanceStatusPresentation } from '@/domain/status-presentation'

interface MaintenanceStatusPresentationProps {
  status: string | null | undefined
  label?: string
  tooltip?: string
  className?: string
}

export function MaintenanceStatusPresentation({
  status,
  label,
  tooltip,
  className,
}: MaintenanceStatusPresentationProps) {
  const presentation = maintenanceStatusPresentation(status)
  const Icon = presentation.icon
  const displayLabel = label ?? presentation.label
  const displayTooltip = tooltip ?? presentation.tooltip

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold',
        presentation.badgeClassName,
        className,
      )}
      title={displayTooltip}
      aria-label={displayTooltip}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0 stroke-[2.5]', presentation.iconClassName)} aria-hidden="true" />
      <span>{displayLabel}</span>
    </span>
  )
}
