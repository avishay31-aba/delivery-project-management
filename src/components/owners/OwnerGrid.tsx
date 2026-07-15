import { Edit2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createOwnerRecord, type OwnerRecord } from '@/domain/owners'
import { EditableChildObjectActionButton } from '@/components/child-objects'

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

export function OwnerGrid({ owners, onChange, readOnly = false }: OwnerGridProps) {
  const [editingOwnerIds, setEditingOwnerIds] = useState<string[]>([])

  function addOwner() {
    const owner = createOwnerRecord()
    onChange([...owners, owner])
    setEditingOwnerIds((current) => [...current, owner.id])
  }

  function updateOwner(id: string, key: keyof OwnerRecord, value: string) {
    onChange(owners.map((owner) => (owner.id === id ? { ...owner, [key]: value } : owner)))
  }

  function deleteOwner(id: string) {
    onChange(owners.filter((owner) => owner.id !== id))
    setEditingOwnerIds((current) => current.filter((ownerId) => ownerId !== id))
  }

  function setEditing(id: string, editing: boolean) {
    setEditingOwnerIds((current) =>
      editing
        ? Array.from(new Set([...current, id]))
        : current.filter((ownerId) => ownerId !== id),
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-sf-text">Owner</h3>
        {readOnly ? null : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm font-semibold hover:bg-sf-surface-alt"
            onClick={addOwner}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add owner
          </button>
        )}
      </div>

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
            {owners.map((owner) => {
              const isEditing = !readOnly && editingOwnerIds.includes(owner.id)
              return (
                <tr key={owner.id} className="hover:bg-sf-surface-alt">
                  {readOnly ? null : (
                    <td className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top">
                      <div className="flex flex-wrap gap-1">
                        <EditableChildObjectActionButton
                          onClick={() => setEditing(owner.id, !isEditing)}
                        >
                          <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          {isEditing ? 'Done' : 'Edit'}
                        </EditableChildObjectActionButton>
                        <EditableChildObjectActionButton
                          variant="danger"
                          onClick={() => deleteOwner(owner.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Delete
                        </EditableChildObjectActionButton>
                      </div>
                    </td>
                  )}
                  {OWNER_COLUMNS.map((column) => (
                    <td key={column.key} className="whitespace-nowrap border border-sf-border px-1.5 py-1 align-top text-sf-text">
                      {isEditing ? (
                        <input
                          className={`${column.widthClassName} h-8 rounded border border-sf-border px-2 py-1 text-sm`}
                          value={owner[column.key]}
                          onChange={(event) => updateOwner(owner.id, column.key, event.target.value)}
                        />
                      ) : (
                        owner[column.key]
                      )}
                    </td>
                  ))}
                </tr>
              )
            })}
            {owners.length === 0 ? (
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
