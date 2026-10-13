import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Eye, RotateCcw, X } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import { DataDashboard, DashboardActionButton, type DashboardColumn } from '@/components/dashboard'
import { PageHeader, WorkspaceDashboardContent, WorkspaceFrame, WorkspaceTabs } from '@/components/record'
import { AlertStatusIcon, BusinessObjectLink } from '@/components/ui'
import type { AlertRecord, NotificationAlertObjectRef, NotificationRecord } from '@/data/seed.types'
import type { BusinessObjectReference, BusinessObjectType } from '@/domain/business-reference'
import { formatSemanticDateTimeValue } from '@/domain/date-time-presentation'
import { notificationReadStatusForUser } from '@/domain/notifications-alerts'
import { useAppStore } from '@/store/useAppStore'

type DetailRecord = AlertRecord | NotificationRecord

const NOTIFICATIONS_ALERTS_TABS = [
  { label: 'Alerts', path: '/notifications-alerts/alerts' },
  { label: 'Notifications', path: '/notifications-alerts/notifications' },
]

const EVENT_LABELS: Record<string, string> = {
  PROJECT_CREATED: 'Project Created',
  PROJECT_TENANT_REQUIREMENTS_UPDATED: 'Project Tenant Requirements Updated',
  PROJECT_CANCELLED: 'Project Cancelled',
  POC_ENDED: 'POC end date overdue',
  POC_END_DATE_UPDATED: 'POC Project End Date Updated',
  SYSTEM_CREATED: 'System Created',
  SYSTEM_ALLOCATED: 'System Allocated',
  SYSTEM_DEALLOCATED: 'System Deallocated',
  PHYSICAL_SYSTEM_PROVISIONING_REQUEST: 'Physical System Provisioning Request',
  SYSTEM_READY_PROVISIONING_COMPLETED: 'System Ready / Provisioning Completed',
  RIS_OCCUPIED: 'System Occupied',
  RIS_AVAILABLE: 'System Available',
  SYSTEM_DELETED: 'System Deleted',
  SYSTEM_TURNED_OFF: 'System Turned Off',
  SYSTEM_ACCESS_BLOCKED: 'System Access Blocked',
  SYSTEM_SERVICE_BLOCKED: 'System Service Blocked',
  SYSTEM_ON: 'System On',
  SYSTEM_UPGRADED: 'System Upgraded',
  RIS_OBSOLETE: 'RIS Obsolete - Physical Removal Required',
  TENANT_CREATED: 'Tenant Created',
  TENANT_CANCELLED: 'Tenant Cancelled',
  TENANT_CONFIGURATION_CHANGED: 'Tenant Configuration Changed',
  TENANT_DELETED: 'Tenant Deleted',
  TENANT_ACCESS_BLOCKED_PASSWORD_RESET: 'Tenant Access Blocked - Password Reset',
  TENANT_WARRANTY_NOT_SET_YET: 'Tenant Warranty Not Set Yet',
  TENANT_WARRANTY_RENEWAL_PENDING: 'Tenant Warranty Renewal Pending',
  TENANT_WARRANTY_EXPIRED: 'Tenant Warranty Expired',
  TENANT_WARRANTY_RENEWED: 'Tenant Warranty Renewed',
  TENANT_WARRANTY_NOT_RENEWED: 'Tenant Warranty Not Renewed',
  TENANT_WARRANTY_CREATED_UPDATED: 'Tenant Warranty Created / Updated',
  SYSTEM_DELETED_TENANT_UNDER_CONTRACT: 'Deleted Tenant Still Under Contract',
  INFRASTRUCTURE_ITEM_CREATED: 'Infrastructure Item Created',
  INFRASTRUCTURE_ITEM_DELETED: 'Infrastructure Item Deleted',
  INFRASTRUCTURE_ITEM_CANCELLED: 'Infrastructure Item Cancelled',
  INFRASTRUCTURE_WARRANTY_NOT_SET_YET: 'Infrastructure Warranty Not Set Yet',
  INFRASTRUCTURE_WARRANTY_PENDING: 'Infrastructure Warranty Pending',
  INFRASTRUCTURE_WARRANTY_EXPIRED: 'Infrastructure Warranty Expired',
  INFRASTRUCTURE_WARRANTY_RENEWED: 'Infrastructure Warranty Renewed',
  INFRASTRUCTURE_WARRANTY_NOT_RENEWED: 'Infrastructure Warranty Not Renewed',
  INFRASTRUCTURE_ITEM_OBSOLETE: 'Infrastructure Item Obsolete',
  INFRASTRUCTURE_DATA_COMPLETENESS: 'Infrastructure Data Completeness',
}

