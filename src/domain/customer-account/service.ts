import { projectDashboardPercent, projectHealthReadModel, projectPortfolioHealthSummary } from '@/domain/project-lifecycle'
import { requirementCoverageRowsForAccount, requirementCoverageRowsForProject, requirementCoverageSummary, type RequirementCoverageRow } from '@/domain/requirement-coverage'
import { systemIdentity } from '@/domain/system-inventory'
import type { Account, Opportunity, Project, ProjectSystemLink, ProjectTenantLink, SalesManager, System, Tenant } from '@/data/seed.types'
import { warrantyDashboardSummary, type WarrantyDashboardRow } from '@/domain/warranty-collection'
import { CUSTOMER_TYPE_LABELS } from './metadata'
import type { CustomerDocumentReadModel, CustomerAccount360ReadModel } from './types'

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

export function customerOpportunities(accountId: string, opportunities: Opportunity[]): Opportunity[] {
  return opportunities.filter((opportunity) => opportunity.accountId === accountId)
}

export function customerProjects(account: Account, opportunities: Opportunity[], projects: Project[]): Project[] {
  const opportunityIds = new Set(customerOpportunities(account.id, opportunities).map((opportunity) => opportunity.opportunityId))
  return projects.filter((project) => {
    if (project.opportunityId && opportunityIds.has(project.opportunityId)) return true
    return project.accountName === account.accountName
  })
}

export function customerRelatedSystems(
  accountId: string,
  systems: System[],
  tenants: Tenant[],
  projects: Project[] = [],
): System[] {
  const tenantSystemIds = new Set(customerTenants(accountId, tenants).map((tenant) => tenant.hostedSystemId ?? tenant.systemId).filter(Boolean))
  const projectIds = new Set(projects.map((project) => project.id))
  return systems.filter((system) => {
    if (system.accountId === accountId) return true
    if (tenantSystemIds.has(system.id)) return true
    return system.linkedProjectIds?.some((projectId) => projectIds.has(projectId)) ?? false
  })
}

export function customerWarrantyRowsForTenants(tenants: Tenant[], warrantyRows: WarrantyDashboardRow[]): WarrantyDashboardRow[] {
  const tenantIds = new Set(tenants.map((tenant) => tenant.id))
  return warrantyRows.filter((row) => tenantIds.has(row.tenantId))
}

export function customerOpenProjects(projects: Project[]): Project[] {
  return projects.filter((project) => project.progressStatus !== 'DONE' && project.progressStatus !== 'ARCHIVED')
}

export function customerDocumentReadModels(projects: Project[], systems: System[], tenants: Tenant[]): CustomerDocumentReadModel[] {
  return [
    ...projects.flatMap((project) => (project.documents ?? []).map((document) => ({
      ...document,
      sourceObjectType: 'Project' as const,
      sourceObjectId: project.pid,
      sourceObjectName: project.opportunityName || project.pid,
    }))),
    ...systems.flatMap((system) => (system.documents ?? []).map((document) => ({
      ...document,
      sourceObjectType: 'System' as const,
      sourceObjectId: systemIdentity(system),
      sourceObjectName: systemIdentity(system),
    }))),
    ...tenants.flatMap((tenant) => (tenant.documents ?? []).map((document) => ({
      ...document,
      sourceObjectType: 'Tenant' as const,
      sourceObjectId: tenant.tid,
      sourceObjectName: customerTenantDisplayName(tenant),
    }))),
  ]
}

export function customerAccount360ReadModel(input: {
  account: Account
  salesManagers: SalesManager[]
  opportunities: Opportunity[]
  projects: Project[]
  systems: System[]
  tenants: Tenant[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
  warrantyRows: WarrantyDashboardRow[]
  requirementCoverageRows: RequirementCoverageRow[]
}): CustomerAccount360ReadModel {
  const opportunities = customerOpportunities(input.account.id, input.opportunities)
  const projects = customerProjects(input.account, input.opportunities, input.projects)
  const tenants = customerTenants(input.account.id, input.tenants)
  const systems = customerRelatedSystems(input.account.id, input.systems, tenants, projects)
  const warrantyRows = customerWarrantyRowsForTenants(tenants, input.warrantyRows)
  const requirementCoverageRows = requirementCoverageRowsForAccount(input.requirementCoverageRows, input.account)
  const projectHealthContext = {
    systems: input.systems,
    tenants: input.tenants,
    projectSystems: input.projectSystems,
    projectTenants: input.projectTenants,
  }
  const projectHealthRows = projects.map((project) => {
    const projectRequirementCoverageRows = requirementCoverageRowsForProject(requirementCoverageRows, project)
    return projectHealthReadModel({
      project,
      ...projectHealthContext,
      requirementCoverageSummary: requirementCoverageSummary(projectRequirementCoverageRows),
    })
  })
  return {
    account: input.account,
    accountManager: accountManagerDisplayName(input.account.salesManagerId, input.salesManagers),
    opportunities,
    projects,
    systems,
    tenants,
    projectHealthRows,
    projectHealthSummary: projectPortfolioHealthSummary(projects, projectHealthContext),
    requirementCoverageRows,
    requirementCoverageSummary: requirementCoverageSummary(requirementCoverageRows),
    warrantyRows,
    warrantySummary: warrantyDashboardSummary(warrantyRows),
    documents: customerDocumentReadModels(projects, systems, tenants),
  }
}

export function customerProjectProgress(project: Project): string {
  return `${projectDashboardPercent(project)}%`
}
