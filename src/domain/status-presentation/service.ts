import {
  AlertTriangle,
  Ban,
  Calendar,
  CalendarCheck,
  Check,
  CheckCircle2,
  CircleCheck,
  CircleHelp,
  CircleX,
  Hourglass,
  Info,
  LockKeyhole,
  OctagonAlert,
  PowerOff,
  ServerOff,
  ShieldX,
  Square,
  Trash2,
} from 'lucide-react'
import type {
  AlertPresentationVariant,
  ProgressPresentation,
  StatusBadgeVariant,
  StatusPresentation,
} from './types'
import type { WarrantyStatus } from '@/data/seed.types'
import { WARRANTY_STATUS_LABELS } from '@/domain/warranty-collection/metadata'

export type ExpiryAlertStatus = 'NOT_SET' | 'VALID' | 'PENDING' | 'EXPIRED' | 'OBSOLETE'

const DEFAULT_PRESENTATION: StatusPresentation = {
  key: 'default',
  kind: 'badge',
  label: 'Status',
  icon: Info,
  iconClassName: 'text-sf-brand',
  badgeClassName: 'bg-gray-100 text-gray-800',
  tooltip: 'Status',
  backgroundClassName: 'bg-white',
}

const BADGE_PRESENTATIONS: Record<StatusBadgeVariant, StatusPresentation> = {
  default: { ...DEFAULT_PRESENTATION, key: 'default', label: 'Default', badgeClassName: 'bg-gray-100 text-gray-800' },
  open: { ...DEFAULT_PRESENTATION, key: 'open', label: 'Open', icon: Square, iconClassName: 'fill-emerald-100 stroke-0 text-emerald-100', badgeClassName: 'bg-gray-200 text-gray-800' },
  done: { ...DEFAULT_PRESENTATION, key: 'done', label: 'Done', icon: Check, iconClassName: 'text-blue-800', badgeClassName: 'bg-green-100 text-sf-success' },
  warning: { ...DEFAULT_PRESENTATION, key: 'warning', label: 'Warning', icon: AlertTriangle, iconClassName: 'text-amber-600', badgeClassName: 'bg-orange-100 text-orange-800' },
  error: { ...DEFAULT_PRESENTATION, key: 'error', label: 'Error', icon: OctagonAlert, iconClassName: 'text-red-700', badgeClassName: 'bg-red-100 text-sf-error' },
}

const ALERT_PRESENTATIONS: Record<AlertPresentationVariant, StatusPresentation> = {
  danger: { ...DEFAULT_PRESENTATION, key: 'danger', kind: 'alert', label: 'Danger', icon: OctagonAlert, iconClassName: 'text-red-700', tooltip: 'Danger' },
  warning: { ...DEFAULT_PRESENTATION, key: 'warning', kind: 'alert', label: 'Warning', icon: AlertTriangle, iconClassName: 'text-amber-600', tooltip: 'Warning' },
  info: { ...DEFAULT_PRESENTATION, key: 'info', kind: 'alert', label: 'Information', icon: Info, iconClassName: 'text-sf-brand', tooltip: 'Information' },
  success: { ...DEFAULT_PRESENTATION, key: 'success', kind: 'alert', label: 'Success', icon: CheckCircle2, iconClassName: 'text-sf-success', tooltip: 'Success' },
}

