import type { ReferenceDataRecord, ReferenceDataType } from '@/data/seed.types'

export const VERSION_NUMBER_REFERENCE_TYPE: ReferenceDataType = 'VERSION_NUMBER'
export const BUILD_NUMBER_REFERENCE_TYPE: ReferenceDataType = 'BUILD_NUMBER'

export const REFERENCE_DATA_TYPE_LABELS: Record<ReferenceDataType, string> = {
  VERSION_NUMBER: 'Version Number',
  BUILD_NUMBER: 'Build Number',
}

export function normalizeReferenceLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

export function referenceDataLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

export function referenceDataRecordsForType(records: ReferenceDataRecord[], referenceType: ReferenceDataType): ReferenceDataRecord[] {
  return records
    .filter((record) => record.referenceType === referenceType)
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { numeric: true, sensitivity: 'base' }))
}

export function activeReferenceDataRecords(records: ReferenceDataRecord[], referenceType: ReferenceDataType): ReferenceDataRecord[] {
  return referenceDataRecordsForType(records, referenceType).filter((record) => record.active)
}

export function referenceDataRecordById(records: ReferenceDataRecord[], id: string | null | undefined): ReferenceDataRecord | undefined {
  if (!id) return undefined
  return records.find((record) => record.id === id)
}

export function referenceDataDisplayValue(records: ReferenceDataRecord[], id: string | null | undefined): string {
  return referenceDataRecordById(records, id)?.label ?? ''
}

export function referenceDataDuplicate(
  records: ReferenceDataRecord[],
  referenceType: ReferenceDataType,
  label: string,
  excludeId?: string,
): ReferenceDataRecord | undefined {
  const normalizedLabel = normalizeReferenceLabel(label)
  return records.find((record) =>
    record.referenceType === referenceType &&
    record.normalizedLabel === normalizedLabel &&
    record.id !== excludeId,
  )
}

export function validateReferenceDataLabel(
  records: ReferenceDataRecord[],
  referenceType: ReferenceDataType,
  label: string,
  excludeId?: string,
): string[] {
  const messages: string[] = []
  const nextLabel = referenceDataLabel(label)
  const typeLabel = REFERENCE_DATA_TYPE_LABELS[referenceType]
  if (!nextLabel) messages.push(`${typeLabel} is required.`)
  if (nextLabel && referenceDataDuplicate(records, referenceType, nextLabel, excludeId)) {
    messages.push(`${typeLabel} "${nextLabel}" already exists.`)
  }
  return messages
}
