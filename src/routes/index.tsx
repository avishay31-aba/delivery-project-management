import { Navigate, createHashRouter } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { OpportunityListPage } from '@/pages/opportunities/OpportunityListPage'
import { OpportunityFormPage } from '@/pages/opportunities/OpportunityFormPage'
import { Customer360Page } from '@/pages/customers/Customer360Page'
import { CustomerListPage } from '@/pages/customers/CustomerListPage'
import { ProjectListPage } from '@/pages/projects/ProjectListPage'
import { ProjectFormPage } from '@/pages/projects/ProjectFormPage'
import { SystemFormPage } from '@/pages/systems/SystemFormPage'
import { SystemsWorkspacePage } from '@/pages/systems/SystemsWorkspacePage'
import {
  ProductionSystemInventoryFormPage,
  ReusedInternalSystemFormPage,
} from '@/pages/systems/SystemInventoryFormPages'
import { TenantListPage } from '@/pages/tenants/TenantListPage'
import { TenantFormPage } from '@/pages/tenants/TenantFormPage'
import { WarrantyDashboardPage } from '@/pages/warranties/WarrantyDashboardPage'
import { RequirementCoverageDashboardPage } from '@/pages/requirement-coverage/RequirementCoverageDashboardPage'
import { RenewalWorkQueuePage } from '@/pages/renewals/RenewalWorkQueuePage'
import { ActivityLogDashboardPage } from '@/pages/activity-log/ActivityLogDashboardPage'
import { TimeGroupSettingsPage } from '@/pages/admin/TimeGroupSettingsPage'
import { InfrastructureListPage } from '@/pages/infrastructure/InfrastructureListPage'
import { InfrastructureFormPage } from '@/pages/infrastructure/InfrastructureFormPage'

export const router = createHashRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'customers', element: <CustomerListPage /> },
      { path: 'customers/:accountCode', element: <Customer360Page /> },
      { path: 'accounts', element: <CustomerListPage /> },
      { path: 'opportunities', element: <OpportunityListPage /> },
      { path: 'opportunities/:opportunityId', element: <OpportunityFormPage /> },
      { path: 'projects', element: <ProjectListPage /> },
      { path: 'projects/:pid', element: <ProjectFormPage /> },
      { path: 'systems', element: <SystemsWorkspacePage /> },
      { path: 'systems/production-inventory', element: <SystemsWorkspacePage /> },
      { path: 'systems/production-inventory/:sid', element: <ProductionSystemInventoryFormPage /> },
      { path: 'systems/reused-internal', element: <SystemsWorkspacePage /> },
      { path: 'systems/reused-internal/:mid', element: <ReusedInternalSystemFormPage /> },
      { path: 'systems/:sid', element: <SystemFormPage /> },
      { path: 'tenants', element: <TenantListPage /> },
      { path: 'tenants/:tid', element: <TenantFormPage /> },
      { path: 'warranties', element: <WarrantyDashboardPage /> },
      { path: 'renewals', element: <RenewalWorkQueuePage /> },
      { path: 'requirement-coverage', element: <RequirementCoverageDashboardPage /> },
      { path: 'activity-log', element: <ActivityLogDashboardPage /> },
      { path: 'admin/time-groups', element: <TimeGroupSettingsPage /> },
      { path: 'infrastructure', element: <InfrastructureListPage /> },
      { path: 'infrastructure/:infrastructureId', element: <InfrastructureFormPage /> },
    ],
  },
])
