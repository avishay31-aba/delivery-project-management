import {
  defaultHostingContext,
  defaultSystemHostingContext,
} from '@/domain/hosting-context'
import type { ProductionSystemInventoryItem, ReusedInternalSystem, System, SystemInventoryRecord } from './types'
import {
  REUSED_INTERNAL_STATUS_AVAILABLE,
  SYSTEM_AVAILABILITY_AVAILABLE,
  SYSTEM_CLASS_CUSTOMER,
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

export function createProductionInventorySystem(sid: string, now: string): ProductionSystemInventoryItem {
  return {
    id: `prod-sys-${crypto.randomUUID()}`,
    sid,
    source: SYSTEM_SOURCE_PRODUCTION,
    purpose: SYSTEM_PURPOSE_DELIVERY,
    logo: 'T',
    url: '',
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
    documents: [],
    createdAt: now,
    updatedAt: now,
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
    url: '',
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
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}
