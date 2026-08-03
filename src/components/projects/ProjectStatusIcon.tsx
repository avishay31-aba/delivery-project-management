import { projectStatusLabel } from '@/domain/project-lifecycle'
import { projectStatusPresentation } from '@/domain/status-presentation'
import { cn } from '@/utils/cn'

interface ProjectStatusIconProps {
  status: string | null | undefined
  showLabel?: boolean
  large?: boolean
}

export function ProjectStatusIcon({ status, showLabel = true, large = false }: ProjectStatusIconProps) {
  const presentation = projectStatusPresentation(status)
  const Icon = presentation.icon
  if (large) {
    return <Icon className={['h-8 w-8 stroke-[3.5]', presentation.iconClassName].join(' ')} aria-label={presentation.tooltip} />
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide',
        presentation.badgeClassName,
      )}
      title={presentation.tooltip}
    >
      <Icon className={['h-4 w-4 stroke-[3]', presentation.iconClassName].join(' ')} aria-hidden="true" />
      {showLabel ? <span>{projectStatusLabel(String(status ?? ''))}</span> : null}
    </span>
  )
}
