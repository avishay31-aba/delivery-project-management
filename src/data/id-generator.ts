import type { AppDataState, IdCounterKey, IdCounters } from '@/data/seed.types'
import { BUSINESS_IDENTITY_POLICIES, generateBusinessIdFromCounter } from '@/domain/business-identity'
import type { BusinessEntityType } from '@/domain/business-identity'

const LEGACY_COUNTER_ENTITY: Partial<Record<IdCounterKey, BusinessEntityType>> = {
  pid: 'project',
  sid: 'productionSystem',
  tid: 'tenant',
}

const MINIMUM_SEED_COUNTERS: IdCounters = {
  account: 0,
  opportunity: 0,
  project: 0,
  productionSystem: 0,
  tenant: 0,
  warranty: 0,
  remark: 0,
  activity: 0,
  configurationHistory: 0,
  purposeHistory: 0,
  document: 0,
  pid: 0,
  sid: 0,
  tid: 0,
  mid: 0,
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function numericSuffix(value: string | null | undefined, prefix?: string): number | null {
  if (!value) return null
  const pattern = prefix ? new RegExp(`^${escapeRegExp(prefix)}-?(\\d+)$`, 'i') : /^(?:[A-Z]+-?)?(\d+)$/i
  const match = value.match(pattern)
  if (!match) return null

  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

function maxCounter(values: Array<string | null | undefined>, entityType: BusinessEntityType, minimum = 0): number {
  const policy = BUSINESS_IDENTITY_POLICIES[entityType]
  return values.reduce((max, value) => {
    const numeric = numericSuffix(value, policy.prefix)
    return numeric == null ? max : Math.max(max, numeric)
  }, minimum)
}

function maxMachineCounter(values: Array<string | null | undefined>, minimum: number): number {
  return values.reduce((max, value) => {
    const prefixed = numericSuffix(value, 'M')
    const fallback = numericSuffix(value)
    const numeric = prefixed ?? fallback
    return numeric == null ? max : Math.max(max, numeric)
  }, minimum)
}

function allRemarks(state: Partial<AppDataState>) {
  return [
    ...(state.systems ?? []).flatMap((system) => system.remarks ?? []),
    ...(state.productionSystemInventory ?? []).flatMap((system) => system.remarks ?? []),
    ...(state.reusedInternalSystems ?? []).flatMap((system) => system.remarks ?? []),
    ...(state.tenants ?? []).flatMap((tenant) => tenant.remarks ?? []),
  ]
}

function allConfigurationHistory(state: Partial<AppDataState>) {
  return [
    ...(state.systems ?? []).flatMap((system) => system.configurationHistory ?? []),
    ...(state.productionSystemInventory ?? []).flatMap((system) => system.configurationHistory ?? []),
    ...(state.reusedInternalSystems ?? []).flatMap((system) => system.configurationHistory ?? []),
    ...(state.tenants ?? []).flatMap((tenant) => tenant.configurationHistory ?? []),
  ]
}

function allPurposeHistory(state: Partial<AppDataState>) {
  return [
    ...(state.reusedInternalSystems ?? []).flatMap((system) => system.purposeHistory ?? []),
  ]
}

function allDocuments(state: Partial<AppDataState>) {
  return [
    ...(state.projects ?? []).flatMap((project) => project.documents ?? []),
    ...(state.systems ?? []).flatMap((system) => system.documents ?? []),
    ...(state.productionSystemInventory ?? []).flatMap((system) => system.documents ?? []),
    ...(state.reusedInternalSystems ?? []).flatMap((system) => system.documents ?? []),
    ...(state.tenants ?? []).flatMap((tenant) => tenant.documents ?? []),
  ]
}

function allTenantWarranties(state: Partial<AppDataState>) {
  return (state.tenants ?? []).flatMap((tenant) => tenant.warranties ?? [])
}

export function deriveIdCountersFromRecords(
  state: Pick<AppDataState, 'projects' | 'systems' | 'tenants'> &
    Partial<Pick<AppDataState, 'accounts' | 'opportunities' | 'productionSystemInventory' | 'reusedInternalSystems' | 'warrantyRecords' | 'activityEvents'>>,
): IdCounters {
  const productionSystemIds = [
    ...state.systems.map((system) => system.sid),
    ...(state.productionSystemInventory ?? []).map((system) => system.sid),
  ]
  const tenantIds = state.tenants.map((tenant) => tenant.tid)
  const projectIds = state.projects.map((project) => project.pid)
  const derived: IdCounters = {
    ...MINIMUM_SEED_COUNTERS,
    account: maxCounter((state.accounts ?? []).map((account) => account.accountCode), 'account'),
    opportunity: maxCounter((state.opportunities ?? []).map((opportunity) => opportunity.opportunityId), 'opportunity'),
    project: maxCounter(projectIds, 'project'),
    productionSystem: maxCounter(productionSystemIds, 'productionSystem'),
    tenant: maxCounter(tenantIds, 'tenant'),
    warranty: maxCounter([
      ...(state.warrantyRecords ?? []).map((warranty) => warranty.warrantyRecordId),
      ...allTenantWarranties(state).map((warranty) => warranty.warrantyId),
    ], 'warranty'),
    remark: maxCounter(allRemarks(state).map((remark) => remark.remarkId), 'remark'),
    activity: maxCounter((state.activityEvents ?? []).map((event) => event.id), 'activity'),
    configurationHistory: maxCounter(allConfigurationHistory(state).map((record) => record.recordId), 'configurationHistory'),
    purposeHistory: maxCounter(allPurposeHistory(state).map((record) => record.recordId), 'purposeHistory'),
    document: maxCounter(allDocuments(state).map((document) => document.id), 'document'),
    pid: 0,
    sid: 0,
    tid: 0,
    mid: maxMachineCounter(
      [
        ...state.systems.map((system) => system.machineId),
        ...(state.reusedInternalSystems ?? []).map((system) => system.machineId),
      ],
      MINIMUM_SEED_COUNTERS.mid,
    ),
  }

  return {
    ...derived,
    pid: derived.project,
    sid: derived.productionSystem,
    tid: derived.tenant,
  }
}

export function normalizeIdCounters(
  counters: Partial<IdCounters> | null | undefined,
  records: Pick<AppDataState, 'projects' | 'systems' | 'tenants'> & Partial<AppDataState>,
): IdCounters {
  const derived = deriveIdCountersFromRecords(records)
  const normalized: IdCounters = { ...derived }
  ;(Object.keys(MINIMUM_SEED_COUNTERS) as IdCounterKey[]).forEach((key) => {
    normalized[key] = Math.max(counters?.[key] ?? derived[key], derived[key])
  })
  normalized.project = Math.max(normalized.project, normalized.pid)
  normalized.productionSystem = Math.max(normalized.productionSystem, normalized.sid)
  normalized.tenant = Math.max(normalized.tenant, normalized.tid)
  normalized.pid = normalized.project
  normalized.sid = normalized.productionSystem
  normalized.tid = normalized.tenant
  return normalized
}

export function incrementCounter(counters: IdCounters, counterKey: IdCounterKey): { counters: IdCounters; id: string } {
  const entityType = LEGACY_COUNTER_ENTITY[counterKey]
  if (entityType) return generateBusinessIdFromCounter(entityType, counters)

  if (counterKey === 'mid') {
    throw new Error('MID is user-defined and must not be autogenerated.')
  }

  return generateBusinessIdFromCounter(counterKey as BusinessEntityType, counters)
}
