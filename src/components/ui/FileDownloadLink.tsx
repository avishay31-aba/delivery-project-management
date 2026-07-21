import type { ReactNode } from 'react'
import { Download } from 'lucide-react'
import { downloadFileReference } from '@/domain/attachment'

interface FileDownloadLinkProps {
  fileName: string
  fileReference?: string | null
  className?: string
  children?: ReactNode
}

export function FileDownloadLink({ fileName, fileReference, className, children }: FileDownloadLinkProps) {
  if (!fileReference) return <span>{children ?? fileName}</span>

  return (
    <a
      href={fileReference}
      download={fileName}
      className={className ?? 'inline-flex items-center gap-1 text-sf-brand hover:underline'}
      onClick={(event) => {
        event.preventDefault()
        downloadFileReference(fileReference, fileName)
      }}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {children ?? fileName}
    </a>
  )
}
