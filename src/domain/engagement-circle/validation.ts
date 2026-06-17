import type { ContactPersonRecord } from './types'

export function isEngagementCircleContact(value: unknown): value is ContactPersonRecord {
  if (typeof value !== 'object' || value == null) return false
  const contact = value as Record<string, unknown>
  return (
    typeof contact.id === 'string' &&
    typeof contact.subject === 'string' &&
    typeof contact.role === 'string' &&
    typeof contact.userName === 'string' &&
    typeof contact.email === 'string'
  )
}
