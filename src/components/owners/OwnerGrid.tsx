import { Edit2, Plus, Save, Trash2, X } from 'lucide-react'
import { createOwnerRecord, type OwnerRecord } from '@/domain/owners'
import {
  EditableChildObjectActionButton,
  editableChildObjectPermissions,
  useEditableChildObjectEditor,
} from '@/components/child-objects'

interface OwnerGridProps {
  owners: OwnerRecord[]
  onChange: (owners: OwnerRecord[]) => void
  readOnly?: boolean
}

const OWNER_COLUMNS: Array<{ key: keyof OwnerRecord; label: string; widthClassName: string }> = [
  { key: 'userId', label: 'User ID', widthClassName: 'w-36' },
  { key: 'userName', label: 'User name', widthClassName: 'w-44' },
  { key: 'fullName', label: 'Full name', widthClassName: 'w-52' },
  { key: 'title', label: 'Title', widthClassName: 'w-48' },
  { key: 'company', label: 'Company', widthClassName: 'w-52' },
  { key: 'phoneNumber', label: 'Phone number', widthClassName: 'w-44' },
  { key: 'email', label: 'Email', widthClassName: 'w-64' },
]

function normalizedOwner(owner: OwnerRecord) {
  return OWNER_COLUMNS.reduce<Record<string, string>>((values, column) => {
    values[column.key] = String(owner[column.key] ?? '').trim()
    return values
  }, {})
}

function hasMeaningfulOwnerValue(owner: OwnerRecord): boolean {
  return Object.values(normalizedOwner(owner)).some(Boolean)
}

export function OwnerGrid({ owners, onChange, readOnly = false }: OwnerGridProps) {
  const editor = useEditableChildObjectEditor<OwnerRecord>()
  const permissions = editableChildObjectPermissions({ readOnly })
  const renderedOwners = [
    ...owners,
    ...editor.newDrafts.filter((draft) => !owners.some((owner) => owner.id === draft.id)),
  ]

  function addOwner() {
    editor.beginAdd(createOwnerRecord())
  }

  function saveOwner(id: string) {
    editor.save(id, {
      normalize: normalizedOwner,
      isMeaningfulNewDraft: hasMeaningfulOwnerValue,
      commit: (draft) => {
        const committedOwner = { ...draft }
        onChange(
          owners.some((owner) => owner.id === draft.id)
            ? owners.map((owner) => (owner.id === draft.id ? committedOwner : owner))
            : [...owners, committedOwner],
        )
      },
      successMessage: 'Owner saved.',
    })
  }

  function cancelOwner(id: string) {
    const shouldConfirmDiscard = editor.isNew(id) && editor.hasChanges(id, {
      isMeaningfulNewDraft: hasMeaningfulOwnerValue,
    })
    if (shouldConfirmDiscard) {
      editor.commitDelete(id, {
        commit: () => undefined,
        discardMessage: 'Discard this unsaved Owner draft?\n\nThe entered changes will be lost.',
      })
      return
    }
    editor.cancel(id)
  }

  function deleteOwner(id: string) {
    editor.commitDelete(id, {
      confirmMessage: 'Delete this Owner record?\n\nThis change will be saved immediately and cannot be undone.',
      commit: () => onChange(owners.filter((owner) => owner.id !== id)),
      successMessage: 'Owner deleted.',
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-sf-text">Owner</h3>
        {permissions.canAdd ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt"
            onClick={addOwner}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add owner
          </button>
        ) : null}
      </div>

      {editor.notification ? (
        <div
          className={[
            'rounded border px-3 py-2 text-sm',
            editor.notification.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
          role="status"
        >
          {editor.notification.message}
        </div>
      ) : null}

      <div className="sf-scroll-x rounded border border-sf-border bg-white">
        <table className="w-max min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {readOnly ? null : (
                <th className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                  Actions
                </th>
              )}
              {OWNER_COLUMNS.map((column) => (
                <th key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderedOwners.map((owner) => {
              const draft = editor.draftFor(owner.id)
              const rowOwner = draft ?? owner
              const isEditing = !readOnly && Boolean(draft)
              const isSaving = editor.isSaving(owner.id)
              const isDeleting = editor.isDeleting(owner.id)
              const canSave = editor.canSave(owner.id, {
                normalize: normalizedOwner,
                isMeaningfulNewDraft: hasMeaningfulOwnerValue,
              })
              return (
                <tr key={owner.id} className="hover:bg-sf-surface-alt">
                  {readOnly ? null : (
                    <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                      <div className="flex flex-wrap gap-1">
                        {isEditing ? (
                          <>
                            <EditableChildObjectActionButton
                              variant="primary"
                              disabled={isSaving || !canSave}
                              onClick={() => saveOwner(owner.id)}
                            >
                              <Save className="h-3.5 w-3.5" aria-hidden="true" />
                              {isSaving ? 'Saving...' : 'Save'}
                            </EditableChildObjectActionButton>
                            <EditableChildObjectActionButton
                              disabled={isSaving || isDeleting}
                              onClick={() => cancelOwner(owner.id)}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Cancel
                            </EditableChildObjectActionButton>
                          </>
                        ) : (
                          <>
                            {permissions.canEdit ? (
                              <EditableChildObjectActionButton onClick={() => editor.beginEdit(owner)}>
                                <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                                Edit
                              </EditableChildObjectActionButton>
                            ) : null}
                            {permissions.canDelete ? (
                              <EditableChildObjectActionButton
                                variant="danger"
                                disabled={isDeleting}
                                onClick={() => deleteOwner(owner.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                              </EditableChildObjectActionButton>
                            ) : null}
                          </>
                        )}
                      </div>
                    </td>
                  )}
                  {OWNER_COLUMNS.map((column) => (
                    <td key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                      {isEditing ? (
                        <input
                          className={`${column.widthClassName} h-8 rounded border border-sf-border px-2 py-1 text-sm`}
                          value={rowOwner[column.key]}
                          onChange={(event) => editor.updateDraft(owner.id, { [column.key]: event.target.value } as Partial<OwnerRecord>)}
                        />
                      ) : (
                        rowOwner[column.key]
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
            {renderedOwners.length === 0 ? (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={readOnly ? OWNER_COLUMNS.length : OWNER_COLUMNS.length + 1}>
                  No owners yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
