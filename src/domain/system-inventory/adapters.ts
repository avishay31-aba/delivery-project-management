import {
  defaultHostingContext,
  defaultSystemHostingContext,
  hostingContextFromSource,
} from '@/domain/hosting-context'
import { normalizeBusinessRegion } from '@/domain/business-region'
import { normalizeOwners } from '@/domain/owners'
import { normalizeRemarks } from '@/domain/remarks'
import type { ProductionSystemInventoryItem, Project, ProjectSystemLink, ReusedInternalPurposeHistoryRecord, ReusedInternalSystem, System, SystemInventoryRecord } from './types'
import {
  REUSED_INTERNAL_PURPOSE_AVAILABLE,
  REUSED_INTERNAL_STATUS_AVAILABLE,
  REUSED_INTERNAL_STATUS_OCCUPIED,
  SYSTEM_AVAILABILITY_AVAILABLE,
  SYSTEM_AVAILABILITY_OCCUPIED,
  SYSTEM_CLASS_CUSTOMER,
  SYSTEM_CLASS_POC_DEMO_TRAINING,
  SYSTEM_OPERATIONAL_STATUS_ON,
  SYSTEM_PURPOSE_CUSTOMER,
  SYSTEM_PURPOSE_DELIVERY,
  SYSTEM_PURPOSE_POC,
  SYSTEM_SOURCE_PRODUCTION,
  SYSTEM_SOURCE_REUSED_INTERNAL,
} from './metadata'
import { applyReusedSystemOccupationWindow, reusedInternalMachineIdRouteKey, reusedInternalStatusForPurpose, systemIdentity, systemSource } from './service'
import { reserveBusinessId } from '@/domain/business-identity'

export function systemDisplayName(record: SystemInventoryRecord): string {
  return `${systemIdentity(record)} - ${record.productType || 'System'}`
}

export function systemSourceLabel(record: SystemInventoryRecord): string {
  return systemSource(record)
}

export function normalizeSystemInventoryRecord<T extends SystemInventoryRecord>(record: T): T {
  return {
    ...record,
    ...('cognitoRegion' in record ? { cognitoRegion: normalizeBusinessRegion(record.cognitoRegion) || record.cognitoRegion || '' } : {}),
    ...('usedInRegion' in record ? { usedInRegion: normalizeBusinessRegion(record.usedInRegion) } : {}),
    ...('region' in record ? { region: normalizeBusinessRegion(record.region) } : {}),
    ...('timeGroup' in record ? { timeGroup: normalizeBusinessRegion(record.timeGroup) || record.timeGroup || '' } : {}),
    ...('machineId' in record && record.machineId && systemSource(record) === SYSTEM_SOURCE_REUSED_INTERNAL ? { machineId: reusedInternalMachineIdRouteKey(record.machineId) } : {}),
    documents: Array.isArray(record.documents) ? record.documents : [],
    remarks: normalizeRemarks(record.remarks),
    owners: normalizeOwners(record.owners),
    configurationHistory: Array.isArray(record.configurationHistory) ? record.configurationHistory : [],
    ...('externalInterface' in record || 'vpnEnabled' in record ? { externalInterface: Boolean(record.externalInterface) } : {}),
    ...('currentProjectIds' in record ? {
      purposeHistory: normalizeReusedInternalPurposeHistory(record.purposeHistory),
      status: reusedInternalStatusForPurpose(record.purpose),
    } : {}),
  }
}

