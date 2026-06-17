import type { EngagementCircle } from './types'
import { engagementCircleSnapshot } from './service'

export function normalizeEngagementCircleSnapshot(contacts: EngagementCircle | undefined): EngagementCircle {
  return engagementCircleSnapshot(contacts)
}
