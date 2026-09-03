import type {
  Account,
  DocumentRecord,
  Opportunity,
  ProductionSystemInventoryItem,
  Project,
  ReusedInternalSystem,
  InfrastructureItem,
  System,
  Tenant,
  WarrantyRecord,
} from '@/data/seed.types'
import type {
  BusinessObjectReference,
  BusinessObjectType,
  BusinessReferenceContext,
  BusinessReferenceLookup,
} from './types'
import {
  formattedReusedInternalMachineId,
  normalizeReusedInternalMachineId,
  reusedInternalMachineIdRouteKey,
} from '@/domain/system-inventory'

function normalized(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

function missingReference(lookup: BusinessReferenceLookup): BusinessObjectReference {
  const businessId = normalized(lookup.businessId)
  const internalId = normalized(lookup.internalId)
  return {
    objectType: lookup.objectType,
    internalId: internalId || null,
    businessId: businessId || internalId,
    displayLabel: businessId || internalId || 'Missing reference',
    routePath: null,
    isMissing: true,
    isStale: false,
  }
}

function isStaleReference(
  recordInternalId: string | null | undefined,
  recordBusinessId: string | null | undefined,
  lookup: BusinessReferenceLookup,
): boolean {
  const requestedInternalId = normalized(lookup.internalId)
  const requestedBusinessId = normalized(lookup.businessId)
  return Boolean(
    (requestedInternalId && normalized(recordInternalId) !== requestedInternalId) ||
      (requestedBusinessId && normalized(recordBusinessId) !== requestedBusinessId),
  )
}

export function routePathForBusinessReference(objectType: string, businessId: string | null | undefined): string | null {
  const id = normalized(businessId)
  if (!id) return null

  if (objectType === 'ACCOUNT' || objectType === 'CUSTOMER') return `/customers/${id}`
  if (objectType === 'OPPORTUNITY') return `/opportunities/${id}`
  if (objectType === 'PROJECT') return `/projects/${id}`
  if (objectType === 'TENANT') return `/tenants/${id}`
  if (objectType === 'INFRASTRUCTURE_ITEM') return `/infrastructure/${id}`
  if (objectType === 'PRODUCTION_SYSTEM') return `/systems/production-inventory/${id}`
  if (objectType === 'INTERNAL_REUSED_SYSTEM') return `/systems/reused-internal/${formattedReusedInternalMachineId(reusedInternalMachineIdRouteKey(id))}`
  if (objectType === 'SYSTEM') return `/systems/${id}`
  return null
}

export function displayBusinessIdForReference(objectType: string, businessId: string | null | undefined): string {
  const id = normalized(businessId)
  if (!id) return ''
  if (objectType === 'INTERNAL_REUSED_SYSTEM') return formattedReusedInternalMachineId(reusedInternalMachineIdRouteKey(id))
  return id
}

export function accountReference(account: Account, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'ACCOUNT',
    internalId: account.id,
    businessId: account.accountCode,
    displayLabel: account.accountName || account.accountCode,
    routePath: routePathForBusinessReference('ACCOUNT', account.accountCode),
    isMissing: false,
    isStale: isStaleReference(account.id, account.accountCode, { objectType: 'ACCOUNT', ...lookup }),
  }
}

export function opportunityReference(opportunity: Opportunity, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'OPPORTUNITY',
    internalId: opportunity.id,
    businessId: opportunity.opportunityId,
    displayLabel: opportunity.opportunityName ? `${opportunity.opportunityId} - ${opportunity.opportunityName}` : opportunity.opportunityId,
    routePath: routePathForBusinessReference('OPPORTUNITY', opportunity.opportunityId),
    isMissing: false,
    isStale: isStaleReference(opportunity.id, opportunity.opportunityId, { objectType: 'OPPORTUNITY', ...lookup }),
  }
}

export function projectReference(project: Project, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'PROJECT',
    internalId: project.id,
    businessId: project.pid,
    displayLabel: project.opportunityName ? `${project.pid} - ${project.opportunityName}` : project.pid,
    routePath: routePathForBusinessReference('PROJECT', project.pid),
    isMissing: false,
    isStale: isStaleReference(project.id, project.pid, { objectType: 'PROJECT', ...lookup }),
  }
}

