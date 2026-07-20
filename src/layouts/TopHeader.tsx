import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { formatDateTime } from '@/domain/date-time-presentation'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'

interface TopHeaderProps {
  title?: string
}

export function TopHeader({ title = 'Delivery Project Management' }: TopHeaderProps) {
  const lastPersistedAt = useAppStore((s) => s.lastPersistedAt)
  const saveToStorage = useAppStore((s) => s.saveToStorage)
  const resetToSeed = useAppStore((s) => s.resetToSeed)
  const [message, setMessage] = useState('')

  function saveBrowserState() {
    saveToStorage()
    setMessage('Browser data saved.')
  }

  function resetBrowserState() {
    if (!window.confirm('Reset local ERP data to the seed dataset?\n\nThis will replace the current browser data immediately and cannot be undone.')) return
    resetToSeed()
    setMessage('Seed dataset restored.')
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-sf-border bg-sf-header px-6">
      <div>
        <h1 className="text-base font-semibold text-sf-text">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {message ? <span className="hidden text-xs font-medium text-green-700 sm:inline" role="status">{message}</span> : null}
        {lastPersistedAt && (
          <span className="hidden text-xs text-sf-text-muted sm:inline">
            Saved {formatDateTime(lastPersistedAt)}
          </span>
        )}
        <button
          type="button"
          onClick={saveBrowserState}
          className="rounded border border-sf-border bg-sf-surface px-3 py-1.5 text-xs font-medium text-sf-text hover:bg-sf-surface-alt"
        >
          Save to browser
        </button>
        <button
          type="button"
          onClick={resetBrowserState}
          className="rounded border border-sf-border bg-sf-surface px-3 py-1.5 text-xs font-medium text-sf-text-muted hover:bg-sf-surface-alt"
        >
          Reset seed
        </button>
        <div className="flex items-center gap-2 border-l border-sf-border pl-4">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-sf-brand text-xs font-bold text-white"
            aria-hidden
          >
            DU
          </div>
          <span className="text-sm text-sf-text">{CURRENT_USER_DISPLAY_NAME}</span>
        </div>
      </div>
    </header>
  )
}
