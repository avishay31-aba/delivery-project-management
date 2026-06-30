import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface LinkIdProps {
  to: string
  children?: ReactNode
  className?: string
  title?: string
}

/** Salesforce-style record ID link (PID / SID / TID). */
export function LinkId({ to, children, className, title }: LinkIdProps) {
  return (
    <Link
      to={to}
      title={title}
      className={cn(
        'font-semibold text-sf-brand hover:text-sf-brand-dark hover:underline',
        className,
      )}
    >
      {children}
    </Link>
  )
}
