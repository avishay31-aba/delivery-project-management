import { timeGroupForCountry } from '@/config/time-groups'
import {
  applicationConfigurationFromTenant,
  applicationConfigurationValue,
  APPLICATION_CONFIGURATION_SUMMARY_FIELDS,
} from '@/domain/application-configuration'
import type { ConfigurationHistoryRecord, TenantConfiguration } from '@/data/seed.types'
import type { AllocatedSystemDashboardRow, Project, ProjectSystemLink, ReusedInternalSystem, System, SystemInventoryRecord, Tenant } from './types'
import {
  REUSED_INTERNAL_STATUS_OCCUPIED,
  SYSTEM_SOURCE_PRODUCTION,
  SYSTEM_SOURCE_REUSED_INTERNAL,
} from './metadata'

export function isReusedInternalSystem(record: SystemInventoryRecord): boolean {
  return 'machineId' in record && record.source === SYSTEM_SOURCE_REUSED_INTERNAL
}

export function isProductionInventorySystem(record: SystemInventoryRecord): boolean {
  return 'sid' in record && record.source === SYSTEM_SOURCE_PRODUCTION
}

export function isAllocatedSystem(record: SystemInventoryRecord): record is System {
  return 'systemClass' in record && 'availability' in record
}

export function isReusedInternalOccupied(status: string | undefined): boolean {
  return status === REUSED_INTERNAL_STATUS_OCCUPIED
}

export function systemIdentity(record: SystemInventoryRecord): string {
  if ('sid' in record && record.sid) return record.sid
  if ('machineId' in record && record.machineId) return record.machineId
  return record.id
}

export function systemSource(record: SystemInventoryRecord): string {
  if ('source' in record && record.source) return record.source
  return 'machineId' in record && record.machineId ? SYSTEM_SOURCE_REUSED_INTERNAL : SYSTEM_SOURCE_PRODUCTION
}

export function joinUniqueValues(values: Array<string | null | undefined>, separator = '; '): string {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).join(separator)
}

export function hostedTenantsForSystem(systemId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) => tenant.systemId === systemId || tenant.hostedSystemId === systemId)
}

const INTEGER_SUMMARY_KEYS = new Set([
  'licenses',
  'users',
  'concurrentSearches',
  'dailySearches',
  'monthlySearches',
  'concurrentAnalyses',
  'topicAnalyses',
  'dailyAnalyses',
  'monthlyAnalyses',
  'standardMonitors',
  'fullMonitors',
  'topicMonitors',
  'tangles',
  'tanglesGo',
  'webloc',
  'webeye',
  'ingest',
  'apiDailyQty',
  'apiMonthlyQty',
])

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function uniqueValues(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .filter((value) => value !== null && value !== undefined && value !== '')
        .map(String),
    ),
  )
}

export function systemApplicationConfigurationSummary(system: System, tenants: Tenant[]): TenantConfiguration {
  const hostedTenants = hostedTenantsForSystem(system.id, tenants)
  const summary = applicationConfigurationFromTenant({
    ...(hostedTenants[0] ?? {}),
    id: `${system.id}-configuration-summary`,
    tid: '',
    accountId: system.accountId ?? '',
    systemId: system.id,
    tenantType: 'CUSTOMER',
    accountName: '',
    country: system.country ?? '',
    timeGroup: system.timeGroup,
    operationalStatus: '',
    productType: system.productType,
    warrantyStatus: 'NOT_SET',
    warrantyEndDate: null,
    pocStartDate: null,
    pocEndDate: null,
    createdAt: system.createdAt,
    updatedAt: system.updatedAt,
  } as Tenant, system.productType)

  APPLICATION_CONFIGURATION_SUMMARY_FIELDS.forEach((field) => {
    if (field.key === 'productType') {
      summary.product = system.productType || uniqueValues(hostedTenants.map((tenant) => tenant.productType))[0] || ''
      return
    }

    const values = hostedTenants.map((tenant) => applicationConfigurationValue(applicationConfigurationFromTenant(tenant, system.productType), field))
    if (field.inputType === 'multiselect') {
      ;(summary as unknown as Record<string, unknown>)[field.configKey] = uniqueValues(values)
      return
    }
    if (INTEGER_SUMMARY_KEYS.has(field.key)) {
      const total = values.reduce<number>((sum, value) => sum + (typeof value === 'number' && Number.isFinite(value) ? value : 0), 0)
      ;(summary as unknown as Record<string, unknown>)[field.configKey] = total || null
      return
    }
    ;(summary as unknown as Record<string, unknown>)[field.configKey] = uniqueValues(values).join('; ')
  })

  return summary
}

