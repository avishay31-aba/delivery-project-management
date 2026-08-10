import { DateTimeValue } from '@/components/date-time/DateTimeValue'
import { FormField, RichTextContent, RichTextEditor } from '@/components/ui'
import { richTextIsEmpty } from '@/domain/rich-text'

export interface DeletionHistoryEntryPresentation {
  id: string
  reason: string
  timestamp: string
  deletedBy?: string
}

interface DeletionHistoryFieldProps {
  entries: DeletionHistoryEntryPresentation[]
  currentReason: string
  canEditLatestReason: boolean
  onCurrentReasonChange: (value: string) => void
}

export function DeletionHistoryField({
  entries,
  currentReason,
  canEditLatestReason,
  onCurrentReasonChange,
}: DeletionHistoryFieldProps) {
  if (entries.length === 0) return null
  const newestFirstEntries = [...entries].sort((first, second) => second.timestamp.localeCompare(first.timestamp))
  const latestEntry = newestFirstEntries[0]

  return (
    <FormField key="deletionHistory" label="Deletion History" controlWidthClassName="w-[32rem] max-w-full">
      <div className="space-y-3 rounded border border-sf-border bg-white px-2 py-2 text-sm text-sf-text">
        {newestFirstEntries.map((entry, index) => {
          const isEditableEntry = canEditLatestReason && latestEntry?.id === entry.id
          const reasonValue = isEditableEntry ? (currentReason || entry.reason) : entry.reason
          return (
            <div key={entry.id} className={index === 0 ? 'space-y-2' : 'space-y-2 border-t border-dotted border-sf-border pt-3'}>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-sf-text">
                <span className="font-medium"><DateTimeValue value={entry.timestamp} semanticType="datetime" fallback="-" /></span>
                {entry.deletedBy ? <span>{entry.deletedBy}</span> : null}
              </div>
              {isEditableEntry ? (
                <RichTextEditor
                  value={reasonValue}
                  onChange={onCurrentReasonChange}
                  minHeightClassName="min-h-16"
                  toolbarMode="focus"
                />
              ) : (
                <div className="min-h-8 max-w-full overflow-hidden break-words">
                  {richTextIsEmpty(entry.reason) ? '-' : <RichTextContent value={entry.reason} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </FormField>
  )
}
