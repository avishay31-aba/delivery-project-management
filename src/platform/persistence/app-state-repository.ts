import type { AppDataState } from '@/data/seed.types'
import seedJson from '@/data/seed.json'
import { normalizeAppDataState } from './app-state-migration'
import { parseJson, stringifyJson } from './json'
import { localStoragePersistenceAdapter } from './local-storage'
import {
  buildPersistenceWriteDiagnostic,
  captureStorageDiagnosticSnapshot,
  recordPersistenceWriteDiagnostic,
} from './storage-diagnostics'
import type { KeyValuePersistenceAdapter } from './types'

export const APP_STATE_STORAGE_KEY = 'dpm-mvp-v1'
const APP_STATE_DELTA_FORMAT = 'dpm-seed-delta-v1'
const APP_STATE_KEYED_DELTA_FORMAT = 'dpm-keyed-seed-delta-v1'
export const APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT = 'dpm-compressed-keyed-seed-delta-v1'
const LEGACY_FULL_STATE_MAX_SAFE_CHARS = 4_500_000
const CROSS_TAB_NOTIFICATION_STORAGE_KEY = 'delivery-erp-state-sync-notification'
const LEGACY_MIGRATION_TEMP_STORAGE_KEY = 'delivery-erp-legacy-state-migration-v1'
const STALE_NOTIFICATION_MAX_SAFE_CHARS = 100_000

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
  'countryLookups',
  'usStateLookups',
  'timeGroupLookups',
  'userPresentationPreferences',
  'versionUpgradeRecords',
  'versionUpdates',
  'infrastructureItems',
  'activityEvents',
  'roles',
  'userRoleAssignments',
  'notificationRules',
  'notificationRecords',
  'alertRecords',
  'reminderExecutions',
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

interface KeyedSeedDeltaAppDataState {
  persistenceFormat: typeof APP_STATE_KEYED_DELTA_FORMAT
  keys: string[]
  payload: unknown
}

interface CompressedKeyedSeedDeltaAppDataState {
  persistenceFormat: typeof APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT
  payload: string
}

export interface AppDataStateStorageCommit {
  version: string
  persistenceFormat: string
  rawLength: number
}

interface BaselineCollectionCache {
  itemsByKey: Map<string, AppDataCollectionItem> | null
  itemJsonByKey: Map<string, string> | null
}

interface StorageEntryDiagnostic {
  key: string
  length: number
  format: string
  obsolete: boolean
}

export interface AppDataCollectionStorageProjectionDiagnostic {
  key: AppDataCollectionKey
  currentCount: number
  baselineCount: number
  upsertCount: number
  deletedCount: number
  fullCount: number
  serializedLength: number
  sampleDiffPaths: string[]
}

export interface AppDataStateStorageProjectionDiagnostic {
  fullStateLength: number
  rawDeltaLength: number
  keyedDeltaLength: number
  compressedPayloadLength: number
  serializedPayloadLength: number
  collections: AppDataCollectionStorageProjectionDiagnostic[]
}

export interface AppDataStatePersistenceProjectionProfile extends AppDataStateStorageProjectionDiagnostic {
  timingsMs: {
    normalize: number
    compactDelta: number
    stringifyRawDelta: number
    keyDelta: number
    stringifyKeyedDelta: number
    compress: number
    stringifyFinalPayload: number
    total: number
  }
}

let cachedSeedBaselineState: AppDataState | null = null
let cachedRawAppDataState: { raw: string; state: AppDataState } | null = null
let cachedBaselineCollections: Partial<Record<AppDataCollectionKey, BaselineCollectionCache>> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException
    ? error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    : error instanceof Error && /quota/i.test(error.message)
}

function isSeedDeltaAppDataState(value: unknown): value is SeedDeltaAppDataState {
  return isRecord(value) && value.persistenceFormat === APP_STATE_DELTA_FORMAT
}

function isKeyedSeedDeltaAppDataState(value: unknown): value is KeyedSeedDeltaAppDataState {
  return (
    isRecord(value) &&
    value.persistenceFormat === APP_STATE_KEYED_DELTA_FORMAT &&
    Array.isArray(value.keys)
  )
}

