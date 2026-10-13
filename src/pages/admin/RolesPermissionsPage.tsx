import { useMemo, useState } from 'react'
import { Save } from 'lucide-react'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame } from '@/components/record'
import { formMessageClassName } from '@/components/ui'
import type { ActionPermissionLevel, FieldPermissionLevel, ObjectPermissionDefinition, PermissionAccessLevel, RoleDefinition } from '@/data/seed.types'
import {
  ACTION_PERMISSION_VALUES,
  FIELD_PERMISSION_VALUES,
  PAGE_ACCESS_VALUES,
  PERMISSION_OBJECTS,
  effectivePermissionForObject,
} from '@/domain/authorization'
import { useAppStore } from '@/store/useAppStore'

function selectClassName() {
  return 'h-8 rounded border border-sf-border bg-white px-2 py-1 text-sm text-sf-text'
}

function permissionForObject(role: RoleDefinition, objectKey: string): ObjectPermissionDefinition {
  return role.permissions.find((permission) => permission.objectKey === objectKey) ?? {
    objectKey,
    access: 'READ_ONLY',
    actions: {},
    fields: {},
  }
}

export function RolesPermissionsPage() {
  const roles = useAppStore((state) => state.roles)
  const assignments = useAppStore((state) => state.userRoleAssignments)
  const updateRoleDefinition = useAppStore((state) => state.updateRoleDefinition)
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? '')
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0]
  const [draft, setDraft] = useState<RoleDefinition | null>(selectedRole ?? null)
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const currentRoleIds = assignments.find((assignment) => assignment.userId === 'demo-user')?.roleIds ?? []
  const selectedEffective = useMemo(() => {
    if (!draft) return []
    return PERMISSION_OBJECTS.map((object) => ({
      object,
      permission: effectivePermissionForObject({ roles: [draft], userRoleAssignments: [{ id: 'draft', userId: 'draft-user', roleIds: [draft.id], updatedAt: draft.updatedAt }] }, object.objectKey, 'draft-user'),
    }))
  }, [draft])

  function chooseRole(roleId: string) {
    const nextRole = roles.find((role) => role.id === roleId) ?? roles[0]
    setSelectedRoleId(nextRole?.id ?? '')
    setDraft(nextRole ? { ...nextRole, permissions: nextRole.permissions.map((permission) => ({ ...permission, actions: { ...permission.actions }, fields: { ...permission.fields } })) } : null)
    setMessage(null)
  }

  function updatePermission(objectKey: string, patch: Partial<ObjectPermissionDefinition>) {
    setDraft((current) => {
      if (!current) return current
      const permissions = current.permissions.map((permission) =>
        permission.objectKey === objectKey
          ? { ...permission, ...patch, actions: patch.actions ?? permission.actions, fields: patch.fields ?? permission.fields }
          : permission,
      )
      return { ...current, permissions }
    })
    setMessage(null)
  }

  function updateAction(objectKey: string, action: string, value: ActionPermissionLevel) {
    if (!draft) return
    const permission = permissionForObject(draft, objectKey)
    updatePermission(objectKey, { actions: { ...permission.actions, [action]: value } })
  }

  function updateField(objectKey: string, field: string, value: FieldPermissionLevel) {
    if (!draft) return
    const permission = permissionForObject(draft, objectKey)
    updatePermission(objectKey, { fields: { ...permission.fields, [field]: value } })
  }

  function saveDraft() {
    if (!draft) return
    const result = updateRoleDefinition(draft)
    setMessage({ kind: result.ok ? 'success' : 'error', text: result.message })
    if (result.record) setDraft(result.record)
  }

  return (
    <WorkspaceFrame>
      <PageHeader title="Roles & Permissions" subtitle="Authoritative V1.3 application role definitions and notification recipient roles" />
      <WorkspaceDashboardContent>
        <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
          <aside className="rounded border border-sf-border bg-white">
            <div className="border-b border-sf-border px-3 py-2 text-sm font-semibold text-sf-text">Roles</div>
            <div className="max-h-[70vh] overflow-auto p-2">
              {roles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  className={[
                    'mb-1 flex w-full items-center justify-between rounded px-3 py-2 text-left text-sm',
                    role.id === draft?.id ? 'bg-sf-brand text-white' : 'text-sf-text hover:bg-sf-surface-alt',
                  ].join(' ')}
                  onClick={() => chooseRole(role.id)}
                >
                  <span>{role.name}</span>
                  {currentRoleIds.includes(role.id) ? <span className="text-xs opacity-80">Current</span> : null}
                </button>
              ))}
            </div>
          </aside>

          <section className="min-w-0 rounded border border-sf-border bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-sf-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold text-sf-text">{draft?.name ?? 'No role selected'}</h2>
                <p className="text-xs text-sf-text-muted">Multiple roles combine grants. Page Hidden blocks object access; Page Read Only prevents writable fields and actions.</p>
              </div>
              <button type="button" className="inline-flex h-9 items-center gap-2 rounded bg-sf-brand px-3 text-sm font-semibold text-white hover:bg-sf-brand-dark" onClick={saveDraft} disabled={!draft}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save
              </button>
            </div>
            {message ? <div className={message.kind === 'error' ? formMessageClassName([message.text]) : 'mx-4 mt-3 rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700'}>{message.text}</div> : null}
            <div className="max-h-[70vh] overflow-auto p-4">
              {draft ? selectedEffective.map(({ object, permission }) => {
                const rolePermission = permissionForObject(draft, object.objectKey)
                return (
                  <details key={object.objectKey} className="mb-3 rounded border border-sf-border bg-white" open={object.group === 'Admin'}>
                    <summary className="cursor-pointer border-b border-sf-border bg-sf-surface-alt px-3 py-2 text-sm font-semibold text-sf-text">
                      {object.label}
                      <span className="ml-2 text-xs font-normal text-sf-text-muted">{object.group}</span>
                    </summary>
                    <div className="space-y-4 p-3">
                      <label className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium text-sf-text">Page/Object Access</span>
                        <select className={selectClassName()} value={rolePermission.access} onChange={(event) => updatePermission(object.objectKey, { access: event.target.value as PermissionAccessLevel })}>
                          {PAGE_ACCESS_VALUES.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
                        </select>
                        <span className="text-xs text-sf-text-muted">Effective: {permission.access.replace('_', ' ')}</span>
                      </label>
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase text-sf-text-muted">Actions</div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {object.actions.map((action) => (
                            <label key={action} className="flex items-center justify-between gap-2 rounded border border-sf-border px-2 py-1 text-sm">
                              <span>{action}</span>
                              <select className={selectClassName()} value={rolePermission.actions[action] ?? 'NOT_ALLOWED'} onChange={(event) => updateAction(object.objectKey, action, event.target.value as ActionPermissionLevel)}>
                                {ACTION_PERMISSION_VALUES.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="mb-2 text-xs font-semibold uppercase text-sf-text-muted">Fields</div>
                        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                          {object.fields.map((field) => (
                            <label key={field} className="flex items-center justify-between gap-2 rounded border border-sf-border px-2 py-1 text-sm">
                              <span>{field}</span>
                              <select className={selectClassName()} value={rolePermission.fields[field] ?? 'READ_ONLY'} onChange={(event) => updateField(object.objectKey, field, event.target.value as FieldPermissionLevel)}>
                                {FIELD_PERMISSION_VALUES.map((value) => <option key={value} value={value}>{value.replace('_', ' ')}</option>)}
                              </select>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                )
              }) : null}
            </div>
          </section>
        </div>
      </WorkspaceDashboardContent>
    </WorkspaceFrame>
  )
}
