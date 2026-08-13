import { Repeat2 } from 'lucide-react'

export function RecurrenceIndicator({ recurring, done = false, className = '' }: { recurring: boolean; done?: boolean; className?: string }) {
  if (!recurring) return null

  const label = done ? 'Recurring task – Done' : 'Recurring task'

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center text-sf-brand ${className}`.trim()}
      title={label}
      aria-label={label}
    >
      <Repeat2 className="h-4 w-4" aria-hidden="true" />
      {done ? <span className="absolute h-px w-5 -rotate-45 bg-current" aria-hidden="true" /> : null}
    </span>
  )
}
