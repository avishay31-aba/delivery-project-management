import type { Account, SalesManager, Tenant } from '@/data/seed.types'
import { CUSTOMER_TYPE_LABELS } from './metadata'

export function customerTypeLabel(account: Account): string {
  return CUSTOMER_TYPE_LABELS[account.customerType]
}

export function customerIdentity(account: Account): string {
  return account.accountCode
}

export function customerDisplayName(account: Account): string {
  return account.accountName
}

export function accountManagerDisplayName(
  salesManagerId: string | null | undefined,
  salesManagers: SalesManager[],
  fallback = '',
): string {
  if (!salesManagerId) return fallback
  return salesManagers.find((manager) => manager.id === salesManagerId)?.name ?? fallback
}

export function customerTenantDisplayName(tenant: Tenant): string {
  return tenant.tenantName || `${tenant.tid} ${tenant.accountName}`.trim()
}