function isCompressedKeyedSeedDeltaAppDataState(value: unknown): value is CompressedKeyedSeedDeltaAppDataState {
  return (
    isRecord(value) &&
    value.persistenceFormat === APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT &&
    typeof value.payload === 'string'
  )
}

function storageKeys(storage: KeyValuePersistenceAdapter): string[] {
  if (typeof storage.key !== 'function' || typeof storage.length !== 'number') {
    return [APP_STATE_STORAGE_KEY, CROSS_TAB_NOTIFICATION_STORAGE_KEY]
  }
  const keys: string[] = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key) keys.push(key)
  }
  return keys
}

function isDpmStorageKey(key: string): boolean {
  return key === APP_STATE_STORAGE_KEY ||
    key === CROSS_TAB_NOTIFICATION_STORAGE_KEY ||
    key === LEGACY_MIGRATION_TEMP_STORAGE_KEY ||
    key.startsWith('dpm-') ||
    key.startsWith('dpm.') ||
    key.startsWith('delivery-erp')
}

function storageEntryFormat(raw: string): string {
  try {
    const parsed = parseJson(raw)
    if (isRecord(parsed) && typeof parsed.persistenceFormat === 'string') return parsed.persistenceFormat
    if (isRecord(parsed) && typeof parsed.type === 'string') return parsed.type
    if (isRecord(parsed) && typeof parsed.version === 'number' && Array.isArray(parsed.projects)) return 'legacy-full-app-state'
    return typeof parsed
  } catch {
    return 'unparseable'
  }
}

function isObsoleteDpmStorageEntry(key: string, raw: string): boolean {
  if (key === APP_STATE_STORAGE_KEY) {
    try {
      const parsed = parseJson(raw)
      if (isCompressedKeyedSeedDeltaAppDataState(parsed) || isKeyedSeedDeltaAppDataState(parsed) || isSeedDeltaAppDataState(parsed)) {
        return false
      }
      return isRecord(parsed) && typeof parsed.version === 'number' && Array.isArray(parsed.projects) && raw.length > LEGACY_FULL_STATE_MAX_SAFE_CHARS
    } catch {
      return raw.length > LEGACY_FULL_STATE_MAX_SAFE_CHARS
    }
  }

  if (key === CROSS_TAB_NOTIFICATION_STORAGE_KEY) {
    try {
      const parsed = parseJson(raw)
      return isRecord(parsed) && (
        parsed.type === 'STATE_SNAPSHOT' ||
        raw.length > STALE_NOTIFICATION_MAX_SAFE_CHARS
      )
    } catch {
      return raw.length > STALE_NOTIFICATION_MAX_SAFE_CHARS
    }
  }

  return false
}

export function inspectDpmStorage(storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter): StorageEntryDiagnostic[] {
  return storageKeys(storage)
    .filter(isDpmStorageKey)
    .map((key) => {
      const raw = storage.getItem(key) ?? ''
      return {
        key,
        length: raw.length,
        format: storageEntryFormat(raw),
        obsolete: isObsoleteDpmStorageEntry(key, raw),
      }
    })
}

function removeObsoleteDpmStorage(storage: KeyValuePersistenceAdapter): StorageEntryDiagnostic[] {
  const diagnostics = inspectDpmStorage(storage)
  diagnostics
    .filter((entry) => entry.obsolete)
    .forEach((entry) => storage.removeItem(entry.key))
  if (diagnostics.some((entry) => entry.key === APP_STATE_STORAGE_KEY && entry.obsolete)) {
    cachedRawAppDataState = null
  }
  return diagnostics
}

function logStorageDiagnostics(
  phase: string,
  diagnostics: StorageEntryDiagnostic[],
  nextRawLength: number,
  error?: unknown,
) {
  if (typeof console === 'undefined') return
  const totalDpmChars = diagnostics.reduce((sum, entry) => sum + entry.length, 0)
  console.warn('Delivery ERP persistence diagnostic', {
    phase,
    nextFormat: APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
    nextRawLength,
    totalDpmStorageChars: totalDpmChars,
    entries: diagnostics,
    error: error instanceof Error ? { name: error.name, message: error.message } : undefined,
  })
}

