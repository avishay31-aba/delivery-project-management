import type { ActivityEventCategory, ActivityEventSeverity, ActivityEventSource } from './types'

export const ACTIVITY_EVENT_SCHEMA_VERSION = 1

export const ACTIVITY_EVENT_CATEGORIES: ActivityEventCategory[] = [
  'PROJECT',
  'CUSTOMER',
  'WARRANTY',
  'REQUIREMENT',
  'TENANT',
  'SYSTEM',
  'ALLOCATION',
  'MILESTONE',
  'DASHBOARD_VIEW',
  'DOCUMENT',
]

export const ACTIVITY_EVENT_SOURCES: ActivityEventSource[] = ['USER', 'SYSTEM', 'MIGRATION', 'IMPORT']

export const ACTIVITY_EVENT_SEVERITIES: ActivityEventSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'DANGER']

export const ACTIVITY_EVENT_CATEGORY_LABELS: Record<ActivityEventCategory, string> = {
  PROJECT: 'Project',
  CUSTOMER: 'Customer',
  WARRANTY: 'Warranty',
  REQUIREMENT: 'Requirement',
  TENANT: 'Tenant',
  SYSTEM: 'System',
  ALLOCATION: 'Allocation',
  MILESTONE: 'Milestone',
  DASHBOARD_VIEW: 'Dashboard View',
  DOCUMENT: 'Document',
}

export const ACTIVITY_EVENT_SEVERITY_LABELS: Record<ActivityEventSeverity, string> = {
  INFO: 'Info',
  SUCCESS: 'Success',
  WARNING: 'Warning',
  DANGER: 'Danger',
}
