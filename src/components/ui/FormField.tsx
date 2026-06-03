import type { ReactNode } from 'react'

interface FormFieldProps {
  label: ReactNode
  children: ReactNode
  controlWidthClassName?: string
  className?: string
}

export function FormField({ label, children, controlWidthClassName = 'w-40', className = '' }: FormFieldProps) {
  return (
    <label className={`inline-grid w-max items-start gap-1 align-top text-sm ${className}`}>
      <span className="max-w-none whitespace-nowrap font-medium text-sf-text-muted">{label}</span>
      <span className={`${controlWidthClassName} min-w-full`}>{children}</span>
    </label>
  )
}
