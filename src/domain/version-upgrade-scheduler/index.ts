import type { AppDataState, ReferenceDataRecord, System, UserRoleAssignment, VersionUpgradeRecord, VersionUpgradeSystemSchedule } from '@/data/seed.types'
import { systemBusinessId, systemReference, tenantReference, projectReference, accountReference } from '@/domain/business-reference'
import { referenceDataDisplayValue, referenceDataRecordById } from '@/domain/reference-data'
import { currentVersionUpdateForSystem } from '@/domain/system-version-update'
import { SYSTEM_OPERATIONAL_STATUS_CANCELED, SYSTEM_OPERATIONAL_STATUS_DELETED, SYSTEM_SOURCE_PRODUCTION } from '@/domain/system-inventory'
import { tenantDerivedWarrantyContractStatus } from '@/domain/tenant-operations'
import { isTenantOperationallyVisible, tenantIsActivelyHostedBySystem } from '@/domain/tenant-operations/lifecycle'
import { CLOUD_PLATFORM_OPTIONS } from '@/domain/hosting-context/metadata'
import { roleIdForName } from '@/domain/authorization'

export type VersionUpgradeSystemStatus = 'PENDING_UPGRADE_SCHEDULE' | 'UPGRADE_SCHEDULE_CONFIRMED' | 'SYSTEM_UPGRADED'
export type VersionUpgradeCompletionStatus = 'HAS_NOT_STARTED_YET' | 'IN_PROGRESS' | 'COMPLETED'
export type EngineerAvailability = 'Yes' | 'No'

export const VERSION_UPGRADE_CUSTOMER_TIME_ZONE_OPTIONS = [
  { value: 'ET', label: 'UTC-05:00 Eastern Time (ET)', offsetMinutes: -300 },
  { value: 'CET', label: 'UTC+01:00 Central Europe (CET)', offsetMinutes: 60 },
  { value: 'IST', label: 'UTC+02:00 Israel Time (IST)', offsetMinutes: 120 },
  { value: 'SGT', label: 'UTC+08:00 Singapore Standard Time (SGT)', offsetMinutes: 480 },
] as const

export const VERSION_UPGRADE_CLOUD_PLATFORM_OPTIONS = [
  ...CLOUD_PLATFORM_OPTIONS.filter((value) => value !== "Customer's datacenter"),
  'Customer VPC',
]

export const VERSION_UPGRADE_STATUS_LABELS: Record<VersionUpgradeSystemStatus, string> = {
  PENDING_UPGRADE_SCHEDULE: 'Pending Upgrade Schedule',
  UPGRADE_SCHEDULE_CONFIRMED: 'Upgrade Schedule Confirmed',
  SYSTEM_UPGRADED: 'System Upgraded',
}

export const VERSION_UPGRADE_COMPLETION_LABELS: Record<VersionUpgradeCompletionStatus, string> = {
  HAS_NOT_STARTED_YET: 'Has Not Started Yet',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
}

export const VERSION_UPGRADE_STATUS_COLOR_CLASSES: Record<VersionUpgradeSystemStatus, string> = {
  PENDING_UPGRADE_SCHEDULE: 'text-sf-text',
  UPGRADE_SCHEDULE_CONFIRMED: 'text-green-700',
  SYSTEM_UPGRADED: 'text-blue-700',
}

export interface VersionUpgradeProgress {
  total: number
  pending: number
  confirmed: number
  upgraded: number
  pendingPercent: number
  confirmedPercent: number
  upgradedPercent: number
  completionStatus: VersionUpgradeCompletionStatus
}

export interface VersionUpgradeCatalogOption {
  version: ReferenceDataRecord
  builds: ReferenceDataRecord[]
}

export interface VersionUpgradeDashboardRow {
  id: string
  record: VersionUpgradeRecord
  versionNumber: string
  buildNumber: string
  releaseDate: string | null
  phaseOutDate: string | null
  numberOfSystemsToUpgrade: number
  upgradeCompletionStatus: string
  plannedUpgradeSystems: string
  pendingUpgradeSchedule: string
  lastSystemsSync: string
  limitedToCloudPlatform: string
  operationalStatus: string
}

