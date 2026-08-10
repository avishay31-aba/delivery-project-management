export type DashboardViewScope =
  | 'opportunities'
  | 'projects'
  | 'deletedProjects'
  | 'systems'
  | 'productionSystemInventory'
  | 'reusedInternalSystems'
  | 'tenants'
  | 'warranties'
  | 'renewals'
  | 'customers'
  | 'requirementCoverage'
  | 'activityLog'
  | 'infrastructure'
  | 'infrastructurePlannedMaintenance'
  | 'infrastructureCurrentMaintenance'

export interface DashboardViewColumnFilter {
  id: string
  value: unknown
}

export interface DashboardViewSortingRule {
  id: string
  desc: boolean
}

export interface DashboardViewState {
  columnOrder: string[]
  columnVisibility: Record<string, boolean>
  columnFilters: DashboardViewColumnFilter[]
  sorting: DashboardViewSortingRule[]
  grouping: string[]
  globalFilter: string
}

export interface SavedDashboardView {
  id: string
  name: string
  state: DashboardViewState
  createdAt: string
  updatedAt: string
}

export interface DashboardViewsForScope {
  defaultViewId: string
  views: SavedDashboardView[]
}

export interface PersistedDashboardViews {
  version: 1
  dashboards: Record<DashboardViewScope, DashboardViewsForScope>
}

export interface RuntimeDashboardView extends SavedDashboardView {
  isFullDashboard: boolean
  isDefault: boolean
}

export interface DashboardViewMutationResult {
  dashboardViews: PersistedDashboardViews
}

export interface CreatedDashboardViewResult extends DashboardViewMutationResult {
  view: SavedDashboardView
}
