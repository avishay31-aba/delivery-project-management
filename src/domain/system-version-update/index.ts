import type {
  ReferenceDataRecord,
  VersionUpdateAttachmentCategory,
  VersionUpdateRecord,
} from '@/data/seed.types'
import { referenceDataDisplayValue, referenceDataRecordById } from '@/domain/reference-data'

export const VERSION_UPDATE_ATTACHMENT_CATEGORIES: VersionUpdateAttachmentCategory[] = ['CONFIG', 'ATP', 'CHECKLIST']

export const VERSION_UPDATE_ATTACHMENT_LABELS: Record<VersionUpdateAttachmentCategory, string> = {
  CONFIG: 'Config File',
  ATP: 'ATP File',
  CHECKLIST: 'Checklist File',
}

export interface VersionUpdateRow {
  id: string
  record: VersionUpdateRecord
  timestamp: string
  userName: string
  mid: string
  sid: string
  versionLabel: string
  buildLabel: string
  emailSentAt: string | null
  remarks: string
}

export function activeVersionUpdatesForSystem(versionUpdates: VersionUpdateRecord[], systemId: string): VersionUpdateRecord[] {
  return versionUpdates
    .filter((record) => record.systemId === systemId && !record.deletedAt)
    .sort((first, second) => first.committedSequence - second.committedSequence || first.committedAt.localeCompare(second.committedAt))
}

export function currentVersionUpdateForSystem(
  versionUpdates: VersionUpdateRecord[],
  systemId: string,
  currentVersionUpdateId?: string | null,
): VersionUpdateRecord | undefined {
  const activeRecords = activeVersionUpdatesForSystem(versionUpdates, systemId)
  return activeRecords.find((record) => record.id === currentVersionUpdateId) ?? activeRecords[activeRecords.length - 1]
}

export function systemCurrentVersionLabel(
  versionUpdates: VersionUpdateRecord[],
  referenceData: ReferenceDataRecord[],
  systemId: string,
  currentVersionUpdateId?: string | null,
): string {
  const current = currentVersionUpdateForSystem(versionUpdates, systemId, currentVersionUpdateId)
  return referenceDataDisplayValue(referenceData, current?.versionNumberRefId)
}

export function systemCurrentBuildLabel(
  versionUpdates: VersionUpdateRecord[],
  referenceData: ReferenceDataRecord[],
  systemId: string,
  currentVersionUpdateId?: string | null,
): string {
  const current = currentVersionUpdateForSystem(versionUpdates, systemId, currentVersionUpdateId)
  return referenceDataDisplayValue(referenceData, current?.buildNumberRefId)
}

export function versionUpdateRowsForSystem(
  versionUpdates: VersionUpdateRecord[],
  referenceData: ReferenceDataRecord[],
  systemId: string,
): VersionUpdateRow[] {
  return activeVersionUpdatesForSystem(versionUpdates, systemId).map((record) => ({
    id: record.id,
    record,
    timestamp: record.committedAt,
    userName: record.userName,
    mid: record.midSnapshot,
    sid: record.sidSnapshot,
    versionLabel: referenceDataDisplayValue(referenceData, record.versionNumberRefId),
    buildLabel: referenceDataDisplayValue(referenceData, record.buildNumberRefId),
    emailSentAt: record.emailSentAt,
    remarks: record.remarks,
  }))
}

export function validateVersionUpdateDraft(input: {
  versionNumberRefId: string
  buildNumberRefId: string
  attachmentCategories: VersionUpdateAttachmentCategory[]
  referenceData: ReferenceDataRecord[]
}): string[] {
  const messages: string[] = []
  const versionReference = referenceDataRecordById(input.referenceData, input.versionNumberRefId)
  const buildReference = referenceDataRecordById(input.referenceData, input.buildNumberRefId)
  if (!versionReference || versionReference.referenceType !== 'VERSION_NUMBER') messages.push('Version Number is required.')
  if (!buildReference || buildReference.referenceType !== 'BUILD_NUMBER') messages.push('Build Number is required.')
  VERSION_UPDATE_ATTACHMENT_CATEGORIES.forEach((category) => {
    if (!input.attachmentCategories.includes(category)) {
      messages.push(`${VERSION_UPDATE_ATTACHMENT_LABELS[category]} is required.`)
    }
  })
  return messages
}
