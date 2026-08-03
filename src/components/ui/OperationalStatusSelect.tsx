import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { operationalStatusPresentation } from '@/domain/status-presentation'

function OperationalStatusOption({ value }: { value: string }) {
  const presentation = operationalStatusPresentation(value)
  const Icon = presentation.icon

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 rounded px-1.5 py-0.5 text-sm font-semibold text-sf-text">
      <Icon className={['h-5 w-5 shrink-0 stroke-[3]', presentation.iconClassName].join(' ')} aria-hidden="true" />
      <span className="truncate">{presentation.label}</span>
    </span>
  )
}

export function OperationalStatusSelect({
  value,
  options,
  disabled = false,
  className = '',
  onChange,
}: {
  value: string
  options: string[]
  disabled?: boolean
  className?: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && rootRef.current?.contains(target)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div
      className="relative"
      ref={rootRef}
      onBlur={(event) => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        setOpen(false)
      }}
    >
      <button
        type="button"
        className={['h-9 w-full rounded border border-sf-border bg-white px-2 py-1 text-left text-sm disabled:bg-sf-surface-alt disabled:text-sf-text-muted', className].filter(Boolean).join(' ')}
        disabled={disabled}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex items-center justify-between gap-2">
          <OperationalStatusOption value={value} />
          <ChevronDown className="h-4 w-4 shrink-0 text-sf-text-muted" aria-hidden="true" />
        </span>
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-30 mt-1 w-full rounded border border-sf-border bg-white py-1 shadow-lg">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="flex w-full items-center px-2 py-1 text-left hover:bg-sf-surface-alt focus:bg-sf-surface-alt focus:outline-none"
              onClick={() => {
                onChange(option)
                setOpen(false)
              }}
            >
              <OperationalStatusOption value={option} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
