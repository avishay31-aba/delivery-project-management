import { type PointerEvent, type ReactNode, useRef, useState } from 'react'

export interface EditableChildObjectCapabilities {
  readOnly?: boolean
  canAdd?: boolean
  canEdit?: boolean
  canDelete?: boolean
}

export interface EditableChildObjectPermissions {
  canAdd: boolean
  canEdit: boolean
  canDelete: boolean
}

export type EditableChildObjectValidation = string[]

export function editableChildObjectPermissions({
  readOnly = false,
  canAdd = true,
  canEdit = true,
  canDelete = true,
}: EditableChildObjectCapabilities): EditableChildObjectPermissions {
  return {
    canAdd: !readOnly && canAdd,
    canEdit: !readOnly && canEdit,
    canDelete: !readOnly && canDelete,
  }
}

export function useEditableChildObjectEditor<TRecord extends { id: string }>() {
  const [draftsById, setDraftsById] = useState<Record<string, TRecord>>({})
  const [newDraftIds, setNewDraftIds] = useState<string[]>([])
  const [savingIds, setSavingIds] = useState<string[]>([])
  const [errorsById, setErrorsById] = useState<Record<string, EditableChildObjectValidation>>({})
  const draftsRef = useRef<Record<string, TRecord>>({})
  const newDraftIdsRef = useRef<string[]>([])
  const savingIdsRef = useRef<string[]>([])

  function beginAdd(record: TRecord) {
    draftsRef.current = { ...draftsRef.current, [record.id]: record }
    newDraftIdsRef.current = Array.from(new Set([...newDraftIdsRef.current, record.id]))
    setDraftsById((current) => ({ ...current, [record.id]: record }))
    setNewDraftIds(newDraftIdsRef.current)
    setErrorsById((current) => ({ ...current, [record.id]: [] }))
  }

  function beginEdit(record: TRecord) {
    draftsRef.current = { ...draftsRef.current, [record.id]: record }
    setDraftsById((current) => ({ ...current, [record.id]: record }))
    setErrorsById((current) => ({ ...current, [record.id]: [] }))
  }

  function updateDraft(id: string, patch: Partial<TRecord>) {
    const currentDraft = draftsRef.current[id]
    if (currentDraft) {
      draftsRef.current = { ...draftsRef.current, [id]: { ...currentDraft, ...patch } }
    }
    setDraftsById((current) => {
      const draft = current[id]
      if (!draft) return current
      return { ...current, [id]: { ...draft, ...patch } }
    })
    setErrorsById((current) => ({ ...current, [id]: [] }))
  }

  function replaceDraft(record: TRecord) {
    draftsRef.current = { ...draftsRef.current, [record.id]: record }
    setDraftsById((current) => ({ ...current, [record.id]: record }))
    setErrorsById((current) => ({ ...current, [record.id]: [] }))
  }

  function cancel(id: string) {
    const nextDrafts = { ...draftsRef.current }
    delete nextDrafts[id]
    draftsRef.current = nextDrafts
    newDraftIdsRef.current = newDraftIdsRef.current.filter((candidate) => candidate !== id)
    setDraftsById((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
    setNewDraftIds(newDraftIdsRef.current)
    setErrorsById((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function reset() {
    draftsRef.current = {}
    newDraftIdsRef.current = []
    savingIdsRef.current = []
    setDraftsById({})
    setNewDraftIds([])
    setSavingIds([])
    setErrorsById({})
  }

  function save(
    id: string,
    {
      validate,
      commit,
      onCommitted,
    }: {
      validate?: (draft: TRecord, isNew: boolean) => EditableChildObjectValidation
      commit: (draft: TRecord, isNew: boolean) => void
      onCommitted?: (draft: TRecord, isNew: boolean) => void
    },
  ): boolean {
    const draft = draftsRef.current[id]
    if (!draft || savingIdsRef.current.includes(id)) return false

    const isNew = newDraftIdsRef.current.includes(id)
    const validationErrors = validate?.(draft, isNew) ?? []
    if (validationErrors.length > 0) {
      setErrorsById((current) => ({ ...current, [id]: validationErrors }))
      return false
    }

    savingIdsRef.current = Array.from(new Set([...savingIdsRef.current, id]))
    setSavingIds(savingIdsRef.current)
    window.setTimeout(() => {
      commit(draft, isNew)
      const nextDrafts = { ...draftsRef.current }
      delete nextDrafts[id]
      draftsRef.current = nextDrafts
      newDraftIdsRef.current = newDraftIdsRef.current.filter((candidate) => candidate !== id)
      savingIdsRef.current = savingIdsRef.current.filter((candidate) => candidate !== id)
      setDraftsById((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      setNewDraftIds(newDraftIdsRef.current)
      setSavingIds(savingIdsRef.current)
      setErrorsById((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
      onCommitted?.(draft, isNew)
    }, 100)
    return true
  }

  return {
    beginAdd,
    beginEdit,
    updateDraft,
    replaceDraft,
    cancel,
    reset,
    save,
    draftFor: (id: string) => draftsById[id],
    isEditing: (id: string) => Boolean(draftsById[id]),
    isNew: (id: string) => newDraftIds.includes(id),
    isSaving: (id: string) => savingIds.includes(id),
    errorsFor: (id: string) => errorsById[id] ?? [],
    newDrafts: Object.values(draftsById).filter((draft) => newDraftIds.includes(draft.id)),
  }
}

interface EditableChildObjectActionButtonProps {
  children: ReactNode
  className?: string
  disabled?: boolean
  onClick: () => void
  variant?: 'primary' | 'secondary' | 'danger'
}

export function EditableChildObjectActionButton({
  children,
  className,
  disabled = false,
  onClick,
  variant = 'secondary',
}: EditableChildObjectActionButtonProps) {
  const handledPointerDownRef = useRef(false)
  const variantClassName =
    variant === 'primary'
      ? 'inline-flex items-center gap-1 rounded border border-sf-brand bg-transparent px-2 py-1 text-xs text-sf-brand hover:border-blue-700 hover:text-blue-700 disabled:cursor-wait disabled:opacity-70'
      : variant === 'danger'
        ? 'inline-flex items-center gap-1 rounded border border-red-200 bg-transparent px-2 py-1 text-xs text-red-700 hover:border-red-400 hover:text-red-800 disabled:cursor-wait disabled:opacity-70'
        : 'inline-flex items-center gap-1 rounded border border-sf-border bg-transparent px-2 py-1 text-xs text-sf-text hover:border-sf-text-muted disabled:cursor-wait disabled:opacity-70'

  function keepEditorStable(event: PointerEvent<HTMLButtonElement>) {
    if (disabled) return
    event.preventDefault()
    handledPointerDownRef.current = true
    onClick()
  }

  function handleClick() {
    if (handledPointerDownRef.current) {
      handledPointerDownRef.current = false
      return
    }
    onClick()
  }

  return (
    <button
      type="button"
      className={className ?? variantClassName}
      disabled={disabled}
      onPointerDown={keepEditorStable}
      onClick={handleClick}
    >
      {children}
    </button>
  )
}
