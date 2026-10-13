import { Pencil } from 'lucide-react'

export const EDIT_ACTION_LABEL = 'Edit'

export function EditActionIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return <Pencil className={className} aria-hidden="true" />
}