export interface VersionUpgradeSystemRow {
  id: string
  system: System
  schedule: VersionUpgradeSystemSchedule
  upgradeStatus: VersionUpgradeSystemStatus
  sid: string
  pid: string
  underContractTenants: AppDataState['tenants']
  notSetYetTenants: AppDataState['tenants']
  project: AppDataState['projects'][number] | undefined
  account: AppDataState['accounts'][number] | undefined
  currentVersion: string
  engineerTimeZone: string
  engineerLocalDate: string
  engineerLocalTime: string
  engineerAvailability: EngineerAvailability
  availabilityReason: string
}

function percent(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function inactiveStatus(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').trim().toLocaleLowerCase()
  return normalized === SYSTEM_OPERATIONAL_STATUS_DELETED.toLocaleLowerCase() ||
    normalized === SYSTEM_OPERATIONAL_STATUS_CANCELED.toLocaleLowerCase() ||
    normalized === 'cancelled'
}

function cloudPlatformMatches(systemValue: string | null | undefined, selectedValue: string): boolean {
  if (!selectedValue) return true
  const normalizedSystem = String(systemValue ?? '').trim()
  if (selectedValue === 'Customer VPC') return normalizedSystem === 'Customer VPC' || normalizedSystem === "Customer's datacenter"
  return normalizedSystem === selectedValue
}

export function versionUpgradeCatalog(referenceData: ReferenceDataRecord[], records: VersionUpgradeRecord[]): VersionUpgradeCatalogOption[] {
  const activeRecords = records.filter((record) => record.operationalStatus !== 'CANCELLED')
  const byVersion = new Map<string, ReferenceDataRecord[]>()
  activeRecords.forEach((record) => {
    const version = referenceDataRecordById(referenceData, record.versionNumberRefId)
    const build = referenceDataRecordById(referenceData, record.buildNumberRefId)
    if (!version || !build) return
    byVersion.set(version.id, [...(byVersion.get(version.id) ?? []), build])
  })
  return Array.from(byVersion.entries())
    .map(([versionId, builds]) => ({
      version: referenceDataRecordById(referenceData, versionId) as ReferenceDataRecord,
      builds: Array.from(new Map(builds.map((build) => [build.id, build])).values())
        .sort((first, second) => first.label.localeCompare(second.label, undefined, { numeric: true, sensitivity: 'base' })),
    }))
    .filter((option) => option.version)
    .sort((first, second) => first.version.label.localeCompare(second.version.label, undefined, { numeric: true, sensitivity: 'base' }))
}

export function schedulerBuildOptionsForVersion(referenceData: ReferenceDataRecord[], records: VersionUpgradeRecord[], versionNumberId: string): ReferenceDataRecord[] {
  return versionUpgradeCatalog(referenceData, records).find((option) => option.version.id === versionNumberId)?.builds ?? []
}

export function schedulerHasVersionBuildPair(records: VersionUpgradeRecord[], versionNumberRefId: string, buildNumberRefId: string, excludeId?: string): boolean {
  return records.some((record) =>
    record.id !== excludeId &&
    record.operationalStatus !== 'CANCELLED' &&
    record.versionNumberRefId === versionNumberRefId &&
    record.buildNumberRefId === buildNumberRefId,
  )
}

export function eligibleTenantsForProductionSystem(state: AppDataState, system: System): {
  underContract: AppDataState['tenants']
  notSetYet: AppDataState['tenants']
  all: AppDataState['tenants']
} {
  const hosted = state.tenants.filter((tenant) => tenantIsActivelyHostedBySystem(tenant, system.id) && isTenantOperationallyVisible(tenant))
  const underContract = hosted.filter((tenant) => tenantDerivedWarrantyContractStatus(tenant).status === 'UNDER_CONTRACT')
  const notSetYet = hosted.filter((tenant) => tenantDerivedWarrantyContractStatus(tenant).status === 'NOT_SET_YET')
  return { underContract, notSetYet, all: [...underContract, ...notSetYet] }
}

export function eligibleProductionSystemsForUpgrade(state: AppDataState, record: VersionUpgradeRecord): System[] {
  if (record.operationalStatus === 'CANCELLED') return []
  return state.systems.filter((system) => {
    if (system.source !== SYSTEM_SOURCE_PRODUCTION) return false
    if (inactiveStatus(system.operationalStatus)) return false
    if (!cloudPlatformMatches(system.cloudPlatform, record.limitedToCloudPlatform)) return false
    return eligibleTenantsForProductionSystem(state, system).all.length > 0
  })
}

export function versionUpgradeSystemSchedule(record: VersionUpgradeRecord, systemId: string): VersionUpgradeSystemSchedule {
  return record.schedules.find((schedule) => schedule.systemId === systemId) ?? {
    systemId,
    requestedUpgradeDate: null,
    requestedUpgradeTime: '',
    customerTimeZone: '',
    csComments: '',
    scheduleConfirmed: false,
    activityDurationHours: null,
    assignedEngineerUserId: '',
    confirmedAt: null,
    confirmedBy: null,
    updatedAt: record.updatedAt,
    updatedBy: record.updatedBy,
  }
}

export function systemIsUpgradedToVersionBuild(state: AppDataState, systemId: string, versionNumberRefId: string, buildNumberRefId: string): boolean {
  return state.versionUpdates.some((update) =>
    update.systemId === systemId &&
    !update.deletedAt &&
    update.versionNumberRefId === versionNumberRefId &&
    update.buildNumberRefId === buildNumberRefId,
  )
}

export function deriveVersionUpgradeSystemStatus(state: AppDataState, record: VersionUpgradeRecord, systemId: string): VersionUpgradeSystemStatus {
  if (systemIsUpgradedToVersionBuild(state, systemId, record.versionNumberRefId, record.buildNumberRefId)) return 'SYSTEM_UPGRADED'
  return versionUpgradeSystemSchedule(record, systemId).scheduleConfirmed ? 'UPGRADE_SCHEDULE_CONFIRMED' : 'PENDING_UPGRADE_SCHEDULE'
}

export function deriveVersionUpgradeProgress(state: AppDataState, record: VersionUpgradeRecord): VersionUpgradeProgress {
  const systems = eligibleProductionSystemsForUpgrade(state, record)
  const total = systems.length
  const upgraded = systems.filter((system) => deriveVersionUpgradeSystemStatus(state, record, system.id) === 'SYSTEM_UPGRADED').length
  const confirmed = systems.filter((system) => deriveVersionUpgradeSystemStatus(state, record, system.id) === 'UPGRADE_SCHEDULE_CONFIRMED').length
  const pending = total - upgraded - confirmed
  const upgradedPercent = percent(upgraded, total)
  return {
    total,
    pending,
    confirmed,
    upgraded,
    pendingPercent: percent(pending, total),
    confirmedPercent: percent(confirmed, total),
    upgradedPercent,
    completionStatus: upgradedPercent === 0 || total === 0 ? 'HAS_NOT_STARTED_YET' : upgradedPercent === 100 ? 'COMPLETED' : 'IN_PROGRESS',
  }
}

function progressSummary(count: number, percentage: number): string {
  return `${count} (${percentage}%)`
}

export function deriveVersionUpgradeDashboardRows(state: AppDataState): VersionUpgradeDashboardRow[] {
  return state.versionUpgradeRecords.map((record) => {
    const progress = deriveVersionUpgradeProgress(state, record)
    return {
      id: record.id,
      record,
      versionNumber: referenceDataDisplayValue(state.referenceData, record.versionNumberRefId),
      buildNumber: referenceDataDisplayValue(state.referenceData, record.buildNumberRefId),
      releaseDate: record.releaseDate,
      phaseOutDate: record.phaseOutDate,
      numberOfSystemsToUpgrade: progress.total,
      upgradeCompletionStatus: progressSummary(progress.upgraded, progress.upgradedPercent),
      plannedUpgradeSystems: progressSummary(progress.confirmed, progress.confirmedPercent),
      pendingUpgradeSchedule: progressSummary(progress.pending, progress.pendingPercent),
      lastSystemsSync: state.lastPersistedAt ?? record.updatedAt,
      limitedToCloudPlatform: record.limitedToCloudPlatform || '-',
      operationalStatus: record.operationalStatus === 'CANCELLED' ? 'Cancelled' : VERSION_UPGRADE_COMPLETION_LABELS[progress.completionStatus],
    }
  })
}

function customerTimeZoneOffset(value: string): number | null {
  return VERSION_UPGRADE_CUSTOMER_TIME_ZONE_OPTIONS.find((option) => option.value === value)?.offsetMinutes ?? null
}

function offsetDateTimeToUtc(dateValue: string | null, timeValue: string, offsetMinutes: number | null): Date | null {
  if (!dateValue || !timeValue || offsetMinutes == null) return null
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - offsetMinutes * 60_000)
}

