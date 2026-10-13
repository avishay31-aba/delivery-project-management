import { CURRENT_USER_DISPLAY_NAME } from '@/config/current-user'
import { reserveBusinessId } from '@/domain/business-identity'
import { activeProjectSystemLinks } from '@/domain/allocation-context'
import {
  applicationConfigurationFromTenant,
  applicationConfigurationValue,
  APPLICATION_CONFIGURATION_SUMMARY_FIELDS,
} from '@/domain/application-configuration'
import {
  isTenantIndividuallyLifecycleInactive,
  isTenantLifecycleInactive,
  isTenantOperationallyVisible,
  tenantIsActivelyHostedBySystem,
  tenantLatestHistoricalSystemId,
} from '@/domain/tenant-operations/lifecycle'
import type { ConfigurationHistoryRecord, TenantConfiguration, TimeGroupLookupRecord } from '@/data/seed.types'
import { systemTimeGroupSource } from '@/domain/time-groups'
import type { AllocatedSystemDashboardRow, Project, ProjectSystemLink, ReusedInternalSystem, System, SystemInventoryRecord, Tenant } from './types'
import type { ReusedInternalSystemStatus } from './types'
import {
  REUSED_INTERNAL_PURPOSE_NONE,
  REUSED_INTERNAL_PURPOSE_OBSOLETE,
  REUSED_INTERNAL_STATUS_AVAILABLE,
  REUSED_INTERNAL_STATUS_OCCUPIED,
  SYSTEM_AVAILABILITY_OCCUPIED,
  SYSTEM_SOURCE_PRODUCTION,
  SYSTEM_SOURCE_REUSED_INTERNAL,
  SYSTEM_PURPOSE_POC,
} from './metadata'

export function isReusedInternalSystem(record: SystemInventoryRecord): record is ReusedInternalSystem {
  return 'machineId' in record && record.source === SYSTEM_SOURCE_REUSED_INTERNAL
}

export function isProductionInventorySystem(record: SystemInventoryRecord): boolean {
  return 'sid' in record && record.source === SYSTEM_SOURCE_PRODUCTION
}

export function isAllocatedSystem(record: SystemInventoryRecord): record is System {
  return 'systemClass' in record && 'availability' in record
}

export function isSystemCancelled(record: Pick<SystemInventoryRecord, 'operationalStatus'>): boolean {
  return String(record.operationalStatus ?? '').toLocaleLowerCase().includes('cancel')
}

export function isSystemOperationallyVisible(record: Pick<SystemInventoryRecord, 'operationalStatus'>): boolean {
  return !isSystemCancelled(record)
}

export function isReusedInternalOccupied(status: string | undefined): boolean {
  return String(status ?? '').trim().toLocaleLowerCase() === REUSED_INTERNAL_STATUS_OCCUPIED.toLocaleLowerCase()
}

export function reusedInternalStatusForPurpose(purpose: string | undefined): ReusedInternalSystemStatus {
  if (purpose === REUSED_INTERNAL_PURPOSE_NONE) return REUSED_INTERNAL_STATUS_AVAILABLE
  return REUSED_INTERNAL_STATUS_OCCUPIED
}

export function reusedInternalAvailabilityStatusForPurpose(purpose: string | undefined): ReusedInternalSystemStatus {
  return reusedInternalStatusForPurpose(purpose)
}

const REUSED_INTERNAL_MANUAL_OCCUPATION_PURPOSES = new Set(['Demo', 'Training', 'Support'])

export function isReusedInternalManualOccupationPurpose(purpose: string | undefined): boolean {
  return REUSED_INTERNAL_MANUAL_OCCUPATION_PURPOSES.has(String(purpose ?? ''))
}

export function isOccupationPeriodVisibleForPurpose(purpose: string | undefined): boolean {
  return purpose === SYSTEM_PURPOSE_POC || isReusedInternalManualOccupationPurpose(purpose)
}

export function isAllocationEligibleSystem(system: System): boolean {
  if (system.source === SYSTEM_SOURCE_PRODUCTION || !system.source) return true
  return system.source === SYSTEM_SOURCE_REUSED_INTERNAL && system.purpose === SYSTEM_PURPOSE_POC
}

