import { cn } from '@/utils/cn'
import { recordChangePresentation } from '@/domain/status-presentation'

type RecordChangeState = 'New' | 'Updated'

const CHANGE_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000
const CREATION_TRANSACTION_GRACE_MS = 1000

function timestampMs(value?: string): number | null {
  if (!value) return null
  const parsed = new Date(value).valueOf()
  return Number.isNaN(parsed) ? null : parsed
}

export function recordChangeState(
  record: { createdAt?: string; updatedAt?: string },
  nowMs = Date.now(),
): RecordChangeState | null {
  const createdAt = timestampMs(record.createdAt)
  const updatedAt = timestampMs(record.updatedAt)
  if (createdAt == null || updatedAt == null) return null

  if (updatedAt - createdAt > CREATION_TRANSACTION_GRACE_MS && nowMs - updatedAt <= CHANGE_BADGE_WINDOW_MS) return 'Updated'

  return nowMs - createdAt <= CHANGE_BADGE_WINDOW_MS ? 'New' : null
}

export function RecordChangeBadge({
  record,
  className,
  placeholder = false,
  labels,
}: {
  record: { createdAt?: string; updatedAt?: string }
  className?: string
  placeholder?: boolean
  labels?: Partial<Record<RecordChangeState, string>>
}) {
  const state = recordChangeState(record)
  if (!state) return placeholder ? <span className="block min-w-14" aria-hidden="true" /> : null
  const label = labels?.[state] ?? state
  const presentation = recordChangePresentation(state)

  return (
    <span
      className={cn(
        'inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        presentation.badgeClassName,
        className,
      )}
      title={label}
      aria-label={label}
    >
      {label}
    </span>
  )
}
