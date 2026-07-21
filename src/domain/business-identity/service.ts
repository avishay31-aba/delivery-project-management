import type { BusinessEntityType, BusinessIdentityPolicy, BusinessIdentityValidationResult } from './types'
import type { IdCounters } from '@/data/seed.types'

export const BUSINESS_IDENTITY_POLICIES: Record<BusinessEntityType, BusinessIdentityPolicy> = {
  account: { entityType: 'account', prefix: 'C', minimumCounter: 0, minDigits: 6 },
  opportunity: { entityType: 'opportunity', prefix: 'OPP', minimumCounter: 0, minDigits: 6 },
  project: { entityType: 'project', prefix: 'P', minimumCounter: 0, minDigits: 6 },
  productionSystem: { entityType: 'productionSystem', prefix: 'S', minimumCounter: 0, minDigits: 6 },
  tenant: { entityType: 'tenant', prefix: 'T', minimumCounter: 0, minDigits: 6 },
  warranty: { entityType: 'warranty', prefix: 'W', minimumCounter: 0, minDigits: 6 },
  remark: { entityType: 'remark', prefix: 'R', minimumCounter: 0, minDigits: 6 },
  activity: { entityType: 'activity', prefix: 'ACT', minimumCounter: 0, minDigits: 6 },
  configurationHistory: { entityType: 'configurationHistory', prefix: 'CH', minimumCounter: 0, minDigits: 6 },
  purposeHistory: { entityType: 'purposeHistory', prefix: 'PH', minimumCounter: 0, minDigits: 6 },
  document: { entityType: 'document', prefix: 'DOC', minimumCounter: 0, minDigits: 6 },
  versionNumber: { entityType: 'versionNumber', prefix: 'VN', minimumCounter: 0, minDigits: 6 },
  buildNumber: { entityType: 'buildNumber', prefix: 'BN', minimumCounter: 0, minDigits: 6 },
  versionUpdate: { entityType: 'versionUpdate', prefix: 'VU', minimumCounter: 0, minDigits: 6 },
  versionUpdateAttachment: { entityType: 'versionUpdateAttachment', prefix: 'VUA', minimumCounter: 0, minDigits: 6 },
}

