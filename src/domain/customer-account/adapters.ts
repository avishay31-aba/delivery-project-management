import type { Tenant, WarrantyRecord } from '@/data/seed.types'
import { warrantySummaryForAccount } from '@/domain/warranty-collection'

export function customerWarrantySummary(
  accountId: string,
  tenants: Tenant[],
  warrantyRecords: WarrantyRecord[],
): string {
  return warrantySummaryForAccount(accountId, tenants, warrantyRecords)
}
