interface UnsavedChangesDialogProps {
  onDiscardChanges: () => void
  onCancel: () => void
  onSave?: () => void
}

export function UnsavedChangesDialog({ onDiscardChanges, onCancel, onSave }: UnsavedChangesDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="presentation">
      <div
        className="w-full max-w-sm rounded border border-sf-border bg-white p-4 text-sm text-sf-text shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="unsaved-dashboard-changes-title"
      >
        <h2 id="unsaved-dashboard-changes-title" className="text-base font-semibold">
          You have unsaved changes.
        </h2>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 hover:bg-sf-surface-alt disabled:cursor-not-allowed disabled:text-sf-text-muted disabled:hover:bg-white"
            disabled={!onSave}
            title={onSave ? 'Save changes before continuing' : 'Save is not available'}
            onClick={onSave}
          >
            Save
          </button>
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 hover:bg-sf-surface-alt"
            onClick={onDiscardChanges}
          >
            Discard Changes
          </button>
          <button
            type="button"
            className="rounded border border-sf-border bg-white px-3 py-1 hover:bg-sf-surface-alt"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}