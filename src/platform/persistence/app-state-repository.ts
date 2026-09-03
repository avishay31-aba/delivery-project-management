import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeAppDataState } from './app-state-migration'
import { parseJson, stringifyJson } from './json'
import { localStoragePersistenceAdapter } from './local-storage'
import type { KeyValuePersistenceAdapter } from './types'

export const APP_STATE_STORAGE_KEY = 'dpm-mvp-v1'
const APP_STATE_DELTA_FORMAT = 'dpm-seed-delta-v1'

const APP_DATA_COLLECTION_KEYS = [
  'salesManagers',
  'accounts',
  'opportunities',
  'projects',
  'productionSystemInventory',
  'reusedInternalSystems',
  'systems',
  'tenants',
  'warrantyRecords',
  'referenceData',
  'timeGroupLookups',
  'userPresentationPreferences',
  'versionUpdates',
  'infrastructureItems',
  'activityEvents',
  'projectSystems',
  'projectTenants',
] as const

type AppDataCollectionKey = typeof APP_DATA_COLLECTION_KEYS[number]
type AppDataCollectionItem = AppDataState[AppDataCollectionKey][number]

interface AppDataCollectionDelta {
  upserts: AppDataCollectionItem[]
  deletedKeys: string[]
  full?: AppDataCollectionItem[]
}

interface SeedDeltaAppDataState {
  persistenceFormat: typeof APP_STATE_DELTA_FORMAT
  version: AppDataState['version']
  lastPersistedAt: AppDataState['lastPersistedAt']
  idCounters: AppDataState['idCounters']
  collections: Partial<Record<AppDataCollectionKey, AppDataCollectionDelta>>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isSeedDeltaAppDataState(value: unknown): value is SeedDeltaAppDataState {
  return isRecord(value) && value.persistenceFormat === APP_STATE_DELTA_FORMAT
}

function seedBaselineState(): AppDataState {
  return normalizeAppDataState({
    ...(seedJson as unknown as AppDataState),
    lastPersistedAt: null,
  })
}

function collectionItemKey(item: AppDataCollectionItem): string | null {
  if (!isRecord(item)) return null
  const key = item.id ?? item.warrantyRecordId
  return typeof key === 'string' && key.trim() ? key : null
}

function collectionByKey(items: AppDataCollectionItem[]): Map<string, AppDataCollectionItem> | null {
  const result = new Map<string, AppDataCollectionItem>()
  for (const item of items) {
    const key = collectionItemKey(item)
    if (!key) return null
    result.set(key, item)
  }
  return result
}

function valuesEqual(left: unknown, right: unknown): boolean {
  return stringifyJson(left) === stringifyJson(right)
}

function collectionDelta(
  currentItems: AppDataCollectionItem[],
  baselineItems: AppDataCollectionItem[],
): AppDataCollectionDelta | null {
  const currentByKey = collectionByKey(currentItems)
  const baselineByKey = collectionByKey(baselineItems)
  if (!currentByKey || !baselineByKey) {
    return valuesEqual(currentItems, baselineItems) ? null : { upserts: [], deletedKeys: [], full: currentItems }
  }

  const upserts = currentItems.filter((item) => {
    const key = collectionItemKey(item)
    return !key || !valuesEqual(item, baselineByKey.get(key))
  })
  const deletedKeys = Array.from(baselineByKey.keys()).filter((key) => !currentByKey.has(key))

  return upserts.length === 0 && deletedKeys.length === 0
    ? null
    : { upserts, deletedKeys }
}

function compactAppDataStateForStorage(state: AppDataState): SeedDeltaAppDataState {
  const baseline = seedBaselineState()
  const collections: SeedDeltaAppDataState['collections'] = {}

  APP_DATA_COLLECTION_KEYS.forEach((key) => {
    const delta = collectionDelta(state[key] as AppDataCollectionItem[], baseline[key] as AppDataCollectionItem[])
    if (delta) collections[key] = delta
  })

  return {
    persistenceFormat: APP_STATE_DELTA_FORMAT,
    version: state.version,
    lastPersistedAt: state.lastPersistedAt,
    idCounters: state.idCounters,
    collections,
  }
}

function expandAppDataStateFromStorage(storedState: SeedDeltaAppDataState): AppDataState {
  const baseline = seedBaselineState()
  const expanded: AppDataState = {
    ...baseline,
    version: storedState.version,
    idCounters: storedState.idCounters,
    lastPersistedAt: storedState.lastPersistedAt,
  }

  APP_DATA_COLLECTION_KEYS.forEach((key) => {
    const delta = storedState.collections[key]
    if (!delta) return
    if (Array.isArray(delta.full)) {
      expanded[key] = delta.full as never
      return
    }

    const baselineItems = baseline[key] as AppDataCollectionItem[]
    const deletedKeys = new Set(delta.deletedKeys)
    const upsertByKey = collectionByKey(delta.upserts) ?? new Map<string, AppDataCollectionItem>()
    const merged = baselineItems
      .filter((item) => {
        const keyValue = collectionItemKey(item)
        return !keyValue || !deletedKeys.has(keyValue)
      })
      .map((item) => {
        const keyValue = collectionItemKey(item)
        return keyValue && upsertByKey.has(keyValue) ? upsertByKey.get(keyValue)! : item
      })
    const baselineKeys = new Set(baselineItems.map(collectionItemKey).filter((value): value is string => Boolean(value)))
    const additions = delta.upserts.filter((item) => {
      const keyValue = collectionItemKey(item)
      return !keyValue || !baselineKeys.has(keyValue)
    })
    expanded[key] = [...additions, ...merged] as never
  })

  return expanded
}

export function loadAppDataStateFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): AppDataState | null {
  try {
    const raw = storage.getItem(APP_STATE_STORAGE_KEY)
    if (!raw) return null

    const parsed = parseJson(raw) as AppDataState
    if (isSeedDeltaAppDataState(parsed)) {
      return normalizeAppDataState(expandAppDataStateFromStorage(parsed))
    }
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.projects)) {
      return null
    }
    return normalizeAppDataState(parsed)
  } catch {
    return null
  }
}

export function persistAppDataStateToStorage(
  state: AppDataState,
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  const payload: AppDataState = normalizeAppDataState({
    ...state,
    lastPersistedAt: new Date().toISOString(),
  })
  storage.setItem(APP_STATE_STORAGE_KEY, stringifyJson(compactAppDataStateForStorage(payload)))
}

export function clearAppDataStateFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  storage.removeItem(APP_STATE_STORAGE_KEY)
}