export function systemReference(
  system: System | ProductionSystemInventoryItem | ReusedInternalSystem,
  lookup: Partial<BusinessReferenceLookup> = {},
): BusinessObjectReference {
  const objectType = systemObjectType(system)
  const businessId = systemBusinessIdForObjectType(system, objectType)
  return {
    objectType,
    internalId: system.id,
    businessId,
    displayLabel: businessId,
    routePath: routePathForBusinessReference(objectType, businessId),
    isMissing: false,
    isStale: isStaleReference(system.id, businessId, { objectType, ...lookup }),
  }
}

export function tenantReference(tenant: Tenant, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'TENANT',
    internalId: tenant.id,
    businessId: tenant.tid,
    displayLabel: tenant.tid,
    routePath: routePathForBusinessReference('TENANT', tenant.tid),
    isMissing: false,
    isStale: isStaleReference(tenant.id, tenant.tid, { objectType: 'TENANT', ...lookup }),
  }
}

export function warrantyReference(warranty: WarrantyRecord, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'WARRANTY',
    internalId: warranty.warrantyRecordId,
    businessId: warranty.warrantyRecordId,
    displayLabel: warranty.warrantyRecordId,
    routePath: null,
    isMissing: false,
    isStale: isStaleReference(warranty.warrantyRecordId, warranty.warrantyRecordId, { objectType: 'WARRANTY', ...lookup }),
  }
}

export function documentReference(document: DocumentRecord, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'DOCUMENT',
    internalId: document.id,
    businessId: document.id,
    displayLabel: document.fileName || document.id,
    routePath: null,
    isMissing: false,
    isStale: isStaleReference(document.id, document.id, { objectType: 'DOCUMENT', ...lookup }),
  }
}

export function infrastructureItemReference(item: InfrastructureItem, lookup: Partial<BusinessReferenceLookup> = {}): BusinessObjectReference {
  return {
    objectType: 'INFRASTRUCTURE_ITEM',
    internalId: item.id,
    businessId: item.infrastructureId,
    displayLabel: item.identifier ? `${item.infrastructureId} - ${item.identifier}` : item.infrastructureId,
    routePath: routePathForBusinessReference('INFRASTRUCTURE_ITEM', item.infrastructureId),
    isMissing: false,
    isStale: isStaleReference(item.id, item.infrastructureId, { objectType: 'INFRASTRUCTURE_ITEM', ...lookup }),
  }
}

export function resolveBusinessReference(
  context: BusinessReferenceContext,
  lookup: BusinessReferenceLookup,
): BusinessObjectReference {
  const account = lookup.objectType === 'ACCOUNT' ? resolveAccount(context.accounts, lookup) : null
  if (account) return accountReference(account, lookup)

  const opportunity = lookup.objectType === 'OPPORTUNITY' ? resolveOpportunity(context.opportunities, lookup) : null
  if (opportunity) return opportunityReference(opportunity, lookup)

  const project = lookup.objectType === 'PROJECT' ? resolveProject(context.projects, lookup) : null
  if (project) return projectReference(project, lookup)

  if (['SYSTEM', 'PRODUCTION_SYSTEM', 'INTERNAL_REUSED_SYSTEM'].includes(lookup.objectType)) {
    const system = resolveSystem(context, lookup)
    if (system) return systemReference(system, lookup)
  }

  const tenant = lookup.objectType === 'TENANT' ? resolveTenant(context.tenants, lookup) : null
  if (tenant) return tenantReference(tenant, lookup)

  const warranty = lookup.objectType === 'WARRANTY' ? resolveWarranty(context.warrantyRecords, lookup) : null
  if (warranty) return warrantyReference(warranty, lookup)

  const infrastructureItem = lookup.objectType === 'INFRASTRUCTURE_ITEM' ? resolveInfrastructureItem(context.infrastructureItems ?? [], lookup) : null
  if (infrastructureItem) return infrastructureItemReference(infrastructureItem, lookup)

  return missingReference(lookup)
}

