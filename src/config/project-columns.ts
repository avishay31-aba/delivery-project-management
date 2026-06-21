import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { Project } from '@/data/seed.types'
import {
  projectDashboardCurrentMilestone,
  projectDashboardDeliveryDate,
  projectDashboardEmptyValue,
  projectDashboardEndUser,
  projectDashboardLastMilestone,
  projectDashboardMilestonesCompletion,
  projectDashboardOwner,
  projectDashboardPayingCustomer,
  projectDashboardPercent,
  projectDashboardProjectName,
  projectDashboardStatus,
  projectDashboardType,
} from '@/domain/project-lifecycle'

function ProgressBar({ value }: { value: number }) {
  const fillClassName = value >= 100 ? 'h-full bg-blue-900' : 'h-full bg-amber-500'

  return createElement(
    'div',
    { className: 'min-w-32' },
    createElement(
      'div',
      { className: 'h-3.5 overflow-hidden rounded-full bg-sf-surface-alt' },
      createElement('div', { className: fillClassName, style: { width: `${value}%` } }),
    ),
    createElement('span', { className: 'mt-1 block text-xs text-sf-text-muted' }, `${value}%`),
  )
}

export const projectListColumns: DashboardColumn<Project>[] = [
  { id: 'pid', label: 'PID#', getValue: (r) => r.pid },
  { id: 'projectName', label: 'Project Name', getValue: projectDashboardProjectName, editable: true, editKey: 'opportunityName' },
  { id: 'endUser', label: 'End User', getValue: projectDashboardEndUser, editable: true, editKey: 'accountName' },
  { id: 'payingCustomer', label: 'Paying Paying customer', getValue: projectDashboardPayingCustomer },
  { id: 'region', label: 'Region', getValue: projectDashboardEmptyValue },
  { id: 'country', label: 'Country', getValue: projectDashboardEmptyValue },
  { id: 'status', label: 'Status', getValue: projectDashboardStatus, editable: true, editKey: 'progressStatus', options: ['OPEN', 'IN_PROGRESS', 'DONE'] },
  { id: 'deliveryDate', label: 'Delivery Date', getValue: projectDashboardDeliveryDate, editable: true, editKey: 'deliveryDate' },
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
  { id: 'percent', label: '%', getValue: projectDashboardPercent, render: (r) => createElement(ProgressBar, { value: projectDashboardPercent(r) }) },
  { id: 'milestonesCompletion', label: 'Milestones Completion', getValue: projectDashboardMilestonesCompletion },
  { id: 'financialProfile', label: 'Financial Profile', getValue: projectDashboardEmptyValue },
  { id: 'directChannel', label: 'Direct/Channel', getValue: projectDashboardEmptyValue },
  { id: 'owner', label: 'Owner', getValue: projectDashboardOwner, editable: true, editKey: 'dealOwner' },
  { id: 'sales', label: 'Sales', getValue: projectDashboardEmptyValue },
  { id: 'finance', label: 'Finance', getValue: projectDashboardEmptyValue },
]
