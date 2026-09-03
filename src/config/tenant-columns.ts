import { createElement } from 'react'
import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import { BusinessIdLink, BusinessIdListLinks, OperationalStatusIcon, WarrantyStatusPresentation } from '@/components/ui'
import type { Account, Opportunity, Project, ProjectTenantLink, System, Tenant } from '@/data/seed.types'
import { effectiveTenantOperationalMode, tenantActivePocProject, tenantDashboardProjectPids, tenantDashboardRequirementIds, tenantDerivedWarrantyContractStatus, tenantOriginProjectPid, tenantOriginalProject } from '@/domain/tenant-operations'
import { warrantyCollectionReadModel } from '@/domain/warranty-collection'
import { systemCurrentVersionLabel } from '@/domain/system-version-update'
import { useAppStore } from '@/store/useAppStore'
import { TENANT_OBJECT_DEFINITION } from '@/domain/object-registry'
import {
  objectDefinitionToRuntimeFormModel,
  objectFieldToRuntimeDashboardField,
} from '@/domain/object-registry-runtime'

export const TENANT_RUNTIME_FORM_MODEL = objectDefinitionToRuntimeFormModel(TENANT_OBJECT_DEFINITION)

function sidForTenant(tenant: Tenant, systems: System[]): string {
  return systemForTenant(tenant, systems)?.sid ?? ''
}

function systemForTenant(tenant: Tenant, systems: System[]): System | undefined {
  return systems.find((system) => system.id === (tenant.hostedSystemId || tenant.systemId))
}

function systemUrlForTenant(tenant: Tenant, systems: System[]): string {
  return systemForTenant(tenant, systems)?.url ?? ''
}

function systemVersionForTenant(tenant: Tenant, systems: System[]): string {
  const system = systemForTenant(tenant, systems)
  if (!system) return ''
  const state = useAppStore.getState()
  return systemCurrentVersionLabel(state.versionUpdates, state.referenceData, system.id, system.currentVersionUpdateId)
}

function joinValues(values?: string[]): string {
  return values?.join(';') ?? ''
}

function tenantRuntimeColumn(
  key: string,
  options: { id?: string; label?: string; editable?: boolean; editKey?: keyof Tenant } = {},
): DashboardColumn<Tenant> {
  const field = TENANT_OBJECT_DEFINITION.fields.find((candidate) => candidate.key === key)
  const column = field ? objectFieldToRuntimeDashboardField<Tenant>(field, options) : null
  if (!column) throw new Error(`Tenant dashboard field is not runtime-compatible: ${key}`)
  return column
}