const BUSINESS_ID_RESERVATIONS_STORAGE_KEY = 'delivery-erp.business-id-reservations.v1'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function numericSuffix(value: string, prefix: string): number | null {
  const match = value.match(new RegExp(`^${escapeRegExp(prefix)}-?(\\d+)$`, 'i'))
  if (!match) return null

  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

export function businessIdentityPolicy(entityType: BusinessEntityType): BusinessIdentityPolicy {
  return BUSINESS_IDENTITY_POLICIES[entityType]
}

export function normalizeBusinessId(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function generateBusinessId(entityType: BusinessEntityType, existingIds: Array<string | null | undefined>): string {
  const policy = businessIdentityPolicy(entityType)
  const normalizedExistingIds = new Set(existingIds.map(normalizeBusinessId).filter(Boolean))
  const maxCounter = Array.from(normalizedExistingIds).reduce((max, value) => {
    const numeric = numericSuffix(value, policy.prefix)
    return numeric == null ? max : Math.max(max, numeric)
  }, policy.minimumCounter)

  let nextCounter = maxCounter + 1
  let nextId = formatBusinessId(policy, nextCounter)

  while (normalizedExistingIds.has(nextId)) {
    nextCounter += 1
    nextId = formatBusinessId(policy, nextCounter)
  }

  return nextId
}

function browserStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readReservedCounters(): Partial<Record<BusinessEntityType, number>> {
  const storage = browserStorage()
  if (!storage) return {}
  try {
    const parsed = JSON.parse(storage.getItem(BUSINESS_ID_RESERVATIONS_STORAGE_KEY) ?? '{}') as Partial<Record<BusinessEntityType, number>>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeReservedCounters(counters: Partial<Record<BusinessEntityType, number>>): void {
  const storage = browserStorage()
  if (!storage) return
  try {
    storage.setItem(BUSINESS_ID_RESERVATIONS_STORAGE_KEY, JSON.stringify(counters))
  } catch {
    // Browser storage can be unavailable in restricted contexts. Store counters remain authoritative.
  }
}

function maxExistingCounter(entityType: BusinessEntityType, existingIds: Array<string | null | undefined>): number {
  const policy = businessIdentityPolicy(entityType)
  const normalizedExistingIds = new Set(existingIds.map(normalizeBusinessId).filter(Boolean))
  return Array.from(normalizedExistingIds).reduce((max, value) => {
    const numeric = numericSuffix(value, policy.prefix)
    return numeric == null ? max : Math.max(max, numeric)
  }, policy.minimumCounter)
}

export function primeBusinessIdReservations(counters: Partial<Record<BusinessEntityType, number>>): void {
  const current = readReservedCounters()
  const next = { ...current }
  ;(Object.keys(BUSINESS_IDENTITY_POLICIES) as BusinessEntityType[]).forEach((entityType) => {
    const counter = counters[entityType]
    if (typeof counter === 'number' && Number.isFinite(counter)) {
      next[entityType] = Math.max(current[entityType] ?? 0, counter)
    }
  })
  writeReservedCounters(next)
}

export function reserveBusinessId(
  entityType: BusinessEntityType,
  existingIds: Array<string | null | undefined> = [],
  minimumCounter?: number,
): string {
  const policy = businessIdentityPolicy(entityType)
  const reservations = readReservedCounters()
  const baseCounter = Math.max(
    minimumCounter ?? policy.minimumCounter,
    reservations[entityType] ?? policy.minimumCounter,
    maxExistingCounter(entityType, existingIds),
  )
  let nextCounter = baseCounter + 1
  let nextId = formatBusinessId(policy, nextCounter)
  const normalizedExistingIds = new Set(existingIds.map(normalizeBusinessId).filter(Boolean))

  while (normalizedExistingIds.has(nextId)) {
    nextCounter += 1
    nextId = formatBusinessId(policy, nextCounter)
  }

  writeReservedCounters({ ...reservations, [entityType]: nextCounter })
  return nextId
}

export function generateBusinessIdFromCounter(
  entityType: BusinessEntityType,
  counters: IdCounters,
  existingIds: Array<string | null | undefined> = [],
): { counters: IdCounters; id: string } {
  const policy = businessIdentityPolicy(entityType)
  const nextId = reserveBusinessId(entityType, existingIds, counters[entityType] ?? policy.minimumCounter)
  const nextCounter = numericSuffix(nextId, policy.prefix) ?? counters[entityType] ?? policy.minimumCounter

  return {
    counters: {
      ...counters,
      [entityType]: nextCounter,
      ...(entityType === 'project' ? { pid: nextCounter } : {}),
      ...(entityType === 'productionSystem' ? { sid: nextCounter } : {}),
      ...(entityType === 'tenant' ? { tid: nextCounter } : {}),
    },
    id: nextId,
  }
}

export function ensureBusinessId(
  entityType: BusinessEntityType,
  value: string | null | undefined,
  existingIds: Array<string | null | undefined>,
): string {
  const normalized = normalizeBusinessId(value)
  return normalized || generateBusinessId(entityType, existingIds)
}

export function isBusinessIdUnique(
  value: string | null | undefined,
  existingIds: Array<string | null | undefined>,
  currentValue?: string | null,
): boolean {
  const normalized = normalizeBusinessId(value)
  if (!normalized) return false

  const normalizedCurrentValue = normalizeBusinessId(currentValue)
  return existingIds
    .map(normalizeBusinessId)
    .filter(Boolean)
    .filter((candidate) => candidate !== normalizedCurrentValue)
    .every((candidate) => candidate !== normalized)
}

export function validateBusinessId(
  entityType: BusinessEntityType,
  value: string | null | undefined,
  existingIds: Array<string | null | undefined>,
  currentValue?: string | null,
): BusinessIdentityValidationResult {
  const normalized = normalizeBusinessId(value)
  const policy = businessIdentityPolicy(entityType)
  const messages: string[] = []

  if (!normalized) {
    messages.push(`${policy.prefix} business ID is required.`)
  } else if (!isBusinessIdUnique(normalized, existingIds, currentValue)) {
    messages.push(`${normalized} is already used by another ${entityType}.`)
  }

  return { valid: messages.length === 0, messages }
}

export function duplicateBusinessIds(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  values.map(normalizeBusinessId).filter(Boolean).forEach((value) => {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  })

  return Array.from(duplicates)
}

function formatBusinessId(policy: BusinessIdentityPolicy, counter: number): string {
  const numeric = policy.minDigits ? String(counter).padStart(policy.minDigits, '0') : String(counter)
  return `${policy.prefix}${numeric}`
}
