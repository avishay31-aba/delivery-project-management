import type { DocumentRecord } from '@/data/seed.types'
import { reserveBusinessId } from '@/domain/business-identity'

export type DocumentCollection = DocumentRecord[]

export function formatDocumentTimestamp(value = new Date()): string {
  return value.toISOString()
}

export function formatDocumentSize(fileSize: number): string {
  return `${Math.round(fileSize / 1024)} KB`
}

export function createDocumentFromFile(file: File, existingDocuments: DocumentCollection = []): DocumentRecord {
  return {
    id: reserveBusinessId('document', existingDocuments.map((document) => document.id)),
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    uploadedAt: formatDocumentTimestamp(),
    objectUrl: URL.createObjectURL(file),
  }
}

export function addDocuments(collection: DocumentCollection, files: File[]): DocumentCollection {
  const nextCollection = [...collection]
  files.forEach((file) => {
    nextCollection.push(createDocumentFromFile(file, nextCollection))
  })
  return nextCollection
}

export function renameDocument(collection: DocumentCollection, documentId: string, fileName: string): DocumentCollection {
  const nextName = fileName.trim()
  if (!nextName) return collection
  return collection.map((document) =>
    document.id === documentId ? { ...document, fileName: nextName } : document,
  )
}

export function removeDocument(collection: DocumentCollection, documentId: string): DocumentCollection {
  return collection.filter((document) => document.id !== documentId)
}

export function replaceDocument(collection: DocumentCollection, documentId: string, file: File): DocumentCollection {
  const replacement = createDocumentFromFile(file, collection)
  return collection.map((document) =>
    document.id === documentId
      ? { ...document, ...replacement, id: document.id, uploadedAt: document.uploadedAt, replacedAt: replacement.uploadedAt }
      : document,
  )
}
