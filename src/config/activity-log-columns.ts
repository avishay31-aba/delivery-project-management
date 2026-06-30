import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { AlertStatusIcon, LinkId, StatusBadge } from '@/components/ui'
import {
  ACTIVITY_EVENT_CATEGORY_LABELS,
  ACTIVITY_EVENT_SEVERITY_LABELS,
  type ActivityEvent,
  type ActivityEventCategory,
  type ActivityEventSeverity,
  type ActivityObjectRef,
} from '@/domain/activity-log'
import { routePathForBusinessReference } from '@/domain/business-reference'

export interface ActivityDashboardRow {
  id: string
  occurredAt: string
  severity: ActivityEventSeverity
  severityLabel: string
  category: ActivityEventCategory
  categoryLabel: string
  eventType: string
  summary: string
  actor: string
  source: string
  primaryObject: ActivityObjectRef
  primaryObjectLabel: string
  relatedObjects: ActivityObjectRef[]
  customer: ActivityObjectRef | null
  customerLabel: string
  pid: ActivityObjectRef | null
  pidLabel: string
  sidMid: ActivityObjectRef | null
  sidMidLabel: string
  tid: ActivityObjectRef | null
  tidLabel: string
  warrantyId: ActivityObjectRef | null
  warrantyIdLabel: string
  requirementId: ActivityObjectRef | null
  requirementIdLabel: string
  correlationId: string
}

function labelForRef(ref: ActivityObjectRef | null): string {
  return ref?.displayLabel || ref?.businessId || ref?.id || ''
}

function refsForEvent(event: ActivityEvent): ActivityObjectRef[] {
  return [event.primaryObject, ...event.relatedObjects]
}

function firstRef(event: ActivityEvent, objectType: string): ActivityObjectRef | null {
  return refsForEvent(event).find((ref) => ref.objectType === objectType) ?? null
}

function renderRef(ref: ActivityObjectRef | null) {
  const label = labelForRef(ref)
  if (!ref || !label) return ''
  if (ref.routePath) return createElement(LinkId, { to: ref.routePath }, label)
  const routePath = routePathForBusinessReference(ref.objectType, ref.businessId)
  if (routePath) return createElement(LinkId, { to: routePath }, label)
  return label
}

function severityBadgeVariant(severity: ActivityEventSeverity) {
  if (severity === 'DANGER') return 'error'
  if (severity === 'WARNING') return 'warning'
  if (severity === 'SUCCESS') return 'done'
  return 'default'
}

function severityIconVariant(severity: ActivityEventSeverity) {
  if (severity === 'DANGER') return 'danger'
  if (severity === 'WARNING') return 'warning'
  if (severity === 'SUCCESS') return 'success'
  return 'info'
}

export function activityDashboardRows(events: ActivityEvent[]): ActivityDashboardRow[] {
  return events.map((event) => {
    const customer = firstRef(event, 'CUSTOMER')
    const pid = firstRef(event, 'PROJECT')
    const sidMid = firstRef(event, 'SYSTEM')
    const tid = firstRef(event, 'TENANT')
    const warrantyId = firstRef(event, 'WARRANTY')
    const requirementId = firstRef(event, 'REQUIREMENT')
    return {
      id: event.id,
      occurredAt: event.occurredAt,
      severity: event.severity,
      severityLabel: ACTIVITY_EVENT_SEVERITY_LABELS[event.severity],
      category: event.category,
      categoryLabel: ACTIVITY_EVENT_CATEGORY_LABELS[event.category],
      eventType: event.eventType,
      summary: event.summary,
      actor: event.actorName,
      source: event.source,
      primaryObject: event.primaryObject,
      primaryObjectLabel: labelForRef(event.primaryObject),
      relatedObjects: event.relatedObjects,
      customer,
      customerLabel: labelForRef(customer),
      pid,
      pidLabel: labelForRef(pid),
      sidMid,
      sidMidLabel: labelForRef(sidMid),
      tid,
      tidLabel: labelForRef(tid),
      warrantyId,
      warrantyIdLabel: labelForRef(warrantyId),
      requirementId,
      requirementIdLabel: labelForRef(requirementId),
      correlationId: event.correlationId ?? '',
    }
  })
}

export function createActivityLogColumns(): DashboardColumn<ActivityDashboardRow>[] {
  return [
    { id: 'occurredAt', label: 'Occurred At', getValue: (row) => row.occurredAt },
    {
      id: 'severity',
      label: 'Severity',
      getValue: (row) => row.severityLabel,
      render: (row) =>
        createElement(
          'span',
          { className: 'inline-flex items-center gap-1.5' },
          createElement(AlertStatusIcon, { variant: severityIconVariant(row.severity), label: row.severityLabel }),
          createElement(StatusBadge, { label: row.severityLabel, variant: severityBadgeVariant(row.severity) }),
        ),
    },
    { id: 'category', label: 'Category', getValue: (row) => row.categoryLabel },
    { id: 'eventType', label: 'Event Type', getValue: (row) => row.eventType },
    { id: 'summary', label: 'Summary', getValue: (row) => row.summary },
    { id: 'actor', label: 'Actor', getValue: (row) => row.actor },
    { id: 'source', label: 'Source', getValue: (row) => row.source },
    {
      id: 'primaryObject',
      label: 'Primary Object',
      getValue: (row) => row.primaryObjectLabel,
      render: (row) => renderRef(row.primaryObject),
    },
    {
      id: 'customer',
      label: 'Customer',
      getValue: (row) => row.customerLabel,
      render: (row) => renderRef(row.customer),
    },
    {
      id: 'pid',
      label: 'PID',
      getValue: (row) => row.pidLabel,
      render: (row) => renderRef(row.pid),
    },
    {
      id: 'sidMid',
      label: 'SID/MID',
      getValue: (row) => row.sidMidLabel,
      render: (row) => renderRef(row.sidMid),
    },
    {
      id: 'tid',
      label: 'TID',
      getValue: (row) => row.tidLabel,
      render: (row) => renderRef(row.tid),
    },
    {
      id: 'warrantyId',
      label: 'Warranty ID',
      getValue: (row) => row.warrantyIdLabel,
      render: (row) => renderRef(row.warrantyId),
    },
    {
      id: 'requirementId',
      label: 'Requirement ID',
      getValue: (row) => row.requirementIdLabel,
      render: (row) => renderRef(row.requirementId),
    },
    { id: 'correlationId', label: 'Correlation ID', getValue: (row) => row.correlationId },
  ]
}
