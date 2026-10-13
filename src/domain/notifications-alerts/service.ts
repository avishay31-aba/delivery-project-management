import type {
  AlertRecord,
  AppDataState,
  InfrastructureItem,
  NotificationAlertObjectRef,
  NotificationEmailPayload,
  NotificationReadReceipt,
  NotificationRecord,
  NotificationRuleDefinition,
  RoleDefinition,
  Tenant,
  TenantWarranty,
} from '@/data/seed.types'
import type { ActivityEvent } from '@/domain/activity-log'
import { CURRENT_USER_DISPLAY_NAME, CURRENT_USER_ID } from '@/config/current-user'
import { systemBusinessId } from '@/domain/business-reference'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import {
  REUSED_INTERNAL_PURPOSE_OBSOLETE,
  SYSTEM_OPERATIONAL_STATUS_DELETED,
} from '@/domain/system-inventory'
import { tenantDerivedWarrantyContractStatus } from '@/domain/tenant-operations'
import { isTenantOperationallyVisible } from '@/domain/tenant-operations/lifecycle'
import { warrantyCollectionReadModel } from '@/domain/warranty-collection'
import {
  currentInfrastructureWarranty,
  infrastructureWarrantyStatusFromCollection,
} from '@/domain/infrastructure-item'
import { DEFAULT_NOTIFICATIONS_ALERTS_TIMESTAMP, defaultNotificationRules, NOTIFICATIONS_ALERTS_SCHEMA_VERSION } from './metadata'

export type NotificationAlertState = Pick<AppDataState,
  | 'projects'
  | 'systems'
  | 'productionSystemInventory'
  | 'reusedInternalSystems'
  | 'tenants'
  | 'infrastructureItems'
  | 'activityEvents'
  | 'roles'
  | 'notificationRules'
  | 'notificationRecords'
  | 'alertRecords'
>

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeForObject(objectType: string, businessId: string): string | undefined {
  if (!businessId) return undefined
  const normalized = objectType.toUpperCase()
  if (normalized.includes('PROJECT')) return `/projects/${businessId}?mode=view`
  if (normalized.includes('SYSTEM')) return `/systems/${businessId}?mode=view`
  if (normalized.includes('TENANT')) return `/tenants/${businessId}?mode=view`
  if (normalized.includes('INFRASTRUCTURE')) return `/infrastructure/${businessId}?mode=view`
  if (normalized.includes('OPPORTUNITY')) return `/opportunities/${businessId}?mode=view`
  if (normalized.includes('CUSTOMER') || normalized.includes('ACCOUNT')) return `/customers/${businessId}?mode=view`
  return undefined
}

function present(value: unknown): string {
  const rendered = text(value)
  return rendered || '-'
}

function listParts(parts: Array<string | null | undefined>): string {
  return parts.map((part) => text(part)).filter(Boolean).join(', ')
}

function systemContext(system: AppDataState['systems'][number] | undefined): string {
  if (!system) return ''
  const legacy = system as unknown as Record<string, unknown>
  const hosting = listParts([
    `Hosting: ${present(system.hostingType)}`,
    system.csp ? `CSP: ${system.csp}` : '',
    system.cloudPlatform ? `Cloud Platform: ${system.cloudPlatform}` : '',
    system.cloudRegion ? `Cloud Region: ${system.cloudRegion}` : '',
  ])
  return listParts([
    `System Type: ${present(legacy.systemType ?? system.source)}`,
    `Product: ${present(system.productType)}`,
    `SID/MID: ${systemBusinessId(system)}`,
    hosting,
  ])
}

function objectRef(input: {
  objectType: string
  id: string
  businessId: string
  displayLabel?: string
  routePath?: string
  snapshot?: Record<string, unknown>
}): NotificationAlertObjectRef {
  const routePath = input.routePath ?? routeForObject(input.objectType, input.businessId)
  return {
    objectType: input.objectType,
    id: input.id,
    businessId: input.businessId,
    displayLabel: input.displayLabel ?? input.businessId,
    ...(routePath ? { routePath } : {}),
    ...(input.snapshot ? { snapshot: input.snapshot } : {}),
  }
}

function activityRef(ref: ActivityEvent['primaryObject']): NotificationAlertObjectRef {
  return objectRef({
    objectType: ref.objectType,
    id: ref.id,
    businessId: ref.businessId || ref.id,
    displayLabel: ref.displayLabel || ref.businessId || ref.id,
    routePath: ref.routePath,
    snapshot: {
      objectType: ref.objectType,
      id: ref.id,
      businessId: ref.businessId,
      displayLabel: ref.displayLabel,
    },
  })
}

function refTypeIncludes(ref: NotificationAlertObjectRef | ActivityEvent['primaryObject'], value: string): boolean {
  return ref.objectType.toLocaleUpperCase().includes(value)
}

function findActivityRef(event: ActivityEvent, matcher: (ref: ActivityEvent['primaryObject']) => boolean): ActivityEvent['primaryObject'] | null {
  return [event.primaryObject, ...event.relatedObjects].find(matcher) ?? null
}

function primaryActivityRefForRule(event: ActivityEvent, rule: NotificationRuleDefinition): ActivityEvent['primaryObject'] {
  if (rule.category === 'PROJECT') return findActivityRef(event, (ref) => refTypeIncludes(ref, 'PROJECT')) ?? event.primaryObject
  if (rule.category === 'SYSTEM') return findActivityRef(event, (ref) => refTypeIncludes(ref, 'SYSTEM')) ?? event.primaryObject
  if (rule.category === 'TENANT' || rule.category === 'TENANT_WARRANTY') return findActivityRef(event, (ref) => refTypeIncludes(ref, 'TENANT')) ?? event.primaryObject
  if (rule.category === 'INFRASTRUCTURE_ITEM' || rule.category === 'INFRASTRUCTURE_WARRANTY') return findActivityRef(event, (ref) => refTypeIncludes(ref, 'INFRASTRUCTURE')) ?? event.primaryObject
  return event.primaryObject
}

function projectForRef(state: NotificationAlertState, ref: NotificationAlertObjectRef | null | undefined) {
  if (!ref) return undefined
  return state.projects.find((project) => project.id === ref.id || project.pid === ref.businessId)
}

function tenantForRef(state: NotificationAlertState, ref: NotificationAlertObjectRef | null | undefined) {
  if (!ref) return undefined
  return state.tenants.find((tenant) => tenant.id === ref.id || tenant.tid === ref.businessId)
}

function systemForRef(state: NotificationAlertState, ref: NotificationAlertObjectRef | null | undefined) {
  if (!ref) return undefined
  const systems = [
    ...state.systems,
    ...state.productionSystemInventory,
    ...state.reusedInternalSystems,
  ] as AppDataState['systems']
  return systems.find((system) => system.id === ref.id || systemBusinessId(system) === ref.businessId)
}

function infrastructureForRef(state: NotificationAlertState, ref: NotificationAlertObjectRef | null | undefined) {
  if (!ref) return undefined
  return state.infrastructureItems.find((item) => item.id === ref.id || item.infrastructureId === ref.businessId)
}

