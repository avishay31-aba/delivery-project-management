import { create } from 'zustand'
import type {
  AllocationSource,
  AllocationType,
  AppDataState,
  Opportunity,
  OpportunitySubType,
  OpportunityType,
  ReferenceDataRecord,
  ReferenceDataType,
  GeographicCountryRecord,
  GeographicUsStateRecord,
  InfrastructureItem,
  TimeGroupLookupRecord,
  UserPresentationPreference,
  VersionUpdateAttachmentRecord,
  VersionUpgradeRecord,
  VersionUpgradeSystemSchedule,
  VersionUpdateRecord,
  DocumentRecord,
  RemarkRecord,
  ConfigurationHistoryRecord,
  TenantConfigurationHistoryRecord,
  RoleDefinition,
  NotificationRuleDefinition,
  ReminderExecutionRecord,
} from '@/data/seed.types'
import { CURRENT_USER_DISPLAY_NAME, CURRENT_USER_ID } from '@/config/current-user'
import { commitBusinessIdFromCounter, generateBusinessIdFromCounter, reserveBusinessId } from '@/domain/business-identity'
import {
  createActivityEvent,
  type ActivityObjectRefInput,
  type ActivityEventCategory,
  type ActivityEventInput,
  type ActivityEvent,
} from '@/domain/activity-log'
import {
  accountReference,
  activityObjectRefFromBusinessReference,
  opportunityReference,
  projectReference,
  systemBusinessId,
  systemReference,
  tenantReference,
} from '@/domain/business-reference'
import {
  createInitialState,
  loadPersistedState,
  persistState,
  clearPersistedState,
} from '@/store/persistence'
import {
  publishCommittedStateChange,
  requestCommittedStateSnapshot,
  subscribeToCommittedStateChanges,
} from '@/store/crossTabSync'
import {
  activeProjectSystemLinks,
  activeProjectTenantLinks,
  createProjectSystemLink,
  createProjectTenantLink,
  deallocateProjectSystemLink,
  deallocateProjectTenantLink,
  normalizeAllocationSources,
  projectBusinessRegionForAllocation,
  requiredExistingTenantAllocationsForProject,
  resolvedProjectSystemAllocationSources,
  resolvedProjectTenantAllocationSources,
  unlinkProjectFromSystem,
  validateExistingSystemLink,
  validateProductionAllocation,
  validateProjectSystemDeallocation,
  validateReusedInternalAllocation,
  type AllocationActionResult,
} from '@/domain/allocation-context'
import {
  createProductionInventorySystem,
  createReusedInternalInventorySystem,
  createStandaloneSystem,
  createSystemConfigurationHistoryRecord,
  applyAllocatedReusedSystemOccupationWindow,
  hasActiveOpenPocPurposeLock,
  isReusedInternalOccupied,
  isOccupationPeriodVisibleForPurpose,
  reusedInternalAvailabilityStatus,
  SYSTEM_PURPOSE_DELIVERY,
  SYSTEM_OPERATIONAL_STATUS_ACCESS_BLOCKED,
  SYSTEM_OPERATIONAL_STATUS_CANCELED,
  SYSTEM_OPERATIONAL_STATUS_OFF,
  SYSTEM_OPERATIONAL_STATUS_ON,
  SYSTEM_OPERATIONAL_STATUS_SERVICE_BLOCKED,
  SYSTEM_SOURCE_REUSED_INTERNAL,
  normalizeSystemInventoryRecord,
  normalizeReusedInternalMachineId,
  occupyReusedInternalSystem,
  applyReusedSystemOccupationWindow,
  purposeHistoryContextFromProject,
  releaseReusedInternalSystem,
  reusedInternalHasActivePocAllocation,
  reusedInternalMachineIdsEqual,
  reusedInternalMachineIdRouteKey,
  reusedInternalStatusForPurpose,
  SYSTEM_AVAILABILITY_AVAILABLE,
  purposeHistoryOwnerSnapshot,
  systemApplicationConfigurationSummary,
  systemFromProductionInventoryAllocation,
  systemFromReusedInternalAllocation,
  updateReusedInternalPurpose,
  validateReusedInternalPurposeChange,
  validateSystemInventoryRequiredFields,
} from '@/domain/system-inventory'
import {
  applicableOpportunityRequirementSources,
  createOpportunityDraft,
  syncOpportunityProjectsFromOpportunity,
  type OpportunityProjectSyncOptions,
  type OpportunityProjectSyncResult,
  type ProjectLifecycleChange,
} from '@/domain/opportunity-lifecycle'
import { applyProjectLifecycleStatus, createStandaloneProject, latestProjectDeletionEntry, projectDeletionHistory, projectHeaderFieldValue, projectStatusFromTaskCompletion, projectStatusLabel, projectTimeZoneResolution } from '@/domain/project-lifecycle'
import { applyGeographicTimeZone } from '@/domain/geographic-time-zone'
import { getBusinessRegionForCountry, normalizeBusinessRegion } from '@/domain/business-region'
import {
  businessRegionForCountry,
  normalizeCountryLookups,
  normalizeUsStateLookups,
  validateCountryLookupRows,
  validateUsStateLookupRows,
} from '@/domain/geographic-configuration'
import { normalizeTenantTimeGroup, normalizeTimeGroupLookups, systemTimeGroupSource, systemsWithDerivedTimeGroups, tenantIsEligibleSystemTimeGroupGovernor, tenantTimeGroupFromLocation, timeGroupForTimeZone, timeGroupFromLocation, validateTimeGroupLookupRows } from '@/domain/time-groups'
import { USER_PREFERENCE_TYPE_RECORDS_PER_PAGE, normalizeRecordsPerPageValue } from '@/domain/user-preferences'
import { richTextIsEmpty } from '@/domain/rich-text'
import {
  normalizeReferenceLabel,
  referenceDataLabel,
  REFERENCE_DATA_TYPE_LABELS,
  validateReferenceDataLabel,
} from '@/domain/reference-data'
import { commitVersionUpdateAttachment, type PendingAttachmentDraft } from '@/domain/attachment'
import { validateVersionUpdateDraft } from '@/domain/system-version-update'
import {
  deriveEngineerAvailability,
  schedulerHasVersionBuildPair,
  versionUpgradeRef,
} from '@/domain/version-upgrade-scheduler'
import { normalizeIdCounters } from '@/data/id-generator'
import { reconcileGlobalChildRecords } from '@/domain/global-child-objects'
import {
  canExecuteAction,
  normalizeRoles,
  normalizeUserRoleAssignments,
} from '@/domain/authorization'
import {
  normalizeNotificationRules,
  notificationReadStatusForUser,
  reconcileNotificationsAndAlerts,
} from '@/domain/notifications-alerts'
import {
  deriveReminderRows,
  reminderExecutionIdForSource,
} from '@/domain/reminders'
import {
  deletedTenantHostedSystemHistory,
  endedTenantHostedSystemHistory,
  isTenantIndividuallyLifecycleInactive,
  isTenantLifecycleInactive,
  isTenantSystemForced,
  isEligiblePocTenantForCustomerExistingContext,
  resolveTenantCreationSource,
  systemForTenant,
  TENANT_OPERATIONAL_STATUS_CANCELLED,
  TENANT_OPERATIONAL_STATUS_DELETED,
  TENANT_SYSTEM_FORCED_STATUS_ACCESS_BLOCKED,
  TENANT_SYSTEM_FORCED_STATUS_OFF,
  TENANT_SYSTEM_FORCED_STATUS_SERVICE_BLOCKED,
  tenantIsActivelyHostedBySystem,
  tenantFormType,
  tenantCreationDraftFromSource,
  tenantConfigurationSaveDraft,
} from '@/domain/tenant-operations'
import { requiresCloudPlatform } from '@/domain/hosting-context'
import { changeRequestRequirementWithTenantBaseline, opportunityWithUniqueTenantRequirementIds, unavailableRequirementIdsForOpportunitySave } from '@/domain/tenant-requirement'
import {
  INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE,
  INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE,
  INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE,
  INFRASTRUCTURE_MAINTENANCE_TASK_TYPE_REFERENCE_TYPE,
  INFRASTRUCTURE_OWNER_REFERENCE_TYPE,
  INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE,
  INFRASTRUCTURE_TYPE_REFERENCE_TYPE,
  INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE,
  INFRASTRUCTURE_CANCELLED_OPERATIONAL_STATUS,
  INFRASTRUCTURE_DELETED_OPERATIONAL_STATUS,
  normalizeInfrastructureMaintenanceTasks,
  normalizeInfrastructureWarrantyCollection,
  normalizeInfrastructureItem,
  normalizeInfrastructureIdentifier,
  infrastructureDeletionHistory,
  latestInfrastructureDeletionEntry,
  validateInfrastructureItemDraft,
} from '@/domain/infrastructure-item'

type ActivityEventDraft = Omit<ActivityEventInput, 'id' | 'occurredAt'>
type SaveTimestampOptions = { preserveNewState?: boolean }
type TenantTimeGroupMismatchDecision = 'continue' | 'change'
type TenantTimeGroupOverrideOptions = { timeGroupMismatchDecision?: TenantTimeGroupMismatchDecision }
let unsubscribeCommittedStateChanges: (() => void) | null = null
const RIS_OWNER_REQUIRED_PURPOSES = new Set(['Demo', 'Training', 'Support'])

function reusedInternalOwnerRequirementMessages(
  next: { purpose: string; owners?: unknown[] },
): string[] {
  if (!RIS_OWNER_REQUIRED_PURPOSES.has(next.purpose)) return []
  return (next.owners ?? []).length > 0 ? [] : [`A ${next.purpose} system must have an owner.`]
}

function requestCommittedStateSnapshotsOnStartup() {
  requestCommittedStateSnapshot()
  if (typeof window === 'undefined') return
  window.setTimeout(requestCommittedStateSnapshot, 250)
  window.setTimeout(requestCommittedStateSnapshot, 1000)
}

type RebasedCollectionKey = {
  [Key in keyof AppDataState]: AppDataState[Key] extends Array<unknown> ? Key : never
}[keyof AppDataState]

const REBASED_COLLECTION_KEYS: RebasedCollectionKey[] = [
  'salesManagers',
  'accounts',
  'opportunities',
  'projects',
  'productionSystemInventory',
  'reusedInternalSystems',
  'systems',
  'tenants',
  'warrantyRecords',
  'referenceData',
  'countryLookups',
  'usStateLookups',
  'timeGroupLookups',
  'userPresentationPreferences',
  'versionUpgradeRecords',
  'versionUpdates',
  'infrastructureItems',
  'activityEvents',
  'roles',
  'userRoleAssignments',
  'notificationRules',
  'notificationRecords',
  'alertRecords',
  'reminderExecutions',
  'projectSystems',
  'projectTenants',
]

function recordKeyForPersistence(collection: RebasedCollectionKey, value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const keyedValue =
    collection === 'projects' ? record.pid ?? record.id :
    collection === 'opportunities' ? record.opportunityId ?? record.id :
    collection === 'productionSystemInventory' || collection === 'systems' ? record.sid ?? record.id :
    collection === 'reusedInternalSystems' ? record.machineId ?? record.id :
    collection === 'tenants' ? record.tid ?? record.id :
    collection === 'infrastructureItems' ? record.infrastructureId ?? record.id :
    collection === 'warrantyRecords' ? record.warrantyRecordId ?? record.id :
    record.id ?? record.businessId
  return typeof keyedValue === 'string' && keyedValue.trim() ? `${collection}:${keyedValue}` : null
}

function rebaseCollectionForPersistence<T>(collection: RebasedCollectionKey, current: T[], latest: T[]): T[] {
  const currentKeys = new Set(current.map((item) => recordKeyForPersistence(collection, item)).filter((key): key is string => Boolean(key)))
  const preserved = latest.filter((item) => {
    const key = recordKeyForPersistence(collection, item)
    return key ? !currentKeys.has(key) : false
  })
  return preserved.length > 0 ? [...current, ...preserved] : current
}

function rebaseAppDataStateForPersistence(current: AppDataState, latest: AppDataState | null): AppDataState {
  if (!latest) return current
  const currentPersistedAt = current.lastPersistedAt ?? ''
  const latestPersistedAt = latest.lastPersistedAt ?? ''
  if (!latestPersistedAt || latestPersistedAt <= currentPersistedAt) return current

  const rebased: AppDataState = {
    ...current,
  }
  REBASED_COLLECTION_KEYS.forEach((key) => {
    rebased[key] = rebaseCollectionForPersistence(key, current[key] as never[], latest[key] as never[]) as never
  })
  return {
    ...rebased,
    idCounters: normalizeIdCounters({
      ...latest.idCounters,
      ...current.idCounters,
    }, rebased),
  }
}

function stableIncomingCollection<T>(collection: RebasedCollectionKey, current: T[], incoming: T[]): T[] {
  const currentByKey = new Map<string, T>()
  current.forEach((item) => {
    const key = recordKeyForPersistence(collection, item)
    if (key) currentByKey.set(key, item)
  })

  let changed = current.length !== incoming.length
  const merged = incoming.map((incomingItem, index) => {
    const key = recordKeyForPersistence(collection, incomingItem)
    const currentItem = key ? currentByKey.get(key) : current[index]
    if (currentItem && valuesEqual(currentItem, incomingItem)) {
      if (currentItem !== current[index]) changed = true
      return currentItem
    }
    changed = true
    return incomingItem
  })

  if (!changed && merged.every((item, index) => item === current[index])) return current
  return merged
}

function mergeIncomingCommittedState(current: AppStore, incomingState: AppDataState): Partial<AppStore> {
  const incoming = reconcileNotificationsAndAlerts(incomingState)
  const next: Partial<AppStore> = {
    hydrated: true,
  }

  REBASED_COLLECTION_KEYS.forEach((key) => {
    next[key] = stableIncomingCollection(
      key,
      current[key] as never[],
      incoming[key] as never[],
    ) as never
  })

  next.version = incoming.version
  next.lastPersistedAt = incoming.lastPersistedAt
  next.idCounters = valuesEqual(current.idCounters, incoming.idCounters) ? current.idCounters : incoming.idCounters

  return next
}

function opportunityWithCommittedRequirementContext(opportunity: Opportunity, tenants: AppDataState['tenants']): Opportunity {
  return {
    ...opportunity,
    newTenantRequirements: opportunity.newTenantRequirements.map((requirement) => ({
      ...requirement,
      cloudPlatform: requiresCloudPlatform(requirement.hostingType) ? requirement.cloudPlatform : '',
    })),
    changeRequestRequirements: opportunity.changeRequestRequirements.map((requirement) => {
      const tenant = tenants.find((candidate) => candidate.id === requirement.tenantId)
      return changeRequestRequirementWithTenantBaseline(
        {
          ...requirement,
          cloudPlatform: requiresCloudPlatform(requirement.hostingType) ? requirement.cloudPlatform : '',
        },
        tenant,
      )
    }),
  }
}

function opportunityWithDerivedGeography(
  opportunity: Opportunity,
  timeGroupLookups: TimeGroupLookupRecord[],
  countryLookups: GeographicCountryRecord[] = [],
  usStateLookups: GeographicUsStateRecord[] = [],
): Opportunity {
  const countries = normalizeCountryLookups(countryLookups)
  const states = normalizeUsStateLookups(usStateLookups)
  const region = businessRegionForCountry(countries, opportunity.country) || getBusinessRegionForCountry(opportunity.country, opportunity.state) || normalizeBusinessRegion(opportunity.region)
  const located = applyGeographicTimeZone(
    {
      ...opportunity,
      region,
      timeGroup: opportunity.timeGroup || '',
    },
    opportunity.deliveryDate ?? opportunity.pocStartDate,
    countries,
    states,
  )
  return { ...located, timeGroup: timeGroupForTimeZone(timeGroupLookups, located.timeZone) }
}

function accountWithDerivedGeography(
  account: AppDataState['accounts'][number],
  timeGroupLookups: TimeGroupLookupRecord[],
  countryLookups: GeographicCountryRecord[] = [],
  usStateLookups: GeographicUsStateRecord[] = [],
): AppDataState['accounts'][number] {
  const countries = normalizeCountryLookups(countryLookups)
  const states = normalizeUsStateLookups(usStateLookups)
  const region = businessRegionForCountry(countries, account.country) || getBusinessRegionForCountry(account.country, account.state) || normalizeBusinessRegion(account.region)
  const located = applyGeographicTimeZone({
    ...account,
    region,
    timeGroup: account.timeGroup || '',
  }, undefined, countries, states)
  return { ...located, timeGroup: timeGroupForTimeZone(timeGroupLookups, located.timeZone) }
}

function appendActivityEvent(
  events: ActivityEvent[],
  now: string,
  draft: ActivityEventDraft,
): ActivityEvent[] {
  const eventId = reserveBusinessId('activity', events.map((event) => event.id))
  return [
    createActivityEvent({
      ...draft,
      id: eventId,
      occurredAt: now,
    }),
    ...events,
  ]
}

function projectRef(project: AppDataState['projects'][number]): ActivityObjectRefInput {
  return activityObjectRefFromBusinessReference(projectReference(project))
}

function tenantRef(tenant: AppDataState['tenants'][number]): ActivityObjectRefInput {
  return activityObjectRefFromBusinessReference(tenantReference(tenant))
}

function systemRef(system: AppDataState['systems'][number] | AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number]): ActivityObjectRefInput {
  return activityObjectRefFromBusinessReference(systemReference(system))
}

function allocationRef(allocation: AppDataState['projectSystems'][number]): ActivityObjectRefInput {
  return {
    objectType: 'ALLOCATION',
    id: allocation.id,
    businessId: allocation.id,
    displayLabel: allocation.id,
  }
}

function customerRef(account: AppDataState['accounts'][number] | undefined): ActivityObjectRefInput | null {
  if (!account) return null
  return activityObjectRefFromBusinessReference(accountReference(account))
}

function requirementRef(requirementId: string): ActivityObjectRefInput {
  return {
    objectType: 'REQUIREMENT',
    id: requirementId,
    businessId: requirementId,
    displayLabel: requirementId,
  }
}

function referenceDataRef(record: ReferenceDataRecord): ActivityObjectRefInput {
  return {
    objectType: record.referenceType,
    id: record.id,
    businessId: record.id,
    displayLabel: `${REFERENCE_DATA_TYPE_LABELS[record.referenceType]} ${record.label}`,
  }
}

function infrastructureMaintenanceTaskIds(items: InfrastructureItem[], excludeItemId?: string): string[] {
  return items
    .filter((item) => item.id !== excludeItemId)
    .flatMap((item) => (item.maintenanceTasks ?? []).map((task) => task.taskId))
    .filter(Boolean)
}

function infrastructureWarrantyIds(items: InfrastructureItem[], excludeItemId?: string): string[] {
  return items
    .filter((item) => item.id !== excludeItemId)
    .flatMap((item) => (item.warranties ?? []).map((warranty) => warranty.warrantyId))
    .filter(Boolean)
}

function versionUpdateRef(record: VersionUpdateRecord): ActivityObjectRefInput {
  return {
    objectType: 'VERSION_UPDATE',
    id: record.id,
    businessId: record.id,
    displayLabel: `Version Update ${record.id}`,
  }
}

type VersionUpdateSystemRecord =
  | AppDataState['productionSystemInventory'][number]
  | AppDataState['reusedInternalSystems'][number]
  | AppDataState['systems'][number]
type VersionUpdateCurrentPatch = Partial<Pick<VersionUpdateSystemRecord, 'currentVersionUpdateId' | 'currentVersionNumberRefId' | 'currentBuildNumberRefId'>>

function versionSystemSnapshot(system: VersionUpdateSystemRecord): { mid: string; sid: string } {
  return {
    mid: 'machineId' in system ? system.machineId ?? '' : '',
    sid: 'sid' in system ? system.sid ?? '' : '',
  }
}

function cloneVersionUpdateRecordsForSystem(input: {
  sourceSystemId: string
  sourceCurrentVersionUpdateId?: string | null
  targetSystem: VersionUpdateSystemRecord
  targetCollection: VersionUpdateRecord['systemCollection']
  versionUpdates: VersionUpdateRecord[]
  idCounters: AppDataState['idCounters']
  timestamp: string
}): {
  idCounters: AppDataState['idCounters']
  records: VersionUpdateRecord[]
  currentPatch: VersionUpdateCurrentPatch
} {
  const sourceRecords = input.versionUpdates
    .filter((record) => record.systemId === input.sourceSystemId && !record.deletedAt)
    .sort((first, second) => first.committedSequence - second.committedSequence || first.committedAt.localeCompare(second.committedAt))
  if (sourceRecords.length === 0) return { idCounters: input.idCounters, records: [], currentPatch: {} }

  let idCounters = input.idCounters
  const usedVersionUpdateIds = input.versionUpdates.map((record) => record.id)
  const usedAttachmentIds = input.versionUpdates.flatMap((record) => record.attachments.map((attachment) => attachment.id))
  const targetSnapshot = versionSystemSnapshot(input.targetSystem)
  const sourceToCloneId = new Map<string, string>()
  const records = sourceRecords.map((sourceRecord) => {
    const nextVersionUpdateIdentity = generateBusinessIdFromCounter('versionUpdate', idCounters, usedVersionUpdateIds)
    idCounters = nextVersionUpdateIdentity.counters
    usedVersionUpdateIds.push(nextVersionUpdateIdentity.id)
    sourceToCloneId.set(sourceRecord.id, nextVersionUpdateIdentity.id)
    const attachments = sourceRecord.attachments.map((attachment) => {
      const nextAttachmentIdentity = generateBusinessIdFromCounter('versionUpdateAttachment', idCounters, usedAttachmentIds)
      idCounters = nextAttachmentIdentity.counters
      usedAttachmentIds.push(nextAttachmentIdentity.id)
      return {
        ...attachment,
        id: nextAttachmentIdentity.id,
        parentBusinessId: nextVersionUpdateIdentity.id,
      }
    })
    return {
      ...sourceRecord,
      id: nextVersionUpdateIdentity.id,
      systemId: input.targetSystem.id,
      systemCollection: input.targetCollection,
      midSnapshot: targetSnapshot.mid,
      sidSnapshot: targetSnapshot.sid,
      attachments,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    }
  })
  const sourceCurrentRecord =
    sourceRecords.find((record) => record.id === input.sourceCurrentVersionUpdateId) ??
    sourceRecords[sourceRecords.length - 1]
  const clonedCurrentRecord = sourceCurrentRecord
    ? records.find((record) => record.id === sourceToCloneId.get(sourceCurrentRecord.id))
    : undefined
  return {
    idCounters,
    records,
    currentPatch: clonedCurrentRecord
      ? {
          currentVersionUpdateId: clonedCurrentRecord.id,
          currentVersionNumberRefId: clonedCurrentRecord.versionNumberRefId,
          currentBuildNumberRefId: clonedCurrentRecord.buildNumberRefId,
        }
      : {},
  }
}

function cloneSingleVersionUpdateRecordForSystem(input: {
  sourceRecord: VersionUpdateRecord
  targetSystem: VersionUpdateSystemRecord
  targetCollection: VersionUpdateRecord['systemCollection']
  versionUpdates: VersionUpdateRecord[]
  idCounters: AppDataState['idCounters']
  timestamp: string
}): {
  idCounters: AppDataState['idCounters']
  record: VersionUpdateRecord
} {
  let idCounters = input.idCounters
  const usedVersionUpdateIds = input.versionUpdates.map((record) => record.id)
  const usedAttachmentIds = input.versionUpdates.flatMap((record) => record.attachments.map((attachment) => attachment.id))
  const nextVersionUpdateIdentity = generateBusinessIdFromCounter('versionUpdate', idCounters, usedVersionUpdateIds)
  idCounters = nextVersionUpdateIdentity.counters
  const targetSnapshot = versionSystemSnapshot(input.targetSystem)
  const attachments = input.sourceRecord.attachments.map((attachment) => {
    const nextAttachmentIdentity = generateBusinessIdFromCounter('versionUpdateAttachment', idCounters, usedAttachmentIds)
    idCounters = nextAttachmentIdentity.counters
    usedAttachmentIds.push(nextAttachmentIdentity.id)
    return {
      ...attachment,
      id: nextAttachmentIdentity.id,
      parentBusinessId: nextVersionUpdateIdentity.id,
    }
  })
  return {
    idCounters,
    record: {
      ...input.sourceRecord,
      id: nextVersionUpdateIdentity.id,
      systemId: input.targetSystem.id,
      systemCollection: input.targetCollection,
      midSnapshot: targetSnapshot.mid,
      sidSnapshot: targetSnapshot.sid,
      attachments,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    },
  }
}

function infrastructureRef(record: InfrastructureItem): ActivityObjectRefInput {
  return {
    objectType: 'INFRASTRUCTURE_ITEM',
    id: record.id,
    businessId: record.infrastructureId,
    displayLabel: `Infrastructure Item ${record.infrastructureId}`,
    routePath: `/infrastructure/${record.infrastructureId}`,
  }
}

function relatedRefs(...refs: Array<ActivityObjectRefInput | null | undefined>): ActivityObjectRefInput[] {
  return refs.filter((ref): ref is ActivityObjectRefInput => Boolean(ref))
}

const AUDIT_FIELD_EXCLUSIONS = new Set([
  'createdAt',
  'updatedAt',
  'technicalId',
])

const AUDIT_FIELD_LABEL_OVERRIDES: Record<string, string> = {
  productType: 'Product',
  ipRestrictionEnabled: 'IP Restriction',
  usedInRegion: 'Used In Region',
  currentVersion: 'Current Version',
  currentBuild: 'Current Build',
  currentVersionUpdateId: 'Current Version Update ID',
}

function auditFieldLabel(field: string): string {
  const override = AUDIT_FIELD_LABEL_OVERRIDES[field]
  if (override) return override
  return field
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (first) => first.toUpperCase())
}

function auditValue(value: unknown): string {
  if (value == null || value === '') return '-'
  if (Array.isArray(value)) return value.length === 0 ? '-' : JSON.stringify(value)
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function auditCategoryForField(defaultCategory: ActivityEventCategory, field: string): ActivityEventCategory {
  const normalized = field.toLocaleLowerCase()
  if (normalized.includes('warrant')) return 'WARRANTY'
  if (normalized.includes('document')) return 'DOCUMENT'
  if (normalized.includes('remark')) return 'REMARK'
  if (normalized.includes('owner')) return 'OWNER'
  if (normalized.includes('configuration') || normalized.includes('mapcenter') || normalized.includes('license')) return 'CONFIGURATION'
  if (normalized.includes('purposehistory')) return 'PURPOSE_HISTORY'
  if (normalized.includes('task')) return 'TASK'
  if (normalized.includes('requirement')) return 'REQUIREMENT'
  return defaultCategory
}

function auditEventTypeForField(prefix: string, field: string): string {
  const normalized = field.toLocaleLowerCase()
  if (normalized.includes('warrant')) return `${prefix}.warrantyChanged`
  if (normalized.includes('document')) return `${prefix}.documentChanged`
  if (normalized.includes('remark')) return `${prefix}.remarkChanged`
  if (normalized.includes('owner')) return `${prefix}.ownerChanged`
  if (normalized.includes('purposehistory')) return `${prefix}.purposeHistoryChanged`
  if (normalized.includes('configuration') || normalized.includes('mapcenter') || normalized.includes('license')) return `${prefix}.configurationChanged`
  if (normalized.includes('task')) return `${prefix}.taskChanged`
  if (normalized.includes('requirement')) return `${prefix}.requirementChanged`
  return `${prefix}.fieldChanged`
}

function readableRichTextSummary(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80) || 'Maintenance Task'
}