function userTimezone(assignment: UserRoleAssignment | undefined): string {
  const value = (assignment as (UserRoleAssignment & { timeZone?: string }) | undefined)?.timeZone
  return typeof value === 'string' ? value.trim() : ''
}

function fixedOffsetMinutes(value: string): number | null {
  const match = value.match(/UTC([+-])(\d{2}):?(\d{2})/)
  if (!match) return null
  const sign = match[1] === '-' ? -1 : 1
  return sign * ((Number(match[2]) * 60) + Number(match[3]))
}

function localDateTime(utc: Date | null, engineerTimeZone: string): { date: string; time: string } {
  const offset = fixedOffsetMinutes(engineerTimeZone)
  if (!utc || offset == null) return { date: '', time: '' }
  const local = new Date(utc.getTime() + offset * 60_000)
  return { date: local.toISOString().slice(0, 10), time: local.toISOString().slice(11, 16) }
}

function scheduleInterval(schedule: VersionUpgradeSystemSchedule, engineerTimeZoneRequired = false): { start: number; end: number } | null {
  const start = offsetDateTimeToUtc(schedule.requestedUpgradeDate, schedule.requestedUpgradeTime, customerTimeZoneOffset(schedule.customerTimeZone))
  const duration = schedule.activityDurationHours
  if (!start || !duration || duration <= 0) return null
  if (engineerTimeZoneRequired && !schedule.assignedEngineerUserId) return null
  return { start: start.getTime(), end: start.getTime() + duration * 60 * 60_000 }
}

