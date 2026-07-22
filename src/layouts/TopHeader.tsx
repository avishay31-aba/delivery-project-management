import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { formatDateTime } from '@/domain/date-time-presentation'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { buildInformation, buildInformationClipboardText } from '@/domain/build-info/service'

interface TopHeaderProps {
  title?: string
}

export function TopHeader({ title = 'Delivery Project Management' }: TopHeaderProps) {
  const lastPersistedAt = useAppStore((s) => s.lastPersistedAt)
  const saveToStorage = useAppStore((s) => s.saveToStorage)
  const resetToSeed = useAppStore((s) => s.resetToSeed)
  const [message, setMessage] = useState('')
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [isAboutOpen, setIsAboutOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isProfileMenuOpen) return

    function closeProfileMenu(event: MouseEvent) {
      if (!profileMenuRef.current?.contains(event.target as Node)) {
        setIsProfileMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', closeProfileMenu)
    return () => document.removeEventListener('mousedown', closeProfileMenu)
  }, [isProfileMenuOpen])

  function saveBrowserState() {
    saveToStorage()
    setMessage('Browser data saved.')
  }

  function resetBrowserState() {
    if (!window.confirm('Reset local ERP data to the seed dataset?\n\nThis will replace the current browser data immediately and cannot be undone.')) return
    resetToSeed()
    setMessage('Seed dataset restored.')
  }

  async function copyBuildInformation() {
    const text = buildInformationClipboardText()
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = text
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setMessage('Build information copied.')
    } catch {
      setMessage('Copy failed. Select the build information and copy it manually.')
    }
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
        <div ref={profileMenuRef} className="relative border-l border-sf-border pl-4">
          <button
            type="button"
            className="flex items-center gap-2 rounded px-1 py-1 hover:bg-sf-surface-alt"
            aria-haspopup="menu"
            aria-expanded={isProfileMenuOpen}
            onClick={() => setIsProfileMenuOpen((value) => !value)}
          >
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-sf-brand text-xs font-bold text-white"
              aria-hidden
            >
              DU
            </span>
            <span className="text-sm text-sf-text">{CURRENT_USER_DISPLAY_NAME}</span>
          </button>
          {isProfileMenuOpen ? (
            <div className="absolute right-0 top-11 z-30 w-44 rounded border border-sf-border bg-white py-1 text-sm shadow-xl" role="menu">
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sf-text hover:bg-sf-surface-alt"
                role="menuitem"
                onClick={() => {
                  setIsProfileMenuOpen(false)
                  setIsAboutOpen(true)
                }}
              >
                About
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {isAboutOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4">
          <div className="w-full max-w-md rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="false" aria-labelledby="about-dialog-title">
            <div className="flex items-start justify-between gap-4">
              <h2 id="about-dialog-title" className="text-lg font-semibold">About Delivery ERP</h2>
              <button type="button" className="rounded border border-sf-border bg-white px-2 py-1 text-xs hover:bg-sf-surface-alt" onClick={() => setIsAboutOpen(false)}>
                Close
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2">
              <dt className="font-medium text-sf-text-muted">Application</dt>
              <dd>{buildInformation.application}</dd>
              <dt className="font-medium text-sf-text-muted">Version</dt>
              <dd>{buildInformation.version}</dd>
              <dt className="font-medium text-sf-text-muted">Git Commit</dt>
              <dd title={buildInformation.gitCommit}>{buildInformation.shortGitCommit}</dd>
              <dt className="font-medium text-sf-text-muted">Build Date</dt>
              <dd>{buildInformation.buildDateUtc}</dd>
              <dt className="font-medium text-sf-text-muted">Environment</dt>
              <dd>{buildInformation.environment}</dd>
            </dl>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt"
                onClick={copyBuildInformation}
              >
                Copy Build Information
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
