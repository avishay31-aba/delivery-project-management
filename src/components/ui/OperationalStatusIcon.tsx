import { operationalStatusPresentation } from '@/domain/status-presentation'
import { cn } from '@/utils/cn'

export function OperationalStatusIcon({
  status,
  className,
  showLabel = false,
  wrapperClassName,
  labelClassName,
}: {
  status: string | null | undefined
  className?: string
  showLabel?: boolean
  wrapperClassName?: string
  labelClassName?: string
}) {
  const presentation = operationalStatusPresentation(status)
  const Icon = presentation.icon

  if (showLabel) {
    return (
      <span className={cn('inline-flex items-center gap-1', wrapperClassName)} title={presentation.tooltip}>
        <Icon
          className={cn('h-4 w-4 shrink-0 stroke-[2.5]', presentation.iconClassName, className)}
          aria-hidden="true"
        />
        <span className={labelClassName}>{presentation.label}</span>
      </span>
    )
  }

  return (
    <Icon
      className={cn('h-9 w-9 shrink-0 stroke-[3]', presentation.iconClassName, className)}
      aria-label={presentation.tooltip}
    />
  )
}