function projectTemplateContext(project: AppDataState['projects'][number] | undefined, fallbackBusinessId = ''): string {
  const pid = project?.pid ?? fallbackBusinessId
  const projectName = text(project?.opportunityName) || pid
  const endUser = text(project?.accountName) || '-'
  return `${project?.mainType ?? '-'} - ${project?.subType ?? '-'}: "${pid} - ${projectName}"; End User - "${endUser}"`
}

type NotificationSystemContext =
  | AppDataState['systems'][number]
  | AppDataState['productionSystemInventory'][number]
  | AppDataState['reusedInternalSystems'][number]

function cloudSystemParts(system: NotificationSystemContext | undefined): string[] {
  if (!system) return []
  const hosting = text(system.hostingType)
  const isCloud = /cloud|hybrid/i.test(hosting)
  return [
    `Host - "${hosting || '-'}"`,
    isCloud ? `Platform - "${text(system.cloudPlatform) || '-'}"` : '',
    isCloud ? `CSP - "${text(system.csp) || '-'}"` : '',
    isCloud ? `Cloud region - "${text(system.cloudRegion) || '-'}"` : '',
    `Performance tier - "${text(system.performanceTier) || '-'}"`,
  ].filter(Boolean)
}

function systemTemplateContext(system: AppDataState['systems'][number] | undefined, fallbackBusinessId = ''): string {
  const sid = system ? systemBusinessId(system) : fallbackBusinessId
  return [`"${sid}"`, ...cloudSystemParts(system)].join('; ')
}

function tenantTemplateContext(input: {
  tenant: Tenant | undefined
  system: AppDataState['systems'][number] | undefined
  project: AppDataState['projects'][number] | undefined
  actorName: string
  actionPhrase: string
}): string {
  const sid = input.system ? systemBusinessId(input.system) : input.tenant?.hostedSystemId || input.tenant?.systemId || '-'
  const project = input.project
  const projectType = project ? `${project.mainType} - ${project.subType}` : '-'
  const pid = project?.pid ?? input.tenant?.deliveryPid ?? '-'
  const requirementId = text(input.tenant?.sourceRequirementId) || '-'
  return `${input.actionPhrase} system "${sid}" ${cloudSystemParts(input.system).join('; ')}; Product type - "${text(input.tenant?.productType) || text(input.system?.productType) || '-'}"; as part of "${projectType} - ${pid}" project "${pid}" according to tenant requirement "${requirementId}" by "${input.actorName || '-'}".`
}

function infrastructureTemplateContext(item: InfrastructureItem | undefined, actorName: string, actionText: string): string {
  return `${text(item?.categoryRefId) || '-'} infrastructure item ${item?.infrastructureId ?? '-'} of type ${text(item?.typeRefId) || '-'} ${actionText} by ${actorName || '-'}.`
}

function fullMessageFromActivityTemplate(input: {
  event: ActivityEvent
  rule: NotificationRuleDefinition
  state: NotificationAlertState
  primaryObject: NotificationAlertObjectRef
  relatedObjects: NotificationAlertObjectRef[]
}): string {
  const { event, rule, state, primaryObject, relatedObjects } = input
  const actor = text(event.actorName) || '-'
  const projectRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'PROJECT')) ?? (refTypeIncludes(primaryObject, 'PROJECT') ? primaryObject : null)
  const systemRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'SYSTEM')) ?? (refTypeIncludes(primaryObject, 'SYSTEM') ? primaryObject : null)
  const tenantRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'TENANT')) ?? (refTypeIncludes(primaryObject, 'TENANT') ? primaryObject : null)
  const infrastructureRefValue = relatedObjects.find((ref) => refTypeIncludes(ref, 'INFRASTRUCTURE')) ?? (refTypeIncludes(primaryObject, 'INFRASTRUCTURE') ? primaryObject : null)
  const project = projectForRef(state, projectRef)
  const system = systemForRef(state, systemRef)
  const tenant = tenantForRef(state, tenantRef)
  const infrastructure = infrastructureForRef(state, infrastructureRefValue)

  if (rule.eventKey === 'PROJECT_CREATED') return `New ${project?.mainType ?? '-'} - ${project?.subType ?? '-'} project was created: "${project?.pid ?? primaryObject.businessId} - ${text(project?.opportunityName) || primaryObject.businessId}"; End User - "${text(project?.accountName) || '-'}".`
  if (rule.eventKey === 'PROJECT_TENANT_REQUIREMENTS_UPDATED') return `Tenant requirements were updated. ${projectTemplateContext(project, primaryObject.businessId)}; ${tenant?.tid ?? '-'} - ${text(tenant?.sourceRequirementId) || '-'}.`
  if (rule.eventKey === 'PROJECT_CANCELLED') return `${projectTemplateContext(project, primaryObject.businessId)} was cancelled.`
  if (rule.eventKey === 'POC_END_DATE_UPDATED') return `${projectTemplateContext(project, primaryObject.businessId)} end date was updated. New POC period: ${formatSemanticDateTimeValue(project?.pocStartDate, 'date', { fallback: '-' })} - ${formatSemanticDateTimeValue(project?.pocEndDate, 'date', { fallback: '-' })}.`

  if (rule.eventKey === 'SYSTEM_CREATED') return `New ${system?.source ?? '-'} system was created by "${actor}": ${systemTemplateContext(system, primaryObject.businessId)}.`
  if (rule.eventKey === 'SYSTEM_ALLOCATED') return `${system?.source ?? '-'} system was allocated to project "${project?.pid ?? '-'} - ${text(project?.opportunityName) || '-'}"; End User - "${text(project?.accountName) || '-'}" by "${actor}": ${systemTemplateContext(system, primaryObject.businessId)}.`
  if (rule.eventKey === 'SYSTEM_DEALLOCATED') return `${system?.source ?? '-'} system was deallocated from project "${project?.pid ?? '-'} - ${text(project?.opportunityName) || '-'}"; End User - "${text(project?.accountName) || '-'}" by "${actor}": ${systemTemplateContext(system, primaryObject.businessId)}.`
  if (rule.eventKey === 'SYSTEM_UPGRADED') return `System ${primaryObject.businessId} was successfully upgraded by "${actor}".`
  if (rule.eventKey === 'SYSTEM_UPGRADE_SCHEDULE_REQUESTED') return `${event.summary}`
  if (rule.eventKey === 'SYSTEM_UPGRADE_SCHEDULE_UPDATED') return `${event.summary}`
  if (rule.eventKey === 'SYSTEM_UPGRADE_SCHEDULE_CONFIRMED') return `${event.summary}`

  if (rule.eventKey === 'TENANT_CREATED') return tenantTemplateContext({ tenant, system, project, actorName: actor, actionPhrase: `New tenant ${tenant?.tid ?? primaryObject.businessId} was CREATED and hosted in` })
  if (rule.eventKey === 'TENANT_CANCELLED') return tenantTemplateContext({ tenant, system, project, actorName: actor, actionPhrase: `Tenant ${tenant?.tid ?? primaryObject.businessId} was CANCELLED from` })
  if (rule.eventKey === 'TENANT_CONFIGURATION_CHANGED') return tenantTemplateContext({ tenant, system, project, actorName: actor, actionPhrase: `Tenant ${tenant?.tid ?? primaryObject.businessId} configuration was CHANGED, hosted in` })
  if (rule.eventKey === 'TENANT_DELETED') return tenantTemplateContext({ tenant, system, project, actorName: actor, actionPhrase: `Tenant ${tenant?.tid ?? primaryObject.businessId} was DELETED from` })

  if (rule.eventKey === 'INFRASTRUCTURE_ITEM_CREATED') return infrastructureTemplateContext(infrastructure, actor, 'was created')
  if (rule.eventKey === 'INFRASTRUCTURE_ITEM_DELETED') return infrastructureTemplateContext(infrastructure, actor, `was created by ${actor} and was DELETED`)
  if (rule.eventKey === 'INFRASTRUCTURE_ITEM_CANCELLED') return infrastructureTemplateContext(infrastructure, actor, `was created by ${actor} and was CANCELLED`)

  return event.summary
}

