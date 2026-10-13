import { type ChangeEvent, useRef, useState } from 'react'
import { FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import type { DocumentRecord } from '@/data/seed.types'
import {
  addDocuments as addDocumentsToCollection,
  formatDocumentSize,
  removeDocument as removeDocumentFromCollection,
  replaceDocument as replaceDocumentInCollection,
} from '@/domain/document-collection'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'
import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { EditableChildObjectActionButton } from '@/components/child-objects'
import { FileDownloadLink, RecordHistorySection, TableSection, type RecordHistoryColumn } from '@/components/ui'

interface DocumentsPanelProps {
  documents: DocumentRecord[]
  emptyText: string
  onChange: (documents: DocumentRecord[]) => void
  readOnly?: boolean
  title?: string
}

export function DocumentsPanel({ documents, emptyText, onChange, readOnly = false, title = 'Documents' }: DocumentsPanelProps) {
  useDateTimePresentationPreference()
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const replaceInputRef = useRef<HTMLInputElement>(null)
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
      <EditableChildObjectActionButton
        dataTestId="documents-upload-button"
        onClick={() => uploadInputRef.current?.click()}
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        Upload
      </EditableChildObjectActionButton>
      <input ref={uploadInputRef} className="sr-only" data-testid="documents-upload-input" type="file" multiple onChange={(event) => void addDocuments(event)} />
      <input ref={replaceInputRef} className="sr-only" data-testid="documents-replace-input" type="file" onChange={(event) => void replaceDocument(event)} />
    </>
  )

  const columns: Array<RecordHistoryColumn<DocumentRecord>> = [
    {
      key: 'actions',
      label: 'Actions',
      render: (document) => (
        <div className="flex flex-wrap items-center gap-2">
          {document.storedFileReference || document.objectUrl ? (
            <FileDownloadLink fileName={document.fileName} fileReference={document.storedFileReference ?? document.objectUrl}>
              Open
            </FileDownloadLink>
          ) : null}
          {readOnly ? null : (
            <>
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
      ),
    },
    {
      key: 'fileName',
      label: 'File',
      className: 'min-w-64 border border-sf-border px-1.5 py-1 align-top text-sf-text',
      render: (document) => (
        <span className="inline-flex items-center gap-1">
          <FileText className="h-4 w-4 text-sf-text-muted" aria-hidden="true" />
          {document.fileName}
        </span>
      ),
      sortValue: (document) => document.fileName,
    },
    {
      key: 'fileSize',
      label: 'Size',
      render: (document) => formatDocumentSize(document.fileSize),
      sortValue: (document) => document.fileSize,
    },
    {
      key: 'uploadedAt',
      label: 'Uploaded At',
      render: (document) => <DateTimeValue value={document.uploadedAt} semanticType="datetime" />,
      sortValue: (document) => document.uploadedAt,
    },
    {
      key: 'uploadedBy',
      label: 'Uploaded By',
      render: (document) => document.uploadedBy || '-',
      sortValue: (document) => document.uploadedBy,
    },
    {
      key: 'replacedAt',
      label: 'Replaced At',
      render: (document) => <DateTimeValue value={document.replacedAt} semanticType="datetime" />,
      sortValue: (document) => document.replacedAt ?? '',
    },
    {
      key: 'replacedBy',
      label: 'Replaced By',
      render: (document) => document.replacedBy || '-',
      sortValue: (document) => document.replacedBy,
    },
  ]

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

      <RecordHistorySection
        records={documents}
        columns={columns}
        getRowKey={(document) => document.id}
        getSearchText={(document) => [document.fileName, document.uploadedBy, document.replacedBy ?? ''].join(' ')}
        getDateValue={(document) => document.uploadedAt}
        emptyText={emptyText}
        filteredEmptyText="No matching documents."
        searchLabel="Search / Filter"
        searchPlaceholder="Search Documents"
        recordsPerPageLabel="Records per page"
        initialSort={{ key: 'uploadedAt', direction: 'desc' }}
        logicalTableType="documents"
        logicalTableLabel="Documents"
      />
    </TableSection>
  )
}
