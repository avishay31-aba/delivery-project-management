import type { ReactNode } from 'react'

interface ReadonlyFieldProps {
  label: ReactNode
  value: ReactNode
  className?: string
}

export function ReadonlyField({ label, value, className = '' }: ReadonlyFieldProps) {
  return (
    <div className={`inline-grid w-max items-start gap-1 align-top text-sm ${className}`}>
      <span className="max-w-none whitespace-nowrap font-medium text-sf-text-muted">{label}</span>
      <span className="min-h-7 text-sm font-medium text-sf-text">{value || '-'}</span>
    </div>
  )
}
