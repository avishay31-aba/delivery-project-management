import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessObjectLink, ProgressBar } from '@/components/ui'
import { ProjectAlertPresentation } from '@/components/projects/ProjectAlertPresentation'
import { ProjectStatusIcon } from '@/components/projects/ProjectStatusIcon'
import { DeletionReasonCell } from '@/components/lifecycle'
import { richTextPlainText } from '@/domain/rich-text'
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
  latestProjectDeletionEntry,
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
  includeDeletionReason?: boolean
}

const EMPTY_PROJECT_DASHBOARD_CONTEXT: ProjectDashboardColumnContext = {
  opportunities: [],
  accounts: [],
  salesManagers: [],
  systems: [],
  tenants: [],
  projectSystems: [],
  projectTenants: [],
  includeDeletionReason: false,
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
  const projectRowCache = new WeakMap<Project, ProjectDeliveryDashboardReadModel>()
  const projectRow = (project: Project): ProjectDeliveryDashboardReadModel => {
    const cachedRow = projectRowCache.get(project)
    if (cachedRow) return cachedRow
    const row = projectDeliveryDashboardReadModel({ project, ...context })
    projectRowCache.set(project, row)
    return row
  }

  return [
    ...(context.includeDeletionReason ? [{
      id: 'deletedBy',
      label: 'Deleted By',
      getValue: (project: Project) => latestProjectDeletionEntry(project)?.deletedBy ?? '',
    } satisfies DashboardColumn<Project>, {
      id: 'deletionReason',
      label: 'Deletion Reason',
      getValue: (project: Project) => richTextPlainText(latestProjectDeletionEntry(project)?.reason ?? project.deletionReason ?? ''),
      render: (project: Project) => createElement(DeletionReasonCell, { value: latestProjectDeletionEntry(project)?.reason ?? project.deletionReason ?? '' }),
    } satisfies DashboardColumn<Project>] : []),
    { id: 'pid', label: 'PID', getValue: (project) => projectRow(project).pid, render: (project) => createElement(BusinessObjectLink, { reference: projectReference(project) }, project.pid) },
    { id: 'projectName', label: 'Project Name', getValue: (project) => projectRow(project).projectName, editable: true, editKey: 'opportunityName' },
    { id: 'type', label: 'Type', getValue: (project) => projectRow(project).type, editable: true, editKey: 'mainType', options: ['POC', 'DELIVERY', 'RENEWAL'] },
    { id: 'subType', label: 'Sub Type', getValue: (project) => projectRow(project).subType },
    { id: 'endUser', label: 'End User', getValue: (project) => projectRow(project).endUser },
    { id: 'payingCustomer', label: 'Paying Customer', getValue: (project) => projectRow(project).payingCustomer },
    { id: 'region', label: 'Region', getValue: (project) => projectRow(project).region },
    { id: 'country', label: 'Country', getValue: (project) => projectRow(project).country },
    {
      id: 'status',
      label: 'Status',
      getValue: (project) => projectRow(project).statusLabel,
      render: (project) => {
        const row = projectRow(project)
        return createElement(ProjectStatusIcon, { status: row.status })
      },
    },
    {
      id: 'deliveryDate',
      label: 'Delivery Date',
      getValue: (project) => projectRow(project).deliveryDate,
      sortValue: (project) => projectRow(project).type === 'POC' ? projectRow(project).pocStartDate : projectRow(project).deliveryDate,
      editable: true,
      editKey: 'deliveryDate',
      semanticType: 'date',
    },
    { id: 'pocStartDate', label: 'POC Start Date', getValue: (project) => projectRow(project).pocStartDate, semanticType: 'date' },
    { id: 'pocEndDate', label: 'POC End Date', getValue: (project) => projectRow(project).pocEndDate, semanticType: 'date' },
    { id: 'hosting', label: 'Hosting', getValue: (project) => projectRow(project).hosting },
    {
      id: 'product',
      label: 'Product',
      getValue: (project) => projectRow(project).product,
      render: (project) => renderChips(splitDashboardValues(projectRow(project).product)),
    },
    {
      id: 'modules',
      label: 'Modules & Features',
      getValue: (project) => projectRow(project).modules.join('; '),
      render: (project) => {
        const row = projectRow(project)
        return renderChips(row.modules, row.modulesTooltip)
      },
    },
    { id: 'licenses', label: 'Licenses', getValue: (project) => projectRow(project).licenses },
    { id: 'users', label: 'Users', getValue: (project) => projectRow(project).users },
    {
      id: 'projectAlerts',
      label: 'Project Alerts',
      getValue: (project) => projectRow(project).projectAlerts.join('; '),
      render: (project) => {
        const row = projectRow(project)
        if (row.projectAlerts.length === 0) return ''
        return createElement(ProjectAlertPresentation, { alerts: row.projectAlerts })
      },
    },
    {
      id: 'milestonesCompletion',
      label: 'Milestone Completion',
      getValue: (project) => projectRow(project).milestoneCompletion,
      render: (project) => createElement(ProgressBar, { value: projectRow(project).milestoneCompletionPercent, className: 'min-w-32' }),
    },
    { id: 'lastMilestone', label: 'Last Milestone', getValue: (project) => projectRow(project).lastMilestone },
    { id: 'currentMilestone', label: 'Current Milestone', getValue: (project) => projectRow(project).currentMilestone },
    { id: 'financialProfile', label: 'Financial Profile', getValue: (project) => projectRow(project).financialProfile },
    { id: 'owner', label: 'Owner', getValue: (project) => projectRow(project).owner, editable: true, editKey: 'dealOwner' },
  ]
}

export const projectListColumns: DashboardColumn<Project>[] = createProjectListColumns(EMPTY_PROJECT_DASHBOARD_CONTEXT)
