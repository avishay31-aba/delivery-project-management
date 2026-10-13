import { CURRENT_USER_ID } from '@/config/current-user'
import type {
  ActionPermissionLevel,
  FieldPermissionLevel,
  ObjectPermissionDefinition,
  PermissionAccessLevel,
  RoleDefinition,
  UserRoleAssignment,
} from '@/data/seed.types'
import {
  DEFAULT_CURRENT_USER_ROLE_IDS,
  PERMISSION_OBJECTS,
  DEFAULT_AUTHORIZATION_TIMESTAMP,
  defaultRoles,
  normalizeRoleName,
  objectPermissionForMetadata,
  roleIdForName,
} from './metadata'

export interface AuthorizationState {
  roles: RoleDefinition[]
  userRoleAssignments: UserRoleAssignment[]
}

export interface EffectivePermission {
  objectKey: string
  access: PermissionAccessLevel
  actionPermissions: Record<string, ActionPermissionLevel>
  fieldPermissions: Record<string, FieldPermissionLevel>
}

const ACCESS_RANK: Record<PermissionAccessLevel, number> = {
  HIDDEN: 0,
  READ_ONLY: 1,
  READ_WRITE: 2,
}

const FIELD_RANK: Record<FieldPermissionLevel, number> = {
  HIDDEN: 0,
  READ_ONLY: 1,
  READ_WRITE: 2,
}

function accessFromRank(rank: number): PermissionAccessLevel {
  if (rank >= ACCESS_RANK.READ_WRITE) return 'READ_WRITE'
  if (rank >= ACCESS_RANK.READ_ONLY) return 'READ_ONLY'
  return 'HIDDEN'
}

function fieldFromRank(rank: number): FieldPermissionLevel {
  if (rank >= FIELD_RANK.READ_WRITE) return 'READ_WRITE'
  if (rank >= FIELD_RANK.READ_ONLY) return 'READ_ONLY'
  return 'HIDDEN'
}

function normalizePermission(permission: ObjectPermissionDefinition, fallbackObjectKey = ''): ObjectPermissionDefinition {
  const metadata = PERMISSION_OBJECTS.find((candidate) => candidate.objectKey === (permission.objectKey || fallbackObjectKey))
  const access: PermissionAccessLevel = permission.access === 'HIDDEN' || permission.access === 'READ_ONLY' || permission.access === 'READ_WRITE'
    ? permission.access
    : 'READ_ONLY'
  const base = metadata ? objectPermissionForMetadata(metadata, access) : { objectKey: permission.objectKey || fallbackObjectKey, access, actions: {}, fields: {} }
  return {
    objectKey: base.objectKey,
    access,
    actions: {
      ...base.actions,
      ...Object.fromEntries(Object.entries(permission.actions ?? {}).map(([key, value]) => [
        key,
        value === 'ALLOWED' ? 'ALLOWED' : 'NOT_ALLOWED',
      ])),
    },
    fields: {
      ...base.fields,
      ...Object.fromEntries(Object.entries(permission.fields ?? {}).map(([key, value]) => [
        key,
        value === 'READ_WRITE' || value === 'READ_ONLY' || value === 'HIDDEN' ? value : 'READ_ONLY',
      ])),
    },
  }
}

export function normalizeRoles(values: unknown, now = DEFAULT_AUTHORIZATION_TIMESTAMP): RoleDefinition[] {
  const defaults = defaultRoles(now)
  const byName = new Map(defaults.map((role) => [role.normalizedName, role]))
  if (Array.isArray(values)) {
    values.forEach((value) => {
      if (!value || typeof value !== 'object') return
      const record = value as Partial<RoleDefinition>
      const name = typeof record.name === 'string' && record.name.trim() ? record.name.trim() : ''
      if (!name) return
      const normalizedName = normalizeRoleName(name)
      const defaultRole = byName.get(normalizedName)
      byName.set(normalizedName, {
        id: typeof record.id === 'string' && record.id.trim() ? record.id : defaultRole?.id ?? roleIdForName(name),
        name: defaultRole?.name ?? name,
        normalizedName,
        description: typeof record.description === 'string' ? record.description : defaultRole?.description ?? '',
        permissions: PERMISSION_OBJECTS.map((metadata) => {
          const current = record.permissions?.find((permission) => permission.objectKey === metadata.objectKey)
          return normalizePermission(current ?? defaultRole?.permissions.find((permission) => permission.objectKey === metadata.objectKey) ?? objectPermissionForMetadata(metadata, 'READ_ONLY'), metadata.objectKey)
        }),
        createdAt: typeof record.createdAt === 'string' ? record.createdAt : defaultRole?.createdAt ?? now,
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : defaultRole?.updatedAt ?? now,
      })
    })
  }
  return Array.from(byName.values()).sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }))
}

