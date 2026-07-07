import type { ClipboardEvent } from 'react'

function toDateInputValue(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.valueOf())) return null

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function handleDateInputPaste(event: ClipboardEvent<HTMLInputElement>, onValue: (value: string) => void) {
  const value = toDateInputValue(event.clipboardData.getData('text'))
  if (!value) return
  event.preventDefault()
  onValue(value)
}
