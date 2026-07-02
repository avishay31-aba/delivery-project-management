import type { ReactNode } from 'react'

interface FormFieldProps {
  label: ReactNode
  children: ReactNode
  controlWidthClassName?: string
  className?: string
  required?: boolean
}

export function FormField({ label, children, controlWidthClassName = 'w-40', className = '', required = false }: FormFieldProps) {
  return (
    <label className={`inline-grid w-max items-start gap-1 align-top text-sm ${className}`}>
      <span className="max-w-none whitespace-nowrap font-medium text-sf-text-muted">
        {label}
        {required ? <span className="ml-0.5 text-red-600">*</span> : null}
      </span>
      <span className={`${controlWidthClassName} block`}>{children}</span>
    </label>
  )
}
