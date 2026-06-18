import type { Account, SalesManager, System, Tenant } from '@/data/seed.types'
import { CUSTOMER_TYPE_LABELS } from './metadata'

export function joinCustomerPortfolioValues(values: Array<string | null | undefined>): string {
  return values.filter((value): value is string => Boolean(value)).join(';')
}

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

export function customerSystems(accountId: string, systems: System[]): System[] {
  return systems.filter((system) => system.accountId === accountId)
}

export function customerTenants(accountId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) => tenant.accountId === accountId)
}

export function customerSystemCount(accountId: string, systems: System[]): number {
  return customerSystems(accountId, systems).length
}

export function customerTenantCount(accountId: string, tenants: Tenant[]): number {
  return customerTenants(accountId, tenants).length
}

export function customerSidList(accountId: string, systems: System[]): string {
  return joinCustomerPortfolioValues(customerSystems(accountId, systems).map((system) => system.sid))
}

export function customerTidList(accountId: string, tenants: Tenant[]): string {
  return joinCustomerPortfolioValues(customerTenants(accountId, tenants).map((tenant) => tenant.tid))
}

export function customerTenantNameList(accountId: string, tenants: Tenant[]): string {
  return joinCustomerPortfolioValues(customerTenants(accountId, tenants).map(customerTenantDisplayName))
}
