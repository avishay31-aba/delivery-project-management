import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { OpportunityListPage } from '@/pages/opportunities/OpportunityListPage'
import { OpportunityFormPage } from '@/pages/opportunities/OpportunityFormPage'
import { Customer360Page } from '@/pages/customers/Customer360Page'
import { CustomerListPage } from '@/pages/customers/CustomerListPage'
import { ProjectListPage } from '@/pages/projects/ProjectListPage'
import { ProjectFormPage } from '@/pages/projects/ProjectFormPage'
import { SystemListPage } from '@/pages/systems/SystemListPage'
import { SystemFormPage } from '@/pages/systems/SystemFormPage'
import { ProductionSystemInventoryPage } from '@/pages/systems/ProductionSystemInventoryPage'
import { ReusedInternalSystemsInventoryPage } from '@/pages/systems/ReusedInternalSystemsInventoryPage'
import {
  ProductionSystemInventoryFormPage,
  ReusedInternalSystemFormPage,
} from '@/pages/systems/SystemInventoryFormPages'
import { TenantListPage } from '@/pages/tenants/TenantListPage'
import { TenantFormPage } from '@/pages/tenants/TenantFormPage'
import { WarrantyDashboardPage } from '@/pages/warranties/WarrantyDashboardPage'

export const router = createBrowserRouter([
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
      { path: 'systems', element: <SystemListPage /> },
      { path: 'systems/production-inventory', element: <ProductionSystemInventoryPage /> },
      { path: 'systems/production-inventory/:sid', element: <ProductionSystemInventoryFormPage /> },
      { path: 'systems/reused-internal', element: <ReusedInternalSystemsInventoryPage /> },
      { path: 'systems/reused-internal/:mid', element: <ReusedInternalSystemFormPage /> },
      { path: 'systems/:sid', element: <SystemFormPage /> },
      { path: 'tenants', element: <TenantListPage /> },
      { path: 'tenants/:tid', element: <TenantFormPage /> },
      { path: 'warranties', element: <WarrantyDashboardPage /> },
    ],
  },
])
