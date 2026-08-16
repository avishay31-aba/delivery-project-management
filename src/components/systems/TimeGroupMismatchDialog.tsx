export type TimeGroupMismatchAction = 'CONTINUE' | 'CHANGE'

export function TimeGroupMismatchDialog({ message, onContinue, onCancel, onChange }: {
  message: string
  onContinue: () => void
  onCancel: () => void
  onChange: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/35 p-4" role="presentation">
      <div className="w-full max-w-lg rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl" role="dialog" aria-modal="true" aria-labelledby="time-group-mismatch-title">
        <h2 id="time-group-mismatch-title" className="text-lg font-semibold">Time Group mismatch</h2>
        <p className="mt-2 whitespace-pre-line text-sf-text-muted">{message}</p>
        <div className="mt-4 rounded border border-sf-border bg-sf-surface-alt p-3 text-xs text-sf-text-muted">
          <p><strong>Continue:</strong> add the Tenant and keep the current System Time Group.</p>
          <p><strong>Cancel:</strong> do not add the Tenant or change the System.</p>
          <p><strong>Change:</strong> add the Tenant and replace the System Time Group with the incoming Tenant Time Group.</p>
        </div>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 hover:bg-sf-surface-alt" onClick={onContinue}>Continue</button>
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 hover:bg-sf-surface-alt" onClick={onCancel}>Cancel</button>
          <button type="button" className="rounded bg-sf-brand px-3 py-1.5 font-semibold text-white hover:bg-blue-700" onClick={onChange}>Change</button>
        </div>
      </div>
    </div>
  )
}
