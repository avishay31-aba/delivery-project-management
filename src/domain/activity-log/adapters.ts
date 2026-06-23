import { ACTIVITY_EVENT_SCHEMA_VERSION } from './metadata'
import { validateActivityEventShape, validateActivityObjectRefShape } from './validation'
import type {
  ActivityEvent,
  ActivityEventCategory,
  ActivityEventSeverity,
  ActivityObjectRef,
} from './types'

export const LOCAL_ACTIVITY_ACTOR = {
  actorId: null,
  actorName: 'Local User',
} as const

export interface ActivityObjectRefInput {
  objectType: string
  id: string
  businessId: string
  displayLabel?: string
  routePath?: string
}

export interface ActivityEventInput {
  occurredAt: string
  category: ActivityEventCategory
  eventType: string
  severity: ActivityEventSeverity
  summary: string
  primaryObject: ActivityObjectRefInput
  relatedObjects?: ActivityObjectRefInput[]
  details?: string
  correlationId?: string
  sequence?: number
}

function emptyObjectRef(): ActivityObjectRef {
  return {
    objectType: 'Unknown',
    id: '',
    businessId: '',
    displayLabel: '',
  }
}

function normalizeActivityObjectRef(value: unknown): ActivityObjectRef {
  if (!validateActivityObjectRefShape(value)) return emptyObjectRef()
  return {
    objectType: value.objectType,
    id: value.id,
    businessId: value.businessId,
    displayLabel: value.displayLabel,
    ...(value.routePath ? { routePath: value.routePath } : {}),
  }
}

export function normalizeActivityEvent(value: unknown): ActivityEvent | null {
  if (!validateActivityEventShape(value)) return null
  return {
    id: value.id,
    occurredAt: value.occurredAt,
    actorId: value.actorId,
    actorName: value.actorName,
    source: value.source,
    eventType: value.eventType,
    severity: value.severity,
    category: value.category,
    primaryObject: normalizeActivityObjectRef(value.primaryObject),
    relatedObjects: value.relatedObjects.map(normalizeActivityObjectRef),
    summary: value.summary,
    ...(value.details ? { details: value.details } : {}),
    ...(value.before ? { before: value.before } : {}),
    ...(value.after ? { after: value.after } : {}),
    ...(value.metadata ? { metadata: value.metadata } : {}),
    ...(value.correlationId ? { correlationId: value.correlationId } : {}),
    ...(typeof value.sequence === 'number' ? { sequence: value.sequence } : {}),
    schemaVersion: value.schemaVersion || ACTIVITY_EVENT_SCHEMA_VERSION,
  }
}

export function normalizeActivityEvents(values: unknown): ActivityEvent[] {
  if (!Array.isArray(values)) return []
  return values.flatMap((value) => {
    const event = normalizeActivityEvent(value)
    return event ? [event] : []
  })
}

export function activityObjectRef(input: ActivityObjectRefInput): ActivityObjectRef {
  return {
    objectType: input.objectType,
    id: input.id,
    businessId: input.businessId,
    displayLabel: input.displayLabel ?? input.businessId,
    ...(input.routePath ? { routePath: input.routePath } : {}),
  }
}

export function createActivityEvent(input: ActivityEventInput): ActivityEvent {
  return {
    id: `activity-${crypto.randomUUID()}`,
    occurredAt: input.occurredAt,
    ...LOCAL_ACTIVITY_ACTOR,
    source: 'USER',
    category: input.category,
    eventType: input.eventType,
    severity: input.severity,
    summary: input.summary,
    primaryObject: activityObjectRef(input.primaryObject),
    relatedObjects: (input.relatedObjects ?? []).map(activityObjectRef),
    ...(input.details ? { details: input.details } : {}),
    ...(input.correlationId ? { correlationId: input.correlationId } : {}),
    ...(typeof input.sequence === 'number' ? { sequence: input.sequence } : {}),
    schemaVersion: ACTIVITY_EVENT_SCHEMA_VERSION,
  }
}
