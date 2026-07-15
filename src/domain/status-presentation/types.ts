import type { LucideIcon } from 'lucide-react'

export type StatusPresentationKind =
  | 'alert'
  | 'badge'
  | 'operational'
  | 'project'
  | 'milestone'
  | 'task'
  | 'warranty'
  | 'recordChange'
  | 'progress'

export type StatusBadgeVariant = 'default' | 'open' | 'done' | 'warning' | 'error'
export type AlertPresentationVariant = 'danger' | 'warning' | 'info' | 'success'

export interface StatusPresentation {
  key: string
  kind: StatusPresentationKind
  label: string
  icon: LucideIcon
  iconClassName: string
  badgeClassName: string
  tooltip: string
  backgroundClassName?: string
}

export interface ProgressPresentation {
  trackClassName: string
  fillClassName: string
  heightClassName: string
  completeFillClassName: string
  incompleteFillClassName: string
}