function projectLine(state: NotificationAlertState, ref: NotificationAlertObjectRef | null | undefined): string {
  if (!ref) return ''
  const project = projectForRef(state, ref)
  const name = text(project?.opportunityName)
  return name ? `Project: ${ref.businessId} - ${name}` : `Project: ${ref.businessId}`
}

function systemLine(ref: NotificationAlertObjectRef | null | undefined): string {
  return ref ? `System: ${ref.businessId}` : ''
}

function systemCreatedLines(state: NotificationAlertState, ref: NotificationAlertObjectRef): string[] {
  const system = systemForRef(state, ref)
  const machineId = text((system as unknown as Record<string, unknown> | undefined)?.machineId)
  const source = text((system as unknown as Record<string, unknown> | undefined)?.source)
  const isReused = source.toLocaleLowerCase().includes('reused') || ref.objectType.toLocaleUpperCase().includes('REUSED')
  return [
    `SID: ${ref.businessId}`,
    machineId ? `MID: ${machineId}` : '',
    `Type: ${isReused ? 'Reused' : 'Production'}`,
  ].filter(Boolean)
}

function warrantySummaryLines(warranty?: TenantWarranty | null): string[] {
  return [
    `Warranty ID: ${warranty?.warrantyId ?? '-'}`,
    warranty ? `Period: ${warranty.startDate || '-'} - ${warranty.endDate || '-'}` : '',
    warranty?.warrantyStatus ? `Status: ${warranty.warrantyStatus}` : '',
  ].filter(Boolean)
}

function contextSectionsForActivity(
  event: ActivityEvent,
  rule: NotificationRuleDefinition,
  state: NotificationAlertState,
  primaryObject: NotificationAlertObjectRef,
  relatedObjects: NotificationAlertObjectRef[],
): Array<{ heading: string; lines: string[] }> {
  const projectRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'PROJECT')) ?? (refTypeIncludes(primaryObject, 'PROJECT') ? primaryObject : null)
  const systemRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'SYSTEM')) ?? (refTypeIncludes(primaryObject, 'SYSTEM') ? primaryObject : null)
  const tenantRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'TENANT')) ?? (refTypeIncludes(primaryObject, 'TENANT') ? primaryObject : null)
  const infrastructureRef = relatedObjects.find((ref) => refTypeIncludes(ref, 'INFRASTRUCTURE')) ?? (refTypeIncludes(primaryObject, 'INFRASTRUCTURE') ? primaryObject : null)

  if (rule.eventKey === 'SYSTEM_ALLOCATED' || rule.eventKey === 'SYSTEM_DEALLOCATED') {
    return [
      {
        heading: 'Context',
        lines: [systemLine(systemRef), projectLine(state, projectRef)],
      },
      {
        heading: 'Performed By',
        lines: [`${event.actorName || '-'}; ${formatSemanticDateTimeValue(event.occurredAt, 'datetime')}`],
      },
    ]
  }

  if (rule.eventKey === 'SYSTEM_CREATED') {
    return [{ heading: 'System', lines: systemCreatedLines(state, primaryObject) }]
  }

  if (rule.eventKey === 'SYSTEM_UPGRADED') {
    return [
      { heading: 'System', lines: [systemLine(primaryObject)] },
      {
        heading: 'Version',
        lines: [
          event.after?.currentVersionNumberRefId ? `Version: ${event.after.currentVersionNumberRefId}` : '',
          event.after?.currentBuildNumberRefId ? `Build: ${event.after.currentBuildNumberRefId}` : '',
        ],
      },
    ]
  }

  if (rule.category === 'PROJECT') {
    return [{ heading: 'Project', lines: [projectLine(state, primaryObject)] }]
  }

  if (rule.category === 'TENANT_WARRANTY') {
    const tenant = tenantForRef(state, tenantRef ?? primaryObject)
    const beforeWarranties = Array.isArray(event.before?.warranties) ? event.before?.warranties as TenantWarranty[] : []
    const afterWarranties = Array.isArray(event.after?.warranties) ? event.after?.warranties as TenantWarranty[] : []
    const warranty = afterWarranties.find((candidate, index) => JSON.stringify(candidate) !== JSON.stringify(beforeWarranties[index]))
      ?? afterWarranties[0]
      ?? tenant?.warranties?.[0]
    return [
      { heading: 'Tenant', lines: [`TID: ${tenant?.tid ?? primaryObject.businessId}`] },
      { heading: 'Warranty', lines: warrantySummaryLines(warranty) },
    ]
  }

  if (rule.category === 'TENANT') {
    return [{ heading: 'Tenant', lines: [`TID: ${primaryObject.businessId}`] }]
  }

  if (rule.category === 'INFRASTRUCTURE_ITEM' || rule.category === 'INFRASTRUCTURE_WARRANTY') {
    return [{ heading: 'Infrastructure', lines: [infrastructureRef ? `Infrastructure ID: ${infrastructureRef.businessId}` : `Infrastructure ID: ${primaryObject.businessId}`] }]
  }

  return [
    {
      heading: businessSectionHeading(rule.category),
      lines: [`${primaryObject.objectType}: ${primaryObject.businessId}`],
    },
  ]
}

function emailPayload(input: {
  rule: NotificationRuleDefinition
  subject: string
  fullDescription: string
  primaryObject: NotificationAlertObjectRef
  now: string
}): NotificationEmailPayload {
  return {
    enabled: input.rule.emailEnabled,
    recipientRoleIds: input.rule.recipientRoleIds,
    subject: input.subject,
    fullDescription: input.fullDescription,
    deepLinkLabel: `Open ${input.primaryObject.objectType} ${input.primaryObject.businessId}`,
    ...(input.primaryObject.routePath ? { deepLinkRoute: input.primaryObject.routePath } : {}),
    generatedAt: input.now,
  }
}

function canonicalFullMessage(input: {
  title: string
  summary?: string
  sections: Array<{ heading: string; lines: string[] }>
  primaryObject: NotificationAlertObjectRef
}): string {
  return (text(input.summary) || text(input.title)).trim()
}

function eventTitle(eventKey: string, fallback: string): string {
  return eventKey
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLocaleLowerCase())
    .join(' ')
    .replace('Ris', 'RIS')
    .replace('Poc', 'POC')
    .replace('System Deleted Tenant Under Contract', 'Deleted Tenant Still Under Contract') || fallback
}

