import type { Opportunity, Project, StandardRenewalRequirement, Tenant, TenantWarranty, WarrantyRecord } from '@/data/seed.types'
import {
  daysBeforeExpiration,
  daysBetween,
  nextWarrantyId,
  warrantyCollectionReadModel,
  warrantySubTypeForProject,
  warrantyTypeForProject,
} from './service'

export function normalizeTenantWarranties(warranties: TenantWarranty[] | undefined): TenantWarranty[] {
  return Array.isArray(warranties)
    ? warranties.map((warranty) => ({
        ...warranty,
        initialWarrantyDate: warranty.initialWarrantyDate ?? null,
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
    warrantyType: warrantyTypeForProject(project),
    warrantySubType: warrantySubTypeForProject(project),
    opportunityId,
    initialWarrantyDate: null,
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
  const readModel = warrantyCollectionReadModel(source, tenant.tid)
  return readModel.map((row) => {
    const warranty = row.warranty
    const selectedProject = projects.find((candidate) => candidate.id === warranty.relatedProjectId)
    const selectedOpportunity = resolveOpportunity(selectedProject)
    return {
      ...warranty,
      firstWarranty: row.firstWarranty,
      accountId: tenant.accountId,
      warrantyType: warrantyTypeForProject(selectedProject),
      warrantySubType: warrantySubTypeForProject(selectedProject),
      opportunityId: selectedOpportunity?.opportunityId ?? projectOpportunityReference(selectedProject),
      successor: row.successorRefs[0]?.warrantyId ?? warranty.successor ?? '',
      durationDays: daysBetween(warranty.startDate, warranty.endDate),
      daysBeforeExpiration: daysBeforeExpiration(warranty.endDate),
      warrantyStatus: row.generatedStatus,
      alerts: row.alert,
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
