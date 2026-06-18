import type { DashboardColumn } from '@/components/dashboard/DataDashboard'
import type { System, Tenant } from '@/data/seed.types'
import { TENANT_OBJECT_DEFINITION } from '@/domain/object-registry'
import { objectFieldToRuntimeDashboardField } from '@/domain/object-registry-runtime'

function sidForTenant(tenant: Tenant, systems: System[]): string {
  return systems.find((system) => system.id === tenant.systemId)?.sid ?? ''
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

export function createTenantColumns(systems: System[]): DashboardColumn<Tenant>[] {
  return [
    tenantRuntimeColumn('tid'),
    { id: 'tenantName', label: 'Tenant Name', getValue: (row) => row.tenantName ?? `${row.tid} ${row.accountName}`.trim() },
    { id: 'accountName', label: 'Customer / End User / Account', getValue: (row) => row.accountName },
    { id: 'accountId', label: 'Account ID', getValue: (row) => row.accountId },
    { id: 'sid', label: 'SID', getValue: (row) => sidForTenant(row, systems) },
    { id: 'systemId', label: 'System ID/reference', getValue: (row) => row.systemId },
    { id: 'deliveryPid', label: 'Delivery PID', getValue: (row) => row.deliveryPid ?? '' },
    tenantRuntimeColumn('productType', { id: 'product', label: 'Product', editable: true, editKey: 'productType' }),
    { id: 'hosting', label: 'Hosting', getValue: (row) => row.hostingType ?? '' },
    { id: 'cloudPlatform', label: 'Cloud Platform', getValue: (row) => row.cloudPlatform ?? '' },
    { id: 'mapCenter', label: 'Map Center', getValue: (row) => row.mapCenter ?? row.country },
    { id: 'licenses', label: 'Licenses', getValue: (row) => row.licenses ?? '' },
    { id: 'users', label: 'Users', getValue: (row) => row.users ?? '' },
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
    { id: 'apiEnabled', label: 'API Enabled', getValue: (row) => row.apiEnabled ?? '' },
    { id: 'apiDailyQty', label: 'API Daily Qty', getValue: (row) => row.apiDailyQty ?? '' },
    { id: 'apiMonthlyQty', label: 'API Monthly Qty', getValue: (row) => row.apiMonthlyQty ?? '' },
    { id: 'aiFeatures', label: 'AI Features', getValue: (row) => joinValues(row.aiFeatures) },
    { id: 'additionalFeatures', label: 'Additional Features', getValue: (row) => joinValues(row.additionalFeatures) },
    { id: 'additionalSources', label: 'Additional Sources', getValue: (row) => joinValues(row.crossSystemFeatures) },
    { id: 'tenantStatus', label: 'Tenant Status', getValue: (row) => row.operationalStatus, editable: true, editKey: 'operationalStatus' },
    tenantRuntimeColumn('warrantyStatus', { editable: true, editKey: 'warrantyStatus' }),
    { id: 'warrantyStartDate', label: 'Warranty Start Date', getValue: (row) => row.warrantyStartDate ?? '' },
    { id: 'warrantyEndDate', label: 'Warranty End Date', getValue: (row) => row.warrantyEndDate ?? '', editable: true, editKey: 'warrantyEndDate' },
    { id: 'pocStartDate', label: 'POC Start Date', getValue: (row) => row.pocStartDate ?? '', editable: true, editKey: 'pocStartDate' },
    { id: 'pocEndDate', label: 'POC End Date', getValue: (row) => row.pocEndDate ?? '', editable: true, editKey: 'pocEndDate' },
    { id: 'updatedAt', label: 'Updated At', getValue: (row) => row.updatedAt },
  ]
}
