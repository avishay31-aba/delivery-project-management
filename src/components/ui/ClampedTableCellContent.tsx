import type { ReactNode } from 'react'

interface ClampedTableCellContentProps {
  children: ReactNode
  title?: string
  className?: string
}

export function ClampedTableCellContent({ children, title, className = '' }: ClampedTableCellContentProps) {
  return (
    <span className={['sf-clamped-table-cell', className].filter(Boolean).join(' ')} title={title || undefined}>
      {children}
    </span>
  )
}