function seedBaselineState(): AppDataState {
  if (!cachedSeedBaselineState) {
    cachedSeedBaselineState = normalizeAppDataState({
      ...(seedJson as unknown as AppDataState),
      lastPersistedAt: null,
    })
  }
  return cachedSeedBaselineState
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

function diffPaths(left: unknown, right: unknown, prefix = '', paths: string[] = []): string[] {
  if (valuesEqual(left, right)) return paths
  if (!isRecord(left) || !isRecord(right)) {
    paths.push(prefix || '<root>')
    return paths
  }
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  keys.forEach((key) => diffPaths(left[key], right[key], prefix ? `${prefix}.${key}` : key, paths))
  return paths
}

function keyIndexFor(key: string, keys: string[], keyIndexes: Map<string, number>): string {
  const existingIndex = keyIndexes.get(key)
  if (existingIndex !== undefined) return String(existingIndex)
  keys.push(key)
  keyIndexes.set(key, keys.length - 1)
  return String(keys.length - 1)
}

function encodeObjectKeys(value: unknown, keys: string[], keyIndexes: Map<string, number>): unknown {
  if (Array.isArray(value)) return value.map((item) => encodeObjectKeys(item, keys, keyIndexes))
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      keyIndexFor(key, keys, keyIndexes),
      encodeObjectKeys(item, keys, keyIndexes),
    ]),
  )
}

function decodeObjectKeys(value: unknown, keys: string[]): unknown {
  if (Array.isArray(value)) return value.map((item) => decodeObjectKeys(item, keys))
  if (!isRecord(value)) return value

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      keys[Number(key)] ?? key,
      decodeObjectKeys(item, keys),
    ]),
  )
}

function keyedSeedDeltaAppDataState(delta: SeedDeltaAppDataState): KeyedSeedDeltaAppDataState {
  const keys: string[] = []
  const keyIndexes = new Map<string, number>()
  return {
    persistenceFormat: APP_STATE_KEYED_DELTA_FORMAT,
    keys,
    payload: encodeObjectKeys(delta, keys, keyIndexes),
  }
}

const BASE64_COMPRESSED_PAYLOAD_PREFIX = 'b64:'

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function compressString(value: string): string {
  const bytes = new TextEncoder().encode(value)
  const dictionary = new Map<string, number>()
  const maxDictionaryCode = 55263
  let nextCode = 256
  let current = ''
  let output = ''

  function resetDictionary() {
    dictionary.clear()
    nextCode = 256
  }

  function codeFor(entry: string): number {
    return entry.length === 1 ? entry.charCodeAt(0) : dictionary.get(entry) ?? -1
  }

  function appendCode(code: number) {
    if (code < 0) throw new Error('App state compression failed.')
    output += String.fromCharCode(code + 32)
  }

  for (const byte of bytes) {
    const character = String.fromCharCode(byte)
    const combined = current + character
    if (combined.length === 1 || dictionary.has(combined)) {
      current = combined
      continue
    }

    appendCode(codeFor(current))
    if (nextCode <= maxDictionaryCode) {
      dictionary.set(combined, nextCode)
      nextCode += 1
    } else {
      resetDictionary()
    }
    current = character
  }

  if (current) appendCode(codeFor(current))
  return output
}

function decompressString(value: string): string {
  if (value.startsWith(BASE64_COMPRESSED_PAYLOAD_PREFIX)) {
    return new TextDecoder().decode(base64ToBytes(value.slice(BASE64_COMPRESSED_PAYLOAD_PREFIX.length)))
  }
  return legacyDecompressString(value)
}

function legacyDecompressString(value: string): string {
  const dictionary = new Map<number, string>()
  const maxDictionaryCode = 55263
  let nextCode = 256
  let previous = ''
  const bytes: number[] = []

  function resetDictionary() {
    dictionary.clear()
    nextCode = 256
  }

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index) - 32
    const entry = code < 256
      ? String.fromCharCode(code)
      : dictionary.get(code) ?? (code === nextCode ? previous + previous.charAt(0) : '')
    if (!entry) throw new Error('Compressed app state payload is invalid.')
    for (let charIndex = 0; charIndex < entry.length; charIndex += 1) {
      bytes.push(entry.charCodeAt(charIndex))
    }

    if (previous) {
      if (nextCode <= maxDictionaryCode) {
        dictionary.set(nextCode, previous + entry.charAt(0))
        nextCode += 1
      } else {
        resetDictionary()
      }
    }
    previous = entry
  }

  return new TextDecoder().decode(new Uint8Array(bytes))
}

