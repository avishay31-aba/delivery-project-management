import type { RemarkDeadlineAlertStatus, RemarkRecord, RemarkType } from './types'
import { REMARK_AUTHOR_LOCAL_USER, REMARK_TYPE_OPTIONS } from './metadata'

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

function remarkCounter(value: string): number | null {
  const match = value.match(/^R-(\d+)$/i)
  if (!match) return null
  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function nextRemarkId(remarks: RemarkRecord[]): string {
  const nextCounter = remarks.reduce((max, remark) => {
    const parsed = remarkCounter(remark.remarkId)
    return parsed == null ? max : Math.max(max, parsed)
  }, 0) + 1

  return `R-${String(nextCounter).padStart(3, '0')}`
}

export function createRemarkRecord(
  existingRemarks: RemarkRecord[],
  now = new Date().toISOString(),
  author = REMARK_AUTHOR_LOCAL_USER,
): RemarkRecord {
  return {
    id: `remark-${crypto.randomUUID()}`,
    remarkId: nextRemarkId(existingRemarks),
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
