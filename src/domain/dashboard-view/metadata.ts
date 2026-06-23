import type { DashboardViewScope } from './types'

export const DASHBOARD_VIEWS_VERSION = 1
export const FULL_DASHBOARD_VIEW_ID = 'full-dashboard'
export const FULL_DASHBOARD_VIEW_NAME = 'Full Dashboard'

export const DASHBOARD_VIEW_SCOPES: DashboardViewScope[] = [
  'opportunities',
  'projects',
  'systems',
  'productionSystemInventory',
  'reusedInternalSystems',
  'tenants',
  'warranties',
  'renewals',
  'customers',
  'requirementCoverage',
]