function compressedKeyedSeedDeltaAppDataState(delta: SeedDeltaAppDataState): CompressedKeyedSeedDeltaAppDataState {
  return {
    persistenceFormat: APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
    payload: compressString(stringifyJson(keyedSeedDeltaAppDataState(delta))),
  }
}

export function analyzeAppDataStateStorageProjection(state: AppDataState): AppDataStateStorageProjectionDiagnostic {
  const payload: AppDataState = normalizeAppDataState({
    ...state,
    lastPersistedAt: state.lastPersistedAt ?? new Date().toISOString(),
  })
  const delta = compactAppDataStateForStorage(payload)
  const keyed = keyedSeedDeltaAppDataState(delta)
  const compressed = compressedKeyedSeedDeltaAppDataState(delta)
  const collectionDiagnostics = APP_DATA_COLLECTION_KEYS.map((key) => {
    const collectionDeltaValue = delta.collections[key]
    const currentItems = payload[key] as AppDataCollectionItem[]
    const baselineItems = seedBaselineState()[key] as AppDataCollectionItem[]
    const baselineItemsByKey = collectionByKey(baselineItems)
    const sampleUpsert = collectionDeltaValue?.upserts.find((item) => {
      const itemKey = collectionItemKey(item)
      return itemKey && baselineItemsByKey?.has(itemKey)
    })
    const sampleKey = sampleUpsert ? collectionItemKey(sampleUpsert) : null
    return {
      key,
      currentCount: currentItems.length,
      baselineCount: baselineItems.length,
      upsertCount: collectionDeltaValue?.upserts.length ?? 0,
      deletedCount: collectionDeltaValue?.deletedKeys.length ?? 0,
      fullCount: collectionDeltaValue?.full?.length ?? 0,
      serializedLength: collectionDeltaValue ? stringifyJson(collectionDeltaValue).length : 0,
      sampleDiffPaths: sampleUpsert && sampleKey && baselineItemsByKey
        ? diffPaths(baselineItemsByKey.get(sampleKey), sampleUpsert).slice(0, 20)
        : [],
    }
  }).sort((left, right) => right.serializedLength - left.serializedLength || left.key.localeCompare(right.key))

  return {
    fullStateLength: stringifyJson(payload).length,
    rawDeltaLength: stringifyJson(delta).length,
    keyedDeltaLength: stringifyJson(keyed).length,
    compressedPayloadLength: compressed.payload.length,
    serializedPayloadLength: stringifyJson(compressed).length,
    collections: collectionDiagnostics,
  }
}

export function profileAppDataStateStorageProjection(state: AppDataState): AppDataStatePersistenceProjectionProfile {
  const startedAt = performance.now()
  const payload: AppDataState = normalizeAppDataState({
    ...state,
    lastPersistedAt: state.lastPersistedAt ?? new Date().toISOString(),
  })
  const normalizedAt = performance.now()
  const delta = compactAppDataStateForStorage(payload)
  const compactedAt = performance.now()
  const rawDelta = stringifyJson(delta)
  const rawStringifiedAt = performance.now()
  const keyed = keyedSeedDeltaAppDataState(delta)
  const keyedAt = performance.now()
  const keyedDelta = stringifyJson(keyed)
  const keyedStringifiedAt = performance.now()
  const compressed = compressedKeyedSeedDeltaAppDataState(delta)
  const compressedAt = performance.now()
  const serialized = stringifyJson(compressed)
  const finishedAt = performance.now()
  const diagnostic = analyzeAppDataStateStorageProjection(payload)

  return {
    ...diagnostic,
    rawDeltaLength: rawDelta.length,
    keyedDeltaLength: keyedDelta.length,
    compressedPayloadLength: compressed.payload.length,
    serializedPayloadLength: serialized.length,
    timingsMs: {
      normalize: normalizedAt - startedAt,
      compactDelta: compactedAt - normalizedAt,
      stringifyRawDelta: rawStringifiedAt - compactedAt,
      keyDelta: keyedAt - rawStringifiedAt,
      stringifyKeyedDelta: keyedStringifiedAt - keyedAt,
      compress: compressedAt - keyedStringifiedAt,
      stringifyFinalPayload: finishedAt - compressedAt,
      total: finishedAt - startedAt,
    },
  }
}