export function createProductionInventorySystem(sid: string, now: string): ProductionSystemInventoryItem {
  return {
    id: `prod-sys-${crypto.randomUUID()}`,
    sid,
    source: SYSTEM_SOURCE_PRODUCTION,
    purpose: SYSTEM_PURPOSE_DELIVERY,
    logo: 'T',
    url: `https://${sid}.example.production`,
    cognitoRegion: '',
    productType: 'Tangles',
    ...defaultHostingContext(),
    mapCenter: '',
    licenses: 1,
    users: 1,
    concurrentSearches: 1,
    concurrentAnalyses: 1,
    standardMonitors: 10,
    region: '',
    country: '',
    state: '',
    timeGroup: '',
    timeGroupAlert: '',
    linkedProjects: [],
    operationalStatus: SYSTEM_OPERATIONAL_STATUS_ON,
    tenantCount: 0,
    alerts: [],
    remarks: [],
    owners: [],
    configurationHistory: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}

function nextPurposeHistoryRecordId(records: ReusedInternalPurposeHistoryRecord[]): string {
  return reserveBusinessId('purposeHistory', records.map((record) => record.recordId))
}

function closeOpenPurposeHistory(
  records: ReusedInternalPurposeHistoryRecord[],
  endDate: string,
  context: Partial<ReusedInternalPurposeHistoryRecord> = {},
): ReusedInternalPurposeHistoryRecord[] {
  const startedAtValue = (record: ReusedInternalPurposeHistoryRecord) => {
    const parsed = Date.parse(record.startDate)
    return Number.isNaN(parsed) ? 0 : parsed
  }
  const openRecord = records
    .filter((record) => !record.endDate)
    .sort((a, b) => startedAtValue(b) - startedAtValue(a))[0]
  if (!openRecord) return records
  return records.map((record) => (record.id === openRecord.id ? { ...record, ...context, endDate } : record))
}

function createPurposeHistoryRecord(
  existingRecords: ReusedInternalPurposeHistoryRecord[],
  startDate: string,
  purposeType: string,
  context: Partial<ReusedInternalPurposeHistoryRecord> = {},
): ReusedInternalPurposeHistoryRecord {
  return {
    id: `purpose-history-${crypto.randomUUID()}`,
    recordId: nextPurposeHistoryRecordId(existingRecords),
    startDate,
    endDate: null,
    purposeType,
    pid: '',
    sid: '',
    projectName: '',
    accountName: '',
    product: '',
    projectStatus: '',
    ...context,
  }
}

export function normalizeReusedInternalPurposeHistory(value: unknown): ReusedInternalPurposeHistoryRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((record): record is Record<string, unknown> => Boolean(record) && typeof record === 'object')
    .map((record, index) => ({
      id: String(record.id ?? `purpose-history-${crypto.randomUUID()}`),
      recordId: String(record.recordId ?? reserveBusinessId('purposeHistory', value.slice(0, index).map((candidate) => String((candidate as Record<string, unknown>)?.recordId ?? '')))),
      startDate: String(record.startDate ?? record.allocatedAt ?? ''),
      endDate: record.endDate == null ? null : String(record.endDate),
      purposeType: String(record.purposeType ?? record.purpose ?? ''),
      pid: String(record.pid ?? ''),
      sid: String(record.sid ?? ''),
      projectName: String(record.projectName ?? ''),
      accountName: String(record.accountName ?? ''),
      product: String(record.product ?? ''),
      projectStatus: String(record.projectStatus ?? record.status ?? ''),
    }))
}

export function appendReusedInternalPurposeHistory(
  system: ReusedInternalSystem,
  purposeType: string,
  startedAt: string,
  context: Partial<ReusedInternalPurposeHistoryRecord> = {},
  closingContext: Partial<ReusedInternalPurposeHistoryRecord> = {},
): ReusedInternalSystem {
  const currentHistory = normalizeReusedInternalPurposeHistory(system.purposeHistory)
  const closedHistory = closeOpenPurposeHistory(currentHistory, startedAt, closingContext)
  return {
    ...system,
    purposeHistory: [createPurposeHistoryRecord(closedHistory, startedAt, purposeType, context), ...closedHistory],
  }
}

export function purposeHistoryContextFromProject(project: Project, allocatedSystem: System): Partial<ReusedInternalPurposeHistoryRecord> {
  return {
    pid: project.pid,
    sid: allocatedSystem.sid ?? '',
    projectName: project.opportunityName,
    accountName: project.accountName,
    product: allocatedSystem.productType,
    projectStatus: project.progressStatus,
  }
}

export function updateReusedInternalPurpose(system: ReusedInternalSystem, purpose: ReusedInternalSystem['purpose'], updatedAt: string): ReusedInternalSystem {
  if (system.purpose === purpose) return { ...system, status: reusedInternalStatusForPurpose(purpose), updatedAt }
  return {
    ...appendReusedInternalPurposeHistory(system, purpose, updatedAt),
    purpose,
    status: reusedInternalStatusForPurpose(purpose),
    updatedAt,
  }
}

export function occupyReusedInternalSystem(
  system: ReusedInternalSystem,
  projectId: string,
  updatedAt: string,
  context: Partial<ReusedInternalPurposeHistoryRecord> = {},
  activeAllocations: ProjectSystemLink[] = [],
  projects: Project[] = [],
): ReusedInternalSystem {
  const currentProjectIds = Array.from(new Set([...system.currentProjectIds, projectId]))
  const shouldStartPocOccupation = system.purpose !== SYSTEM_PURPOSE_POC || !system.currentProjectIds.includes(projectId)
  const baseSystem = shouldStartPocOccupation
    ? appendReusedInternalPurposeHistory(system, SYSTEM_PURPOSE_POC, updatedAt, context)
    : system
  const occupiedSystem: ReusedInternalSystem = {
    ...baseSystem,
    purpose: SYSTEM_PURPOSE_POC,
    status: REUSED_INTERNAL_STATUS_OCCUPIED,
    currentProjectIds,
    updatedAt,
  }
  return applyReusedSystemOccupationWindow(occupiedSystem, activeAllocations, projects, updatedAt)
}

