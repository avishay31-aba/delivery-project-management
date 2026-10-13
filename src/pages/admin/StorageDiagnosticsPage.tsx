import { useMemo, useState } from 'react'
import { Clipboard, RefreshCw, TestTube2 } from 'lucide-react'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import { APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT } from '@/platform/persistence/app-state-repository'
import {
  captureStorageDiagnosticSnapshot,
  persistenceWriteDiagnosticFromSession,
  runStorageWriteProbe,
  type StorageDiagnosticSnapshot,
  type StorageWriteDiagnostic,
  type StorageWriteProbeResult,
} from '@/platform/persistence/storage-diagnostics'

function bytesLabel(value: number): string {
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)} MB`
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${value} B`
}

function copyTextFallback(text: string) {
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

async function copyText(text: string) {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text)
    return
  }
  copyTextFallback(text)
}

function SummaryGrid({ snapshot }: { snapshot: StorageDiagnosticSnapshot }) {
  const items = [
    ['Captured At', snapshot.capturedAt],
    ['Origin', snapshot.origin],
    ['App Version', snapshot.appVersion],
    ['Environment', snapshot.environment],
    ['Git Commit', snapshot.gitCommit],
    ['Persistence Format', snapshot.persistenceFormat],
    ['Legacy Cleanup Active', snapshot.legacyCleanupActive ? 'Yes' : 'No'],
    ['Quota Retry Active', snapshot.quotaRetryActive ? 'Yes' : 'No'],
    ['Total Keys', String(snapshot.summary.totalKeys)],
    ['Total Approx. Usage', bytesLabel(snapshot.summary.totalApproximateBytes)],
    ['DPM Approx. Usage', bytesLabel(snapshot.summary.totalDpmApproximateBytes)],
    ['dpm-mvp-v1 Length', String(snapshot.summary.dpmMvpLength)],
    ['dpm-mvp-v1 Format', snapshot.summary.dpmMvpFormat],
    ['dpm-mvp-v1 Version', snapshot.summary.dpmMvpVersion],
    ['Sync Notification Length', String(snapshot.summary.crossTabNotificationLength)],
    ['Sync Notification Type', snapshot.summary.crossTabNotificationType],
  ]

  return (
    <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
      {items.map(([label, value]) => (
        <div key={label} className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">{label}</dt>
          <dd className="mt-1 break-words font-medium text-sf-text">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function WriteDiagnosticPanel({ diagnostic }: { diagnostic: StorageWriteDiagnostic | null }) {
  if (!diagnostic) {
    return (
      <section className="space-y-2">
        <h2 className="text-base font-semibold text-sf-text">Last Persistence Write</h2>
        <p className="text-sm text-sf-text-muted">No dpm-mvp-v1 write diagnostic has been captured in this browser tab yet.</p>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-sf-text">Last Persistence Write</h2>
      <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Captured At</dt>
          <dd className="mt-1 break-words font-medium">{diagnostic.capturedAt}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Phase</dt>
          <dd className="mt-1 break-words font-medium">{diagnostic.phase}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Proposed Length</dt>
          <dd className="mt-1 font-medium">{diagnostic.proposedValueLength}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Proposed Bytes</dt>
          <dd className="mt-1 font-medium">{bytesLabel(diagnostic.proposedValueApproximateBytes)}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Proposed Format</dt>
          <dd className="mt-1 break-words font-medium">{diagnostic.proposedValueFormat}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Cleanup Ran</dt>
          <dd className="mt-1 font-medium">{diagnostic.obsoleteCleanupRan ? 'Yes' : 'No'}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Removed Keys</dt>
          <dd className="mt-1 break-words font-medium">{diagnostic.cleanupRemovedKeys.length ? diagnostic.cleanupRemovedKeys.join(', ') : '-'}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Error</dt>
          <dd className="mt-1 break-words font-medium">{diagnostic.error ? `${diagnostic.error.name}: ${diagnostic.error.message}` : '-'}</dd>
        </div>
      </dl>
      {diagnostic.usageBefore ? (
        <p className="text-sm text-sf-text-muted">
          Before write: {diagnostic.usageBefore.summary.totalKeys} keys, {bytesLabel(diagnostic.usageBefore.summary.totalApproximateBytes)} total, {bytesLabel(diagnostic.usageBefore.summary.totalDpmApproximateBytes)} DPM.
        </p>
      ) : null}
      {diagnostic.usageAfterCleanup ? (
        <p className="text-sm text-sf-text-muted">
          After cleanup: {diagnostic.usageAfterCleanup.summary.totalKeys} keys, {bytesLabel(diagnostic.usageAfterCleanup.summary.totalApproximateBytes)} total, {bytesLabel(diagnostic.usageAfterCleanup.summary.totalDpmApproximateBytes)} DPM.
        </p>
      ) : null}
    </section>
  )
}

function ProbePanel({ probe }: { probe: StorageWriteProbeResult | null }) {
  if (!probe) return null
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-sf-text">Storage Write Probe</h2>
      <dl className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Tested At</dt>
          <dd className="mt-1 break-words font-medium">{probe.testedAt}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Test Size</dt>
          <dd className="mt-1 font-medium">{bytesLabel(probe.testSize * 2)}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Result</dt>
          <dd className="mt-1 font-medium">{probe.success ? 'Succeeded' : 'Failed'}</dd>
        </div>
        <div className="rounded border border-sf-border bg-white px-3 py-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-sf-text-muted">Exception</dt>
          <dd className="mt-1 break-words font-medium">{probe.exceptionName ? `${probe.exceptionName}: ${probe.exceptionMessage}` : '-'}</dd>
        </div>
      </dl>
      <p className="text-sm text-sf-text-muted">
        Usage before: {bytesLabel(probe.usageBefore.totalApproximateBytes)}. Usage after cleanup: {bytesLabel(probe.usageAfter.totalApproximateBytes)}.
      </p>
    </section>
  )
}

export function StorageDiagnosticsPage() {
  const [snapshot, setSnapshot] = useState(() => captureStorageDiagnosticSnapshot(localStorage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT))
  const [writeDiagnostic, setWriteDiagnostic] = useState(() => persistenceWriteDiagnosticFromSession())
  const [probe, setProbe] = useState<StorageWriteProbeResult | null>(null)
  const [message, setMessage] = useState('')

  const copyPayload = useMemo(() => JSON.stringify({
    snapshot,
    lastPersistenceWrite: writeDiagnostic,
    storageWriteProbe: probe,
  }, null, 2), [probe, snapshot, writeDiagnostic])

  function refreshDiagnostics() {
    setSnapshot(captureStorageDiagnosticSnapshot(localStorage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT))
    setWriteDiagnostic(persistenceWriteDiagnosticFromSession())
    setMessage('Diagnostics refreshed.')
  }

  async function copyDiagnostics() {
    try {
      await copyText(copyPayload)
      setMessage('Diagnostics copied.')
    } catch {
      setMessage('Copy failed. Select the diagnostics text and copy it manually.')
    }
  }

  function testStorageWrite() {
    const result = runStorageWriteProbe(localStorage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT)
    setProbe(result)
    setSnapshot(captureStorageDiagnosticSnapshot(localStorage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT))
    setMessage(result.success ? 'Storage write probe succeeded.' : 'Storage write probe failed.')
  }

  return (
    <WorkspaceFrame>
      <PageHeader
        title="Storage Diagnostics"
        subtitle="Runtime localStorage metadata for quota investigation."
      />
      <WorkspaceDashboardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="inline-flex items-center gap-2 rounded border border-sf-border bg-white px-3 py-2 text-sm font-medium text-sf-text hover:bg-sf-surface-alt" onClick={refreshDiagnostics}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh diagnostics
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded border border-sf-border bg-white px-3 py-2 text-sm font-medium text-sf-text hover:bg-sf-surface-alt" onClick={copyDiagnostics}>
            <Clipboard className="h-4 w-4" aria-hidden />
            Copy diagnostics
          </button>
          <button type="button" className="inline-flex items-center gap-2 rounded border border-sf-border bg-white px-3 py-2 text-sm font-medium text-sf-text hover:bg-sf-surface-alt" onClick={testStorageWrite}>
            <TestTube2 className="h-4 w-4" aria-hidden />
            Test Storage Write
          </button>
          {message ? <span className="text-sm font-medium text-green-700" role="status">{message}</span> : null}
        </div>

        <SummaryGrid snapshot={snapshot} />
        <ProbePanel probe={probe} />
        <WriteDiagnosticPanel diagnostic={writeDiagnostic} />

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-sf-text">localStorage Keys</h2>
          <div className="overflow-auto rounded border border-sf-border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-sf-surface-alt text-xs uppercase tracking-wide text-sf-text-muted">
                <tr>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Chars</th>
                  <th className="px-3 py-2">Approx. Bytes</th>
                  <th className="px-3 py-2">Format / Type</th>
                  <th className="px-3 py-2">Version</th>
                  <th className="px-3 py-2">DPM</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.entries.map((entry) => (
                  <tr key={entry.key} className="border-t border-sf-border">
                    <td className="max-w-96 break-words px-3 py-2 font-mono text-xs">{entry.key}</td>
                    <td className="px-3 py-2 tabular-nums">{entry.length}</td>
                    <td className="px-3 py-2 tabular-nums">{bytesLabel(entry.approximateBytes)}</td>
                    <td className="px-3 py-2">{entry.format}</td>
                    <td className="px-3 py-2">{entry.detectedVersion}</td>
                    <td className="px-3 py-2">{entry.isDpmRelated ? 'Yes' : 'No'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-sf-text">Diagnostics Payload</h2>
          <pre className="max-h-96 overflow-auto rounded border border-sf-border bg-white p-3 text-xs text-sf-text">{copyPayload}</pre>
        </section>
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
