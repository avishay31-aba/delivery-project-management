import { cn } from '@/utils/cn'
import { progressPresentation } from '@/domain/status-presentation'

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function ProgressBar({
  value,
  showPercent = true,
  className,
  barClassName,
}: {
  value: number
  showPercent?: boolean
  className?: string
  barClassName?: string
}) {
  const percent = clampPercent(value)
  const presentation = progressPresentation(percent)

  return (
    <div className={cn('min-w-24', className)}>
      <div className={cn(presentation.heightClassName, presentation.trackClassName, barClassName)}>
        <div className={cn('h-full', presentation.fillClassName)} style={{ width: `${percent}%` }} />
      </div>
      {showPercent ? <span className="mt-1 block text-center text-xs text-sf-text-muted">{percent}%</span> : null}
    </div>
  )
}
