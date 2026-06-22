import { cn } from '@/utils/cn'

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
  const fillClassName = percent >= 100 ? 'bg-blue-900' : 'bg-amber-500'

  return (
    <div className={cn('min-w-24', className)}>
      <div className={cn('h-4 overflow-hidden rounded-full bg-sf-surface-alt', barClassName)}>
        <div className={cn('h-full', fillClassName)} style={{ width: `${percent}%` }} />
      </div>
      {showPercent ? <span className="mt-1 block text-center text-xs text-sf-text-muted">{percent}%</span> : null}
    </div>
  )
}