function nextConfigurationHistoryRecordId(records: ConfigurationHistoryRecord[]): string {
  return `CH-${String(records.length + 1).padStart(3, '0')}`
}

export function createSystemConfigurationHistoryRecord(
  configuration: TenantConfiguration,
  existingRecords: ConfigurationHistoryRecord[] = [],
  timestamp = new Date().toISOString(),
  recordedBy = 'Local User',
  tid = '',
): ConfigurationHistoryRecord | null {
  if (existingRecords[0] && valuesEqual(existingRecords[0].configuration, configuration)) return null
  return {
    id: `system-config-history-${crypto.randomUUID()}`,
    recordId: nextConfigurationHistoryRecordId(existingRecords),
    timestamp,
    tid,
    recordedBy,
    configuration,
  }
}

export function tenantCountForSystem(record: SystemInventoryRecord, tenants: Tenant[]): number {
  if ('sid' in record) {
    const hostedTenantCount = hostedTenantsForSystem(record.id, tenants).length
    const storedTenantCount = 'tenantCount' in record ? record.tenantCount : 0
    return hostedTenantCount || storedTenantCount || 0
  }
  return record.tenantCount || 0
}

export function linkedProjectIdsForSystem(record: SystemInventoryRecord, projectSystems: ProjectSystemLink[] = []): string[] {
  const projectIds = new Set(
    projectSystems
      .filter((link) => link.allocationStatus !== 'DEALLOCATED' && link.systemId === record.id)
      .map((link) => link.projectId),
  )
  if ('linkedProjectIds' in record) record.linkedProjectIds?.forEach((projectId) => projectIds.add(projectId))
  if ('linkedProjects' in record) record.linkedProjects?.forEach((projectId) => projectIds.add(projectId))
  if ('currentProjectIds' in record) record.currentProjectIds.forEach((projectId) => projectIds.add(projectId))
  return Array.from(projectIds)
}

export function linkedProjectDisplay(record: SystemInventoryRecord, projects: Project[], projectSystems: ProjectSystemLink[] = []): string {
  return linkedProjectIdsForSystem(record, projectSystems)
    .map((projectId) => projects.find((project) => project.id === projectId)?.pid ?? projectId)
    .join(', ')
}

export function systemTimeGroup(record: SystemInventoryRecord, tenants: Tenant[]): string {
  const oldestTenant = hostedTenantsForSystem(record.id, tenants)
    .sort((first, second) => first.createdAt.localeCompare(second.createdAt))[0]
  return timeGroupForCountry(oldestTenant?.country) || String(('timeGroup' in record ? record.timeGroup : '') ?? '')
}

export function systemTimeGroupAlert(record: SystemInventoryRecord, tenants: Tenant[], fallback: unknown): string {
  const activeTimeGroup = systemTimeGroup(record, tenants)
  const tenant = hostedTenantsForSystem(record.id, tenants).find(
    (candidate) => timeGroupForCountry(candidate.country) && timeGroupForCountry(candidate.country) !== activeTimeGroup,
  )
  return tenant ? `Tenant ${tenant.tid} does not belong to system time group` : String(fallback ?? '')
}

export function allocatedSystemsForActiveLinks(systems: System[], projectSystems: ProjectSystemLink[]): System[] {
  return allocatedSystemDashboardRows(systems, projectSystems)
}