const OPERATIONAL_PRESENTATIONS: Record<string, StatusPresentation> = {
  on: { ...DEFAULT_PRESENTATION, key: 'on', kind: 'operational', label: 'On', icon: CircleCheck, iconClassName: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]', tooltip: 'Operational status: On' },
  active: { ...DEFAULT_PRESENTATION, key: 'active', kind: 'operational', label: 'Active', icon: CircleCheck, iconClassName: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]', tooltip: 'Operational status: Active' },
  operative: { ...DEFAULT_PRESENTATION, key: 'operative', kind: 'operational', label: 'Operative', icon: CircleCheck, iconClassName: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]', tooltip: 'Operational status: Operative' },
  obsolete: { ...DEFAULT_PRESENTATION, key: 'obsolete', kind: 'operational', label: 'Obsolete', icon: Trash2, iconClassName: 'text-red-600', tooltip: 'Operational status: Obsolete' },
  'will not renew': { ...DEFAULT_PRESENTATION, key: 'will not renew', kind: 'operational', label: 'Will Not Renew', icon: Ban, iconClassName: 'text-gray-500', tooltip: 'Operational status: Will Not Renew' },
  off: { ...DEFAULT_PRESENTATION, key: 'off', kind: 'operational', label: 'Off', icon: PowerOff, iconClassName: 'text-red-500', tooltip: 'Operational status: Off' },
  'access blocked': { ...DEFAULT_PRESENTATION, key: 'access blocked', kind: 'operational', label: 'Access Blocked', icon: LockKeyhole, iconClassName: 'text-amber-500', tooltip: 'Operational status: Access Blocked' },
  'access blocked - password reset': { ...DEFAULT_PRESENTATION, key: 'access blocked - password reset', kind: 'operational', label: 'Access Blocked - Password Reset', icon: LockKeyhole, iconClassName: 'text-amber-500', tooltip: 'Operational status: Access Blocked - Password Reset' },
  'service blocked': { ...DEFAULT_PRESENTATION, key: 'service blocked', kind: 'operational', label: 'Service Blocked', icon: ShieldX, iconClassName: 'text-orange-500', tooltip: 'Operational status: Service Blocked' },
  deleted: { ...DEFAULT_PRESENTATION, key: 'deleted', kind: 'operational', label: 'Deleted', icon: Trash2, iconClassName: 'text-gray-500', tooltip: 'Operational status: Deleted' },
  cancelled: { ...DEFAULT_PRESENTATION, key: 'cancelled', kind: 'operational', label: 'Cancelled', icon: Ban, iconClassName: 'text-purple-500', tooltip: 'Operational status: Cancelled' },
  canceled: { ...DEFAULT_PRESENTATION, key: 'canceled', kind: 'operational', label: 'Canceled', icon: Ban, iconClassName: 'text-purple-500', tooltip: 'Operational status: Canceled' },
}

const PROJECT_PRESENTATIONS: Record<string, StatusPresentation> = {
  open: { ...BADGE_PRESENTATIONS.open, key: 'open', kind: 'project', label: 'Open', tooltip: 'Project status: Open' },
  done: { ...BADGE_PRESENTATIONS.done, key: 'done', kind: 'project', label: 'Done', tooltip: 'Project status: Done' },
  archived: { ...BADGE_PRESENTATIONS.default, key: 'archived', kind: 'project', label: 'Archived', icon: Trash2, iconClassName: 'text-gray-500', badgeClassName: 'bg-gray-200 text-gray-800', tooltip: 'Project status: Archived' },
}

const RECORD_CHANGE_PRESENTATIONS: Record<string, StatusPresentation> = {
  new: { ...DEFAULT_PRESENTATION, key: 'new', kind: 'recordChange', label: 'New', icon: CheckCircle2, iconClassName: 'text-emerald-700', badgeClassName: 'border-emerald-300 bg-emerald-100 text-emerald-800', tooltip: 'New' },
  updated: { ...DEFAULT_PRESENTATION, key: 'updated', kind: 'recordChange', label: 'Updated', icon: Info, iconClassName: 'text-amber-700', badgeClassName: 'border-amber-300 bg-amber-100 text-amber-900', tooltip: 'Updated' },
}

