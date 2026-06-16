import type {
  AllocationType,
  ProductionSystemInventoryItem,
  ProjectSystemLink,
  ProjectTenantLink,
  ReusedInternalSystem,
  System,
} from '@/data/seed.types'
import { hostingContextFromSource } from '@/domain/hosting-context'

export function normalizeProjectSystemLink(link: ProjectSystemLink): ProjectSystemLink {
  return {
    ...link,
    tenantIds: Array.isArray(link.tenantIds) ? link.tenantIds : [],
    allocationStatus: link.allocationStatus ?? 'ALLOCATED',
    allocationType: link.allocationType ?? 'EXISTING_SYSTEM',
    sourceMachineId: link.sourceMachineId ?? null,
    deallocatedAt: link.deallocatedAt ?? null,
  }
}

export function normalizeProjectTenantLink(link: ProjectTenantLink): ProjectTenantLink {
  return {
    ...link,
    systemId: link.systemId ?? '',
    allocationStatus: link.allocationStatus ?? 'ALLOCATED',
    allocationType: link.allocationType ?? 'EXISTING_SYSTEM',
    allocatedAt: link.allocatedAt ?? '',
    deallocatedAt: link.deallocatedAt ?? null,
  }
}

export function createProjectSystemLink(
  projectId: string,
  systemId: string,
  allocationType: AllocationType,
  allocatedAt: string,
  options: { tenantIds?: string[]; sourceMachineId?: string | null } = {},
): ProjectSystemLink {
  return {
    id: `alloc-${crypto.randomUUID()}`,
    projectId,
    systemId,
    tenantIds: options.tenantIds ?? [],
    allocationStatus: 'ALLOCATED',
    allocationType,
    sourceMachineId: options.sourceMachineId ?? null,
    allocatedAt,
    deallocatedAt: null,
  }
}

export function createProjectTenantLink(
  projectId: string,
  tenantId: string,
  systemId: string,
  allocationType: AllocationType,
  allocatedAt: string,
): ProjectTenantLink {
  return {
    id: `proj-ten-${crypto.randomUUID()}`,
    projectId,
    tenantId,
    systemId,
    allocationStatus: 'ALLOCATED',
    allocationType,
    allocatedAt,
    deallocatedAt: null,
  }
}

export function systemFromProductionInventoryAllocation(
  productionSystem: ProductionSystemInventoryItem,
  projectId: string,
  tenantIds: string[],
  updatedAt: string,
): System {
  return {
    ...productionSystem,
    accountId: null,
    salesManagerId: null,
    machineId: null,
    systemClass: 'CUSTOMER',
    availability: 'OCCUPIED',
    linkedProjectIds: [projectId],
    tenantIds,
    createdAt: productionSystem.createdAt,
    updatedAt,
  }
}

export function systemFromReusedInternalAllocation(
  reusedSystem: ReusedInternalSystem,
  projectId: string,
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
    source: 'Reused Internal Systems',
    linkedProjectIds: [projectId],
    tenantIds,
    systemClass: 'POC_DEMO_TRAINING',
    purpose: reusedSystem.purpose,
    availability: 'OCCUPIED',
    logo: reusedSystem.logo,
    url: reusedSystem.url,
    cognitoRegion: reusedSystem.cognitoRegion,
    productType: reusedSystem.productType,
    ...hostingContextFromSource(reusedSystem),
    mapCenter: reusedSystem.mapCenter,
    region: reusedSystem.usedInRegion,
    country: '',
    state: '',
    timeGroup: reusedSystem.timeGroup,
    timeGroupAlert: reusedSystem.timeGroupAlert,
    operationalStatus: reusedSystem.operationalStatus,
    documents: reusedSystem.documents ?? [],
    createdAt,
    updatedAt: createdAt,
  }
}