export function releaseReusedInternalSystem(
  system: ReusedInternalSystem,
  projectId: string,
  updatedAt: string,
  context: Partial<ReusedInternalPurposeHistoryRecord> = {},
): ReusedInternalSystem {
  const currentProjectIds = system.currentProjectIds.filter((candidateProjectId) => candidateProjectId !== projectId)
  const releasedSystem = currentProjectIds.length === 0
    ? appendReusedInternalPurposeHistory(system, REUSED_INTERNAL_PURPOSE_AVAILABLE, updatedAt, {}, context)
    : system
  return {
    ...releasedSystem,
    purpose: currentProjectIds.length === 0 ? REUSED_INTERNAL_PURPOSE_AVAILABLE : system.purpose,
    status: reusedInternalStatusForPurpose(currentProjectIds.length === 0 ? REUSED_INTERNAL_PURPOSE_AVAILABLE : system.purpose),
    currentProjectIds,
    occupationStartDate: currentProjectIds.length === 0 ? null : system.occupationStartDate ?? null,
    occupationEndDate: currentProjectIds.length === 0 ? null : system.occupationEndDate ?? null,
    updatedAt,
  }
}

export function createReusedInternalInventorySystem(machineId: string, now: string): ReusedInternalSystem {
  const normalizedMachineId = reusedInternalMachineIdRouteKey(machineId)
  return {
    id: `reused-sys-${crypto.randomUUID()}`,
    machineId: normalizedMachineId,
    source: SYSTEM_SOURCE_REUSED_INTERNAL,
    purpose: REUSED_INTERNAL_PURPOSE_AVAILABLE,
    status: REUSED_INTERNAL_STATUS_AVAILABLE,
    logo: 'T',
    url: `https://${normalizedMachineId}.example.internal`,
    cognitoRegion: 'NA',
    productType: 'Tangles',
    ...defaultHostingContext(),
    mapCenter: '',
    licenses: 1,
    users: 1,
    concurrentSearches: 1,
    concurrentAnalyses: 1,
    standardMonitors: 10,
    usedInRegion: '',
    timeGroup: '',
    timeGroupAlert: '',
    occupationStartDate: null,
    occupationEndDate: null,
    currentProjectIds: [],
    purposeHistory: [createPurposeHistoryRecord([], now, REUSED_INTERNAL_PURPOSE_AVAILABLE)],
    tenantCount: 0,
    alerts: [],
    operationalStatus: SYSTEM_OPERATIONAL_STATUS_ON,
    remarks: [],
    owners: [],
    configurationHistory: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function createStandaloneSystem(sid: string, now: string): System {
  return {
    id: `sys-${crypto.randomUUID()}`,
    accountId: null,
    salesManagerId: null,
    sid,
    deliveryPid: '',
    machineId: null,
    systemClass: SYSTEM_CLASS_CUSTOMER,
    purpose: SYSTEM_PURPOSE_CUSTOMER,
    availability: SYSTEM_AVAILABILITY_AVAILABLE,
    tenantIds: [],
    productType: 'Tangles',
    ...defaultSystemHostingContext(),
    region: '',
    country: '',
    state: '',
    timeGroup: '',
    operationalStatus: '',
    remarks: [],
    owners: [],
    configurationHistory: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export interface SystemAllocationAssignmentLocation {
  region?: string
  timeGroup?: string
}

export function systemFromProductionInventoryAllocation(
  productionSystem: ProductionSystemInventoryItem,
  projectId: string,
  assignmentLocation: SystemAllocationAssignmentLocation,
  tenantIds: string[],
  updatedAt: string,
): System {
  return {
    ...productionSystem,
    accountId: null,
    salesManagerId: null,
    machineId: null,
    systemClass: SYSTEM_CLASS_CUSTOMER,
    availability: SYSTEM_AVAILABILITY_OCCUPIED,
    linkedProjectIds: [projectId],
    tenantIds,
    region: assignmentLocation.region || productionSystem.region || '',
    timeGroup: '',
    createdAt: productionSystem.createdAt,
    updatedAt,
  }
}

export function systemFromReusedInternalAllocation(
  reusedSystem: ReusedInternalSystem,
  projectId: string,
  assignmentLocation: SystemAllocationAssignmentLocation,
  systemId: string,
  sid: string,
  deliveryPid: string,
  tenantIds: string[],
  createdAt: string,
): System {
  return {
    id: systemId,
    accountId: null,
    salesManagerId: null,
    sid,
    deliveryPid,
    machineId: reusedSystem.machineId,
    source: SYSTEM_SOURCE_REUSED_INTERNAL,
    linkedProjectIds: [projectId],
    tenantIds,
    systemClass: SYSTEM_CLASS_POC_DEMO_TRAINING,
    purpose: SYSTEM_PURPOSE_POC,
    availability: SYSTEM_AVAILABILITY_OCCUPIED,
    logo: reusedSystem.logo,
    url: reusedSystem.url,
    cognitoRegion: reusedSystem.cognitoRegion,
    productType: reusedSystem.productType,
    ...hostingContextFromSource(reusedSystem),
    mapCenter: reusedSystem.mapCenter,
    region: assignmentLocation.region || assignmentLocation.timeGroup || reusedSystem.usedInRegion || '',
    country: '',
    state: '',
    timeGroup: '',
    timeGroupAlert: reusedSystem.timeGroupAlert,
    operationalStatus: reusedSystem.operationalStatus,
    remarks: [],
    owners: [],
    configurationHistory: [],
    documents: reusedSystem.documents ?? [],
    createdAt,
    updatedAt: createdAt,
  }
}