function businessSectionHeading(category: NotificationRuleDefinition['category']): string {
  if (category === 'TENANT_WARRANTY') return 'Warranty'
  if (category === 'INFRASTRUCTURE_ITEM') return 'Infrastructure'
  if (category === 'INFRASTRUCTURE_WARRANTY') return 'Infrastructure Warranty'
  return category.charAt(0) + category.slice(1).toLocaleLowerCase()
}

export function normalizeNotificationRules(values: unknown, roles: RoleDefinition[], now = DEFAULT_NOTIFICATIONS_ALERTS_TIMESTAMP): NotificationRuleDefinition[] {
  const defaults = defaultNotificationRules(roles, now)
  const validRoleIds = new Set(roles.map((role) => role.id))
  const byId = new Map(defaults.map((rule) => [rule.id, rule]))
  if (Array.isArray(values)) {
    values.forEach((value) => {
      if (!value || typeof value !== 'object') return
      const record = value as Partial<NotificationRuleDefinition>
      const id = text(record.id)
      const fallback = byId.get(id)
      if (!fallback) return
      const isCurrentSchema = record.schemaVersion === NOTIFICATIONS_ALERTS_SCHEMA_VERSION
      byId.set(id, {
        ...fallback,
        enabled: typeof record.enabled === 'boolean' ? record.enabled : fallback.enabled,
        recipientRoleIds: isCurrentSchema && Array.isArray(record.recipientRoleIds)
          ? Array.from(new Set(record.recipientRoleIds.filter((roleId): roleId is string => validRoleIds.has(roleId))))
          : fallback.recipientRoleIds,
        emailEnabled: isCurrentSchema && typeof record.emailEnabled === 'boolean' ? record.emailEnabled : fallback.emailEnabled,
        reminderFrequencyDays: isCurrentSchema && typeof record.reminderFrequencyDays === 'number' ? record.reminderFrequencyDays : fallback.reminderFrequencyDays ?? null,
        schemaVersion: NOTIFICATIONS_ALERTS_SCHEMA_VERSION,
        updatedAt: text(record.updatedAt) || fallback.updatedAt,
      })
    })
  }
  return Array.from(byId.values())
}

function normalizeNotificationRecord(value: unknown): NotificationRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<NotificationRecord>
  if (record.type !== 'NOTIFICATION' || !record.id || !record.eventKey || !record.primaryObject) return null
  const primaryObject = record.primaryObject as NotificationAlertObjectRef
  const fullDescription = text(record.fullDescription)
  const email = record.email && typeof record.email === 'object'
    ? {
        ...record.email,
        fullDescription,
        deepLinkLabel: `Open ${primaryObject.objectType} ${primaryObject.businessId}`,
        ...(primaryObject.routePath ? { deepLinkRoute: primaryObject.routePath } : {}),
      } as NotificationEmailPayload
    : {
        enabled: true,
        recipientRoleIds: Array.isArray(record.recipientRoleIds) ? record.recipientRoleIds : [],
        subject: text(record.shortMessage),
        fullDescription,
        deepLinkLabel: `Open ${primaryObject.objectType} ${primaryObject.businessId}`,
        ...(primaryObject.routePath ? { deepLinkRoute: primaryObject.routePath } : {}),
        generatedAt: text(record.createdAt) || new Date().toISOString(),
      }
  const readReceipts = Array.isArray(record.readReceipts)
    ? record.readReceipts.flatMap((receipt): NotificationReadReceipt[] => {
        if (!receipt || typeof receipt !== 'object') return []
        const value = receipt as Partial<NotificationReadReceipt>
        const userId = text(value.userId)
        const readAt = text(value.readAt)
        return userId && readAt ? [{ userId, readAt, readBy: text(value.readBy) || null }] : []
      })
    : []
  if (record.status === 'READ' && readReceipts.length === 0 && text(record.readAt)) {
    readReceipts.push({
      userId: CURRENT_USER_ID,
      readAt: text(record.readAt),
      readBy: text(record.readBy) || CURRENT_USER_DISPLAY_NAME,
    })
  }
  const currentUserStatus = readReceipts.some((receipt) => receipt.userId === CURRENT_USER_ID) ? 'READ' : 'UNREAD'
  return {
    ...record,
    type: 'NOTIFICATION',
    relatedObjects: Array.isArray(record.relatedObjects) ? record.relatedObjects : [],
    status: currentUserStatus,
    recipientRoleIds: Array.isArray(record.recipientRoleIds) ? record.recipientRoleIds : [],
    fullDescription,
    email,
    readAt: readReceipts.find((receipt) => receipt.userId === CURRENT_USER_ID)?.readAt ?? null,
    readBy: readReceipts.find((receipt) => receipt.userId === CURRENT_USER_ID)?.readBy ?? null,
    readReceipts,
    schemaVersion: record.schemaVersion || NOTIFICATIONS_ALERTS_SCHEMA_VERSION,
  } as NotificationRecord
}

function normalizeAlertRecord(value: unknown): AlertRecord | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Partial<AlertRecord>
  if (record.type !== 'ALERT' || !record.id || !record.eventKey || !record.conditionKey || !record.primaryObject) return null
  const primaryObject = record.primaryObject as NotificationAlertObjectRef
  const fullDescription = text(record.fullDescription)
  const email = record.email && typeof record.email === 'object'
    ? {
        ...record.email,
        fullDescription,
        deepLinkLabel: `Open ${primaryObject.objectType} ${primaryObject.businessId}`,
        ...(primaryObject.routePath ? { deepLinkRoute: primaryObject.routePath } : {}),
      } as NotificationEmailPayload
    : {
        enabled: true,
        recipientRoleIds: Array.isArray(record.recipientRoleIds) ? record.recipientRoleIds : [],
        subject: text(record.shortMessage),
        fullDescription,
        deepLinkLabel: `Open ${primaryObject.objectType} ${primaryObject.businessId}`,
        ...(primaryObject.routePath ? { deepLinkRoute: primaryObject.routePath } : {}),
        generatedAt: text(record.createdAt) || new Date().toISOString(),
      }
  return {
    ...record,
    type: 'ALERT',
    relatedObjects: Array.isArray(record.relatedObjects) ? record.relatedObjects : [],
    status: record.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
    recipientRoleIds: Array.isArray(record.recipientRoleIds) ? record.recipientRoleIds : [],
    fullDescription,
    email,
    reminderFrequencyDays: typeof record.reminderFrequencyDays === 'number' ? record.reminderFrequencyDays : null,
    schemaVersion: record.schemaVersion || NOTIFICATIONS_ALERTS_SCHEMA_VERSION,
  } as AlertRecord
}

export function normalizeNotificationRecords(values: unknown): NotificationRecord[] {
  return Array.isArray(values) ? values.flatMap((value) => normalizeNotificationRecord(value) ?? []) : []
}

export function notificationReadStatusForUser(record: NotificationRecord, userId = CURRENT_USER_ID): 'READ' | 'UNREAD' {
  return (record.readReceipts ?? []).some((receipt) => receipt.userId === userId) ? 'READ' : 'UNREAD'
}

