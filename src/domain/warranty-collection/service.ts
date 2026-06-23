import type { Project } from '@/data/seed.types'
import {
  WARRANTY_PENDING_ALERT,
  WARRANTY_STATUS_LABELS,
} from './metadata'
import type {
  TenantWarranty,
  TenantWarrantyHeaderStatusReadModel,
  RenewalCandidateCategory,
  RenewalCandidateRow,
  WarrantyDashboardContext,
  WarrantyDashboardRow,
  WarrantyDashboardSummary,
  WarrantyPredecessorRef,
  WarrantyRecord,
  WarrantyRowReadModel,
  WarrantyStatus,
  WarrantySuccessorRef,
} from './types'

const UNDER_CONTRACT_ROW_STATUSES = new Set<WarrantyStatus>(['PLANNED', 'VALID', 'PENDING', 'EXPIRED'])

export function daysBetween(startDate: string | null, endDate: string | null): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return null
  return Math.ceil((end.valueOf() - start.valueOf()) / 86_400_000)
}

export function daysBeforeExpiration(endDate: string | null): number | null {
  if (!endDate) return null
  const end = new Date(endDate)
  if (Number.isNaN(end.valueOf())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((end.valueOf() - today.valueOf()) / 86_400_000)
}

export function warrantyTypeForProject(project?: Project): string {
  if (!project) return ''
  if (project.mainType === 'DELIVERY' && project.subType === 'UPSELL') return 'Upsell'
  if (project.mainType === 'RENEWAL') return project.subType === 'UPSELL' ? 'Upsell' : 'Renewal'
  return 'Delivery'
}

export function displayWarrantyStatus(status: WarrantyStatus): string {
  return WARRANTY_STATUS_LABELS[status]
}

export function tenantWarrantyHeaderStatusDisplay(
  warranties: TenantWarranty[],
  fallbackStatus: WarrantyStatus | string = 'NOT_SET',
): string {
  const headerStatus = tenantWarrantyHeaderStatusReadModelFromRows(warranties.map((warranty) => ({
    warranty,
    predecessorRefs: [],
    successorRefs: warranty.successor ? [{ warrantyId: warranty.successor, tenantId: '', recordId: undefined }] : [],
    firstWarranty: warranty.firstWarranty,
    generatedStatus: warranty.warrantyStatus,
    canEditNoWarranty: !warranty.successor,
    alert: warranty.alerts,
  })))
  if (headerStatus.status !== 'NOT_SET_YET' || warranties.length === 0 || warranties.every((warranty) => warranty.warrantyStatus === 'NOT_SET')) {
    return headerStatus.label
  }

  if (fallbackStatus in WARRANTY_STATUS_LABELS) {
    return WARRANTY_STATUS_LABELS[fallbackStatus as WarrantyStatus]
  }
  return String(fallbackStatus || WARRANTY_STATUS_LABELS.NOT_SET)
}

export function calculateWarrantyStatus(warranty: TenantWarranty, hasSuccessor: boolean): WarrantyStatus {
  if (hasSuccessor) return 'RENEWED'
  if (warranty.noWarranty === 'YES') return 'NO_WARRANTY'
  if (warranty.outOfContract === 'YES') return 'OUT_OF_CONTRACT'
  if (!warranty.startDate && !warranty.endDate) return 'NOT_SET'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = warranty.startDate ? new Date(warranty.startDate) : null
  const end = warranty.endDate ? new Date(warranty.endDate) : null
  if (start && today < start) return 'PLANNED'
  if (end) {
    const daysLeft = daysBeforeExpiration(warranty.endDate)
    if (daysLeft != null && daysLeft < 0) return 'EXPIRED'
    if (daysLeft != null && daysLeft < 90) return 'PENDING'
    if (!start || today >= start) return 'VALID'
  }
  return 'NOT_SET'
}

export function nextWarrantyId(warranties: TenantWarranty[]): string {
  return `W-${String(warranties.length + 1).padStart(3, '0')}`
}

export function predecessorReference(warrantyId: string, tenantTid: string): string {
  return `${warrantyId}${tenantTid}`
}

export function splitWarrantyPredecessors(value: string): string[] {
  return value
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseWarrantyPredecessorReference(rawValue: string, fallbackTenantId: string): WarrantyPredecessorRef {
  const value = rawValue.trim()
  const match = /^(W-\d+)(.+)$/.exec(value)
  return {
    warrantyId: match?.[1] ?? value,
    tenantId: match?.[2] ?? fallbackTenantId,
    rawValue: value,
  }
}

export function predecessorRefsForWarranty(warranty: TenantWarranty, fallbackTenantId: string): WarrantyPredecessorRef[] {
  return splitWarrantyPredecessors(warranty.predecessor).map((value) => parseWarrantyPredecessorReference(value, fallbackTenantId))
}

export function successorRefsForWarranty(warranty: TenantWarranty, warranties: TenantWarranty[], tenantTid: string): WarrantySuccessorRef[] {
  return warranties
    .filter((candidate) => predecessorRefsForWarranty(candidate, tenantTid).some((ref) => ref.warrantyId === warranty.warrantyId && ref.tenantId === tenantTid))
    .map((candidate) => ({
      warrantyId: candidate.warrantyId,
      tenantId: tenantTid,
      recordId: candidate.id,
    }))
}

export function successorForWarranty(warranty: TenantWarranty, warranties: TenantWarranty[], tenantTid: string): string {
  return successorRefsForWarranty(warranty, warranties, tenantTid)[0]?.warrantyId ?? warranty.successor ?? ''
}

export function warrantyHasSuccessor(warranty: TenantWarranty, warranties: TenantWarranty[], tenantTid: string): boolean {
  return Boolean(successorForWarranty(warranty, warranties, tenantTid))
}

export function normalizeNoWarrantyForSuccessor(warranty: TenantWarranty, hasSuccessor: boolean): TenantWarranty {
  return hasSuccessor ? { ...warranty, noWarranty: 'NO' } : warranty
}

export function warrantyCanEditNoWarranty(warranty: TenantWarranty, warranties: TenantWarranty[], tenantTid: string): boolean {
  return !warrantyHasSuccessor(warranty, warranties, tenantTid)
}

export function warrantyAlertForStatus(status: WarrantyStatus): string {
  return status === 'PENDING' ? WARRANTY_PENDING_ALERT : ''
}

export function isFirstWarrantyInChain(warranty: TenantWarranty, warranties: TenantWarranty[], tenantTid: string, index: number): boolean {
  const hasChainData = warranties.some((candidate) => splitWarrantyPredecessors(candidate.predecessor).length > 0)
  return hasChainData ? predecessorRefsForWarranty(warranty, tenantTid).length === 0 : index === 0
}

export function warrantyRowReadModel(
  warranty: TenantWarranty,
  warranties: TenantWarranty[],
  tenantTid: string,
  index: number,
): WarrantyRowReadModel {
  const predecessorRefs = predecessorRefsForWarranty(warranty, tenantTid)
  const successorRefs = successorRefsForWarranty(warranty, warranties, tenantTid)
  const hasSuccessors = successorRefs.length > 0
  const normalizedWarranty = normalizeNoWarrantyForSuccessor(warranty, hasSuccessors)
  const generatedStatus = calculateWarrantyStatus(normalizedWarranty, hasSuccessors)
  return {
    warranty: normalizedWarranty,
    predecessorRefs,
    successorRefs,
    firstWarranty: isFirstWarrantyInChain(warranty, warranties, tenantTid, index),
    generatedStatus,
    canEditNoWarranty: !hasSuccessors,
    alert: warrantyAlertForStatus(generatedStatus),
  }
}

export function warrantyCollectionReadModel(warranties: TenantWarranty[], tenantTid: string): WarrantyRowReadModel[] {
  return warranties.map((warranty, index) => warrantyRowReadModel(warranty, warranties, tenantTid, index))
}

export function tenantWarrantyHeaderStatusReadModelFromRows(rows: WarrantyRowReadModel[]): TenantWarrantyHeaderStatusReadModel {
  if (rows.length === 0 || rows.every((row) => row.generatedStatus === 'NOT_SET')) {
    return { status: 'NOT_SET_YET', label: WARRANTY_STATUS_LABELS.NOT_SET }
  }

  if (rows.some((row) => UNDER_CONTRACT_ROW_STATUSES.has(row.generatedStatus))) {
    return { status: 'UNDER_CONTRACT', label: 'Under Contract' }
  }

  const noWarrantyRows = rows.filter((row) => row.generatedStatus === 'NO_WARRANTY')
  if (noWarrantyRows.length > 0) {
    const statusByWarrantyId = new Map(rows.map((row) => [row.warranty.warrantyId, row.generatedStatus]))
    const allNoWarrantyPredecessorsRenewed = noWarrantyRows.every((row) => row.predecessorRefs.every((ref) => statusByWarrantyId.get(ref.warrantyId) === 'RENEWED'))
    if (allNoWarrantyPredecessorsRenewed) {
      return { status: 'OUT_OF_CONTRACT', label: 'Out Of Contract' }
    }
  }

  return { status: 'NOT_SET_YET', label: WARRANTY_STATUS_LABELS.NOT_SET }
}

export function tenantWarrantyHeaderStatusReadModel(warranties: TenantWarranty[], tenantTid: string): TenantWarrantyHeaderStatusReadModel {
  return tenantWarrantyHeaderStatusReadModelFromRows(warrantyCollectionReadModel(warranties, tenantTid))
}

export function isWarrantyRenewalCandidate(row: WarrantyRowReadModel): boolean {
  return row.generatedStatus === 'PENDING' || row.generatedStatus === 'EXPIRED'
}

export function warrantyDashboardRows(context: WarrantyDashboardContext): WarrantyDashboardRow[] {
  return context.tenants.flatMap((tenant) => {
    const warrantyRows = warrantyCollectionReadModel(tenant.warranties ?? [], tenant.tid)
    const headerStatus = tenantWarrantyHeaderStatusReadModelFromRows(warrantyRows)

    return warrantyRows.map((row) => {
      const warranty = row.warranty
      return {
        id: `${tenant.id}:${warranty.id}`,
        warrantyId: warranty.warrantyId,
        customer: context.accountNameForTenant(tenant),
        accountManager: context.accountManagerForTenant(tenant),
        tenantId: tenant.id,
        tenantTid: tenant.tid,
        tenantName: context.tenantNameForTenant(tenant),
        sid: context.sidForTenant(tenant),
        product: context.productForTenant(tenant),
        relatedProjectId: warranty.relatedProjectId,
        projectName: context.projectNameForProjectId(warranty.relatedProjectId),
        opportunityId: warranty.opportunityId,
        warrantyType: warranty.warrantyType,
        first: row.firstWarranty,
        startDate: warranty.startDate,
        endDate: warranty.endDate,
        daysToExpiration: daysBeforeExpiration(warranty.endDate),
        warrantyStatus: row.generatedStatus,
        warrantyStatusLabel: displayWarrantyStatus(row.generatedStatus),
        tenantHeaderStatus: headerStatus.status,
        tenantHeaderStatusLabel: headerStatus.label,
        alerts: row.alert,
        predecessorCount: row.predecessorRefs.length,
        successorCount: row.successorRefs.length,
        isRenewalCandidate: isWarrantyRenewalCandidate(row),
        isMissingRelatedProject: !warranty.relatedProjectId,
      }
    })
  })
}

export function warrantyDashboardSummary(rows: WarrantyDashboardRow[]): WarrantyDashboardSummary {
  return {
    totalWarranties: rows.length,
    underContract: rows.filter((row) => row.tenantHeaderStatus === 'UNDER_CONTRACT').length,
    outOfContract: rows.filter((row) => row.tenantHeaderStatus === 'OUT_OF_CONTRACT').length,
    expiring30: rows.filter((row) => row.warrantyStatus === 'PENDING' && row.daysToExpiration != null && row.daysToExpiration >= 0 && row.daysToExpiration <= 30).length,
    expired: rows.filter((row) => row.warrantyStatus === 'EXPIRED').length,
    noWarranty: rows.filter((row) => row.warrantyStatus === 'NO_WARRANTY').length,
    renewalCandidates: rows.filter((row) => row.isRenewalCandidate).length,
  }
}

export function renewalCandidateCategory(row: WarrantyDashboardRow): RenewalCandidateCategory | null {
  if (row.tenantHeaderStatus === 'OUT_OF_CONTRACT') return 'OUT_OF_CONTRACT'
  if (row.warrantyStatus === 'NO_WARRANTY') return 'NO_WARRANTY'
  if (row.warrantyStatus === 'EXPIRED') return 'EXPIRED'
  if (row.daysToExpiration == null || row.daysToExpiration < 0) return null
  if (row.daysToExpiration <= 30) return 'EXPIRING_30'
  if (row.daysToExpiration <= 60) return 'EXPIRING_60'
  if (row.daysToExpiration <= 90) return 'EXPIRING_90'
  return null
}

export function renewalCandidateCategoryLabel(category: RenewalCandidateCategory): string {
  if (category === 'EXPIRING_30') return 'Expiring in 30 days'
  if (category === 'EXPIRING_60') return 'Expiring in 60 days'
  if (category === 'EXPIRING_90') return 'Expiring in 90 days'
  if (category === 'EXPIRED') return 'Expired'
  if (category === 'NO_WARRANTY') return 'No Warranty'
  return 'Out Of Contract'
}

export function renewalCandidateRows(context: WarrantyDashboardContext): RenewalCandidateRow[] {
  return warrantyDashboardRows(context).flatMap((row) => {
    const renewalCategory = renewalCandidateCategory(row)
    if (!renewalCategory) return []

    return [{
      id: row.id,
      warrantyId: row.warrantyId,
      customer: row.customer,
      accountManager: row.accountManager,
      tenantId: row.tenantId,
      tenantTid: row.tenantTid,
      tenantName: row.tenantName,
      sid: row.sid,
      product: row.product,
      relatedProjectId: row.relatedProjectId,
      warrantyType: row.warrantyType,
      endDate: row.endDate,
      daysToExpiration: row.daysToExpiration,
      warrantyStatus: row.warrantyStatus,
      warrantyStatusLabel: row.warrantyStatusLabel,
      tenantHeaderStatus: row.tenantHeaderStatus,
      tenantHeaderStatusLabel: row.tenantHeaderStatusLabel,
      renewalCategory,
      renewalCategoryLabel: renewalCandidateCategoryLabel(renewalCategory),
    }]
  })
}

export function warrantySummaryForAccount(accountId: string, tenants: Array<{ id: string; accountId: string }>, warrantyRecords: WarrantyRecord[]): string {
  const accountTenantIds = new Set(tenants.filter((tenant) => tenant.accountId === accountId).map((tenant) => tenant.id))
  const statuses = warrantyRecords
    .filter((record) => accountTenantIds.has(record.tenantId))
    .map((record) => record.status)

  if (statuses.length === 0) return ''

  return Array.from(new Set(statuses)).join(';')
}
