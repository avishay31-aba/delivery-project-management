import { ACTIVITY_EVENT_CATEGORIES } from './metadata'
import type {
  ActivityLogBrowseQuery,
  ActivityLogBrowseResult,
  ActivityEvent,
  ActivityEventCategory,
  ActivityLogDashboardSummary,
  ActivityLogSortRule,
  ActivityLogSummary,
} from './types'
import { ACTIVITY_EVENT_CATEGORY_LABELS } from './metadata'

function eventMatchesObject(event: ActivityEvent, objectType: string, idOrBusinessId: string): boolean {
  const normalizedObjectType = objectType.toUpperCase()
  const refs = [event.primaryObject, ...event.relatedObjects]
  return refs.some((ref) =>
    ref.objectType.toUpperCase() === normalizedObjectType &&
    (ref.id === idOrBusinessId || ref.businessId === idOrBusinessId),
  )
}

function sortNewestFirst(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort((first, second) =>
    second.occurredAt.localeCompare(first.occurredAt) || (second.sequence ?? 0) - (first.sequence ?? 0),
  )
}

function activitySortValue(event: ActivityEvent, sort: ActivityLogSortRule): string {
  if (sort.column === 'activityId') return event.id
  if (sort.column === 'timestamp') return event.occurredAt
  if (sort.column === 'user') return event.actorName
  if (sort.column === 'eventCategory') return activityEventCategoryLabel(event)
  if (sort.column === 'eventType') return event.eventType
  if (sort.column === 'businessObject') return event.primaryObject.objectType
  if (sort.column === 'businessObjectId') return event.primaryObject.businessId || event.primaryObject.id
  if (sort.column === 'description') return event.summary
  if (sort.column === 'source') return event.source
  if (sort.column === 'correlationId') return event.correlationId ?? ''
  return ''
}

function sortActivityEvents(events: ActivityEvent[], sort?: ActivityLogSortRule | null): ActivityEvent[] {
  if (!sort) return sortNewestFirst(events)
  const direction = sort.direction === 'asc' ? 1 : -1
  return [...events].sort((first, second) => {
    const firstValue = activitySortValue(first, sort)
    const secondValue = activitySortValue(second, sort)
    return direction * firstValue.localeCompare(secondValue, undefined, { numeric: true }) ||
      second.occurredAt.localeCompare(first.occurredAt) ||
      (second.sequence ?? 0) - (first.sequence ?? 0)
  })
}

