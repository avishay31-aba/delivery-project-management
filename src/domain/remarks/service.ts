import type { RemarkDeadlineAlertStatus, RemarkRecord, RemarkType } from './types'
import { REMARK_AUTHOR_LOCAL_USER, REMARK_TYPE_OPTIONS } from './metadata'
import { reserveBusinessId } from '@/domain/business-identity'

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

function dateOnlyTimestamp(value: string): number | null {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day).getTime()
}

function todayTimestamp(today = new Date()): number {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

export function nextRemarkId(remarks: RemarkRecord[]): string {
  return reserveBusinessId('remark', remarks.map((remark) => remark.remarkId))
}

export function createRemarkRecord(
  existingRemarks: RemarkRecord[],
  now = new Date().toISOString(),
  author = REMARK_AUTHOR_LOCAL_USER,
): RemarkRecord {
  return {
    id: `remark-${crypto.randomUUID()}`,
    remarkId: reserveBusinessId('remark', existingRemarks.map((remark) => remark.remarkId)),
    createdAt: now,
    author,
    type: REMARK_TYPE_OPTIONS[0],
    content: '',
    dueDate: null,
  }
}

export function normalizeRemarkRecord(remark: Partial<RemarkRecord> & Record<string, unknown>, existingRemarks: RemarkRecord[] = []): RemarkRecord {
  const now = new Date().toISOString()
  return {
    id: textValue(remark.id) || `remark-${crypto.randomUUID()}`,
    remarkId: textValue(remark.remarkId) || textValue(remark.recordId) || nextRemarkId(existingRemarks),
    createdAt: textValue(remark.createdAt) || textValue(remark.timestamp) || now,
    author: textValue(remark.author) || REMARK_AUTHOR_LOCAL_USER,
    type: textValue(remark.type) as RemarkType || REMARK_TYPE_OPTIONS[0],
    content: textValue(remark.content),
    dueDate: textValue(remark.dueDate) || null,
    updatedAt: textValue(remark.updatedAt) || undefined,
    updatedBy: textValue(remark.updatedBy) || undefined,
  }
}

export function normalizeRemarks(value: unknown): RemarkRecord[] {
  if (!Array.isArray(value)) return []
  const remarks: RemarkRecord[] = []
  value.forEach((candidate) => {
    if (!candidate || typeof candidate !== 'object') return
    remarks.push(normalizeRemarkRecord(candidate as Partial<RemarkRecord> & Record<string, unknown>, remarks))
  })
  return remarks
}

export function remarkDeadlineAlertStatus(
  dueDate: string | null | undefined,
  today = new Date(),
): RemarkDeadlineAlertStatus {
  if (!dueDate) return 'NONE'

  const deadlineTimestamp = dateOnlyTimestamp(dueDate)
  if (deadlineTimestamp === null) return 'NONE'

  const daysUntilDeadline = Math.ceil((deadlineTimestamp - todayTimestamp(today)) / 86_400_000)
  if (daysUntilDeadline < 0) return 'OVERDUE'
  if (daysUntilDeadline < 90) return 'WARNING'
  return 'NONE'
}

export function remarkDeadlineAlertLabel(status: RemarkDeadlineAlertStatus): string {
  if (status === 'OVERDUE') return 'Overdue'
  if (status === 'WARNING') return 'Pending'
  return ''
}
