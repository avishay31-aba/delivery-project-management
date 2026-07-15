import { operationalStatusPresentation } from '@/domain/status-presentation'
import { cn } from '@/utils/cn'

export function OperationalStatusIcon({
  status,
  className,
}: {
  status: string | null | undefined
  className?: string
}) {
  const presentation = operationalStatusPresentation(status)
  const Icon = presentation.icon

  return (
    <Icon
      className={cn('h-9 w-9 shrink-0 stroke-[3]', presentation.iconClassName, className)}
      aria-label={presentation.tooltip}
    />
  )
}
