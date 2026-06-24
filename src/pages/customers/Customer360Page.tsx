import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ActivityTimeline } from '@/components/activity'
import { PageHeader } from '@/components/record'
import { PlaceholderCard } from '@/components/ui'
import type { Tenant } from '@/data/seed.types'
import {
  customerAccount360ReadModel,
  customerDisplayName,
  customerOpenProjects,
  customerProjectProgress,
  customerTypeLabel,
} from '@/domain/customer-account'
import { formatDocumentSize } from '@/domain/document-collection'
import { activityEventsForCustomer } from '@/domain/activity-log'
import { requirementCoverageRows } from '@/domain/requirement-coverage'
import { systemIdentity, systemRoutePath } from '@/domain/system-inventory'
import {
  warrantyDashboardRows,
} from '@/domain/warranty-collection'
import { useAppStore } from '@/store/useAppStore'

type Customer360Tab = 'overview' | 'opportunities' | 'projects' | 'systems' | 'tenants' | 'warranties' | 'documents' | 'activity'

const CUSTOMER_360_TABS: Array<{ id: Customer360Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'opportunities', label: 'Opportunities' },
  { id: 'projects', label: 'Projects' },
  { id: 'systems', label: 'Systems' },
  { id: 'tenants', label: 'Tenants' },
  { id: 'warranties', label: 'Warranties' },
  { id: 'documents', label: 'Documents' },
  { id: 'activity', label: 'Activity' },
]

function readOnlyValue(label: string, value: string) {
  return (
    <div className="rounded border border-sf-border bg-white p-3">
      <div className="text-xs font-semibold uppercase text-sf-text-muted">{label}</div>
      <div className="mt-1 text-sm font-medium text-sf-text">{value || '-'}</div>
    </div>
  )
}

function summaryCard(label: string, value: string | number) {
  return (
    <div className="rounded border border-sf-border bg-white p-3">
      <div className="text-xs font-semibold uppercase text-sf-text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-sf-text">{value}</div>
    </div>
  )
}

