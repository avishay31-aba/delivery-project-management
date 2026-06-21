import type { Project } from '@/data/seed.types'
import {
  WARRANTY_PENDING_ALERT,
  WARRANTY_STATUS_LABELS,
} from './metadata'
import type { TenantWarranty, WarrantyRecord, WarrantyStatus } from './types'

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

export function successorForWarranty(warranty: TenantWarranty, warranties: TenantWarranty[], tenantTid: string): string {
  return warranties
    .find((candidate) => splitWarrantyPredecessors(candidate.predecessor).includes(predecessorReference(warranty.warrantyId, tenantTid)))
    ?.warrantyId ?? warranty.successor ?? ''
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