export function normalizeAlertRecords(values: unknown): AlertRecord[] {
  return Array.isArray(values) ? values.flatMap((value) => normalizeAlertRecord(value) ?? []) : []
}

function ruleForEvent(rules: NotificationRuleDefinition[], eventKey: string, type: 'ALERT' | 'NOTIFICATION'): NotificationRuleDefinition | undefined {
  return rules.find((rule) => rule.eventKey === eventKey && rule.type === type && rule.enabled)
}

function eventKeyForActivity(event: ActivityEvent): string | null {
  const eventType = event.eventType.toLocaleLowerCase()
  const summary = event.summary.toLocaleLowerCase()
  if (eventType === 'project.created') return 'PROJECT_CREATED'
  if (eventType.includes('requirement')) return 'PROJECT_TENANT_REQUIREMENTS_UPDATED'
  if (eventType === 'project.statuschanged' && summary.includes('cancel')) return 'PROJECT_CANCELLED'
  if (eventType.includes('poc') && eventType.includes('date')) return 'POC_END_DATE_UPDATED'
  if (eventType === 'system.created') return 'SYSTEM_CREATED'
  if (eventType === 'allocation.systemallocated') return 'SYSTEM_ALLOCATED'
  if (eventType === 'allocation.systemdeallocated') return 'SYSTEM_DEALLOCATED'
  if (eventType.includes('purpose') && summary.includes('occupied')) return 'RIS_OCCUPIED'
  if (eventType.includes('purpose') && summary.includes('available')) return 'RIS_AVAILABLE'
  if (eventType.includes('operationalstatuschanged') && summary.includes('deleted')) return 'SYSTEM_DELETED'
  if (eventType.includes('operationalstatuschanged') && summary.includes('off')) return 'SYSTEM_TURNED_OFF'
  if (eventType.includes('operationalstatuschanged') && summary.includes('access blocked')) return 'SYSTEM_ACCESS_BLOCKED'
  if (eventType.includes('operationalstatuschanged') && summary.includes('service blocked')) return 'SYSTEM_SERVICE_BLOCKED'
  if (eventType.includes('operationalstatuschanged') && summary.includes(' on')) return 'SYSTEM_ON'
  if (eventType === 'versionupgrade.schedulerequested') return 'SYSTEM_UPGRADE_SCHEDULE_REQUESTED'
  if (eventType === 'versionupgrade.scheduleupdated') return 'SYSTEM_UPGRADE_SCHEDULE_UPDATED'
  if (eventType === 'versionupgrade.scheduleconfirmed') return 'SYSTEM_UPGRADE_SCHEDULE_CONFIRMED'
  if (eventType.includes('versionupdate')) return 'SYSTEM_UPGRADED'
  if (eventType.includes('provisioningcompleted') || eventType.includes('systemready')) return 'SYSTEM_READY_PROVISIONING_COMPLETED'
  if (eventType === 'tenant.created' || eventType === 'tenant.createdfromrequirement') return 'TENANT_CREATED'
  if (eventType === 'tenant.cancelled') return 'TENANT_CANCELLED'
  if (eventType.includes('tenant.configurationchanged')) return 'TENANT_CONFIGURATION_CHANGED'
  if (eventType.includes('tenant.deleted')) return 'TENANT_DELETED'
  if (eventType.includes('tenant.operationalstatuschanged') && summary.includes('password reset')) return 'TENANT_ACCESS_BLOCKED_PASSWORD_RESET'
  if (eventType.includes('tenant.warrantyrenewed') || (eventType.includes('tenant.warranty') && summary.includes('renewed by'))) return 'TENANT_WARRANTY_RENEWED'
  if (eventType.includes('tenant.warrantynotrenewed') || (eventType.includes('tenant.warranty') && summary.includes('not renewed'))) return 'TENANT_WARRANTY_NOT_RENEWED'
  if (eventType.includes('tenant.warrantychanged') || eventType.includes('tenant.warrantycreated') || eventType.includes('tenant.warrantyupdated')) return 'TENANT_WARRANTY_CREATED_UPDATED'
  if (eventType === 'infrastructureitem.created') return 'INFRASTRUCTURE_ITEM_CREATED'
  if (eventType.includes('infrastructureitem') && summary.includes('deleted')) return 'INFRASTRUCTURE_ITEM_DELETED'
  if (eventType.includes('infrastructureitem') && summary.includes('cancel')) return 'INFRASTRUCTURE_ITEM_CANCELLED'
  if (eventType.includes('infrastructure') && eventType.includes('warrantyrenewed')) return 'INFRASTRUCTURE_WARRANTY_RENEWED'
  if (eventType.includes('infrastructure') && eventType.includes('warrantynotrenewed')) return 'INFRASTRUCTURE_WARRANTY_NOT_RENEWED'
  return null
}

function notificationFromActivity(event: ActivityEvent, rule: NotificationRuleDefinition, now: string, state: NotificationAlertState): NotificationRecord {
  const selectedPrimaryRef = primaryActivityRefForRule(event, rule)
  const primaryObject = activityRef(selectedPrimaryRef)
  const relatedObjects = [event.primaryObject, ...event.relatedObjects]
    .filter((ref) => ref !== selectedPrimaryRef)
    .map(activityRef)
  const subject = event.summary
  const message = fullMessageFromActivityTemplate({ event, rule, state, primaryObject, relatedObjects })
  const canonical = canonicalFullMessage({
    title: eventTitle(rule.eventKey, event.summary),
    summary: message,
    primaryObject,
    sections: contextSectionsForActivity(event, rule, state, primaryObject, relatedObjects),
  })
  return {
    id: `notification-${event.id}`,
    type: 'NOTIFICATION',
    severity: rule.severity,
    category: rule.category,
    eventKey: rule.eventKey,
    ruleId: rule.id,
    sourceActivityEventId: event.id,
    primaryObject,
    relatedObjects,
    shortMessage: canonical,
    fullDescription: canonical,
    createdAt: event.occurredAt,
    createdBy: event.actorName,
    status: 'UNREAD',
    readAt: null,
    readBy: null,
    readReceipts: [],
    recipientRoleIds: rule.recipientRoleIds,
    email: emailPayload({ rule, subject, fullDescription: canonical, primaryObject, now }),
    ...(primaryObject.routePath ? { deepLinkRoute: primaryObject.routePath } : {}),
    schemaVersion: NOTIFICATIONS_ALERTS_SCHEMA_VERSION,
  }
}

function daysAgo(value: string | null | undefined, now = new Date()): number {
  if (!value) return 0
  const parsed = new Date(value)
  if (Number.isNaN(parsed.valueOf())) return 0
  return Math.max(0, Math.floor((now.valueOf() - parsed.valueOf()) / 86_400_000))
}

function nextReminderAt(createdAt: string, frequencyDays: number | null | undefined): string | null {
  if (!frequencyDays) return null
  const parsed = new Date(createdAt)
  if (Number.isNaN(parsed.valueOf())) return null
  parsed.setUTCDate(parsed.getUTCDate() + frequencyDays)
  return parsed.toISOString()
}