function seedDeltaAppDataStateFromKeyed(storedState: KeyedSeedDeltaAppDataState): SeedDeltaAppDataState | null {
  const decoded = decodeObjectKeys(storedState.payload, storedState.keys)
  return isSeedDeltaAppDataState(decoded) ? decoded : null
}

function seedDeltaAppDataStateFromCompressedKeyed(storedState: CompressedKeyedSeedDeltaAppDataState): SeedDeltaAppDataState | null {
  try {
    const keyed = parseJson(decompressString(storedState.payload))
    return isKeyedSeedDeltaAppDataState(keyed) ? seedDeltaAppDataStateFromKeyed(keyed) : null
  } catch {
    return null
  }
}

export function readAppDataStateStorageCommit(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): AppDataStateStorageCommit | null {
  try {
    const raw = storage.getItem(APP_STATE_STORAGE_KEY)
    if (!raw) return null
    const parsed = parseJson(raw) as AppDataState
    if (isCompressedKeyedSeedDeltaAppDataState(parsed)) {
      const decoded = seedDeltaAppDataStateFromCompressedKeyed(parsed)
      return decoded?.lastPersistedAt
        ? { version: decoded.lastPersistedAt, persistenceFormat: parsed.persistenceFormat, rawLength: raw.length }
        : null
    }
    if (isKeyedSeedDeltaAppDataState(parsed)) {
      const decoded = seedDeltaAppDataStateFromKeyed(parsed)
      return decoded?.lastPersistedAt
        ? { version: decoded.lastPersistedAt, persistenceFormat: parsed.persistenceFormat, rawLength: raw.length }
        : null
    }
    if (isSeedDeltaAppDataState(parsed)) {
      return parsed.lastPersistedAt
        ? { version: parsed.lastPersistedAt, persistenceFormat: parsed.persistenceFormat, rawLength: raw.length }
        : null
    }
    if (typeof parsed.version === 'number' && typeof parsed.lastPersistedAt === 'string') {
      return {
        version: parsed.lastPersistedAt,
        persistenceFormat: 'legacy-full-app-state',
        rawLength: raw.length,
      }
    }
    return null
  } catch {
    return null
  }
}

function collectionDelta(
  currentItems: AppDataCollectionItem[],
  baselineItems: AppDataCollectionItem[],
  baselineCache?: BaselineCollectionCache,
): AppDataCollectionDelta | null {
  const currentByKey = collectionByKey(currentItems)
  const baselineByKey = baselineCache?.itemsByKey ?? collectionByKey(baselineItems)
  if (!currentByKey || !baselineByKey) {
    return valuesEqual(currentItems, baselineItems) ? null : { upserts: [], deletedKeys: [], full: currentItems }
  }

  const upserts = currentItems.filter((item) => {
    const key = collectionItemKey(item)
    if (!key) return true
    const baselineJson = baselineCache?.itemJsonByKey?.get(key)
    return baselineJson === undefined
      ? !valuesEqual(item, baselineByKey.get(key))
      : stringifyJson(item) !== baselineJson
  })
  const deletedKeys = Array.from(baselineByKey.keys()).filter((key) => !currentByKey.has(key))

  return upserts.length === 0 && deletedKeys.length === 0
    ? null
    : { upserts, deletedKeys }
}

