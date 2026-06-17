import type { Opportunity, Project, StandardRenewalRequirement, Tenant, TenantWarranty, WarrantyRecord } from '@/data/seed.types'
import {
  calculateWarrantyStatus,
  daysBeforeExpiration,
  daysBetween,
  nextWarrantyId,
  successorForWarranty,
  warrantyAlertForStatus,
  warrantyTypeForProject,
} from './service'

export function normalizeTenantWarranties(warranties: TenantWarranty[] | undefined): TenantWarranty[] {
  return Array.isArray(warranties)
    ? warranties.map((warranty) => ({
        ...warranty,
        noWarranty: warranty.noWarranty ?? 'NO',
        outOfContract: warranty.outOfContract ?? 'NO',
      }))
    : []
}

export function createTenantWarranty(
  tenant: Tenant,
  warranties: TenantWarranty[],
  project: Project | undefined,
  opportunityId: string,
): TenantWarranty {
  return {
    id: `tenant-warranty-${crypto.randomUUID()}`,
    warrantyId: nextWarrantyId(warranties),
    firstWarranty: warranties.length === 0,
    predecessor: '',
    successor: '',
    accountId: tenant.accountId,
    relatedProjectId: project?.id ?? '',
    warrantyType: project?.mainType ?? '',
    opportunityId,
    startDate: null,
    endDate: null,
    durationDays: null,
    daysBeforeExpiration: null,
    warrantyStatus: 'NOT_SET',
    noWarranty: 'NO',
    outOfContract: 'NO',
    alerts: '',
    remark: '',
  }
}

export function computeTenantWarranties(
  source: TenantWarranty[],
  tenant: Tenant,
  projects: Project[],
  resolveOpportunity: (project: Project | undefined) => Opportunity | undefined,
  projectOpportunityReference: (project: Project | undefined) => string,
): TenantWarranty[] {
  return source.map((warranty, index) => {
    const selectedProject = projects.find((candidate) => candidate.id === warranty.relatedProjectId)
    const selectedOpportunity = resolveOpportunity(selectedProject)
    const successor = successorForWarranty(warranty, source, tenant.tid)
    const status = calculateWarrantyStatus(warranty, Boolean(successor))
    return {
      ...warranty,
      firstWarranty: index === 0,
      accountId: tenant.accountId,
      warrantyType: warrantyTypeForProject(selectedProject),
      opportunityId: selectedOpportunity?.opportunityId ?? projectOpportunityReference(selectedProject),
      successor,
      durationDays: daysBetween(warranty.startDate, warranty.endDate),
      daysBeforeExpiration: daysBeforeExpiration(warranty.endDate),
      warrantyStatus: status,
      alerts: warrantyAlertForStatus(status),
    }
  })
}

export function warrantyRecordPatch(record: WarrantyRecord | undefined): Pick<StandardRenewalRequirement, 'warrantyStatus' | 'warrantyEndDate'> | Record<string, never> {
  return record
    ? {
        warrantyStatus: record.status,
        warrantyEndDate: record.endDate,
      }
    : {}
}

export function warrantyRecordForTenant(tenantId: string, warrantyRecords: WarrantyRecord[]): WarrantyRecord | undefined {
  return warrantyRecords.find((record) => record.tenantId === tenantId)
}

export function warrantyRecordsForTenant(tenantId: string, warrantyRecords: WarrantyRecord[]): WarrantyRecord[] {
  return warrantyRecords.filter((record) => record.tenantId === tenantId)
}

export function warrantyRecordById(warrantyRecordId: string, warrantyRecords: WarrantyRecord[]): WarrantyRecord | undefined {
  return warrantyRecords.find((record) => record.warrantyRecordId === warrantyRecordId)
}