interface AlertCandidate {
  eventKey: string
  conditionKey: string
  primaryObject: NotificationAlertObjectRef
  relatedObjects: NotificationAlertObjectRef[]
  shortMessage: string
  fullDescription: string
  contextSections?: Array<{ heading: string; lines: string[] }>
}

function projectAlertCandidates(state: NotificationAlertState, now: Date): AlertCandidate[] {
  return state.projects.flatMap((project) => {
    if (project.mainType !== 'POC' || project.progressStatus !== 'OPEN' || !project.pocEndDate || new Date(project.pocEndDate) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())) return []
    const overdueDays = daysAgo(project.pocEndDate, now)
    const projectName = text(project.opportunityName) || project.pid
    const endUser = text(project.accountName) || '-'
    const message = `${project.mainType} - ${project.subType}: "${project.pid} - ${projectName}"; End User - "${endUser}"; overdue by ${overdueDays} days.`
    const primaryObject = objectRef({
      objectType: 'Project',
      id: project.id,
      businessId: project.pid,
      displayLabel: `Project ${project.pid}`,
      snapshot: { pid: project.pid, mainType: project.mainType, subType: project.subType, pocEndDate: project.pocEndDate },
    })
    return [{
      eventKey: 'POC_ENDED',
      conditionKey: `POC_ENDED:${project.id}`,
      primaryObject,
      relatedObjects: [],
      shortMessage: message,
      fullDescription: message,
    }]
  })
}

function systemAlertCandidates(state: NotificationAlertState): AlertCandidate[] {
  return state.systems.flatMap((system) => {
    if (system.source !== 'Reused Internal Systems' || system.purpose !== REUSED_INTERNAL_PURPOSE_OBSOLETE || system.operationalStatus === SYSTEM_OPERATIONAL_STATUS_DELETED) return []
    const sid = systemBusinessId(system)
    const primaryObject = objectRef({
      objectType: 'System',
      id: system.id,
      businessId: sid,
      displayLabel: `RIS ${sid}`,
      snapshot: { sid, purpose: system.purpose, operationalStatus: system.operationalStatus, hostingContext: systemContext(system) },
    })
    return [{
      eventKey: 'RIS_OBSOLETE',
      conditionKey: `RIS_OBSOLETE:${system.id}`,
      primaryObject,
      relatedObjects: [],
      shortMessage: `RIS ${sid} is marked Obsolete and requires physical removal. After physical removal, change its Operational Status to Deleted.`,
      fullDescription: `RIS ${sid} is marked Obsolete and requires physical removal. After physical removal, change its Operational Status to Deleted. ${systemContext(system)}.`,
    }]
  })
}

function tenantRef(tenant: Tenant): NotificationAlertObjectRef {
  return objectRef({
    objectType: 'Tenant',
    id: tenant.id,
    businessId: tenant.tid,
    displayLabel: `Tenant ${tenant.tid}`,
    snapshot: {
      tid: tenant.tid,
      tenantType: tenant.tenantType,
      systemId: tenant.hostedSystemId || tenant.systemId,
      pid: tenant.deliveryPid,
      operationalStatus: tenant.operationalStatus,
      warrantyStatus: tenantDerivedWarrantyContractStatus(tenant).label,
    },
  })
}

function warrantyRef(tenant: Tenant, warranty: TenantWarranty): NotificationAlertObjectRef {
  return objectRef({
    objectType: 'Warranty',
    id: warranty.id,
    businessId: warranty.warrantyId,
    displayLabel: `Warranty ${warranty.warrantyId}`,
    routePath: routeForObject('Tenant', tenant.tid),
    snapshot: {
      warrantyId: warranty.warrantyId,
      tid: tenant.tid,
      startDate: warranty.startDate,
      endDate: warranty.endDate,
      warrantyStatus: warranty.warrantyStatus,
    },
  })
}

function tenantWarrantyTemplateMessage(input: {
  state: NotificationAlertState
  tenant: Tenant
  warranty?: TenantWarranty | null
  statusText: string
  actorName?: string
  extra?: string
}): string {
  const system = input.state.systems.find((candidate) => candidate.id === (input.tenant.hostedSystemId || input.tenant.systemId))
    ?? input.state.productionSystemInventory.find((candidate) => candidate.id === (input.tenant.hostedSystemId || input.tenant.systemId))
    ?? input.state.reusedInternalSystems.find((candidate) => candidate.id === (input.tenant.hostedSystemId || input.tenant.systemId))
  const project = input.tenant.deliveryPid ? input.state.projects.find((candidate) => candidate.pid === input.tenant.deliveryPid) : undefined
  const warrantyPrefix = input.warranty ? `Warranty ${input.warranty.warrantyId} status of tenant "${input.tenant.tid}"` : `Warranty status of tenant "${input.tenant.tid}"`
  const period = input.warranty ? ` Current warranty period - start date: "${input.warranty.startDate || '-'}" - warranty end date: "${input.warranty.endDate || '-'}".` : ''
  return `${warrantyPrefix}: ${input.statusText}, hosted in system "${system ? systemBusinessId(system) : input.tenant.hostedSystemId || input.tenant.systemId || '-'}" ${cloudSystemParts(system).join('; ')}; Product type - "${text(input.tenant.productType) || text(system?.productType) || '-'}"; as part of "${project ? `${project.mainType} - ${project.subType}` : '-'} - ${project?.pid ?? input.tenant.deliveryPid ?? '-'}" project "${project?.pid ?? input.tenant.deliveryPid ?? '-'}" according to tenant requirement "${text(input.tenant.sourceRequirementId) || '-'}" by "${input.actorName || 'System'}".${input.extra ? ` ${input.extra}` : ''}${period}`.trim()
}

