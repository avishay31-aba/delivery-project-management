import { cn } from '@/utils/cn'
import { maintenanceStatusPresentation } from '@/domain/status-presentation'

interface MaintenanceStatusPresentationProps {
  status: string | string[] | null | undefined
  label?: string
  tooltip?: string
  className?: string
}

function SingleMaintenanceStatusPresentation({
  status,
  label,
  tooltip,
  className,
}: {
  status: string | null | undefined
  label?: string
  tooltip?: string
  className?: string
}) {
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

export function MaintenanceStatusPresentation({
  status,
  label,
  tooltip,
  className,
}: MaintenanceStatusPresentationProps) {
  if (Array.isArray(status)) {
    const statuses = status.length > 0 ? status : ['None']
    return (
      <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
        {statuses.map((item) => (
          <SingleMaintenanceStatusPresentation key={item} status={item} />
        ))}
      </span>
    )
  }

  return <SingleMaintenanceStatusPresentation status={status} label={label} tooltip={tooltip} className={className} />
}
