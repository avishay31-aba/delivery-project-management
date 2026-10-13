import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 Notifications & Alerts verification failed: ${message}`)
    process.exitCode = 1
  }
}

const seedTypes = read('src/data/seed.types.ts')
const metadata = read('src/domain/notifications-alerts/metadata.ts')
const service = read('src/domain/notifications-alerts/service.ts')
const appStore = read('src/store/useAppStore.ts')
const migration = read('src/platform/persistence/app-state-migration.ts')
const repository = read('src/platform/persistence/app-state-repository.ts')
const navigation = read('src/config/navigation.ts')
const routes = read('src/routes/index.tsx')
const page = read('src/pages/notifications/NotificationsAlertsPage.tsx')
const remindersPage = read('src/pages/reminders/RemindersPage.tsx')
const remindersService = read('src/domain/reminders/service.ts')
const infrastructurePage = read('src/pages/infrastructure/InfrastructureListPage.tsx')
const tableCalendarToggle = read('src/components/dashboard/TableCalendarViewToggle.tsx')
const dashboard = read('src/components/dashboard/DataDashboard.tsx')
const businessObjectLink = read('src/components/ui/BusinessObjectLink.tsx')
const linkId = read('src/components/ui/LinkId.tsx')
const dashboardTypes = read('src/domain/dashboard-view/types.ts')
const dashboardNavigation = read('src/domain/dashboard-view/navigation.ts')
const architecture = read('docs/architecture-handbook.md')

const masterRows = [
  ['PROJECT_CREATED', 'NOTIFICATION', 'INFO', 'PROJECT', ['GM', 'VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['PROJECT_TENANT_REQUIREMENTS_UPDATED', 'NOTIFICATION', 'INFO', 'PROJECT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['PROJECT_CANCELLED', 'NOTIFICATION', 'WARNING', 'PROJECT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['POC_ENDED', 'ALERT', 'WARNING', 'PROJECT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['POC_END_DATE_UPDATED', 'NOTIFICATION', 'INFO', 'PROJECT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_CREATED', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['SYSTEM_ALLOCATED', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Product Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_DEALLOCATED', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Product Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['PHYSICAL_SYSTEM_PROVISIONING_REQUEST', 'REQUEST', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['SYSTEM_READY_PROVISIONING_COMPLETED', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['RIS_OCCUPIED', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Engineer']],
  ['RIS_AVAILABLE', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Engineer']],
  ['SYSTEM_DELETED', 'NOTIFICATION', 'WARNING', 'SYSTEM', ['GM', 'VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Financial Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_TURNED_OFF', 'NOTIFICATION', 'WARNING', 'SYSTEM', ['GM', 'VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Financial Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_ACCESS_BLOCKED', 'NOTIFICATION', 'WARNING', 'SYSTEM', ['GM', 'VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Financial Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_SERVICE_BLOCKED', 'NOTIFICATION', 'WARNING', 'SYSTEM', ['GM', 'VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Financial Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_ON', 'NOTIFICATION', 'INFO', 'SYSTEM', ['GM', 'VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate', 'Financial Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['SYSTEM_UPGRADED', 'NOTIFICATION', 'INFO', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Product Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['RIS_OBSOLETE', 'ALERT', 'WARNING', 'SYSTEM', ['VP Project', 'Delivery Manager', 'Support Manager', 'Delivery Specialist', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['TENANT_CREATED', 'NOTIFICATION', 'INFO', 'TENANT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['TENANT_CANCELLED', 'NOTIFICATION', 'WARNING', 'TENANT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['TENANT_CONFIGURATION_CHANGED', 'NOTIFICATION', 'INFO', 'TENANT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist']],
  ['TENANT_DELETED', 'NOTIFICATION', 'WARNING', 'TENANT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_ACCESS_BLOCKED_PASSWORD_RESET', 'NOTIFICATION', 'WARNING', 'TENANT', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Support Manager', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_WARRANTY_NOT_SET_YET', 'ALERT', 'WARNING', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_WARRANTY_RENEWAL_PENDING', 'ALERT', 'WARNING', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_WARRANTY_EXPIRED', 'ALERT', 'WARNING', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_WARRANTY_RENEWED', 'NOTIFICATION', 'INFO', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_WARRANTY_NOT_RENEWED', 'NOTIFICATION', 'INFO', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['TENANT_WARRANTY_CREATED_UPDATED', 'NOTIFICATION', 'INFO', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['SYSTEM_DELETED_TENANT_UNDER_CONTRACT', 'ALERT', 'HIGH', 'TENANT_WARRANTY', ['VP Project', 'Delivery Manager', 'Delivery Specialist', 'Regional Manager', 'Sales Manager', 'Sales Operation', 'Customer Success Manager', 'Customer Success Specialist', 'Financial Manager']],
  ['INFRASTRUCTURE_ITEM_CREATED', 'NOTIFICATION', 'INFO', 'INFRASTRUCTURE_ITEM', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_ITEM_DELETED', 'NOTIFICATION', 'WARNING', 'INFRASTRUCTURE_ITEM', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_ITEM_CANCELLED', 'NOTIFICATION', 'WARNING', 'INFRASTRUCTURE_ITEM', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_WARRANTY_NOT_SET_YET', 'ALERT', 'WARNING', 'INFRASTRUCTURE_WARRANTY', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_WARRANTY_PENDING', 'ALERT', 'WARNING', 'INFRASTRUCTURE_WARRANTY', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_WARRANTY_EXPIRED', 'ALERT', 'WARNING', 'INFRASTRUCTURE_WARRANTY', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_WARRANTY_RENEWED', 'NOTIFICATION', 'INFO', 'INFRASTRUCTURE_WARRANTY', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_WARRANTY_NOT_RENEWED', 'NOTIFICATION', 'INFO', 'INFRASTRUCTURE_WARRANTY', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_ITEM_OBSOLETE', 'ALERT', 'WARNING', 'INFRASTRUCTURE_ITEM', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
  ['INFRASTRUCTURE_DATA_COMPLETENESS', 'ALERT', 'WARNING', 'INFRASTRUCTURE_ITEM', ['VP Project', 'VP Operational', 'Delivery Manager', 'Support Engineer', 'Professional Services Manager', 'Professional Services Engineer', 'Procurement Manager', 'Procurement Associate']],
]

function seedFor(eventKey) {
  const escaped = eventKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = metadata.match(new RegExp(`\\{[^\\n]*eventKey: '${escaped}'[^\\n]*\\}`))
  return match?.[0] ?? ''
}

assert(seedTypes.includes('export interface NotificationRuleDefinition'), 'Notification rule definitions must be persisted.')
assert(seedTypes.includes('export interface NotificationRecord'), 'Notification records must be persisted.')
assert(seedTypes.includes('export interface AlertRecord'), 'Alert records must be persisted.')
assert(seedTypes.includes("export type NotificationStatus = 'UNREAD' | 'READ'"), 'Notifications must use Unread -> Read lifecycle.')
assert(seedTypes.includes("export type AlertStatus = 'OPEN' | 'RESOLVED'"), 'Alerts must use Open -> Resolved lifecycle.')
assert(seedTypes.includes('NotificationEmailPayload'), 'Records must include email delivery payload contract.')
assert(seedTypes.includes('NotificationReadReceipt') && seedTypes.includes('readReceipts?: NotificationReadReceipt[]'), 'Notification read state must be modeled as per-user read receipts.')
assert(seedTypes.includes('export interface ReminderExecutionRecord') && seedTypes.includes('sourceDueDateAtExecution'), 'Reminder execution state must be persisted against stable source identity with due-date execution history.')
assert(seedTypes.includes('externalEventId?: string | null') && seedTypes.includes('externalSyncState?: ReminderExecutionSyncState | null'), 'Reminder model must leave room for future external-calendar sync metadata without implementing Outlook.')
assert(seedTypes.includes('conditionKey: string'), 'Alerts must include deterministic condition identity for dedupe.')
assert(seedTypes.includes('notificationRules: NotificationRuleDefinition[]') && seedTypes.includes('notificationRecords: NotificationRecord[]') && seedTypes.includes('alertRecords: AlertRecord[]') && seedTypes.includes('reminderExecutions: ReminderExecutionRecord[]'), 'AppDataState must include notification/alert and reminder execution collections.')

masterRows.forEach(([eventKey, type, severity, category, recipients]) => {
  const seed = seedFor(eventKey)
  assert(seed, `Master rule catalog must include ${eventKey}.`)
  assert(seed.includes(`type: '${type}'`), `${eventKey} must be classified as ${type}.`)
  assert(seed.includes(`severity: '${severity}'`), `${eventKey} must use severity ${severity}.`)
  assert(seed.includes(`category: '${category}'`), `${eventKey} must use category ${category}.`)
  assert(seed.includes('emailEnabled: true'), `${eventKey} must have Email enabled.`)
  recipients.forEach((roleName) => {
    assert(seed.includes(`'${roleName}'`), `${eventKey} must include recipient role ${roleName}.`)
  })
})
assert(seedTypes.includes("'REQUEST'"), 'Rule type model must retain reserved Request rows for provisioning without implementing the workflow.')
assert(metadata.includes('NOTIFICATIONS_ALERTS_SCHEMA_VERSION = 2'), 'Rule catalog schema must migrate older shortened recipient lists to the master table.')
assert(metadata.includes('recipientRoleNames') && metadata.includes('recipientRoleIds'), 'Rule metadata must define recipient roles and normalize them to role IDs.')
assert(metadata.includes('WEEKLY_REMINDER_DAYS'), 'Weekly reminder frequency must be represented as metadata, not duplicate alert creation.')

assert(service.includes('export function reconcileNotificationsAndAlerts'), 'Notifications & Alerts must have a centralized reconciliation service.')
assert(service.includes('knownActivityIds') && service.includes('sourceActivityEventId'), 'Activity-derived notifications must not duplicate for the same source event.')
assert(service.includes('openByCondition') && service.includes('conditionKey'), 'Open alerts must dedupe by deterministic condition key.')
assert(service.includes("status: 'RESOLVED'") && service.includes('The authoritative business condition no longer exists.'), 'Alerts must resolve when conditions clear.')
assert(service.includes('function canonicalFullMessage'), 'Notifications and alerts must use one canonical full message for ERP details and email.')
assert(service.includes('return (text(input.summary) || text(input.title)).trim()'), 'Canonical full message must be only the concise Text-to-display message.')
assert(service.includes('return (text(input.summary) || text(input.title)).trim()'), 'Canonical full message must contain only the concise Text-to-display message.')
assert(!service.includes("'LINK',"), 'Canonical full message must not append a LINK block; Details renders Open Object separately.')
assert(!service.includes("heading: 'Required Action'") && !service.includes('Required action:'), 'Canonical Full Message generation must not include generated Required Action content.')
assert(!service.includes('EVENT -') && !service.includes('LINK -') && !service.includes('in Delivery ERP'), 'Canonical and email link labels must not expose redundant ERP wording or old event/link prefixes.')
assert(!service.includes('Snapshot context is retained') && !service.includes('Primary Object:') && !service.includes('Related Objects:'), 'Canonical full message must not expose technical snapshot/primary/related-object terminology.')
assert(!service.includes('Product Manager Type') && !service.includes('Date/Time:'), 'Full message business context must use ERP terminology and must not expose raw timestamp labels.')
assert(service.includes('End User - "') && service.includes('overdue by ${overdueDays} days.'), 'POC overdue Full Message must follow the concise Text-to-display template.')
assert(!service.includes("summary: event.details || event.summary"), 'Activity-derived Full Message must match the dashboard message, not an expanded details body.')
assert(service.includes('fullMessageFromActivityTemplate') && service.includes('by "${actor}"') && service.includes('by "${input.actorName || \'-\'}"'), 'Activity-derived Full Messages must preserve Text-to-display username placeholders.')
assert(service.includes('businessSectionHeading') && service.includes('notificationReadStatusForUser'), 'Message sections and notification read state must be event/business-specific helpers, not fixed technical templates.')
assert(service.includes("eventKey: 'POC_ENDED'") && service.includes("project.progressStatus !== 'OPEN'"), 'POC ended alert must follow current POC/Open lifecycle rule.')
assert(service.includes("eventKey: 'RIS_OBSOLETE'") && service.includes('SYSTEM_OPERATIONAL_STATUS_DELETED'), 'RIS obsolete alert must resolve when operational status is Deleted.')
assert(service.includes('tenantDerivedWarrantyContractStatus') && service.includes("eventKey: 'TENANT_WARRANTY_NOT_SET_YET'"), 'Tenant warranty alerts must use authoritative Tenant warranty derivation.')
assert(service.includes("row.generatedStatus === 'PENDING'") && service.includes("row.generatedStatus !== 'PENDING' && row.generatedStatus !== 'EXPIRED'"), 'Warranty Pending and Expired must be Alerts from authoritative warranty-record status.')
assert(service.includes("eventKey: 'SYSTEM_DELETED_TENANT_UNDER_CONTRACT'") && service.includes("header.status === 'UNDER_CONTRACT'"), 'Deleted Tenant + Under Contract high alert must use derived Tenant warranty status.')
assert(service.includes('infrastructureWarrantyStatusFromCollection') && service.includes("eventKey: 'INFRASTRUCTURE_DATA_COMPLETENESS'"), 'Infrastructure warranty and completeness alerts must use infrastructure domain sources.')
assert(service.includes('missing.join') && service.includes('conditionKey: `INFRASTRUCTURE_DATA_COMPLETENESS:${item.id}`'), 'Infrastructure Data Completeness must use one dynamic alert per Infrastructure Item.')
assert(service.includes('emailPayload') && service.includes('Open ${input.primaryObject.objectType} ${input.primaryObject.businessId}'), 'Email payloads must be generated as self-contained delivery contracts with concise deep-link labels.')
assert(service.includes('fullDescription: input.fullDescription'), 'Email payload must use the canonical full message directly, not reconstruct a separate business body.')
assert(!service.includes('`${input.fullDescription}\\n\\nOpen'), 'Email payload must not append a separate independently generated message body.')
assert(service.includes('fullDescription: canonical'), 'Event notifications must persist canonical full message at creation time.')
assert(service.includes("routeForObject('Tenant', tenant.tid)"), 'Warranty alerts must deep-link to the navigable Tenant when Warranty has no standalone route.')
assert(service.includes('primaryActivityRefForRule') && service.includes("rule.category === 'PROJECT'") && service.includes("rule.category === 'SYSTEM'") && service.includes("rule.category === 'TENANT_WARRANTY'"), 'Notification primary object selection must follow event/category subject, not the first snapshot object.')
assert(service.includes("rule.eventKey === 'SYSTEM_ALLOCATED' || rule.eventKey === 'SYSTEM_DEALLOCATED'"), 'System Allocated/Deallocated notifications must remain implemented while using concise canonical message text.')
assert(service.includes("rule.eventKey === 'SYSTEM_CREATED'") && service.includes('SID: ${ref.businessId}') && service.includes('MID: ${machineId}') && service.includes("Type: ${isReused ? 'Reused' : 'Production'}"), 'System Created context must include SID, optional MID, and Production/Reused type.')
assert(service.includes("eventKey: row.generatedStatus === 'PENDING' ? 'TENANT_WARRANTY_RENEWAL_PENDING' : 'TENANT_WARRANTY_EXPIRED'") && !service.includes('tenantContext(state, tenant)'), 'Tenant Warranty events must remain implemented without dumping generic tenant/system/project context.')