export function isMissingBusinessReference(context: BusinessReferenceContext, lookup: BusinessReferenceLookup): boolean {
  return resolveBusinessReference(context, lookup).isMissing
}

export function isStaleBusinessReference(context: BusinessReferenceContext, lookup: BusinessReferenceLookup): boolean {
  return resolveBusinessReference(context, lookup).isStale
}

export function systemBusinessId(system: System | ProductionSystemInventoryItem | ReusedInternalSystem): string {
  if ('sid' in system && system.sid) return system.sid
  if ('machineId' in system && system.machineId) return formattedReusedInternalMachineId(system.machineId)
  return system.id
}

function systemBusinessIdForObjectType(
  system: System | ProductionSystemInventoryItem | ReusedInternalSystem,
  objectType: BusinessObjectType,
): string {
  if (objectType === 'INTERNAL_REUSED_SYSTEM' && 'machineId' in system && system.machineId) return formattedReusedInternalMachineId(system.machineId)
  if (objectType === 'PRODUCTION_SYSTEM' && 'sid' in system && system.sid) return system.sid
  return systemBusinessId(system)
}

function systemObjectType(system: System | ProductionSystemInventoryItem | ReusedInternalSystem): BusinessObjectType {
  if ('sid' in system && system.sid && ('deliveryPid' in system || 'linkedProjectIds' in system || 'tenantIds' in system)) return 'SYSTEM'
  if ('source' in system && system.source === 'Production' && 'sid' in system && system.sid) return 'PRODUCTION_SYSTEM'
  if ('source' in system && system.source === 'Reused Internal Systems' && 'machineId' in system) return 'INTERNAL_REUSED_SYSTEM'
  if ('machineId' in system && system.machineId && (!('sid' in system) || !system.sid)) return 'INTERNAL_REUSED_SYSTEM'
  return 'SYSTEM'
}

function resolveAccount(accounts: Account[], lookup: BusinessReferenceLookup): Account | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  return accounts.find((account) => account.id === internalId || account.accountCode === businessId) ?? null
}

function resolveOpportunity(opportunities: Opportunity[], lookup: BusinessReferenceLookup): Opportunity | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  return opportunities.find((opportunity) => opportunity.id === internalId || opportunity.opportunityId === businessId) ?? null
}

function resolveInfrastructureItem(items: InfrastructureItem[], lookup: BusinessReferenceLookup): InfrastructureItem | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  return items.find((item) => item.id === internalId || item.infrastructureId === businessId) ?? null
}

function resolveProject(projects: Project[], lookup: BusinessReferenceLookup): Project | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  return projects.find((project) => project.id === internalId || project.pid === businessId) ?? null
}

function resolveSystem(
  context: BusinessReferenceContext,
  lookup: BusinessReferenceLookup,
): System | ProductionSystemInventoryItem | ReusedInternalSystem | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  const reusedMachineId = normalizeReusedInternalMachineId(reusedInternalMachineIdRouteKey(businessId))
  const matches = (system: System | ProductionSystemInventoryItem | ReusedInternalSystem) =>
    system.id === internalId ||
    systemBusinessId(system) === businessId ||
    ('machineId' in system && normalizeReusedInternalMachineId(system.machineId) === reusedMachineId)

  if (lookup.objectType !== 'INTERNAL_REUSED_SYSTEM') {
    const activeOrProduction = [...context.systems, ...context.productionSystemInventory].find(matches)
    if (activeOrProduction) return activeOrProduction
  }

  if (lookup.objectType !== 'PRODUCTION_SYSTEM') {
    const reused = context.reusedInternalSystems.find(matches)
    if (reused) return reused
  }

  return null
}

function resolveTenant(tenants: Tenant[], lookup: BusinessReferenceLookup): Tenant | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  return tenants.find((tenant) => tenant.id === internalId || tenant.tid === businessId) ?? null
}

function resolveWarranty(warranties: WarrantyRecord[], lookup: BusinessReferenceLookup): WarrantyRecord | null {
  const internalId = normalized(lookup.internalId)
  const businessId = normalized(lookup.businessId)
  return warranties.find((warranty) => warranty.warrantyRecordId === internalId || warranty.warrantyRecordId === businessId) ?? null
}
