import type { Account, DocumentRecord, Opportunity, Project, SalesManager, System, Tenant, WarrantyRecord } from '@/data/seed.types'
import type { ProjectHealthReadModel, ProjectPortfolioHealthSummary } from '@/domain/project-lifecycle'
import type { WarrantyDashboardRow, WarrantyDashboardSummary } from '@/domain/warranty-collection'

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

export interface CustomerDocumentReadModel extends DocumentRecord {
  sourceObjectType: 'Project' | 'System' | 'Tenant'
  sourceObjectId: string
  sourceObjectName: string
}

export interface CustomerAccount360ReadModel {
  account: Account
  accountManager: string
  opportunities: Opportunity[]
  projects: Project[]
  systems: System[]
  tenants: Tenant[]
  projectHealthRows: ProjectHealthReadModel[]
  projectHealthSummary: ProjectPortfolioHealthSummary
  warrantyRows: WarrantyDashboardRow[]
  warrantySummary: WarrantyDashboardSummary
  documents: CustomerDocumentReadModel[]
}
