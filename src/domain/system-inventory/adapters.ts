import type { SystemInventoryRecord } from './types'
import { systemIdentity, systemSource } from './service'

export function systemDisplayName(record: SystemInventoryRecord): string {
  return `${systemIdentity(record)} - ${record.productType || 'System'}`
}

export function systemSourceLabel(record: SystemInventoryRecord): string {
  return systemSource(record)
}
