import type { Project } from '@/data/seed.types'
import {
  WARRANTY_PENDING_ALERT,
  WARRANTY_STATUS_LABELS,
} from './metadata'
import type { TenantWarranty, WarrantyPredecessorRef, WarrantyRecord, WarrantyStatus, WarrantySuccessorRef } from './types'

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
  if (warranties.some((warranty) => ['PLANNED', 'VALID', 'EXPIRED'].includes(warranty.warrantyStatus))) {
    return 'Under Contract'
  }

  if (warranties.length === 1 && warranties[0].firstWarranty && warranties[0].warrantyStatus === 'NOT_SET') {
    return WARRANTY_STATUS_LABELS.NOT_SET
  }

  const latestWarranties = warranties.filter((warranty) => !warranty.successor)
  const renewedWarranties = warranties.filter((warranty) => warranty.successor)
  if (
    latestWarranties.length > 0 &&
    renewedWarranties.length > 0 &&
    renewedWarranties.every((warranty) => warranty.warrantyStatus === 'RENEWED') &&
    latestWarranties.every((warranty) => warranty.warrantyStatus === 'NO_WARRANTY')
  ) {
    return 'Out Of Contract'
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

export function warrantySummaryForAccount(accountId: string, tenants: Array<{ id: string; accountId: string }>, warrantyRecords: WarrantyRecord[]): string {
  const accountTenantIds = new Set(tenants.filter((tenant) => tenant.accountId === accountId).map((tenant) => tenant.id))
  const statuses = warrantyRecords
    .filter((record) => accountTenantIds.has(record.tenantId))
    .map((record) => record.status)

  if (statuses.length === 0) return ''

  return Array.from(new Set(statuses)).join(';')
}
