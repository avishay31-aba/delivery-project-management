import { readFileSync } from 'node:fs'

const seed = JSON.parse(readFileSync('src/data/seed.json', 'utf8'))
const STORAGE_FORMAT = 'dpm-seed-delta-v1'
const KEYED_FORMAT = 'dpm-keyed-seed-delta-v1'
const COMPRESSED_KEYED_FORMAT = 'dpm-compressed-keyed-seed-delta-v1'
const COLLECTION_KEYS = [
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
]

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8')
}

function itemKey(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return null
  const key = item.id ?? item.warrantyRecordId
  return typeof key === 'string' && key.trim() ? key : null
}

function mapByKey(items) {
  const out = new Map()
  for (const item of items) {
    const key = itemKey(item)
    if (!key) return null
    out.set(key, item)
  }
  return out
}

function compactState(state, baseline) {
  const collections = {}
  COLLECTION_KEYS.forEach((key) => {
    const current = state[key] ?? []
    const base = baseline[key] ?? []
    const currentByKey = mapByKey(current)
    const baseByKey = mapByKey(base)
    if (!currentByKey || !baseByKey) {
      if (JSON.stringify(current) !== JSON.stringify(base)) collections[key] = { upserts: [], deletedKeys: [], full: current }
      return
    }
    const upserts = current.filter((item) => {
      const keyValue = itemKey(item)
      return !keyValue || JSON.stringify(item) !== JSON.stringify(baseByKey.get(keyValue))
    })
    const deletedKeys = [...baseByKey.keys()].filter((keyValue) => !currentByKey.has(keyValue))
    if (upserts.length > 0 || deletedKeys.length > 0) collections[key] = { upserts, deletedKeys }
  })
  return {
    persistenceFormat: STORAGE_FORMAT,
    version: state.version,
    lastPersistedAt: state.lastPersistedAt ?? new Date('2026-09-28T00:00:00.000Z').toISOString(),
    idCounters: state.idCounters,
    collections,
  }
}

function encodeKeys(value, keys, indexes) {
  if (Array.isArray(value)) return value.map((item) => encodeKeys(item, keys, indexes))
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    let index = indexes.get(key)
    if (index === undefined) {
      keys.push(key)
      index = keys.length - 1
      indexes.set(key, index)
    }
    return [String(index), encodeKeys(item, keys, indexes)]
  }))
}

function keyed(delta) {
  const keys = []
  return { persistenceFormat: KEYED_FORMAT, keys, payload: encodeKeys(delta, keys, new Map()) }
}

function compressedPayload(value) {
  const bytes = Buffer.from(value, 'utf8')
  const dictionary = new Map()
  const maxDictionaryCode = 55263
  let nextCode = 256
  let current = ''
  let output = ''

  function resetDictionary() {
    dictionary.clear()
    nextCode = 256
  }

  function codeFor(entry) {
    return entry.length === 1 ? entry.charCodeAt(0) : dictionary.get(entry) ?? -1
  }

  function appendCode(code) {
    if (code < 0) throw new Error('Storage verifier compression failed.')
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

function persistedPayload(state, baseline = seed) {
  const keyedJson = JSON.stringify(keyed(compactState(state, baseline)))
  const compressed = compressedPayload(keyedJson)
  return JSON.stringify({
    persistenceFormat: COMPRESSED_KEYED_FORMAT,
    payload: compressed,
  })
}

function withProjectSave(state) {
  return {
    ...state,
    projects: state.projects.map((project, index) => index === 0 ? { ...project, projectComments: '<p>Storage verification project save.</p>', updatedAt: '2026-09-28T09:00:00.000Z' } : project),
  }
}

function withSystemSave(state) {
  return {
    ...state,
    systems: state.systems.map((system, index) => index === 0 ? { ...system, remarks: [...(system.remarks ?? []), { id: 'remark-storage-verification', remarkId: 'R999998', createdAt: '2026-09-28T09:00:00.000Z', author: 'Storage Verifier', type: 'Note', content: 'Storage verification system save.', dueDate: null }], updatedAt: '2026-09-28T09:00:00.000Z' } : system),
  }
}

function withTenantSave(state) {
  return {
    ...state,
    tenants: state.tenants.map((tenant, index) => index === 0 ? { ...tenant, remarks: [...(tenant.remarks ?? []), { id: 'remark-storage-tenant-verification', remarkId: 'R999999', createdAt: '2026-09-28T09:00:00.000Z', author: 'Storage Verifier', type: 'Note', content: 'Storage verification tenant save.', dueDate: null }], updatedAt: '2026-09-28T09:00:00.000Z' } : tenant),
  }
}

const collectionStats = COLLECTION_KEYS
  .map((key) => ({ key, count: (seed[key] ?? []).length, bytes: bytes(seed[key] ?? []) }))
  .sort((first, second) => second.bytes - first.bytes)

const cleanPayload = persistedPayload(seed)
const projectPayload = persistedPayload(withProjectSave(seed))
const systemPayload = persistedPayload(withSystemSave(seed))
const tenantPayload = persistedPayload(withTenantSave(seed))
const combinedPayload = persistedPayload(withTenantSave(withSystemSave(withProjectSave(seed))))
const repeatedPayload = persistedPayload(withTenantSave(withSystemSave(withProjectSave(seed))))

console.log(JSON.stringify({
  fullSeedBytes: bytes(seed),
  cleanStorageChars: cleanPayload.length,
  projectSaveStorageChars: projectPayload.length,
  systemSaveStorageChars: systemPayload.length,
  tenantSaveStorageChars: tenantPayload.length,
  combinedRepresentativeSaveStorageChars: combinedPayload.length,
  repeatedInitializationGrows: repeatedPayload.length !== combinedPayload.length,
  largestCollections: collectionStats.slice(0, 8),
  recordCounts: Object.fromEntries(collectionStats.map((row) => [row.key, row.count])),
}, null, 2))

if (combinedPayload.length > 4_500_000) {
  console.error('Representative persisted dpm-mvp-v1 payload is too close to common browser localStorage limits.')
  process.exit(1)
}
if (repeatedPayload.length !== combinedPayload.length) {
  console.error('Repeated persistence simulation grew without a new business change.')
  process.exit(1)
}
