import { type ChangeEvent, useRef, useState } from 'react'
import { Edit3, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import type { DocumentRecord } from '@/data/seed.types'
import {
  addDocuments as addDocumentsToCollection,
  formatDocumentSize,
  removeDocument as removeDocumentFromCollection,
  renameDocument,
  replaceDocument as replaceDocumentInCollection,
} from '@/domain/document-collection'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { EditableChildObjectActionButton } from '@/components/child-objects'
import { FileDownloadLink, TableSection } from '@/components/ui'

interface DocumentsPanelProps {
  documents: DocumentRecord[]
  emptyText: string
  onChange: (documents: DocumentRecord[]) => void
  readOnly?: boolean
  title?: string
}

export function DocumentsPanel({ documents, emptyText, onChange, readOnly = false, title = 'Documents' }: DocumentsPanelProps) {
  useDateTimePresentationPreference()
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [replaceDocumentId, setReplaceDocumentId] = useState<string | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  async function addDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    event.target.value = ''
    try {
      onChange(await addDocumentsToCollection(documents, files))
      setMessage({ tone: 'success', text: files.length === 1 ? 'Document uploaded.' : 'Documents uploaded.' })
    } catch {
      setMessage({ tone: 'error', text: 'Document upload failed.' })
    }
  }

  function startEdit(document: DocumentRecord) {
    setEditingId(document.id)
    setEditingName(document.fileName)
    setMessage(null)
  }

  function saveEdit(documentId: string) {
    const nextName = editingName.trim()
    if (!nextName) return
    onChange(renameDocument(documents, documentId, nextName))
    setEditingId(null)
    setEditingName('')
    setMessage({ tone: 'success', text: 'Document renamed.' })
  }

  function removeDocument(documentId: string) {
    const document = documents.find((candidate) => candidate.id === documentId)
    const label = document?.fileName ? ` "${document.fileName}"` : ''
    if (!window.confirm(`Delete this Document${label}?\n\nThis change will be saved immediately and cannot be undone.`)) return
    onChange(removeDocumentFromCollection(documents, documentId))
    setMessage({ tone: 'success', text: 'Document deleted.' })
  }

  function requestReplace(documentId: string) {
    const document = documents.find((candidate) => candidate.id === documentId)
    const label = document?.fileName ? ` "${document.fileName}"` : ''
    if (!window.confirm(`Replace this Document${label}?\n\nThis change will be saved immediately after you choose a replacement file.`)) return
    setReplaceDocumentId(documentId)
    replaceInputRef.current?.click()
  }

  async function replaceDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !replaceDocumentId) return
    event.target.value = ''
    try {
      onChange(await replaceDocumentInCollection(documents, replaceDocumentId, file))
      setReplaceDocumentId(null)
      setMessage({ tone: 'success', text: 'Document replaced.' })
    } catch {
      setMessage({ tone: 'error', text: 'Document replacement failed.' })
    }
  }

  const actions = readOnly ? null : (
    <>
      <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt">
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload
        <input className="sr-only" type="file" multiple onChange={(event) => void addDocuments(event)} />
      </label>
      <input ref={replaceInputRef} className="sr-only" type="file" onChange={(event) => void replaceDocument(event)} />
    </>
  )

  return (
    <TableSection title={title} actions={actions}>
      {message ? (
        <div
          className={[
            'rounded border px-3 py-2 text-sm',
            message.tone === 'success' ? 'border-green-200 bg-green-50 text-green-800' : 'border-red-200 bg-red-50 text-red-700',
          ].join(' ')}
          role="status"
        >
          {message.text}
        </div>
      ) : null}

      {documents.length > 0 ? (
        <div className="overflow-x-auto rounded border border-sf-border bg-white">
          <table className="min-w-full border-collapse text-sm leading-tight">
            <thead className="bg-sf-surface-alt text-left">
              <tr>
                {['Actions', 'File', 'Type', 'Size', 'Uploaded At', 'Replaced At'].map((header) => (
                  <th key={header} className="whitespace-nowrap border border-sf-border px-1.5 py-1 text-sm font-semibold text-sf-text">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr key={document.id} className="hover:bg-sf-surface-alt">
                  <td className="border border-sf-border px-1.5 py-1 align-top">
                    <div className="flex flex-wrap items-center gap-2">
                      {document.storedFileReference || document.objectUrl ? (
                        <FileDownloadLink fileName={document.fileName} fileReference={document.storedFileReference ?? document.objectUrl}>
                          Open
                        </FileDownloadLink>
                      ) : null}
                      {readOnly ? null : (
                        <>
                        <EditableChildObjectActionButton onClick={() => startEdit(document)}>
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </EditableChildObjectActionButton>
                        <EditableChildObjectActionButton onClick={() => requestReplace(document.id)}>
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          Replace
                        </EditableChildObjectActionButton>
                        <EditableChildObjectActionButton variant="danger" onClick={() => removeDocument(document.id)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Remove
                        </EditableChildObjectActionButton>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="min-w-64 border border-sf-border px-1.5 py-1 align-top">
                    {editingId === document.id ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <input className="h-8 min-w-56 rounded border border-sf-border px-2 py-1 text-sm" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                        <EditableChildObjectActionButton
                          variant="primary"
                          disabled={!editingName.trim() || editingName.trim() === document.fileName}
                          onClick={() => saveEdit(document.id)}
                        >
                          Save
                        </EditableChildObjectActionButton>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-4 w-4 text-sf-text-muted" aria-hidden="true" />
                        {document.fileName}
                      </span>
                    )}
                  </td>
                  <td className="border border-sf-border px-1.5 py-1 align-top">{document.fileType}</td>
                  <td className="border border-sf-border px-1.5 py-1 align-top">{formatDocumentSize(document.fileSize)}</td>
                  <td className="border border-sf-border px-1.5 py-1 align-top">
                    <DateTimeValue value={document.uploadedAt} semanticType="datetime" />
                  </td>
                  <td className="border border-sf-border px-1.5 py-1 align-top">
                    <DateTimeValue value={document.replacedAt} semanticType="datetime" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">{emptyText}</div>
      )}
    </TableSection>
  )
}
