import type { ActionPermissionLevel, FieldPermissionLevel, ObjectPermissionDefinition, PermissionAccessLevel, RoleDefinition } from '@/data/seed.types'

export const AUTHORIZATION_SCHEMA_VERSION = 1
export const DEFAULT_AUTHORIZATION_TIMESTAMP = '2026-09-15T00:00:00.000Z'

export const PAGE_ACCESS_VALUES: PermissionAccessLevel[] = ['HIDDEN', 'READ_ONLY', 'READ_WRITE']
export const ACTION_PERMISSION_VALUES: ActionPermissionLevel[] = ['ALLOWED', 'NOT_ALLOWED']
export const FIELD_PERMISSION_VALUES: FieldPermissionLevel[] = ['HIDDEN', 'READ_ONLY', 'READ_WRITE']

export interface PermissionObjectMetadata {
  objectKey: string
  label: string
  group: string
  actions: string[]
  fields: string[]
}

export const PERMISSION_OBJECTS: PermissionObjectMetadata[] = [
  {
    objectKey: 'opportunity',
    label: 'Opportunity',
    group: 'Sales',
    actions: ['Create', 'Edit', 'Export'],
    fields: ['Opportunity ID', 'Opportunity Name', 'Account', 'Stage', 'Type', 'Sub Type', 'Requirements'],
  },
  {
    objectKey: 'customer',
    label: 'Customer / Account',
    group: 'Sales',
    actions: ['Create', 'Edit', 'Export'],
    fields: ['Account Code', 'Account Name', 'Region', 'Country', 'Account Manager'],
  },
  {
    objectKey: 'project',
    label: 'Project',
    group: 'Delivery',
    actions: ['Create', 'Edit', 'Cancel', 'Allocate', 'Deallocate', 'Export'],
    fields: ['PID', 'Project Type', 'Project Sub Type', 'Delivery Date', 'POC Start Date', 'POC End Date', 'Project Status', 'Project Comments'],
  },
  {
    objectKey: 'system',
    label: 'System',
    group: 'Delivery',
    actions: ['Create', 'Edit', 'Delete', 'Cancel', 'Allocate', 'Deallocate', 'Export'],
    fields: ['SID', 'MID', 'Product Manager Type', 'System Type', 'Hosting', 'Cloud Platform', 'Operational Status', 'Application Configuration'],
  },
  {
    objectKey: 'tenant',
    label: 'Tenant',
    group: 'Delivery',
    actions: ['Create', 'Edit', 'Delete', 'Cancel', 'Export'],
    fields: ['TID', 'Type', 'SID', 'PID', 'Operational Status', 'Warranty Status', 'Application Configuration'],
  },
  {
    objectKey: 'warranty',
    label: 'Warranty',
    group: 'Delivery',
    actions: ['Create', 'Edit', 'Export'],
    fields: ['Warranty ID', 'Related Project ID', 'Start Date', 'End Date', 'Warranty Status', 'Remark'],
  },
  {
    objectKey: 'infrastructure',
    label: 'Infrastructure',
    group: 'Delivery',
    actions: ['Create', 'Edit', 'Cancel', 'Export'],
    fields: ['Infrastructure ID', 'Type', 'Sub Type', 'Operational Status', 'Location Address', 'Warranty Status', 'Point of Contact'],
  },
  {
    objectKey: 'activityLog',
    label: 'Activity / Audit Log',
    group: 'Admin',
    actions: ['Export'],
    fields: ['Activity ID', 'Timestamp', 'User', 'Event Category', 'Event Type', 'Business Object', 'Description'],
  },
  {
    objectKey: 'adminConfiguration',
    label: 'Admin Configuration',
    group: 'Admin',
    actions: ['Edit', 'Export'],
    fields: ['Countries', 'US States', 'Time Groups', 'Reference Data'],
  },
  {
    objectKey: 'rolesPermissions',
    label: 'Roles & Permissions',
    group: 'Admin',
    actions: ['Edit', 'Export'],
    fields: ['Role Name', 'Page Access', 'Actions', 'Fields', 'Recipient Roles'],
  },
  {
    objectKey: 'notificationsAlerts',
    label: 'Notifications & Alerts',
    group: 'Admin',
    actions: ['Edit', 'Export', 'Resolve'],
    fields: ['Severity', 'Category', 'Event', 'Recipients', 'Email Payload', 'Deep Link'],
  },
  {
    objectKey: 'reminders',
    label: 'Reminders',
    group: 'Delivery',
    actions: ['Execute', 'Restore', 'Export'],
    fields: ['Source', 'Parent Object', 'Due Date', 'Status', 'Executed At', 'Executed By'],
  },
  {
    objectKey: 'versionUpgradeScheduler',
    label: 'Version Upgrade Scheduler',
    group: 'Delivery',
    actions: ['Create', 'Edit', 'Cancel', 'Export', 'Confirm Schedule'],
    fields: ['Version Number', 'Build Number', 'Release Date', 'Phase Out Date', 'Limited to Cloud Platform', 'Systems to Upgrade', 'Support Allocation', 'Remarks'],
  },
]

export const DEFAULT_ROLE_NAMES = [
  'GM',
  'VP Project',
  'VP Operational',
  'Delivery Manager',
  'Delivery Specialist',
  'Regional Manager',
  'Sales Manager',
  'Sales Operation',
  'Customer Success Manager',
  'Customer Success Specialist',
  'Support Manager',
  'Support Engineer',
  'Product Manager',
  'Professional Services Manager',
  'Professional Services Engineer',
  'Procurement Manager',
  'Procurement Associate',
  'Financial Manager',
] as const

export function normalizeRoleName(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

export function roleIdForName(name: string): string {
  return `role-${normalizeRoleName(name).replace(/\s+/g, '-')}`
}

export function defaultObjectPermission(access: PermissionAccessLevel = 'READ_WRITE'): ObjectPermissionDefinition {
  return {
    objectKey: '',
    access,
    actions: {},
    fields: {},
  }
}

export function objectPermissionForMetadata(metadata: PermissionObjectMetadata, access: PermissionAccessLevel): ObjectPermissionDefinition {
  const base = defaultObjectPermission(access)
  return {
    objectKey: metadata.objectKey,
    access: base.access,
    actions: Object.fromEntries(metadata.actions.map((action) => [action, access === 'READ_WRITE' ? 'ALLOWED' : 'NOT_ALLOWED'])),
    fields: Object.fromEntries(metadata.fields.map((field) => [field, access === 'HIDDEN' ? 'HIDDEN' : access])),
  }
}

export function defaultRoles(now = DEFAULT_AUTHORIZATION_TIMESTAMP): RoleDefinition[] {
  return DEFAULT_ROLE_NAMES.map((name) => {
    const isMostlyReadOnly = name.includes('Associate') || name.includes('Specialist') || name === 'Support Engineer'
    const access: PermissionAccessLevel = isMostlyReadOnly ? 'READ_ONLY' : 'READ_WRITE'
    return {
      id: roleIdForName(name),
      name,
      normalizedName: normalizeRoleName(name),
      description: `${name} default V1.3 role.`,
      permissions: PERMISSION_OBJECTS.map((metadata) => objectPermissionForMetadata(metadata, access)),
      createdAt: now,
      updatedAt: now,
    }
  })
}

export const DEFAULT_CURRENT_USER_ROLE_IDS = [
  roleIdForName('GM'),
  roleIdForName('Delivery Manager'),
]