const WARRANTY_PRESENTATIONS: Record<WarrantyStatus, StatusPresentation> = {
  NOT_SET: { ...DEFAULT_PRESENTATION, key: 'NOT_SET', kind: 'warranty', label: WARRANTY_STATUS_LABELS.NOT_SET, icon: CircleHelp, iconClassName: 'text-sf-success', badgeClassName: 'bg-green-100 text-sf-success', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.NOT_SET}` },
  PLANNED: { ...DEFAULT_PRESENTATION, key: 'PLANNED', kind: 'warranty', label: WARRANTY_STATUS_LABELS.PLANNED, icon: Calendar, iconClassName: 'text-sf-brand-light', badgeClassName: 'bg-blue-50 text-blue-700', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.PLANNED}` },
  VALID: { ...DEFAULT_PRESENTATION, key: 'VALID', kind: 'warranty', label: WARRANTY_STATUS_LABELS.VALID, icon: Check, iconClassName: 'text-sf-brand', badgeClassName: 'bg-blue-100 text-blue-800', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.VALID}` },
  PENDING: { ...DEFAULT_PRESENTATION, key: 'PENDING', kind: 'warranty', label: WARRANTY_STATUS_LABELS.PENDING, icon: AlertTriangle, iconClassName: 'text-sf-warning', badgeClassName: 'bg-orange-100 text-orange-800', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.PENDING}` },
  RENEWED: { ...DEFAULT_PRESENTATION, key: 'RENEWED', kind: 'warranty', label: WARRANTY_STATUS_LABELS.RENEWED, icon: CalendarCheck, iconClassName: 'text-sf-brand', badgeClassName: 'bg-blue-50 text-blue-800', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.RENEWED}` },
  EXPIRED: { ...DEFAULT_PRESENTATION, key: 'EXPIRED', kind: 'warranty', label: WARRANTY_STATUS_LABELS.EXPIRED, icon: CircleX, iconClassName: 'text-sf-error', badgeClassName: 'bg-red-100 text-red-800', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.EXPIRED}` },
  NO_WARRANTY: { ...DEFAULT_PRESENTATION, key: 'NO_WARRANTY', kind: 'warranty', label: WARRANTY_STATUS_LABELS.NO_WARRANTY, icon: Ban, iconClassName: 'text-sf-text-muted', badgeClassName: 'bg-gray-100 text-gray-700', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.NO_WARRANTY}` },
  OUT_OF_CONTRACT: { ...DEFAULT_PRESENTATION, key: 'OUT_OF_CONTRACT', kind: 'warranty', label: WARRANTY_STATUS_LABELS.OUT_OF_CONTRACT, icon: OctagonAlert, iconClassName: 'text-red-700', badgeClassName: 'bg-red-100 text-red-800', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.OUT_OF_CONTRACT}` },
  OBSOLETE: { ...DEFAULT_PRESENTATION, key: 'OBSOLETE', kind: 'warranty', label: WARRANTY_STATUS_LABELS.OBSOLETE, icon: Trash2, iconClassName: 'text-gray-500', badgeClassName: 'bg-gray-200 text-gray-800', tooltip: `Warranty status: ${WARRANTY_STATUS_LABELS.OBSOLETE}` },
}

const MAINTENANCE_PRESENTATIONS: Record<string, StatusPresentation> = {
  none: { ...DEFAULT_PRESENTATION, key: 'none', kind: 'maintenance', label: 'None', icon: Ban, iconClassName: 'text-sf-text-muted', badgeClassName: 'bg-gray-100 text-gray-700', tooltip: 'Maintenance status: None' },
  planned: { ...DEFAULT_PRESENTATION, key: 'planned', kind: 'maintenance', label: 'Planned', icon: Calendar, iconClassName: 'text-sf-brand-light', badgeClassName: 'bg-blue-50 text-blue-700', tooltip: 'Maintenance status: Planned' },
  pending: { ...DEFAULT_PRESENTATION, key: 'pending', kind: 'maintenance', label: 'Pending', icon: AlertTriangle, iconClassName: 'text-sf-warning', badgeClassName: 'bg-orange-100 text-orange-800', tooltip: 'Maintenance status: Pending' },
  overdue: { ...DEFAULT_PRESENTATION, key: 'overdue', kind: 'maintenance', label: 'Overdue', icon: Hourglass, iconClassName: 'text-sf-error', badgeClassName: 'bg-red-100 text-red-800', tooltip: 'Maintenance status: Overdue' },
  delayed: { ...DEFAULT_PRESENTATION, key: 'delayed', kind: 'maintenance', label: 'Delayed', icon: Calendar, iconClassName: 'text-sf-error', badgeClassName: 'bg-red-100 text-red-800', tooltip: 'Maintenance status: Delayed' },
}

