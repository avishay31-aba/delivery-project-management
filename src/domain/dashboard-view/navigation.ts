import { routePathForBusinessReference } from '@/domain/business-reference'
import type { DashboardViewScope } from './types'

type DashboardRowRecord = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function routeForActivityObject(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as DashboardRowRecord
  const routePath = text(record.routePath)
  if (routePath) return routePath
  const objectType = text(record.objectType)
  const businessId = text(record.businessId) || text(record.id)
  if (!objectType || !businessId) return null
  return routePathForBusinessReference(objectType, businessId)
}

export function dashboardRecordRoutePath(scope: DashboardViewScope, row: unknown): string | null {
  const record = row as DashboardRowRecord
  if (!record || typeof record !== 'object') return null

  switch (scope) {
    case 'customers':
      return routePathForBusinessReference('CUSTOMER', text(record.accountCode) || text(record.customerId) || text(record.id))
    case 'opportunities':
      return routePathForBusinessReference('OPPORTUNITY', text(record.opportunityId) || text(record.id))
    case 'projects':
      return routePathForBusinessReference('PROJECT', text(record.pid) || text(record.id))
    case 'systems':
      return routePathForBusinessReference('SYSTEM', text(record.sid) || text(record.machineId) || text(record.systemIdentity) || text(record.id))
    case 'productionSystemInventory':
      return routePathForBusinessReference('PRODUCTION_SYSTEM', text(record.sid) || text(record.id))
    case 'reusedInternalSystems':
      return routePathForBusinessReference('INTERNAL_REUSED_SYSTEM', text(record.machineId) || text(record.mid) || text(record.id))
    case 'tenants':
      return routePathForBusinessReference('TENANT', text(record.tid) || text(record.tenantTid) || text(record.id))
    case 'warranties':
    case 'renewals':
      return routePathForBusinessReference('TENANT', text(record.tenantTid) || text(record.tid))
    case 'requirementCoverage':
      return (
        routePathForBusinessReference('PROJECT', text(record.pid)) ??
        routePathForBusinessReference('OPPORTUNITY', text(record.opportunityId)) ??
        routePathForBusinessReference('TENANT', text(record.tid))
      )
    case 'activityLog':
      return routeForActivityObject(record.primaryObject)
    case 'infrastructure':
      return routePathForBusinessReference('INFRASTRUCTURE_ITEM', text(record.infrastructureId) || text(record.id))
    case 'infrastructurePlannedMaintenance':
    case 'infrastructureCurrentMaintenance': {
      const routePath = routePathForBusinessReference('INFRASTRUCTURE_ITEM', text(record.infrastructureItemId) || text(record.infrastructureId) || text(record.id))
      return routePath ? `${routePath}?section=maintenance` : null
    }
    default:
      return null
  }
}

export function dashboardRecordModeRoutePath(scope: DashboardViewScope, row: unknown, mode: 'view' | 'edit'): string | null {
  const routePath = dashboardRecordRoutePath(scope, row)
  if (!routePath) return null
  const separator = routePath.includes('?') ? '&' : '?'
  return `${routePath}${separator}mode=${mode}`
}
