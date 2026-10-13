import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 Roles & Permissions verification failed: ${message}`)
    process.exitCode = 1
  }
}

const seedTypes = read('src/data/seed.types.ts')
const authMetadata = read('src/domain/authorization/metadata.ts')
const authService = read('src/domain/authorization/service.ts')
const appStore = read('src/store/useAppStore.ts')
const migration = read('src/platform/persistence/app-state-migration.ts')
const repository = read('src/platform/persistence/app-state-repository.ts')
const navigation = read('src/config/navigation.ts')
const routes = read('src/routes/index.tsx')
const page = read('src/pages/admin/RolesPermissionsPage.tsx')
const architecture = read('docs/architecture-handbook.md')

const expectedRoles = [
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
  'Support Engineer',
  'Professional Services Manager',
  'Professional Services Engineer',
  'Procurement Manager',
  'Procurement Associate',
  'Financial Manager',
]

assert(seedTypes.includes('export interface RoleDefinition'), 'RoleDefinition must be persisted in AppDataState types.')
assert(seedTypes.includes('export interface UserRoleAssignment'), 'UserRoleAssignment must be persisted in AppDataState types.')
assert(seedTypes.includes("export type PermissionAccessLevel = 'HIDDEN' | 'READ_ONLY' | 'READ_WRITE'"), 'Page/Object permission levels must support Hidden, Read Only and Read/Write.')
assert(seedTypes.includes("export type ActionPermissionLevel = 'ALLOWED' | 'NOT_ALLOWED'"), 'Action permission levels must support Allowed and Not Allowed.')
assert(seedTypes.includes("export type FieldPermissionLevel = 'HIDDEN' | 'READ_ONLY' | 'READ_WRITE'"), 'Field permission levels must support Hidden, Read Only and Read/Write.')
assert(seedTypes.includes('roles: RoleDefinition[]') && seedTypes.includes('userRoleAssignments: UserRoleAssignment[]'), 'AppDataState must include roles and user role assignments.')

expectedRoles.forEach((roleName) => {
  assert(authMetadata.includes(`'${roleName}'`), `Default role ${roleName} must exist in the authoritative role catalog.`)
})
assert(authMetadata.includes('normalizeRoleName') && authMetadata.includes('roleIdForName'), 'Role names must normalize to stable IDs to prevent duplicate spelling/capitalization roles.')
assert(authMetadata.includes('PERMISSION_OBJECTS') && authMetadata.includes('rolesPermissions') && authMetadata.includes('notificationsAlerts'), 'Permission object metadata must include business/admin objects and the new Admin pages.')

assert(authService.includes('export function effectivePermissionForObject'), 'Authorization service must expose a centralized effective permission evaluator.')
assert(authService.includes('export function canViewObject') && authService.includes('export function canEditObject'), 'Authorization service must expose object view/edit checks.')
assert(authService.includes('export function canExecuteAction'), 'Authorization service must expose action checks.')
assert(authService.includes('export function fieldPermission') && authService.includes('export function canEditField'), 'Authorization service must expose field permission checks.')
assert(authService.includes("if (permission.access !== 'READ_WRITE') return false"), 'Page Read Only/Hidden must prevent write actions.')
assert(authService.includes("if (permission.access === 'HIDDEN') return 'HIDDEN'"), 'Page Hidden must force effective field Hidden.')
assert(authService.includes("if (permission.access === 'READ_ONLY' && fieldLevel === 'READ_WRITE') return 'READ_ONLY'"), 'Page Read Only must prevent writable fields.')
assert(authService.includes('Math.max(...permissions.map'), 'Multiple roles must combine grants deterministically.')

assert(migration.includes('normalizeRoles') && migration.includes('normalizeUserRoleAssignments'), 'Migration must normalize roles and user-role assignments.')
assert(repository.includes("'roles'") && repository.includes("'userRoleAssignments'"), 'Persistence compact delta must include authorization collections.')
assert(appStore.includes('updateRoleDefinition') && appStore.includes("canExecuteAction(state, 'rolesPermissions', 'Edit')"), 'Role saving must go through a store method and authorization action check.')
assert(navigation.includes("label: 'Roles & Permissions'") && routes.includes('admin/roles-permissions'), 'Roles & Permissions must be reachable from Admin navigation and routes.')
assert(page.includes('PERMISSION_OBJECTS') && page.includes('PAGE_ACCESS_VALUES') && page.includes('FIELD_PERMISSION_VALUES') && page.includes('ACTION_PERMISSION_VALUES'), 'Roles UI must render the shared permission metadata and allowed values.')
assert(architecture.includes('not a production security boundary') && architecture.includes('server-side mutation checks remain V2 backend requirements'), 'Documentation must state the V1.3 browser authorization limitation and V2 backend boundary.')

if (!process.exitCode) {
  console.log('V1.3 Roles & Permissions verification passed.')
}