export function statusBadgePresentation(variant: StatusBadgeVariant): StatusPresentation {
  return BADGE_PRESENTATIONS[variant] ?? BADGE_PRESENTATIONS.default
}

export function alertStatusPresentation(variant: AlertPresentationVariant): StatusPresentation {
  return ALERT_PRESENTATIONS[variant] ?? ALERT_PRESENTATIONS.info
}

export function operationalStatusPresentation(status: string | null | undefined): StatusPresentation {
  const key = String(status ?? '').trim().toLocaleLowerCase()
  return OPERATIONAL_PRESENTATIONS[key] ?? { ...DEFAULT_PRESENTATION, key, kind: 'operational', label: status || 'Not set', icon: ServerOff, iconClassName: 'text-slate-400', tooltip: `Operational status: ${status || 'Not set'}` }
}

export function projectStatusPresentation(status: string | null | undefined): StatusPresentation {
  const key = String(status ?? '').trim().toLocaleLowerCase()
  return PROJECT_PRESENTATIONS[key] ?? PROJECT_PRESENTATIONS.open
}

export function taskStatusPresentation(status: string | null | undefined): StatusPresentation {
  const key = String(status ?? '').trim().toLocaleLowerCase()
  return key === 'done' ? { ...PROJECT_PRESENTATIONS.done, kind: 'task', tooltip: 'Task status: Done' } : { ...PROJECT_PRESENTATIONS.open, kind: 'task', tooltip: 'Task status: Open' }
}

export function milestoneStatusPresentation(status: string | null | undefined): StatusPresentation {
  return { ...projectStatusPresentation(status), kind: 'milestone', tooltip: `Milestone status: ${projectStatusPresentation(status).label}` }
}

export function recordChangePresentation(state: 'New' | 'Updated'): StatusPresentation {
  return RECORD_CHANGE_PRESENTATIONS[state.toLocaleLowerCase()] ?? RECORD_CHANGE_PRESENTATIONS.updated
}

export function warrantyStatusPresentation(status: string | null | undefined): StatusPresentation {
  const normalized = String(status ?? '').trim().toUpperCase().replace(/[\s-]+/g, '_')
  return WARRANTY_PRESENTATIONS[normalized as WarrantyStatus] ?? WARRANTY_PRESENTATIONS.NOT_SET
}

export function maintenanceStatusPresentation(status: string | null | undefined): StatusPresentation {
  const key = String(status ?? '').trim().toLocaleLowerCase()
  return MAINTENANCE_PRESENTATIONS[key] ?? MAINTENANCE_PRESENTATIONS.none
}

export function expiryAlertStatus(
  expirationDate: string | null | undefined,
  {
    obsolete = false,
    pendingWindowDays = 90,
    today = new Date(),
  }: { obsolete?: boolean; pendingWindowDays?: number; today?: Date } = {},
): ExpiryAlertStatus {
  if (obsolete) return 'OBSOLETE'
  if (!expirationDate) return 'NOT_SET'
  const expiration = new Date(`${expirationDate}T00:00:00`)
  if (Number.isNaN(expiration.valueOf())) return 'NOT_SET'
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const expirationDay = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate())
  const daysUntilExpiration = Math.ceil((expirationDay.getTime() - current.getTime()) / 86_400_000)
  if (daysUntilExpiration < 0) return 'EXPIRED'
  if (daysUntilExpiration <= pendingWindowDays) return 'PENDING'
  return 'VALID'
}

