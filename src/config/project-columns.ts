import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { AlertStatusIcon, BusinessObjectLink, ProgressBar, StatusBadge } from '@/components/ui'
import type {
  Account,
  Opportunity,
  Project,
  ProjectSystemLink,
  ProjectTenantLink,
  SalesManager,
  System,
  Tenant,
} from '@/data/seed.types'
import {
  projectDeliveryDashboardReadModel,
  type ProjectDeliveryDashboardReadModel,
} from '@/domain/project-lifecycle'
import { projectReference } from '@/domain/business-reference'

interface ProjectDashboardColumnContext {
  opportunities: Opportunity[]
  accounts: Account[]
  salesManagers: SalesManager[]
  systems: System[]
  tenants: Tenant[]
  projectSystems: ProjectSystemLink[]
  projectTenants: ProjectTenantLink[]
}

const EMPTY_PROJECT_DASHBOARD_CONTEXT: ProjectDashboardColumnContext = {
  opportunities: [],
  accounts: [],
  salesManagers: [],
  systems: [],
  tenants: [],
  projectSystems: [],
  projectTenants: [],
}

function projectRow(project: Project, context: ProjectDashboardColumnContext): ProjectDeliveryDashboardReadModel {
  return projectDeliveryDashboardReadModel({ project, ...context })
}

function projectStatusVariant(status: string) {
  if (status === 'DONE') return 'done'
  return 'open'
}

function renderChips(values: string[], title?: string) {
  const visibleValues = values.filter(Boolean)
  if (visibleValues.length === 0) return ''

  return createElement(
    'span',
    { className: 'inline-flex max-w-80 flex-wrap gap-1', title },
    visibleValues.map((value) =>
      createElement(
        'span',
        {
          key: value,
          className: 'rounded border border-sf-border bg-sf-surface-alt px-1.5 py-0.5 text-xs font-medium text-sf-text',
        },
        value,
      ),
    ),
  )
}

function splitDashboardValues(value: string): string[] {
  return value.split(';').map((part) => part.trim()).filter(Boolean)
}

export function createProjectListColumns(context: ProjectDashboardColumnContext): DashboardColumn<Project>[] {
  return [
    { id: 'pid', label: 'PID', getValue: (project) => projectRow(project, context).pid, render: (project) => createElement(BusinessObjectLink, { reference: projectReference(project) }, project.pid) },
    { id: 'projectName', label: 'Project Name', getValue: (project) => projectRow(project, context).projectName, editable: true, editKey: 'opportunityName' },
    { id: 'endUser', label: 'End User', getValue: (project) => projectRow(project, context).endUser },
    { id: 'payingCustomer', label: 'Paying Customer', getValue: (project) => projectRow(project, context).payingCustomer },
    { id: 'region', label: 'Region', getValue: (project) => projectRow(project, context).region },
    { id: 'country', label: 'Country', getValue: (project) => projectRow(project, context).country },
    {
      id: 'status',
      label: 'Status',
      getValue: (project) => projectRow(project, context).statusLabel,
      editable: true,
      editKey: 'progressStatus',
      options: ['OPEN', 'DONE'],
      render: (project) => {
        const row = projectRow(project, context)
        return createElement(StatusBadge, { label: row.statusLabel, variant: projectStatusVariant(row.status) })
      },
    },
    { id: 'deliveryDate', label: 'Delivery Date', getValue: (project) => projectRow(project, context).deliveryDate, editable: true, editKey: 'deliveryDate' },
    { id: 'pocStartDate', label: 'POC Start Date', getValue: (project) => projectRow(project, context).pocStartDate },
    { id: 'pocEndDate', label: 'POC End Date', getValue: (project) => projectRow(project, context).pocEndDate },
    { id: 'type', label: 'Type', getValue: (project) => projectRow(project, context).type, editable: true, editKey: 'mainType', options: ['POC', 'DELIVERY', 'RENEWAL'] },
    { id: 'hosting', label: 'Hosting', getValue: (project) => projectRow(project, context).hosting },
    {
      id: 'product',
      label: 'Product',
      getValue: (project) => projectRow(project, context).product,
      render: (project) => renderChips(splitDashboardValues(projectRow(project, context).product)),
    },
    {
      id: 'modules',
      label: 'Modules & Features',
      getValue: (project) => projectRow(project, context).modules.join('; '),
      render: (project) => {
        const row = projectRow(project, context)
        return renderChips(row.modules, row.modulesTooltip)
      },
    },
    { id: 'licenses', label: 'Licenses', getValue: (project) => projectRow(project, context).licenses },
    { id: 'users', label: 'Users', getValue: (project) => projectRow(project, context).users },
    {
      id: 'projectAlerts',
      label: 'Project Alerts',
      getValue: (project) => projectRow(project, context).projectAlerts.join('; '),
      render: (project) => {
        const row = projectRow(project, context)
        if (row.projectAlerts.length === 0) return ''
        return createElement(
          'span',
          { className: 'inline-flex items-center gap-1.5' },
          createElement(AlertStatusIcon, { variant: row.projectAlertSeverity, label: row.projectAlerts.join('; ') }),
          row.projectAlerts.join('; '),
        )
      },
    },
    {
      id: 'milestonesCompletion',
      label: 'Milestone Completion',
      getValue: (project) => projectRow(project, context).milestoneCompletion,
      render: (project) => createElement(ProgressBar, { value: projectRow(project, context).milestoneCompletionPercent, className: 'min-w-32' }),
    },
    { id: 'lastMilestone', label: 'Last Milestone', getValue: (project) => projectRow(project, context).lastMilestone },
    { id: 'currentMilestone', label: 'Current Milestone', getValue: (project) => projectRow(project, context).currentMilestone },
    { id: 'financialProfile', label: 'Financial Profile', getValue: (project) => projectRow(project, context).financialProfile },
    { id: 'owner', label: 'Owner', getValue: (project) => projectRow(project, context).owner, editable: true, editKey: 'dealOwner' },
  ]
}

export const projectListColumns: DashboardColumn<Project>[] = createProjectListColumns(EMPTY_PROJECT_DASHBOARD_CONTEXT)
