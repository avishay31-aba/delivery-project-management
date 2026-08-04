import type { ClipboardEvent, WheelEvent } from 'react'

interface BusinessNumericInputProps {
  value: number | null | undefined
  min?: number
  max?: number
  className?: string
  ariaLabel?: string
  onChange: (value: number | null) => void
}

function normalizeBusinessNumber(rawValue: string, min: number, max: number): number | null {
  const digits = rawValue.replace(/\D/g, '').slice(0, 2)
  if (!digits) return null
  const value = Math.min(max, Math.max(min, Number(digits)))
  return Number.isFinite(value) ? value : null
}

export function BusinessNumericInput({
  value,
  min = 1,
  max = 99,
  className = 'h-9 w-full rounded border border-sf-border px-2 py-1',
  ariaLabel,
  onChange,
}: BusinessNumericInputProps) {
  function commit(rawValue: string) {
    onChange(normalizeBusinessNumber(rawValue, min, max))
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    commit(event.clipboardData.getData('text'))
  }

  function handleWheel(event: WheelEvent<HTMLInputElement>) {
    event.currentTarget.blur()
  }

  return (
    <input
      type="number"
      min={min}
      max={max}
      maxLength={2}
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      className={className}
      value={value ?? ''}
      onWheel={handleWheel}
      onPaste={handlePaste}
      onKeyDown={(event) => {
        const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
        if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return
        if (!/^\d$/.test(event.key)) {
          event.preventDefault()
          return
        }
        const target = event.currentTarget
        const selectedLength = Math.max(0, (target.selectionEnd ?? 0) - (target.selectionStart ?? 0))
        if (target.value.length - selectedLength >= 2) event.preventDefault()
      }}
      onChange={(event) => commit(event.target.value)}
    />
  )
}