export function progressPresentation(value: number): ProgressPresentation {
  const complete = Number.isFinite(value) && value >= 100
  return {
    trackClassName: 'overflow-hidden rounded-full bg-sf-surface-alt',
    heightClassName: 'h-4',
    fillClassName: complete ? 'bg-blue-900' : 'bg-amber-500',
    completeFillClassName: 'bg-blue-900',
    incompleteFillClassName: 'bg-amber-500',
  }
}

export function alertPresentationForDeadline(status: string): StatusPresentation {
  if (status === 'OVERDUE') return alertStatusPresentation('danger')
  if (status === 'WARNING') return { ...alertStatusPresentation('warning'), label: 'Pending', tooltip: 'Pending deadline' }
  return alertStatusPresentation('info')
}

export function productMismatchPresentation(): StatusPresentation {
  return { ...alertStatusPresentation('warning'), key: 'productMismatch', label: 'Product mismatch', tooltip: 'Product mismatch' }
}

export function badgeVariantForProjectStatus(status: string): StatusBadgeVariant {
  if (status === 'DONE') return 'done'
  return 'open'
}

export function badgeVariantForProjectHealthStatus(status: string): StatusBadgeVariant {
  if (status === 'COMPLETED') return 'done'
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'error'
  if (status === 'WARNING') return 'warning'
  return 'open'
}

export function alertVariantForProjectHealthStatus(status: string): AlertPresentationVariant {
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'danger'
  if (status === 'WARNING') return 'warning'
  if (status === 'COMPLETED' || status === 'HEALTHY') return 'success'
  return 'info'
}

export function alertVariantForDeadlineRiskStatus(status: string): AlertPresentationVariant {
  if (status === 'OVERDUE') return 'danger'
  if (status === 'WARNING') return 'warning'
  return 'info'
}

export function badgeVariantForRequirementCoverageStatus(status: string): StatusBadgeVariant {
  if (status === 'COVERED') return 'done'
  if (status === 'UNCOVERED' || status === 'BLOCKED') return 'error'
  if (status === 'PARTIALLY_COVERED') return 'warning'
  return 'default'
}

export function alertVariantForRequirementCoverageStatus(status: string): AlertPresentationVariant {
  if (status === 'UNCOVERED' || status === 'BLOCKED') return 'danger'
  if (status === 'PARTIALLY_COVERED') return 'warning'
  if (status === 'COVERED') return 'success'
  return 'info'
}

export function badgeVariantForRenewalCategory(category: string): StatusBadgeVariant {
  if (category === 'EXPIRED' || category === 'OUT_OF_CONTRACT') return 'error'
  if (category === 'NO_WARRANTY') return 'warning'
  return 'default'
}

export function alertVariantForWarrantyStatus(status: string, tenantHeaderStatus?: string): AlertPresentationVariant {
  if (status === 'EXPIRED' || tenantHeaderStatus === 'OUT_OF_CONTRACT') return 'danger'
  if (status === 'PENDING' || status === 'NO_WARRANTY') return 'warning'
  if (status === 'VALID' || tenantHeaderStatus === 'UNDER_CONTRACT') return 'success'
  return 'info'
}

export function badgeVariantForActivitySeverity(severity: string): StatusBadgeVariant {
  if (severity === 'DANGER') return 'error'
  if (severity === 'WARNING') return 'warning'
  if (severity === 'SUCCESS') return 'done'
  return 'default'
}

export function alertVariantForActivitySeverity(severity: string): AlertPresentationVariant {
  if (severity === 'DANGER') return 'danger'
  if (severity === 'WARNING') return 'warning'
  if (severity === 'SUCCESS') return 'success'
  return 'info'
}

export function successMessageClassName(): string {
  return 'rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'
}

export function errorMessageClassName(): string {
  return 'rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700'
}
