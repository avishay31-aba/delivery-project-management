import type { Account, SalesManager, System, Tenant, WarrantyRecord } from '@/data/seed.types'

export type CustomerAccount = Account
export type CustomerAccountManager = SalesManager

export interface CustomerAccountPortfolioContext {
  systems: System[]
  tenants: Tenant[]
}

export interface CustomerAccountWarrantyContext {
  tenants: Tenant[]
  warrantyRecords: WarrantyRecord[]
}

export interface CustomerAccountDisplayContext {
  salesManagers: SalesManager[]
}