function eventLabel(eventKey: string): string {
  return EVENT_LABELS[eventKey] ?? eventKey.split('_').map((part) => part.charAt(0) + part.slice(1).toLocaleLowerCase()).join(' ')
}

const OBJECT_TYPE_MAP: Record<string, BusinessObjectType> = {
  project: 'PROJECT',
  system: 'SYSTEM',
  ris: 'SYSTEM',
  tenant: 'TENANT',
  warranty: 'WARRANTY',
  opportunity: 'OPPORTUNITY',
  customer: 'ACCOUNT',
  account: 'ACCOUNT',
  'infrastructure item': 'INFRASTRUCTURE_ITEM',
}

function referenceFor(ref: NotificationAlertObjectRef): BusinessObjectReference | null {
  const objectType = OBJECT_TYPE_MAP[ref.objectType.toLocaleLowerCase()] ?? null
  if (!objectType || !ref.businessId) return null
  return {
    objectType,
    internalId: ref.id || null,
    businessId: ref.businessId,
    displayLabel: ref.displayLabel || ref.businessId,
    routePath: ref.routePath ?? null,
    isMissing: !ref.routePath,
    isStale: false,
  }
}

function ObjectRefLink({ refValue, newTab = false, children }: { refValue: NotificationAlertObjectRef; newTab?: boolean; children?: ReactNode }) {
  const reference = referenceFor(refValue)
  return <BusinessObjectLink reference={reference} newTab={newTab}>{children ?? refValue.displayLabel ?? refValue.businessId}</BusinessObjectLink>
}

function PrimaryObjectActionLink({ refValue }: { refValue: NotificationAlertObjectRef }) {
  const reference = referenceFor(refValue)
  return (
    <BusinessObjectLink reference={reference} newTab>
      Open {refValue.objectType} {refValue.businessId}
    </BusinessObjectLink>
  )
}

function severityVariant(severity: string): 'info' | 'warning' | 'danger' {
  if (severity === 'HIGH') return 'danger'
  if (severity === 'WARNING') return 'warning'
  return 'info'
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase text-sf-text-muted">{label}</div>
      <div className="mt-1 text-sm text-sf-text">{children || '-'}</div>
    </div>
  )
}

function compactRecipients(roleIds: string[]): string {
  return roleIds.length ? roleIds.join('; ') : '-'
}

function reminderSummary(record: DetailRecord): string {
  if (record.type !== 'ALERT') return '-'
  return record.reminderFrequencyDays ? `Every ${record.reminderFrequencyDays} days` : '-'
}

function fullMessageBody(fullDescription: string): string {
  const marker = '\nLINK\n'
  const markerIndex = fullDescription.lastIndexOf(marker)
  return (markerIndex >= 0 ? fullDescription.slice(0, markerIndex) : fullDescription).trim()
}

const FULL_MESSAGE_SECTION_TITLES = new Set([
  'EVENT',
  'CONTEXT',
  'SYSTEM',
  'PROJECT',
  'TENANT',
  'WARRANTY',
  'VERSION',
  'INFRASTRUCTURE',
  'INFRASTRUCTURE WARRANTY',
  'PERFORMED BY',
  'REQUIRED ACTION',
  'LINK',
])

