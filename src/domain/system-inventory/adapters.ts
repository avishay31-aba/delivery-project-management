import type { SystemInventoryRecord } from './types'
import { systemIdentity } from './service'

export function systemDisplayName(record: SystemInventoryRecord): string {
  return `${systemIdentity(record)} - ${record.productType || 'System'}`
}