export interface ReusedSystemOccupationWindow {
  ok: boolean
  message?: string
  occupationStartDate?: string | null
  occupationEndDate?: string | null
  derivedFromActivePocAllocation?: boolean
  currentProjectIds?: string[]
}

export function normalizeReusedInternalMachineId(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function isValidReusedInternalMachineId(value: string | null | undefined): boolean {
  const machineId = normalizeReusedInternalMachineId(value)
  return !machineId || /^\d+$/.test(machineId)
}

export function formattedReusedInternalMachineId(value: string | null | undefined): string {
  const machineId = normalizeReusedInternalMachineId(value)
  return machineId ? `M${machineId}` : ''
}

export function reusedInternalMachineIdRouteKey(value: string | null | undefined): string {
  const machineId = normalizeReusedInternalMachineId(value)
  const match = machineId.match(/^M(\d+)$/i)
  return match ? match[1] : machineId
}

export function reusedInternalMachineIdsEqual(
  first: string | null | undefined,
  second: string | null | undefined,
): boolean {
  const firstMachineId = reusedInternalMachineIdRouteKey(first)
  const secondMachineId = reusedInternalMachineIdRouteKey(second)
  return Boolean(firstMachineId && secondMachineId && firstMachineId === secondMachineId)
}

function sortedDate(values: string[], direction: 'asc' | 'desc'): string {
  return [...values].sort((first, second) => direction === 'asc' ? first.localeCompare(second) : second.localeCompare(first))[0] ?? ''
}

export function deriveReusedSystemOccupationWindow(
  system: ReusedInternalSystem,
  projectSystemLinks: ProjectSystemLink[],
  projects: Project[],
  effectiveDate: string,
  allocatedSystems: System[] = [],
): ReusedSystemOccupationWindow {
  void effectiveDate
  const allocationBelongsToSystem = (link: ProjectSystemLink): boolean => {
    if (reusedInternalMachineIdsEqual(link.sourceMachineId, system.machineId)) return true
    if (system.currentProjectIds.includes(link.projectId)) return true
    const allocatedSystem = allocatedSystems.find((candidate) => candidate.id === link.systemId)
    return Boolean(allocatedSystem && reusedInternalMachineIdsEqual(allocatedSystem.machineId, system.machineId))
  }
  const activePocLinks = projectSystemLinks
    .filter((link) =>
      link.allocationStatus !== 'DEALLOCATED' &&
      allocationBelongsToSystem(link),
    )
    .filter((link) => {
      const project = projects.find((candidate) => candidate.id === link.projectId)
      return Boolean(project && project.mainType === 'POC' && project.progressStatus === 'OPEN')
    })

  if (activePocLinks.length > 0) {
    const activePocProjects = activePocLinks
      .map((link) => projects.find((project) => project.id === link.projectId))
      .filter((project): project is Project => Boolean(project))
    const currentSidSystemIds = new Set(activePocLinks
      .map((link) => link.systemId)
      .filter((systemId) =>
        allocatedSystems.some((candidate) => candidate.id === systemId && reusedInternalMachineIdsEqual(candidate.machineId, system.machineId)),
      ))
    const dateWindowProjects = projectSystemLinks
      .filter((link) => currentSidSystemIds.has(link.systemId))
      .map((link) => projects.find((project) => project.id === link.projectId))
      .filter((project): project is Project => Boolean(project && project.mainType === 'POC'))
    const linkedPocProjects = dateWindowProjects.length > 0 ? dateWindowProjects : activePocProjects
    const missingStartDate = linkedPocProjects.find((project) => !project.pocStartDate)
    if (missingStartDate) {
      return { ok: false, message: `Project ${missingStartDate.pid} must have a POC Start Date before this Reused System can be allocated.` }
    }
    const missingEndDate = linkedPocProjects.find((project) => !project.pocEndDate)
    if (missingEndDate) {
      return { ok: false, message: `Project ${missingEndDate.pid} must have a POC End Date before this Reused System can be allocated.` }
    }
    return {
      ok: true,
      occupationStartDate: sortedDate(linkedPocProjects.map((project) => project.pocStartDate as string), 'asc'),
      occupationEndDate: sortedDate(linkedPocProjects.map((project) => project.pocEndDate as string), 'desc'),
      derivedFromActivePocAllocation: true,
      currentProjectIds: activePocProjects.map((project) => project.id),
    }
  }

  if (!isOccupationPeriodVisibleForPurpose(system.purpose)) {
    return { ok: true, occupationStartDate: null, occupationEndDate: null }
  }

  if (REUSED_INTERNAL_MANUAL_OCCUPATION_PURPOSES.has(system.purpose)) {
    return { ok: true, occupationStartDate: system.occupationStartDate ?? null, occupationEndDate: system.occupationEndDate ?? null }
  }

  if (system.purpose === SYSTEM_PURPOSE_POC) {
    return {
      ok: false,
      message: 'A POC Reused Internal System requires an active POC Project allocation with POC Start Date and POC End Date.',
      occupationStartDate: null,
      occupationEndDate: null,
    }
  }

  return {
    ok: true,
    occupationStartDate: null,
    occupationEndDate: null,
  }
}

export function reusedInternalHasActivePocAllocation(
  system: ReusedInternalSystem,
  activeAllocations: ProjectSystemLink[],
  projects: Project[],
  allocatedSystems: System[] = [],
): boolean {
  return Boolean(deriveReusedSystemOccupationWindow(system, activeAllocations, projects, '', allocatedSystems).derivedFromActivePocAllocation)
}

export function reusedInternalAvailabilityStatus(
  system: ReusedInternalSystem,
  activeAllocations: ProjectSystemLink[] = [],
  projects: Project[] = [],
  allocatedSystems: System[] = [],
): ReusedInternalSystemStatus {
  if (reusedInternalHasActivePocAllocation(system, activeAllocations, projects, allocatedSystems)) return REUSED_INTERNAL_STATUS_OCCUPIED
  return reusedInternalStatusForPurpose(system.purpose)
}

export function applyReusedSystemOccupationWindow(
  system: ReusedInternalSystem,
  activeAllocations: ProjectSystemLink[],
  projects: Project[],
  effectiveDate: string,
  allocatedSystems: System[] = [],
): ReusedInternalSystem {
  const window = deriveReusedSystemOccupationWindow(system, activeAllocations, projects, effectiveDate, allocatedSystems)
  if (!window.ok) {
    return {
      ...system,
      status: reusedInternalStatusForPurpose(system.purpose),
      occupationStartDate: system.purpose === SYSTEM_PURPOSE_POC ? null : system.occupationStartDate ?? null,
      occupationEndDate: system.purpose === SYSTEM_PURPOSE_POC ? null : system.occupationEndDate ?? null,
      currentProjectIds: system.purpose === SYSTEM_PURPOSE_POC ? [] : system.currentProjectIds,
    }
  }
  const nextPurpose = window.derivedFromActivePocAllocation
    ? SYSTEM_PURPOSE_POC
    : system.purpose === SYSTEM_PURPOSE_POC
      ? REUSED_INTERNAL_PURPOSE_NONE
      : system.purpose
  return {
    ...system,
    purpose: nextPurpose,
    status: window.derivedFromActivePocAllocation ? REUSED_INTERNAL_STATUS_OCCUPIED : reusedInternalStatusForPurpose(nextPurpose),
    occupationStartDate: window.occupationStartDate ?? null,
    occupationEndDate: window.occupationEndDate ?? null,
    currentProjectIds: window.derivedFromActivePocAllocation ? Array.from(new Set(window.currentProjectIds ?? [])) : [],
  }
}

export function systemDashboardRowClassName(record: SystemInventoryRecord | AllocatedSystemDashboardRow): string {
  if (isAllocatedSystem(record)) {
    return record.purpose === SYSTEM_PURPOSE_POC
      ? 'bg-blue-50 hover:bg-blue-100'
      : 'bg-white hover:bg-sf-surface-alt'
  }

  if (isProductionInventorySystem(record)) return 'bg-white hover:bg-sf-surface-alt'

  if (isReusedInternalSystem(record)) {
    switch (record.purpose) {
      case REUSED_INTERNAL_PURPOSE_NONE:
        return 'bg-yellow-50 hover:bg-yellow-100'
      case SYSTEM_PURPOSE_POC:
        return 'bg-blue-50 hover:bg-blue-100'
      case 'Demo':
        return 'bg-red-50 hover:bg-red-100'
      case 'Training':
        return 'bg-purple-50 hover:bg-purple-100'
      case 'Support':
        return 'bg-slate-50 hover:bg-slate-100'
      case REUSED_INTERNAL_PURPOSE_OBSOLETE:
        return 'bg-gray-100 hover:bg-gray-200'
      default:
        return 'bg-white hover:bg-sf-surface-alt'
    }
  }

  return 'bg-white hover:bg-sf-surface-alt'
}

export const REUSED_INTERNAL_SYSTEM_DASHBOARD_COLOR_LEGEND = [
  { label: 'None', rowClassName: 'bg-yellow-50', swatchClassName: 'bg-yellow-50' },
  { label: 'POC', rowClassName: 'bg-blue-50', swatchClassName: 'bg-blue-50' },
  { label: 'Demo', rowClassName: 'bg-red-50', swatchClassName: 'bg-red-50' },
  { label: 'Training', rowClassName: 'bg-purple-50', swatchClassName: 'bg-purple-50' },
  { label: 'Support', rowClassName: 'bg-slate-50', swatchClassName: 'bg-slate-50' },
  { label: 'OBSOLETE', rowClassName: 'bg-gray-100', swatchClassName: 'bg-gray-100' },
]

export const ALLOCATED_SYSTEM_DASHBOARD_COLOR_LEGEND = [
  { label: 'Delivery', rowClassName: 'bg-white', swatchClassName: 'bg-white' },
  { label: 'POC', rowClassName: 'bg-blue-50', swatchClassName: 'bg-blue-50' },
]

export function systemIdentity(record: SystemInventoryRecord): string {
  if ('sid' in record && record.sid) return record.sid
  if ('machineId' in record && record.machineId) return formattedReusedInternalMachineId(record.machineId)
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
  return tenants.filter((tenant) => isTenantOperationallyVisible(tenant) && tenantIsActivelyHostedBySystem(tenant, systemId))
}

export function hostedTenantsForSystemRecord(
  record: SystemInventoryRecord,
  tenants: Tenant[],
  allocatedSystems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
): Tenant[] {
  if (isAllocatedSystem(record)) return hostedTenantsForSystem(record.id, tenants)
  if (!isReusedInternalSystem(record) || !record.machineId) return hostedTenantsForSystem(record.id, tenants)
  const physicalSystemIds = currentPhysicalSystemIdsForReusedRecord(record, allocatedSystems, projectSystems)
  return tenants.filter((tenant) =>
    isTenantOperationallyVisible(tenant) &&
    Array.from(physicalSystemIds).some((systemId) => tenantIsActivelyHostedBySystem(tenant, systemId)),
  )
}

export function currentTenantPopulationForSystem(systemId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) =>
    tenantLatestHistoricalSystemId(tenant) === systemId && !isTenantIndividuallyLifecycleInactive(tenant),
  )
}

