import type { ActivityObjectRefInput } from '@/domain/activity-log'
import type { BusinessObjectReference } from './types'

function activityObjectType(reference: BusinessObjectReference): string {
  if (reference.objectType === 'ACCOUNT') return 'CUSTOMER'
  if (reference.objectType === 'PRODUCTION_SYSTEM' || reference.objectType === 'INTERNAL_REUSED_SYSTEM') return 'SYSTEM'
  return reference.objectType
}

export function activityObjectRefFromBusinessReference(reference: BusinessObjectReference): ActivityObjectRefInput {
  return {
    objectType: activityObjectType(reference),
    id: reference.internalId ?? reference.businessId,
    businessId: reference.businessId,
    displayLabel: reference.displayLabel,
    ...(reference.routePath ? { routePath: reference.routePath } : {}),
  }
}
