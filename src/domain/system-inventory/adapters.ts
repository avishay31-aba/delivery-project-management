import {
  defaultHostingContext,
  defaultSystemHostingContext,
  hostingContextFromSource,
} from '@/domain/hosting-context'
import { normalizeOwners } from '@/domain/owners'
import { normalizeRemarks } from '@/domain/remarks'
import type { ProductionSystemInventoryItem, ReusedInternalSystem, System, SystemInventoryRecord } from './types'
import {
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
import { systemIdentity, systemSource } from './service'

export function systemDisplayName(record: SystemInventoryRecord): string {
  return `${systemIdentity(record)} - ${record.productType || 'System'}`
}

export function systemSourceLabel(record: SystemInventoryRecord): string {
  return systemSource(record)
}

export function normalizeSystemInventoryRecord<T extends SystemInventoryRecord>(record: T): T {
  return {
    ...record,
    documents: Array.isArray(record.documents) ? record.documents : [],
    remarks: normalizeRemarks(record.remarks),
    owners: normalizeOwners(record.owners),
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
    cognitoRegion: 'NA',
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
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function occupyReusedInternalSystem(system: ReusedInternalSystem, projectId: string, updatedAt: string): ReusedInternalSystem {
  return {
    ...system,
    status: REUSED_INTERNAL_STATUS_OCCUPIED,
    currentProjectIds: Array.from(new Set([...system.currentProjectIds, projectId])),
    occupationStartDate: system.occupationStartDate ?? updatedAt,
    occupationEndDate: null,
    updatedAt,
  }
}

export function releaseReusedInternalSystem(system: ReusedInternalSystem, projectId: string, updatedAt: string): ReusedInternalSystem {
  const currentProjectIds = system.currentProjectIds.filter((candidateProjectId) => candidateProjectId !== projectId)
  return {
    ...system,
    status: currentProjectIds.length === 0 ? REUSED_INTERNAL_STATUS_AVAILABLE : system.status,
    currentProjectIds,
    occupationEndDate: currentProjectIds.length === 0 ? updatedAt : system.occupationEndDate ?? null,
    updatedAt,
  }
}

export function createReusedInternalInventorySystem(machineId: string, now: string): ReusedInternalSystem {
  return {
    id: `reused-sys-${crypto.randomUUID()}`,
    machineId,
    source: SYSTEM_SOURCE_REUSED_INTERNAL,
    purpose: SYSTEM_PURPOSE_POC,
    status: REUSED_INTERNAL_STATUS_AVAILABLE,
    logo: 'T',
    url: `https://${machineId}.example.internal`,
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
    tenantCount: 0,
    alerts: [],
    operationalStatus: SYSTEM_OPERATIONAL_STATUS_ON,
    remarks: [],
    owners: [],
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
    timeGroup: assignmentLocation.timeGroup || productionSystem.timeGroup || '',
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
    purpose: reusedSystem.purpose,
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
    timeGroup: assignmentLocation.timeGroup || reusedSystem.timeGroup,
    timeGroupAlert: reusedSystem.timeGroupAlert,
    operationalStatus: reusedSystem.operationalStatus,
    remarks: [],
    owners: [],
    documents: reusedSystem.documents ?? [],
    createdAt,
    updatedAt: createdAt,
  }
}
