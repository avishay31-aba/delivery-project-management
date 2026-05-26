import { Link } from 'react-router-dom'
import { cn } from '@/utils/cn'

interface LinkIdProps {
  to: string
  children: string
  className?: string
}

/** Salesforce-style record ID link (PID / SID / TID). */
export function LinkId({ to, children, className }: LinkIdProps) {
  return (
    <Link
      to={to}
      className={cn(
        'font-semibold text-sf-brand hover:text-sf-brand-dark hover:underline',
        className,
      )}
    >
      {children}
    </Link>
  )
}
