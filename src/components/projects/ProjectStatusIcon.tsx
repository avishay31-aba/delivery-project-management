import { projectStatusLabel } from '@/domain/project-lifecycle'
import { projectStatusPresentation } from '@/domain/status-presentation'

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
    <span className="inline-flex items-center gap-1.5 text-sf-text" title={presentation.tooltip}>
      <Icon className={['h-4 w-4 stroke-[3]', presentation.iconClassName].join(' ')} aria-hidden="true" />
      {showLabel ? <span>{projectStatusLabel(String(status ?? ''))}</span> : null}
    </span>
  )
}
