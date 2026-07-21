import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import type { VersionUpdateAttachmentCategory, VersionUpdateAttachmentRecord } from '@/data/seed.types'

export interface PendingAttachmentInput {
  category: VersionUpdateAttachmentCategory
  file: File
}

export interface PendingAttachmentDraft {
  category: VersionUpdateAttachmentCategory
  fileName: string
  mimeType: string
  fileSize: number
  storedFileReference: string
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('File could not be read.'))
    reader.readAsDataURL(file)
  })
}

export async function createPendingAttachmentDraft(input: PendingAttachmentInput): Promise<PendingAttachmentDraft> {
  return {
    category: input.category,
    fileName: input.file.name,
    mimeType: input.file.type || 'application/octet-stream',
    fileSize: input.file.size,
    storedFileReference: await readFileAsDataUrl(input.file),
  }
}

export function commitVersionUpdateAttachment(
  draft: PendingAttachmentDraft,
  id: string,
  parentBusinessId: string,
  timestamp: string,
): VersionUpdateAttachmentRecord {
  return {
    id,
    category: draft.category,
    fileName: draft.fileName,
    mimeType: draft.mimeType,
    fileSize: draft.fileSize,
    uploadedAt: timestamp,
    uploadedBy: CURRENT_USER_DISPLAY_NAME,
    storedFileReference: draft.storedFileReference,
    parentObjectType: 'VERSION_UPDATE',
    parentBusinessId,
  }
}

export function downloadFileReference(fileReference: string, fileName: string): void {
  const anchor = document.createElement('a')
  anchor.href = fileReference
  anchor.download = fileName
  anchor.rel = 'noreferrer'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
