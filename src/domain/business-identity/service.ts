import type { BusinessEntityType, BusinessIdentityPolicy, BusinessIdentityValidationResult } from './types'

export const BUSINESS_IDENTITY_POLICIES: Record<BusinessEntityType, BusinessIdentityPolicy> = {
  account: { entityType: 'account', prefix: 'ACC', minimumCounter: 0, minDigits: 4 },
  opportunity: { entityType: 'opportunity', prefix: 'OPP', minimumCounter: 0, minDigits: 4 },
  project: { entityType: 'project', prefix: 'P', minimumCounter: 999 },
  productionSystem: { entityType: 'productionSystem', prefix: 'S', minimumCounter: 999 },
  internalReusedSystem: { entityType: 'internalReusedSystem', prefix: 'M', minimumCounter: 0 },
  tenant: { entityType: 'tenant', prefix: 'T', minimumCounter: 999 },
  warranty: { entityType: 'warranty', prefix: 'WID', minimumCounter: 0, minDigits: 4 },
  document: { entityType: 'document', prefix: 'DOC', minimumCounter: 0, minDigits: 4 },
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function numericSuffix(value: string, prefix: string): number | null {
  const match = value.match(new RegExp(`^${escapeRegExp(prefix)}(\\d+)$`, 'i'))
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
