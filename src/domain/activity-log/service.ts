import { ACTIVITY_EVENT_CATEGORIES } from './metadata'
import type {
  ActivityEvent,
  ActivityEventCategory,
  ActivityLogDashboardSummary,
  ActivityLogSummary,
} from './types'

function normalizeObjectType(value: string): string {
  return value.trim().toLocaleUpperCase()
}

function eventMatchesObject(event: ActivityEvent, objectType: string, idOrBusinessId: string): boolean {
  const refs = [event.primaryObject, ...event.relatedObjects]
  const normalizedType = normalizeObjectType(objectType)
  return refs.some((ref) =>
    normalizeObjectType(ref.objectType) === normalizedType &&
    (ref.id === idOrBusinessId || ref.businessId === idOrBusinessId),
  )
}

function sortNewestFirst(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((first, second) =>
    second.occurredAt.localeCompare(first.occurredAt) || (second.sequence ?? 0) - (first.sequence ?? 0),
  )
}

export function activityEventsForObject(
  events: ActivityEvent[],
  objectType: string,
  idOrBusinessId: string,
): ActivityEvent[] {
  return sortNewestFirst(events.filter((event) => eventMatchesObject(event, objectType, idOrBusinessId)))
}

export function activityEventsForCustomer(events: ActivityEvent[], accountIdOrCode: string): ActivityEvent[] {
  return activityEventsForObject(events, 'ACCOUNT', accountIdOrCode)
}

export function activityEventsForOpportunity(events: ActivityEvent[], opportunityIdOrCode: string): ActivityEvent[] {
  return activityEventsForObject(events, 'OPPORTUNITY', opportunityIdOrCode)
}

export function activityEventsForProject(events: ActivityEvent[], projectIdOrPid: string): ActivityEvent[] {
  return activityEventsForObject(events, 'PROJECT', projectIdOrPid)
}

export function activityEventsForTenant(events: ActivityEvent[], tenantIdOrTid: string): ActivityEvent[] {
  return activityEventsForObject(events, 'TENANT', tenantIdOrTid)
}

export function activityEventsForSystem(events: ActivityEvent[], systemIdOrSidOrMid: string): ActivityEvent[] {
  return activityEventsForObject(events, 'SYSTEM', systemIdOrSidOrMid)
}

export function activityEventsForWarranty(events: ActivityEvent[], warrantyId: string): ActivityEvent[] {
  return activityEventsForObject(events, 'WARRANTY', warrantyId)
}

export function activityEventsByCategory(events: ActivityEvent[], category: ActivityEventCategory): ActivityEvent[] {
  return sortNewestFirst(events.filter((event) => event.category === category))
}

export function activityEventsByDateRange(
  events: ActivityEvent[],
  startIso?: string | null,
  endIso?: string | null,
): ActivityEvent[] {
  return sortNewestFirst(events.filter((event) =>
    (!startIso || event.occurredAt >= startIso) &&
    (!endIso || event.occurredAt <= endIso),
  ))
}

export function activityLogSummary(events: ActivityEvent[]): ActivityLogSummary {
  return {
    totalEvents: events.length,
    info: events.filter((event) => event.severity === 'INFO').length,
    success: events.filter((event) => event.severity === 'SUCCESS').length,
    warning: events.filter((event) => event.severity === 'WARNING').length,
    danger: events.filter((event) => event.severity === 'DANGER').length,
    byCategory: Object.fromEntries(
      ACTIVITY_EVENT_CATEGORIES.map((category) => [
        category,
        events.filter((event) => event.category === category).length,
      ]),
    ) as ActivityLogSummary['byCategory'],
  }
}

function startOfTodayIso(today: Date): string {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
}

function startOfWeekIso(today: Date): string {
  const dayOfWeek = today.getDay()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek).toISOString()
}

export function activityLogDashboardSummary(
  events: ActivityEvent[],
  today = new Date(),
): ActivityLogDashboardSummary {
  const summary = activityLogSummary(events)

  return {
    totalEvents: summary.totalEvents,
    today: activityEventsByDateRange(events, startOfTodayIso(today)).length,
    thisWeek: activityEventsByDateRange(events, startOfWeekIso(today)).length,
    warnings: summary.warning,
    danger: summary.danger,
    projectEvents: summary.byCategory.PROJECT,
    allocationEvents: summary.byCategory.ALLOCATION,
    tenantEvents: summary.byCategory.TENANT,
    systemEvents: summary.byCategory.SYSTEM,
  }
}