export function historicalInactiveTenantsForSystem(systemId: string, tenants: Tenant[]): Tenant[] {
  return tenants.filter((tenant) =>
    isTenantLifecycleInactive(tenant) && tenantLatestHistoricalSystemId(tenant) === systemId,
  )
}

export function historicalInactiveTenantsForSystemRecord(
  record: SystemInventoryRecord,
  tenants: Tenant[],
  allocatedSystems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
): Tenant[] {
  if (isAllocatedSystem(record)) return historicalInactiveTenantsForSystem(record.id, tenants)
  if (!isReusedInternalSystem(record) || !record.machineId) return historicalInactiveTenantsForSystem(record.id, tenants)
  const physicalSystemIds = currentPhysicalSystemIdsForReusedRecord(record, allocatedSystems, projectSystems)
  return tenants.filter((tenant) =>
    isTenantLifecycleInactive(tenant) &&
    physicalSystemIds.has(tenantLatestHistoricalSystemId(tenant)),
  )
}

export function currentPhysicalSystemIdsForReusedRecord(
  record: ReusedInternalSystem,
  allocatedSystems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
): Set<string> {
  const physicalSystemIds = new Set([record.id])
  const activeLinks = activeProjectSystemLinks(projectSystems).filter((link) =>
    reusedInternalMachineIdsEqual(link.sourceMachineId, record.machineId) ||
    allocatedSystems.some((system) => system.id === link.systemId && reusedInternalMachineIdsEqual(system.machineId, record.machineId)),
  )
  const activeSystemIds = new Set(activeLinks.map((link) => link.systemId))
  if (activeSystemIds.size > 0) {
    allocatedSystems
      .filter((system) => activeSystemIds.has(system.id) && system.source === SYSTEM_SOURCE_REUSED_INTERNAL)
      .forEach((system) => physicalSystemIds.add(system.id))
  }
  return physicalSystemIds
}

