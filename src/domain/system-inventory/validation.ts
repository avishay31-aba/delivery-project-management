import type { SystemInventoryRecord, SystemInventoryValidationMessage } from './types'
import { requiresCloudPlatform } from '@/domain/hosting-context'

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

  if ('usedInRegion' in record && !textValue(record.usedInRegion).trim()) {
    messages.push({ field: 'usedInRegion', message: 'Used In Region is required.' })
  }

  return messages
}
