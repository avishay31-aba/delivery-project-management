import {
  AlertTriangle,
  Ban,
  Check,
  CheckCircle2,
  CircleCheck,
  CirclePlay,
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
  in_progress: { ...DEFAULT_PRESENTATION, key: 'in_progress', label: 'In Progress', icon: CirclePlay, iconClassName: 'text-amber-500', badgeClassName: 'bg-blue-100 text-sf-brand-dark' },
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
  operative: { ...DEFAULT_PRESENTATION, key: 'operative', kind: 'operational', label: 'Operative', icon: CircleCheck, iconClassName: 'text-emerald-500 drop-shadow-[0_0_4px_rgba(16,185,129,0.45)]', tooltip: 'Operational status: Operative' },
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
  in_progress: { ...BADGE_PRESENTATIONS.in_progress, key: 'in_progress', kind: 'project', label: 'In Progress', tooltip: 'Project status: In Progress' },
  done: { ...BADGE_PRESENTATIONS.done, key: 'done', kind: 'project', label: 'Done', tooltip: 'Project status: Done' },
  archived: { ...BADGE_PRESENTATIONS.default, key: 'archived', kind: 'project', label: 'Archived', icon: Trash2, iconClassName: 'text-gray-500', badgeClassName: 'bg-gray-200 text-gray-800', tooltip: 'Project status: Archived' },
}

const RECORD_CHANGE_PRESENTATIONS: Record<string, StatusPresentation> = {
  new: { ...DEFAULT_PRESENTATION, key: 'new', kind: 'recordChange', label: 'New', icon: CheckCircle2, iconClassName: 'text-emerald-700', badgeClassName: 'border-emerald-300 bg-emerald-100 text-emerald-800', tooltip: 'New' },
  updated: { ...DEFAULT_PRESENTATION, key: 'updated', kind: 'recordChange', label: 'Updated', icon: Info, iconClassName: 'text-amber-700', badgeClassName: 'border-amber-300 bg-amber-100 text-amber-900', tooltip: 'Updated' },
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
  if (status === 'IN_PROGRESS') return 'in_progress'
  if (status === 'ARCHIVED') return 'default'
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
