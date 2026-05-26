import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/layouts/AppShell'
import { ProjectListPage } from '@/pages/projects/ProjectListPage'
import { ProjectFormPage } from '@/pages/projects/ProjectFormPage'
import { SystemListPage } from '@/pages/systems/SystemListPage'
import { SystemFormPage } from '@/pages/systems/SystemFormPage'
import { TenantListPage } from '@/pages/tenants/TenantListPage'
import { TenantFormPage } from '@/pages/tenants/TenantFormPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/projects" replace /> },
      { path: 'projects', element: <ProjectListPage /> },
      { path: 'projects/:pid', element: <ProjectFormPage /> },
      { path: 'systems', element: <SystemListPage /> },
      { path: 'systems/:sid', element: <SystemFormPage /> },
      { path: 'tenants', element: <TenantListPage /> },
      { path: 'tenants/:tid', element: <TenantFormPage /> },
    ],
  },
])