function ObjectLinkedText({ textValue, refs }: { textValue: string; refs: NotificationAlertObjectRef[] }) {
  const matchingRef = refs
    .filter((ref) => ref.businessId)
    .sort((first, second) => second.businessId.length - first.businessId.length)
    .find((ref) => textValue.includes(ref.businessId))
  if (!matchingRef) return <>{textValue}</>

  const parts = textValue.split(matchingRef.businessId)
  return (
    <>
      {parts.map((part, index) => (
        <span key={`${matchingRef.businessId}-${index}`}>
          {part}
          {index < parts.length - 1 ? (
            <ObjectRefLink refValue={matchingRef} newTab>
              {matchingRef.businessId}
            </ObjectRefLink>
          ) : null}
        </span>
      ))}
    </>
  )
}

function FullMessage({ record }: { record: DetailRecord }) {
  const refs = [record.primaryObject, ...record.relatedObjects]
  const lines = fullMessageBody(record.fullDescription).split('\n')
  return (
    <div className="mt-2 rounded border border-sf-border bg-white p-3 text-sm leading-6 text-sf-text">
      {lines.map((line, index) => {
        const trimmed = line.trim()
        if (!trimmed) return <div key={index} className="h-3" />
        if (FULL_MESSAGE_SECTION_TITLES.has(trimmed)) {
          return <div key={index} className="font-semibold uppercase underline decoration-sf-border underline-offset-4">{trimmed}</div>
        }
        return (
          <div key={index} className="whitespace-pre-wrap">
            <ObjectLinkedText textValue={line} refs={refs} />
          </div>
        )
      })}
    </div>
  )
}

