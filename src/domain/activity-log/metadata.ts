import type { ActivityEventCategory, ActivityEventSeverity, ActivityEventSource } from './types'

export const ACTIVITY_EVENT_SCHEMA_VERSION = 1

export const ACTIVITY_EVENT_CATEGORIES: ActivityEventCategory[] = [
  'PROJECT',
  'OPPORTUNITY',
  'CUSTOMER',
  'WARRANTY',
  'REQUIREMENT',
  'TENANT',
  'SYSTEM',
  'ALLOCATION',
  'MILESTONE',
  'TASK',
  'REMARK',
  'CONFIGURATION',
  'PURPOSE_HISTORY',
  'OWNER',
  'SECURITY',
  'ADMINISTRATION',
  'DASHBOARD_VIEW',
  'DOCUMENT',
  'INFRASTRUCTURE',
  'OTHER',
]

export const ACTIVITY_EVENT_SOURCES: ActivityEventSource[] = ['USER', 'SYSTEM', 'MIGRATION', 'IMPORT']

export const ACTIVITY_EVENT_SEVERITIES: ActivityEventSeverity[] = ['INFO', 'SUCCESS', 'WARNING', 'DANGER']

export const ACTIVITY_EVENT_CATEGORY_LABELS: Record<ActivityEventCategory, string> = {
  PROJECT: 'Project',
  OPPORTUNITY: 'Opportunity',
  CUSTOMER: 'Customer',
  WARRANTY: 'Warranty',
  REQUIREMENT: 'Requirement',
  TENANT: 'Tenant',
  SYSTEM: 'System',
  ALLOCATION: 'Allocation',
  MILESTONE: 'Milestone',
  TASK: 'Task',
  REMARK: 'Remark',
  CONFIGURATION: 'Configuration',
  PURPOSE_HISTORY: 'Purpose History',
  OWNER: 'Owner',
  SECURITY: 'Security',
  ADMINISTRATION: 'Administration',
  DASHBOARD_VIEW: 'Dashboard View',
  DOCUMENT: 'Document',
  INFRASTRUCTURE: 'Infrastructure',
  OTHER: 'Other',
}

export const ACTIVITY_EVENT_SEVERITY_LABELS: Record<ActivityEventSeverity, string> = {
  INFO: 'Info',
  SUCCESS: 'Success',
  WARNING: 'Warning',
  DANGER: 'Danger',
}
