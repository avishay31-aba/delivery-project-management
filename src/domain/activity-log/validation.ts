import {
  ACTIVITY_EVENT_CATEGORIES,
  ACTIVITY_EVENT_SEVERITIES,
  ACTIVITY_EVENT_SOURCES,
} from './metadata'
import type { ActivityEvent, ActivityObjectRef } from './types'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function validateActivityObjectRefShape(value: unknown): value is ActivityObjectRef {
  return isRecord(value) &&
    isString(value.objectType) &&
    isString(value.id) &&
    isString(value.businessId) &&
    isString(value.displayLabel) &&
    (value.routePath === undefined || isString(value.routePath))
}

export function validateActivityEventShape(value: unknown): value is ActivityEvent {
  return isRecord(value) &&
    isString(value.id) &&
    isString(value.occurredAt) &&
    (value.actorId === null || isString(value.actorId)) &&
    isString(value.actorName) &&
    ACTIVITY_EVENT_SOURCES.includes(value.source as ActivityEvent['source']) &&
    isString(value.eventType) &&
    ACTIVITY_EVENT_SEVERITIES.includes(value.severity as ActivityEvent['severity']) &&
    ACTIVITY_EVENT_CATEGORIES.includes(value.category as ActivityEvent['category']) &&
    validateActivityObjectRefShape(value.primaryObject) &&
    Array.isArray(value.relatedObjects) &&
    value.relatedObjects.every(validateActivityObjectRefShape) &&
    isString(value.summary) &&
    (value.details === undefined || isString(value.details)) &&
    (value.before === undefined || isRecord(value.before)) &&
    (value.after === undefined || isRecord(value.after)) &&
    (value.metadata === undefined || isRecord(value.metadata)) &&
    (value.correlationId === undefined || isString(value.correlationId)) &&
    (value.sequence === undefined || typeof value.sequence === 'number') &&
    typeof value.schemaVersion === 'number'
}
