import { Loader2 } from 'lucide-react'

export function SaveButtonLabel({ saving, label = 'Save' }: { saving: boolean; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
      <span>{saving ? 'Saving...' : label}</span>
    </span>
  )
}