export function normalizeUserRoleAssignments(values: unknown, roles: RoleDefinition[], now = DEFAULT_AUTHORIZATION_TIMESTAMP): UserRoleAssignment[] {
  const validRoleIds = new Set(roles.map((role) => role.id))
  const assignments = Array.isArray(values) ? values.flatMap((value) => {
    if (!value || typeof value !== 'object') return []
    const record = value as Partial<UserRoleAssignment>
    const userId = typeof record.userId === 'string' && record.userId.trim() ? record.userId : ''
    if (!userId) return []
    return [{
      id: typeof record.id === 'string' && record.id.trim() ? record.id : `user-role-${userId}`,
      userId,
      roleIds: Array.isArray(record.roleIds) ? Array.from(new Set(record.roleIds.filter((roleId): roleId is string => validRoleIds.has(roleId)))) : [],
      updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : now,
    }]
  }) : []
  if (!assignments.some((assignment) => assignment.userId === CURRENT_USER_ID)) {
    assignments.push({
      id: `user-role-${CURRENT_USER_ID}`,
      userId: CURRENT_USER_ID,
      roleIds: DEFAULT_CURRENT_USER_ROLE_IDS.filter((roleId) => validRoleIds.has(roleId)),
      updatedAt: now,
    })
  }
  return assignments
}

export function rolesForUser(state: AuthorizationState, userId = CURRENT_USER_ID): RoleDefinition[] {
  const assignment = state.userRoleAssignments.find((candidate) => candidate.userId === userId)
  const roleIds = new Set(assignment?.roleIds ?? [])
  return state.roles.filter((role) => roleIds.has(role.id))
}

export function effectivePermissionForObject(state: AuthorizationState, objectKey: string, userId = CURRENT_USER_ID): EffectivePermission {
  const metadata = PERMISSION_OBJECTS.find((candidate) => candidate.objectKey === objectKey)
  const roles = rolesForUser(state, userId)
  const permissions = roles
    .map((role) => role.permissions.find((permission) => permission.objectKey === objectKey))
    .filter((permission): permission is ObjectPermissionDefinition => Boolean(permission))
    .map((permission) => normalizePermission(permission, objectKey))

  if (permissions.length === 0) {
    return {
      objectKey,
      access: 'HIDDEN',
      actionPermissions: Object.fromEntries((metadata?.actions ?? []).map((action) => [action, 'NOT_ALLOWED'])),
      fieldPermissions: Object.fromEntries((metadata?.fields ?? []).map((field) => [field, 'HIDDEN'])),
    }
  }

  const access = accessFromRank(Math.max(...permissions.map((permission) => ACCESS_RANK[permission.access])))
  const actionPermissions = Object.fromEntries((metadata?.actions ?? []).map((action) => [
    action,
    permissions.some((permission) => permission.actions[action] === 'ALLOWED') ? 'ALLOWED' : 'NOT_ALLOWED',
  ])) as Record<string, ActionPermissionLevel>
  const fieldPermissions = Object.fromEntries((metadata?.fields ?? []).map((field) => [
    field,
    fieldFromRank(Math.max(...permissions.map((permission) => FIELD_RANK[permission.fields[field] ?? (permission.access === 'HIDDEN' ? 'HIDDEN' : 'READ_ONLY')]))),
  ]))

  return { objectKey, access, actionPermissions, fieldPermissions }
}

export function canViewObject(state: AuthorizationState, objectKey: string, userId = CURRENT_USER_ID): boolean {
  return effectivePermissionForObject(state, objectKey, userId).access !== 'HIDDEN'
}

export function canEditObject(state: AuthorizationState, objectKey: string, userId = CURRENT_USER_ID): boolean {
  return effectivePermissionForObject(state, objectKey, userId).access === 'READ_WRITE'
}

export function canExecuteAction(state: AuthorizationState, objectKey: string, action: string, userId = CURRENT_USER_ID): boolean {
  const permission = effectivePermissionForObject(state, objectKey, userId)
  if (permission.access !== 'READ_WRITE') return false
  return permission.actionPermissions[action] === 'ALLOWED'
}

export function fieldPermission(state: AuthorizationState, objectKey: string, field: string, userId = CURRENT_USER_ID): FieldPermissionLevel {
  const permission = effectivePermissionForObject(state, objectKey, userId)
  const fieldLevel = permission.fieldPermissions[field] ?? (permission.access === 'HIDDEN' ? 'HIDDEN' : 'READ_ONLY')
  if (permission.access === 'HIDDEN') return 'HIDDEN'
  if (permission.access === 'READ_ONLY' && fieldLevel === 'READ_WRITE') return 'READ_ONLY'
  return fieldLevel
}

export function canEditField(state: AuthorizationState, objectKey: string, field: string, userId = CURRENT_USER_ID): boolean {
  return canEditObject(state, objectKey, userId) && fieldPermission(state, objectKey, field, userId) === 'READ_WRITE'
}
