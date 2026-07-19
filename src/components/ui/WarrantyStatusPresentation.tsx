import { cn } from '@/utils/cn'
import { warrantyStatusPresentation } from '@/domain/status-presentation'

interface WarrantyStatusPresentationProps {
  status: string | null | undefined
  className?: string
}

export function WarrantyStatusPresentation({
  status,
  className,
}: WarrantyStatusPresentationProps) {
  const presentation = warrantyStatusPresentation(status)
  const Icon = presentation.icon

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold',
        presentation.badgeClassName,
        className,
      )}
      title={presentation.tooltip}
      aria-label={presentation.tooltip}
    >
      <Icon className={cn('h-3.5 w-3.5 shrink-0 stroke-[2.5]', presentation.iconClassName)} aria-hidden="true" />
      <span>{presentation.label}</span>
    </span>
  )
}