function appendInfrastructureMaintenanceActivityEvents(
  events: ActivityEvent[],
  now: string,
  previous: InfrastructureItem,
  next: InfrastructureItem,
): ActivityEvent[] {
  let nextEvents = events
  const previousById = new Map((previous.maintenanceTasks ?? []).map((task) => [task.id, task]))
  const nextById = new Map((next.maintenanceTasks ?? []).map((task) => [task.id, task]))

  nextById.forEach((task, id) => {
    const before = previousById.get(id)
    const taskSummary = readableRichTextSummary(task.task)
    if (!before) {
      nextEvents = appendActivityEvent(nextEvents, now, {
        category: 'TASK',
        eventType: 'infrastructureItem.maintenanceTaskCreated',
        severity: 'SUCCESS',
        summary: `Maintenance Task added: "${taskSummary}".`,
        primaryObject: infrastructureRef(next),
        after: task as unknown as Record<string, unknown>,
      })
      if (task.taskStatus === 'Done') {
        nextEvents = appendActivityEvent(nextEvents, now, {
          category: 'TASK',
          eventType: 'infrastructureItem.maintenanceTaskCompleted',
          severity: 'SUCCESS',
          summary: 'Maintenance Task completed.',
          primaryObject: infrastructureRef(next),
          after: { taskId: task.taskId, completionDate: task.completionDate },
        })
      }
      if (task.recurrence.frequency !== 'none' && task.recurrenceDefinitionTaskId === task.id) {
        nextEvents = appendActivityEvent(nextEvents, now, {
          category: 'TASK',
          eventType: 'infrastructureItem.maintenanceRecurrenceSeriesCreated',
          severity: 'INFO',
          summary: `Maintenance recurrence series created for ${task.taskId}.`,
          primaryObject: infrastructureRef(next),
          after: task.recurrence as unknown as Record<string, unknown>,
        })
      }
      return
    }

    if (!valuesEqual(before.task, task.task) || before.dueDate !== task.dueDate || before.startDate !== task.startDate || before.assignedResourceRefId !== task.assignedResourceRefId || !valuesEqual(before.recurrence, task.recurrence)) {
      nextEvents = appendActivityEvent(nextEvents, now, {
        category: 'TASK',
        eventType: 'infrastructureItem.maintenanceTaskEdited',
        severity: 'INFO',
        summary: `Maintenance Task edited: "${taskSummary}".`,
        primaryObject: infrastructureRef(next),
        before: before as unknown as Record<string, unknown>,
        after: task as unknown as Record<string, unknown>,
      })
    }
    if (!valuesEqual(before.recurrence, task.recurrence)) {
      nextEvents = appendActivityEvent(nextEvents, now, {
        category: 'TASK',
        eventType: 'infrastructureItem.maintenanceRecurrencePatternChanged',
        severity: 'INFO',
        summary: `Maintenance recurrence pattern changed for ${task.taskId}.`,
        primaryObject: infrastructureRef(next),
        before: before.recurrence as unknown as Record<string, unknown>,
        after: task.recurrence as unknown as Record<string, unknown>,
      })
    }
    if (before.dueDate !== task.dueDate) {
      nextEvents = appendActivityEvent(nextEvents, now, {
        category: 'TASK',
        eventType: 'infrastructureItem.maintenanceDueDateChanged',
        severity: 'INFO',
        summary: `Maintenance Task due date changed from ${auditValue(before.dueDate)} to ${auditValue(task.dueDate)}.`,
        primaryObject: infrastructureRef(next),
        before: { dueDate: before.dueDate },
        after: { dueDate: task.dueDate },
      })
    }
    if (before.taskStatus !== task.taskStatus) {
      nextEvents = appendActivityEvent(nextEvents, now, {
        category: 'TASK',
        eventType: 'infrastructureItem.maintenanceTaskStatusChanged',
        severity: 'INFO',
        summary: `Maintenance Task Status changed from ${before.taskStatus} to ${task.taskStatus}.`,
        primaryObject: infrastructureRef(next),
        before: { taskStatus: before.taskStatus },
        after: { taskStatus: task.taskStatus },
      })
      if (task.taskStatus === 'Done') {
        nextEvents = appendActivityEvent(nextEvents, now, {
          category: 'TASK',
          eventType: 'infrastructureItem.maintenanceTaskCompleted',
          severity: 'SUCCESS',
          summary: 'Maintenance Task completed.',
          primaryObject: infrastructureRef(next),
          after: { taskId: task.taskId, completionDate: task.completionDate },
        })
      }
      if (before.taskStatus === 'Done' && task.taskStatus !== 'Done') {
        nextEvents = appendActivityEvent(nextEvents, now, {
          category: 'TASK',
          eventType: 'infrastructureItem.maintenanceTaskReopened',
          severity: 'WARNING',
          summary: 'Maintenance Task reopened.',
          primaryObject: infrastructureRef(next),
          before: { completionDate: before.completionDate },
          after: { completionDate: null },
        })
      }
    }
  })

  previousById.forEach((task, id) => {
    if (nextById.has(id)) return
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'TASK',
      eventType: 'infrastructureItem.maintenanceTaskDeleted',
      severity: 'WARNING',
      summary: `Maintenance Task deleted: "${readableRichTextSummary(task.task)}".`,
      primaryObject: infrastructureRef(next),
      before: task as unknown as Record<string, unknown>,
    })
  })

  return nextEvents
}

function appendFieldChangeActivityEvents<T extends Record<string, unknown>>(
  events: ActivityEvent[],
  now: string,
  config: {
    previous: T
    next: T
    category: ActivityEventCategory
    eventTypePrefix: string
    objectLabel: string
    primaryObject: ActivityObjectRefInput
    relatedObjects?: ActivityObjectRefInput[]
    excludeFields?: string[]
    summaryPrefix?: string
  },
): ActivityEvent[] {
  let nextEvents = events
  const exclusions = new Set([...AUDIT_FIELD_EXCLUSIONS, ...(config.excludeFields ?? [])])
  const keys = Array.from(new Set([...Object.keys(config.previous), ...Object.keys(config.next)]))

  keys.forEach((field) => {
    if (exclusions.has(field)) return
    const beforeValue = config.previous[field]
    const afterValue = config.next[field]
    if (valuesEqual(beforeValue, afterValue)) return

    const fieldLabel = auditFieldLabel(field)
    const category = auditCategoryForField(config.category, field)
    nextEvents = appendActivityEvent(nextEvents, now, {
      category,
      eventType: auditEventTypeForField(config.eventTypePrefix, field),
      severity: 'INFO',
      summary: `${config.summaryPrefix ? `${config.summaryPrefix}: ` : ''}${config.objectLabel} ${fieldLabel} changed from ${auditValue(beforeValue)} to ${auditValue(afterValue)}.`,
      primaryObject: config.primaryObject,
      relatedObjects: config.relatedObjects ?? [],
      before: { [field]: beforeValue ?? null },
      after: { [field]: afterValue ?? null },
      metadata: { field, fieldLabel },
    })
  })

  return nextEvents
}

