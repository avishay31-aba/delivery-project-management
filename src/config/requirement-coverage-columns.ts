import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { AlertStatusIcon, BusinessIdLink, StatusBadge } from '@/components/ui'
import type { RequirementCoverageRow } from '@/domain/requirement-coverage'
import {
  alertVariantForRequirementCoverageStatus,
  badgeVariantForRequirementCoverageStatus,
} from '@/domain/status-presentation'

function text(value: string | number | null | undefined): string | number {
  return value ?? ''
}

function systemIdentity(row: RequirementCoverageRow): string {
  return row.sid || row.mid
}

export function createRequirementCoverageColumns(): DashboardColumn<RequirementCoverageRow>[] {
  return [
    {
      id: 'opportunityId',
      label: 'Opportunity ID',
      getValue: (row) => row.opportunityId,
      render: (row) => row.opportunityId ? createElement(BusinessIdLink, { objectType: 'OPPORTUNITY', businessId: row.opportunityId }, row.opportunityId) : '',
    },
    { id: 'opportunityName', label: 'Opportunity Name', getValue: (row) => row.opportunityName },
    { id: 'customerName', label: 'Customer', getValue: (row) => row.customerName },
    { id: 'requirementId', label: 'Requirement ID', getValue: (row) => row.requirementId },
    { id: 'requirementType', label: 'Requirement Type', getValue: (row) => row.requirementType },
    { id: 'requirementGrid', label: 'Requirement Grid', getValue: (row) => row.requirementGrid },
    { id: 'product', label: 'Product', getValue: (row) => row.product },
    { id: 'hostingType', label: 'Hosting', getValue: (row) => row.hostingType },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform },
    { id: 'deploymentTarget', label: 'Deployment Target', getValue: (row) => row.deploymentTarget },
    {
      id: 'pid',
      label: 'PID',
      getValue: (row) => row.pid,
      render: (row) => row.pid ? createElement(BusinessIdLink, { objectType: 'PROJECT', businessId: row.pid }, row.pid) : '',
    },
    { id: 'systemIdentity', label: 'SID / MID', getValue: systemIdentity },
    {
      id: 'tid',
      label: 'TID',
      getValue: (row) => row.tid,
      render: (row) => row.tid ? createElement(BusinessIdLink, { objectType: 'TENANT', businessId: row.tid }, row.tid) : '',
    },
    {
      id: 'coverageStatus',
      label: 'Coverage Status',
      getValue: (row) => row.coverageStatusLabel,
      render: (row) => createElement(StatusBadge, { label: row.coverageStatusLabel, variant: badgeVariantForRequirementCoverageStatus(row.coverageStatus) }),
    },
    { id: 'missingStep', label: 'Missing Step', getValue: (row) => row.missingStepLabel },
    {
      id: 'alerts',
      label: 'Alerts',
      getValue: (row) => row.coverageAlerts.join('; '),
      render: (row) =>
        row.coverageAlerts.length > 0
          ? createElement(
              'span',
              { className: 'inline-flex items-center gap-1.5' },
              createElement(AlertStatusIcon, { variant: alertVariantForRequirementCoverageStatus(row.coverageStatus), label: row.coverageAlerts.join('; ') }),
              row.coverageAlerts.join('; '),
            )
          : '',
    },
    { id: 'linkedProjectCount', label: 'Linked Project Count', getValue: (row) => text(row.linkedProjectCount) },
    { id: 'linkedSystemCount', label: 'Linked System Count', getValue: (row) => text(row.linkedSystemCount) },
    { id: 'linkedTenantCount', label: 'Linked Tenant Count', getValue: (row) => text(row.linkedTenantCount) },
  ]
}
