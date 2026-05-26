import { useAppStore } from '@/store/useAppStore'

interface TopHeaderProps {
  title?: string
}

export function TopHeader({ title = 'Delivery Project Management' }: TopHeaderProps) {
  const lastPersistedAt = useAppStore((s) => s.lastPersistedAt)
  const saveToStorage = useAppStore((s) => s.saveToStorage)
  const resetToSeed = useAppStore((s) => s.resetToSeed)

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-sf-border bg-sf-header px-6">
      <div>
        <h1 className="text-base font-semibold text-sf-text">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {lastPersistedAt && (
          <span className="hidden text-xs text-sf-text-muted sm:inline">
            Saved {new Date(lastPersistedAt).toLocaleString()}
          </span>
        )}
        <button
          type="button"
          onClick={() => saveToStorage()}
          className="rounded border border-sf-border bg-sf-surface px-3 py-1.5 text-xs font-medium text-sf-text hover:bg-sf-surface-alt"
        >
          Save to browser
        </button>
        <button
          type="button"
          onClick={() => resetToSeed()}
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
          <span className="text-sm text-sf-text">Demo User</span>
        </div>
      </div>
    </header>
  )
}