function removeTenantsFromSystemTransaction(
  state: AppDataState,
  tenantIds: string[],
  now: string,
): Pick<AppDataState, 'tenants' | 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  const tenantIdSet = new Set(tenantIds)
  const tenantsToRemove = state.tenants.filter((tenant) => tenantIdSet.has(tenant.id))
  if (tenantsToRemove.length === 0) {
    return {
      tenants: state.tenants,
      systems: state.systems,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      activityEvents: state.activityEvents,
    }
  }

  const systemIdsByTenantId = new Map(
    tenantsToRemove.map((tenant) => [
      tenant.id,
      [tenant.systemId, tenant.hostedSystemId].filter(Boolean),
    ]),
  )
  const removedSystemIds = new Set(Array.from(systemIdsByTenantId.values()).flat())
  let activityEvents = state.activityEvents

  tenantsToRemove.forEach((tenant) => {
    const system = state.systems.find((candidate) => candidate.id === tenant.systemId || candidate.id === tenant.hostedSystemId)
    const relatedProjects = state.projectTenants
      .filter((link) => link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED')
      .map((link) => state.projects.find((project) => project.id === link.projectId))
      .filter((project): project is AppDataState['projects'][number] => Boolean(project))

    activityEvents = appendActivityEvent(activityEvents, now, {
      category: 'TENANT',
      eventType: 'tenant.deletedFromSystem',
      severity: 'WARNING',
      summary: `Tenant ${tenant.tid} commercially deleted and excluded from active hosting calculations.`,
      primaryObject: tenantRef(tenant),
      relatedObjects: relatedRefs(system ? systemRef(system) : null, ...relatedProjects.map(projectRef)),
      before: {
        operationalStatus: tenant.operationalStatus,
        hostedSystemId: tenant.hostedSystemId || tenant.systemId,
      },
      after: {
        operationalStatus: TENANT_OPERATIONAL_STATUS_DELETED,
        hostedSystemId: tenant.hostedSystemId || tenant.systemId,
      },
    })
  })

  const tenants = state.tenants.map((tenant) => {
      if (!tenantIdSet.has(tenant.id)) return tenant
      const previousOperationalStatus = isTenantLifecycleInactive(tenant)
        ? tenant.individualLifecyclePreviousOperationalStatus ?? tenant.lastManualOperationalStatus ?? 'Active'
        : tenant.operationalStatus
      return {
        ...tenant,
        operationalStatus: TENANT_OPERATIONAL_STATUS_DELETED,
        individualLifecyclePreviousOperationalStatus: previousOperationalStatus,
        systemForcedPreviousOperationalStatus: null,
        systemForcedBySystemId: null,
        sourceRequirementId: tenant.sourceRequirementId,
        releasedRequirementId: tenant.releasedRequirementId ?? null,
        requirementHistory: tenant.requirementHistory,
        hostedSystemHistory: deletedTenantHostedSystemHistory(tenant, now),
        cancellationReason: tenant.cancellationReason,
        cancellationAt: tenant.cancellationAt ?? null,
        cancelledBy: tenant.cancelledBy ?? null,
        updatedAt: now,
      }
    })
  return {
    tenants,
    systems: state.systems.map((system) => {
      if (!removedSystemIds.has(system.id)) return system
      const source = systemTimeGroupSource(system, tenants, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
      return {
        ...system,
        timeGroupGovernanceTenantId: source.governorTenantId,
        timeGroup: source.timeGroup,
        updatedAt: now,
      }
    }),
    projectSystems: state.projectSystems,
    projectTenants: state.projectTenants,
    activityEvents,
  }
}

function activityEventReferencesTenant(event: ActivityEvent, tenant: AppDataState['tenants'][number]): boolean {
  const matchesRef = (ref: { objectType?: string; id?: string; businessId?: string } | null | undefined) =>
    Boolean(
      ref &&
        ref.objectType?.toLocaleLowerCase() === 'tenant' &&
        (ref.id === tenant.id || ref.businessId === tenant.tid),
    )
  return (
    matchesRef(event.primaryObject) ||
    event.relatedObjects.some(matchesRef) ||
    event.summary.includes(tenant.tid) ||
    event.summary.includes(tenant.id) ||
    event.details?.includes(tenant.tid) === true ||
    event.details?.includes(tenant.id) === true
  )
}

function cancelTenantInState(
  state: AppDataState,
  tenantId: string,
  now: string,
): Pick<AppDataState, 'tenants' | 'systems' | 'projectSystems' | 'projectTenants' | 'opportunities' | 'warrantyRecords' | 'activityEvents'> {
  const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
  if (!tenant) {
    return {
      tenants: state.tenants,
      systems: state.systems,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      opportunities: state.opportunities,
      warrantyRecords: state.warrantyRecords,
      activityEvents: state.activityEvents,
    }
  }

  const affectedSystemIds = new Set([
    tenant.systemId,
    tenant.hostedSystemId,
    ...state.projectSystems.filter((link) => (link.tenantIds ?? []).includes(tenantId)).map((link) => link.systemId),
    ...state.projectTenants.filter((link) => link.tenantId === tenantId).map((link) => link.systemId ?? ''),
  ].filter(Boolean))
  const previousOperationalStatus = isTenantLifecycleInactive(tenant)
    ? tenant.individualLifecyclePreviousOperationalStatus ?? tenant.lastManualOperationalStatus ?? 'Active'
    : tenant.operationalStatus
  const releasedRequirementId = tenant.sourceRequirementId ?? tenant.releasedRequirementId ?? null
  const tenants = state.tenants.map((candidate) => {
    if (candidate.id !== tenantId) return candidate
    return {
      ...candidate,
      operationalStatus: TENANT_OPERATIONAL_STATUS_CANCELLED,
      individualLifecyclePreviousOperationalStatus: previousOperationalStatus,
      systemForcedPreviousOperationalStatus: null,
      systemForcedBySystemId: null,
      sourceRequirementId: undefined,
      releasedRequirementId,
      requirementHistory: (candidate.requirementHistory ?? []).map((relationship) =>
        relationship.status === 'CURRENT'
          ? { ...relationship, status: 'HISTORICAL' as const, endedAt: now }
          : relationship,
      ),
      hostedSystemHistory: endedTenantHostedSystemHistory(candidate, now, 'Cancelled'),
      cancellationAt: candidate.cancellationAt ?? now,
      cancelledBy: candidate.cancelledBy ?? CURRENT_USER_DISPLAY_NAME,
      updatedAt: now,
    }
  })

  return {
    tenants,
    systems: state.systems.map((system) => {
      if (!affectedSystemIds.has(system.id)) return system
      const isReleasedReusedInternalSid =
        system.source === SYSTEM_SOURCE_REUSED_INTERNAL &&
        Boolean(system.sid) &&
        !activeProjectSystemLinks(state.projectSystems).some((link) => link.systemId === system.id)
      if (isReleasedReusedInternalSid) return system
      const tenantIds = (system.tenantIds ?? []).filter((id) => id !== tenantId)
      const source = systemTimeGroupSource(system, tenants, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
      return {
        ...system,
        tenantIds,
        timeGroupGovernanceTenantId: source.governorTenantId,
        timeGroup: source.timeGroup,
        updatedAt: now,
      }
    }),
    projectSystems: state.projectSystems.map((link) =>
      (link.tenantIds ?? []).includes(tenantId)
        ? {
            ...link,
            tenantIds: (link.tenantIds ?? []).filter((id) => id !== tenantId),
          }
        : link,
    ),
    projectTenants: state.projectTenants.map((link) =>
      link.tenantId === tenantId && link.allocationStatus !== 'DEALLOCATED'
        ? deallocateProjectTenantLink(link, now)
        : link,
    ),
    opportunities: state.opportunities.map((opportunity) => ({
      ...opportunity,
      changeRequestRequirements: opportunity.changeRequestRequirements.map((requirement) =>
        requirement.tenantId === tenantId
          ? { ...requirement, tenantId: '', systemId: '', baselineConfiguration: undefined }
          : requirement,
      ),
      standardRenewalRequirements: opportunity.standardRenewalRequirements.map((requirement) =>
        requirement.tenantId === tenantId
          ? { ...requirement, tenantId: '', systemId: '', warrantyRecordId: '', warrantyStatus: 'NOT_SET', warrantyEndDate: null }
          : requirement,
      ),
    })),
    warrantyRecords: state.warrantyRecords,
    activityEvents: appendActivityEvent(state.activityEvents.filter((event) => !activityEventReferencesTenant(event, tenant)), now, {
      category: 'TENANT',
      eventType: 'tenant.cancelledFromSystem',
      severity: 'WARNING',
      summary: `Tenant ${tenant.tid} cancelled and excluded from active hosting calculations.`,
      primaryObject: tenantRef(tenant),
      before: {
        operationalStatus: tenant.operationalStatus,
        sourceRequirementId: tenant.sourceRequirementId ?? null,
      },
      after: {
        operationalStatus: TENANT_OPERATIONAL_STATUS_CANCELLED,
        releasedRequirementId,
      },
    }),
  }
}

function duplicateRequirementIdsForOpportunitySave(
  state: AppDataState,
  opportunity: Opportunity,
  savedOpportunity?: Opportunity,
): string[] {
  return unavailableRequirementIdsForOpportunitySave(opportunity, {
    opportunities: state.opportunities,
    tenants: state.tenants,
    projects: state.projects,
    projectSystems: state.projectSystems,
    projectTenants: state.projectTenants,
    savedOpportunity,
  })
}

function tenantSystemForcedOperationalStatus(systemOperationalStatus: string | undefined): string | null {
  switch (systemOperationalStatus) {
    case SYSTEM_OPERATIONAL_STATUS_OFF:
      return TENANT_SYSTEM_FORCED_STATUS_OFF
    case SYSTEM_OPERATIONAL_STATUS_ACCESS_BLOCKED:
      return TENANT_SYSTEM_FORCED_STATUS_ACCESS_BLOCKED
    case SYSTEM_OPERATIONAL_STATUS_SERVICE_BLOCKED:
      return TENANT_SYSTEM_FORCED_STATUS_SERVICE_BLOCKED
    default:
      return null
  }
}

function applySystemOperationalStatusToTenants(
  state: AppDataState,
  systemId: string,
  previousSystemStatus: string | undefined,
  nextSystemStatus: string | undefined,
  now: string,
): Pick<AppDataState, 'tenants' | 'activityEvents'> {
  if (!nextSystemStatus || previousSystemStatus === nextSystemStatus) {
    return { tenants: state.tenants, activityEvents: state.activityEvents }
  }

  if (nextSystemStatus === SYSTEM_OPERATIONAL_STATUS_ON) {
    const tenants = state.tenants.map((tenant) => {
      if (!isTenantSystemForced(tenant) || tenant.systemForcedBySystemId !== systemId) return tenant
      return {
        ...tenant,
        operationalStatus: tenant.systemForcedPreviousOperationalStatus || tenant.lastManualOperationalStatus || 'Active',
        systemForcedPreviousOperationalStatus: null,
        systemForcedBySystemId: null,
        updatedAt: now,
      }
    })
    return { tenants, activityEvents: state.activityEvents }
  }

  const forcedStatus = tenantSystemForcedOperationalStatus(nextSystemStatus)
  if (!forcedStatus) return { tenants: state.tenants, activityEvents: state.activityEvents }

  const tenants = state.tenants.map((tenant) => {
    if ((tenant.hostedSystemId || tenant.systemId) !== systemId) return tenant
    if (isTenantIndividuallyLifecycleInactive(tenant)) return tenant
    const previousTenantStatus = isTenantSystemForced(tenant)
      ? tenant.systemForcedPreviousOperationalStatus || tenant.lastManualOperationalStatus || 'Active'
      : tenant.operationalStatus
    return {
      ...tenant,
      operationalStatus: forcedStatus,
      systemForcedPreviousOperationalStatus: previousTenantStatus,
      systemForcedBySystemId: systemId,
      updatedAt: now,
    }
  })

  return { tenants, activityEvents: state.activityEvents }
}

const REUSED_INTERNAL_CURRENT_PHYSICAL_SYNC_KEYS = [
  'productType',
  'logo',
  'url',
  'hostingType',
  'cloudPlatform',
  'csp',
  'cloudRegion',
  'vpnEnabled',
  'vpnType',
  'externalInterface',
  'ipRestrictionEnabled',
  'performanceTier',
  'cognitoRegion',
  'usedInRegion',
  'timeGroup',
  'timeGroupAlert',
  'mapCenter',
  'operationalStatus',
  'currentVersionUpdateId',
  'currentVersionNumberRefId',
  'currentBuildNumberRefId',
] as const

function reusedInternalCurrentPhysicalPatchFromSid(system: AppDataState['systems'][number]): Partial<AppDataState['reusedInternalSystems'][number]> {
  const patch: Partial<AppDataState['reusedInternalSystems'][number]> = {}
  REUSED_INTERNAL_CURRENT_PHYSICAL_SYNC_KEYS.forEach((key) => {
    if (key in system) {
      ;(patch as Record<string, unknown>)[key] = (system as unknown as Record<string, unknown>)[key]
    }
  })
  return patch
}

function projectAssignmentLocation(state: AppDataState, project: AppDataState['projects'][number]) {
  const linkedOpportunity = state.opportunities.find((opportunity) => opportunity.id === project.opportunityId)
  const account = state.accounts.find((candidate) => candidate.accountName === project.accountName)
  const context = { linkedOpportunity, account }
  return {
    region: projectBusinessRegionForAllocation(project, state),
    timeZone: projectHeaderFieldValue(project, 'timeZone', context),
    timeGroup: timeGroupForTimeZone(state.timeGroupLookups, projectHeaderFieldValue(project, 'timeZone', context)),
    timeGroupAlert: '',
  }
}

function recalculateReusedSystemOccupationWindows(
  reusedSystems: AppDataState['reusedInternalSystems'],
  projectSystems: AppDataState['projectSystems'],
  projects: AppDataState['projects'],
  now: string,
  systems: AppDataState['systems'] = [],
): AppDataState['reusedInternalSystems'] {
  return reusedSystems.map((system) =>
    applyReusedSystemOccupationWindow(
      system,
      projectSystems,
      projects,
      now,
      systems,
    ),
  )
}

function recalculateAllocatedReusedSystemOccupationWindows(
  systems: AppDataState['systems'],
  projectSystems: AppDataState['projectSystems'],
  projects: AppDataState['projects'],
): AppDataState['systems'] {
  return systems.map((system) =>
    applyAllocatedReusedSystemOccupationWindow(system, projectSystems, projects),
  )
}

function sanitizeReusedInternalSystemUserPatch(
  system: AppDataState['reusedInternalSystems'][number],
  patch: Partial<AppDataState['reusedInternalSystems'][number]>,
  projects: AppDataState['projects'],
  projectSystems: AppDataState['projectSystems'],
  systems: AppDataState['systems'] = [],
): Partial<AppDataState['reusedInternalSystems'][number]> {
  const safePatch = { ...patch }
  delete safePatch.purposeHistory
  delete safePatch.status
  if (typeof safePatch.machineId === 'string') {
    safePatch.machineId = normalizeReusedInternalMachineId(safePatch.machineId)
  }
  if (!isOccupationPeriodVisibleForPurpose(safePatch.purpose ?? system.purpose)) {
    safePatch.occupationStartDate = null
    safePatch.occupationEndDate = null
  }
  if (reusedInternalHasActivePocAllocation(system, activeProjectSystemLinks(projectSystems), projects, systems)) {
    delete safePatch.occupationStartDate
    delete safePatch.occupationEndDate
  }
  if (!hasActiveOpenPocPurposeLock(system, projects, projectSystems, systems)) return safePatch
  delete safePatch.purpose
  delete safePatch.occupationStartDate
  delete safePatch.occupationEndDate
  return safePatch
}

function projectWithDerivedTimeZone(state: AppDataState, project: AppDataState['projects'][number]) {
  const location = projectAssignmentLocation(state, project)
  return {
    ...project,
    region: location.region,
    timeGroup: location.timeGroup,
    timeZone: location.timeZone,
  }
}

function tenantWithDerivedProjectTimeGroup(
  state: Pick<AppDataState, 'accounts' | 'opportunities' | 'projects' | 'systems' | 'timeGroupLookups' | 'countryLookups' | 'usStateLookups'>,
  tenant: AppDataState['tenants'][number],
): AppDataState['tenants'][number] {
  const project = tenant.deliveryPid
    ? state.projects.find((candidate) => candidate.pid === tenant.deliveryPid)
    : undefined
  const opportunity = project
    ? state.opportunities.find((candidate) =>
        candidate.id === project.opportunityId ||
        candidate.opportunityId === project.opportunityId ||
        candidate.pocProjectIds.includes(project.id) ||
        candidate.finalProjectId === project.id,
      )
    : undefined
  const account = state.accounts.find((candidate) =>
    candidate.id === tenant.accountId ||
    candidate.id === opportunity?.accountId ||
    candidate.accountName === tenant.accountName ||
    candidate.accountName === project?.accountName,
  )
  const system = state.systems.find((candidate) => candidate.id === (tenant.hostedSystemId || tenant.systemId))
  const country = tenant.country || opportunity?.country || account?.country || project?.country || system?.country || ''
  const stateName = tenant.state || opportunity?.state || account?.state || project?.state || system?.state || ''
  return normalizeTenantTimeGroup({
    ...tenant,
    country,
    state: stateName,
  }, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
}

function existingTenantIdsForOpportunityFinalProject(opportunity: Opportunity): string[] {
  return Array.from(new Set(
    applicableOpportunityRequirementSources(opportunity)
      .filter((source) => source.requirementType === 'B' || source.requirementType === 'C')
      .map((source) => ('tenantId' in source.requirement ? source.requirement.tenantId : ''))
      .filter(Boolean),
  ))
}

function tenantSystemTimeGroupMismatchMessage(state: AppDataState, tenant: AppDataState['tenants'][number], system: AppDataState['systems'][number]): string {
  if (!tenantIsEligibleSystemTimeGroupGovernor(tenant)) return ''
  const tenantTimeGroup = tenantTimeGroupFromLocation(tenant, state.timeGroupLookups, undefined, state.countryLookups, state.usStateLookups).timeGroup
  const systemTimeGroup = system.timeGroup
  if (!systemTimeGroup || !tenantTimeGroup || systemTimeGroup === tenantTimeGroup) return ''
  return `The selected Tenant belongs to Time Group ${tenantTimeGroup}, while System ${systemBusinessId(system)} currently belongs to Time Group ${systemTimeGroup}, based on its governing Customer/POC Tenant.\n\nDo you want to continue adding this Tenant to the System?`
}

function systemWithAddedTenantTimeGroupGovernance(
  system: AppDataState['systems'][number],
  existingTenants: AppDataState['tenants'],
  incomingTenant: AppDataState['tenants'][number],
  records: TimeGroupLookupRecord[],
  countryRecords: GeographicCountryRecord[],
  stateRecords: GeographicUsStateRecord[],
  decision?: TenantTimeGroupMismatchDecision,
) {
  const candidate = {
    ...system,
    timeGroupGovernanceTenantId: decision === 'change' && tenantIsEligibleSystemTimeGroupGovernor(incomingTenant)
      ? incomingTenant.id
      : system.timeGroupGovernanceTenantId,
  }
  const source = systemTimeGroupSource(candidate, [incomingTenant, ...existingTenants], records, countryRecords, stateRecords)
  return { timeGroup: source.timeGroup, timeGroupGovernanceTenantId: source.governorTenantId }
}

function timeGroupMismatchResult(state: AppDataState, tenant: AppDataState['tenants'][number], system: AppDataState['systems'][number]) {
  const message = tenantSystemTimeGroupMismatchMessage(state, tenant, system)
  return {
    message,
    currentSystemTimeGroup: system.timeGroup,
    incomingTenantTimeGroup: tenantTimeGroupFromLocation(tenant, state.timeGroupLookups, undefined, state.countryLookups, state.usStateLookups).timeGroup,
  }
}

function relationshipAllocationTypeForSystem(system: AppDataState['systems'][number]): AllocationType {
  return system.source === 'Reused Internal Systems' ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM'
}

function validateProjectTenantHostingRelationshipSync(
  state: AppDataState,
  tenantIds: string[],
): string[] {
  return tenantIds.flatMap((tenantId) => {
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    if (!tenant) return [`Selected Tenant ${tenantId} was not found.`]
    const hostingSystem = systemForTenant(tenant, state.systems)
    if (!hostingSystem) {
      return [`Tenant ${tenant.tid} cannot be linked because it has no valid hosting System.`]
    }
    return []
  })
}

function originatingProjectForTenant(
  state: Pick<AppDataState, 'opportunities' | 'projects'>,
  tenant: AppDataState['tenants'][number],
): AppDataState['projects'][number] | undefined {
  return tenant.deliveryPid
    ? state.projects.find((project) => project.pid === tenant.deliveryPid)
    : undefined
}

function ensureProjectTenantHostingRelationships(
  state: AppDataState,
  project: AppDataState['projects'][number],
  tenantIds: string[],
  now: string,
  source: 'opportunityWon' | 'tenantSave' = 'opportunityWon',
  allocationSourcesByTenantId: Map<string, AllocationSource[]> = new Map(),
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  let systems = state.systems
  let projectSystems = state.projectSystems
  let projectTenants = state.projectTenants
  let activityEvents = state.activityEvents
  const sourceLabel = source === 'opportunityWon' ? 'Opportunity Won' : 'Tenant Save'

  tenantIds.forEach((tenantId) => {
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    if (!tenant) return
    const hostingSystem = systemForTenant(tenant, systems)
    const allocationSources = normalizeAllocationSources(allocationSourcesByTenantId.get(tenant.id))
    const allocationType = hostingSystem
      ? relationshipAllocationTypeForSystem(hostingSystem)
      : 'EXISTING_SYSTEM'

    const activeTenantLink = projectTenants.find(
      (link) =>
        link.projectId === project.id &&
        link.tenantId === tenant.id &&
        link.allocationStatus !== 'DEALLOCATED',
    )
    if (!activeTenantLink) {
      const projectTenant = createProjectTenantLink(project.id, tenant.id, hostingSystem?.id ?? '', allocationType, now, allocationSources)
      projectTenants = [projectTenant, ...projectTenants]
      activityEvents = appendActivityEvent(activityEvents, now, {
        category: 'TENANT',
        eventType: source === 'opportunityWon'
          ? 'project.tenantLinkedFromOpportunityWon'
          : 'project.tenantLinkedFromTenantSave',
        severity: 'SUCCESS',
        summary: `Tenant ${tenant.tid} linked to project ${project.pid} from ${sourceLabel}.`,
        primaryObject: projectRef(project),
        relatedObjects: relatedRefs(tenantRef(tenant), hostingSystem ? systemRef(hostingSystem) : null),
      })
    }

    if (!hostingSystem) return

    const activeSystemLink = projectSystems.find(
      (link) =>
        link.projectId === project.id &&
        link.systemId === hostingSystem.id &&
        link.allocationStatus !== 'DEALLOCATED',
    )
    const committedAllocationType = activeSystemLink?.allocationType ?? allocationType
    if (activeSystemLink) {
      projectSystems = projectSystems.map((link) =>
        link.id === activeSystemLink.id
          ? {
              ...link,
              tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])),
              allocationSources: normalizeAllocationSources([...(link.allocationSources ?? ['MANUAL']), ...allocationSources]),
            }
          : link,
      )
    } else {
      const allocation = createProjectSystemLink(project.id, hostingSystem.id, committedAllocationType, now, {
        tenantIds: [tenant.id],
        allocationSources,
        sourceMachineId: committedAllocationType === 'REUSED_INTERNAL' ? hostingSystem.machineId : null,
      })
      projectSystems = [allocation, ...projectSystems]
      activityEvents = appendActivityEvent(activityEvents, now, {
        category: 'ALLOCATION',
        eventType: source === 'opportunityWon'
          ? 'allocation.hostingSystemLinkedFromOpportunityWon'
          : 'allocation.hostingSystemLinkedFromTenantSave',
        severity: 'SUCCESS',
        summary: `Hosting system ${systemBusinessId(hostingSystem)} linked to project ${project.pid} from ${sourceLabel}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(projectRef(project), systemRef(hostingSystem), tenantRef(tenant)),
      })
    }

    projectTenants = projectTenants.map((link) =>
      link.projectId === project.id && link.tenantId === tenant.id && link.allocationStatus !== 'DEALLOCATED'
        ? {
            ...link,
            systemId: hostingSystem.id,
            allocationType: committedAllocationType,
            allocationSources: normalizeAllocationSources([...(link.allocationSources ?? ['MANUAL']), ...allocationSources]),
          }
        : link,
    )

    systems = systems.map((system) =>
      system.id === hostingSystem.id
        ? {
            ...system,
            linkedProjectIds: Array.from(new Set([...(system.linkedProjectIds ?? []), project.id])),
            tenantIds: Array.from(new Set([...(system.tenantIds ?? []), tenant.id])),
            timeGroup: (system.tenantIds ?? []).length === 0 ? tenant.timeGroup : system.timeGroup,
            timeGroupGovernanceTenantId: (system.tenantIds ?? []).length === 0 ? tenant.id : system.timeGroupGovernanceTenantId,
            updatedAt: now,
          }
        : system,
    )
  })

  return { systems, projectSystems, projectTenants, activityEvents }
}

function ensureAutomaticRequirementRelationships(
  state: AppDataState,
  opportunity: Opportunity,
  project: AppDataState['projects'][number],
  now: string,
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  const requiredAllocations = requiredExistingTenantAllocationsForProject(project, opportunity, state.tenants)
  if (requiredAllocations.length === 0) {
    return {
      systems: state.systems,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      activityEvents: state.activityEvents,
    }
  }

  const sourcesByTenantId = new Map<string, AllocationSource[]>()
  requiredAllocations.forEach((allocation) => {
    const existing = sourcesByTenantId.get(allocation.tenantId) ?? []
    sourcesByTenantId.set(allocation.tenantId, normalizeAllocationSources([...existing, ...allocation.sources], []))
  })

  return ensureProjectTenantHostingRelationships(
    state,
    project,
    Array.from(sourcesByTenantId.keys()),
    now,
    'opportunityWon',
    sourcesByTenantId,
  )
}

function reconcileProjectAllocationSources(
  state: Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'projects' | 'opportunities' | 'tenants' | 'activityEvents'>,
  projectIds: string[],
  now: string,
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  const affectedProjectIds = new Set(projectIds)
  const projectById = new Map(state.projects.map((project) => [project.id, project]))
  const opportunityForProject = (project: AppDataState['projects'][number]) =>
    state.opportunities.find((opportunity) =>
      opportunity.id === project.opportunityId ||
      opportunity.opportunityId === project.opportunityId ||
      opportunity.pocProjectIds.includes(project.id) ||
      opportunity.finalProjectId === project.id,
    )
  const projectSystems = state.projectSystems.map((link) => {
    if (link.allocationStatus === 'DEALLOCATED' || !affectedProjectIds.has(link.projectId)) return link
    const project = projectById.get(link.projectId)
    if (!project) return link
    const allocationSources = resolvedProjectSystemAllocationSources(link, project, opportunityForProject(project), state.tenants)
    return allocationSources.length > 0
      ? { ...link, allocationSources }
      : { ...deallocateProjectSystemLink(link, now), allocationSources }
  })
  const projectTenants = state.projectTenants.map((link) => {
    if (link.allocationStatus === 'DEALLOCATED' || !affectedProjectIds.has(link.projectId)) return link
    const project = projectById.get(link.projectId)
    if (!project) return link
    const allocationSources = resolvedProjectTenantAllocationSources(link, project, opportunityForProject(project), state.tenants)
    return allocationSources.length > 0
      ? { ...link, allocationSources }
      : { ...deallocateProjectTenantLink(link, now), allocationSources }
  })
  const projectIdsBySystemId = new Map<string, string[]>()
  const activeTenantIdsBySystemId = new Map<string, string[]>()
  activeProjectSystemLinks(projectSystems).forEach((link) => {
    projectIdsBySystemId.set(link.systemId, Array.from(new Set([...(projectIdsBySystemId.get(link.systemId) ?? []), link.projectId])))
  })
  activeProjectSystemLinks(projectSystems).forEach((link) => {
    activeTenantIdsBySystemId.set(link.systemId, Array.from(new Set([...(activeTenantIdsBySystemId.get(link.systemId) ?? []), ...(link.tenantIds ?? [])])))
  })
  const systems = state.systems.map((system) =>
    Array.from(affectedProjectIds).some((projectId) =>
      (system.linkedProjectIds ?? []).includes(projectId) ||
      (projectIdsBySystemId.get(system.id) ?? []).includes(projectId),
    )
      ? {
          ...system,
          linkedProjectIds: projectIdsBySystemId.get(system.id) ?? [],
          tenantIds: Array.from(new Set([...(system.tenantIds ?? []), ...(activeTenantIdsBySystemId.get(system.id) ?? [])])),
          updatedAt: now,
        }
      : system,
  )
  return { systems, projectSystems, projectTenants, activityEvents: state.activityEvents }
}

function ensureTenantCommittedProjectRelationships(
  state: AppDataState,
  tenant: AppDataState['tenants'][number],
  _activeSystemId: string | undefined,
  now: string,
): Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> {
  const linkedProject = originatingProjectForTenant(state, tenant)
  if (!linkedProject) {
    return {
      systems: state.systems,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      activityEvents: state.activityEvents,
    }
  }
  return ensureProjectTenantHostingRelationships(state, linkedProject, [tenant.id], now, 'tenantSave')
}

function appendProjectSaveActivityEvents(
  events: ActivityEvent[],
  now: string,
  previousProject: AppDataState['projects'][number],
  nextProject: AppDataState['projects'][number],
  context: {
    linkedOpportunity?: AppDataState['opportunities'][number]
    account?: AppDataState['accounts'][number]
  } = {},
): ActivityEvent[] {
  let nextEvents = events
  const projectReference = projectRef(nextProject)
  const previousTasksById = new Map((previousProject.tasks ?? []).map((task) => [task.id, task]))
  const nextTasks = nextProject.tasks ?? []
  const changedTasks = nextTasks.filter((task) => {
    const previousTask = previousTasksById.get(task.id)
    return previousTask && previousTask.status !== task.status
  })

  changedTasks.forEach((task) => {
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'MILESTONE',
      eventType: 'project.taskStatusChanged',
      severity: task.status === 'DONE' ? 'SUCCESS' : 'INFO',
      summary: `Task "${task.name}" marked ${task.status === 'DONE' ? 'DONE' : 'OPEN'} on project ${nextProject.pid}.`,
      primaryObject: projectReference,
    })
  })

  const changedTaskIds = new Set(changedTasks.map((task) => task.id))
  ;(nextProject.milestones ?? []).forEach((milestone) => {
    const milestoneTasks = nextTasks.filter((task) => task.milestoneId === milestone.id)
    if (milestoneTasks.length === 0) return
    const everyTaskChanged = milestoneTasks.every((task) => changedTaskIds.has(task.id))
    const status = milestoneTasks[0]?.status
    const oneStatus = status && milestoneTasks.every((task) => task.status === status)
    if (!everyTaskChanged || !oneStatus) return
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'MILESTONE',
      eventType: 'project.milestoneTasksStatusChanged',
      severity: status === 'DONE' ? 'SUCCESS' : 'INFO',
      summary: `Milestone "${milestone.name}" tasks marked ${status === 'DONE' ? 'DONE' : 'OPEN'} on project ${nextProject.pid}.`,
      primaryObject: projectReference,
    })
  })

  if (previousProject.progressStatus !== nextProject.progressStatus) {
    const statusSummary = previousProject.progressStatus === 'OPEN' && nextProject.progressStatus === 'DONE'
      ? `All Tasks were completed and Project ${nextProject.pid} status changed to DONE.`
      : previousProject.progressStatus === 'DONE' && nextProject.progressStatus === 'OPEN'
        ? `One or more Tasks were reopened and Project ${nextProject.pid} status changed to OPEN.`
        : `Project ${nextProject.pid} status changed from ${projectStatusLabel(previousProject.progressStatus)} to ${projectStatusLabel(nextProject.progressStatus)}.`
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'PROJECT',
      eventType: 'project.statusChanged',
      severity: nextProject.progressStatus === 'DONE' ? 'SUCCESS' : nextProject.progressStatus === 'DELETED' ? 'WARNING' : 'INFO',
      summary: statusSummary,
      primaryObject: projectReference,
      before: { progressStatus: previousProject.progressStatus },
      after: { progressStatus: nextProject.progressStatus },
    })
  }

  const previousTimeZone = projectTimeZoneResolution(previousProject, context)
  const nextTimeZone = projectTimeZoneResolution(nextProject, context)
  const locationFieldsChanged =
    projectHeaderFieldValue(previousProject, 'country', context) !== projectHeaderFieldValue(nextProject, 'country', context) ||
    projectHeaderFieldValue(previousProject, 'state', context) !== projectHeaderFieldValue(nextProject, 'state', context) ||
    previousProject.deliveryDate !== nextProject.deliveryDate
  if (locationFieldsChanged && previousTimeZone.utcOffset !== nextTimeZone.utcOffset) {
    nextEvents = appendActivityEvent(nextEvents, now, {
      category: 'PROJECT',
      eventType: 'project.timeZoneChanged',
      severity: nextTimeZone.status === 'RESOLVED' ? 'INFO' : 'WARNING',
      summary: nextTimeZone.status === 'RESOLVED'
        ? `Project ${nextProject.pid} Time Zone changed from ${previousTimeZone.utcOffset || 'unresolved'} to ${nextTimeZone.utcOffset}.`
        : `Project ${nextProject.pid} Time Zone is unresolved: ${nextTimeZone.message}`,
      primaryObject: projectReference,
      before: { timeZone: previousTimeZone.utcOffset || '', ianaTimeZone: previousTimeZone.ianaTimeZone || '' },
      after: { timeZone: nextTimeZone.utcOffset || '', ianaTimeZone: nextTimeZone.ianaTimeZone || '' },
    })
  }

  return appendFieldChangeActivityEvents(nextEvents, now, {
    previous: previousProject as unknown as Record<string, unknown>,
    next: nextProject as unknown as Record<string, unknown>,
    category: 'PROJECT',
    eventTypePrefix: 'project',
    objectLabel: `Project ${nextProject.pid}`,
    primaryObject: projectReference,
    relatedObjects: relatedRefs(context.linkedOpportunity ? activityObjectRefFromBusinessReference(opportunityReference(context.linkedOpportunity)) : null, customerRef(context.account)),
    excludeFields: ['tasks', 'milestones', 'progressStatus', 'deletionHistory'],
  })
}

function hostedTenantCountForSystemId(state: AppDataState, systemId: string): number {
  return state.tenants.filter((tenant) => tenantIsActivelyHostedBySystem(tenant, systemId)).length
}

function configurationHistoryAttributionForSystem(
  state: Pick<AppDataState, 'projects' | 'projectSystems'>,
  system: AppDataState['systems'][number],
): { pid?: string; sid?: string } {
  if (system.source !== SYSTEM_SOURCE_REUSED_INTERNAL || !system.sid) return {}
  const link = state.projectSystems.find((candidate) => candidate.systemId === system.id)
  const project = link ? state.projects.find((candidate) => candidate.id === link.projectId) : undefined
  return {
    pid: project?.pid,
    sid: system.sid,
  }
}

function stampSystemConfigurationHistoryAttribution(
  records: ConfigurationHistoryRecord[],
  state: Pick<AppDataState, 'projects' | 'projectSystems'>,
  system: AppDataState['systems'][number],
): ConfigurationHistoryRecord[] {
  const attribution = configurationHistoryAttributionForSystem(state, system)
  if (!attribution.pid && !attribution.sid) return records
  return records.map((record) => ({
    ...record,
    pid: record.pid ?? attribution.pid,
    sid: record.sid ?? attribution.sid,
  }))
}

function updateSystemMapCenterTransaction(
  state: AppDataState,
  systemId: string,
  mapCenter: string,
  now: string,
  sourceTenantId?: string,
): Pick<AppDataState, 'systems' | 'activityEvents' | 'idCounters'> {
  const system = state.systems.find((candidate) => candidate.id === systemId)
  if (!system || String(system.mapCenter ?? '') === mapCenter) {
    return { systems: state.systems, activityEvents: state.activityEvents, idCounters: state.idCounters }
  }

  const beforeSummary = systemApplicationConfigurationSummary(system, state.tenants)
  const nextSystem = { ...system, mapCenter, updatedAt: now }
  const afterSummary = systemApplicationConfigurationSummary(nextSystem, state.tenants)
  const existingHistory = system.configurationHistory ?? []
  const sourceTenant = sourceTenantId ? state.tenants.find((tenant) => tenant.id === sourceTenantId) : undefined
  const historyRecord = createSystemConfigurationHistoryRecord(
    afterSummary,
    existingHistory,
    now,
    CURRENT_USER_DISPLAY_NAME,
    sourceTenant?.tid ?? '',
    configurationHistoryAttributionForSystem(state, system),
  )
  const reconciledHistory = historyRecord
    ? reconcileGlobalChildRecords<ConfigurationHistoryRecord>(
        state,
        state.idCounters,
        'configurationHistory',
        existingHistory,
        [historyRecord, ...existingHistory],
      )
    : { counters: state.idCounters, records: existingHistory }
  const hostedCount = hostedTenantCountForSystemId(state, systemId)

  return {
    idCounters: reconciledHistory.counters,
    systems: state.systems.map((candidate) =>
      candidate.id === systemId
        ? {
            ...nextSystem,
            configurationHistory: reconciledHistory.records,
          }
        : candidate,
    ),
    activityEvents: appendActivityEvent(state.activityEvents, now, {
      category: 'SYSTEM',
      eventType: 'system.mapCenterChanged',
      severity: 'INFO',
      summary: `System ${systemBusinessId(system)} Map Center changed from ${beforeSummary.mapCenter || '-'} to ${afterSummary.mapCenter || '-'}.`,
      primaryObject: systemRef(system),
      relatedObjects: relatedRefs(sourceTenant ? tenantRef(sourceTenant) : null),
      before: { mapCenter: beforeSummary.mapCenter || '' },
      after: { mapCenter: afterSummary.mapCenter || '' },
      metadata: { affectedTenantCount: hostedCount },
    }),
  }
}

function valuesEqual(first: unknown, second: unknown): boolean {
  return JSON.stringify(first ?? null) === JSON.stringify(second ?? null)
}

function stateWithDerivedGeographicConfiguration(state: AppDataState): AppDataState {
  const countryLookups = normalizeCountryLookups(state.countryLookups)
  const usStateLookups = normalizeUsStateLookups(state.usStateLookups)
  const timeGroupLookups = normalizeTimeGroupLookups(state.timeGroupLookups, countryLookups, usStateLookups)
  const accounts = state.accounts.map((account) => accountWithDerivedGeography(account, timeGroupLookups, countryLookups, usStateLookups))
  const opportunities = state.opportunities.map((opportunity) => opportunityWithDerivedGeography(opportunity, timeGroupLookups, countryLookups, usStateLookups))
  const projects = state.projects.map((project) => {
    const opportunity = opportunities.find((candidate) =>
      candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId,
    )
    const account = accounts.find((candidate) =>
      candidate.id === opportunity?.accountId || candidate.accountName === project.accountName,
    )
    const country = opportunity?.country || account?.country || project.country || ''
    const stateName = opportunity?.state || account?.state || project.state || ''
    const location = timeGroupFromLocation(timeGroupLookups, country, stateName, project.deliveryDate, countryLookups, usStateLookups)
    return {
      ...project,
      country,
      state: stateName,
      region: businessRegionForCountry(countryLookups, country) || normalizeBusinessRegion(project.region),
      timeZone: location.timeZone,
      timeGroup: location.timeGroup,
    }
  })
  const tenants = state.tenants.map((tenant) => normalizeTenantTimeGroup(tenant, timeGroupLookups, countryLookups, usStateLookups))
  const systems = systemsWithDerivedTimeGroups(state.systems, tenants, timeGroupLookups, countryLookups, usStateLookups)
  const now = new Date().toISOString()
  return {
    ...state,
    countryLookups,
    usStateLookups,
    timeGroupLookups,
    accounts,
    opportunities,
    projects,
    tenants,
    systems,
    reusedInternalSystems: recalculateReusedSystemOccupationWindows(state.reusedInternalSystems, state.projectSystems, projects, now, systems),
  }
}

interface AppStore extends AppDataState {
  projectLifecycleChangesByOpportunityId: Record<string, ProjectLifecycleChange[]>
  initialize: () => void
  saveToStorage: () => void
  resetToSeed: () => void
  hydrated: boolean

  updateProject: (id: string, patch: Partial<AppDataState['projects'][number]>, options?: SaveTimestampOptions) => AppDataState['projects'][number] | undefined
  deleteProject: (id: string, reason: string) => AppDataState['projects'][number] | undefined
  restoreProject: (id: string) => AppDataState['projects'][number] | undefined
  updateProductionSystemInventoryItem: (id: string, patch: Partial<AppDataState['productionSystemInventory'][number]>, options?: SaveTimestampOptions) => void
  updateReusedInternalSystem: (id: string, patch: Partial<AppDataState['reusedInternalSystems'][number]>, options?: SaveTimestampOptions) => void
  updateSystem: (id: string, patch: Partial<AppDataState['systems'][number]>, options?: SaveTimestampOptions) => void
  updateSystemMapCenter: (
    systemId: string,
    mapCenter: string,
    options?: { confirmedMultiTenantChange?: boolean; sourceTenantId?: string },
  ) => AllocationActionResult & { affectedTenantCount?: number }
  saveSystemFormTransaction: (
    collection: 'production' | 'reused' | 'allocated',
    id: string,
    patch: Partial<AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number] | AppDataState['systems'][number]>,
    tenantRemovalIds?: string[],
    options?: SaveTimestampOptions,
  ) => AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number] | AppDataState['systems'][number] | undefined
  createReferenceDataRecord: (referenceType: ReferenceDataType, label: string, options?: { versionNumberId?: string | null }) => AllocationActionResult & { record?: ReferenceDataRecord }
  updateReferenceDataRecord: (id: string, label: string) => AllocationActionResult & { record?: ReferenceDataRecord }
  setReferenceDataActive: (id: string, active: boolean) => AllocationActionResult
  updateCountryLookup: (id: string, patch: Partial<GeographicCountryRecord>) => AllocationActionResult & { record?: GeographicCountryRecord }
  updateUsStateLookup: (id: string, patch: Partial<GeographicUsStateRecord>) => AllocationActionResult & { record?: GeographicUsStateRecord }
  updateTimeGroupLookup: (id: string, patch: Partial<TimeGroupLookupRecord>) => AllocationActionResult
  updateProjectDocuments: (id: string, documents: AppDataState['projects'][number]['documents']) => AppDataState['projects'][number] | undefined
  setRecordsPerPagePreference: (context: string, value: string | number) => AllocationActionResult & { preference?: UserPresentationPreference }
  resetRecordsPerPagePreference: (context: string) => AllocationActionResult
  updateRoleDefinition: (role: RoleDefinition) => AllocationActionResult & { record?: RoleDefinition }
  updateNotificationRule: (rule: NotificationRuleDefinition) => AllocationActionResult & { record?: NotificationRuleDefinition }
  markNotificationRead: (id: string) => AllocationActionResult
  markNotificationUnread: (id: string) => AllocationActionResult
  resolveAlert: (id: string, resolutionSummary?: string) => AllocationActionResult
  reopenAlert: (id: string) => AllocationActionResult
  reconcileNotificationsAndAlerts: () => void
  executeReminder: (sourceKey: string) => AllocationActionResult
  restoreReminder: (sourceKey: string) => AllocationActionResult
  saveVersionUpgradeRecord: (
    id: string | null,
    draft: {
      versionNumber: string
      buildNumber: string
      releaseDate: string | null
      phaseOutDate: string | null
      limitedToCloudPlatform: string
      remarks: string
      schedules: VersionUpgradeSystemSchedule[]
    },
  ) => AllocationActionResult & { record?: VersionUpgradeRecord }
  cancelVersionUpgradeRecord: (id: string, reason: string) => AllocationActionResult & { record?: VersionUpgradeRecord }
  createInfrastructureItem: (draft: InfrastructureItem) => AllocationActionResult & { record?: InfrastructureItem }
  updateInfrastructureItem: (id: string, draft: InfrastructureItem) => AllocationActionResult & { record?: InfrastructureItem }
  linkInfrastructureItemToSystem: (itemId: string, systemId: string) => AllocationActionResult
  unlinkInfrastructureItemFromSystem: (itemId: string, systemId: string) => AllocationActionResult
  saveVersionUpdate: (
    systemCollection: 'production' | 'reused' | 'allocated',
    systemId: string,
    draft: {
      id?: string
      versionNumberRefId: string
      buildNumberRefId: string
      newVersionNumberLabel?: string
      newBuildNumberLabel?: string
      remarks: string
      attachments: PendingAttachmentDraft[]
    },
  ) => AllocationActionResult & { record?: VersionUpdateRecord }
  deleteVersionUpdate: (id: string, reason?: string) => AllocationActionResult
  updateTenant: (id: string, patch: Partial<AppDataState['tenants'][number]>, options?: SaveTimestampOptions) => AppDataState['tenants'][number] | undefined
  saveTenantConfiguration: (id: string, draft: AppDataState['tenants'][number], activeSystemId?: string, options?: SaveTimestampOptions) => AppDataState['tenants'][number] | undefined
  deleteTenantFromSystem: (id: string) => void
  cancelTenant: (id: string) => AllocationActionResult
  attachTenantToProjectRequirement: (tenantId: string, projectId: string, requirementId: string) => AllocationActionResult
  rollbackSystemFormTenantCreation: (tenantId: string) => void
  moveTenantToSystem: (id: string, destinationSystemId: string) => AllocationActionResult
  createTenantFromSystemRequirement: (projectId: string, systemId: string, requirementId: string, options?: TenantTimeGroupOverrideOptions) => AllocationActionResult
  createInternalTenantForSystem: (projectId: string, systemId: string, options?: TenantTimeGroupOverrideOptions) => AllocationActionResult
  updateAccount: (id: string, patch: Partial<AppDataState['accounts'][number]>) => void
  updateOpportunity: (id: string, patch: Partial<AppDataState['opportunities'][number]>, options?: SaveTimestampOptions) => void
  createOpportunity: (type?: OpportunityType, subType?: OpportunitySubType) => AppDataState['opportunities'][number]
  createProject: () => AppDataState['projects'][number]
  createProjectFromDraft: (draft: AppDataState['projects'][number]) => AppDataState['projects'][number]
  createProductionSystemInventoryItem: () => AppDataState['productionSystemInventory'][number]
  createReusedInternalSystem: (machineId?: string) => AppDataState['reusedInternalSystems'][number]
  saveOpportunityWithProjectSync: (
    opportunity: Opportunity,
    savedOpportunity?: Opportunity,
    options?: OpportunityProjectSyncOptions,
    timestampOptions?: SaveTimestampOptions,
  ) => OpportunityProjectSyncResult
  createSystem: () => AppDataState['systems'][number]
  allocateProductionSystemToProject: (projectId: string, productionSystemId: string, requirementIds?: string[]) => AllocationActionResult
  allocateReusedInternalSystemToProject: (projectId: string, reusedSystemId: string, requirementIds?: string[]) => AllocationActionResult
  linkExistingSystemToProject: (projectId: string, systemId: string, requirementIds?: string[]) => AllocationActionResult
  deallocateProjectSystem: (allocationId: string) => AllocationActionResult
}

export type {
  OpportunityProjectSyncOptions,
  OpportunityProjectSyncResult,
  PocProjectSyncAction,
  ProjectLifecycleChange,
} from '@/domain/opportunity-lifecycle'

export const useAppStore = create<AppStore>((set, get) => ({
  ...createInitialState(),
  hydrated: false,
  projectLifecycleChangesByOpportunityId: {},

  initialize: () => {
    const persisted = loadPersistedState()
    const next = reconcileNotificationsAndAlerts(stateWithDerivedGeographicConfiguration(persisted ?? createInitialState()))
    set({ ...next, hydrated: true })
    if (!unsubscribeCommittedStateChanges) {
      unsubscribeCommittedStateChanges = subscribeToCommittedStateChanges((state) => {
        set((current) => mergeIncomingCommittedState(current, state))
      })
    }
    requestCommittedStateSnapshotsOnStartup()
  },

  saveToStorage: () => {
    const state = reconcileNotificationsAndAlerts(stateWithDerivedGeographicConfiguration(get()))
    const systems = systemsWithDerivedTimeGroups(state.systems, state.tenants, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
    const persistedAt = new Date().toISOString()
    const data: AppDataState = {
      version: state.version,
      salesManagers: state.salesManagers,
      accounts: state.accounts,
      opportunities: state.opportunities,
      projects: state.projects,
      productionSystemInventory: state.productionSystemInventory,
      reusedInternalSystems: state.reusedInternalSystems,
      systems,
      tenants: state.tenants,
      warrantyRecords: state.warrantyRecords,
      referenceData: state.referenceData,
      countryLookups: state.countryLookups,
      usStateLookups: state.usStateLookups,
      timeGroupLookups: state.timeGroupLookups,
      userPresentationPreferences: state.userPresentationPreferences,
      versionUpgradeRecords: state.versionUpgradeRecords,
      versionUpdates: state.versionUpdates,
      infrastructureItems: state.infrastructureItems,
      activityEvents: state.activityEvents,
      roles: state.roles,
      userRoleAssignments: state.userRoleAssignments,
      notificationRules: state.notificationRules,
      notificationRecords: state.notificationRecords,
      alertRecords: state.alertRecords,
      reminderExecutions: state.reminderExecutions,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      idCounters: normalizeIdCounters(state.idCounters, state),
      lastPersistedAt: persistedAt,
    }
    const dataToPersist = rebaseAppDataStateForPersistence(data, loadPersistedState())
    persistState(dataToPersist)
    set({
      ...state,
      ...dataToPersist,
      hydrated: true,
      lastPersistedAt: dataToPersist.lastPersistedAt,
    })
    try {
      publishCommittedStateChange(dataToPersist)
    } catch (error) {
      console.error('Delivery ERP state cross-tab notification failed after persistence completed.', error)
    }
  },

  resetToSeed: () => {
    clearPersistedState()
    set({ ...reconcileNotificationsAndAlerts(createInitialState()), hydrated: true, projectLifecycleChangesByOpportunityId: {} })
  },

  updateProject: (id, patch, options) => {
    const now = new Date().toISOString()
    const previousState = get()
    let committedProject: AppDataState['projects'][number] | undefined
    let blockedByActiveSystemAllocations = false
    try {
      set((state) => {
        let updatedProject: AppDataState['projects'][number] | undefined
        let previousProject: AppDataState['projects'][number] | undefined
        const projects = state.projects.map((project) => {
        if (project.id !== id) return project
        previousProject = project
        const patchWithDeletionHistory = (() => {
          if (project.progressStatus !== 'DELETED' || typeof patch.deletionReason !== 'string') return patch
          const trimmedReason = patch.deletionReason.trim()
          if (richTextIsEmpty(trimmedReason) || trimmedReason === latestProjectDeletionEntry(project)?.reason) return patch
          const latestEntry = latestProjectDeletionEntry(project)
          const deletionHistory = latestEntry
            ? projectDeletionHistory(project).map((entry) =>
                entry.id === latestEntry.id
                  ? { ...entry, reason: trimmedReason, timestamp: now }
                  : entry,
              )
            : [{
                id: `project-deletion-${crypto.randomUUID()}`,
                reason: trimmedReason,
                timestamp: now,
                deletedBy: CURRENT_USER_DISPLAY_NAME,
              }]
          return {
            ...patch,
            deletionReason: trimmedReason,
            deletionHistory,
          }
        })()
        const cancellationRequested = patchWithDeletionHistory.cancellationRequested === 'YES'
        const cancellationReason = String(patchWithDeletionHistory.cancellationReason ?? '').trim()
        if (cancellationRequested && activeProjectSystemLinks(state.projectSystems).some((link) => link.projectId === id)) {
          blockedByActiveSystemAllocations = true
          return project
        }
        const baseProject = projectWithDerivedTimeZone(state, {
          ...project,
          ...patchWithDeletionHistory,
          updatedAt: options?.preserveNewState ? project.createdAt : now,
        })
        updatedProject = cancellationRequested && project.progressStatus !== 'CANCELLED'
          ? {
              ...baseProject,
              progressStatus: 'CANCELLED',
              cancellationRequested: 'NO',
              cancellationReason,
              cancellationPreviousProgressStatus: project.progressStatus === 'OPEN' || project.progressStatus === 'DONE'
                ? project.progressStatus
                : project.deletionPreviousProgressStatus ?? projectStatusFromTaskCompletion(project),
              cancellationHistory: [
                ...(project.cancellationHistory ?? []),
                {
                  id: `project-cancellation-${crypto.randomUUID()}`,
                  reason: cancellationReason,
                  timestamp: now,
                  deletedBy: CURRENT_USER_DISPLAY_NAME,
                },
              ],
            }
          : applyProjectLifecycleStatus({
              ...baseProject,
              cancellationRequested: 'NO',
            })
        return updatedProject
      })
      committedProject = updatedProject
      const reusedMachineIdForProjectLink = (link: AppDataState['projectSystems'][number]): string | null => {
        if (link.sourceMachineId) return link.sourceMachineId
        const allocatedSystem = state.systems.find((candidate) => candidate.id === link.systemId)
        return allocatedSystem?.source === SYSTEM_SOURCE_REUSED_INTERNAL ? allocatedSystem.machineId : null
      }
      const sourceMachineIds =
        updatedProject?.mainType === 'POC'
          ? new Set(
              state.projectSystems
                .filter(
                  (link) =>
                    link.projectId === id &&
                    link.allocationStatus !== 'DEALLOCATED' &&
                    Boolean(reusedMachineIdForProjectLink(link)),
                )
                .map((link) => reusedMachineIdForProjectLink(link) as string),
            )
          : new Set<string>()
      const sourceMachinePurposeContext = new Map<string, ReturnType<typeof purposeHistoryContextFromProject>>()
      if (updatedProject && sourceMachineIds.size > 0) {
        const completedProject = updatedProject
        state.projectSystems
          .filter((link) => {
            const sourceMachineId = reusedMachineIdForProjectLink(link)
            return link.projectId === id && sourceMachineId && sourceMachineIds.has(sourceMachineId)
          })
          .forEach((link) => {
            const system = state.systems.find((candidate) => candidate.id === link.systemId)
            const sourceMachineId = reusedMachineIdForProjectLink(link) as string
            sourceMachinePurposeContext.set(
              sourceMachineId,
              system
                ? purposeHistoryContextFromProject(completedProject, system)
                : {
                    pid: completedProject.pid,
                    sid: '',
                    projectName: completedProject.opportunityName,
                    accountName: completedProject.accountName,
                    product: '',
                    projectStatus: completedProject.progressStatus,
                  },
            )
          })
      }

      const activeReusedInternalLinksForCompletingPoc = previousProject?.mainType === 'POC' && previousProject.progressStatus === 'OPEN' && updatedProject?.progressStatus === 'DONE'
        ? state.projectSystems.filter((link) =>
            link.projectId === id &&
            link.allocationStatus !== 'DEALLOCATED' &&
            Boolean(reusedMachineIdForProjectLink(link)),
          )
        : []
      const completingPocAllocationIds = new Set(activeReusedInternalLinksForCompletingPoc.map((link) => link.id))
      const completingPocSystemIds = new Set(activeReusedInternalLinksForCompletingPoc.map((link) => link.systemId))
      const projectSystemsForLifecycle = completingPocAllocationIds.size > 0
        ? state.projectSystems.map((link) => completingPocAllocationIds.has(link.id) ? deallocateProjectSystemLink(link, now) : link)
        : state.projectSystems
      const systemsForLifecycle = completingPocAllocationIds.size > 0
        ? recalculateAllocatedReusedSystemOccupationWindows(state.systems, projectSystemsForLifecycle, projects)
        : state.systems
      const projectTenantsForLifecycle = completingPocSystemIds.size > 0
        ? state.projectTenants.map((link) =>
            link.projectId === id &&
            Boolean(link.systemId && completingPocSystemIds.has(link.systemId)) &&
            link.allocationStatus !== 'DEALLOCATED'
              ? deallocateProjectTenantLink(link, now)
              : link,
          )
        : state.projectTenants

      const pocProjectForPurposeSync = updatedProject
      const reusedInternalSystems = sourceMachineIds.size > 0 && pocProjectForPurposeSync
        ? state.reusedInternalSystems.map((system) => {
            if (!Array.from(sourceMachineIds).some((sourceMachineId) => reusedInternalMachineIdsEqual(sourceMachineId, system.machineId))) return system
            const sourceMachineContextKey = Array.from(sourceMachinePurposeContext.keys()).find((sourceMachineId) =>
              reusedInternalMachineIdsEqual(sourceMachineId, system.machineId),
            )
            const context = sourceMachineContextKey ? sourceMachinePurposeContext.get(sourceMachineContextKey) : undefined
            if (pocProjectForPurposeSync.progressStatus === 'OPEN') {
              return occupyReusedInternalSystem(system, id, now, context, projectSystemsForLifecycle, projects)
            }
            if (pocProjectForPurposeSync.progressStatus === 'DONE') {
              return releaseReusedInternalSystem(system, id, now, context)
            }
            return system
          })
        : state.reusedInternalSystems

        return {
          projects,
          systems: systemsForLifecycle,
          projectSystems: projectSystemsForLifecycle,
          projectTenants: projectTenantsForLifecycle,
          activityEvents:
            previousProject && updatedProject
              ? appendProjectSaveActivityEvents(state.activityEvents, now, previousProject, updatedProject, {
                  linkedOpportunity: state.opportunities.find((opportunity) => opportunity.opportunityId === updatedProject?.opportunityId),
                  account: state.accounts.find((candidate) => candidate.accountName === updatedProject?.accountName),
                })
              : state.activityEvents,
          reusedInternalSystems: recalculateReusedSystemOccupationWindows(reusedInternalSystems, projectSystemsForLifecycle, projects, now, systemsForLifecycle),
        }
      })
      if (blockedByActiveSystemAllocations) return undefined
      get().saveToStorage()
    } catch (error) {
      set(previousState)
      throw error
    }
    return committedProject
  },

  deleteProject: (id, reason) => {
    const now = new Date().toISOString()
    let deletedProject: AppDataState['projects'][number] | undefined
    set((state) => {
      const project = state.projects.find((candidate) => candidate.id === id)
      if (!project) return {}
      const previousProgressStatus = project.progressStatus === 'DELETED'
        ? project.deletionPreviousProgressStatus ?? projectStatusFromTaskCompletion(project)
        : project.progressStatus
      const deletionPreviousProgressStatus = previousProgressStatus === 'OPEN' || previousProgressStatus === 'DONE'
        ? previousProgressStatus
        : projectStatusFromTaskCompletion(project)
      const nextProject: AppDataState['projects'][number] = {
        ...project,
        progressStatus: 'DELETED',
        deletionPreviousProgressStatus,
        deletionReason: reason.trim(),
        deletionHistory: [
          ...projectDeletionHistory(project),
          {
            id: `project-deletion-${crypto.randomUUID()}`,
            reason: reason.trim(),
            timestamp: now,
            deletedBy: CURRENT_USER_DISPLAY_NAME,
          },
        ],
        updatedAt: now,
      }
      deletedProject = nextProject
      return {
        projects: state.projects.map((candidate) =>
          candidate.id === id ? nextProject : candidate,
        ),
        activityEvents: appendProjectSaveActivityEvents(state.activityEvents, now, project, nextProject, {
          linkedOpportunity: state.opportunities.find((opportunity) => opportunity.opportunityId === nextProject.opportunityId),
          account: state.accounts.find((candidate) => candidate.accountName === nextProject.accountName),
        }),
      }
    })
    get().saveToStorage()
    return deletedProject
  },

  restoreProject: (id) => {
    const now = new Date().toISOString()
    let restoredProject: AppDataState['projects'][number] | undefined
    set((state) => {
      const project = state.projects.find((candidate) => candidate.id === id)
      if (!project || (project.progressStatus !== 'DELETED' && project.progressStatus !== 'CANCELLED')) return {}
      const requestedStatus = project.progressStatus === 'CANCELLED'
        ? project.cancellationPreviousProgressStatus ?? projectStatusFromTaskCompletion(project)
        : project.deletionPreviousProgressStatus ?? projectStatusFromTaskCompletion(project)
      const nextProject = applyProjectLifecycleStatus({
        ...project,
        progressStatus: requestedStatus,
        deletionReason: '',
        deletionHistory: projectDeletionHistory(project),
        deletionPreviousProgressStatus: null,
        cancellationRequested: 'NO',
        cancellationPreviousProgressStatus: null,
        updatedAt: now,
      })
      restoredProject = nextProject
      return {
        projects: state.projects.map((candidate) =>
          candidate.id === id ? nextProject : candidate,
        ),
        activityEvents: appendProjectSaveActivityEvents(state.activityEvents, now, project, nextProject, {
          linkedOpportunity: state.opportunities.find((opportunity) => opportunity.opportunityId === nextProject.opportunityId),
          account: state.accounts.find((candidate) => candidate.accountName === nextProject.accountName),
        }),
      }
    })
    get().saveToStorage()
    return restoredProject
  },

  updateSystem: (id, patch, options) => {
    const now = new Date().toISOString()
    set((state) => {
      let idCounters = state.idCounters
      let previousSystem: AppDataState['systems'][number] | undefined
      let nextSystem: AppDataState['systems'][number] | undefined
      const systems = state.systems.map((system) => {
        if (system.id !== id) return system
        previousSystem = system
        const nextPatch = { ...patch }
        if ('documents' in nextPatch) {
          const reconciled = reconcileGlobalChildRecords<DocumentRecord>(state, idCounters, 'document', system.documents ?? [], nextPatch.documents ?? [])
          idCounters = reconciled.counters
          nextPatch.documents = reconciled.records
        }
        if ('remarks' in nextPatch) {
          const reconciled = reconcileGlobalChildRecords<RemarkRecord>(state, idCounters, 'remark', system.remarks ?? [], nextPatch.remarks ?? [])
          idCounters = reconciled.counters
          nextPatch.remarks = reconciled.records
        }
        if ('configurationHistory' in nextPatch) {
          nextPatch.configurationHistory = stampSystemConfigurationHistoryAttribution(nextPatch.configurationHistory ?? [], state, system)
          const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(state, idCounters, 'configurationHistory', system.configurationHistory ?? [], nextPatch.configurationHistory)
          idCounters = reconciled.counters
          nextPatch.configurationHistory = reconciled.records
        }
        nextSystem = { ...system, ...nextPatch, updatedAt: options?.preserveNewState ? system.createdAt : now }
        return nextSystem
      })
      return {
        idCounters,
        systems,
        activityEvents: previousSystem && nextSystem
          ? appendFieldChangeActivityEvents(state.activityEvents, now, {
              previous: previousSystem as unknown as Record<string, unknown>,
              next: nextSystem as unknown as Record<string, unknown>,
              category: 'SYSTEM',
              eventTypePrefix: 'system',
              objectLabel: `System ${systemBusinessId(nextSystem)}`,
              primaryObject: systemRef(nextSystem),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
  },

  updateSystemMapCenter: (systemId, mapCenter, options) => {
    const state = get()
    const system = state.systems.find((candidate) => candidate.id === systemId)
    if (!system) return { ok: false, message: 'System inventory record not found.' }

    const nextMapCenter = mapCenter.trim()
    if (String(system.mapCenter ?? '') === nextMapCenter) {
      return { ok: true, message: 'Map Center unchanged.', affectedTenantCount: hostedTenantCountForSystemId(state, systemId) }
    }

    const affectedTenantCount = hostedTenantCountForSystemId(state, systemId)
    if (affectedTenantCount >= 2 && !options?.confirmedMultiTenantChange) {
      return {
        ok: false,
        message: `Map Center is a System-level parameter. This change will affect ${affectedTenantCount} existing Tenants hosted by System ${systemBusinessId(system)}. Do you want to continue?`,
        affectedTenantCount,
      }
    }

    const now = new Date().toISOString()
    set((current) => updateSystemMapCenterTransaction(current, systemId, nextMapCenter, now, options?.sourceTenantId))
    get().saveToStorage()
    return { ok: true, message: 'System Map Center updated.', affectedTenantCount }
  },

  saveSystemFormTransaction: (collection, id, patch, tenantRemovalIds = [], options) => {
    const now = new Date().toISOString()
    const previousState = get()
    let committedRecord: AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number] | AppDataState['systems'][number] | undefined
    try {
      set((state) => {
      const tenantRemovalState = removeTenantsFromSystemTransaction(state, tenantRemovalIds, now)
      const updatedAtFor = (createdAt: string | undefined) => options?.preserveNewState ? createdAt ?? now : now
      let productionPatch = patch as Partial<AppDataState['productionSystemInventory'][number]>
      let reusedPatch = patch as Partial<AppDataState['reusedInternalSystems'][number]>
      let allocatedPatch = patch as Partial<AppDataState['systems'][number]>
      let idCounters = state.idCounters
      const cancellationRequested = (patch as { cancellationRequested?: string }).cancellationRequested === 'YES'
      const cancellationReason = String((patch as { cancellationReason?: string }).cancellationReason ?? '').trim()
      const previousAllocatedSystem = collection === 'allocated'
        ? tenantRemovalState.systems.find((system) => system.id === id)
        : undefined
      const previousProductionSystem = collection === 'production'
        ? state.productionSystemInventory.find((system) => system.id === id)
        : undefined
      const previousReusedSystem = collection === 'reused'
        ? state.reusedInternalSystems.find((system) => system.id === id)
        : undefined
      if (collection === 'production' && previousProductionSystem) {
        if ('documents' in productionPatch) {
          const reconciled = reconcileGlobalChildRecords<DocumentRecord>(state, idCounters, 'document', previousProductionSystem.documents ?? [], productionPatch.documents ?? [])
          idCounters = reconciled.counters
          productionPatch = { ...productionPatch, documents: reconciled.records }
        }
        if ('remarks' in productionPatch) {
          const reconciled = reconcileGlobalChildRecords<RemarkRecord>(state, idCounters, 'remark', previousProductionSystem.remarks ?? [], productionPatch.remarks ?? [])
          idCounters = reconciled.counters
          productionPatch = { ...productionPatch, remarks: reconciled.records }
        }
        if ('configurationHistory' in productionPatch) {
          const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(state, idCounters, 'configurationHistory', previousProductionSystem.configurationHistory ?? [], productionPatch.configurationHistory ?? [])
          idCounters = reconciled.counters
          productionPatch = { ...productionPatch, configurationHistory: reconciled.records }
        }
      }
      if (collection === 'reused' && previousReusedSystem) {
        if ('documents' in reusedPatch) {
          const reconciled = reconcileGlobalChildRecords<DocumentRecord>(state, idCounters, 'document', previousReusedSystem.documents ?? [], reusedPatch.documents ?? [])
          idCounters = reconciled.counters
          reusedPatch = { ...reusedPatch, documents: reconciled.records }
        }
        if ('remarks' in reusedPatch) {
          const reconciled = reconcileGlobalChildRecords<RemarkRecord>(state, idCounters, 'remark', previousReusedSystem.remarks ?? [], reusedPatch.remarks ?? [])
          idCounters = reconciled.counters
          reusedPatch = { ...reusedPatch, remarks: reconciled.records }
        }
        if ('configurationHistory' in reusedPatch) {
          const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(state, idCounters, 'configurationHistory', previousReusedSystem.configurationHistory ?? [], reusedPatch.configurationHistory ?? [])
          idCounters = reconciled.counters
          reusedPatch = { ...reusedPatch, configurationHistory: reconciled.records }
        }
      }
      if (collection === 'allocated' && previousAllocatedSystem) {
        if ('documents' in allocatedPatch) {
          const reconciled = reconcileGlobalChildRecords<DocumentRecord>(state, idCounters, 'document', previousAllocatedSystem.documents ?? [], allocatedPatch.documents ?? [])
          idCounters = reconciled.counters
          allocatedPatch = { ...allocatedPatch, documents: reconciled.records }
        }
        if ('remarks' in allocatedPatch) {
          const reconciled = reconcileGlobalChildRecords<RemarkRecord>(state, idCounters, 'remark', previousAllocatedSystem.remarks ?? [], allocatedPatch.remarks ?? [])
          idCounters = reconciled.counters
          allocatedPatch = { ...allocatedPatch, remarks: reconciled.records }
        }
        if ('configurationHistory' in allocatedPatch) {
          allocatedPatch = {
            ...allocatedPatch,
            configurationHistory: stampSystemConfigurationHistoryAttribution(allocatedPatch.configurationHistory ?? [], state, previousAllocatedSystem),
          }
          const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(state, idCounters, 'configurationHistory', previousAllocatedSystem.configurationHistory ?? [], allocatedPatch.configurationHistory ?? [])
          idCounters = reconciled.counters
          allocatedPatch = { ...allocatedPatch, configurationHistory: reconciled.records }
        }
      }
      if (cancellationRequested) {
        const activeSystemLinks = activeProjectSystemLinks(state.projectSystems).filter((link) =>
          link.systemId === id ||
          (previousReusedSystem && reusedInternalMachineIdsEqual(link.sourceMachineId, previousReusedSystem.machineId)),
        )
        const reusedIsOccupied = previousReusedSystem
          ? isReusedInternalOccupied(reusedInternalAvailabilityStatus(previousReusedSystem, activeProjectSystemLinks(state.projectSystems), state.projects, state.systems))
          : false
        if (richTextIsEmpty(cancellationReason) || activeSystemLinks.length > 0 || reusedIsOccupied) return state
      }
      const { mapCenter: allocatedMapCenter, ...allocatedRestPatch } = allocatedPatch
      let createdProductionSystem: AppDataState['productionSystemInventory'][number] | undefined
      let createdReusedSystem: AppDataState['reusedInternalSystems'][number] | undefined
      if (collection === 'production' && !previousProductionSystem) {
        const nextSid = commitBusinessIdFromCounter(
          'productionSystem',
          idCounters,
          productionPatch.sid,
          [...state.systems, ...state.productionSystemInventory].map((system) => system.sid),
        )
        idCounters = nextSid.counters
        createdProductionSystem = {
          ...createProductionInventorySystem(nextSid.id, now),
          ...productionPatch,
          id,
          sid: nextSid.id,
          createdAt: now,
          updatedAt: now,
        }
      }
      if (collection === 'reused' && !previousReusedSystem) {
        const draftMachineId = normalizeReusedInternalMachineId(String(reusedPatch.machineId ?? ''))
        const baseReusedSystem = createReusedInternalInventorySystem(draftMachineId, now)
        createdReusedSystem = normalizeSystemInventoryRecord({
          ...baseReusedSystem,
          ...reusedPatch,
          id,
          machineId: draftMachineId,
          status: reusedInternalStatusForPurpose(reusedPatch.purpose ?? baseReusedSystem.purpose),
          createdAt: now,
          updatedAt: now,
        })
      }
      const result = {
        ...tenantRemovalState,
        idCounters,
        productionSystemInventory:
          collection === 'production'
            ? previousProductionSystem
              ? state.productionSystemInventory.map((system) =>
                  system.id === id ? { ...system, ...productionPatch, updatedAt: updatedAtFor(system.createdAt) } : system,
                )
              : [createdProductionSystem as AppDataState['productionSystemInventory'][number], ...state.productionSystemInventory]
            : state.productionSystemInventory,
        reusedInternalSystems:
          collection === 'reused'
            ? previousReusedSystem
              ? state.reusedInternalSystems.map((system) => {
                if (system.id !== id) return system
                const safePatch = sanitizeReusedInternalSystemUserPatch(system, reusedPatch, state.projects, state.projectSystems, state.systems)
                const blockedPurposeChange = validateReusedInternalPurposeChange(
                  system,
                  { ...system, ...safePatch },
                  state.projects,
                  state.projectSystems,
                  state.systems,
                )
                const ownerRequirementMessages = reusedInternalOwnerRequirementMessages({ ...system, ...safePatch })
                const requiredFieldMessages = validateSystemInventoryRequiredFields({ ...system, ...safePatch }, state)
                if (blockedPurposeChange.length > 0 || ownerRequirementMessages.length > 0 || requiredFieldMessages.length > 0) return system
                const nextSystem = safePatch.purpose && safePatch.purpose !== system.purpose
                  ? updateReusedInternalPurpose({ ...system, owners: safePatch.owners ?? system.owners }, safePatch.purpose, now, {
                    owner: purposeHistoryOwnerSnapshot(safePatch.owners ?? system.owners),
                  })
                  : { ...system, updatedAt: updatedAtFor(system.createdAt) }
                const nextReusedSystem = applyReusedSystemOccupationWindow({
                  ...nextSystem,
                  ...safePatch,
                  status: reusedInternalStatusForPurpose(safePatch.purpose ?? nextSystem.purpose),
                  updatedAt: updatedAtFor(system.createdAt),
                }, state.projectSystems, state.projects, now, state.systems)
                return nextReusedSystem
              })
              : [createdReusedSystem as AppDataState['reusedInternalSystems'][number], ...state.reusedInternalSystems]
            : state.reusedInternalSystems,
        systems:
          collection === 'allocated'
            ? tenantRemovalState.systems.map((system) =>
                system.id === id
                  ? system.source === SYSTEM_SOURCE_REUSED_INTERNAL && reusedInternalOwnerRequirementMessages({ ...system, ...allocatedRestPatch }).length > 0
                    ? system
                    : { ...system, ...allocatedRestPatch, updatedAt: updatedAtFor(system.createdAt) }
                  : system,
              )
            : tenantRemovalState.systems,
      }
      if (cancellationRequested) {
        const activeRecordForCancellation = previousAllocatedSystem ?? previousProductionSystem ?? previousReusedSystem
        const cancelledStatusPatch = {
          operationalStatus: SYSTEM_OPERATIONAL_STATUS_CANCELED,
          cancellationRequested: 'NO' as const,
          cancellationReason,
          cancellationAt: now,
          cancelledBy: CURRENT_USER_DISPLAY_NAME,
          cancellationPreviousOperationalStatus: activeRecordForCancellation?.operationalStatus && activeRecordForCancellation.operationalStatus !== SYSTEM_OPERATIONAL_STATUS_CANCELED
            ? activeRecordForCancellation.operationalStatus
            : (activeRecordForCancellation as { cancellationPreviousOperationalStatus?: string | null } | undefined)?.cancellationPreviousOperationalStatus ?? SYSTEM_OPERATIONAL_STATUS_ON,
        }
        if (collection === 'allocated') {
          result.systems = result.systems.map((system) =>
            system.id === id
              ? {
                  ...system,
                  ...cancelledStatusPatch,
                  updatedAt: now,
                }
              : system,
          )
        }
        if (collection === 'production') {
          result.productionSystemInventory = result.productionSystemInventory.map((system) => system.id === id ? { ...system, ...cancelledStatusPatch, updatedAt: now } : system)
        }
        if (collection === 'reused') {
          result.reusedInternalSystems = result.reusedInternalSystems.map((system) => system.id === id ? { ...system, ...cancelledStatusPatch, updatedAt: now } : system)
        }
      }
      const operationalStatusSyncTargets: Array<{ systemId: string; previousStatus?: string; nextStatus?: string }> = []
      const synchronizedMidChanges: Array<{
        previous: AppDataState['reusedInternalSystems'][number]
        next: AppDataState['reusedInternalSystems'][number]
        sourceSid: string
      }> = []
      if (collection === 'allocated' && previousAllocatedSystem?.source === SYSTEM_SOURCE_REUSED_INTERNAL) {
        const nextSystem = result.systems.find((system) => system.id === id)
        if (nextSystem) {
          result.reusedInternalSystems = result.reusedInternalSystems.map((system) =>
            reusedInternalMachineIdsEqual(system.machineId, previousAllocatedSystem.machineId)
              ? (() => {
                  const nextMid = { ...system, ...reusedInternalCurrentPhysicalPatchFromSid(nextSystem), updatedAt: now }
                  if (!valuesEqual(system, nextMid)) {
                    synchronizedMidChanges.push({ previous: system, next: nextMid, sourceSid: nextSystem.sid ?? systemBusinessId(nextSystem) })
                  }
                  return nextMid
                })()
              : system,
          )
        }
        if (nextSystem && previousAllocatedSystem.operationalStatus !== nextSystem.operationalStatus) {
          operationalStatusSyncTargets.push({
            systemId: nextSystem.id,
            previousStatus: previousAllocatedSystem.operationalStatus,
            nextStatus: nextSystem.operationalStatus,
          })
        }
      }
      if (collection === 'reused' && previousReusedSystem) {
        const nextReusedSystem = result.reusedInternalSystems.find((system) => system.id === id)
        if (nextReusedSystem && previousReusedSystem.operationalStatus !== nextReusedSystem.operationalStatus) {
          const activeSidIds = new Set(
            activeProjectSystemLinks(result.projectSystems)
              .filter((link) => reusedInternalMachineIdsEqual(link.sourceMachineId, previousReusedSystem.machineId))
              .map((link) => link.systemId),
          )
          result.systems = result.systems.map((system) =>
            activeSidIds.has(system.id)
              ? { ...system, operationalStatus: nextReusedSystem.operationalStatus, updatedAt: now }
              : system,
          )
          operationalStatusSyncTargets.push({
            systemId: nextReusedSystem.id,
            previousStatus: previousReusedSystem.operationalStatus,
            nextStatus: nextReusedSystem.operationalStatus,
          })
          activeSidIds.forEach((systemId) => {
            operationalStatusSyncTargets.push({
              systemId,
              previousStatus: previousReusedSystem.operationalStatus,
              nextStatus: nextReusedSystem.operationalStatus,
            })
          })
        }
      }
      const tenantPropagation = operationalStatusSyncTargets.reduce(
        (current, target) => applySystemOperationalStatusToTenants(
          { ...state, ...result, tenants: current.tenants, activityEvents: current.activityEvents },
          target.systemId,
          target.previousStatus,
          target.nextStatus,
          now,
        ),
        { tenants: result.tenants, activityEvents: result.activityEvents },
      )
      result.tenants = tenantPropagation.tenants
      result.activityEvents = tenantPropagation.activityEvents
      result.systems = systemsWithDerivedTimeGroups(result.systems, result.tenants, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
      let activityEvents = result.activityEvents
      if (collection === 'production') {
        const previousSystem = previousProductionSystem
        const nextSystem = result.productionSystemInventory.find((system) => system.id === id)
        if (nextSystem) {
          committedRecord = nextSystem
          activityEvents = previousSystem
            ? appendFieldChangeActivityEvents(activityEvents, now, {
                previous: previousSystem as unknown as Record<string, unknown>,
                next: nextSystem as unknown as Record<string, unknown>,
                category: 'SYSTEM',
                eventTypePrefix: 'system',
                objectLabel: `System ${systemBusinessId(nextSystem)}`,
                primaryObject: systemRef(nextSystem),
              })
            : appendActivityEvent(activityEvents, now, {
                category: 'SYSTEM',
                eventType: 'system.created',
                severity: 'SUCCESS',
                summary: `System ${systemBusinessId(nextSystem)} created.`,
                primaryObject: systemRef(nextSystem),
              })
        }
      }
      if (collection === 'reused') {
        const previousSystem = previousReusedSystem
        const nextSystem = result.reusedInternalSystems.find((system) => system.id === id)
        if (nextSystem) {
          committedRecord = nextSystem
          activityEvents = previousSystem
            ? appendFieldChangeActivityEvents(activityEvents, now, {
                previous: previousSystem as unknown as Record<string, unknown>,
                next: nextSystem as unknown as Record<string, unknown>,
                category: 'SYSTEM',
                eventTypePrefix: 'system',
                objectLabel: `System ${systemBusinessId(nextSystem)}`,
                primaryObject: systemRef(nextSystem),
              })
            : appendActivityEvent(activityEvents, now, {
                category: 'SYSTEM',
                eventType: 'system.created',
                severity: 'SUCCESS',
                summary: `System ${systemBusinessId(nextSystem)} created.`,
                primaryObject: systemRef(nextSystem),
              })
        }
      }
      if (collection === 'allocated') {
        const previousSystem = state.systems.find((system) => system.id === id)
        const nextSystem = result.systems.find((system) => system.id === id)
        if (previousSystem && nextSystem) {
          committedRecord = nextSystem
          activityEvents = appendFieldChangeActivityEvents(activityEvents, now, {
            previous: previousSystem as unknown as Record<string, unknown>,
            next: nextSystem as unknown as Record<string, unknown>,
            category: 'SYSTEM',
            eventTypePrefix: 'system',
            objectLabel: `System ${systemBusinessId(nextSystem)}`,
            primaryObject: systemRef(nextSystem),
            excludeFields: typeof allocatedMapCenter === 'string' ? ['mapCenter'] : [],
          })
        }
        synchronizedMidChanges.forEach((change) => {
          activityEvents = appendFieldChangeActivityEvents(activityEvents, now, {
            previous: change.previous as unknown as Record<string, unknown>,
            next: change.next as unknown as Record<string, unknown>,
            category: 'SYSTEM',
            eventTypePrefix: 'system',
            objectLabel: `System ${systemBusinessId(change.next)}`,
            primaryObject: systemRef(change.next),
            relatedObjects: nextSystem ? relatedRefs(systemRef(nextSystem)) : [],
            summaryPrefix: `Automatically synchronized from active SID ${change.sourceSid}`,
          })
        })
      }
      const auditedResult = {
        ...result,
        reusedInternalSystems: collection === 'reused'
          ? recalculateReusedSystemOccupationWindows(result.reusedInternalSystems, result.projectSystems, state.projects, now, result.systems)
          : result.reusedInternalSystems,
        activityEvents,
      }
      if (collection !== 'allocated' || typeof allocatedMapCenter !== 'string') return auditedResult
      const mapCenterState = updateSystemMapCenterTransaction(
        { ...state, ...auditedResult },
        id,
        allocatedMapCenter,
        now,
      )
      return { ...auditedResult, systems: mapCenterState.systems, activityEvents: mapCenterState.activityEvents }
      })
      get().saveToStorage()
    } catch (error) {
      set(previousState)
      throw error
    }
    return committedRecord
  },

  createReferenceDataRecord: (referenceType, label, options) => {
    const state = get()
    if (referenceType === 'BUILD_NUMBER') {
      const parentVersion = state.referenceData.find((record) => record.id === options?.versionNumberId && record.referenceType === 'VERSION_NUMBER')
      if (!parentVersion) return { ok: false, message: 'Version Number is required before adding a Build Number.' }
    }
    if (referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE) {
      const parentCategory = state.referenceData.find((record) => record.id === options?.versionNumberId && record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE)
      if (!parentCategory) return { ok: false, message: 'Category is required before adding an Infrastructure Type.' }
    }
    if (referenceType === INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE) {
      const parentType = state.referenceData.find((record) => record.id === options?.versionNumberId && record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE)
      if (!parentType) return { ok: false, message: 'Type is required before adding an Infrastructure Manufacturer.' }
    }
    const messages = validateReferenceDataLabel(state.referenceData, referenceType, label, undefined, options?.versionNumberId)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    const now = new Date().toISOString()
    const entityType =
      referenceType === 'VERSION_NUMBER' ? 'versionNumber'
        : referenceType === 'BUILD_NUMBER' ? 'buildNumber'
          : referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE ? 'infrastructureCategory'
            : referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE ? 'infrastructureType'
              : referenceType === INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE ? 'infrastructureManufacturer'
                : referenceType === INFRASTRUCTURE_OWNER_REFERENCE_TYPE ? 'infrastructureOwner'
                  : referenceType === INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE ? 'infrastructureBillingMethod'
                    : referenceType === INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE ? 'infrastructureWarrantyType'
                      : referenceType === INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE ? 'infrastructurePropertyValue'
                        : referenceType === INFRASTRUCTURE_MAINTENANCE_TASK_TYPE_REFERENCE_TYPE ? 'infrastructureMaintenanceTask'
                          : 'infrastructureType'
    const nextId = generateBusinessIdFromCounter(entityType, state.idCounters, state.referenceData.map((record) => record.id))
    const record: ReferenceDataRecord = {
      id: nextId.id,
      referenceType,
      versionNumberId: referenceType === 'BUILD_NUMBER' || referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE || referenceType === INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE || referenceType === INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE ? options?.versionNumberId ?? null : null,
      parentReferenceId: referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE || referenceType === INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE || referenceType === INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE ? options?.versionNumberId ?? null : null,
      label: referenceDataLabel(label),
      normalizedLabel: normalizeReferenceLabel(label),
      active: true,
      createdAt: now,
      createdBy: CURRENT_USER_DISPLAY_NAME,
      updatedAt: now,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    }
    set((current) => ({
      idCounters: nextId.counters,
      referenceData: [...current.referenceData, record],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: `${referenceType.toLocaleLowerCase()}.created`,
        severity: 'SUCCESS',
        summary: `${REFERENCE_DATA_TYPE_LABELS[referenceType]} ${record.label} created.`,
        primaryObject: referenceDataRef(record),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `${REFERENCE_DATA_TYPE_LABELS[referenceType]} created.`, record }
  },

  updateReferenceDataRecord: (id, label) => {
    const state = get()
    const existing = state.referenceData.find((record) => record.id === id)
    if (!existing) return { ok: false, message: 'Reference data record not found.' }
    const messages = validateReferenceDataLabel(state.referenceData, existing.referenceType, label, id, existing.versionNumberId)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    const nextLabel = referenceDataLabel(label)
    if (nextLabel === existing.label) return { ok: true, message: 'No changes to save.', record: existing }
    const now = new Date().toISOString()
    const record = {
      ...existing,
      label: nextLabel,
      normalizedLabel: normalizeReferenceLabel(nextLabel),
      updatedAt: now,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    }
    set((current) => ({
      referenceData: current.referenceData.map((candidate) => candidate.id === id ? record : candidate),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: `${existing.referenceType.toLocaleLowerCase()}.renamed`,
        severity: 'INFO',
        summary: `${REFERENCE_DATA_TYPE_LABELS[existing.referenceType]} renamed from ${existing.label} to ${record.label}.`,
        primaryObject: referenceDataRef(record),
        before: { label: existing.label },
        after: { label: record.label },
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `${REFERENCE_DATA_TYPE_LABELS[existing.referenceType]} updated.`, record }
  },

  setReferenceDataActive: (id, active) => {
    const state = get()
    const existing = state.referenceData.find((record) => record.id === id)
    if (!existing) return { ok: false, message: 'Reference data record not found.' }
    if (existing.active === active) return { ok: true, message: 'No changes to save.' }
    const now = new Date().toISOString()
    const record = { ...existing, active, updatedAt: now, updatedBy: CURRENT_USER_DISPLAY_NAME }
    set((current) => ({
      referenceData: current.referenceData.map((candidate) => candidate.id === id ? record : candidate),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: `${existing.referenceType.toLocaleLowerCase()}.${active ? 'activated' : 'deactivated'}`,
        severity: active ? 'SUCCESS' : 'WARNING',
        summary: `${REFERENCE_DATA_TYPE_LABELS[existing.referenceType]} ${record.label} ${active ? 'activated' : 'deactivated'}.`,
        primaryObject: referenceDataRef(record),
        before: { active: existing.active },
        after: { active },
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `${REFERENCE_DATA_TYPE_LABELS[existing.referenceType]} ${active ? 'activated' : 'deactivated'}.` }
  },

  updateCountryLookup: (id, patch) => {
    const state = get()
    const existing = state.countryLookups.find((record) => record.id === id)
    if (!existing) return { ok: false, message: 'Country record not found.' }
    const now = new Date().toISOString()
    const candidate: GeographicCountryRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      countryName: String(patch.countryName ?? existing.countryName).trim(),
      countryCodeName: String(patch.countryCodeName ?? existing.countryCodeName).trim(),
      region: String(patch.region ?? existing.region).trim().toLocaleUpperCase(),
      timeZone: String(patch.timeZone ?? existing.timeZone).trim(),
      active: patch.active ?? existing.active,
      updatedAt: now,
    }
    const nextCountries = normalizeCountryLookups(state.countryLookups.map((record) => record.id === id ? candidate : record))
    const messages = validateCountryLookupRows(nextCountries)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    const record = nextCountries.find((country) => country.id === id) ?? candidate
    set((current) => stateWithDerivedGeographicConfiguration({
      ...current,
      countryLookups: nextCountries,
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: 'country.mappingUpdated',
        severity: 'INFO',
        summary: `Country mapping ${record.countryName} updated.`,
        primaryObject: {
          objectType: 'CONFIGURATION',
          id: record.id,
          businessId: record.countryName,
          displayLabel: record.countryName,
        },
        before: existing as unknown as Record<string, unknown>,
        after: record as unknown as Record<string, unknown>,
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Country mapping updated.', record }
  },

  updateUsStateLookup: (id, patch) => {
    const state = get()
    const existing = state.usStateLookups.find((record) => record.id === id)
    if (!existing) return { ok: false, message: 'US State record not found.' }
    const now = new Date().toISOString()
    const candidate: GeographicUsStateRecord = {
      ...existing,
      ...patch,
      id: existing.id,
      state: String(patch.state ?? existing.state).trim(),
      timeZone: String(patch.timeZone ?? existing.timeZone).trim(),
      active: patch.active ?? existing.active,
      updatedAt: now,
    }
    const nextStates = normalizeUsStateLookups(state.usStateLookups.map((record) => record.id === id ? candidate : record))
    const messages = validateUsStateLookupRows(nextStates)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    const record = nextStates.find((stateRecord) => stateRecord.id === id) ?? candidate
    set((current) => stateWithDerivedGeographicConfiguration({
      ...current,
      usStateLookups: nextStates,
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: 'usState.mappingUpdated',
        severity: 'INFO',
        summary: `US State mapping ${record.state} updated.`,
        primaryObject: {
          objectType: 'CONFIGURATION',
          id: record.id,
          businessId: record.state,
          displayLabel: record.state,
        },
        before: existing as unknown as Record<string, unknown>,
        after: record as unknown as Record<string, unknown>,
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'US State mapping updated.', record }
  },

  updateTimeGroupLookup: (id, patch) => {
    const state = get()
    const existing = state.timeGroupLookups.find((record) => record.id === id)
    if (!existing) return { ok: false, message: 'Time Group mapping not found.' }
    const now = new Date().toISOString()
    const nextRecord: TimeGroupLookupRecord = {
      ...existing,
      ...patch,
      timeGroupId: existing.timeGroupId,
      timeGroup: String(patch.timeGroup ?? existing.timeGroup).trim(),
      timeZones: Array.isArray(patch.timeZones) ? patch.timeZones.map((value) => value.trim()).filter(Boolean) : existing.timeZones,
      countries: Array.isArray(patch.countries) ? patch.countries.map((value) => value.trim()).filter(Boolean) : existing.countries,
      states: Array.isArray(patch.states) ? patch.states.map((value) => value.trim()).filter(Boolean) : existing.states,
      active: patch.active ?? existing.active,
      updatedAt: now,
    }
    const nextRows = normalizeTimeGroupLookups(state.timeGroupLookups.map((record) => record.id === id ? nextRecord : record), state.countryLookups, state.usStateLookups)
    const messages = validateTimeGroupLookupRows(nextRows)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    set((current) => ({
      timeGroupLookups: nextRows,
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: 'timeGroup.mappingUpdated',
        severity: 'INFO',
        summary: `Time Group mapping ${nextRecord.timeGroupId} updated.`,
        primaryObject: {
          objectType: 'CONFIGURATION',
          id: nextRecord.id,
          businessId: nextRecord.timeGroupId,
          displayLabel: nextRecord.timeGroup,
        },
        before: existing as unknown as Record<string, unknown>,
        after: nextRecord as unknown as Record<string, unknown>,
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Time Group mapping updated.' }
  },

  updateProjectDocuments: (id, documents) => {
    const now = new Date().toISOString()
    let committedProject: AppDataState['projects'][number] | undefined
    set((state) => {
      let idCounters = state.idCounters
      const projects = state.projects.map((project) => {
        if (project.id !== id) return project
        const reconciledDocuments = reconcileGlobalChildRecords<DocumentRecord>(
          state,
          idCounters,
          'document',
          project.documents ?? [],
          documents ?? [],
        )
        idCounters = reconciledDocuments.counters
        committedProject = { ...project, documents: reconciledDocuments.records, updatedAt: now }
        return committedProject
      })
      return { projects, idCounters }
    })
    get().saveToStorage()
    return committedProject
  },

  setRecordsPerPagePreference: (context, value) => {
    const normalized = normalizeRecordsPerPageValue(value)
    if (!normalized) return { ok: false, message: 'Records per page value is not supported.' }
    const now = new Date().toISOString()
    const existing = get().userPresentationPreferences.find((preference) =>
      preference.userId === CURRENT_USER_ID &&
      preference.preferenceType === USER_PREFERENCE_TYPE_RECORDS_PER_PAGE &&
      preference.context === context,
    )
    const preference: UserPresentationPreference = existing
      ? { ...existing, value: String(normalized), updatedAt: now }
      : {
          id: `pref-${crypto.randomUUID()}`,
          userId: CURRENT_USER_ID,
          preferenceType: USER_PREFERENCE_TYPE_RECORDS_PER_PAGE,
          context,
          value: String(normalized),
          createdAt: now,
          updatedAt: now,
        }
    set((current) => ({
      userPresentationPreferences: existing
        ? current.userPresentationPreferences.map((candidate) => candidate.id === existing.id ? preference : candidate)
        : [preference, ...current.userPresentationPreferences],
    }))
    get().saveToStorage()
    return { ok: true, message: 'Records per page default saved.', preference }
  },

  resetRecordsPerPagePreference: (context) => {
    const existing = get().userPresentationPreferences.find((preference) =>
      preference.userId === CURRENT_USER_ID &&
      preference.preferenceType === USER_PREFERENCE_TYPE_RECORDS_PER_PAGE &&
      preference.context === context,
    )
    if (!existing) return { ok: true, message: 'No personal default was set.' }
    set((current) => ({
      userPresentationPreferences: current.userPresentationPreferences.filter((preference) => preference.id !== existing.id),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Records per page default reset.' }
  },

  updateRoleDefinition: (role) => {
    const state = get()
    if (!canExecuteAction(state, 'rolesPermissions', 'Edit')) {
      return { ok: false, message: 'Current user is not allowed to edit Roles & Permissions.' }
    }
    const now = new Date().toISOString()
    const normalizedRoles = normalizeRoles([
      ...state.roles.filter((candidate) => candidate.id !== role.id),
      { ...role, updatedAt: now },
    ], now)
    const normalizedAssignments = normalizeUserRoleAssignments(state.userRoleAssignments, normalizedRoles, now)
    const record = normalizedRoles.find((candidate) => candidate.id === role.id)
    set({
      roles: normalizedRoles,
      userRoleAssignments: normalizedAssignments,
      notificationRules: normalizeNotificationRules(state.notificationRules, normalizedRoles, now),
      activityEvents: appendActivityEvent(state.activityEvents, now, {
        category: 'ADMINISTRATION',
        eventType: 'admin.rolePermissionsUpdated',
        severity: 'WARNING',
        summary: `Role ${role.name} permissions were updated by ${CURRENT_USER_DISPLAY_NAME}.`,
        primaryObject: {
          objectType: 'Role',
          id: role.id,
          businessId: role.id,
          displayLabel: `Role ${role.name}`,
        },
      }),
    })
    get().saveToStorage()
    return record ? { ok: true, message: `Role ${record.name} permissions saved.`, record } : { ok: false, message: 'Role could not be saved.' }
  },

  updateNotificationRule: (rule) => {
    const state = get()
    if (!canExecuteAction(state, 'notificationsAlerts', 'Edit')) {
      return { ok: false, message: 'Current user is not allowed to edit Notifications & Alerts rules.' }
    }
    const now = new Date().toISOString()
    const rules = normalizeNotificationRules([
      ...state.notificationRules.filter((candidate) => candidate.id !== rule.id),
      { ...rule, updatedAt: now },
    ], state.roles, now)
    const record = rules.find((candidate) => candidate.id === rule.id)
    set({
      notificationRules: rules,
      activityEvents: appendActivityEvent(state.activityEvents, now, {
        category: 'ADMINISTRATION',
        eventType: 'admin.notificationRuleUpdated',
        severity: 'WARNING',
        summary: `Notification rule ${rule.eventKey} was updated by ${CURRENT_USER_DISPLAY_NAME}.`,
        primaryObject: {
          objectType: 'Notification Rule',
          id: rule.id,
          businessId: rule.eventKey,
          displayLabel: `Notification Rule ${rule.eventKey}`,
        },
      }),
    })
    get().saveToStorage()
    return record ? { ok: true, message: `Rule ${record.eventKey} saved.`, record } : { ok: false, message: 'Rule could not be saved.' }
  },

  markNotificationRead: (id) => {
    const now = new Date().toISOString()
    set((state) => ({
      notificationRecords: state.notificationRecords.map((record) =>
        record.id === id
          ? {
              ...record,
              status: 'READ',
              readAt: now,
              readBy: CURRENT_USER_DISPLAY_NAME,
              readReceipts: [
                ...(record.readReceipts ?? []).filter((receipt) => receipt.userId !== CURRENT_USER_ID),
                { userId: CURRENT_USER_ID, readAt: now, readBy: CURRENT_USER_DISPLAY_NAME },
              ],
            }
          : record,
      ),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Notification marked read.' }
  },

  markNotificationUnread: (id) => {
    set((state) => ({
      notificationRecords: state.notificationRecords.map((record) => {
        if (record.id !== id) return record
        const readReceipts = (record.readReceipts ?? []).filter((receipt) => receipt.userId !== CURRENT_USER_ID)
        return {
          ...record,
          status: notificationReadStatusForUser({ ...record, readReceipts }, CURRENT_USER_ID),
          readAt: readReceipts.find((receipt) => receipt.userId === CURRENT_USER_ID)?.readAt ?? null,
          readBy: readReceipts.find((receipt) => receipt.userId === CURRENT_USER_ID)?.readBy ?? null,
          readReceipts,
        }
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Notification marked unread.' }
  },

  resolveAlert: (id, resolutionSummary = 'Resolved manually.') => {
    const state = get()
    if (!canExecuteAction(state, 'notificationsAlerts', 'Resolve')) {
      return { ok: false, message: 'Current user is not allowed to resolve alerts.' }
    }
    const now = new Date().toISOString()
    set((current) => ({
      alertRecords: current.alertRecords.map((record) =>
        record.id === id
          ? { ...record, status: 'RESOLVED', resolvedAt: now, resolvedBy: CURRENT_USER_DISPLAY_NAME, resolutionSummary }
          : record,
      ),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Alert resolved.' }
  },

  reopenAlert: (id) => {
    const state = get()
    if (!canExecuteAction(state, 'notificationsAlerts', 'Resolve')) {
      return { ok: false, message: 'Current user is not allowed to reopen alerts.' }
    }
    set((current) => ({
      alertRecords: current.alertRecords.map((record) =>
        record.id === id
          ? { ...record, status: 'OPEN', resolvedAt: null, resolvedBy: null, resolutionSummary: null }
          : record,
      ),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Alert reopened.' }
  },

  reconcileNotificationsAndAlerts: () => {
    set((state) => reconcileNotificationsAndAlerts(state))
    get().saveToStorage()
  },

  executeReminder: (sourceKey) => {
    const state = get()
    if (!canExecuteAction(state, 'reminders', 'Execute')) {
      return { ok: false, message: 'Current user is not allowed to execute reminders.' }
    }
    const reminder = deriveReminderRows(state).find((row) => row.sourceKey === sourceKey)
    if (!reminder) return { ok: false, message: 'Reminder could not be found.' }
    if (reminder.status === 'EXECUTED') return { ok: true, message: 'Reminder is already executed.' }
    const now = new Date().toISOString()
    const execution: ReminderExecutionRecord = {
      id: reminderExecutionIdForSource(sourceKey),
      sourceKey,
      sourceType: reminder.sourceType,
      sourceId: reminder.sourceId,
      parentObjectType: reminder.parentObjectType,
      parentObjectId: reminder.parentObjectId,
      parentBusinessId: reminder.parentBusinessId,
      executedAt: now,
      executedBy: CURRENT_USER_DISPLAY_NAME,
      sourceDueDateAtExecution: reminder.dueDate,
      restoredAt: null,
      restoredBy: null,
      externalEventId: null,
      externalSyncState: 'NOT_SYNCED',
      externalSyncedAt: null,
      createdAt: state.reminderExecutions.find((record) => record.sourceKey === sourceKey)?.createdAt ?? now,
      updatedAt: now,
    }
    set((current) => ({
      reminderExecutions: [
        ...current.reminderExecutions.filter((record) => record.sourceKey !== sourceKey),
        execution,
      ],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'TASK',
        eventType: 'reminder.executed',
        severity: 'INFO',
        summary: `Reminder ${reminder.sourceLabel} for ${reminder.parentBusinessId} was executed by ${CURRENT_USER_DISPLAY_NAME}.`,
        primaryObject: {
          objectType: 'Reminder',
          id: execution.id,
          businessId: reminder.sourceLabel,
          displayLabel: `Reminder ${reminder.sourceLabel}`,
        },
        relatedObjects: [activityObjectRefFromBusinessReference(reminder.parentReference)],
        details: reminder.message,
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Reminder marked executed.' }
  },

  restoreReminder: (sourceKey) => {
    const state = get()
    if (!canExecuteAction(state, 'reminders', 'Restore')) {
      return { ok: false, message: 'Current user is not allowed to restore reminders.' }
    }
    const existing = state.reminderExecutions.find((record) => record.sourceKey === sourceKey)
    const reminder = deriveReminderRows(state).find((row) => row.sourceKey === sourceKey)
    if (!existing && !reminder) return { ok: false, message: 'Reminder could not be found.' }
    const now = new Date().toISOString()
    set((current) => ({
      reminderExecutions: current.reminderExecutions.map((record) =>
        record.sourceKey === sourceKey
          ? {
              ...record,
              executedAt: null,
              executedBy: null,
              sourceDueDateAtExecution: null,
              restoredAt: now,
              restoredBy: CURRENT_USER_DISPLAY_NAME,
              updatedAt: now,
              externalSyncState: record.externalSyncState ?? 'NOT_SYNCED',
            }
          : record,
      ),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'TASK',
        eventType: 'reminder.restored',
        severity: 'INFO',
        summary: `Reminder ${(reminder?.sourceLabel ?? existing?.sourceId ?? sourceKey)} was restored to Pending by ${CURRENT_USER_DISPLAY_NAME}.`,
        primaryObject: {
          objectType: 'Reminder',
          id: existing?.id ?? reminderExecutionIdForSource(sourceKey),
          businessId: reminder?.sourceLabel ?? existing?.sourceId ?? sourceKey,
          displayLabel: `Reminder ${reminder?.sourceLabel ?? existing?.sourceId ?? sourceKey}`,
        },
        relatedObjects: reminder ? [activityObjectRefFromBusinessReference(reminder.parentReference)] : [],
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Reminder restored to Pending.' }
  },

  saveVersionUpgradeRecord: (id, draft) => {
    const state = get()
    if (!canExecuteAction(state, 'versionUpgradeScheduler', id ? 'Edit' : 'Create')) {
      return { ok: false, message: 'Current user is not allowed to save Version Upgrade records.' }
    }
    const versionLabel = referenceDataLabel(draft.versionNumber)
    const buildLabel = referenceDataLabel(draft.buildNumber)
    const messages: string[] = []
    if (!versionLabel) messages.push('Version Number is required.')
    if (!buildLabel) messages.push('Build Number is required.')
    const existing = id ? state.versionUpgradeRecords.find((record) => record.id === id) : undefined
    if (id && !existing) messages.push('Version Upgrade record not found.')
    let nextReferenceData = state.referenceData
    let nextIdCounters = state.idCounters
    const now = new Date().toISOString()
    let versionReference = nextReferenceData.find((record) => record.referenceType === 'VERSION_NUMBER' && record.normalizedLabel === normalizeReferenceLabel(versionLabel))
    if (!versionReference && versionLabel) {
      const nextVersion = generateBusinessIdFromCounter('versionNumber', nextIdCounters, nextReferenceData.map((record) => record.id))
      nextIdCounters = nextVersion.counters
      versionReference = {
        id: nextVersion.id,
        referenceType: 'VERSION_NUMBER',
        versionNumberId: null,
        label: versionLabel,
        normalizedLabel: normalizeReferenceLabel(versionLabel),
        active: true,
        createdAt: now,
        createdBy: CURRENT_USER_DISPLAY_NAME,
        updatedAt: now,
        updatedBy: CURRENT_USER_DISPLAY_NAME,
      }
      nextReferenceData = [...nextReferenceData, versionReference]
    }
    let buildReference = versionReference
      ? nextReferenceData.find((record) =>
          record.referenceType === 'BUILD_NUMBER' &&
          record.versionNumberId === versionReference?.id &&
          record.normalizedLabel === normalizeReferenceLabel(buildLabel),
        )
      : undefined
    if (!buildReference && versionReference && buildLabel) {
      const nextBuild = generateBusinessIdFromCounter('buildNumber', nextIdCounters, nextReferenceData.map((record) => record.id))
      nextIdCounters = nextBuild.counters
      buildReference = {
        id: nextBuild.id,
        referenceType: 'BUILD_NUMBER',
        versionNumberId: versionReference.id,
        label: buildLabel,
        normalizedLabel: normalizeReferenceLabel(buildLabel),
        active: true,
        createdAt: now,
        createdBy: CURRENT_USER_DISPLAY_NAME,
        updatedAt: now,
        updatedBy: CURRENT_USER_DISPLAY_NAME,
      }
      nextReferenceData = [...nextReferenceData, buildReference]
    }
    if (versionReference && buildReference && schedulerHasVersionBuildPair(state.versionUpgradeRecords, versionReference.id, buildReference.id, existing?.id)) {
      messages.push('A Version Upgrade record already exists for this Version + Build pair.')
    }
    const schedules = draft.schedules.map((schedule) => {
      const previous = existing?.schedules.find((candidate) => candidate.systemId === schedule.systemId)
      const materialScheduleChanged = Boolean(previous?.scheduleConfirmed) && (
        previous?.requestedUpgradeDate !== schedule.requestedUpgradeDate ||
        previous?.requestedUpgradeTime !== schedule.requestedUpgradeTime ||
        previous?.customerTimeZone !== schedule.customerTimeZone
      )
      return {
        ...schedule,
        scheduleConfirmed: materialScheduleChanged ? false : schedule.scheduleConfirmed,
        confirmedAt: materialScheduleChanged || !schedule.scheduleConfirmed ? null : (schedule.confirmedAt ?? previous?.confirmedAt ?? now),
        confirmedBy: materialScheduleChanged || !schedule.scheduleConfirmed ? null : (schedule.confirmedBy ?? previous?.confirmedBy ?? CURRENT_USER_DISPLAY_NAME),
        updatedAt: now,
        updatedBy: CURRENT_USER_DISPLAY_NAME,
      }
    })
    const provisionalRecord: VersionUpgradeRecord | undefined = versionReference && buildReference
      ? {
          id: existing?.id ?? `version-upgrade-${crypto.randomUUID()}`,
          versionNumberRefId: versionReference.id,
          buildNumberRefId: buildReference.id,
          releaseDate: draft.releaseDate,
          phaseOutDate: draft.phaseOutDate,
          limitedToCloudPlatform: draft.limitedToCloudPlatform,
          remarks: draft.remarks,
          operationalStatus: existing?.operationalStatus ?? 'ACTIVE',
          cancellationRequested: existing?.cancellationRequested ?? 'NO',
          cancellationReason: existing?.cancellationReason ?? '',
          cancellationHistory: existing?.cancellationHistory ?? [],
          cancelledAt: existing?.cancelledAt ?? null,
          cancelledBy: existing?.cancelledBy ?? null,
          schedules,
          createdAt: existing?.createdAt ?? now,
          createdBy: existing?.createdBy ?? CURRENT_USER_DISPLAY_NAME,
          updatedAt: now,
          updatedBy: CURRENT_USER_DISPLAY_NAME,
        }
      : undefined
    if (provisionalRecord) {
      schedules.forEach((schedule) => {
        if (!schedule.scheduleConfirmed) return
        const availability = deriveEngineerAvailability({ ...state, referenceData: nextReferenceData, versionUpgradeRecords: [
          ...state.versionUpgradeRecords.filter((record) => record.id !== provisionalRecord.id),
          provisionalRecord,
        ] }, provisionalRecord, schedule)
        if (availability.availability === 'No') messages.push(`Schedule for ${schedule.systemId} cannot be confirmed. ${availability.reason}`)
      })
    }
    if (messages.length > 0 || !provisionalRecord) return { ok: false, message: messages.join(' ') || 'Version Upgrade record could not be saved.' }
    const record = provisionalRecord
    set((current) => ({
      idCounters: nextIdCounters,
      referenceData: nextReferenceData,
      versionUpgradeRecords: existing
        ? current.versionUpgradeRecords.map((candidate) => candidate.id === existing.id ? record : candidate)
        : [record, ...current.versionUpgradeRecords],
      activityEvents: schedules.reduce((events, schedule) => {
        const previous = existing?.schedules.find((candidate) => candidate.systemId === schedule.systemId)
        const hasRequest = Boolean(schedule.requestedUpgradeDate && schedule.requestedUpgradeTime && schedule.customerTimeZone)
        const materialScheduleChanged = Boolean(previous && (
          previous.requestedUpgradeDate !== schedule.requestedUpgradeDate ||
          previous.requestedUpgradeTime !== schedule.requestedUpgradeTime ||
          previous.customerTimeZone !== schedule.customerTimeZone
        ))
        const eventType = !previous && hasRequest
          ? 'versionUpgrade.scheduleRequested'
          : materialScheduleChanged && hasRequest
            ? 'versionUpgrade.scheduleUpdated'
            : schedule.scheduleConfirmed && !previous?.scheduleConfirmed
              ? 'versionUpgrade.scheduleConfirmed'
              : ''
        if (!eventType) return events
        const system = current.systems.find((candidate) => candidate.id === schedule.systemId)
        return appendActivityEvent(events, now, {
          category: 'SYSTEM',
          eventType,
          severity: 'INFO',
          summary: `System upgrade schedule ${eventType.endsWith('Confirmed') ? 'confirmed' : eventType.endsWith('Updated') ? 'updated' : 'requested'} for ${system ? systemBusinessId(system) : schedule.systemId}.`,
          primaryObject: system ? systemRef(system) : versionUpgradeRef(record, nextReferenceData),
          relatedObjects: relatedRefs(versionUpgradeRef(record, nextReferenceData)),
          before: previous as unknown as Record<string, unknown> | undefined,
          after: schedule as unknown as Record<string, unknown>,
        })
      }, appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: existing ? 'versionUpgrade.edited' : 'versionUpgrade.created',
        severity: 'SUCCESS',
        summary: `Version Upgrade ${versionLabel} / ${buildLabel} ${existing ? 'saved' : 'created'}.`,
        primaryObject: versionUpgradeRef(record, nextReferenceData),
        before: existing as unknown as Record<string, unknown> | undefined,
        after: record as unknown as Record<string, unknown>,
      })),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Version Upgrade record saved.', record }
  },

  cancelVersionUpgradeRecord: (id, reason) => {
    const state = get()
    if (!canExecuteAction(state, 'versionUpgradeScheduler', 'Cancel')) {
      return { ok: false, message: 'Current user is not allowed to cancel Version Upgrade records.' }
    }
    const existing = state.versionUpgradeRecords.find((record) => record.id === id)
    if (!existing) return { ok: false, message: 'Version Upgrade record not found.' }
    if (existing.operationalStatus === 'CANCELLED') return { ok: true, message: 'Version Upgrade record is already cancelled.', record: existing }
    const now = new Date().toISOString()
    const trimmedReason = reason.trim()
    if (!trimmedReason) return { ok: false, message: 'Cancellation Reason is required.' }
    const record: VersionUpgradeRecord = {
      ...existing,
      operationalStatus: 'CANCELLED',
      cancellationRequested: 'NO',
      cancellationReason: trimmedReason,
      cancelledAt: now,
      cancelledBy: CURRENT_USER_DISPLAY_NAME,
      cancellationHistory: [
        ...(existing.cancellationHistory ?? []),
        {
          id: `version-upgrade-cancellation-${crypto.randomUUID()}`,
          reason: trimmedReason,
          timestamp: now,
          deletedBy: CURRENT_USER_DISPLAY_NAME,
        },
      ],
      updatedAt: now,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    }
    set((current) => ({
      versionUpgradeRecords: current.versionUpgradeRecords.map((candidate) => candidate.id === id ? record : candidate),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: 'versionUpgrade.cancelled',
        severity: 'WARNING',
        summary: `Version Upgrade ${versionUpgradeRef(record, current.referenceData).businessId} was cancelled.`,
        primaryObject: versionUpgradeRef(record, current.referenceData),
        before: existing as unknown as Record<string, unknown>,
        after: record as unknown as Record<string, unknown>,
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Version Upgrade record cancelled.', record }
  },

  createInfrastructureItem: (draft) => {
    const state = get()
    const now = new Date().toISOString()
    const draftMessages = validateInfrastructureItemDraft(draft, state.infrastructureItems, state.referenceData)
    if (draftMessages.length > 0) return { ok: false, message: draftMessages.join(' ') }
    const normalizedDraft: InfrastructureItem = normalizeInfrastructureItem({
      ...draft,
      identifier: draft.identifier.trim(),
      normalizedIdentifier: normalizeInfrastructureIdentifier(draft.identifier),
      lastUpdatedDate: now,
      linkedSystemIds: Array.from(new Set((draft.linkedSystemIds ?? []).filter(Boolean))),
      maintenanceTasks: normalizeInfrastructureMaintenanceTasks(draft.maintenanceTasks ?? [], now, infrastructureMaintenanceTaskIds(state.infrastructureItems)),
      warranties: normalizeInfrastructureWarrantyCollection(draft.warranties ?? [], infrastructureWarrantyIds(state.infrastructureItems)),
    }, infrastructureMaintenanceTaskIds(state.infrastructureItems), infrastructureWarrantyIds(state.infrastructureItems))
    const messages = validateInfrastructureItemDraft(normalizedDraft, state.infrastructureItems, state.referenceData)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    const nextIdentity = commitBusinessIdFromCounter(
      'infrastructureItem',
      state.idCounters,
      normalizedDraft.infrastructureId,
      state.infrastructureItems.map((item) => item.infrastructureId),
    )
    const record: InfrastructureItem = normalizeInfrastructureItem({
      ...normalizedDraft,
      infrastructureId: nextIdentity.id,
      createdAt: now,
      updatedAt: now,
    }, infrastructureMaintenanceTaskIds(state.infrastructureItems), infrastructureWarrantyIds(state.infrastructureItems))
    set((current) => ({
      idCounters: nextIdentity.counters,
      infrastructureItems: [...current.infrastructureItems, record],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'INFRASTRUCTURE',
        eventType: 'infrastructureItem.created',
        severity: 'SUCCESS',
        summary: `Infrastructure Item ${record.infrastructureId} created.`,
        primaryObject: infrastructureRef(record),
        relatedObjects: relatedRefs(...record.linkedSystemIds.map((systemId) => {
          const system = [...current.systems, ...current.productionSystemInventory, ...current.reusedInternalSystems].find((candidate) => candidate.id === systemId)
          return system ? systemRef(system) : null
        })),
        after: record as unknown as Record<string, unknown>,
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `Infrastructure Item ${record.infrastructureId} created.`, record }
  },

  updateInfrastructureItem: (id, draft) => {
    const state = get()
    const existing = state.infrastructureItems.find((item) => item.id === id)
    if (!existing) return { ok: false, message: 'Infrastructure Item not found.' }
    const now = new Date().toISOString()
    const draftMessages = validateInfrastructureItemDraft(draft, state.infrastructureItems, state.referenceData)
    if (draftMessages.length > 0) return { ok: false, message: draftMessages.join(' ') }
    const cancellationRequested = draft.cancellationRequested === 'YES'
    const cancellationReason = String(draft.cancellationReason ?? '').trim()
    if (cancellationRequested && (draft.linkedSystemIds ?? []).length > 0) {
      const linkedSystems = (draft.linkedSystemIds ?? [])
        .map((systemId) => [...state.systems, ...state.productionSystemInventory, ...state.reusedInternalSystems].find((system) => system.id === systemId || systemBusinessId(system) === systemId))
        .filter((system): system is NonNullable<typeof system> => Boolean(system))
      const linkedSystemIds = linkedSystems.length > 0
        ? linkedSystems.map((system) => systemBusinessId(system))
        : draft.linkedSystemIds ?? []
      return {
        ok: false,
        message: linkedSystemIds.length === 1
          ? `Infrastructure Item is currently linked to system ${linkedSystemIds[0]}. Unlink the Infrastructure Item from the system before cancelling it.`
          : `Infrastructure Item is currently linked to systems: ${linkedSystemIds.join('; ')}. Unlink the Infrastructure Item from all systems before cancelling it.`,
      }
    }
    const latestDeletionEntry = latestInfrastructureDeletionEntry(existing)
    const nextDeletionReason = draft.deletionReason ?? existing.deletionReason ?? ''
    const deletionHistory =
      existing.operationalStatus === INFRASTRUCTURE_DELETED_OPERATIONAL_STATUS &&
      !richTextIsEmpty(nextDeletionReason) &&
      nextDeletionReason.trim() !== latestDeletionEntry?.reason
        ? latestDeletionEntry
          ? infrastructureDeletionHistory(existing).map((entry) =>
              entry.id === latestDeletionEntry.id
                ? { ...entry, reason: nextDeletionReason.trim(), timestamp: now }
                : entry,
            )
          : [{
              id: `infrastructure-deletion-${crypto.randomUUID()}`,
              reason: nextDeletionReason.trim(),
              timestamp: now,
              deletedBy: CURRENT_USER_DISPLAY_NAME,
            }]
        : infrastructureDeletionHistory(existing)
    const cancellationHistory = cancellationRequested && existing.operationalStatus !== INFRASTRUCTURE_CANCELLED_OPERATIONAL_STATUS
      ? [
          ...(existing.cancellationHistory ?? []),
          {
            id: `infrastructure-cancellation-${crypto.randomUUID()}`,
            reason: cancellationReason,
            timestamp: now,
            deletedBy: CURRENT_USER_DISPLAY_NAME,
          },
        ]
      : existing.cancellationHistory ?? draft.cancellationHistory ?? []
    let record: InfrastructureItem = normalizeInfrastructureItem({
      ...draft,
      id: existing.id,
      infrastructureId: existing.infrastructureId,
      identifier: draft.identifier.trim(),
      normalizedIdentifier: normalizeInfrastructureIdentifier(draft.identifier),
      lastUpdatedDate: now,
      linkedSystemIds: Array.from(new Set(draft.linkedSystemIds ?? [])),
      maintenanceTasks: normalizeInfrastructureMaintenanceTasks(draft.maintenanceTasks ?? [], now, infrastructureMaintenanceTaskIds(state.infrastructureItems, existing.id)),
      warranties: normalizeInfrastructureWarrantyCollection(draft.warranties ?? [], infrastructureWarrantyIds(state.infrastructureItems, existing.id)),
      operationalStatus: cancellationRequested ? INFRASTRUCTURE_CANCELLED_OPERATIONAL_STATUS : draft.operationalStatus,
      deletionReason: nextDeletionReason.trim(),
      deletionHistory,
      deletionPreviousOperationalStatus: existing.deletionPreviousOperationalStatus ?? draft.deletionPreviousOperationalStatus ?? null,
      cancellationRequested: 'NO',
      cancellationReason,
      cancellationHistory,
      cancellationPreviousOperationalStatus: cancellationRequested
        ? existing.operationalStatus
        : existing.cancellationPreviousOperationalStatus ?? draft.cancellationPreviousOperationalStatus ?? null,
      createdAt: existing.createdAt,
      updatedAt: now,
    }, infrastructureMaintenanceTaskIds(state.infrastructureItems, existing.id), infrastructureWarrantyIds(state.infrastructureItems, existing.id))
    let idCounters = state.idCounters
    const documents = reconcileGlobalChildRecords<DocumentRecord>(state, idCounters, 'document', existing.documents ?? [], record.documents ?? [])
    idCounters = documents.counters
    const remarks = reconcileGlobalChildRecords<RemarkRecord>(state, idCounters, 'remark', existing.remarks ?? [], record.remarks ?? [])
    idCounters = remarks.counters
    record = { ...record, documents: documents.records, remarks: remarks.records }
    const messages = validateInfrastructureItemDraft(record, state.infrastructureItems, state.referenceData)
    if (messages.length > 0) return { ok: false, message: messages.join(' ') }
    set((current) => {
      const fieldActivityEvents = appendFieldChangeActivityEvents(current.activityEvents, now, {
        previous: existing as unknown as Record<string, unknown>,
        next: record as unknown as Record<string, unknown>,
        category: 'INFRASTRUCTURE',
        eventTypePrefix: 'infrastructureItem',
        objectLabel: `Infrastructure Item ${record.infrastructureId}`,
        primaryObject: infrastructureRef(record),
        excludeFields: ['maintenanceTasks', 'deletionHistory'],
      })
      return {
        idCounters,
        infrastructureItems: current.infrastructureItems.map((item) => item.id === id ? record : item),
        activityEvents: appendInfrastructureMaintenanceActivityEvents(fieldActivityEvents, now, existing, record),
      }
    })
    get().saveToStorage()
    return { ok: true, message: `Infrastructure Item ${record.infrastructureId} saved.`, record }
  },

  linkInfrastructureItemToSystem: (itemId, systemId) => {
    const state = get()
    const item = state.infrastructureItems.find((candidate) => candidate.id === itemId)
    const system = [...state.systems, ...state.productionSystemInventory, ...state.reusedInternalSystems].find((candidate) => candidate.id === systemId)
    if (!item) return { ok: false, message: 'Infrastructure Item not found.' }
    if (!system) return { ok: false, message: 'System not found.' }
    if (item.linkedSystemIds.includes(systemId)) return { ok: false, message: 'Infrastructure Item is already linked to this SID.' }
    const now = new Date().toISOString()
    const record: InfrastructureItem = { ...item, linkedSystemIds: [...item.linkedSystemIds, systemId], updatedAt: now }
    set((current) => ({
      infrastructureItems: current.infrastructureItems.map((candidate) => candidate.id === itemId ? record : candidate),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'INFRASTRUCTURE',
        eventType: 'infrastructureItem.systemLinked',
        severity: 'SUCCESS',
        summary: `Infrastructure Item ${record.infrastructureId} linked to System ${systemBusinessId(system)}.`,
        primaryObject: infrastructureRef(record),
        relatedObjects: relatedRefs(systemRef(system)),
        after: { linkedSystemIds: record.linkedSystemIds },
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `Linked Infrastructure Item ${record.infrastructureId} to ${systemBusinessId(system)}.` }
  },

  unlinkInfrastructureItemFromSystem: (itemId, systemId) => {
    const state = get()
    const item = state.infrastructureItems.find((candidate) => candidate.id === itemId)
    const system = [...state.systems, ...state.productionSystemInventory, ...state.reusedInternalSystems].find((candidate) => candidate.id === systemId)
    if (!item) return { ok: false, message: 'Infrastructure Item not found.' }
    if (!item.linkedSystemIds.includes(systemId)) return { ok: false, message: 'Infrastructure Item is not linked to this System.' }
    const now = new Date().toISOString()
    const record: InfrastructureItem = { ...item, linkedSystemIds: item.linkedSystemIds.filter((id) => id !== systemId), updatedAt: now }
    set((current) => ({
      infrastructureItems: current.infrastructureItems.map((candidate) => candidate.id === itemId ? record : candidate),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'INFRASTRUCTURE',
        eventType: 'infrastructureItem.systemUnlinked',
        severity: 'WARNING',
        summary: `Infrastructure Item ${record.infrastructureId} unlinked from System ${system ? systemBusinessId(system) : systemId}.`,
        primaryObject: infrastructureRef(record),
        relatedObjects: relatedRefs(system ? systemRef(system) : null),
        before: { linkedSystemIds: item.linkedSystemIds },
        after: { linkedSystemIds: record.linkedSystemIds },
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: `Removed System link from Infrastructure Item ${record.infrastructureId}.` }
  },

  saveVersionUpdate: (systemCollection, systemId, draft) => {
    const state = get()
    const system =
      systemCollection === 'production'
        ? state.productionSystemInventory.find((candidate) => candidate.id === systemId)
        : systemCollection === 'reused'
          ? state.reusedInternalSystems.find((candidate) => candidate.id === systemId)
          : state.systems.find((candidate) => candidate.id === systemId)
    if (!system) return { ok: false, message: 'System not found.' }
    const existingRecord = draft.id ? state.versionUpdates.find((record) => record.id === draft.id) : undefined
    if (draft.id && !existingRecord) return { ok: false, message: 'Version Update record not found.' }
    const validationMessages = validateVersionUpdateDraft({
      versionNumberRefId: draft.versionNumberRefId,
      buildNumberRefId: draft.buildNumberRefId,
      newVersionNumberLabel: draft.newVersionNumberLabel,
      newBuildNumberLabel: draft.newBuildNumberLabel,
      attachmentCategories: draft.attachments.map((attachment) => attachment.category),
      referenceData: state.referenceData,
      versionUpgradeRecords: state.versionUpgradeRecords,
      existingVersionUpdateId: existingRecord?.id,
    })
    if (validationMessages.length > 0) return { ok: false, message: validationMessages.join(' ') }

    const now = new Date().toISOString()
    const correlationId = `corr-${crypto.randomUUID()}`
    const isCurrentEdit = Boolean(existingRecord && system.currentVersionUpdateId === existingRecord.id)
    const isNew = !existingRecord
    let nextIdCounters = state.idCounters
    let nextReferenceData = state.referenceData
    let versionNumberRefId = draft.versionNumberRefId
    let buildNumberRefId = draft.buildNumberRefId
    let createdVersionReference: ReferenceDataRecord | undefined
    let createdBuildReference: ReferenceDataRecord | undefined

    if (draft.newVersionNumberLabel?.trim()) {
      const nextVersionReferenceId = generateBusinessIdFromCounter('versionNumber', nextIdCounters, nextReferenceData.map((record) => record.id))
      nextIdCounters = nextVersionReferenceId.counters
      createdVersionReference = {
        id: nextVersionReferenceId.id,
        referenceType: 'VERSION_NUMBER',
        versionNumberId: null,
        label: referenceDataLabel(draft.newVersionNumberLabel),
        normalizedLabel: normalizeReferenceLabel(draft.newVersionNumberLabel),
        active: true,
        createdAt: now,
        createdBy: CURRENT_USER_DISPLAY_NAME,
        updatedAt: now,
        updatedBy: CURRENT_USER_DISPLAY_NAME,
      }
      nextReferenceData = [...nextReferenceData, createdVersionReference]
      versionNumberRefId = createdVersionReference.id
    }

    if (draft.newBuildNumberLabel?.trim()) {
      const nextBuildReferenceId = generateBusinessIdFromCounter('buildNumber', nextIdCounters, nextReferenceData.map((record) => record.id))
      nextIdCounters = nextBuildReferenceId.counters
      createdBuildReference = {
        id: nextBuildReferenceId.id,
        referenceType: 'BUILD_NUMBER',
        versionNumberId: versionNumberRefId,
        label: referenceDataLabel(draft.newBuildNumberLabel),
        normalizedLabel: normalizeReferenceLabel(draft.newBuildNumberLabel),
        active: true,
        createdAt: now,
        createdBy: CURRENT_USER_DISPLAY_NAME,
        updatedAt: now,
        updatedBy: CURRENT_USER_DISPLAY_NAME,
      }
      nextReferenceData = [...nextReferenceData, createdBuildReference]
      buildNumberRefId = createdBuildReference.id
    }
    const selectedVersionReference = nextReferenceData.find((record) => record.id === versionNumberRefId)

    const nextVersionUpdateIdentity = isNew
      ? generateBusinessIdFromCounter('versionUpdate', nextIdCounters, state.versionUpdates.map((record) => record.id))
      : { counters: nextIdCounters, id: existingRecord.id }
    nextIdCounters = nextVersionUpdateIdentity.counters
    const usedAttachmentIds = state.versionUpdates.flatMap((record) => record.attachments.map((attachment) => attachment.id))
    const committedAttachments: VersionUpdateAttachmentRecord[] = draft.attachments.map((attachment) => {
      const nextAttachmentIdentity = generateBusinessIdFromCounter('versionUpdateAttachment', nextIdCounters, usedAttachmentIds)
      nextIdCounters = nextAttachmentIdentity.counters
      usedAttachmentIds.push(nextAttachmentIdentity.id)
      return commitVersionUpdateAttachment(attachment, nextAttachmentIdentity.id, nextVersionUpdateIdentity.id, now)
    })
    const committedSequence = existingRecord?.committedSequence ?? Math.max(0, ...state.versionUpdates.map((record) => record.committedSequence ?? 0)) + 1
    const record: VersionUpdateRecord = {
      id: nextVersionUpdateIdentity.id,
      systemId,
      systemCollection,
      committedAt: existingRecord?.committedAt ?? now,
      committedSequence,
      userName: existingRecord?.userName ?? CURRENT_USER_DISPLAY_NAME,
      midSnapshot: existingRecord?.midSnapshot ?? ('machineId' in system ? system.machineId ?? '' : ''),
      sidSnapshot: existingRecord?.sidSnapshot ?? ('sid' in system ? system.sid ?? '' : ''),
      versionNumberRefId,
      buildNumberRefId,
      attachments: committedAttachments,
      emailSentAt: existingRecord?.emailSentAt ?? null,
      remarks: draft.remarks,
      createdAt: existingRecord?.createdAt ?? now,
      createdBy: existingRecord?.createdBy ?? CURRENT_USER_DISPLAY_NAME,
      updatedAt: now,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    }
    const shouldUpdateCurrent = isNew || isCurrentEdit

    set((current) => {
      let versionUpdates = existingRecord
        ? current.versionUpdates.map((candidate) => candidate.id === existingRecord.id ? record : candidate)
        : [...current.versionUpdates, record]
      const currentPatch = shouldUpdateCurrent
        ? {
            currentVersionUpdateId: record.id,
            currentVersionNumberRefId: record.versionNumberRefId,
            currentBuildNumberRefId: record.buildNumberRefId,
            updatedAt: now,
          }
        : {}
      let syncedReusedSystemId = ''
      let syncedReusedPatch: typeof currentPatch = {}
      let syncedAllocatedSystemId = ''
      let syncedAllocatedPatch: typeof currentPatch = {}
      if (shouldUpdateCurrent && systemCollection === 'allocated' && 'machineId' in system && system.source === SYSTEM_SOURCE_REUSED_INTERNAL) {
        const hasActiveSidAllocation = activeProjectSystemLinks(current.projectSystems).some((link) => link.systemId === system.id)
        const targetMid = hasActiveSidAllocation
          ? current.reusedInternalSystems.find((candidate) => reusedInternalMachineIdsEqual(candidate.machineId, system.machineId))
          : undefined
        if (targetMid) {
          const synced = cloneSingleVersionUpdateRecordForSystem({
            sourceRecord: record,
            targetSystem: targetMid,
            targetCollection: 'reused',
            versionUpdates,
            idCounters: nextIdCounters,
            timestamp: now,
          })
          nextIdCounters = synced.idCounters
          versionUpdates = [...versionUpdates, synced.record]
          syncedReusedSystemId = targetMid.id
          syncedReusedPatch = {
            currentVersionUpdateId: synced.record.id,
            currentVersionNumberRefId: synced.record.versionNumberRefId,
            currentBuildNumberRefId: synced.record.buildNumberRefId,
            updatedAt: now,
          }
        }
      }
      if (shouldUpdateCurrent && systemCollection === 'reused' && 'machineId' in system) {
        const activeSidIds = new Set(
          activeProjectSystemLinks(current.projectSystems)
            .filter((link) => reusedInternalMachineIdsEqual(link.sourceMachineId, system.machineId))
            .map((link) => link.systemId),
        )
        const targetSid = current.systems.find((candidate) =>
          activeSidIds.has(candidate.id) &&
          candidate.source === SYSTEM_SOURCE_REUSED_INTERNAL &&
          reusedInternalMachineIdsEqual(candidate.machineId, system.machineId),
        )
        if (targetSid) {
          const synced = cloneSingleVersionUpdateRecordForSystem({
            sourceRecord: record,
            targetSystem: targetSid,
            targetCollection: 'allocated',
            versionUpdates,
            idCounters: nextIdCounters,
            timestamp: now,
          })
          nextIdCounters = synced.idCounters
          versionUpdates = [...versionUpdates, synced.record]
          syncedAllocatedSystemId = targetSid.id
          syncedAllocatedPatch = {
            currentVersionUpdateId: synced.record.id,
            currentVersionNumberRefId: synced.record.versionNumberRefId,
            currentBuildNumberRefId: synced.record.buildNumberRefId,
            updatedAt: now,
          }
        }
      }
      let activityBase = current.activityEvents
      if (createdVersionReference) {
        activityBase = appendActivityEvent(activityBase, now, {
          category: 'CONFIGURATION',
          eventType: 'versionNumber.created',
          severity: 'SUCCESS',
          summary: `Version Number ${createdVersionReference.label} created.`,
          primaryObject: referenceDataRef(createdVersionReference),
          correlationId,
        })
      }
      if (createdBuildReference) {
        activityBase = appendActivityEvent(activityBase, now, {
          category: 'CONFIGURATION',
          eventType: 'buildNumber.created',
          severity: 'SUCCESS',
          summary: `Build Number ${createdBuildReference.label} created under Version Number ${selectedVersionReference?.label ?? versionNumberRefId}.`,
          primaryObject: referenceDataRef(createdBuildReference),
          relatedObjects: relatedRefs(selectedVersionReference ? referenceDataRef(selectedVersionReference) : null),
          after: { versionNumberId: versionNumberRefId },
          correlationId,
        })
        activityBase = appendActivityEvent(activityBase, now, {
          category: 'CONFIGURATION',
          eventType: 'buildNumber.linkedToVersionNumber',
          severity: 'SUCCESS',
          summary: `Build Number ${createdBuildReference.label} linked to Version Number ${selectedVersionReference?.label ?? versionNumberRefId}.`,
          primaryObject: referenceDataRef(createdBuildReference),
          relatedObjects: relatedRefs(selectedVersionReference ? referenceDataRef(selectedVersionReference) : null),
          after: { versionNumberId: versionNumberRefId },
          correlationId,
        })
      }
      activityBase = appendActivityEvent(activityBase, now, {
        category: 'CONFIGURATION',
        eventType: isNew ? 'systemVersionUpdate.created' : 'systemVersionUpdate.edited',
        severity: 'SUCCESS',
        summary: `Version Update ${record.id} ${isNew ? 'created' : 'edited'} for System ${systemBusinessId(system)}.`,
        primaryObject: versionUpdateRef(record),
        relatedObjects: relatedRefs(systemRef(system)),
        before: existingRecord ? {
          versionNumberRefId: existingRecord.versionNumberRefId,
          buildNumberRefId: existingRecord.buildNumberRefId,
          remarks: existingRecord.remarks,
        } : undefined,
        after: {
          versionNumberRefId: record.versionNumberRefId,
          buildNumberRefId: record.buildNumberRefId,
          remarks: record.remarks,
        },
        correlationId,
      })
      const activityEvents = shouldUpdateCurrent
        ? appendActivityEvent(activityBase, now, {
            category: 'SYSTEM',
            eventType: 'system.currentVersionChanged',
            severity: 'SUCCESS',
            summary: `System ${systemBusinessId(system)} current Version and Build updated from Version Update ${record.id}.`,
            primaryObject: systemRef(system),
            relatedObjects: relatedRefs(versionUpdateRef(record)),
            before: {
              currentVersionUpdateId: system.currentVersionUpdateId ?? null,
              currentVersionNumberRefId: system.currentVersionNumberRefId ?? null,
              currentBuildNumberRefId: system.currentBuildNumberRefId ?? null,
            },
            after: {
              currentVersionUpdateId: record.id,
              currentVersionNumberRefId: record.versionNumberRefId,
              currentBuildNumberRefId: record.buildNumberRefId,
            },
            correlationId,
          })
        : activityBase
      return {
        idCounters: nextIdCounters,
        versionUpdates,
        referenceData: nextReferenceData,
        productionSystemInventory: systemCollection === 'production'
          ? current.productionSystemInventory.map((candidate) => candidate.id === systemId ? { ...candidate, ...currentPatch } : candidate)
          : current.productionSystemInventory,
        reusedInternalSystems: systemCollection === 'reused'
          ? current.reusedInternalSystems.map((candidate) => candidate.id === systemId ? { ...candidate, ...currentPatch } : candidate)
          : syncedReusedSystemId
            ? current.reusedInternalSystems.map((candidate) => candidate.id === syncedReusedSystemId ? { ...candidate, ...syncedReusedPatch } : candidate)
            : current.reusedInternalSystems,
        systems: systemCollection === 'allocated'
          ? current.systems.map((candidate) => candidate.id === systemId ? { ...candidate, ...currentPatch } : candidate)
          : syncedAllocatedSystemId
            ? current.systems.map((candidate) => candidate.id === syncedAllocatedSystemId ? { ...candidate, ...syncedAllocatedPatch } : candidate)
            : current.systems,
        activityEvents,
      }
    })
    get().saveToStorage()
    return { ok: true, message: 'Version Update saved.', record }
  },

  deleteVersionUpdate: (id, reason = '') => {
    const state = get()
    const record = state.versionUpdates.find((candidate) => candidate.id === id)
    if (!record) return { ok: false, message: 'Version Update record not found.' }
    const system =
      record.systemCollection === 'production'
        ? state.productionSystemInventory.find((candidate) => candidate.id === record.systemId)
        : record.systemCollection === 'reused'
          ? state.reusedInternalSystems.find((candidate) => candidate.id === record.systemId)
          : state.systems.find((candidate) => candidate.id === record.systemId)
    if (system?.currentVersionUpdateId === record.id) {
      const now = new Date().toISOString()
      set((current) => ({
        activityEvents: appendActivityEvent(current.activityEvents, now, {
          category: 'CONFIGURATION',
          eventType: 'systemVersionUpdate.deleteBlocked',
          severity: 'WARNING',
          summary: `Delete blocked for current Version Update ${record.id}.`,
          primaryObject: versionUpdateRef(record),
          relatedObjects: relatedRefs(system ? systemRef(system) : null),
        }),
      }))
      get().saveToStorage()
      return { ok: false, message: 'The current authoritative Version Update cannot be deleted. Add a newer Version Update before deleting this historical record.' }
    }
    const now = new Date().toISOString()
    const deletedRecord = {
      ...record,
      deletedAt: now,
      deletedBy: CURRENT_USER_DISPLAY_NAME,
      deletionReason: reason.trim(),
      updatedAt: now,
      updatedBy: CURRENT_USER_DISPLAY_NAME,
    }
    set((current) => ({
      versionUpdates: current.versionUpdates.map((candidate) => candidate.id === id ? deletedRecord : candidate),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'CONFIGURATION',
        eventType: 'systemVersionUpdate.deleted',
        severity: 'WARNING',
        summary: `Historical Version Update ${record.id} logically deleted.`,
        primaryObject: versionUpdateRef(record),
        relatedObjects: relatedRefs(system ? systemRef(system) : null),
        before: { deletedAt: record.deletedAt ?? null },
        after: { deletedAt: now, deletionReason: deletedRecord.deletionReason || null },
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Historical Version Update deleted.' }
  },

  updateTenant: (id, patch, options) => {
    const now = new Date().toISOString()
    let committedTenant: AppDataState['tenants'][number] | undefined
    set((state) => {
      let idCounters = state.idCounters
      let previousTenant: AppDataState['tenants'][number] | undefined
      let nextTenant: AppDataState['tenants'][number] | undefined
      const tenants = state.tenants.map((tenant) => {
        if (tenant.id !== id) return tenant
        previousTenant = tenant
        const nextPatch = { ...patch }
        if ('documents' in nextPatch) {
          const reconciled = reconcileGlobalChildRecords<DocumentRecord>(state, idCounters, 'document', tenant.documents ?? [], nextPatch.documents ?? [])
          idCounters = reconciled.counters
          nextPatch.documents = reconciled.records
        }
        if ('remarks' in nextPatch) {
          const reconciled = reconcileGlobalChildRecords<RemarkRecord>(state, idCounters, 'remark', tenant.remarks ?? [], nextPatch.remarks ?? [])
          idCounters = reconciled.counters
          nextPatch.remarks = reconciled.records
        }
        if ('configurationHistory' in nextPatch) {
          const reconciled = reconcileGlobalChildRecords<TenantConfigurationHistoryRecord>(state, idCounters, 'configurationHistory', tenant.configurationHistory ?? [], nextPatch.configurationHistory ?? [])
          idCounters = reconciled.counters
          nextPatch.configurationHistory = reconciled.records
        }
        nextTenant = tenantWithDerivedProjectTimeGroup(state, {
          ...tenant,
          ...nextPatch,
          // Tenant Type is immutable after creation, including for direct store callers.
          tenantType: tenant.tenantType,
          tenantFormType: tenantFormType(tenant),
          updatedAt: options?.preserveNewState ? tenant.createdAt : now,
        })
        committedTenant = nextTenant
        return nextTenant
      })
      return {
        idCounters,
        tenants,
        activityEvents: previousTenant && nextTenant
          ? appendFieldChangeActivityEvents(state.activityEvents, now, {
              previous: previousTenant as unknown as Record<string, unknown>,
              next: nextTenant as unknown as Record<string, unknown>,
              category: 'TENANT',
              eventTypePrefix: 'tenant',
              objectLabel: `Tenant ${nextTenant.tid}`,
              primaryObject: tenantRef(nextTenant),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
    return committedTenant
  },

  saveTenantConfiguration: (id, draft, activeSystemId, options) => {
    const now = new Date().toISOString()
    const previousState = get()
    let savedConfigurationTenant: AppDataState['tenants'][number] | undefined
    try {
      set((state) => {
      const savedTenant = state.tenants.find((tenant) => tenant.id === id)
      if (!savedTenant) return state

      const affectedSystemIds = Array.from(new Set([
        savedTenant.hostedSystemId ?? savedTenant.systemId,
        draft.hostedSystemId ?? draft.systemId,
        activeSystemId,
      ].filter((value): value is string => Boolean(value))))
      const systemSummariesBefore = new Map(
        [
          ...affectedSystemIds
            .map((systemId) => state.systems.find((system) => system.id === systemId))
            .filter((system): system is AppDataState['systems'][number] => Boolean(system))
            .map((system) => [system.id, systemApplicationConfigurationSummary(system, state.tenants)] as const),
          ...affectedSystemIds
            .map((systemId) => state.reusedInternalSystems.find((system) => system.id === systemId))
            .filter((system): system is AppDataState['reusedInternalSystems'][number] => Boolean(system))
            .map((system) => [system.id, systemApplicationConfigurationSummary(system, state.tenants, state.systems, state.projectSystems)] as const),
        ],
      )
      const activeSystem = state.systems.find((system) => system.id === activeSystemId)
        ?? state.systems.find((system) => system.id === (draft.hostedSystemId ?? draft.systemId))
      let idCounters = state.idCounters
      const { patch } = tenantConfigurationSaveDraft(draft, savedTenant, activeSystem, now)
      let tenantPatch = patch
      if ('configurationHistory' in tenantPatch) {
        const reconciled = reconcileGlobalChildRecords<TenantConfigurationHistoryRecord>(
          state,
          idCounters,
          'configurationHistory',
          savedTenant.configurationHistory ?? [],
          tenantPatch.configurationHistory ?? [],
        )
        idCounters = reconciled.counters
        tenantPatch = { ...tenantPatch, configurationHistory: reconciled.records }
      }
      const tenants = state.tenants.map((tenant) =>
        tenant.id === id ? tenantWithDerivedProjectTimeGroup(state, {
          ...tenant,
          ...tenantPatch,
          tenantType: savedTenant.tenantType,
          tenantFormType: tenantFormType(savedTenant),
          updatedAt: options?.preserveNewState ? tenant.createdAt : now,
        }) : tenant,
      )
      const committedTenant = tenants.find((tenant) => tenant.id === id) ?? savedTenant
      savedConfigurationTenant = committedTenant
      const relationshipState = ensureTenantCommittedProjectRelationships(
        { ...state, tenants },
        committedTenant,
        activeSystem?.id,
        now,
      )
      const systems = relationshipState.systems.map((system) => {
        if (!affectedSystemIds.includes(system.id)) return system
        const beforeSummary = systemSummariesBefore.get(system.id)
        const afterSummary = systemApplicationConfigurationSummary(system, tenants)
        if (!beforeSummary || valuesEqual(beforeSummary, afterSummary)) return system

        const existingHistory = system.configurationHistory ?? []
        const record = createSystemConfigurationHistoryRecord(
          afterSummary,
          existingHistory,
          now,
          CURRENT_USER_DISPLAY_NAME,
          savedTenant.tid,
          configurationHistoryAttributionForSystem({ ...state, projectSystems: relationshipState.projectSystems }, system),
        )
        if (!record) return system
        const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(
          { ...state, tenants, idCounters },
          idCounters,
          'configurationHistory',
          existingHistory,
          [record, ...existingHistory],
        )
        idCounters = reconciled.counters

        return {
          ...system,
          configurationHistory: reconciled.records,
          updatedAt: now,
        }
      })
      const reusedInternalSystems = state.reusedInternalSystems.map((system) => {
        if (!affectedSystemIds.includes(system.id)) return system
        const beforeSummary = systemSummariesBefore.get(system.id)
        const afterSummary = systemApplicationConfigurationSummary(system, tenants, relationshipState.systems, relationshipState.projectSystems)
        if (!beforeSummary || valuesEqual(beforeSummary, afterSummary)) return system

        const existingHistory = system.configurationHistory ?? []
        const record = createSystemConfigurationHistoryRecord(
          afterSummary,
          existingHistory,
          now,
          CURRENT_USER_DISPLAY_NAME,
          savedTenant.tid,
        )
        if (!record) return system
        const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(
          { ...state, tenants, systems: relationshipState.systems, idCounters },
          idCounters,
          'configurationHistory',
          existingHistory,
          [record, ...existingHistory],
        )
        idCounters = reconciled.counters

        return {
          ...system,
          configurationHistory: reconciled.records,
          updatedAt: now,
        }
      })

      return {
        idCounters,
        tenants,
        systems,
        reusedInternalSystems,
        projectSystems: relationshipState.projectSystems,
        projectTenants: relationshipState.projectTenants,
        activityEvents: appendFieldChangeActivityEvents(relationshipState.activityEvents, now, {
          previous: savedTenant as unknown as Record<string, unknown>,
          next: committedTenant as unknown as Record<string, unknown>,
          category: 'TENANT',
          eventTypePrefix: 'tenant',
          objectLabel: `Tenant ${committedTenant.tid}`,
          primaryObject: tenantRef(committedTenant),
          relatedObjects: relatedRefs(activeSystem ? systemRef(activeSystem) : null),
        }),
      }
      })
      get().saveToStorage()
    } catch (error) {
      set(previousState)
      throw error
    }
    return savedConfigurationTenant
  },

  deleteTenantFromSystem: (id) => {
    const now = new Date().toISOString()
    set((state) => removeTenantsFromSystemTransaction(state, [id], now))
    get().saveToStorage()
  },

  cancelTenant: (id) => {
    const tenant = get().tenants.find((candidate) => candidate.id === id)
    if (!tenant) return { ok: false, message: 'Tenant not found.' }
    const now = new Date().toISOString()
    set((state) => cancelTenantInState(state, id, now))
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} cancelled and retained historically.` }
  },

  attachTenantToProjectRequirement: (tenantId, projectId, requirementId) => {
    const state = get()
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    const project = state.projects.find((candidate) => candidate.id === projectId)
    if (!tenant) return { ok: false, message: 'Tenant not found.' }
    if (!project) return { ok: false, message: 'Project not found.' }
    if (tenant.tenantType !== 'CUSTOMER' && tenant.tenantType !== 'POC') return { ok: false, message: 'Only Customer and POC Tenants can replace Requirement ID.' }
    if (isTenantLifecycleInactive(tenant)) return { ok: false, message: `Tenant ${tenant.tid} must be restored before replacing Requirement ID.` }
    const systemId = tenant.hostedSystemId || tenant.systemId
    if (!systemId) return { ok: false, message: `Tenant ${tenant.tid} has no hosting System.` }
    const systemAllocation = activeProjectSystemLinks(state.projectSystems).find((link) => link.projectId === projectId && link.systemId === systemId)
    if (!systemAllocation) return { ok: false, message: `System must be allocated to Project ${project.pid} before this Tenant can be attached.` }
    const opportunity = state.opportunities.find((candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId)
    const requirement = opportunity?.newTenantRequirements.find((candidate) => candidate.requirementId === requirementId || candidate.id === requirementId)
    if (!requirement) return { ok: false, message: 'Requirement not found for this Project.' }
    const now = new Date().toISOString()
    set((current) => {
      const existingProjectTenantLink = activeProjectTenantLinks(current.projectTenants).find((link) => link.projectId === projectId && link.tenantId === tenantId)
      const projectTenant = existingProjectTenantLink
        ? null
        : createProjectTenantLink(projectId, tenantId, systemId, systemAllocation.allocationType ?? 'EXISTING_SYSTEM', now)
      return {
        tenants: current.tenants.map((candidate) =>
          candidate.id === tenantId
            ? tenantWithDerivedProjectTimeGroup(current, {
              ...candidate,
              deliveryPid: project.pid,
              sourceRequirementId: requirement.requirementId,
              releasedRequirementId: candidate.releasedRequirementId ?? null,
              requirementHistory: [
                ...(candidate.requirementHistory ?? []).map((relationship) => {
                  if (relationship.projectId === project.id && relationship.requirementId === requirement.requirementId) {
                    return { ...relationship, status: 'CURRENT' as const, endedAt: null }
                  }
                  if (relationship.status === 'CURRENT') {
                    return { ...relationship, status: 'HISTORICAL' as const, endedAt: now }
                  }
                  return relationship
                }),
                ...(candidate.requirementHistory ?? []).some((relationship) => relationship.projectId === project.id && relationship.requirementId === requirement.requirementId)
                  ? []
                  : [{
                      id: `tenant-req-${crypto.randomUUID()}`,
                      pid: project.pid,
                      projectId: project.id,
                      requirementId: requirement.requirementId,
                      relationshipType: 'A' as const,
                      status: 'CURRENT' as const,
                      startedAt: now,
                      endedAt: null,
                    }],
              ],
              updatedAt: now,
            })
            : candidate,
        ),
        projectSystems: current.projectSystems.map((link) =>
          link.id === systemAllocation.id
            ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenantId])) }
            : { ...link, tenantIds: (link.tenantIds ?? []).filter((id) => id !== tenantId) },
        ),
        projectTenants: [
          ...(projectTenant ? [projectTenant] : []),
          ...current.projectTenants.map((link) => {
            if (link.tenantId !== tenantId || link.allocationStatus === 'DEALLOCATED') return link
            if (link.projectId === projectId) {
              return {
                ...link,
                systemId,
                allocationType: systemAllocation.allocationType ?? link.allocationType ?? 'EXISTING_SYSTEM',
                deallocatedAt: null,
              }
            }
            return deallocateProjectTenantLink(link, now)
          }),
        ],
        activityEvents: appendActivityEvent(current.activityEvents, now, {
          category: 'TENANT',
          eventType: 'tenant.requirementReplaced',
          severity: 'SUCCESS',
          summary: `Tenant ${tenant.tid} Requirement ID replaced with ${requirement.requirementId} for project ${project.pid}.`,
          primaryObject: tenantRef(tenant),
          relatedObjects: relatedRefs(projectRef(project), requirementRef(requirement.requirementId)),
        }),
      }
    })
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} Requirement ID replaced with ${requirement.requirementId}.` }
  },

  rollbackSystemFormTenantCreation: (tenantId) => {
    const state = get()
    const tenant = state.tenants.find((candidate) => candidate.id === tenantId)
    if (!tenant) return
    const systemIds = [tenant.systemId, tenant.hostedSystemId].filter(Boolean)
    const system = state.systems.find((candidate) => systemIds.includes(candidate.id))
    const now = new Date().toISOString()
    set((current) => ({
      tenants: current.tenants.filter((candidate) => candidate.id !== tenantId),
      systems: current.systems.map((system) =>
        systemIds.includes(system.id)
          ? {
              ...system,
              tenantIds: (system.tenantIds ?? []).filter((id) => id !== tenantId),
            }
          : system,
      ),
      projectSystems: current.projectSystems.map((link) =>
        systemIds.includes(link.systemId)
          ? {
              ...link,
              tenantIds: (link.tenantIds ?? []).filter((id) => id !== tenantId),
            }
          : link,
      ),
      projectTenants: current.projectTenants.filter((link) => link.tenantId !== tenantId),
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'TENANT',
        eventType: 'tenant.creationRolledBack',
        severity: 'WARNING',
        summary: `Tenant ${tenant.tid} creation was rolled back before System form commit.`,
        primaryObject: tenantRef(tenant),
        relatedObjects: relatedRefs(system ? systemRef(system) : null),
        before: { tenantId: tenant.id, tid: tenant.tid, hostedSystemId: tenant.hostedSystemId || tenant.systemId },
        after: { rolledBack: true },
      }),
    }))
    get().saveToStorage()
  },

  moveTenantToSystem: (id, destinationSystemId) => {
    void id
    void destinationSystemId
    return { ok: false, message: 'Tenant Move is no longer supported. Create a new Tenant on the destination System and retain the old Tenant as history.' }
  },

  createTenantFromSystemRequirement: (projectId, systemId, requirementId, options) => {
    const state = get()
    const now = new Date().toISOString()
    const resolved = resolveTenantCreationSource({ projectId, systemId, requirementId }, state)
    if (resolved.error) return resolved.error
    const created = tenantCreationDraftFromSource(resolved.source, now)
    const tenant = tenantWithDerivedProjectTimeGroup(state, created.tenant)
    const { projectTenant, idCounters } = created
    const system = state.systems.find((candidate) => candidate.id === systemId)
    const mismatchMessage = system ? tenantSystemTimeGroupMismatchMessage(state, tenant, system) : ''
    if (mismatchMessage && !options?.timeGroupMismatchDecision) {
      return { ok: false, requiresTimeGroupOverride: true, ...timeGroupMismatchResult(state, tenant, system!) }
    }

    set((current) => {
      let activityEvents = appendActivityEvent(current.activityEvents, now, {
        category: 'TENANT',
        eventType: 'tenant.createdFromRequirement',
        severity: 'SUCCESS',
        summary: `Tenant ${tenant.tid} created from requirement ${resolved.source.requirement.requirementId}.`,
        primaryObject: tenantRef(tenant),
        relatedObjects: relatedRefs(
          projectRef(resolved.source.project),
          systemRef(resolved.source.system),
          requirementRef(resolved.source.requirement.requirementId),
          customerRef(resolved.source.account),
        ),
      })
      if (mismatchMessage && options?.timeGroupMismatchDecision && system) {
        activityEvents = appendActivityEvent(activityEvents, now, {
          category: 'TENANT',
          eventType: options.timeGroupMismatchDecision === 'change' ? 'tenant.timeGroupMismatchSystemChanged' : 'tenant.timeGroupMismatchSystemPreserved',
          severity: 'WARNING',
          summary: options.timeGroupMismatchDecision === 'change'
            ? `Tenant ${tenant.tid} was added and replaced System ${systemBusinessId(system)} Time Group governance.`
            : `Tenant ${tenant.tid} was added while System ${systemBusinessId(system)} Time Group was preserved.`,
          primaryObject: tenantRef(tenant),
          relatedObjects: relatedRefs(systemRef(system), projectRef(resolved.source.project)),
          metadata: { warning: mismatchMessage },
        })
      }
      return {
        idCounters,
        tenants: [tenant, ...current.tenants],
        systems: current.systems.map((candidate) =>
          candidate.id === systemId
            ? {
                ...candidate,
                tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), tenant.id])),
                ...systemWithAddedTenantTimeGroupGovernance(candidate, current.tenants, tenant, current.timeGroupLookups, current.countryLookups, current.usStateLookups, options?.timeGroupMismatchDecision),
                updatedAt: now,
              }
            : candidate,
        ),
        projectSystems: current.projectSystems.map((link) =>
          link.projectId === projectId && link.systemId === systemId && link.allocationStatus !== 'DEALLOCATED'
            ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), tenant.id])) }
            : link,
        ),
        projectTenants: [projectTenant, ...current.projectTenants],
        activityEvents,
      }
    })
    get().saveToStorage()
    return { ok: true, message: `Tenant ${tenant.tid} created.`, allocationId: projectTenant.id, tenantId: tenant.id }
  },

  createInternalTenantForSystem: (projectId, systemId, options) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const system = state.systems.find((candidate) => candidate.id === systemId)
    const reusedSystem = system ? undefined : state.reusedInternalSystems.find((candidate) => candidate.id === systemId)
    const hostingRecord = system ?? reusedSystem
    if (!project && !reusedSystem) return { ok: false, message: 'Project not found.' }
    if (!hostingRecord) return { ok: false, message: 'System not found.' }
    const opportunity = project ? state.opportunities.find((candidate) => candidate.id === project.opportunityId || candidate.opportunityId === project.opportunityId) : undefined
    const account = state.accounts.find((candidate) => candidate.id === opportunity?.accountId || candidate.accountName === project?.accountName)
    const tenantCountry = opportunity?.country || account?.country || project?.country || ''
    const tenantState = opportunity?.state || account?.state || project?.state || ('state' in hostingRecord ? hostingRecord.state ?? '' : '')

    const now = new Date().toISOString()
    const nextTenantId = commitBusinessIdFromCounter(
      'tenant',
      state.idCounters,
      '',
      state.tenants.map((tenant) => tenant.tid),
    )
    let idCounters = nextTenantId.counters
    const nextTid = nextTenantId.id
    const tenant: AppDataState['tenants'][number] = {
      id: `ten-${crypto.randomUUID()}`,
      tid: nextTid,
      accountId: 'accountId' in hostingRecord ? hostingRecord.accountId ?? '' : '',
      systemId: hostingRecord.id,
      hostedSystemId: hostingRecord.id,
      hostingSid: 'sid' in hostingRecord ? hostingRecord.sid ?? '' : '',
      deliveryPid: project?.pid ?? '',
      tenantType: 'PENLINK_INTERNAL',
      tenantFormType: 'INTERNAL',
      accountName: 'Internal',
      country: tenantCountry,
      state: tenantState,
      timeGroup: '',
      operationalStatus: 'Active',
      lastManualOperationalStatus: 'Active',
      individualLifecyclePreviousOperationalStatus: null,
      systemForcedPreviousOperationalStatus: null,
      systemForcedBySystemId: null,
      contractStatus: 'UNDER_CONTRACT',
      hostedSystemHistory: [{ systemId: hostingRecord.id, startedAt: now, endedAt: null, reason: 'Created' }],
      productType: hostingRecord.productType,
      hostingType: hostingRecord.hostingType,
      cloudPlatform: hostingRecord.cloudPlatform ?? '',
      mapCenter: hostingRecord.mapCenter ?? '',
      licenses: null,
      users: null,
      concurrentSearches: null,
      dailySearches: null,
      monthlySearches: null,
      concurrentAnalyses: null,
      topicAnalyses: null,
      dailyAnalyses: null,
      monthlyAnalyses: null,
      tangles: null,
      tanglesGo: null,
      webloc: null,
      webeye: null,
      ingest: null,
      blockchain: null,
      crossSystemFeatures: [],
      apiEnabled: '',
      apiDailyQty: null,
      apiMonthlyQty: null,
      aiFeatures: [],
      additionalFeatures: [],
      standardMonitors: null,
      fullMonitors: null,
      topicMonitors: null,
      warrantyStatus: 'NOT_SET',
      warrantyStartDate: null,
      warrantyEndDate: null,
      pocStartDate: null,
      pocEndDate: null,
      createdAt: now,
      updatedAt: now,
    }
    const normalizedTenant = tenantWithDerivedProjectTimeGroup(state, tenant)
    const mismatchMessage = system ? tenantSystemTimeGroupMismatchMessage(state, normalizedTenant, system) : ''
    if (mismatchMessage && !options?.timeGroupMismatchDecision) {
      return { ok: false, requiresTimeGroupOverride: true, ...timeGroupMismatchResult(state, normalizedTenant, system!) }
    }
    const projectTenant = project
      ? createProjectTenantLink(
          project.id,
          normalizedTenant.id,
          hostingRecord.id,
          hostingRecord.source === 'Reused Internal Systems' ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM',
          now,
        )
      : null

    set((current) => {
      let activityEvents = appendActivityEvent(current.activityEvents, now, {
        category: 'TENANT',
        eventType: 'tenant.internalCreatedForProject',
        severity: 'SUCCESS',
        summary: project
          ? `Tenant ${normalizedTenant.tid} created for project ${project.pid}.`
          : `Tenant ${normalizedTenant.tid} created for system ${systemBusinessId(hostingRecord)}.`,
        primaryObject: tenantRef(normalizedTenant),
        relatedObjects: relatedRefs(project ? projectRef(project) : null, systemRef(hostingRecord)),
      })
      if (mismatchMessage && options?.timeGroupMismatchDecision) {
        activityEvents = appendActivityEvent(activityEvents, now, {
          category: 'TENANT',
          eventType: options.timeGroupMismatchDecision === 'change' ? 'tenant.timeGroupMismatchSystemChanged' : 'tenant.timeGroupMismatchSystemPreserved',
          severity: 'WARNING',
          summary: options.timeGroupMismatchDecision === 'change'
              ? `Tenant ${normalizedTenant.tid} was added and replaced System ${systemBusinessId(hostingRecord)} Time Group governance.`
              : `Tenant ${normalizedTenant.tid} was added while System ${systemBusinessId(hostingRecord)} Time Group was preserved.`,
          primaryObject: tenantRef(normalizedTenant),
          relatedObjects: relatedRefs(project ? projectRef(project) : null, systemRef(hostingRecord)),
          metadata: { warning: mismatchMessage },
        })
      }
      const tenants = [normalizedTenant, ...current.tenants]
      const systems = current.systems.map((candidate) => {
        if (candidate.id !== hostingRecord.id) return candidate
        const beforeSummary = systemApplicationConfigurationSummary(candidate, current.tenants)
        const nextSystem = {
          ...candidate,
          tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), normalizedTenant.id])),
          ...systemWithAddedTenantTimeGroupGovernance(candidate, current.tenants, normalizedTenant, current.timeGroupLookups, current.countryLookups, current.usStateLookups, options?.timeGroupMismatchDecision),
          updatedAt: now,
        }
        const afterSummary = systemApplicationConfigurationSummary(nextSystem, tenants)
        const historyRecord = createSystemConfigurationHistoryRecord(
          afterSummary,
          nextSystem.configurationHistory ?? [],
          now,
          CURRENT_USER_DISPLAY_NAME,
          normalizedTenant.tid,
          configurationHistoryAttributionForSystem(current, nextSystem),
        )
        if (!historyRecord || (valuesEqual(beforeSummary, afterSummary) && (nextSystem.configurationHistory ?? []).length > 0)) return nextSystem
        const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(
          { ...current, tenants, idCounters },
          idCounters,
          'configurationHistory',
          nextSystem.configurationHistory ?? [],
          [historyRecord, ...(nextSystem.configurationHistory ?? [])],
        )
        idCounters = reconciled.counters
        return {
          ...nextSystem,
          configurationHistory: reconciled.records,
        }
      })
      const reusedInternalSystems = current.reusedInternalSystems.map((candidate) => {
        if (candidate.id !== hostingRecord.id) return candidate
        const beforeSummary = systemApplicationConfigurationSummary(candidate, current.tenants, current.systems, current.projectSystems)
        const nextSystem = {
          ...candidate,
          updatedAt: now,
        }
        const afterSummary = systemApplicationConfigurationSummary(nextSystem, tenants, current.systems, current.projectSystems)
        const historyRecord = createSystemConfigurationHistoryRecord(
          afterSummary,
          nextSystem.configurationHistory ?? [],
          now,
          CURRENT_USER_DISPLAY_NAME,
          normalizedTenant.tid,
        )
        if (!historyRecord || (valuesEqual(beforeSummary, afterSummary) && (nextSystem.configurationHistory ?? []).length > 0)) return nextSystem
        const reconciled = reconcileGlobalChildRecords<ConfigurationHistoryRecord>(
          { ...current, tenants, idCounters },
          idCounters,
          'configurationHistory',
          nextSystem.configurationHistory ?? [],
          [historyRecord, ...(nextSystem.configurationHistory ?? [])],
        )
        idCounters = reconciled.counters
        return {
          ...nextSystem,
          configurationHistory: reconciled.records,
        }
      })
      return {
        idCounters,
        tenants,
        systems,
        reusedInternalSystems,
        projectSystems: current.projectSystems.map((link) =>
          project && link.projectId === project.id && link.systemId === hostingRecord.id && link.allocationStatus !== 'DEALLOCATED'
            ? { ...link, tenantIds: Array.from(new Set([...(link.tenantIds ?? []), normalizedTenant.id])) }
            : link,
        ),
        projectTenants: projectTenant ? [projectTenant, ...current.projectTenants] : current.projectTenants,
        activityEvents,
      }
    })
    get().saveToStorage()
    return { ok: true, message: `Tenant ${normalizedTenant.tid} created.`, allocationId: projectTenant?.id, tenantId: normalizedTenant.id }
  },

  updateAccount: (id, patch) => {
    const now = new Date().toISOString()
    set((state) => {
      let previousAccount: AppDataState['accounts'][number] | undefined
      let nextAccount: AppDataState['accounts'][number] | undefined
      const accounts = state.accounts.map((account) => {
        if (account.id !== id) return account
        previousAccount = account
        nextAccount = accountWithDerivedGeography({ ...account, ...patch, updatedAt: now }, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
        return nextAccount
      })
      return {
        accounts,
        activityEvents: previousAccount && nextAccount
          ? appendFieldChangeActivityEvents(state.activityEvents, now, {
              previous: previousAccount as unknown as Record<string, unknown>,
              next: nextAccount as unknown as Record<string, unknown>,
              category: 'CUSTOMER',
              eventTypePrefix: 'customer',
              objectLabel: `Customer ${nextAccount.accountCode}`,
              primaryObject: customerRef(nextAccount) ?? activityObjectRefFromBusinessReference(accountReference(nextAccount)),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
  },

  updateProductionSystemInventoryItem: (id, patch, options) => {
    const now = new Date().toISOString()
    set((state) => {
      let previousSystem: AppDataState['productionSystemInventory'][number] | undefined
      let nextSystem: AppDataState['productionSystemInventory'][number] | undefined
      const productionSystemInventory = state.productionSystemInventory.map((system) => {
        if (system.id !== id) return system
        previousSystem = system
        nextSystem = { ...system, ...patch, updatedAt: options?.preserveNewState ? system.createdAt : now }
        return nextSystem
      })
      return {
        productionSystemInventory,
        activityEvents: previousSystem && nextSystem
          ? appendFieldChangeActivityEvents(state.activityEvents, now, {
              previous: previousSystem as unknown as Record<string, unknown>,
              next: nextSystem as unknown as Record<string, unknown>,
              category: 'SYSTEM',
              eventTypePrefix: 'system',
              objectLabel: `System ${systemBusinessId(nextSystem)}`,
              primaryObject: systemRef(nextSystem),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
  },

  updateReusedInternalSystem: (id, patch, options) => {
    const now = new Date().toISOString()
    set((state) => {
      let previousSystem: AppDataState['reusedInternalSystems'][number] | undefined
      let nextCommittedSystem: AppDataState['reusedInternalSystems'][number] | undefined
      const reusedInternalSystems = state.reusedInternalSystems.map((system) => {
        if (system.id !== id) return system
        previousSystem = system
        const safePatch = sanitizeReusedInternalSystemUserPatch(system, patch, state.projects, state.projectSystems, state.systems)
        const blockedPurposeChange = validateReusedInternalPurposeChange(
          system,
          { ...system, ...safePatch },
          state.projects,
          state.projectSystems,
          state.systems,
        )
        const ownerRequirementMessages = reusedInternalOwnerRequirementMessages({ ...system, ...safePatch })
        const requiredFieldMessages = validateSystemInventoryRequiredFields({ ...system, ...safePatch }, state)
        if (blockedPurposeChange.length > 0 || ownerRequirementMessages.length > 0 || requiredFieldMessages.length > 0) {
          nextCommittedSystem = system
          return system
        }
        const nextSystem = safePatch.purpose && safePatch.purpose !== system.purpose
          ? updateReusedInternalPurpose({ ...system, owners: safePatch.owners ?? system.owners }, safePatch.purpose, now, {
            owner: purposeHistoryOwnerSnapshot(safePatch.owners ?? system.owners),
          })
          : { ...system, updatedAt: options?.preserveNewState ? system.createdAt : now }
        nextCommittedSystem = normalizeSystemInventoryRecord(applyReusedSystemOccupationWindow({
          ...nextSystem,
          ...safePatch,
          status: reusedInternalStatusForPurpose(safePatch.purpose ?? nextSystem.purpose),
          updatedAt: options?.preserveNewState ? system.createdAt : now,
        }, state.projectSystems, state.projects, now, state.systems))
        return nextCommittedSystem
      })
      return {
        reusedInternalSystems,
        activityEvents: previousSystem && nextCommittedSystem
          ? appendFieldChangeActivityEvents(state.activityEvents, now, {
              previous: previousSystem as unknown as Record<string, unknown>,
              next: nextCommittedSystem as unknown as Record<string, unknown>,
              category: 'SYSTEM',
              eventTypePrefix: 'system',
              objectLabel: `System ${systemBusinessId(nextCommittedSystem)}`,
              primaryObject: systemRef(nextCommittedSystem),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
  },

  updateOpportunity: (id, patch, options) => {
    const now = new Date().toISOString()
    set((state) => {
      let previousOpportunity: AppDataState['opportunities'][number] | undefined
      let nextOpportunityRecord: AppDataState['opportunities'][number] | undefined
      const opportunities = state.opportunities.map((opportunity) => {
        if (opportunity.id !== id) return opportunity
        previousOpportunity = opportunity
        const nextOpportunity = opportunityWithCommittedRequirementContext(
          { ...opportunity, ...patch, updatedAt: options?.preserveNewState ? opportunity.createdAt : now },
          state.tenants,
        )
        nextOpportunityRecord = opportunityWithDerivedGeography(nextOpportunity, state.timeGroupLookups, state.countryLookups, state.usStateLookups)
        return nextOpportunityRecord
      })
      return {
        opportunities,
        activityEvents: previousOpportunity && nextOpportunityRecord
          ? appendFieldChangeActivityEvents(state.activityEvents, now, {
              previous: previousOpportunity as unknown as Record<string, unknown>,
              next: nextOpportunityRecord as unknown as Record<string, unknown>,
              category: 'OPPORTUNITY',
              eventTypePrefix: 'opportunity',
              objectLabel: `Opportunity ${nextOpportunityRecord.opportunityId}`,
              primaryObject: activityObjectRefFromBusinessReference(opportunityReference(nextOpportunityRecord)),
              relatedObjects: relatedRefs(customerRef(state.accounts.find((account) => account.id === nextOpportunityRecord?.accountId))),
            })
          : state.activityEvents,
      }
    })
    get().saveToStorage()
  },

  createOpportunity: (type = 'DELIVERY', subType = 'NEW') => {
    const state = get()
    const now = new Date().toISOString()
    const defaultAccount = state.accounts[0]
    const nextOpportunityId = generateBusinessIdFromCounter(
      'opportunity',
      state.idCounters,
      state.opportunities.map((opportunity) => opportunity.opportunityId),
    )

    const opportunity: AppDataState['opportunities'][number] = opportunityWithDerivedGeography({
      ...createOpportunityDraft(state.accounts, state.salesManagers, now, type, subType),
      opportunityId: nextOpportunityId.id,
      opportunityName: 'New opportunity',
    }, state.timeGroupLookups, state.countryLookups, state.usStateLookups)

    set((currentState) => ({
      idCounters: nextOpportunityId.counters,
      opportunities: [opportunity, ...currentState.opportunities],
      activityEvents: appendActivityEvent(currentState.activityEvents, now, {
        category: 'OPPORTUNITY',
        eventType: 'opportunity.created',
        severity: 'SUCCESS',
        summary: `Opportunity ${opportunity.opportunityId} created.`,
        primaryObject: activityObjectRefFromBusinessReference(opportunityReference(opportunity)),
        relatedObjects: relatedRefs(customerRef(defaultAccount)),
      }),
    }))
    get().saveToStorage()
    return opportunity
  },

  createProject: () => {
    const state = get()
    const { counters: idCounters, id: nextPid } = commitBusinessIdFromCounter(
      'project',
      state.idCounters,
      '',
      state.projects.map((project) => project.pid),
    )
    const now = new Date().toISOString()
    const project = projectWithDerivedTimeZone(state, createStandaloneProject(nextPid, now))

    try {
      set((s) => ({
        idCounters,
        projects: [project, ...s.projects],
        activityEvents: appendActivityEvent(s.activityEvents, now, {
          category: 'PROJECT',
          eventType: 'project.created',
          severity: 'SUCCESS',
          summary: `Project ${project.pid} created.`,
          primaryObject: projectRef(project),
        }),
      }))
      get().saveToStorage()
    } catch (error) {
      set(state)
      throw error
    }
    return project
  },

  createProjectFromDraft: (draft) => {
    const state = get()
    const existingCreatedProject = draft.pid
      ? state.projects.find((project) => project.pid === draft.pid)
      : undefined
    if (existingCreatedProject) {
      const now = new Date().toISOString()
      const project = applyProjectLifecycleStatus(projectWithDerivedTimeZone(state, {
        ...existingCreatedProject,
        ...draft,
        id: existingCreatedProject.id,
        pid: existingCreatedProject.pid,
        createdAt: existingCreatedProject.createdAt,
        updatedAt: now,
      }))
      try {
        set((s) => ({
          projects: s.projects.map((candidate) => candidate.id === existingCreatedProject.id ? project : candidate),
        }))
        get().saveToStorage()
      } catch (error) {
        set(state)
        throw error
      }
      return project
    }

    const { counters: idCounters, id: nextPid } = commitBusinessIdFromCounter(
      'project',
      state.idCounters,
      draft.pid,
      state.projects.map((project) => project.pid),
    )
    const now = new Date().toISOString()
    const project = applyProjectLifecycleStatus(projectWithDerivedTimeZone(state, {
      ...draft,
      pid: nextPid,
      createdAt: now,
      updatedAt: now,
    }))

    try {
      set((s) => ({
        idCounters,
        projects: [project, ...s.projects],
        activityEvents: appendActivityEvent(s.activityEvents, now, {
          category: 'PROJECT',
          eventType: 'project.created',
          severity: 'SUCCESS',
          summary: `Project ${project.pid} created.`,
          primaryObject: projectRef(project),
        }),
      }))
      get().saveToStorage()
    } catch (error) {
      set(state)
      throw error
    }
    return project
  },

  createProductionSystemInventoryItem: () => {
    const state = get()
    const nextSystemId = commitBusinessIdFromCounter(
      'productionSystem',
      state.idCounters,
      '',
      [...state.systems, ...state.productionSystemInventory].map((system) => system.sid),
    )
    const idCounters = nextSystemId.counters
    const nextSid = nextSystemId.id
    const now = new Date().toISOString()
    const system = createProductionInventorySystem(nextSid, now)

    set((currentState) => ({
      idCounters,
      productionSystemInventory: [system, ...currentState.productionSystemInventory],
      activityEvents: appendActivityEvent(currentState.activityEvents, now, {
        category: 'SYSTEM',
        eventType: 'system.created',
        severity: 'SUCCESS',
        summary: `System ${system.sid} created.`,
        primaryObject: systemRef(system),
      }),
    }))
    get().saveToStorage()
    return system
  },

  createReusedInternalSystem: (machineId = '') => {
    const nextMid = normalizeReusedInternalMachineId(reusedInternalMachineIdRouteKey(machineId))
    const now = new Date().toISOString()
    const system = createReusedInternalInventorySystem(nextMid, now)

    set((currentState) => ({
      reusedInternalSystems: [system, ...currentState.reusedInternalSystems],
      activityEvents: appendActivityEvent(currentState.activityEvents, now, {
        category: 'SYSTEM',
        eventType: 'system.created',
        severity: 'SUCCESS',
        summary: `System ${systemBusinessId(system)} created.`,
        primaryObject: systemRef(system),
      }),
    }))
    get().saveToStorage()
    return system
  },

  saveOpportunityWithProjectSync: (opportunity, savedOpportunity, options, timestampOptions) => {
    const state = get()
    const opportunityWithUniqueRequirementIds = opportunityWithUniqueTenantRequirementIds(opportunity, {
      opportunities: state.opportunities,
      tenants: state.tenants,
      projects: state.projects,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      savedOpportunity,
    })
    const duplicateRequirementIds = duplicateRequirementIdsForOpportunitySave(state, opportunityWithUniqueRequirementIds, savedOpportunity)
    if (duplicateRequirementIds.length > 0) {
      return {
        opportunity: opportunityWithUniqueRequirementIds,
        projectChanges: [],
        messages: [`Requirement ID must be unique across the application. Duplicate ID(s): ${duplicateRequirementIds.join(', ')}.`],
      }
    }
    const account = state.accounts.find((candidate) => candidate.id === opportunity.accountId)
    const salesManager = state.salesManagers.find((candidate) => candidate.id === opportunity.salesManagerId)
    const now = new Date().toISOString()
    const isNewOpportunity = !savedOpportunity
    const opportunityIdentity = isNewOpportunity
      ? commitBusinessIdFromCounter(
          'opportunity',
          state.idCounters,
          opportunityWithUniqueRequirementIds.opportunityId,
          state.opportunities.map((candidate) => candidate.opportunityId),
        )
      : { counters: state.idCounters, id: opportunity.opportunityId }
    const opportunityForSave = isNewOpportunity
      ? {
          ...opportunityWithUniqueRequirementIds,
          opportunityId: opportunityIdentity.id,
          createdAt: now,
          updatedAt: now,
        }
      : opportunityWithUniqueRequirementIds
    const savedOpportunityForSync = savedOpportunity ?? {
      ...opportunityForSave,
      stage: 'OPEN' as const,
      newTenantRequirements: [],
      changeRequestRequirements: [],
      standardRenewalRequirements: [],
      pocProjectIds: [],
      finalProjectId: null,
      wonAt: null,
      createdAt: now,
      updatedAt: now,
    }
    const preparedOpportunity = opportunityWithCommittedRequirementContext(opportunityForSave, state.tenants)
    const result = syncOpportunityProjectsFromOpportunity(
      preparedOpportunity,
      savedOpportunityForSync,
      {
        account,
        salesManager,
        idCounters: opportunityIdentity.counters,
        projects: state.projects,
        now,
        preserveOpportunityUpdatedAt: timestampOptions?.preserveNewState && savedOpportunity ? savedOpportunity.createdAt : undefined,
      },
      options,
    )
    const changedProjects = result.projectChanges
      .map((change) => result.projects.find((project) => project.id === change.projectId))
      .filter((project): project is AppDataState['projects'][number] => Boolean(project))
    const shouldSyncWonRelationships = savedOpportunityForSync.stage !== 'WON' && result.opportunity.stage === 'WON'
    const finalProject = shouldSyncWonRelationships && result.opportunity.finalProjectId
      ? result.projects.find((project) => project.id === result.opportunity.finalProjectId)
      : undefined
    const existingTenantIds = Array.from(new Set([
      ...(shouldSyncWonRelationships ? existingTenantIdsForOpportunityFinalProject(result.opportunity) : []),
      ...changedProjects.flatMap((project) =>
        requiredExistingTenantAllocationsForProject(project, result.opportunity, state.tenants).map((allocation) => allocation.tenantId),
      ),
    ]))
    const relationshipMessages = existingTenantIds.length > 0
      ? validateProjectTenantHostingRelationshipSync(state, existingTenantIds)
      : []
    if (relationshipMessages.length > 0) {
      return {
        opportunity: savedOpportunity ?? opportunityForSave,
        projectChanges: [],
        messages: relationshipMessages,
      }
    }

    try {
      set((currentState) => {
        const committedOpportunityRecord = opportunityWithDerivedGeography(result.opportunity, currentState.timeGroupLookups, currentState.countryLookups, currentState.usStateLookups)
        const opportunities = isNewOpportunity
          ? [committedOpportunityRecord, ...currentState.opportunities]
          : currentState.opportunities.map((candidate) =>
              candidate.id === savedOpportunityForSync.id
                ? committedOpportunityRecord
                : candidate
            )
        const committedState = { ...currentState, opportunities }
        const projects = result.projects.map((project) => projectWithDerivedTimeZone(committedState, project))
        const projectForRelationshipSync = finalProject ? projects.find((project) => project.id === finalProject.id) : undefined
        let relationshipState: Pick<AppDataState, 'systems' | 'projectSystems' | 'projectTenants' | 'activityEvents'> = {
          systems: currentState.systems,
          projectSystems: currentState.projectSystems,
          projectTenants: currentState.projectTenants,
          activityEvents: currentState.activityEvents,
        }
        result.projectChanges.forEach((change) => {
          const project = projects.find((candidate) => candidate.id === change.projectId)
          if (!project) return
          relationshipState = ensureAutomaticRequirementRelationships(
            { ...currentState, opportunities, projects, ...relationshipState },
            committedOpportunityRecord,
            project,
            now,
          )
        })
        relationshipState = reconcileProjectAllocationSources(
          { ...currentState, opportunities, projects, ...relationshipState },
          result.projectChanges.map((change) => change.projectId),
          now,
        )
        const committedOpportunity = opportunities.find((candidate) => candidate.id === savedOpportunityForSync.id) ?? committedOpportunityRecord
        const allocationState: Pick<AppDataState, 'systems' | 'projectSystems' | 'activityEvents'> = {
          systems: relationshipState.systems,
          projectSystems: relationshipState.projectSystems,
          activityEvents: relationshipState.activityEvents,
        }
        let activityEvents = isNewOpportunity
          ? appendActivityEvent(allocationState.activityEvents, now, {
              category: 'OPPORTUNITY',
              eventType: 'opportunity.created',
              severity: 'SUCCESS',
              summary: `Opportunity ${committedOpportunity.opportunityId} created.`,
              primaryObject: activityObjectRefFromBusinessReference(opportunityReference(committedOpportunity)),
              relatedObjects: relatedRefs(customerRef(account)),
            })
          : appendFieldChangeActivityEvents(allocationState.activityEvents, now, {
              previous: savedOpportunityForSync as unknown as Record<string, unknown>,
              next: committedOpportunity as unknown as Record<string, unknown>,
              category: 'OPPORTUNITY',
              eventTypePrefix: 'opportunity',
              objectLabel: `Opportunity ${committedOpportunity.opportunityId}`,
              primaryObject: activityObjectRefFromBusinessReference(opportunityReference(committedOpportunity)),
              relatedObjects: relatedRefs(customerRef(account)),
            })
        result.projectChanges.forEach((change) => {
          const project = projects.find((candidate) => candidate.id === change.projectId)
          if (!project) return
          const previousProject = currentState.projects.find((candidate) => candidate.id === change.projectId)
          if (change.changeStatus === 'New' || !previousProject) {
            activityEvents = appendActivityEvent(activityEvents, now, {
              category: 'PROJECT',
              eventType: 'project.createdFromOpportunity',
              severity: 'SUCCESS',
              summary: `Project ${project.pid} created from Opportunity ${committedOpportunity.opportunityId}.`,
              primaryObject: projectRef(project),
              relatedObjects: relatedRefs(activityObjectRefFromBusinessReference(opportunityReference(committedOpportunity)), customerRef(account)),
            })
            return
          }
          activityEvents = appendFieldChangeActivityEvents(activityEvents, now, {
            previous: previousProject as unknown as Record<string, unknown>,
            next: project as unknown as Record<string, unknown>,
            category: 'PROJECT',
            eventTypePrefix: 'project',
            objectLabel: `Project ${project.pid}`,
            primaryObject: projectRef(project),
            relatedObjects: relatedRefs(activityObjectRefFromBusinessReference(opportunityReference(committedOpportunity)), customerRef(account)),
            excludeFields: ['tasks', 'milestones', 'progressStatus'],
          })
        })
        const isApprovedPocConversion = shouldSyncWonRelationships &&
          result.opportunity.subType === 'UPSELL' &&
          (result.opportunity.type === 'DELIVERY' || result.opportunity.type === 'RENEWAL')
        const conversionTenantIds = new Set(
          isApprovedPocConversion
            ? applicableOpportunityRequirementSources(result.opportunity)
                .filter((source) => source.requirementType === 'B')
                .map((source) => source.requirement.tenantId)
            : [],
        )
        const tenants = currentState.tenants.map((tenant) => {
          if (!conversionTenantIds.has(tenant.id) || tenant.tenantType !== 'POC') return tenant
          if (!isEligiblePocTenantForCustomerExistingContext(tenant, currentState.systems)) return tenant
          activityEvents = appendActivityEvent(activityEvents, now, {
            category: 'TENANT',
            eventType: 'tenant.pocConvertedToCustomerFromUpsell',
            severity: 'SUCCESS',
            summary: `Tenant ${tenant.tid} converted from POC to Customer through ${projectForRelationshipSync?.pid ?? 'the Upsell Project'}.`,
            primaryObject: tenantRef(tenant),
            relatedObjects: relatedRefs(projectForRelationshipSync ? projectRef(projectForRelationshipSync) : null, customerRef(account)),
          })
          return { ...tenant, tenantType: 'CUSTOMER' as const, tenantFormType: 'CUSTOMER' as const, warrantyStatus: 'NOT_SET' as const, updatedAt: now }
        })
        return {
          idCounters: result.idCounters,
          projects,
          systems: allocationState.systems,
          projectSystems: allocationState.projectSystems,
          projectTenants: relationshipState.projectTenants,
          tenants,
          activityEvents,
          projectLifecycleChangesByOpportunityId: {
            ...currentState.projectLifecycleChangesByOpportunityId,
            [result.opportunity.id]: result.projectChanges,
          },
          opportunities,
        }
      })
      get().saveToStorage()
    } catch (error) {
      set(state)
      throw error
    }
    return {
      opportunity: opportunityWithDerivedGeography(result.opportunity, get().timeGroupLookups, get().countryLookups, get().usStateLookups),
      projectChanges: result.projectChanges,
    }
  },

  createSystem: () => {
    const state = get()
    const nextSystemId = commitBusinessIdFromCounter(
      'productionSystem',
      state.idCounters,
      '',
      [...state.systems, ...state.productionSystemInventory].map((system) => system.sid),
    )
    const idCounters = nextSystemId.counters
    const nextSid = nextSystemId.id
    const now = new Date().toISOString()
    const system = createStandaloneSystem(nextSid, now)

    set((s) => ({
      idCounters,
      systems: [system, ...s.systems],
      activityEvents: appendActivityEvent(s.activityEvents, now, {
        category: 'SYSTEM',
        eventType: 'system.created',
        severity: 'SUCCESS',
        summary: `System ${system.sid ?? system.id} created.`,
        primaryObject: systemRef(system),
      }),
    }))
    get().saveToStorage()
    return system
  },

  allocateProductionSystemToProject: (projectId, productionSystemId) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const productionSystem = state.productionSystemInventory.find((candidate) => candidate.id === productionSystemId)
    const invalid = validateProductionAllocation({ projectId, systemId: productionSystemId }, state)
    if (invalid) return invalid
    if (!project || !productionSystem) return { ok: false, message: 'Production system not found.' }

    const now = new Date().toISOString()
    const tenantIds: string[] = []
    const assignmentLocation = projectAssignmentLocation(state, project)

    const allocatedSystem = systemFromProductionInventoryAllocation(
      productionSystem,
      project.id,
      assignmentLocation,
      tenantIds,
      now,
    )
    const allocation = createProjectSystemLink(
      projectId,
      allocatedSystem.id,
      'PRODUCTION',
      now,
      { tenantIds },
    )

    set((current) => ({
      productionSystemInventory: current.productionSystemInventory.filter((candidate) => candidate.id !== productionSystemId),
      systems: [allocatedSystem, ...current.systems],
      projectSystems: [allocation, ...current.projectSystems],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.systemAllocated',
        severity: 'SUCCESS',
        summary: `System ${systemBusinessId(allocatedSystem)} allocated to project ${project.pid}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(projectRef(project), systemRef(allocatedSystem)),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Production system allocated.', allocationId: allocation.id }
  },

  allocateReusedInternalSystemToProject: (projectId, reusedSystemId) => {
    const state = get()
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const reusedSystem = state.reusedInternalSystems.find((candidate) => candidate.id === reusedSystemId)
    const invalid = validateReusedInternalAllocation({ projectId, systemId: reusedSystemId }, state)
    if (invalid) return invalid
    if (!project || !reusedSystem) return { ok: false, message: 'Reused internal system not found.' }

    const now = new Date().toISOString()
    const nextSystemId = commitBusinessIdFromCounter(
      'productionSystem',
      state.idCounters,
      '',
      [...state.systems, ...state.productionSystemInventory].map((system) => system.sid),
    )
    let idCounters = nextSystemId.counters
    const tenantIds: string[] = []
    const allocatedSystemId = `sys-${crypto.randomUUID()}`
    const assignmentLocation = projectAssignmentLocation(state, project)
    const projectAccount = state.accounts.find((account) => account.accountName === project.accountName)

    const allocatedSystem = {
      ...systemFromReusedInternalAllocation(
        reusedSystem,
        project.id,
        assignmentLocation,
        allocatedSystemId,
        nextSystemId.id,
        project.pid,
        tenantIds,
        now,
        project.pocStartDate ?? null,
        project.pocEndDate ?? null,
      ),
      accountId: projectAccount?.id ?? null,
      salesManagerId: projectAccount?.salesManagerId ?? null,
      accountName: project.accountName,
      currentVersionUpdateId: reusedSystem.currentVersionUpdateId ?? null,
      currentVersionNumberRefId: reusedSystem.currentVersionNumberRefId ?? null,
      currentBuildNumberRefId: reusedSystem.currentBuildNumberRefId ?? null,
    }
    const allocation = createProjectSystemLink(
      projectId,
      allocatedSystem.id,
      'REUSED_INTERNAL',
      now,
      { tenantIds, sourceMachineId: reusedSystem.machineId },
    )

    set((current) => {
      const staleMidTenantIds = current.tenants
        .filter((tenant) => tenantIsActivelyHostedBySystem(tenant, reusedSystemId))
        .map((tenant) => tenant.id)
      const cleanupState = staleMidTenantIds.reduce(
        (nextState, tenantId) => ({ ...nextState, ...cancelTenantInState(nextState, tenantId, now) }),
        current,
      )
      const inheritedVersionUpdates = cloneVersionUpdateRecordsForSystem({
        sourceSystemId: reusedSystemId,
        sourceCurrentVersionUpdateId: reusedSystem.currentVersionUpdateId,
        targetSystem: allocatedSystem,
        targetCollection: 'allocated',
        versionUpdates: cleanupState.versionUpdates,
        idCounters,
        timestamp: now,
      })
      idCounters = inheritedVersionUpdates.idCounters
      const allocatedSystemWithInheritedVersion = {
        ...allocatedSystem,
        ...inheritedVersionUpdates.currentPatch,
      }
      return {
      idCounters,
      versionUpdates: [...cleanupState.versionUpdates, ...inheritedVersionUpdates.records],
      reusedInternalSystems: cleanupState.reusedInternalSystems.map((candidate) =>
        candidate.id === reusedSystemId
          ? {
              ...occupyReusedInternalSystem(
                candidate,
                projectId,
                now,
                purposeHistoryContextFromProject(project, allocatedSystemWithInheritedVersion),
                [
                  ...activeProjectSystemLinks(cleanupState.projectSystems).filter((link) => reusedInternalMachineIdsEqual(link.sourceMachineId, candidate.machineId)),
                  allocation,
                ],
                cleanupState.projects,
              ),
              usedInRegion: assignmentLocation.region,
              timeGroup: assignmentLocation.timeGroup,
            }
          : candidate,
      ),
      systems: recalculateAllocatedReusedSystemOccupationWindows([allocatedSystemWithInheritedVersion, ...cleanupState.systems], [allocation, ...cleanupState.projectSystems], cleanupState.projects),
      tenants: cleanupState.tenants,
      projectSystems: [allocation, ...cleanupState.projectSystems],
      projectTenants: cleanupState.projectTenants,
      opportunities: cleanupState.opportunities,
      warrantyRecords: cleanupState.warrantyRecords,
      activityEvents: appendActivityEvent(cleanupState.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.systemAllocated',
        severity: 'SUCCESS',
        summary: `System ${systemBusinessId(allocatedSystemWithInheritedVersion)} allocated to project ${project.pid}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(projectRef(project), systemRef(allocatedSystemWithInheritedVersion), systemRef(reusedSystem)),
      }),
    }
    })
    get().saveToStorage()
    return { ok: true, message: 'Reused internal system allocated.', allocationId: allocation.id }
  },

  linkExistingSystemToProject: (projectId, systemId) => {
    const state = get()
    const invalid = validateExistingSystemLink({ projectId, systemId }, state)
    if (invalid) return invalid
    const project = state.projects.find((candidate) => candidate.id === projectId)
    const system = state.systems.find((candidate) => candidate.id === systemId)

    const now = new Date().toISOString()
    const tenantIds: string[] = []
    const assignmentLocation = project ? projectAssignmentLocation(state, project) : { region: '', timeGroup: '' }
    const activeLinksForSystem = activeProjectSystemLinks(state.projectSystems).filter((link) => link.systemId === systemId)
    const allocationType: AllocationType = system?.source === SYSTEM_SOURCE_REUSED_INTERNAL ? 'REUSED_INTERNAL' : 'EXISTING_SYSTEM'

    const allocation = createProjectSystemLink(
      projectId,
      systemId,
      allocationType,
      now,
      { tenantIds, sourceMachineId: allocationType === 'REUSED_INTERNAL' ? system?.machineId ?? null : null },
    )

    set((current) => ({
      systems: recalculateAllocatedReusedSystemOccupationWindows(current.systems.map((candidate) =>
        candidate.id === systemId
          ? {
              ...candidate,
              linkedProjectIds: Array.from(new Set([...(candidate.linkedProjectIds ?? []), projectId])),
              tenantIds: Array.from(new Set([...(candidate.tenantIds ?? []), ...tenantIds])),
              region: activeLinksForSystem.length === 0 ? assignmentLocation.region : candidate.region || assignmentLocation.region,
              timeGroup: activeLinksForSystem.length === 0 ? assignmentLocation.timeGroup : candidate.timeGroup || assignmentLocation.timeGroup,
              updatedAt: now,
            }
          : candidate,
      ), [allocation, ...current.projectSystems], current.projects),
      projectSystems: [allocation, ...current.projectSystems],
      activityEvents: appendActivityEvent(current.activityEvents, now, {
        category: 'ALLOCATION',
        eventType: 'allocation.existingSystemLinked',
        severity: 'SUCCESS',
        summary: `System ${system ? systemBusinessId(system) : systemId} linked to project ${project?.pid ?? projectId}.`,
        primaryObject: allocationRef(allocation),
        relatedObjects: relatedRefs(project ? projectRef(project) : null, system ? systemRef(system) : null),
      }),
    }))
    get().saveToStorage()
    return { ok: true, message: 'Existing system linked.', allocationId: allocation.id }
  },

  deallocateProjectSystem: (allocationId) => {
    const state = get()
    const allocation = state.projectSystems.find((candidate) => candidate.id === allocationId)
    const invalid = validateProjectSystemDeallocation(allocationId, {
      projects: state.projects,
      opportunities: state.opportunities,
      projectSystems: state.projectSystems,
      projectTenants: state.projectTenants,
      systems: state.systems,
      tenants: state.tenants,
    })
    if (invalid) return invalid
    if (!allocation) return { ok: false, message: 'Allocation not found.' }
    const project = state.projects.find((candidate) => candidate.id === allocation.projectId)
    const system = state.systems.find((candidate) => candidate.id === allocation.systemId)
    const allocatedSystemForPurposeHistory = system
    const now = new Date().toISOString()

    set((current) => {
      const projectSystems = current.projectSystems.map((candidate) =>
        candidate.id === allocationId
          ? deallocateProjectSystemLink(candidate, now)
          : candidate,
      )
      const projectTenants = current.projectTenants.map((candidate) =>
        candidate.projectId === allocation.projectId &&
        candidate.systemId === allocation.systemId &&
        candidate.allocationStatus !== 'DEALLOCATED'
          ? deallocateProjectTenantLink(candidate, now)
          : candidate,
      )
      const hasRemainingProjectAllocation = activeProjectSystemLinks(projectSystems).some((link) => link.systemId === allocation.systemId)
      const shouldReturnProductionToInventory = Boolean(
        system &&
        system.source !== SYSTEM_SOURCE_REUSED_INTERNAL &&
        !hasRemainingProjectAllocation,
      )
      const returnedProductionSystem = shouldReturnProductionToInventory && system
        ? {
            ...unlinkProjectFromSystem(system, allocation.projectId, now),
            source: 'Production' as const,
            purpose: SYSTEM_PURPOSE_DELIVERY,
            linkedProjects: [],
            availability: SYSTEM_AVAILABILITY_AVAILABLE,
            linkedProjectIds: undefined,
            allocationIds: undefined,
            allocationProjectIds: undefined,
            allocationTypes: undefined,
            allocatedAt: undefined,
            allocationStatus: undefined,
            tenantIds: [],
            tenantCount: 0,
            alerts: [],
            updatedAt: now,
          } as unknown as AppDataState['productionSystemInventory'][number]
        : null
      const systems = shouldReturnProductionToInventory
        ? current.systems.filter((candidate) => candidate.id !== allocation.systemId)
        : current.systems.map((system) =>
            system.id === allocation.systemId
              ? unlinkProjectFromSystem(system, allocation.projectId, now)
              : system,
          )
      const releasedReusedSystems = current.reusedInternalSystems.map((system) =>
        allocation.allocationType === 'REUSED_INTERNAL' && reusedInternalMachineIdsEqual(system.machineId, allocation.sourceMachineId)
          ? releaseReusedInternalSystem(system, allocation.projectId, now, project && allocatedSystemForPurposeHistory ? purposeHistoryContextFromProject(project, allocatedSystemForPurposeHistory) : {})
          : system,
      )
      return {
        projectSystems,
        systems: recalculateAllocatedReusedSystemOccupationWindows(systems, projectSystems, current.projects),
        productionSystemInventory: returnedProductionSystem
          ? [
              returnedProductionSystem,
              ...current.productionSystemInventory.filter((candidate) => candidate.id !== returnedProductionSystem.id),
            ]
          : current.productionSystemInventory,
        reusedInternalSystems: recalculateReusedSystemOccupationWindows(releasedReusedSystems, projectSystems, current.projects, now, systems),
        projectTenants,
        activityEvents: appendActivityEvent(current.activityEvents, now, {
          category: 'ALLOCATION',
          eventType: 'allocation.systemDeallocated',
          severity: 'WARNING',
          summary: `System ${system ? systemBusinessId(system) : allocation.systemId} deallocated from project ${project?.pid ?? allocation.projectId}.`,
          primaryObject: allocationRef(allocation),
          relatedObjects: relatedRefs(project ? projectRef(project) : null, system ? systemRef(system) : null),
        }),
      }
    })
    get().saveToStorage()
    return { ok: true, message: 'System deallocated from project.', allocationId }
  },
}))
