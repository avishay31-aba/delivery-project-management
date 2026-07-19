import type { ReactNode } from 'react'

interface HeaderReadonlyValueProps {
  children: ReactNode
}

export function HeaderReadonlyValue({ children }: HeaderReadonlyValueProps) {
  return (
    <div className="min-h-8 px-2 py-1 text-sm text-sf-text">
      {children || '-'}
    </div>
  )
}
