import { cn } from '@/utils/cn'
import { taskStatusPresentation } from '@/domain/status-presentation'

interface TaskStatusPresentationProps {
  status: string | null | undefined
  label?: string
  className?: string
}

export function TaskStatusPresentation({ status, label, className }: TaskStatusPresentationProps) {
  const presentation = taskStatusPresentation(status)
  const Icon = presentation.icon
  const isInProgress = presentation.key === 'in-progress'

  return (
    <span
      className={cn('inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-sf-text', className)}
      title={presentation.tooltip}
      aria-label={presentation.tooltip}
    >
      <span className={cn(isInProgress && 'inline-flex h-5 w-5 items-center justify-center rounded-full border-2 border-dotted border-orange-400')}>
        <Icon className={cn(isInProgress ? 'h-3.5 w-3.5 stroke-[2.5]' : 'h-4 w-4 stroke-[3]', presentation.iconClassName)} aria-hidden="true" />
      </span>
      {label === '' ? null : <span>{label ?? presentation.label}</span>}
    </span>
  )
}