export function allocatedSystemDashboardRows(
  systems: System[],
  projectSystems: ProjectSystemLink[],
): AllocatedSystemDashboardRow[] {
  const activeLinksBySystemId = new Map<string, ProjectSystemLink[]>()
  projectSystems
    .filter((link) => link.allocationStatus !== 'DEALLOCATED')
    .forEach((link) => {
      const links = activeLinksBySystemId.get(link.systemId) ?? []
      links.push(link)
      activeLinksBySystemId.set(link.systemId, links)
    })

  return systems
    .filter((system) => activeLinksBySystemId.has(system.id))
    .map((system) => {
      const links = activeLinksBySystemId.get(system.id) ?? []
      return {
        ...system,
        linkedProjectIds: Array.from(new Set(links.map((link) => link.projectId))),
        allocationIds: links.map((link) => link.id),
        allocationProjectIds: Array.from(new Set(links.map((link) => link.projectId))),
        allocationTypes: Array.from(new Set(links.map((link) => link.allocationType ?? 'EXISTING_SYSTEM'))),
        allocatedAt: links.map((link) => link.allocatedAt).sort()[0] ?? '',
        allocationStatus: links.some((link) => link.allocationStatus === 'ALLOCATED') ? 'ALLOCATED' : links[0]?.allocationStatus ?? '',
      }
    })
}

export function systemRoutePath(record: SystemInventoryRecord): string {
  if (systemSource(record) === SYSTEM_SOURCE_REUSED_INTERNAL && 'machineId' in record && record.machineId) {
    return `/systems/reused-internal/${record.machineId}`
  }
  return `/systems/production-inventory/${'sid' in record ? record.sid ?? '' : ''}`
}

export interface ReusedInternalPurposeHistoryRow {
  id: string
  recordId: string
  startDate: string
  endDate: string
  purposeType: string
  pid: string
  sid: string
  projectName: string
  accountName: string
  product: string
  projectStatus: string
}

export function reusedInternalPurposeHistory(
  record: ReusedInternalSystem | System,
  projects: Project[],
  projectSystems: ProjectSystemLink[],
  systems: System[] = [],
): ReusedInternalPurposeHistoryRow[] {
  const machineId = 'machineId' in record ? record.machineId : null
  if (!machineId) return []

  if ('purposeHistory' in record && Array.isArray(record.purposeHistory) && record.purposeHistory.length > 0) {
    return record.purposeHistory.map((history) => ({
      id: history.id,
      recordId: history.recordId,
      startDate: history.startDate,
      endDate: history.endDate ?? '',
      purposeType: history.purposeType,
      pid: history.pid ?? '',
      sid: history.sid ?? '',
      projectName: history.projectName ?? '',
      accountName: history.accountName ?? '',
      product: history.product ?? '',
      projectStatus: history.projectStatus ?? '',
    }))
  }

  const rows: ReusedInternalPurposeHistoryRow[] = projectSystems
    .filter((link) => link.sourceMachineId === machineId)
    .map((link, index) => {
      const project = projects.find((candidate) => candidate.id === link.projectId)
      const system = systems.find((candidate) => candidate.id === link.systemId)
      return {
        id: link.id,
        recordId: `PH-${String(index + 1).padStart(3, '0')}`,
        startDate: link.allocatedAt,
        endDate: link.deallocatedAt ?? '',
        purposeType: project?.mainType === 'POC' ? 'POC' : 'POC',
        pid: project?.pid ?? link.projectId,
        sid: system?.sid ?? '',
        projectName: project?.opportunityName ?? '',
        accountName: project?.accountName ?? '',
        product: system?.productType ?? '',
        projectStatus: project?.progressStatus ?? link.allocationStatus ?? '',
      }
    })

  const knownProjectIds = new Set(rows.map((row) => row.pid))
  if ('currentProjectIds' in record) {
    record.currentProjectIds.forEach((projectId) => {
      const project = projects.find((candidate) => candidate.id === projectId)
      const pid = project?.pid ?? projectId
      if (knownProjectIds.has(pid)) return
      rows.push({
        id: `${machineId}-${projectId}`,
        recordId: `PH-${String(rows.length + 1).padStart(3, '0')}`,
        startDate: record.occupationStartDate ?? '',
        endDate: record.occupationEndDate ?? '',
        purposeType: record.purpose,
        pid,
        sid: '',
        projectName: project?.opportunityName ?? '',
        accountName: project?.accountName ?? '',
        product: 'productType' in record ? record.productType : '',
        projectStatus: project?.progressStatus ?? record.status,
      })
    })
  }

  return rows.sort((first, second) => second.startDate.localeCompare(first.startDate))
}
