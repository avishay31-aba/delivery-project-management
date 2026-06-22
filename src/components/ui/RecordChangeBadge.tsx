import { cn } from '@/utils/cn'

type RecordChangeState = 'New' | 'Updated'

const CHANGE_BADGE_WINDOW_MS = 48 * 60 * 60 * 1000

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

  if (record.createdAt === record.updatedAt) {
    return nowMs - createdAt <= CHANGE_BADGE_WINDOW_MS ? 'New' : null
  }

  return updatedAt > createdAt && nowMs - updatedAt <= CHANGE_BADGE_WINDOW_MS ? 'Updated' : null
}

export function RecordChangeBadge({
  record,
  className,
  placeholder = false,
}: {
  record: { createdAt?: string; updatedAt?: string }
  className?: string
  placeholder?: boolean
}) {
  const state = recordChangeState(record)
  if (!state) return placeholder ? <span className="block min-w-14" aria-hidden="true" /> : null

  return (
    <span
      className={cn(
        'inline-flex min-w-14 items-center justify-center rounded-full border px-2 py-0.5 text-xs font-semibold',
        state === 'New'
          ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
          : 'border-amber-300 bg-amber-100 text-amber-900',
        className,
      )}
      title={state}
      aria-label={state}
    >
      {state}
    </span>
  )
}
