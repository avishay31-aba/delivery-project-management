export type TenantTimeGroupMismatchAction = 'continue' | 'cancel' | 'change'

export function TenantTimeGroupMismatchDialog({ currentTimeGroup, incomingTimeGroup, onAction }: {
  currentTimeGroup: string
  incomingTimeGroup: string
  onAction: (action: TenantTimeGroupMismatchAction) => void
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <section className="w-full max-w-2xl rounded border border-sf-border bg-white p-5 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="time-group-mismatch-title">
        <h2 id="time-group-mismatch-title" className="text-lg font-semibold text-sf-text">Tenant and System Time Groups differ</h2>
        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="font-semibold">Current System Time Group</dt><dd>{currentTimeGroup || '-'}</dd>
          <dt className="font-semibold">Incoming Tenant Time Group</dt><dd>{incomingTimeGroup || '-'}</dd>
        </dl>
        <div className="mt-4 space-y-2 text-sm text-sf-text">
          <p><strong>Continue:</strong> add the Tenant and keep the current System Time Group. The Tenant keeps its independently derived geography and Time Group.</p>
          <p><strong>Cancel:</strong> make no change; no Tenant or hosting relationship is created.</p>
          <p><strong>Change:</strong> atomically add the Tenant and replace System Time Group governance with this Tenant.</p>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded border border-sf-border bg-white px-3 py-1.5 text-sm" onClick={() => onAction('cancel')}>Cancel</button>
          <button type="button" className="rounded border border-sf-brand bg-white px-3 py-1.5 text-sm text-sf-brand" onClick={() => onAction('continue')}>Continue</button>
          <button type="button" className="rounded bg-sf-brand px-3 py-1.5 text-sm font-semibold text-white" onClick={() => onAction('change')}>Change</button>
        </div>
      </section>
    </div>
  )
}
