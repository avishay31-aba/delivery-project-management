import type {
  AppDataState,
  ConfigurationHistoryRecord,
  DocumentRecord,
  IdCounters,
  RemarkRecord,
  TenantConfigurationHistoryRecord,
} from '@/data/seed.types'
import { generateBusinessIdFromCounter } from '@/domain/business-identity'

type SystemLikeWithChildren = {
  configurationHistory?: ConfigurationHistoryRecord[]
  documents?: DocumentRecord[]
  remarks?: RemarkRecord[]
}

type ParentChildState = Pick<AppDataState,
  | 'idCounters'
  | 'projects'
  | 'systems'
  | 'productionSystemInventory'
  | 'reusedInternalSystems'
  | 'tenants'
  | 'infrastructureItems'
  | 'activityEvents'
>

type ChildIdEntity = 'document' | 'remark' | 'configurationHistory' | 'activity'
type ChildRecord = DocumentRecord | RemarkRecord | ConfigurationHistoryRecord | TenantConfigurationHistoryRecord

function allSystemLikeParents(state: ParentChildState): SystemLikeWithChildren[] {
  return [
    ...state.systems,
    ...state.productionSystemInventory,
    ...state.reusedInternalSystems,
  ]
}

export function globalDocumentIds(state: ParentChildState): string[] {
  return [
    ...state.projects.flatMap((project) => project.documents ?? []),
    ...allSystemLikeParents(state).flatMap((system) => system.documents ?? []),
    ...state.tenants.flatMap((tenant) => tenant.documents ?? []),
    ...state.infrastructureItems.flatMap((item) => item.documents ?? []),
  ].map((document) => document.id)
}

export function globalRemarkIds(state: ParentChildState): string[] {
  return [
    ...allSystemLikeParents(state).flatMap((system) => system.remarks ?? []),
    ...state.tenants.flatMap((tenant) => tenant.remarks ?? []),
    ...state.infrastructureItems.flatMap((item) => item.remarks ?? []),
  ].map((remark) => remark.remarkId)
}

export function globalConfigurationHistoryIds(state: ParentChildState): string[] {
  return [
    ...allSystemLikeParents(state).flatMap((system) => system.configurationHistory ?? []),
    ...state.tenants.flatMap((tenant) => tenant.configurationHistory ?? []),
  ].map((record) => record.recordId)
}

export function globalActivityIds(state: Pick<ParentChildState, 'activityEvents'>): string[] {
  return state.activityEvents.map((event) => event.id)
}

export function globalChildIds(state: ParentChildState, entityType: ChildIdEntity): string[] {
  if (entityType === 'document') return globalDocumentIds(state)
  if (entityType === 'remark') return globalRemarkIds(state)
  if (entityType === 'configurationHistory') return globalConfigurationHistoryIds(state)
  return globalActivityIds(state)
}

function childBusinessId(record: ChildRecord, entityType: Exclude<ChildIdEntity, 'activity'>): string {
  if (entityType === 'document') return (record as DocumentRecord).id
  if (entityType === 'remark') return (record as RemarkRecord).remarkId
  return (record as ConfigurationHistoryRecord | TenantConfigurationHistoryRecord).recordId
}

function withChildBusinessId<TRecord extends ChildRecord>(
  record: TRecord,
  entityType: Exclude<ChildIdEntity, 'activity'>,
  value: string,
): TRecord {
  if (entityType === 'document') return { ...(record as DocumentRecord), id: value } as TRecord
  if (entityType === 'remark') return { ...(record as RemarkRecord), remarkId: value } as TRecord
  return { ...(record as ConfigurationHistoryRecord | TenantConfigurationHistoryRecord), recordId: value } as TRecord
}

export function reconcileGlobalChildRecords<TRecord extends ChildRecord>(
  state: ParentChildState,
  counters: IdCounters,
  entityType: Exclude<ChildIdEntity, 'activity'>,
  previousRecords: TRecord[] = [],
  nextRecords: TRecord[] = [],
): { counters: IdCounters; records: TRecord[] } {
  let nextCounters = counters
  const previousTechnicalIds = new Set(previousRecords.map((record) => record.id))
  const previousBusinessIds = new Set(previousRecords.map((record) => childBusinessId(record, entityType)).filter(Boolean))
  const reservedIds = new Set(globalChildIds(state, entityType))
  const records = nextRecords.map((record) => {
    const currentId = childBusinessId(record, entityType)
    const isExisting =
      previousTechnicalIds.has(record.id) ||
      (currentId ? previousBusinessIds.has(currentId) : false)
    if (isExisting) return record

    const allocated = generateBusinessIdFromCounter(entityType, nextCounters, Array.from(reservedIds))
    nextCounters = allocated.counters
    reservedIds.add(allocated.id)
    return withChildBusinessId(record, entityType, allocated.id)
  })

  return { counters: nextCounters, records }
}

