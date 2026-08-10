import type { ClipboardEvent, WheelEvent } from 'react'

interface BusinessNumericInputProps {
  value: number | null | undefined
  min?: number
  max?: number
  className?: string
  ariaLabel?: string
  label?: string
  disabled?: boolean
  onChange: (value: number | null) => void
  onInvalidValue?: (message: string) => void
}

function parseBusinessNumber(rawValue: string): number | null {
  const value = rawValue.trim()
  if (!value) return null
  if (!/^-?\d+$/.test(value)) return Number.NaN
  return Number(value)
}

export function BusinessNumericInput({
  value,
  min = 1,
  max = 99,
  className = 'h-9 w-14 rounded border border-sf-border px-2 py-1 text-center disabled:bg-sf-surface-alt disabled:text-sf-text-muted',
  ariaLabel,
  label = 'Value',
  disabled = false,
  onChange,
  onInvalidValue,
}: BusinessNumericInputProps) {
  function commit(rawValue: string) {
    const parsed = parseBusinessNumber(rawValue)
    if (parsed === null) {
      onChange(null)
      return
    }
    if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
      onInvalidValue?.(`${label} must be between ${min} and ${max}.`)
      return
    }
    onChange(parsed)
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
      inputMode="numeric"
      pattern="-?[0-9]*"
      aria-label={ariaLabel}
      className={className}
      disabled={disabled}
      value={value ?? ''}
      onWheel={handleWheel}
      onPaste={handlePaste}
      onKeyDown={(event) => {
        const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
        if (allowed.includes(event.key) || event.ctrlKey || event.metaKey) return
        if (!/^[\d-]$/.test(event.key)) {
          event.preventDefault()
        }
      }}
      onChange={(event) => commit(event.target.value)}
    />
  )
}
