import type { DocumentRecord } from '@/data/seed.types'
import { reserveBusinessId } from '@/domain/business-identity'
import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { readFileAsDataUrl } from '@/domain/attachment'

export type DocumentCollection = DocumentRecord[]

export function formatDocumentTimestamp(value = new Date()): string {
  return value.toISOString()
}

export function formatDocumentSize(fileSize: number): string {
  return `${Math.round(fileSize / 1024)} KB`
}

export async function createDocumentFromFileAsync(file: File, existingDocuments: DocumentCollection = []): Promise<DocumentRecord> {
  const storedFileReference = await readFileAsDataUrl(file)
  return {
    id: reserveBusinessId('document', existingDocuments.map((document) => document.id)),
    fileName: file.name,
    fileType: file.type || 'application/octet-stream',
    fileSize: file.size,
    uploadedAt: formatDocumentTimestamp(),
    uploadedBy: CURRENT_USER_DISPLAY_NAME,
    storedFileReference,
  }
}

export async function addDocuments(collection: DocumentCollection, files: File[]): Promise<DocumentCollection> {
  const nextCollection = [...collection]
  for (const file of files) {
    nextCollection.push(await createDocumentFromFileAsync(file, nextCollection))
  }
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

export async function replaceDocument(collection: DocumentCollection, documentId: string, file: File): Promise<DocumentCollection> {
  const replacement = await createDocumentFromFileAsync(file, collection)
  return collection.map((document) =>
    document.id === documentId
      ? { ...document, ...replacement, id: document.id, uploadedAt: document.uploadedAt, replacedAt: replacement.uploadedAt }
      : document,
  )
}
