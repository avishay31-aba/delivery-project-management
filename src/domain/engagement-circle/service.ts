import type { EngagementCircle } from './types'

export function engagementCircleSnapshot(contacts: EngagementCircle | undefined): EngagementCircle {
  return Array.isArray(contacts) ? contacts : []
}
