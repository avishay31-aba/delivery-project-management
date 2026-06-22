import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { AlertStatusIcon, LinkId, ProgressBar, StatusBadge } from '@/components/ui'
import type { Project, ProjectSystemLink, ProjectTenantLink, System, Tenant } from '@/data/seed.types'
import {
  projectHealthReadModel,
  type ProjectHealthReadModel,
  type ProjectHealthStatus,
  projectDashboardCurrentMilestone,
  projectDashboardDeliveryDate,
  projectDashboardEmptyValue,
  projectDashboardEndUser,
  projectDashboardLastMilestone,
  projectDashboardMilestonesCompletion,
  projectDashboardOwner,
  projectDashboardPayingCustomer,
  projectDashboardProjectName,
  projectDashboardStatus,
  projectDashboardType,
} from '@/domain/project-lifecycle'

interface ProjectHealthColumnContext {
  systems: System[]
  tenants: Tenant[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
}

const EMPTY_PROJECT_HEALTH_CONTEXT: ProjectHealthColumnContext = {
  systems: [],
  tenants: [],
  projectSystems: [],
  projectTenants: [],
}

function projectHealth(project: Project, context: ProjectHealthColumnContext): ProjectHealthReadModel {
  return projectHealthReadModel({ project, ...context })
}

function projectHealthBadgeVariant(status: ProjectHealthStatus) {
  if (status === 'COMPLETED') return 'done'
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'error'
  if (status === 'WARNING') return 'warning'
  return 'default'
}

function projectHealthAlertVariant(status: ProjectHealthStatus) {
  if (status === 'AT_RISK' || status === 'BLOCKED') return 'danger'
  if (status === 'WARNING') return 'warning'
  if (status === 'COMPLETED') return 'success'
  return 'info'
}

export function createProjectListColumns(context: ProjectHealthColumnContext): DashboardColumn<Project>[] {
  return [
  { id: 'pid', label: 'PID#', getValue: (r) => r.pid, render: (r) => createElement(LinkId, { to: `/projects/${r.pid}` }, r.pid) },
  { id: 'projectName', label: 'Project Name', getValue: projectDashboardProjectName, editable: true, editKey: 'opportunityName' },
  { id: 'endUser', label: 'End User', getValue: projectDashboardEndUser, editable: true, editKey: 'accountName' },
  { id: 'payingCustomer', label: 'Paying Paying customer', getValue: projectDashboardPayingCustomer },
  { id: 'region', label: 'Region', getValue: projectDashboardEmptyValue },
  { id: 'country', label: 'Country', getValue: projectDashboardEmptyValue },
  { id: 'status', label: 'Status', getValue: projectDashboardStatus, editable: true, editKey: 'progressStatus', options: ['OPEN', 'IN_PROGRESS', 'DONE'] },
  {
    id: 'healthStatus',
    label: 'Health Status',
    getValue: (r) => projectHealth(r, context).healthLabel,
    render: (r) => {
      const health = projectHealth(r, context)
      return createElement(StatusBadge, {
        label: health.healthLabel,
        variant: projectHealthBadgeVariant(health.healthStatus),
      })
    },
  },
  {
    id: 'healthAlerts',
    label: 'Health Alerts',
    getValue: (r) => projectHealth(r, context).healthAlerts.join('; '),
    render: (r) => {
      const health = projectHealth(r, context)
      if (health.healthAlerts.length === 0) return ''
      return createElement(
        'span',
        { className: 'inline-flex items-center gap-1.5' },
        createElement(AlertStatusIcon, { variant: projectHealthAlertVariant(health.healthStatus), label: health.healthAlerts.join('; ') }),
        health.healthAlerts.join('; '),
      )
    },
  },
  { id: 'deliveryDate', label: 'Delivery Date', getValue: projectDashboardDeliveryDate, editable: true, editKey: 'deliveryDate' },
  { id: 'deliveryDateStatus', label: 'Delivery Date Status', getValue: (r) => projectHealth(r, context).deliveryDateStatusLabel },
  { id: 'deliveryDurationDays', label: 'Delivery Duration (Days)', getValue: projectDashboardEmptyValue },
  { id: 'pocStartDate', label: 'POC Start Date', getValue: projectDashboardEmptyValue },
  { id: 'pocEndDate', label: 'POC End Date', getValue: projectDashboardEmptyValue },
  { id: 'completionDate', label: 'Completion Date', getValue: projectDashboardEmptyValue },
  { id: 'brand', label: 'Brand', getValue: projectDashboardEmptyValue },
  { id: 'type', label: 'Type', getValue: projectDashboardType, editable: true, editKey: 'mainType', options: ['POC', 'DELIVERY', 'RENEWAL'] },
  { id: 'hosting', label: 'Hosting', getValue: projectDashboardEmptyValue },
  { id: 'systems', label: 'Systems', getValue: projectDashboardEmptyValue },
  { id: 'modules', label: 'Modules', getValue: projectDashboardEmptyValue },
  { id: 'licenses', label: 'Licenses', getValue: projectDashboardEmptyValue },
  { id: 'users', label: 'Users', getValue: projectDashboardEmptyValue },
  { id: 'projectAlerts', label: 'Project Alerts', getValue: projectDashboardEmptyValue },
  { id: 'lastMilestone', label: 'Last Milestone', getValue: projectDashboardLastMilestone },
  { id: 'currentMilestone', label: 'Current Milestone', getValue: projectDashboardCurrentMilestone },
  {
    id: 'percent',
    label: 'Completion %',
    getValue: (r) => projectHealth(r, context).completionPercent,
    render: (r) => createElement(ProgressBar, { value: projectHealth(r, context).completionPercent, className: 'min-w-32' }),
  },
  { id: 'milestonesCompletion', label: 'Milestones Completion', getValue: projectDashboardMilestonesCompletion },
  { id: 'openTasks', label: 'Open Tasks', getValue: (r) => projectHealth(r, context).openTaskCount },
  { id: 'completedTasks', label: 'Completed Tasks', getValue: (r) => projectHealth(r, context).completedTaskCount },
  { id: 'systemsAllocated', label: 'Systems Allocated', getValue: (r) => projectHealth(r, context).activeSystemCount },
  { id: 'tenantsAllocated', label: 'Tenants Allocated', getValue: (r) => projectHealth(r, context).activeTenantCount },
  { id: 'financialProfile', label: 'Financial Profile', getValue: projectDashboardEmptyValue },
  { id: 'directChannel', label: 'Direct/Channel', getValue: projectDashboardEmptyValue },
  { id: 'owner', label: 'Owner', getValue: projectDashboardOwner, editable: true, editKey: 'dealOwner' },
  { id: 'sales', label: 'Sales', getValue: projectDashboardEmptyValue },
  { id: 'finance', label: 'Finance', getValue: projectDashboardEmptyValue },
]
}

export const projectListColumns: DashboardColumn<Project>[] = createProjectListColumns(EMPTY_PROJECT_HEALTH_CONTEXT)