function eventLocalDateKey(event: ActivityEvent): string {
  const parsed = new Date(event.occurredAt)
  if (Number.isNaN(parsed.valueOf())) return ''
  const year = String(parsed.getFullYear()).padStart(4, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function activitySearchText(event: ActivityEvent): string {
  return [
    event.id,
    event.occurredAt,
    event.actorName,
    activityEventCategoryLabel(event),
    event.eventType,
    event.summary,
    event.details ?? '',
    event.source,
    event.correlationId ?? '',
    event.primaryObject.objectType,
    event.primaryObject.businessId,
    event.primaryObject.displayLabel,
  ].join(' ').toLocaleLowerCase()
}

function positiveInteger(value: number | null | undefined): number | null {
  return Number.isInteger(value) && value && value > 0 ? value : null
}

export function activityEventsForObject(
  events: ActivityEvent[],
  objectType: string,
  idOrBusinessId: string,
): ActivityEvent[] {
  return sortNewestFirst(events.filter((event) => eventMatchesObject(event, objectType, idOrBusinessId)))
}

export function activityEventsForCustomer(events: ActivityEvent[], accountIdOrCode: string): ActivityEvent[] {
  return activityEventsForObject(events, 'Customer', accountIdOrCode)
}

export function activityEventsForProject(events: ActivityEvent[], projectIdOrPid: string): ActivityEvent[] {
  return activityEventsForObject(events, 'Project', projectIdOrPid)
}

export function activityEventsForOpportunity(events: ActivityEvent[], opportunityId: string): ActivityEvent[] {
  return activityEventsForObject(events, 'Opportunity', opportunityId)
}

export function activityEventsForTenant(events: ActivityEvent[], tenantIdOrTid: string): ActivityEvent[] {
  return activityEventsForObject(events, 'Tenant', tenantIdOrTid)
}

export function activityEventsForSystem(events: ActivityEvent[], systemIdOrSidOrMid: string): ActivityEvent[] {
  return activityEventsForObject(events, 'System', systemIdOrSidOrMid)
}

export function activityEventsForWarranty(events: ActivityEvent[], warrantyId: string): ActivityEvent[] {
  return activityEventsForObject(events, 'Warranty', warrantyId)
}

export function activityEventsByCategory(events: ActivityEvent[], category: ActivityEventCategory): ActivityEvent[] {
  return sortNewestFirst(events.filter((event) => event.category === category))
}

export function activityEventCategoryLabel(event: ActivityEvent): string {
  const eventType = event.eventType.toLocaleLowerCase()
  if (eventType.includes('deallocat')) return 'Deallocation'
  if (eventType.includes('allocat')) return 'Allocation'
  if (eventType.includes('config') || eventType.includes('mapcenter')) return 'Configuration'
  if (eventType.includes('status')) return 'Status Change'
  if (eventType.includes('document')) return 'Document'
  if (eventType.includes('warranty')) return 'Warranty'
  if (eventType.includes('remark')) return 'Remark'
  if (eventType.includes('relationship') || eventType.includes('link') || eventType.includes('unlink')) return 'Relationship'
  if (eventType.includes('security')) return 'Security'
  if (eventType.includes('user')) return 'User Management'
  if (eventType.includes('admin')) return 'Administration'
  if (event.category === 'PROJECT') return 'Project'
  if (event.category === 'OPPORTUNITY') return 'Opportunity'
  if (event.category === 'SYSTEM') return 'System'
  if (event.category === 'TENANT') return 'Tenant'
  if (event.category === 'CUSTOMER') return 'Customer'
  if (event.category === 'WARRANTY') return 'Warranty'
  if (event.category === 'ALLOCATION') return 'Allocation'
  if (event.category === 'DOCUMENT') return 'Document'
  return ACTIVITY_EVENT_CATEGORY_LABELS[event.category] ?? 'Other'
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

export function browseActivityLog(
  events: ActivityEvent[],
  query: ActivityLogBrowseQuery,
): ActivityLogBrowseResult {
  const scopedEvents = query.objectType && query.objectIdOrBusinessId
    ? events.filter((event) => eventMatchesObject(event, query.objectType ?? '', query.objectIdOrBusinessId ?? ''))
    : events
  const normalizedSearch = query.search?.trim().toLocaleLowerCase() ?? ''
  const latestLimit = positiveInteger(query.latestRecordLimit)
  const pageSize = query.pageSize

  const matching = sortActivityEvents(scopedEvents.filter((event) => {
    const eventDate = eventLocalDateKey(event)
    if (query.fromDate && eventDate && eventDate < query.fromDate) return false
    if (query.toDate && eventDate && eventDate > query.toDate) return false
    if (!normalizedSearch) return true
    return activitySearchText(event).includes(normalizedSearch)
  }), query.sort)
  const limited = latestLimit ? matching.slice(0, latestLimit) : matching
  const totalMatchingRecords = limited.length
  const numericPageSize = pageSize === 'all' ? Math.max(totalMatchingRecords, 1) : pageSize
  const totalPages = Math.max(1, Math.ceil(totalMatchingRecords / numericPageSize))
  const currentPage = Math.min(Math.max(1, query.pageNumber), totalPages)
  const startIndex = pageSize === 'all' ? 0 : (currentPage - 1) * numericPageSize
  const records = pageSize === 'all' ? limited : limited.slice(startIndex, startIndex + numericPageSize)

  return {
    records,
    totalMatchingRecords,
    totalPages,
    currentPage,
    pageSize,
    firstRecordNumber: records.length > 0 ? startIndex + 1 : 0,
    lastRecordNumber: records.length > 0 ? startIndex + records.length : 0,
  }
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