function intervalsOverlap(first: { start: number; end: number }, second: { start: number; end: number }): boolean {
  return first.start < second.end && second.start < first.end
}

export function supportEngineerAssignments(state: Pick<AppDataState, 'roles' | 'userRoleAssignments'>): UserRoleAssignment[] {
  const supportEngineerRoleId = roleIdForName('Support Engineer')
  return state.userRoleAssignments.filter((assignment) => assignment.roleIds.includes(supportEngineerRoleId))
}

export function deriveEngineerAvailability(state: AppDataState, record: VersionUpgradeRecord, schedule: VersionUpgradeSystemSchedule): { availability: EngineerAvailability; reason: string } {
  if (!schedule.scheduleConfirmed) return { availability: 'Yes', reason: '' }
  if (!schedule.assignedEngineerUserId) return { availability: 'No', reason: 'Assigned Engineer is required.' }
  const interval = scheduleInterval(schedule, true)
  if (!interval) return { availability: 'No', reason: 'Complete date, time, time zone and duration before confirming.' }
  const collided = state.versionUpgradeRecords.some((campaign) =>
    campaign.id !== record.id &&
    campaign.operationalStatus !== 'CANCELLED' &&
    campaign.schedules.some((candidate) => {
      if (!candidate.scheduleConfirmed || candidate.assignedEngineerUserId !== schedule.assignedEngineerUserId) return false
      const candidateInterval = scheduleInterval(candidate, true)
      return Boolean(candidateInterval && intervalsOverlap(interval, candidateInterval))
    }),
  )
  return collided ? { availability: 'No', reason: 'Assigned Engineer has an overlapping confirmed upgrade activity.' } : { availability: 'Yes', reason: '' }
}

