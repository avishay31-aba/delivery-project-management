import type { OwnerRecord } from './types'

function textValue(value: unknown): string {
  return value == null ? '' : String(value)
}

export function createOwnerRecord(): OwnerRecord {
  return {
    id: `owner-${crypto.randomUUID()}`,
    userId: '',
    userName: '',
    fullName: '',
    title: '',
    company: '',
    phoneNumber: '',
    email: '',
  }
}

export function normalizeOwnerRecord(owner: Partial<OwnerRecord>): OwnerRecord {
  return {
    id: textValue(owner.id) || `owner-${crypto.randomUUID()}`,
    userId: textValue(owner.userId),
    userName: textValue(owner.userName),
    fullName: textValue(owner.fullName),
    title: textValue(owner.title),
    company: textValue(owner.company),
    phoneNumber: textValue(owner.phoneNumber),
    email: textValue(owner.email),
  }
}

export function normalizeOwners(value: unknown): OwnerRecord[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((candidate): candidate is Partial<OwnerRecord> => Boolean(candidate) && typeof candidate === 'object')
    .map(normalizeOwnerRecord)
}