function readOnlyTable(headers: string[], rows: ReactNode[][], emptyText: string) {
  return (
    <div className="overflow-x-auto rounded border border-sf-border bg-white">
      <table className="min-w-full border-collapse text-sm leading-tight">
        <thead className="bg-sf-surface-alt text-left">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap border border-sf-border px-2 py-1 text-sm font-semibold text-sf-text">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-sf-surface-alt">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-sf-border px-2 py-1 align-top">{cell}</td>
              ))}
            </tr>
          )) : (
            <tr><td className="border border-sf-border px-3 py-4 text-sf-text-muted" colSpan={headers.length}>{emptyText}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function objectLink(to: string, label: string) {
  return label ? <Link className="text-sf-brand hover:underline" to={to}>{label}</Link> : ''
}

export function Customer360Page() {
  const { accountCode = '' } = useParams()
  const accounts = useAppStore((state) => state.accounts)
  const opportunities = useAppStore((state) => state.opportunities)
  const projects = useAppStore((state) => state.projects)
  const salesManagers = useAppStore((state) => state.salesManagers)
  const systems = useAppStore((state) => state.systems)
  const tenants = useAppStore((state) => state.tenants)
  const projectSystems = useAppStore((state) => state.projectSystems)
  const projectTenants = useAppStore((state) => state.projectTenants)
  const warrantyRecords = useAppStore((state) => state.warrantyRecords)
  const activityEvents = useAppStore((state) => state.activityEvents)
  const [activeTab, setActiveTab] = useState<Customer360Tab>('overview')

  const account = accounts.find((candidate) => candidate.accountCode === accountCode)
  const warrantyRows = useMemo(
    () =>
      warrantyDashboardRows({
        tenants,
        accountNameForTenant: (tenant: Tenant) => accounts.find((candidate) => candidate.id === tenant.accountId)?.accountName ?? tenant.accountName,
        accountManagerForTenant: (tenant: Tenant) => {
          const tenantAccount = accounts.find((candidate) => candidate.id === tenant.accountId)
          return salesManagers.find((manager) => manager.id === tenantAccount?.salesManagerId)?.name ?? ''
        },
        tenantNameForTenant: (tenant: Tenant) => tenant.tenantName || `${tenant.tid} ${tenant.accountName}`.trim(),
        sidForTenant: (tenant: Tenant) => {
          const system = systems.find((candidate) => candidate.id === (tenant.hostedSystemId ?? tenant.systemId))
          return system ? systemIdentity(system) : ''
        },
        productForTenant: (tenant: Tenant) => {
          const system = systems.find((candidate) => candidate.id === (tenant.hostedSystemId ?? tenant.systemId))
          return tenant.productType ?? system?.productType ?? ''
        },
        projectNameForProjectId: (projectId: string) => {
          const project = projects.find((candidate) => candidate.id === projectId)
          return project?.opportunityName ?? project?.pid ?? ''
        },
      }),
    [accounts, projects, salesManagers, systems, tenants],
  )

  const customer360 = useMemo(
    () =>
      account
        ? customerAccount360ReadModel({
            account,
            salesManagers,
            opportunities,
            projects,
            systems,
            tenants,
            projectSystems,
            projectTenants,
            warrantyRows,
            requirementCoverageRows: requirementCoverageRows({
              accounts,
              opportunities,
              projects,
              systems,
              tenants,
              warrantyRecords,
              projectSystems,
              projectTenants,
            }),
          })
        : null,
    [account, accounts, opportunities, projectSystems, projectTenants, projects, salesManagers, systems, tenants, warrantyRecords, warrantyRows],
  )

  if (!account || !customer360) {
    return (
      <PlaceholderCard
        title="Customer not found"
        description={`No customer with account code "${accountCode}" in the current store.`}
      />
    )
  }

  const customer = customer360
  const openProjects = customerOpenProjects(customer.projects)
  const projectHealthByProjectId = new Map(customer.projectHealthRows.map((row) => [row.projectId, row]))
  const customerActivityEvents = activityEventsForCustomer(activityEvents, account.id)

  function renderTabContent() {
    if (activeTab === 'overview') {
      return (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCard('Total Opportunities', customer.opportunities.length)}
          {summaryCard('Open Projects', openProjects.length)}
          {summaryCard('Warning Projects', customer.projectHealthSummary.warningProjects)}
          {summaryCard('At Risk Projects', customer.projectHealthSummary.atRiskProjects)}
          {summaryCard('Active Tenants', customer.tenants.filter((tenant) => tenant.operationalStatus !== 'Deleted').length)}
          {summaryCard('Warranty Renewal Candidates', customer.warrantySummary.renewalCandidates)}
        </div>
      )
    }

    if (activeTab === 'opportunities') {
      return readOnlyTable(
        ['Opportunity ID', 'Name', 'Stage', 'Type', 'Subtype', 'Delivery Date'],
        customer.opportunities.map((opportunity) => [
          objectLink(`/opportunities/${opportunity.opportunityId}`, opportunity.opportunityId),
          opportunity.opportunityName,
          opportunity.stage,
          opportunity.type,
          opportunity.subType,
          opportunity.deliveryDate ?? '',
        ]),
        'No opportunities found for this customer.',
      )
    }

    if (activeTab === 'projects') {
      return readOnlyTable(
        ['PID', 'Project Name', 'Type', 'Subtype', 'Status', 'Health Status', 'Delivery Date', 'Delivery Date Status', 'Completion %', 'Current Milestone', 'Deadline Risk', 'Next Deadline', 'Overdue Tasks', 'Alerts'],
        customer.projects.map((project) => {
          const health = projectHealthByProjectId.get(project.id)
          return [
            objectLink(`/projects/${project.pid}`, project.pid),
            project.opportunityName,
            project.mainType,
            project.subType,
            project.progressStatus,
            health?.healthLabel ?? '',
            project.deliveryDate ?? '',
            health?.deliveryDateStatusLabel ?? '',
            health ? `${health.completionPercent}%` : customerProjectProgress(project),
            health?.currentMilestone ?? '',
            health?.deadlineRiskLabel ?? '',
            health?.nextDeadline ?? '',
            health?.overdueTaskCount ?? 0,
            health?.healthAlerts.join('; ') ?? '',
          ]
        }),
        'No projects found for this customer.',
      )
    }

    if (activeTab === 'systems') {
      return readOnlyTable(
        ['SID', 'Product', 'Hosting Type', 'Cloud Platform', 'CSP', 'Region', 'Status'],
        customer.systems.map((system) => [
          objectLink(systemRoutePath(system), systemIdentity(system)),
          system.productType,
          system.hostingType,
          system.cloudPlatform ?? '',
          system.csp ?? '',
          system.cloudRegion ?? system.region ?? '',
          system.operationalStatus,
        ]),
        'No systems found for this customer.',
      )
    }

    if (activeTab === 'tenants') {
      return readOnlyTable(
        ['TID', 'Tenant Name', 'SID', 'Product', 'Operational Status', 'Country'],
        customer.tenants.map((tenant) => [
          objectLink(`/tenants/${tenant.tid}`, tenant.tid),
          tenant.tenantName ?? '',
          tenant.hostingSid ?? '',
          tenant.productType,
          tenant.operationalStatus,
          tenant.country,
        ]),
        'No tenants found for this customer.',
      )
    }

    if (activeTab === 'warranties') {
      return readOnlyTable(
        ['Warranty ID', 'Tenant TID', 'Tenant Name', 'SID', 'Related Project ID', 'Project Name', 'End Date', 'Days To Expiration', 'Warranty Status', 'Tenant Header Status', 'Alerts'],
        customer.warrantyRows.map((row) => [
          row.warrantyId,
          objectLink(`/tenants/${row.tenantTid}`, row.tenantTid),
          row.tenantName,
          row.sid,
          row.relatedProjectId,
          row.projectName,
          row.endDate ?? '',
          row.daysToExpiration ?? '',
          row.warrantyStatusLabel,
          row.tenantHeaderStatusLabel,
          row.alerts,
        ]),
        'No warranty records found for this customer.',
      )
    }

    if (activeTab === 'documents') {
      return readOnlyTable(
      ['File', 'Source Type', 'Source ID', 'Source Name', 'Type', 'Size', 'Uploaded At', 'Replaced At', 'Open'],
      customer.documents.map((document) => [
        document.fileName,
        document.sourceObjectType,
        document.sourceObjectId,
        document.sourceObjectName,
        document.fileType,
        formatDocumentSize(document.fileSize),
        document.uploadedAt,
        document.replacedAt ?? '',
        document.objectUrl ? <a className="text-sf-brand hover:underline" href={document.objectUrl} target="_blank" rel="noreferrer">Open</a> : '',
      ]),
      'No documents found across this customer portfolio.',
      )
    }

    return (
      <ActivityTimeline
        events={customerActivityEvents}
        emptyText="No activity recorded for this customer yet."
      />
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader title={customerDisplayName(account)} subtitle="Customer 360 workspace" />

      <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        {readOnlyValue('Account ID', account.accountCode)}
        {readOnlyValue('Account Manager', customer.accountManager)}
        {readOnlyValue('Region', account.region)}
        {readOnlyValue('Country', account.country)}
        {readOnlyValue('Customer Type', customerTypeLabel(account))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {summaryCard('Opportunities', customer.opportunities.length)}
        {summaryCard('Open Projects', openProjects.length)}
        {summaryCard('Systems', customer.systems.length)}
        {summaryCard('Tenants', customer.tenants.length)}
        {summaryCard('Under Contract', customer.warrantySummary.underContract)}
        {summaryCard('Out Of Contract', customer.warrantySummary.outOfContract)}
        {summaryCard('Expiring 30 Days', customer.warrantySummary.expiring30)}
      </section>

      <section className="rounded border border-sf-border bg-sf-surface">
        <div className="flex flex-wrap border-b border-sf-border">
          {CUSTOMER_360_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={[
                'border-b-2 px-4 py-2 text-base font-semibold',
                activeTab === tab.id
                  ? 'border-sf-brand bg-white text-sf-text'
                  : 'border-transparent text-sf-text-muted hover:bg-white hover:text-sf-text',
              ].join(' ')}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="min-h-64 p-3 text-sm text-sf-text" role="tabpanel" aria-label={CUSTOMER_360_TABS.find((tab) => tab.id === activeTab)?.label}>
          {renderTabContent()}
        </div>
      </section>
    </div>
  )
}