export function deriveVersionUpgradeSystemRows(state: AppDataState, record: VersionUpgradeRecord): VersionUpgradeSystemRow[] {
  return eligibleProductionSystemsForUpgrade(state, record).map((system) => {
    const tenants = eligibleTenantsForProductionSystem(state, system)
    const schedule = versionUpgradeSystemSchedule(record, system.id)
    const activeProjectSystemLink = state.projectSystems.find((link) => link.systemId === system.id && link.allocationStatus !== 'DEALLOCATED')
    const project = (system.deliveryPid ? state.projects.find((candidate) => candidate.pid === system.deliveryPid) : undefined)
      ?? (activeProjectSystemLink ? state.projects.find((candidate) => candidate.id === activeProjectSystemLink.projectId) : undefined)
    const account = project ? state.accounts.find((candidate) => candidate.accountName === project.accountName) : undefined
    const current = currentVersionUpdateForSystem(state.versionUpdates, system.id, system.currentVersionUpdateId)
    const version = referenceDataDisplayValue(state.referenceData, current?.versionNumberRefId)
    const build = referenceDataDisplayValue(state.referenceData, current?.buildNumberRefId)
    const assignment = state.userRoleAssignments.find((candidate) => candidate.userId === schedule.assignedEngineerUserId)
    const engineerTimeZone = userTimezone(assignment)
    const utcStart = offsetDateTimeToUtc(schedule.requestedUpgradeDate, schedule.requestedUpgradeTime, customerTimeZoneOffset(schedule.customerTimeZone))
    const local = localDateTime(utcStart, engineerTimeZone)
    const availability = deriveEngineerAvailability(state, record, schedule)
    return {
      id: system.id,
      system,
      schedule,
      upgradeStatus: deriveVersionUpgradeSystemStatus(state, record, system.id),
      sid: systemBusinessId(system),
      pid: project?.pid ?? system.deliveryPid ?? '',
      underContractTenants: tenants.underContract,
      notSetYetTenants: tenants.notSetYet,
      project,
      account,
      currentVersion: version || build ? `${version || '-'} / ${build || '-'}` : '-',
      engineerTimeZone,
      engineerLocalDate: local.date,
      engineerLocalTime: local.time,
      engineerAvailability: availability.availability,
      availabilityReason: availability.reason,
    }
  })
}

export function versionUpgradeRef(record: VersionUpgradeRecord, referenceData: ReferenceDataRecord[]) {
  const version = referenceDataDisplayValue(referenceData, record.versionNumberRefId) || record.versionNumberRefId
  const build = referenceDataDisplayValue(referenceData, record.buildNumberRefId) || record.buildNumberRefId
  return {
    objectType: 'VERSION_UPGRADE',
    id: record.id,
    businessId: `${version}/${build}`,
    displayLabel: `Version Upgrade ${version} / ${build}`,
    routePath: `/version-upgrades/${record.id}`,
  }
}

export function versionUpgradeRelatedRefsForSystemRow(row: VersionUpgradeSystemRow) {
  return [
    systemReference(row.system),
    row.project ? projectReference(row.project) : null,
    row.account ? accountReference(row.account) : null,
    ...row.underContractTenants.map((tenant) => tenantReference(tenant)),
    ...row.notSetYetTenants.map((tenant) => tenantReference(tenant)),
  ].filter(Boolean)
}
