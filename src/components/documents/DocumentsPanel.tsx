import { type ChangeEvent, useRef, useState } from 'react'
import { Download, Edit3, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import type { DocumentRecord } from '@/data/seed.types'
import {
  addDocuments as addDocumentsToCollection,
  formatDocumentSize,
  removeDocument as removeDocumentFromCollection,
  renameDocument,
  replaceDocument as replaceDocumentInCollection,
} from '@/domain/document-collection'
import { formatDateTimeSeconds } from '@/domain/date-time-presentation'

interface DocumentsPanelProps {
  documents: DocumentRecord[]
  emptyText: string
  onChange: (documents: DocumentRecord[]) => void
  readOnly?: boolean
}

export function DocumentsPanel({ documents, emptyText, onChange, readOnly = false }: DocumentsPanelProps) {
  const replaceInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [replaceDocumentId, setReplaceDocumentId] = useState<string | null>(null)

  function addDocuments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return
    onChange(addDocumentsToCollection(documents, files))
    event.target.value = ''
  }

  function startEdit(document: DocumentRecord) {
    setEditingId(document.id)
    setEditingName(document.fileName)
  }

  function saveEdit(documentId: string) {
    const nextName = editingName.trim()
    if (!nextName) return
    onChange(renameDocument(documents, documentId, nextName))
    setEditingId(null)
    setEditingName('')
  }

  function removeDocument(documentId: string) {
    onChange(removeDocumentFromCollection(documents, documentId))
  }

  function requestReplace(documentId: string) {
    setReplaceDocumentId(documentId)
    replaceInputRef.current?.click()
  }

  function replaceDocument(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !replaceDocumentId) return
    onChange(replaceDocumentInCollection(documents, replaceDocumentId, file))
    setReplaceDocumentId(null)
    event.target.value = ''
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {readOnly ? null : (
          <>
            <label className="inline-flex cursor-pointer items-center gap-1 rounded border border-sf-border bg-white px-3 py-1.5 text-sm hover:bg-sf-surface-alt">
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload
              <input className="sr-only" type="file" multiple onChange={addDocuments} />
            </label>
            <input ref={replaceInputRef} className="sr-only" type="file" onChange={replaceDocument} />
          </>
        )}
      </div>

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
                      {document.objectUrl ? (
                        <a className="inline-flex items-center gap-1 text-sf-brand hover:underline" href={document.objectUrl} target="_blank" rel="noreferrer">
                          <Download className="h-4 w-4" aria-hidden="true" />
                          Open
                        </a>
                      ) : null}
                      {readOnly ? null : (
                        <>
                        <button type="button" className="inline-flex items-center gap-1 text-sf-brand hover:underline" onClick={() => startEdit(document)}>
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                          Edit
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 text-sf-brand hover:underline" onClick={() => requestReplace(document.id)}>
                          <RefreshCw className="h-4 w-4" aria-hidden="true" />
                          Replace
                        </button>
                        <button type="button" className="inline-flex items-center gap-1 text-red-700 hover:underline" onClick={() => removeDocument(document.id)}>
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Remove
                        </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="min-w-64 border border-sf-border px-1.5 py-1 align-top">
                    {editingId === document.id ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <input className="h-8 min-w-56 rounded border border-sf-border px-2 py-1 text-sm" value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                        <button type="button" className="rounded border border-sf-brand bg-sf-brand px-2 py-1 text-xs font-semibold text-white" onClick={() => saveEdit(document.id)}>
                          Save
                        </button>
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
                  <td className="border border-sf-border px-1.5 py-1 align-top">{formatDateTimeSeconds(document.uploadedAt, { fallback: '' })}</td>
                  <td className="border border-sf-border px-1.5 py-1 align-top">{formatDateTimeSeconds(document.replacedAt, { fallback: '' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded border border-dashed border-sf-border bg-white p-4 text-sm text-sf-text-muted">{emptyText}</div>
      )}
    </div>
  )
}
