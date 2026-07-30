import type { Project, ProjectSystemLink, ReusedInternalSystem, SystemInventoryRecord, SystemInventoryValidationMessage } from './types'
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

  if ('occupationStartDate' in record && 'purpose' in record && isOccupationDateRequiredForPurpose(record.purpose)) {
    if (!textValue(record.occupationStartDate).trim()) {
      messages.push({ field: 'occupationStartDate', message: 'Occupation Start Date is required.' })
    }
  }

  if ('occupationEndDate' in record && 'purpose' in record && isOccupationDateRequiredForPurpose(record.purpose)) {
    if (!textValue(record.occupationEndDate).trim()) {
      messages.push({ field: 'occupationEndDate', message: 'Occupation End Date is required.' })
    }
  }

  if ('occupationStartDate' in record && 'occupationEndDate' in record && record.occupationStartDate && record.occupationEndDate && record.occupationEndDate < record.occupationStartDate) {
    messages.push({ field: 'occupationEndDate', message: 'Occupation End Date must be on or after Occupation Start Date.' })
  }

  return messages
}

export function isOccupationDateRequiredForPurpose(purpose: string | undefined): boolean {
  return textValue(purpose) !== REUSED_INTERNAL_PURPOSE_AVAILABLE
}

export const ACTIVE_POC_PURPOSE_LOCK_MESSAGE =
  'System purpose cannot be changed while it is allocated to an open POC project. Complete all linked POC projects before changing the purpose.'

export function openPocProjectsForReusedInternalSystem(
  system: ReusedInternalSystem,
  projects: Project[],
  projectSystems: ProjectSystemLink[],
): Project[] {
  const activeProjectIds = new Set(
    projectSystems
      .filter((link) =>
        link.allocationStatus !== 'DEALLOCATED' &&
        (link.sourceMachineId === system.machineId || system.currentProjectIds.includes(link.projectId)),
      )
      .map((link) => link.projectId),
  )
  system.currentProjectIds.forEach((projectId) => activeProjectIds.add(projectId))
  return projects.filter((project) => activeProjectIds.has(project.id) && project.mainType === 'POC' && project.progressStatus === 'OPEN')
}

export function hasActiveOpenPocPurposeLock(
  system: ReusedInternalSystem,
  projects: Project[],
  projectSystems: ProjectSystemLink[],
): boolean {
  return system.purpose === SYSTEM_PURPOSE_POC && openPocProjectsForReusedInternalSystem(system, projects, projectSystems).length > 0
}

export function validateReusedInternalPurposeChange(
  previous: ReusedInternalSystem,
  next: Pick<ReusedInternalSystem, 'purpose'>,
  projects: Project[],
  projectSystems: ProjectSystemLink[],
): SystemInventoryValidationMessage[] {
  if (previous.purpose === next.purpose) return []
  if (!hasActiveOpenPocPurposeLock(previous, projects, projectSystems)) return []
  return [{ field: 'purpose', message: ACTIVE_POC_PURPOSE_LOCK_MESSAGE }]
}

function dateOnlyTimestamp(value: string): number | null {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day).getTime()
}

function todayTimestamp(today = new Date()): number {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

export function shouldConfirmEarlyNonPocPurposeChange(
  previous: ReusedInternalSystem,
  next: Pick<ReusedInternalSystem, 'purpose' | 'occupationEndDate'>,
  today = new Date(),
): boolean {
  if (previous.purpose === next.purpose) return false
  if (previous.purpose === REUSED_INTERNAL_PURPOSE_AVAILABLE || previous.purpose === SYSTEM_PURPOSE_POC) return false
  const endDate = textValue(previous.occupationEndDate || next.occupationEndDate)
  const endTimestamp = dateOnlyTimestamp(endDate)
  if (endTimestamp === null) return false
  return todayTimestamp(today) < endTimestamp
}