function tenantWarrantyAlertCandidates(state: NotificationAlertState, now: Date): AlertCandidate[] {
  return state.tenants.flatMap((tenant) => {
    if (tenant.tenantType !== 'CUSTOMER') return []
    const candidates: AlertCandidate[] = []
    const header = tenantDerivedWarrantyContractStatus(tenant)
    const primaryObject = tenantRef(tenant)
    if (header.status === 'NOT_SET_YET' && isTenantOperationallyVisible(tenant)) {
      const message = tenantWarrantyTemplateMessage({ state, tenant, statusText: 'warranty is NOT SET YET' })
      candidates.push({
        eventKey: 'TENANT_WARRANTY_NOT_SET_YET',
        conditionKey: `TENANT_WARRANTY_NOT_SET_YET:${tenant.id}`,
        primaryObject,
        relatedObjects: [],
        shortMessage: message,
        fullDescription: message,
        contextSections: [
          { heading: 'Tenant', lines: [`TID: ${tenant.tid}`] },
          { heading: 'Warranty', lines: ['Status: Not Set Yet'] },
        ],
      })
    }
    warrantyCollectionReadModel(tenant.warranties ?? [], tenant.tid).forEach((row) => {
      if (row.generatedStatus !== 'PENDING' && row.generatedStatus !== 'EXPIRED') return
      const warranty = row.warranty
      const days = daysAgo(warranty.endDate, now)
      const message = row.generatedStatus === 'PENDING'
        ? tenantWarrantyTemplateMessage({ state, tenant, warranty, statusText: `warranty is PENDING RENEWAL and expected to be renewed within ${days} days` })
        : tenantWarrantyTemplateMessage({ state, tenant, warranty, statusText: `warranty is EXPIRED ${days} days ago` })
      candidates.push({
        eventKey: row.generatedStatus === 'PENDING' ? 'TENANT_WARRANTY_RENEWAL_PENDING' : 'TENANT_WARRANTY_EXPIRED',
        conditionKey: `${row.generatedStatus === 'PENDING' ? 'TENANT_WARRANTY_RENEWAL_PENDING' : 'TENANT_WARRANTY_EXPIRED'}:${tenant.id}:${warranty.id}`,
        primaryObject,
        relatedObjects: [warrantyRef(tenant, warranty)],
        shortMessage: message,
        fullDescription: message,
        contextSections: [
          { heading: 'Tenant', lines: [`TID: ${tenant.tid}`] },
          {
            heading: 'Warranty',
            lines: [
              `Warranty ID: ${warranty.warrantyId}`,
              `Period: ${warranty.startDate || '-'} - ${warranty.endDate || '-'}`,
              `Status: ${row.generatedStatus === 'PENDING' ? 'Pending' : 'Expired'}`,
            ],
          },
        ],
      })
    })
    if (tenant.operationalStatus === 'Deleted' && header.status === 'UNDER_CONTRACT') {
      const system = state.systems.find((candidate) => candidate.id === (tenant.hostedSystemId || tenant.systemId))
      candidates.push({
        eventKey: 'SYSTEM_DELETED_TENANT_UNDER_CONTRACT',
        conditionKey: `SYSTEM_DELETED_TENANT_UNDER_CONTRACT:${tenant.id}`,
        primaryObject,
        relatedObjects: system ? [objectRef({ objectType: 'System', id: system.id, businessId: systemBusinessId(system), displayLabel: `System ${systemBusinessId(system)}` })] : [],
        shortMessage: `Tenant ${tenant.tid} was deleted following physical removal of System ${system ? systemBusinessId(system) : tenant.hostedSystemId || tenant.systemId}, but its Warranty Status is still Under Contract. Review the warranty and update it to Out of Contract.`,
        fullDescription: `Tenant ${tenant.tid} was deleted following physical removal of System ${system ? systemBusinessId(system) : tenant.hostedSystemId || tenant.systemId}, but its Warranty Status is still Under Contract.`,
        contextSections: [
          { heading: 'Tenant', lines: [`TID: ${tenant.tid}`] },
          { heading: 'Warranty', lines: ['Status: Under Contract'] },
          { heading: 'Context', lines: [system ? `System: ${systemBusinessId(system)}` : ''] },
        ],
      })
    }
    return candidates
  })
}

function infrastructureRef(item: InfrastructureItem): NotificationAlertObjectRef {
  return objectRef({
    objectType: 'Infrastructure Item',
    id: item.id,
    businessId: item.infrastructureId,
    displayLabel: `Infrastructure Item ${item.infrastructureId}`,
    snapshot: {
      infrastructureId: item.infrastructureId,
      identifier: item.identifier,
      categoryRefId: item.categoryRefId,
      typeRefId: item.typeRefId,
      manufacturerRefId: item.manufacturerRefId,
      model: item.model,
      linkedSystemIds: item.linkedSystemIds,
      operationalStatus: item.operationalStatus,
      locationAddress: item.locationAddress,
    },
  })
}

function missingInfrastructureFields(item: InfrastructureItem): string[] {
  const missing: string[] = []
  if (!text(item.locationAddress)) missing.push('Geographical / Location Address')
  if (!text(item.warrantyContact?.name)) missing.push('Point of Contact Full Name')
  if (!text(item.warrantyContact?.address)) missing.push('Point of Contact Address')
  if (!text(item.warrantyContact?.phone)) missing.push('Point of Contact Phone Number')
  return missing
}

function infrastructureAlertTemplate(item: InfrastructureItem, conditionText: string, actorName = 'System'): string {
  return `${text(item.categoryRefId) || '-'} infrastructure item ${item.infrastructureId} of type ${text(item.typeRefId) || '-'} was created by ${actorName} ${conditionText}.`
}

function infrastructureAlertCandidates(state: NotificationAlertState, now: Date): AlertCandidate[] {
  return state.infrastructureItems.flatMap((item) => {
    const candidates: AlertCandidate[] = []
    const primaryObject = infrastructureRef(item)
    const warrantyStatus = infrastructureWarrantyStatusFromCollection(item)
    const currentWarranty = currentInfrastructureWarranty(item)
    if (warrantyStatus === 'NOT_SET') {
      const message = `Infrastructure Item Warranty status: ${text(item.categoryRefId) || '-'} infrastructure item ${item.infrastructureId} of type ${text(item.typeRefId) || '-'} warranty has NOT SET YET.`
      candidates.push({
        eventKey: 'INFRASTRUCTURE_WARRANTY_NOT_SET_YET',
        conditionKey: `INFRASTRUCTURE_WARRANTY_NOT_SET_YET:${item.id}`,
        primaryObject,
        relatedObjects: [],
        shortMessage: message,
        fullDescription: message,
      })
    }
    if (currentWarranty && (warrantyStatus === 'PENDING' || warrantyStatus === 'EXPIRED')) {
      const days = daysAgo(currentWarranty.endDate, now)
      const message = warrantyStatus === 'PENDING'
        ? `Infrastructure Item Warranty status: ${text(item.categoryRefId) || '-'} infrastructure item ${item.infrastructureId} of type ${text(item.typeRefId) || '-'} warranty is PENDING RENEWAL and expected to be renewed within ${days} days. Current warranty period - start date: "${currentWarranty.startDate || '-'}" - warranty end date: "${currentWarranty.endDate || '-'}".`
        : `Infrastructure Item Warranty status: ${text(item.categoryRefId) || '-'} infrastructure item ${item.infrastructureId} of type ${text(item.typeRefId) || '-'} warranty is EXPIRED ${days} days ago. Current warranty period - start date: "${currentWarranty.startDate || '-'}" - warranty end date: "${currentWarranty.endDate || '-'}".`
      candidates.push({
        eventKey: warrantyStatus === 'PENDING' ? 'INFRASTRUCTURE_WARRANTY_PENDING' : 'INFRASTRUCTURE_WARRANTY_EXPIRED',
        conditionKey: `${warrantyStatus === 'PENDING' ? 'INFRASTRUCTURE_WARRANTY_PENDING' : 'INFRASTRUCTURE_WARRANTY_EXPIRED'}:${item.id}:${currentWarranty.id}`,
        primaryObject,
        relatedObjects: [objectRef({ objectType: 'Warranty', id: currentWarranty.id, businessId: currentWarranty.warrantyId, displayLabel: `Warranty ${currentWarranty.warrantyId}` })],
        shortMessage: message,
        fullDescription: message,
      })
    }
    if (item.operationalStatus === 'Obsolete') {
      const message = infrastructureAlertTemplate(item, 'was set as OBSOLETE by System')
      candidates.push({
        eventKey: 'INFRASTRUCTURE_ITEM_OBSOLETE',
        conditionKey: `INFRASTRUCTURE_ITEM_OBSOLETE:${item.id}`,
        primaryObject,
        relatedObjects: [],
        shortMessage: message,
        fullDescription: message,
      })
    }
    const missing = missingInfrastructureFields(item)
    if (missing.length > 0) {
      const message = infrastructureAlertTemplate(item, `missing ${missing.join(', ')}`)
      candidates.push({
        eventKey: 'INFRASTRUCTURE_DATA_COMPLETENESS',
        conditionKey: `INFRASTRUCTURE_DATA_COMPLETENESS:${item.id}`,
        primaryObject,
        relatedObjects: [],
        shortMessage: message,
        fullDescription: message,
      })
    }
    return candidates
  })
}