export function canAddTenantFromSystemRecord(
  record: SystemInventoryRecord,
  projectSystems: ProjectSystemLink[] = [],
): boolean {
  if (isAllocatedSystem(record)) {
    return record.source === SYSTEM_SOURCE_REUSED_INTERNAL &&
      activeProjectSystemLinks(projectSystems).some((link) => link.systemId === record.id)
  }
  if (isReusedInternalSystem(record)) {
    return isReusedInternalManualOccupationPurpose(record.purpose)
  }
  return true
}

export function currentAllocatedSidForReusedInternalSystem(
  record: ReusedInternalSystem,
  projectSystems: ProjectSystemLink[] = [],
  allocatedSystems: System[] = [],
): System | undefined {
  if (!record.machineId) return undefined
  const activeSystemIds = new Set(
    activeProjectSystemLinks(projectSystems)
      .filter((link) =>
        reusedInternalMachineIdsEqual(link.sourceMachineId, record.machineId) ||
        allocatedSystems.some((system) => system.id === link.systemId && reusedInternalMachineIdsEqual(system.machineId, record.machineId)),
      )
      .map((link) => link.systemId),
  )
  return allocatedSystems.find((system) =>
    activeSystemIds.has(system.id) &&
    system.source === SYSTEM_SOURCE_REUSED_INTERNAL &&
    reusedInternalMachineIdsEqual(system.machineId, record.machineId),
  )
}

