import type { ReferenceDataRecord, ReferenceDataType } from '@/data/seed.types'

export const VERSION_NUMBER_REFERENCE_TYPE: ReferenceDataType = 'VERSION_NUMBER'
export const BUILD_NUMBER_REFERENCE_TYPE: ReferenceDataType = 'BUILD_NUMBER'
export const INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE: ReferenceDataType = 'INFRASTRUCTURE_CATEGORY'
export const INFRASTRUCTURE_TYPE_REFERENCE_TYPE: ReferenceDataType = 'INFRASTRUCTURE_TYPE'

export const REFERENCE_DATA_TYPE_LABELS: Record<ReferenceDataType, string> = {
  VERSION_NUMBER: 'Version Number',
  BUILD_NUMBER: 'Build Number',
  INFRASTRUCTURE_CATEGORY: 'Infrastructure Category',
  INFRASTRUCTURE_TYPE: 'Infrastructure Type',
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

export function buildNumberRecordsForVersion(records: ReferenceDataRecord[], versionNumberId: string | null | undefined): ReferenceDataRecord[] {
  if (!versionNumberId) return []
  return referenceDataRecordsForType(records, BUILD_NUMBER_REFERENCE_TYPE).filter((record) => record.versionNumberId === versionNumberId)
}

export function activeBuildNumberRecordsForVersion(records: ReferenceDataRecord[], versionNumberId: string | null | undefined): ReferenceDataRecord[] {
  return buildNumberRecordsForVersion(records, versionNumberId).filter((record) => record.active)
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
  versionNumberId?: string | null,
): ReferenceDataRecord | undefined {
  const normalizedLabel = normalizeReferenceLabel(label)
  return records.find((record) =>
    record.referenceType === referenceType &&
    record.normalizedLabel === normalizedLabel &&
    (
      (referenceType !== BUILD_NUMBER_REFERENCE_TYPE && referenceType !== INFRASTRUCTURE_TYPE_REFERENCE_TYPE) ||
      (record.versionNumberId ?? record.parentReferenceId ?? null) === versionNumberId
    ) &&
    record.id !== excludeId,
  )
}

export function validateReferenceDataLabel(
  records: ReferenceDataRecord[],
  referenceType: ReferenceDataType,
  label: string,
  excludeId?: string,
  versionNumberId?: string | null,
): string[] {
  const messages: string[] = []
  const nextLabel = referenceDataLabel(label)
  const typeLabel = REFERENCE_DATA_TYPE_LABELS[referenceType]
  if (!nextLabel) messages.push(`${typeLabel} is required.`)
  if (referenceType === BUILD_NUMBER_REFERENCE_TYPE && !versionNumberId) messages.push('Version Number is required before adding a Build Number.')
  if (referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE && !versionNumberId) messages.push('Category is required before adding an Infrastructure Type.')
  if (nextLabel && referenceDataDuplicate(records, referenceType, nextLabel, excludeId, versionNumberId)) {
    messages.push(`${typeLabel} "${nextLabel}" already exists.`)
  }
  return messages
}
