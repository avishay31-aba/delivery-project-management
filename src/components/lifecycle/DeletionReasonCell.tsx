import { RichTextContent } from '@/components/ui'
import { richTextIsEmpty } from '@/domain/rich-text'

export function DeletionReasonCell({ value }: { value: string }) {
  if (richTextIsEmpty(value)) return null
  return (
    <div className="max-h-24 max-w-96 overflow-hidden whitespace-normal break-words">
      <RichTextContent value={value} />
    </div>
  )
}