export function currentSidForSystemRecord(
  record: SystemInventoryRecord,
  allocatedSystems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
): string {
  if (isAllocatedSystem(record)) return record.sid ?? ''
  if (!isReusedInternalSystem(record)) return ''
  return currentAllocatedSidForReusedInternalSystem(record, projectSystems, allocatedSystems)?.sid ?? ''
}

export function activeProjectSystemLinksForSystemRecord(
  record: SystemInventoryRecord,
  projectSystems: ProjectSystemLink[] = [],
  allocatedSystems: System[] = [],
): ProjectSystemLink[] {
  const activeLinks = activeProjectSystemLinks(projectSystems)
  if (isReusedInternalSystem(record)) {
    return activeLinks.filter((link) =>
      link.systemId === record.id ||
      reusedInternalMachineIdsEqual(link.sourceMachineId, record.machineId) ||
      allocatedSystems.some((system) => system.id === link.systemId && reusedInternalMachineIdsEqual(system.machineId, record.machineId)),
    )
  }
  return activeLinks.filter((link) => link.systemId === record.id)
}

export function systemCancellationEligibilityMessages(
  record: SystemInventoryRecord,
  options: {
    projects?: Project[]
    projectSystems?: ProjectSystemLink[]
    allocatedSystems?: System[]
  } = {},
): string[] {
  const activeLinks = activeProjectSystemLinksForSystemRecord(record, options.projectSystems ?? [], options.allocatedSystems ?? [])
  const messages: string[] = []
  if (activeLinks.length > 0) {
    const pidList = Array.from(new Set(activeLinks
      .map((link) => options.projects?.find((project) => project.id === link.projectId)?.pid ?? link.projectId)
      .filter(Boolean)))
    messages.push(
      pidList.length === 1
        ? `System is currently allocated to project ${pidList[0]}. Deallocate the system from the project before cancelling it.`
        : `System is currently allocated to projects: ${pidList.join('; ')}. Deallocate the system from all projects before cancelling it.`,
    )
  }
  if (isReusedInternalSystem(record)) {
    const availabilityStatus = reusedInternalAvailabilityStatus(record, activeProjectSystemLinks(options.projectSystems ?? []), options.projects ?? [], options.allocatedSystems ?? [])
    if (isReusedInternalOccupied(availabilityStatus)) {
      messages.push('This Reused Internal System is currently occupied. Release it through the normal operational workflow before cancelling it.')
    }
  }
  return messages
}