export function createTenantColumns(
  systems: System[],
  projects: Project[] = [],
  projectTenants: ProjectTenantLink[] = [],
  opportunities: Opportunity[] = [],
  accounts: Account[] = [],
): DashboardColumn<Tenant>[] {
  const accountForTenant = (tenant: Tenant) => accounts.find((account) => account.id === tenant.accountId)
  const regionForTenant = (tenant: Tenant) => accountForTenant(tenant)?.region ?? ''
  const warrantyRows = (tenant: Tenant) => warrantyCollectionReadModel(tenant.warranties ?? [], tenant.tid)
  const currentWarranty = (tenant: Tenant) => warrantyRows(tenant).find((row) => row.successorRefs.length === 0)?.warranty
  const initialWarranty = (tenant: Tenant) => warrantyRows(tenant).find((row) => row.firstWarranty)?.warranty

  return [
    { id: 'tid', label: 'TID', getValue: (row) => row.tid, render: (row) => createElement(BusinessIdLink, { objectType: 'TENANT', businessId: row.tid }, row.tid) },
    {
      id: 'sid',
      label: 'SID',
      getValue: (row) => sidForTenant(row, systems),
      render: (row) => createElement(BusinessIdLink, { objectType: 'SYSTEM', businessId: sidForTenant(row, systems) }, sidForTenant(row, systems)),
    },
    {
      id: 'originProject',
      label: 'Origin Project',
      getValue: tenantOriginProjectPid,
      render: (row) => createElement(BusinessIdLink, { objectType: 'PROJECT', businessId: tenantOriginProjectPid(row) }, tenantOriginProjectPid(row)),
    },
    {
      id: 'pid',
      label: 'PIDs',
      getValue: (row) => tenantDashboardProjectPids(row, projects, projectTenants),
      render: (row) => createElement(BusinessIdListLinks, { objectType: 'PROJECT', businessIds: tenantDashboardProjectPids(row, projects, projectTenants) }),
    },
    { id: 'tenantType', label: 'Tenant Type', getValue: (row) => row.tenantType === 'PENLINK_INTERNAL' ? 'Internal' : row.tenantType === 'POC' ? 'POC' : 'Customer' },
    { id: 'originalProjectType', label: 'Project Type', getValue: (row) => tenantOriginalProject(row, projects, projectTenants)?.mainType ?? '' },
    { id: 'originalProjectSubType', label: 'Project Sub Type', getValue: (row) => tenantOriginalProject(row, projects, projectTenants)?.subType ?? '' },
    { id: 'accountName', label: 'Account Name', getValue: (row) => accountForTenant(row)?.accountName ?? row.accountName },
    { id: 'region', label: 'Region', getValue: regionForTenant },
    {
      id: 'tenantStatus',
      label: 'Operational Status',
      getValue: (row) => effectiveTenantOperationalMode(row, systemForTenant(row, systems)),
      render: (row) => createElement(OperationalStatusIcon, { status: effectiveTenantOperationalMode(row, systemForTenant(row, systems)), showLabel: true }),
    },
    {
      ...tenantRuntimeColumn('warrantyStatus'),
      getValue: (row) => row.tenantType === 'CUSTOMER' ? tenantDerivedWarrantyContractStatus(row).label : '',
      render: (row) => row.tenantType === 'CUSTOMER' ? createElement(WarrantyStatusPresentation, {
        status: tenantDerivedWarrantyContractStatus(row).visualStatus,
        label: tenantDerivedWarrantyContractStatus(row).label,
        tooltip: `Tenant warranty status: ${tenantDerivedWarrantyContractStatus(row).label}`,
      }) : '',
    },
    { id: 'requirementId', label: 'Requirement IDs', getValue: (row) => tenantDashboardRequirementIds(row, projects, projectTenants, opportunities) },
    tenantRuntimeColumn('productType', { id: 'product', label: 'Product', editable: true, editKey: 'productType' }),
    {
      id: 'systemUrl',
      label: 'System URL',
      getValue: (row) => systemUrlForTenant(row, systems),
      render: (row) => {
        const url = systemUrlForTenant(row, systems)
        if (!url) return ''
        return createElement(
          'a',
          {
            href: url,
            target: '_blank',
            rel: 'noreferrer',
            className: 'text-sf-brand hover:underline',
            onClick: (event: { stopPropagation: () => void }) => event.stopPropagation(),
          },
          url,
        )
      },
    },
    { id: 'systemVersion', label: 'System Version', getValue: (row) => systemVersionForTenant(row, systems) },
    { id: 'hosting', label: 'Hosting', getValue: (row) => row.hostingType ?? '' },
    { id: 'cloudPlatform', label: 'Platform', getValue: (row) => row.cloudPlatform ?? '' },
    { id: 'users', label: 'Number of Users', getValue: (row) => row.users ?? '' },
    { id: 'concurrentSearches', label: 'Concurrent Searches', getValue: (row) => row.concurrentSearches ?? '' },
    { id: 'concurrentAnalyses', label: 'Concurrent Analyses', getValue: (row) => row.concurrentAnalyses ?? '' },
    { id: 'topicAnalysis', label: 'Topic Analysis', getValue: (row) => row.topicAnalyses ?? '' },
    { id: 'tangles', label: 'Tangles', getValue: (row) => row.tangles ?? '' },
    { id: 'tanglesGo', label: 'Tangles Go', getValue: (row) => row.tanglesGo ?? '' },
    { id: 'webloc', label: 'Webloc', getValue: (row) => row.webloc ?? '' },
    { id: 'webeye', label: 'Webeye', getValue: (row) => row.webeye ?? '' },
    { id: 'ingest', label: 'Ingest', getValue: (row) => row.ingest ?? '' },
    { id: 'standardMonitors', label: 'Std. Monitors', getValue: (row) => row.standardMonitors ?? '' },
    { id: 'fullMonitors', label: 'Full Monitors', getValue: (row) => row.fullMonitors ?? '' },
    { id: 'topicMonitors', label: 'Topic Monitors', getValue: (row) => row.topicMonitors ?? '' },
    { id: 'aiFeatures', label: 'AI Features', getValue: (row) => joinValues(row.aiFeatures) },
    { id: 'apiEnabled', label: 'API Enabled', getValue: (row) => row.apiEnabled ?? '' },
    { id: 'apiDailyQty', label: 'API Daily Qty', getValue: (row) => row.apiDailyQty ?? '' },
    { id: 'apiMonthlyQty', label: 'API Monthly Qty', getValue: (row) => row.apiMonthlyQty ?? '' },
    { id: 'additionalFeatures', label: 'Additional Features', getValue: (row) => joinValues(row.additionalFeatures) },
    { id: 'additionalSources', label: 'Additional Sources', getValue: (row) => joinValues(row.crossSystemFeatures) },
    { id: 'warrantyInitialDate', label: 'Warranty Initial Date', getValue: (row) => row.tenantType === 'CUSTOMER' ? initialWarranty(row)?.initialWarrantyDate ?? '' : '', semanticType: 'date' },
    { id: 'warrantyStartDate', label: 'Warranty Start Date', getValue: (row) => row.tenantType === 'CUSTOMER' ? currentWarranty(row)?.startDate ?? '' : '', semanticType: 'date' },
    { id: 'warrantyEndDate', label: 'Warranty End Date', getValue: (row) => row.tenantType === 'CUSTOMER' ? currentWarranty(row)?.endDate ?? '' : '', semanticType: 'date' },
    { id: 'pocStartDate', label: 'POC Start Date', getValue: (row) => tenantActivePocProject(row, projects, projectTenants)?.pocStartDate ?? '', semanticType: 'date' },
    { id: 'pocEndDate', label: 'POC End Date', getValue: (row) => tenantActivePocProject(row, projects, projectTenants)?.pocEndDate ?? '', semanticType: 'date' },
    { id: 'updatedAt', label: 'Update Date', getValue: (row) => row.updatedAt, semanticType: 'datetime' },
    { id: 'creationDate', label: 'Creation Date', getValue: (row) => row.createdAt, semanticType: 'datetime' },
  ]
}
