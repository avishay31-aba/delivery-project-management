import { ACTIVITY_EVENT_SCHEMA_VERSION } from './metadata'
import { validateActivityEventShape, validateActivityObjectRefShape } from './validation'
import type { ActivityEvent, ActivityObjectRef } from './types'

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