function DetailsDialog({ record, onClose }: { record: DetailRecord | null; onClose: () => void }) {
  if (!record) return null
  const timestamp = formatSemanticDateTimeValue(record.createdAt, 'datetime')
  return (
    <div
      className="fixed left-1/2 top-1/2 z-50 flex h-[min(82vh,44rem)] w-[min(92vw,56rem)] min-w-[22rem] -translate-x-1/2 -translate-y-1/2 resize overflow-hidden rounded border border-sf-border bg-white shadow-xl"
      role="dialog"
      aria-modal="false"
      aria-labelledby="notification-alert-details-title"
    >
      <div className="flex min-h-0 w-full flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-sf-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <h2 id="notification-alert-details-title" className="min-w-0 text-base font-semibold text-sf-text">{eventLabel(record.eventKey)}</h2>
              <div className="shrink-0 text-sm text-sf-text-muted">{timestamp}</div>
            </div>
          </div>
          <button type="button" className="rounded p-1 text-sf-text-muted hover:bg-sf-surface-alt hover:text-sf-text" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-4">
          <div className="space-y-3 rounded border border-sf-border bg-sf-surface-alt p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Type">{record.type}</Field>
              <Field label="Event">{eventLabel(record.eventKey)}</Field>
              <Field label="Category">{record.category}</Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Object"><ObjectRefLink refValue={record.primaryObject} newTab /></Field>
              <Field label="Severity">{record.severity}</Field>
              <Field label="Status">{record.type === 'NOTIFICATION' ? notificationReadStatusForUser(record) : record.status}</Field>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Email Enabled">{record.email.enabled ? 'Yes' : 'No'}</Field>
              <Field label="Reminder">{reminderSummary(record)}</Field>
              <Field label="Recipients">{compactRecipients(record.recipientRoleIds)}</Field>
            </div>
          </div>
          <div className="mt-5">
            <div className="text-xs font-semibold uppercase text-sf-text-muted">Full Message</div>
            <FullMessage record={record} />
            <div className="mt-4 text-xs font-semibold uppercase text-sf-text-muted">LINK</div>
            <div className="mt-2 text-sm">
              <PrimaryObjectActionLink refValue={record.primaryObject} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function useAlertColumns(): Array<DashboardColumn<AlertRecord>> {
  return useMemo<Array<DashboardColumn<AlertRecord>>>(() => [
    { id: 'event', label: 'Event', getValue: (row) => eventLabel(row.eventKey), cellClassName: 'min-w-64 whitespace-normal', cellContentClassName: 'whitespace-normal' },
    { id: 'message', label: 'Message', getValue: (row) => row.shortMessage, cellClassName: 'min-w-96 whitespace-normal', cellContentClassName: 'whitespace-normal' },
    { id: 'primaryObject', label: 'Primary Object', getValue: (row) => row.primaryObject.displayLabel, render: (row) => <ObjectRefLink refValue={row.primaryObject} /> },
    { id: 'status', label: 'Status', getValue: (row) => row.status },
    { id: 'category', label: 'Category', getValue: (row) => row.category },
    { id: 'createdAt', label: 'Detected', getValue: (row) => row.createdAt, render: (row) => formatSemanticDateTimeValue(row.createdAt, 'datetime'), semanticType: 'datetime' },
    { id: 'resolvedAt', label: 'Resolved', getValue: (row) => row.resolvedAt ?? '', render: (row) => formatSemanticDateTimeValue(row.resolvedAt, 'datetime'), semanticType: 'datetime' },
    { id: 'recipients', label: 'Recipient Roles', getValue: (row) => row.recipientRoleIds.join('; ') },
    { id: 'email', label: 'Email Enabled', getValue: (row) => row.email.enabled ? 'Yes' : 'No' },
    {
      id: 'severity',
      label: 'Severity',
      getValue: (row) => row.severity,
      render: (row) => <span className="inline-flex items-center gap-1"><AlertStatusIcon variant={severityVariant(row.severity)} label={row.severity} />{row.severity}</span>,
    },
  ], [])
}

function useNotificationColumns(): Array<DashboardColumn<NotificationRecord>> {
  return useMemo<Array<DashboardColumn<NotificationRecord>>>(() => [
    { id: 'event', label: 'Event', getValue: (row) => eventLabel(row.eventKey), cellClassName: 'min-w-64 whitespace-normal', cellContentClassName: 'whitespace-normal' },
    { id: 'message', label: 'Message', getValue: (row) => row.shortMessage, cellClassName: 'min-w-96 whitespace-normal', cellContentClassName: 'whitespace-normal' },
    { id: 'primaryObject', label: 'Primary Object', getValue: (row) => row.primaryObject.displayLabel, render: (row) => <ObjectRefLink refValue={row.primaryObject} /> },
    { id: 'status', label: 'Status', getValue: (row) => notificationReadStatusForUser(row) },
    { id: 'category', label: 'Category', getValue: (row) => row.category },
    { id: 'createdAt', label: 'Created', getValue: (row) => row.createdAt, render: (row) => formatSemanticDateTimeValue(row.createdAt, 'datetime'), semanticType: 'datetime' },
    { id: 'recipients', label: 'Recipient Roles', getValue: (row) => row.recipientRoleIds.join('; ') },
    { id: 'email', label: 'Email Enabled', getValue: (row) => row.email.enabled ? 'Yes' : 'No' },
    {
      id: 'severity',
      label: 'Severity',
      getValue: (row) => row.severity,
      render: (row) => <span className="inline-flex items-center gap-1"><AlertStatusIcon variant={severityVariant(row.severity)} label={row.severity} />{row.severity}</span>,
    },
  ], [])
}

function AlertsDashboard() {
  const alertRecords = useAppStore((state) => state.alertRecords)
  const reconcile = useAppStore((state) => state.reconcileNotificationsAndAlerts)
  const [alertScope, setAlertScope] = useState<'OPEN' | 'RESOLVED' | 'ALL'>('OPEN')
  const [detailRecord, setDetailRecord] = useState<DetailRecord | null>(null)
  const columns = useAlertColumns()
  const rows = useMemo(
    () => alertRecords.filter((record) => alertScope === 'ALL' || record.status === alertScope),
    [alertRecords, alertScope],
  )

  return (
    <>
      <WorkspaceDashboardContent>
        <DataDashboard
          title="Alerts"
          dashboardScope="notificationAlerts"
          rows={rows}
          columns={columns}
          toolbar={(
            <div className="flex flex-wrap items-center gap-2">
              <select className="h-8 rounded border border-sf-border bg-white px-2 py-1 text-sm" value={alertScope} onChange={(event) => setAlertScope(event.target.value as 'OPEN' | 'RESOLVED' | 'ALL')}>
                <option value="OPEN">Open Alerts</option>
                <option value="RESOLVED">Resolved Alerts</option>
                <option value="ALL">All Alerts</option>
              </select>
              <button type="button" className="inline-flex h-8 items-center gap-2 rounded border border-sf-border bg-white px-3 text-sm text-sf-text hover:bg-sf-surface-alt" onClick={reconcile}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Reconcile
              </button>
            </div>
          )}
          renderRecordActions={(row) => (
            <DashboardActionButton icon={<Eye className="h-4 w-4" aria-hidden="true" />} label="Details" onClick={() => setDetailRecord(row)} />
          )}
          enableRecordActions
          showDefaultRecordActions={false}
          initialSorting={[{ id: 'createdAt', desc: true }]}
        />
      </WorkspaceDashboardContent>
      <DetailsDialog record={detailRecord} onClose={() => setDetailRecord(null)} />
    </>
  )
}

function NotificationsDashboard() {
  const notificationRecords = useAppStore((state) => state.notificationRecords)
  const [notificationScope, setNotificationScope] = useState<'UNREAD' | 'READ' | 'ALL'>('UNREAD')
  const [detailRecord, setDetailRecord] = useState<DetailRecord | null>(null)
  const columns = useNotificationColumns()
  const rows = useMemo(
    () => notificationRecords.filter((record) => notificationScope === 'ALL' || notificationReadStatusForUser(record) === notificationScope),
    [notificationRecords, notificationScope],
  )
  function openNotificationDetails(row: NotificationRecord) {
    setDetailRecord(row)
  }

  return (
    <>
      <WorkspaceDashboardContent>
        <DataDashboard
          title="Notifications"
          dashboardScope="notifications"
          rows={rows}
          columns={columns}
          toolbar={(
            <select className="h-8 rounded border border-sf-border bg-white px-2 py-1 text-sm" value={notificationScope} onChange={(event) => setNotificationScope(event.target.value as 'UNREAD' | 'READ' | 'ALL')}>
              <option value="UNREAD">Unread</option>
              <option value="READ">Read</option>
              <option value="ALL">All</option>
            </select>
          )}
          renderRecordActions={(row) => (
            <DashboardActionButton icon={<Eye className="h-4 w-4" aria-hidden="true" />} label="Details" onClick={() => openNotificationDetails(row)} />
          )}
          enableRecordActions
          showDefaultRecordActions={false}
          initialSorting={[{ id: 'createdAt', desc: true }]}
        />
      </WorkspaceDashboardContent>
      <DetailsDialog record={detailRecord} onClose={() => setDetailRecord(null)} />
    </>
  )
}

export function NotificationsAlertsWorkspacePage() {
  const { pathname } = useLocation()
  const activeView = pathname.startsWith('/notifications-alerts/notifications') ? 'notifications' : 'alerts'

  return (
    <WorkspaceFrame className="gap-4">
      <PageHeader title="Notifications & Alerts" subtitle="Recipient-oriented business notifications and current-condition alerts" />
      <WorkspaceTabs tabs={NOTIFICATIONS_ALERTS_TABS} ariaLabel="Notifications & Alerts views" />
      <div className="contents">
        {activeView === 'alerts' ? <AlertsDashboard /> : null}
        {activeView === 'notifications' ? <NotificationsDashboard /> : null}
      </div>
    </WorkspaceFrame>
  )
}
