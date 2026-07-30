import type { ReactNode } from 'react'

interface FormFieldProps {
  label: ReactNode
  children: ReactNode
  controlWidthClassName?: string
  className?: string
  required?: boolean
  error?: ReactNode
  helperText?: ReactNode
  fieldId?: string
  errorId?: string
  renderAs?: 'label' | 'div'
}

export function RequiredFieldMarker() {
  return <span className="ml-0.5 text-red-600" aria-label="required">*</span>
}

export function FormField({
  label,
  children,
  controlWidthClassName = 'w-40',
  className = '',
  required = false,
  error,
  helperText,
  fieldId,
  errorId,
  renderAs = 'label',
}: FormFieldProps) {
  const Wrapper = renderAs
  const resolvedErrorId = errorId ?? (fieldId ? `${fieldId}-error` : undefined)
  const resolvedHelperId = helperText && fieldId ? `${fieldId}-helper` : undefined

  return (
    <Wrapper className={`inline-grid w-max items-start gap-1 align-top text-sm ${className}`}>
      <span className="max-w-none whitespace-nowrap font-medium text-sf-text-muted">
        {label}
        {required ? <RequiredFieldMarker /> : null}
      </span>
      <span className={`${controlWidthClassName} block`} data-invalid={Boolean(error) || undefined}>
        {children}
      </span>
      {helperText ? (
        <span id={resolvedHelperId} className={`${controlWidthClassName} text-xs text-sf-text-muted`}>
          {helperText}
        </span>
      ) : null}
      {error ? (
        <span id={resolvedErrorId} className={`${controlWidthClassName} text-xs font-medium text-red-700`} role="alert">
          {error}
        </span>
      ) : null}
    </Wrapper>
  )
}
