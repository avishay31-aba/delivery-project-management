import type { SystemInventoryRecord, SystemInventoryValidationMessage } from './types'
import { requiresCloudPlatform } from '@/domain/hosting-context'
import { REUSED_INTERNAL_PURPOSE_AVAILABLE, SYSTEM_PURPOSE_POC } from './metadata'

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

export function validateReusedInternalMachineId(
  record: SystemInventoryRecord,
  records: SystemInventoryRecord[],
): SystemInventoryValidationMessage[] {
  if (!('machineId' in record)) return []
  if ('systemClass' in record) return []
  const machineId = textValue(record.machineId).trim()
  const duplicateMid = records.some(
    (candidate) =>
      candidate.id !== record.id &&
      'machineId' in candidate &&
      !('systemClass' in candidate) &&
      textValue(candidate.machineId).trim() === machineId,
  )

  if (!machineId) return [{ field: 'machineId', message: 'MID is required.' }]
  if (duplicateMid) return [{ field: 'machineId', message: 'MID must be unique.' }]
  return []
}

export function validateSystemInventoryRequiredFields(
  record: SystemInventoryRecord,
): SystemInventoryValidationMessage[] {
  const messages: SystemInventoryValidationMessage[] = []

  if ('cognitoRegion' in record && requiresCloudPlatform(textValue(record.hostingType)) && !textValue(record.cognitoRegion).trim()) {
    messages.push({ field: 'cognitoRegion', message: 'Cognito Region is required.' })
  }

  const hasActiveProject = 'currentProjectIds' in record ? record.currentProjectIds.length > 0 : true
  if ('usedInRegion' in record && hasActiveProject && !textValue(record.usedInRegion).trim()) {
    messages.push({ field: 'usedInRegion', message: 'Used In Region is required.' })
  }

  if ('occupationEndDate' in record && 'purpose' in record && record.purpose !== REUSED_INTERNAL_PURPOSE_AVAILABLE && record.purpose !== SYSTEM_PURPOSE_POC) {
    if (!textValue(record.occupationEndDate).trim()) {
      messages.push({ field: 'occupationEndDate', message: 'Occupation End Date is required.' })
    }
  }

  if ('occupationStartDate' in record && 'occupationEndDate' in record && record.occupationStartDate && record.occupationEndDate && record.occupationEndDate < record.occupationStartDate) {
    messages.push({ field: 'occupationEndDate', message: 'Occupation End Date must be on or after Occupation Start Date.' })
  }

  return messages
}