export function canCancelSystemInventoryRecord(
  record: SystemInventoryRecord,
  options: {
    projects?: Project[]
    projectSystems?: ProjectSystemLink[]
    allocatedSystems?: System[]
  } = {},
): boolean {
  if (isAllocatedSystem(record)) return false
  if (!isReusedInternalSystem(record)) return systemCancellationEligibilityMessages(record, options).length === 0
  const availability = reusedInternalAvailabilityStatus(record, activeProjectSystemLinks(options.projectSystems ?? []), options.projects ?? [], options.allocatedSystems ?? [])
  return availability === REUSED_INTERNAL_STATUS_AVAILABLE &&
    record.purpose === REUSED_INTERNAL_PURPOSE_NONE &&
    systemCancellationEligibilityMessages(record, options).length === 0
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

export function systemApplicationConfigurationSummary(
  system: SystemInventoryRecord,
  tenants: Tenant[],
  allocatedSystems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
): TenantConfiguration {
  const hostedTenants = hostedTenantsForSystemRecord(system, tenants, allocatedSystems, projectSystems)
  const summary = applicationConfigurationFromTenant({
    ...(hostedTenants[0] ?? {}),
    id: `${system.id}-configuration-summary`,
    tid: '',
    accountId: 'accountId' in system ? system.accountId ?? '' : '',
    systemId: system.id,
    tenantType: 'CUSTOMER',
    accountName: '',
    country: 'country' in system ? system.country ?? '' : '',
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
    if (field.key === 'mapCenter') {
      summary.mapCenter = system.mapCenter || uniqueValues(hostedTenants.map((tenant) => tenant.mapCenter ?? tenant.configuration?.mapCenter))[0] || ''
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
  return reserveBusinessId('configurationHistory', records.map((record) => record.recordId))
}

export function createSystemConfigurationHistoryRecord(
  configuration: TenantConfiguration,
  existingRecords: ConfigurationHistoryRecord[] = [],
  timestamp = new Date().toISOString(),
  recordedBy = CURRENT_USER_DISPLAY_NAME,
  tid = '',
  attribution: { pid?: string; sid?: string } = {},
): ConfigurationHistoryRecord | null {
  if (existingRecords[0] && valuesEqual(existingRecords[0].configuration, configuration)) return null
  return {
    id: `system-config-history-${crypto.randomUUID()}`,
    recordId: nextConfigurationHistoryRecordId(existingRecords),
    timestamp,
    pid: attribution.pid,
    sid: attribution.sid,
    tid,
    recordedBy,
    configuration,
  }
}

export function configurationHistoryForSystemRecord(
  record: SystemInventoryRecord,
  allocatedSystems: System[] = [],
): ConfigurationHistoryRecord[] {
  const localRecords = record.configurationHistory ?? []
  if (isAllocatedSystem(record)) {
    return localRecords.filter((history) => !record.sid || !history.sid || history.sid === record.sid)
  }
  if (!isReusedInternalSystem(record) || !record.machineId) return localRecords
  const relatedAllocatedRecords = allocatedSystems.filter((system) =>
    system.source === SYSTEM_SOURCE_REUSED_INTERNAL &&
    reusedInternalMachineIdsEqual(system.machineId, record.machineId),
  )
  const recordsById = new Map<string, ConfigurationHistoryRecord>()
  ;[...localRecords, ...relatedAllocatedRecords.flatMap((system) => system.configurationHistory ?? [])].forEach((history) => {
    recordsById.set(history.id, history)
  })
  return Array.from(recordsById.values())
}

export function tenantCountForSystem(
  record: SystemInventoryRecord,
  tenants: Tenant[],
  allocatedSystems: System[] = [],
  projectSystems: ProjectSystemLink[] = [],
): number {
  if ('sid' in record) {
    // Hosting lifecycle is the authoritative System↔Tenant relationship. Use
    // the complete collection so table filtering and pagination cannot alter it.
    return currentTenantPopulationForSystem(record.id, tenants).length
  }
  if (isReusedInternalSystem(record) && record.machineId) {
    const activeSystemIds = new Set(
      activeProjectSystemLinks(projectSystems)
        .filter((link) =>
          reusedInternalMachineIdsEqual(link.sourceMachineId, record.machineId) ||
          allocatedSystems.some((system) => system.id === link.systemId && reusedInternalMachineIdsEqual(system.machineId, record.machineId)),
        )
        .map((link) => link.systemId),
    )
    if (activeSystemIds.size > 0) {
      return tenants.filter((tenant) =>
        isTenantOperationallyVisible(tenant) &&
        Array.from(activeSystemIds).some((systemId) => tenantIsActivelyHostedBySystem(tenant, systemId)),
      ).length
    }
    return currentTenantPopulationForSystem(record.id, tenants).length
  }
  return record.tenantCount || 0
}

export function linkedProjectIdsForSystem(record: SystemInventoryRecord, projectSystems: ProjectSystemLink[] = []): string[] {
  const projectIds = new Set(
    projectSystems
      .filter((link) => link.systemId === record.id)
      .map((link) => link.projectId),
  )
  if (!isAllocatedSystem(record) && 'machineId' in record && record.machineId) {
    projectSystems
      .filter((link) => reusedInternalMachineIdsEqual(link.sourceMachineId, record.machineId))
      .forEach((link) => projectIds.add(link.projectId))
  }
  return Array.from(projectIds)
}

export function allocatedReusedSystemOccupationWindow(
  system: System,
  projectSystemLinks: ProjectSystemLink[],
  projects: Project[],
): ReusedSystemOccupationWindow {
  if (system.source !== SYSTEM_SOURCE_REUSED_INTERNAL || !system.machineId) {
    return { ok: true, occupationStartDate: null, occupationEndDate: null }
  }
  const linkedPocEntries = projectSystemLinks
    .filter((link) => link.systemId === system.id)
    .map((link) => ({
      link,
      project: projects.find((project) => project.id === link.projectId),
    }))
    .filter((entry): entry is { link: ProjectSystemLink; project: Project } => Boolean(entry.project && entry.project.mainType === 'POC'))
  const linkedPocProjects = linkedPocEntries.map((entry) => entry.project)
  const activePocProjects = linkedPocEntries
    .filter((entry) => entry.link.allocationStatus !== 'DEALLOCATED' && entry.project.progressStatus === 'OPEN')
    .map((entry) => entry.project)

  if (linkedPocProjects.length > 0) {
    const missingStartDate = linkedPocProjects.find((project) => !project.pocStartDate)
    if (missingStartDate) {
      return { ok: false, message: `Project ${missingStartDate.pid} must have a POC Start Date before this Reused System can be allocated.` }
    }
    const missingEndDate = linkedPocProjects.find((project) => !project.pocEndDate)
    if (missingEndDate) {
      return { ok: false, message: `Project ${missingEndDate.pid} must have a POC End Date before this Reused System can be allocated.` }
    }
    return {
      ok: true,
      occupationStartDate: sortedDate(linkedPocProjects.map((project) => project.pocStartDate as string), 'asc'),
      occupationEndDate: sortedDate(linkedPocProjects.map((project) => project.pocEndDate as string), 'desc'),
      derivedFromActivePocAllocation: activePocProjects.length > 0,
      currentProjectIds: activePocProjects.map((project) => project.id),
    }
  }

  return {
    ok: true,
    occupationStartDate: system.occupationStartDate ?? null,
    occupationEndDate: system.occupationEndDate ?? null,
  }
}

export function applyAllocatedReusedSystemOccupationWindow(
  system: System,
  projectSystemLinks: ProjectSystemLink[],
  projects: Project[],
): System {
  if (system.source !== SYSTEM_SOURCE_REUSED_INTERNAL || !system.machineId) return system
  const window = allocatedReusedSystemOccupationWindow(system, projectSystemLinks, projects)
  if (!window.ok) return system
  const allLinksForSystem = projectSystemLinks.filter((link) => link.systemId === system.id)
  if (allLinksForSystem.length === 0) return system
  if (!window.derivedFromActivePocAllocation) {
    return system
  }
  const currentProjectIds = new Set(window.currentProjectIds ?? [])
  const activeProject = projects.find((project) => currentProjectIds.has(project.id))
  return {
    ...system,
    deliveryPid: activeProject?.pid ?? system.deliveryPid ?? '',
    tenantIds: Array.from(new Set(allLinksForSystem.flatMap((link) => link.tenantIds ?? []))),
    purpose: SYSTEM_PURPOSE_POC,
    availability: SYSTEM_AVAILABILITY_OCCUPIED,
    occupationStartDate: window.occupationStartDate ?? null,
    occupationEndDate: window.occupationEndDate ?? null,
  }
}

export function currentProjectPidsForSystem(
  record: SystemInventoryRecord,
  projects: Project[],
  projectSystems: ProjectSystemLink[] = [],
): string[] {
  return Array.from(
    new Set(
      linkedProjectIdsForSystem(record, projectSystems)
        .map((projectId) => projects.find((project) => project.id === projectId)?.pid ?? projectId)
        .filter(Boolean),
    ),
  )
}

export function linkedProjectDisplay(record: SystemInventoryRecord, projects: Project[], projectSystems: ProjectSystemLink[] = []): string {
  return currentProjectPidsForSystem(record, projects, projectSystems).join('; ')
}

export function systemTimeGroup(record: SystemInventoryRecord, tenants: Tenant[], timeGroupLookups: TimeGroupLookupRecord[] = []): string {
  if (!('sid' in record)) return ''
  return systemTimeGroupSource(record, tenants, timeGroupLookups).timeGroup
}

export function systemTimeGroupAlert(record: SystemInventoryRecord, tenants: Tenant[], fallback: unknown, timeGroupLookups: TimeGroupLookupRecord[] = []): string {
  void record
  void tenants
  void timeGroupLookups
  return String(fallback ?? '')
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
    .filter(isSystemOperationallyVisible)
    .filter(isAllocationEligibleSystem)
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
  if (isAllocatedSystem(record) && record.sid) {
    return `/systems/${record.sid}`
  }
  if (systemSource(record) === SYSTEM_SOURCE_REUSED_INTERNAL && 'machineId' in record && record.machineId) {
    return `/systems/reused-internal/${formattedReusedInternalMachineId(record.machineId)}`
  }
  return `/systems/production-inventory/${'sid' in record ? record.sid ?? '' : ''}`
}

export interface ReusedInternalPurposeHistoryRow {
  id: string
  recordId: string
  startDate: string
  endDate: string
  owner: string
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
    return record.purposeHistory.map((history) => {
      const project = projects.find((candidate) => candidate.pid === history.pid || candidate.id === history.pid)
      return {
        id: history.id,
        recordId: history.recordId,
        startDate: history.startDate,
        endDate: history.endDate ?? '',
        owner: history.owner ?? '',
        purposeType: history.purposeType,
        pid: history.pid ?? '',
        sid: history.sid ?? '',
        projectName: history.projectName ?? '',
        accountName: history.accountName ?? '',
        product: history.product ?? '',
        projectStatus: project?.progressStatus ?? history.projectStatus ?? '',
      }
    })
  }

  const rows: ReusedInternalPurposeHistoryRow[] = projectSystems
    .filter((link) => reusedInternalMachineIdsEqual(link.sourceMachineId, machineId))
    .map((link) => {
      const project = projects.find((candidate) => candidate.id === link.projectId)
      const system = systems.find((candidate) => candidate.id === link.systemId)
      return {
        id: link.id,
        recordId: link.id,
        startDate: link.allocatedAt,
        endDate: link.deallocatedAt ?? '',
        owner: '',
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
        recordId: `${machineId}-${projectId}`,
        startDate: record.occupationStartDate ?? '',
        endDate: record.occupationEndDate ?? '',
        owner: '',
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