function alertIdForCandidate(candidate: AlertCandidate): string {
  return `alert-${candidate.conditionKey.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

function alertFromCandidate(candidate: AlertCandidate, rule: NotificationRuleDefinition, now: string): AlertRecord {
  const fullDescription = canonicalFullMessage({
    title: eventTitle(candidate.eventKey, candidate.shortMessage),
    summary: candidate.shortMessage,
    primaryObject: candidate.primaryObject,
    sections: [],
  })
  return {
    id: alertIdForCandidate(candidate),
    type: 'ALERT',
    severity: rule.severity,
    category: rule.category,
    eventKey: candidate.eventKey,
    ruleId: rule.id,
    conditionKey: candidate.conditionKey,
    primaryObject: candidate.primaryObject,
    relatedObjects: candidate.relatedObjects,
    shortMessage: candidate.shortMessage,
    fullDescription,
    createdAt: now,
    createdBy: 'System',
    status: 'OPEN',
    resolvedAt: null,
    resolvedBy: null,
    resolutionSummary: null,
    recipientRoleIds: rule.recipientRoleIds,
    email: emailPayload({ rule, subject: candidate.shortMessage, fullDescription, primaryObject: candidate.primaryObject, now }),
    reminderFrequencyDays: rule.reminderFrequencyDays ?? null,
    lastReminderAt: null,
    nextReminderEligibleAt: nextReminderAt(now, rule.reminderFrequencyDays),
    ...(candidate.primaryObject.routePath ? { deepLinkRoute: candidate.primaryObject.routePath } : {}),
    schemaVersion: NOTIFICATIONS_ALERTS_SCHEMA_VERSION,
  }
}

function allAlertCandidates(state: NotificationAlertState, now: Date): AlertCandidate[] {
  return [
    ...projectAlertCandidates(state, now),
    ...systemAlertCandidates(state),
    ...tenantWarrantyAlertCandidates(state, now),
    ...infrastructureAlertCandidates(state, now),
  ]
}

export function reconcileNotificationsAndAlerts<T extends NotificationAlertState>(state: T, now = DEFAULT_NOTIFICATIONS_ALERTS_TIMESTAMP): T {
  const rules = normalizeNotificationRules(state.notificationRules, state.roles, now)
  const notificationRecords = normalizeNotificationRecords(state.notificationRecords)
  const alertRecords = normalizeAlertRecords(state.alertRecords)
  const refreshedNotificationRecords = notificationRecords.map((record) => {
    if (!record.sourceActivityEventId) return record
    const event = state.activityEvents.find((candidate) => candidate.id === record.sourceActivityEventId)
    if (!event) return record
    const rule = ruleForEvent(rules, record.eventKey, 'NOTIFICATION')
    if (!rule) return record
    const refreshed = notificationFromActivity(event, rule, now, state)
    return {
      ...record,
      severity: refreshed.severity,
      category: refreshed.category,
      primaryObject: refreshed.primaryObject,
      relatedObjects: refreshed.relatedObjects,
      shortMessage: refreshed.shortMessage,
      fullDescription: refreshed.fullDescription,
      recipientRoleIds: refreshed.recipientRoleIds,
      email: {
        ...refreshed.email,
        generatedAt: record.email.generatedAt || refreshed.email.generatedAt,
      },
      deepLinkRoute: refreshed.deepLinkRoute,
      schemaVersion: NOTIFICATIONS_ALERTS_SCHEMA_VERSION,
    }
  })
  const knownActivityIds = new Set(refreshedNotificationRecords.map((record) => record.sourceActivityEventId).filter(Boolean))
  const generatedNotifications = state.activityEvents.flatMap((event) => {
    if (knownActivityIds.has(event.id)) return []
    const eventKey = eventKeyForActivity(event)
    if (!eventKey) return []
    const rule = ruleForEvent(rules, eventKey, 'NOTIFICATION')
    return rule ? [notificationFromActivity(event, rule, now, state)] : []
  })

  const candidates = allAlertCandidates({ ...state, notificationRules: rules, notificationRecords, alertRecords }, new Date(now))
  const openByCondition = new Map(alertRecords.filter((alert) => alert.status === 'OPEN').map((alert) => [alert.conditionKey, alert]))
  const candidateByCondition = new Map(candidates.map((candidate) => [candidate.conditionKey, candidate]))
  const reconciledAlerts = alertRecords.map((alert) => {
    const candidate = candidateByCondition.get(alert.conditionKey)
    if (alert.status === 'OPEN' && !candidate) {
      return {
        ...alert,
        status: 'RESOLVED' as const,
        resolvedAt: now,
        resolvedBy: 'System',
        resolutionSummary: 'The authoritative business condition no longer exists.',
      }
    }
    if (alert.status === 'OPEN' && candidate) {
      const rule = ruleForEvent(rules, candidate.eventKey, 'ALERT')
      const fullDescription = rule
        ? canonicalFullMessage({
            title: eventTitle(candidate.eventKey, candidate.shortMessage),
            summary: candidate.shortMessage,
            primaryObject: candidate.primaryObject,
            sections: [],
          })
        : candidate.fullDescription
      return {
        ...alert,
        shortMessage: candidate.shortMessage,
        fullDescription,
        primaryObject: candidate.primaryObject,
        relatedObjects: candidate.relatedObjects,
        email: {
          ...alert.email,
          subject: candidate.shortMessage,
          fullDescription,
          deepLinkLabel: `Open ${candidate.primaryObject.objectType} ${candidate.primaryObject.businessId}`,
          ...(candidate.primaryObject.routePath ? { deepLinkRoute: candidate.primaryObject.routePath } : {}),
        },
      }
    }
    return alert
  })
  const newAlerts = candidates.flatMap((candidate) => {
    if (openByCondition.has(candidate.conditionKey)) return []
    const hadResolvedOccurrence = alertRecords.some((alert) => alert.conditionKey === candidate.conditionKey && alert.status === 'RESOLVED')
    const rule = ruleForEvent(rules, candidate.eventKey, 'ALERT')
    return rule ? [alertFromCandidate(candidate, rule, hadResolvedOccurrence ? now : now)] : []
  })

  return {
    ...state,
    notificationRules: rules,
    notificationRecords: [...generatedNotifications, ...refreshedNotificationRecords],
    alertRecords: [...newAlerts, ...reconciledAlerts],
  }
}