assert(migration.includes('reconcileNotificationsAndAlerts') && migration.includes('normalizeNotificationRules'), 'Migration/load must normalize and reconcile notification/alert data.')
assert(repository.includes("'notificationRules'") && repository.includes("'notificationRecords'") && repository.includes("'alertRecords'") && repository.includes("'reminderExecutions'"), 'Persistence compact delta must include notification/alert and reminder execution collections.')
assert(appStore.includes('markNotificationRead') && appStore.includes('readReceipts') && appStore.includes('CURRENT_USER_ID') && appStore.includes('reconcileNotificationsAndAlerts'), 'Store must mark notification read state per current user/recipient.')
assert(appStore.includes('executeReminder') && appStore.includes('restoreReminder') && appStore.includes('reminderExecutions') && appStore.includes('reminderExecutionIdForSource'), 'Store must persist Reminder execute/restore lifecycle by stable source key.')
assert(navigation.includes("label: 'Notifications & Alerts'") && navigation.includes("path: '/notifications-alerts'") && !navigation.includes("path: '/notifications-alerts/alerts'"), 'Notifications & Alerts must remain one Delivery Console workspace item.')
assert(navigation.includes("label: 'Reminders'") && navigation.includes("path: '/reminders'"), 'Reminders must be exposed as a separate Delivery Console module.')
assert(routes.includes("path: 'notifications-alerts/alerts'") && routes.includes("path: 'notifications-alerts/notifications'") && routes.includes('<NotificationsAlertsWorkspacePage />'), 'Alerts and Notifications routes must render the same workspace shell.')
assert(routes.includes("path: 'reminders'") && routes.includes('<RemindersPage />'), 'Reminders route must render the separate Reminders module.')
assert(!page.includes('setTab('), 'Alerts and Notifications must not use the old toggle as the primary dashboard switch.')
assert(page.includes('WorkspaceTabs tabs={NOTIFICATIONS_ALERTS_TABS}') && page.includes('export function NotificationsAlertsWorkspacePage'), 'Workspace must use the shared WorkspaceTabs pattern.')
assert(page.includes("const NOTIFICATIONS_ALERTS_TABS") && page.includes("label: 'Alerts'") && page.includes("label: 'Notifications'"), 'Notifications & Alerts must have exactly the two requested workspace tabs.')
assert(page.includes("dashboardScope=\"notificationAlerts\"") && page.includes("dashboardScope=\"notifications\""), 'Alerts and Notifications must keep separate dashboard saved-view scopes.')
assert(page.includes("useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN')"), 'Alerts dashboard must default to Open and support Open/Resolved/All.')
assert(page.includes("useState<'UNREAD' | 'READ' | 'ALL'>('UNREAD')"), 'Notifications dashboard must default to Unread and support Unread/Read/All.')
assert(page.includes('DetailsDialog') && page.includes('Full Message') && page.includes('PrimaryObjectActionLink'), 'Each alert/notification must expose a read-only Details view with the canonical full message and primary object action link.')
assert(page.includes('role="dialog"') && page.includes('aria-modal="false"') && page.includes('resize overflow-hidden') && page.includes('fixed left-1/2 top-1/2') && page.includes('-translate-x-1/2 -translate-y-1/2'), 'Details view must open centered while remaining modeless/resizable.')
assert(!page.includes('fixed inset-0 z-50 flex items-center justify-center bg-black/30') && !page.includes('bg-black/35'), 'Details view must not use a blocking modal backdrop.')
assert(page.includes("formatSemanticDateTimeValue(record.createdAt, 'datetime')") && page.includes('{timestamp}'), 'Details title line must show the localized Created/Detected timestamp at the right side.')
assert(page.includes('FULL_MESSAGE_SECTION_TITLES') && page.includes('underline decoration-sf-border underline-offset-4'), 'Full Message section titles must be underlined without underlining content.')
;['Type', 'Event', 'Category', 'Object', 'Severity', 'Status', 'Email Enabled', 'Reminder', 'Recipients'].forEach((label) => {
  assert(page.includes(`Field label="${label}"`), `Details header must include compact ${label} metadata.`)
})
assert(page.includes('label=\"Details\"') && page.includes('Eye'), 'Rows must expose a standard Details/View action.')
assert(page.includes('<ObjectRefLink refValue={record.primaryObject} newTab') && page.includes('<PrimaryObjectActionLink refValue={record.primaryObject}'), 'Details view must render primary business object links in a new tab using the shared read-only link behavior.')
assert(page.includes('ObjectLinkedText') && page.includes('matchingRef.businessId') && page.includes('newTab'), 'Business IDs rendered in Full Message context must be linked in a new tab when they match notification objects.')
assert((page.match(/Reconcile/g) ?? []).length === 1, 'Only the Alerts dashboard should expose the Reconcile control.')
assert(!page.includes('resolveAlert') && !page.includes('reopenAlert') && !page.includes('label=\"Resolve\"') && !page.includes('label=\"Reopen\"'), 'Alerts dashboard must not expose generic Resolve/Reopen row actions.')
assert(!page.includes('markNotificationUnread') && !page.includes('label=\"Mark Read\"') && !page.includes('label=\"Mark Unread\"'), 'Notifications dashboard must not expose separate Mark Read/Unread action icons.')
assert(page.includes('openNotificationDetails') && !page.includes('markNotificationRead(row.id)') && !page.includes('readAt: new Date().toISOString()'), 'Opening Notification Details must be view-only and must not mark the current user receipt as read.')
assert(page.includes("{ id: 'event', label: 'Event'") && page.indexOf("{ id: 'event', label: 'Event'") < page.indexOf("{ id: 'message', label: 'Message'"), 'Event must be the first business column before Message.')
assert(!page.includes("id: 'relatedObjects'"), 'Related Objects must not be a default dashboard column.')
assert(page.includes('function eventLabel') && !page.includes("getValue: (row) => row.eventKey"), 'Event column must show complete human-readable event names.')
assert(page.includes('<BusinessObjectLink') && page.includes('showDefaultRecordActions={false}'), 'Business object references must use shared read-only links and avoid implicit edit row actions.')
assert(businessObjectLink.includes('newTab') && linkId.includes("target={newTab ? '_blank' : undefined}") && linkId.includes("rel={newTab ? 'noreferrer' : undefined}"), 'BusinessObjectLink must support explicit new-tab links without changing default ERP link behavior.')
assert(dashboard.includes('showDefaultRecordActions'), 'DataDashboard must support custom action-only rows without default edit actions.')
assert(dashboardTypes.includes("'notificationAlerts'") && dashboardTypes.includes("'notifications'") && dashboardTypes.includes("'reminders'"), 'Dashboard saved-view scopes must include alerts, notifications and reminders.')
assert(dashboardNavigation.includes("case 'notificationAlerts'") && dashboardNavigation.includes("case 'notifications'"), 'Dashboard default View navigation must resolve notification primary objects when enabled.')
assert(architecture.includes('Notifications & Alerts are a centralized recipient-oriented capability') && architecture.includes('actual outbound email transport is deferred to the V2 backend'), 'Documentation must distinguish Activity Log from Notifications & Alerts and document V2 email transport deferral.')
assert(architecture.includes('Opening Notification Details is a view-only action') && architecture.includes('Reminders are a separate Delivery module') && architecture.includes('future Outlook integration'), 'Architecture Handbook must document view-only notification details and Outlook-ready Reminder architecture.')
assert(remindersService.includes('export function deriveReminderRows') && remindersService.includes('remarks ?? []') && remindersService.includes('projectWithDisplayedTaskPlan') && remindersService.includes('orderedProjectTasks(displayedProject)'), 'Reminders must derive retroactively from authorized Project Tasks and System/Tenant Remarks using the same displayed Project task plan as the Project form.')
assert(remindersService.includes("sourceType === 'PROJECT_TASK' && parentObjectType === 'PROJECT'") && remindersService.includes("sourceType === 'REMARK' && (parentObjectType === 'SYSTEM' || parentObjectType === 'TENANT')"), 'Reminder source eligibility must be limited to Project Tasks, System Remarks and Tenant Remarks.')
assert(!remindersService.includes('maintenanceTasks') && !remindersService.includes('PROJECT_MILESTONE') && !remindersService.includes('INFRASTRUCTURE_MAINTENANCE_TASK') && !remindersService.includes("parentObjectType: 'INFRASTRUCTURE_ITEM'"), 'Infrastructure Tasks/Remarks and Project Milestones must not generate Reminders.')
assert(remindersService.includes('sourceKey') && remindersService.includes('externalSyncState'), 'Reminder read model must use stable source keys and preserve external sync readiness fields.')
assert(remindersService.includes('/^\\d{4}-\\d{2}-\\d{2}$/') && remindersService.includes('Number.isNaN(parsed.valueOf())'), 'Reminder dates must come from valid canonical source due date/deadline fields, not display-shaped or synthetic values.')
assert(!remindersService.includes('retainedExecutedRows') && !remindersService.includes('Executed reminder source no longer has a current due date.'), 'Executed Reminders must not be retained as dashboard rows when the current authoritative source due date/deadline is gone.')
assert(remindersPage.includes("useState<ReminderStatus>('PENDING')") && remindersPage.includes("useState<TableCalendarViewMode>('table')"), 'Reminders must default to Pending table view.')
assert(remindersPage.includes('ReminderCalendar') && remindersPage.includes('DataDashboard'), 'Reminders must provide both table and calendar presentations from the same rows.')
assert(remindersPage.includes('TableCalendarViewToggle') && remindersPage.includes('contentModeControls={<TableCalendarViewToggle'), 'Reminders must use the shared Table/Calendar dashboard toggle.')
assert(infrastructurePage.includes('TableCalendarViewToggle') && infrastructurePage.includes('contentModeControls={') && infrastructurePage.includes('InfrastructureMaintenanceCalendar'), 'Infrastructure Maintenance Tasks must use the shared Table/Calendar dashboard toggle.')
assert(tableCalendarToggle.includes('Table2') && tableCalendarToggle.includes('CalendarDays') && tableCalendarToggle.includes('aria-pressed={active}') && tableCalendarToggle.includes("aria-label=\"Table or calendar view\""), 'Shared Table/Calendar toggle must own icons, labels and accessibility state.')
assert(!infrastructurePage.includes("aria-label=\"Table view\"") && !infrastructurePage.includes("aria-label=\"Calendar view\""), 'Infrastructure must not retain local Table/Calendar toggle buttons.')
assert(!remindersPage.includes("Table</button>") && !remindersPage.includes("Calendar</button>"), 'Reminders must not retain local textual Table/Calendar toggle buttons.')
assert(remindersPage.includes('dashboardScope=\"reminders\"') && remindersPage.includes('deriveReminderRows(state)'), 'Reminders dashboard must use the shared dashboard scope and centralized derived read model.')
assert(remindersPage.includes('label=\"Execute\"') && remindersPage.includes('label=\"Restore to Pending\"'), 'Reminders must expose Execute and Restore actions.')
assert(remindersPage.includes('bg-red-50') && remindersPage.includes('bg-yellow-50') && remindersPage.includes("status === 'EXECUTED'"), 'Pending Reminders must use overdue/due-soon row coloring while Executed rows avoid urgency coloring.')

if (!process.exitCode) {
  console.log('V1.3 Notifications & Alerts verification passed.')
}