function baselineCollectionCache(): Partial<Record<AppDataCollectionKey, BaselineCollectionCache>> {
  if (cachedBaselineCollections) return cachedBaselineCollections
  const baseline = seedBaselineState()
  cachedBaselineCollections = {}
  APP_DATA_COLLECTION_KEYS.forEach((key) => {
    const items = baseline[key] as AppDataCollectionItem[]
    const itemsByKey = collectionByKey(items)
    cachedBaselineCollections![key] = {
      itemsByKey,
      itemJsonByKey: itemsByKey
        ? new Map(items.map((item) => {
            const itemKey = collectionItemKey(item)
            return [itemKey ?? '', stringifyJson(item)] as const
          }).filter(([itemKey]) => itemKey))
        : null,
    }
  })
  return cachedBaselineCollections
}

function compactAppDataStateForStorage(state: AppDataState): SeedDeltaAppDataState {
  const baseline = seedBaselineState()
  const baselineCollections = baselineCollectionCache()
  const collections: SeedDeltaAppDataState['collections'] = {}

  APP_DATA_COLLECTION_KEYS.forEach((key) => {
    const delta = collectionDelta(
      state[key] as AppDataCollectionItem[],
      baseline[key] as AppDataCollectionItem[],
      baselineCollections[key],
    )
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

function serializeCompressedAppDataState(state: AppDataState): string {
  const payload = normalizeAppDataState({
    ...state,
    lastPersistedAt: state.lastPersistedAt ?? new Date().toISOString(),
  })
  return stringifyJson(compressedKeyedSeedDeltaAppDataState(compactAppDataStateForStorage(payload)))
}

function decodeCompressedAppDataState(raw: string): AppDataState | null {
  try {
    const parsed = parseJson(raw)
    if (!isCompressedKeyedSeedDeltaAppDataState(parsed)) return null
    const decoded = seedDeltaAppDataStateFromCompressedKeyed(parsed)
    return decoded ? normalizeAppDataState(expandAppDataStateFromStorage(decoded)) : null
  } catch {
    return null
  }
}

function migrateLegacyFullStateToCompressedStorage(
  raw: string,
  parsed: AppDataState,
  storage: KeyValuePersistenceAdapter,
): AppDataState | null {
  const legacyState = normalizeAppDataState(parsed)
  const migratedRaw = serializeCompressedAppDataState(legacyState)
  const usageBefore = captureStorageDiagnosticSnapshot(storage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT)

  try {
    storage.setItem(LEGACY_MIGRATION_TEMP_STORAGE_KEY, migratedRaw)
    const tempRaw = storage.getItem(LEGACY_MIGRATION_TEMP_STORAGE_KEY)
    if (tempRaw !== migratedRaw || !decodeCompressedAppDataState(tempRaw)) {
      throw new Error('Legacy state migration verification failed before replacing the original payload.')
    }

    storage.setItem(APP_STATE_STORAGE_KEY, migratedRaw)
    const committedRaw = storage.getItem(APP_STATE_STORAGE_KEY)
    const committedState = committedRaw ? decodeCompressedAppDataState(committedRaw) : null
    if (committedRaw !== migratedRaw || !committedState) {
      try {
        storage.setItem(APP_STATE_STORAGE_KEY, raw)
      } catch {
        // The original oversized payload remains recoverable only when the browser accepts restoring it.
      }
      throw new Error('Legacy state migration verification failed after writing the compact payload.')
    }

    storage.removeItem(LEGACY_MIGRATION_TEMP_STORAGE_KEY)
    recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
      'legacy-full-state-migration-succeeded',
      migratedRaw,
      APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
      storage,
      { usageBefore },
    ))
    cachedRawAppDataState = { raw: migratedRaw, state: committedState }
    return committedState
  } catch (error) {
    try {
      storage.removeItem(LEGACY_MIGRATION_TEMP_STORAGE_KEY)
    } catch {
      // Best effort cleanup only; preserving dpm-mvp-v1 is the critical safety condition.
    }
    recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
      'legacy-full-state-migration-failed-preserved-original',
      migratedRaw,
      APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
      storage,
      { usageBefore, error },
    ))
    console.error('Delivery ERP legacy browser data migration failed. The original dpm-mvp-v1 payload was preserved.', error)
    cachedRawAppDataState = { raw, state: legacyState }
    return legacyState
  }
}

