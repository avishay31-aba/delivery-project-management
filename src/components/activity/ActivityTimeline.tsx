import { useMemo, useState } from 'react'
import type { ActivityEvent, ActivityEventCategory, ActivityObjectRef } from '@/domain/activity-log'
import { ACTIVITY_EVENT_CATEGORY_LABELS, ACTIVITY_EVENT_CATEGORIES } from '@/domain/activity-log'
import { AlertStatusIcon, StatusBadge, type AlertStatusIconVariant } from '@/components/ui'
import {
  alertVariantForActivitySeverity,
  badgeVariantForActivitySeverity,
} from '@/domain/status-presentation'
import { formatDateTimeSeconds } from '@/domain/date-time-presentation'

function severityVariant(severity: ActivityEvent['severity']): AlertStatusIconVariant {
  return alertVariantForActivitySeverity(severity)
}

function badgeVariant(severity: ActivityEvent['severity']) {
  return badgeVariantForActivitySeverity(severity)
}

function objectLabel(ref: ActivityObjectRef): string {
  return ref.displayLabel || ref.businessId || ref.id
}

function renderObjectRef(ref: ActivityObjectRef) {
  const label = objectLabel(ref)
  if (!label) return null
  return ref.routePath ? (
    <a className="text-sf-brand hover:underline" href={ref.routePath}>
      {label}
    </a>
  ) : (
    <span>{label}</span>
  )
}

export function ActivityTimeline({
  events,
  emptyText = 'No activity yet.',
  showCategoryFilter = true,
}: {
  events: ActivityEvent[]
  emptyText?: string
  showCategoryFilter?: boolean
}) {
  const [categoryFilter, setCategoryFilter] = useState<ActivityEventCategory | 'ALL'>('ALL')
  const visibleEvents = useMemo(
    () => categoryFilter === 'ALL' ? events : events.filter((event) => event.category === categoryFilter),
    [categoryFilter, events],
  )

  return (
    <div className="space-y-3">
      {showCategoryFilter ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm font-semibold text-sf-text" htmlFor="activity-category-filter">Category</label>
          <select
            id="activity-category-filter"
            className="h-8 rounded border border-sf-border bg-white px-2 py-1 text-sm text-sf-text"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as ActivityEventCategory | 'ALL')}
          >
            <option value="ALL">All</option>
            {ACTIVITY_EVENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{ACTIVITY_EVENT_CATEGORY_LABELS[category]}</option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border border-sf-border bg-white">
        <table className="min-w-full border-collapse text-sm leading-tight">
          <thead className="bg-sf-surface-alt text-left">
            <tr>
              {['Occurred At', 'Severity', 'Category', 'Event Type', 'Summary', 'Actor', 'Primary Object', 'Related Objects'].map((header) => (
                <th key={header} className="whitespace-nowrap border border-sf-border px-2 py-1 text-sm font-semibold text-sf-text">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleEvents.length > 0 ? visibleEvents.map((event) => (
              <tr key={event.id} className="hover:bg-sf-surface-alt">
                <td className="whitespace-nowrap border border-sf-border px-2 py-1 align-top text-sf-text">{formatDateTimeSeconds(event.occurredAt)}</td>
                <td className="whitespace-nowrap border border-sf-border px-2 py-1 align-top text-sf-text">
                  <span className="inline-flex items-center gap-1.5">
                    <AlertStatusIcon variant={severityVariant(event.severity)} label={event.severity} />
                    <StatusBadge label={event.severity} variant={badgeVariant(event.severity)} />
                  </span>
                </td>
                <td className="whitespace-nowrap border border-sf-border px-2 py-1 align-top text-sf-text">{ACTIVITY_EVENT_CATEGORY_LABELS[event.category]}</td>
                <td className="whitespace-nowrap border border-sf-border px-2 py-1 align-top font-mono text-xs text-sf-text">{event.eventType}</td>
                <td className="min-w-64 border border-sf-border px-2 py-1 align-top text-sf-text">{event.summary}</td>
                <td className="whitespace-nowrap border border-sf-border px-2 py-1 align-top text-sf-text">{event.actorName}</td>
                <td className="whitespace-nowrap border border-sf-border px-2 py-1 align-top text-sf-text">{renderObjectRef(event.primaryObject)}</td>
                <td className="border border-sf-border px-2 py-1 align-top text-sf-text">
                  {event.relatedObjects.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {event.relatedObjects.map((ref) => (
                        <span key={`${event.id}-${ref.objectType}-${ref.id}-${ref.businessId}`} className="rounded border border-sf-border bg-sf-surface-alt px-1.5 py-0.5 text-xs">
                          {renderObjectRef(ref)}
                        </span>
                      ))}
                    </div>
                  ) : ''}
                </td>
              </tr>
            )) : (
              <tr>
                <td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={8}>{emptyText}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
