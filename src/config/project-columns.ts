import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { Project } from '@/data/seed.types'
import { deriveProjectProgress } from '@/domain/milestone-plan'

function ProgressBar({ value }: { value: number }) {
  return createElement(
    'div',
    { className: 'min-w-32' },
    createElement(
      'div',
      { className: 'h-2 overflow-hidden rounded-full bg-sf-surface-alt' },
      createElement('div', { className: 'h-full bg-sf-brand', style: { width: `${value}%` } }),
    ),
    createElement('span', { className: 'mt-1 block text-xs text-sf-text-muted' }, `${value}%`),
  )
}

export const projectListColumns: DashboardColumn<Project>[] = [
  { id: 'pid', label: 'PID#', getValue: (r) => r.pid },
  { id: 'projectName', label: 'Project Name', getValue: (r) => r.opportunityName, editable: true, editKey: 'opportunityName' },
  { id: 'endUser', label: 'End User', getValue: (r) => r.accountName, editable: true, editKey: 'accountName' },
  { id: 'payingCustomer', label: 'Paying Paying customer', getValue: (r) => r.accountName },
  { id: 'region', label: 'Region', getValue: () => '' },
  { id: 'country', label: 'Country', getValue: () => '' },
  { id: 'status', label: 'Status', getValue: (r) => r.progressStatus, editable: true, editKey: 'progressStatus', options: ['OPEN', 'IN_PROGRESS', 'DONE'] },
  { id: 'deliveryDate', label: 'Delivery Date', getValue: (r) => r.deliveryDate ?? '', editable: true, editKey: 'deliveryDate' },
  { id: 'deliveryDurationDays', label: 'Delivery Duration (Days)', getValue: () => '' },
  { id: 'pocStartDate', label: 'POC Start Date', getValue: () => '' },
  { id: 'pocEndDate', label: 'POC End Date', getValue: () => '' },
  { id: 'completionDate', label: 'Completion Date', getValue: () => '' },
  { id: 'brand', label: 'Brand', getValue: () => '' },
  { id: 'type', label: 'Type', getValue: (r) => r.mainType, editable: true, editKey: 'mainType', options: ['POC', 'DELIVERY', 'RENEWAL'] },
  { id: 'hosting', label: 'Hosting', getValue: () => '' },
  { id: 'systems', label: 'Systems', getValue: () => '' },
  { id: 'modules', label: 'Modules', getValue: () => '' },
  { id: 'licenses', label: 'Licenses', getValue: () => '' },
  { id: 'users', label: 'Users', getValue: () => '' },
  { id: 'projectAlerts', label: 'Project Alerts', getValue: () => '' },
  { id: 'lastMilestone', label: 'Last Milestone', getValue: (r) => deriveProjectProgress(r).lastMilestone },
  { id: 'currentMilestone', label: 'Current Milestone', getValue: (r) => deriveProjectProgress(r).currentMilestone },
  { id: 'percent', label: '%', getValue: (r) => deriveProjectProgress(r).percent, render: (r) => createElement(ProgressBar, { value: deriveProjectProgress(r).percent }) },
  { id: 'milestonesCompletion', label: 'Milestones Completion', getValue: (r) => `${deriveProjectProgress(r).percent}%` },
  { id: 'financialProfile', label: 'Financial Profile', getValue: () => '' },
  { id: 'directChannel', label: 'Direct/Channel', getValue: () => '' },
  { id: 'owner', label: 'Owner', getValue: (r) => r.dealOwner, editable: true, editKey: 'dealOwner' },
  { id: 'sales', label: 'Sales', getValue: () => '' },
  { id: 'finance', label: 'Finance', getValue: () => '' },
]