export function loadAppDataStateFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): AppDataState | null {
  try {
    const raw = storage.getItem(APP_STATE_STORAGE_KEY)
    if (!raw) return null
    if (cachedRawAppDataState?.raw === raw) return cachedRawAppDataState.state

    const parsed = parseJson(raw) as AppDataState
    if (isCompressedKeyedSeedDeltaAppDataState(parsed)) {
      const decoded = seedDeltaAppDataStateFromCompressedKeyed(parsed)
      if (!decoded) return null
      const state = normalizeAppDataState(expandAppDataStateFromStorage(decoded))
      cachedRawAppDataState = { raw, state }
      return state
    }
    if (isKeyedSeedDeltaAppDataState(parsed)) {
      const decoded = seedDeltaAppDataStateFromKeyed(parsed)
      if (!decoded) return null
      const state = normalizeAppDataState(expandAppDataStateFromStorage(decoded))
      cachedRawAppDataState = { raw, state }
      return state
    }
    if (isSeedDeltaAppDataState(parsed)) {
      const state = normalizeAppDataState(expandAppDataStateFromStorage(parsed))
      cachedRawAppDataState = { raw, state }
      return state
    }
    if (typeof parsed.version !== 'number' || !Array.isArray(parsed.projects)) {
      return null
    }
    const state = normalizeAppDataState(parsed)
    if (raw.length > LEGACY_FULL_STATE_MAX_SAFE_CHARS) {
      return migrateLegacyFullStateToCompressedStorage(raw, state, storage)
    }
    cachedRawAppDataState = { raw, state }
    return state
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
    lastPersistedAt: state.lastPersistedAt ?? new Date().toISOString(),
  })
  const raw = stringifyJson(compressedKeyedSeedDeltaAppDataState(compactAppDataStateForStorage(payload)))
  const usageBefore = captureStorageDiagnosticSnapshot(storage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT)
  recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
    'before-initial-write',
    raw,
    APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
    storage,
    { usageBefore },
  ))
  try {
    storage.setItem(APP_STATE_STORAGE_KEY, raw)
    recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
      'initial-write-succeeded',
      raw,
      APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
      storage,
      { usageBefore },
    ))
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
        'initial-write-failed-non-quota',
        raw,
        APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
        storage,
        { usageBefore, error },
      ))
      throw error
    }
    const diagnostics = removeObsoleteDpmStorage(storage)
    const usageAfterCleanup = captureStorageDiagnosticSnapshot(storage, APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT)
    const cleanupRemovedKeys = diagnostics.filter((entry) => entry.obsolete).map((entry) => entry.key)
    recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
      'initial-write-quota-failed-after-cleanup',
      raw,
      APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
      storage,
      {
        obsoleteCleanupRan: true,
        cleanupRemovedKeys,
        usageBefore,
        usageAfterCleanup,
        error,
      },
    ))
    logStorageDiagnostics('quota-before-retry', diagnostics, raw.length, error)
    if (!diagnostics.some((entry) => entry.obsolete)) throw error
    try {
      storage.setItem(APP_STATE_STORAGE_KEY, raw)
    } catch (retryError) {
      recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
        'quota-retry-failed',
        raw,
        APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
        storage,
        {
          obsoleteCleanupRan: true,
          cleanupRemovedKeys,
          usageBefore,
          usageAfterCleanup,
          error: retryError,
        },
      ))
      throw retryError
    }
    recordPersistenceWriteDiagnostic(buildPersistenceWriteDiagnostic(
      'quota-retry-succeeded',
      raw,
      APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT,
      storage,
      {
        obsoleteCleanupRan: true,
        cleanupRemovedKeys,
        usageBefore,
        usageAfterCleanup,
      },
    ))
    logStorageDiagnostics('quota-retry-succeeded', inspectDpmStorage(storage), raw.length)
  }
  cachedRawAppDataState = { raw, state: payload }
}

export function clearAppDataStateFromStorage(
  storage: KeyValuePersistenceAdapter = localStoragePersistenceAdapter,
): void {
  storage.removeItem(APP_STATE_STORAGE_KEY)
  cachedRawAppDataState = null
}
