import type {
  Account,
  InfrastructureItem,
  InfrastructureMaintenanceRecurrence,
  InfrastructureMaintenanceTask,
  InfrastructureMaintenanceTaskStatus,
  InfrastructureItemProperties,
  InfrastructureMaintenanceStatus,
  InfrastructureOperationalStatus,
  InfrastructureOwner,
  InfrastructureWarrantyContact,
  InfrastructureWarrantyStatus,
  TenantWarranty,
  Tenant,
  ReferenceDataRecord,
  System,
  ProductionSystemInventoryItem,
  ReusedInternalSystem,
} from '@/data/seed.types'
import { normalizeReferenceLabel, referenceDataLabel } from '@/domain/reference-data'
import { reserveBusinessId } from '@/domain/business-identity'
import { systemBusinessId, systemReference } from '@/domain/business-reference'
import { daysBeforeExpiration, daysBetween, warrantyAlertForStatus, warrantyCollectionReadModel, warrantyHeaderStatusReadModel } from '@/domain/warranty-collection'
import { tenantIsActivelyHostedBySystem } from '@/domain/tenant-operations/lifecycle'

export const INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE = 'INFRASTRUCTURE_CATEGORY'
export const INFRASTRUCTURE_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_TYPE'
export const INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE = 'INFRASTRUCTURE_MANUFACTURER'
export const INFRASTRUCTURE_OWNER_REFERENCE_TYPE = 'INFRASTRUCTURE_OWNER'
export const INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE = 'INFRASTRUCTURE_BILLING_METHOD'
export const INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_WARRANTY_TYPE'
export const INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE = 'INFRASTRUCTURE_PROPERTY_VALUE'
export const INFRASTRUCTURE_MAINTENANCE_TASK_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_MAINTENANCE_TASK_TYPE'
export const ADD_NEW_REFERENCE_OPTION = '__ADD_NEW__'

export const INFRASTRUCTURE_OWNER_OPTIONS: InfrastructureOwner[] = ['Penlink', 'Agent', 'Customer']
export const INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS: InfrastructureOperationalStatus[] = ['Active', 'Obsolete', 'Will Not Renew']
export const INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS: InfrastructureMaintenanceStatus[] = ['None', 'Planned', 'Pending', 'Overdue', 'Delayed', 'Not Set Yet', 'Current', 'Expired', 'No Warranty', 'Obsolete']
export const INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS: InfrastructureMaintenanceTaskStatus[] = ['Open', 'In Progress', 'Done']

export const EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT: InfrastructureWarrantyContact = {
  name: '',
  email: '',
  phone: '',
  address: '',
}

export const INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS: Array<{ category: string; types: string[] }> = [
  { category: 'Hardware', types: ['Server', 'Storage Server', 'Firewall', 'Laptop'] },
  { category: 'Software', types: ['ESXi'] },
  { category: 'Cloud', types: ['Compute/Host', 'VPN'] },
  { category: 'Network', types: ['Domain', 'SSL'] },
]

const APPROVED_INFRASTRUCTURE_CATEGORY_LABELS = new Set(
  INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS.map((group) => normalizeReferenceLabel(group.category)),
)

const APPROVED_INFRASTRUCTURE_TYPE_LABELS_BY_CATEGORY = new Map(
  INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS.map((group) => [
    normalizeReferenceLabel(group.category),
    new Set(group.types.map((type) => normalizeReferenceLabel(type))),
  ]),
)

const INFRASTRUCTURE_MANUFACTURER_DEFAULTS: Record<string, string[]> = {
  Server: ['HP', 'Dell'],
  'Storage Server': ['HP', 'Dell'],
  Firewall: ['FortiGate', 'Palo Alto', 'Cisco'],
}

const INFRASTRUCTURE_OWNER_DEFAULTS = ['Penlink', 'Agent', 'Customer']
const INFRASTRUCTURE_BILLING_METHOD_DEFAULTS = ['One Time Payment', 'Recurring Payment']
const INFRASTRUCTURE_WARRANTY_TYPE_DEFAULTS = ['Standard', 'Extended', 'No Warranty']

export const INFRASTRUCTURE_PROPERTY_SCOPES = {
  serverRackUnit: 'server.rackUnit',
  serverEsxiVersion: 'server.esxiVersion',
  esxiVersion: 'esxi.version',
  serverMemoryType: 'server.memoryType',
  serverMemorySize: 'server.memorySize',
  serverCpuType: 'server.cpuType',
  serverDiskType: 'server.diskType',
  vmType: 'vm.type',
  vmDiskType: 'vm.diskType',
  vmDiskSize: 'vm.diskSize',
  vmMemoryType: 'vm.memoryType',
  vmMemorySize: 'vm.memorySize',
  vmOsVersion: 'vm.osVersion',
  vpnType: 'vpn.type',
  firewallTokenType: 'firewall.tokenType',
  firewallModelFortiGate: 'firewall.model.fortigate',
  firewallModelPaloAlto: 'firewall.model.paloAlto',
  firewallModelCisco: 'firewall.model.cisco',
  firewallFirmwareVersion: 'firewall.firmwareVersion',
  domainProvider: 'domain.provider',
  domainType: 'domain.domainType',
  sslProvider: 'ssl.provider',
  sslType: 'ssl.type',
  sslVersion: 'ssl.version',
  laptopManufacturer: 'laptop.manufacturer',
} as const

export type InfrastructurePropertyScope =
  | typeof INFRASTRUCTURE_PROPERTY_SCOPES[keyof typeof INFRASTRUCTURE_PROPERTY_SCOPES]
  | `firewall.model.${string}`
  | `laptop.${string}`
  | `manufacturer.${string}.model`
  | `manufacturer.${string}.firmwareVersion`

const INFRASTRUCTURE_PROPERTY_DEFAULTS: Record<string, string[]> = {
  [INFRASTRUCTURE_PROPERTY_SCOPES.serverRackUnit]: ['U1', 'U2', 'U3'],
  [INFRASTRUCTURE_PROPERTY_SCOPES.serverMemoryType]: ['DDR4', 'DDR5'],
  [INFRASTRUCTURE_PROPERTY_SCOPES.serverMemorySize]: ['32G'],
  [INFRASTRUCTURE_PROPERTY_SCOPES.serverCpuType]: ['Intel(R) Xeon(R) Silver 4110 CPU @ 8 Cores 2.10GHz', 'Intel Xeon 6505P 2.2GHz 12-core 150W'],
  [INFRASTRUCTURE_PROPERTY_SCOPES.serverDiskType]: ['HP 2.4TB SAS', 'HPE 1.92TB SATA 6G'],
  [INFRASTRUCTURE_PROPERTY_SCOPES.vpnType]: ['Open VPN'],
  [INFRASTRUCTURE_PROPERTY_SCOPES.firewallModelFortiGate]: ['60E', '60F', '70E'],
}

const HP_SERVER_MODEL_DEFAULTS = ['HPE ProLiant DL360 Gen10', 'HPE ProLiant DL360 Gen12']

export interface InfrastructureDashboardRow extends InfrastructureItem {
  categoryLabel: string
  typeLabel: string
  manufacturerLabel: string
  ownerLabel: string
  billingMethodLabel: string
  productsDisplay: string
  linkedSystemBusinessIds: string[]
  linkedSystemsDisplay: string
  linkedSidTidDisplay: string
  lastMaintenanceDate: string | null
  maintenanceStatuses: Array<Exclude<InfrastructureMaintenanceAlert, ''>>
  warrantyStatus: InfrastructureWarrantyStatus
  itemWarrantyDaysLeft: number | null
  latestExpiringTenantId: string
  latestTenantWarrantyEndDate: string
  latestExpiringTenantAccountName: string
  tidWarrantyMonthsLeft: number | null
  tidWarrantyDaysLeft: number | null
  warrantyContactDisplay: string
}

export interface InfrastructureMaintenanceDashboardRow {
  id: string
  createdAt: string
  updatedAt: string
  taskId: string
  taskType: string
  description: string
  taskStatus: InfrastructureMaintenanceTaskStatus
  location: string
  recurrenceSummary: string
  infrastructureItemId: string
  infrastructureItemName: string
  infrastructureType: string
  region: string
  customer: string
  account: string
  tenant: string
  startDate: string
  dueDate: string
  alert: InfrastructureMaintenanceAlert
  daysRunning: number | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function numberOrNull(value: unknown): number | null {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function text(value: unknown): string {
  return value == null ? '' : String(value)
}

function orderedLabelIndex(order: string[], label: string): number {
  const index = order.findIndex((value) => normalizeReferenceLabel(value) === normalizeReferenceLabel(label))
  return index === -1 ? Number.MAX_SAFE_INTEGER : index
}

function normalizeInfrastructureBusinessId(value: unknown): string {
  const current = text(value).trim()
  const canonical = /^INF(\d+)$/i.exec(current)
  if (canonical) return `INF${canonical[1].padStart(6, '0')}`
  const legacy = /^(?:IT|I)(\d+)$/i.exec(current)
  return legacy ? `INF${legacy[1].padStart(6, '0')}` : current
}

function normalizeInfrastructureMaintenanceTaskId(
  value: unknown,
  existingTaskIds: Array<string | null | undefined>,
  index: number,
): string {
  const current = text(value).trim()
  const canonical = /^IMT(\d+)$/i.exec(current)
  const legacy = /^MT(\d+)$/i.exec(current)
  const candidate = canonical
    ? `IMT${canonical[1].padStart(6, '0')}`
    : legacy
      ? `IMT${legacy[1].padStart(6, '0')}`
      : ''
  const used = new Set(existingTaskIds.map((id) => text(id).trim()).filter(Boolean))
  if (candidate && !used.has(candidate)) return candidate
  return reserveBusinessId('infrastructureMaintenanceTask', existingTaskIds, index)
}

function dateTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.valueOf()) ? null : parsed.getTime()
}

function todayTimestamp(today = new Date()): number {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

function businessDate(today = new Date()): string {
  return today.toISOString().slice(0, 10)
}

function dateOnlyDaysBetween(startDate: string | null | undefined, endDate: Date): number | null {
  const start = dateTimestamp(startDate)
  if (start === null) return null
  return Math.max(0, Math.floor((todayTimestamp(endDate) - start) / 86_400_000) + 1)
}

export function normalizeInfrastructureIdentifier(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function infrastructureManufacturerPropertyScope(referenceData: ReferenceDataRecord[], manufacturerRefId: string | null | undefined, property: 'model' | 'firmwareVersion'): InfrastructurePropertyScope {
  const label = infrastructureReferenceDataLabel(referenceData, manufacturerRefId)
  return `manufacturer.${normalizeReferenceLabel(label || 'unassigned')}.${property}` as InfrastructurePropertyScope
}

export function infrastructureReferenceDataParentId(record: ReferenceDataRecord): string | null {
  return record.parentReferenceId ?? record.versionNumberId ?? null
}

export function infrastructureCategories(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  const order = INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS.map((group) => group.category)
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.active)
    .sort((first, second) => {
      const ordered = orderedLabelIndex(order, first.label) - orderedLabelIndex(order, second.label)
      return ordered || first.label.localeCompare(second.label, undefined, { sensitivity: 'base' })
    })
}

export function infrastructureTypesForCategory(referenceData: ReferenceDataRecord[], categoryRefId: string | null | undefined): ReferenceDataRecord[] {
  if (!categoryRefId) return []
  const categoryLabel = infrastructureReferenceDataLabel(referenceData, categoryRefId)
  const order = INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS.find((group) => normalizeReferenceLabel(group.category) === normalizeReferenceLabel(categoryLabel))?.types ?? []
  return referenceData
    .filter((record) =>
      record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
      record.active &&
      infrastructureReferenceDataParentId(record) === categoryRefId,
    )
    .sort((first, second) => {
      const ordered = orderedLabelIndex(order, first.label) - orderedLabelIndex(order, second.label)
      return ordered || first.label.localeCompare(second.label, undefined, { sensitivity: 'base' })
    })
}

export function infrastructureManufacturersForType(referenceData: ReferenceDataRecord[], typeRefId: string | null | undefined): ReferenceDataRecord[] {
  if (!typeRefId) return []
  return referenceData
    .filter((record) =>
      record.referenceType === INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE &&
      record.active &&
      infrastructureReferenceDataParentId(record) === typeRefId,
    )
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
}

export function infrastructureOwners(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_OWNER_REFERENCE_TYPE && record.active)
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
}

export function infrastructureBillingMethods(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE && record.active)
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
}

export function infrastructureItemTypeLabel(item: InfrastructureItem, referenceData: ReferenceDataRecord[]): string {
  return infrastructureReferenceDataLabel(referenceData, item.typeRefId)
}

export function isInfrastructureItemType(item: InfrastructureItem, referenceData: ReferenceDataRecord[], typeLabel: string): boolean {
  return normalizeReferenceLabel(infrastructureItemTypeLabel(item, referenceData)) === normalizeReferenceLabel(typeLabel)
}

export function infrastructureDomainName(item: InfrastructureItem): string {
  return text(item.properties?.domainName).trim()
}

export function infrastructureDomainLinkLabel(item: InfrastructureItem): string {
  const businessId = text(item.infrastructureId).trim()
  const domainName = infrastructureDomainName(item)
  if (businessId && domainName) return `${businessId}-${domainName}`
  return businessId || domainName || '-'
}

export function infrastructureItemRelationshipLabel(item: InfrastructureItem): string {
  const businessId = text(item.infrastructureId).trim()
  const identifier = text(item.identifier).trim()
  if (businessId && identifier) return `${businessId}-${identifier}`
  return businessId || identifier || '-'
}

export function esxiInfrastructureItems(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  currentLinkedEsxiId = '',
): InfrastructureItem[] {
  return items
    .filter((item) => isInfrastructureItemType(item, referenceData, 'ESXi'))
    .filter((item) => item.operationalStatus !== 'Obsolete' || item.id === currentLinkedEsxiId)
    .sort((first, second) => first.infrastructureId.localeCompare(second.infrastructureId, undefined, { numeric: true, sensitivity: 'base' }))
}

export function linkedServersForEsxi(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  esxiItemId: string,
): InfrastructureItem[] {
  if (!esxiItemId) return []
  return items
    .filter((item) => isInfrastructureItemType(item, referenceData, 'Server'))
    .filter((item) => text(item.properties?.linkedEsxiInfrastructureItemId) === esxiItemId)
    .sort((first, second) => first.infrastructureId.localeCompare(second.infrastructureId, undefined, { numeric: true, sensitivity: 'base' }))
}

export function linkedServersDisplayForEsxi(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  esxiItemId: string,
): string {
  const linkedServers = linkedServersForEsxi(items, referenceData, esxiItemId)
  return linkedServers.length > 0 ? linkedServers.map(infrastructureItemRelationshipLabel).join(' ; ') : '-'
}

export function linkedSslsForDomain(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  domainItemId: string,
): InfrastructureItem[] {
  if (!domainItemId) return []
  return items
    .filter((item) => isInfrastructureItemType(item, referenceData, 'SSL'))
    .filter((item) => text(item.properties?.linkedDomainInfrastructureItemId) === domainItemId)
    .sort((first, second) => first.infrastructureId.localeCompare(second.infrastructureId, undefined, { numeric: true, sensitivity: 'base' }))
}

export function linkedSslsDisplayForDomain(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  domainItemId: string,
): string {
  const linkedSsls = linkedSslsForDomain(items, referenceData, domainItemId)
  return linkedSsls.length > 0 ? linkedSsls.map(infrastructureItemRelationshipLabel).join(' ; ') : '-'
}

export function linkedDomainItemsForSsl(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  _currentSslItemId: string,
  _currentLinkedDomainId = '',
): InfrastructureItem[] {
  return items
    .filter((item) => isInfrastructureItemType(item, referenceData, 'Domain'))
    .sort((first, second) => first.infrastructureId.localeCompare(second.infrastructureId, undefined, { numeric: true, sensitivity: 'base' }))
}

export function infrastructureWarrantyTypes(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE && record.active)
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
}

export function infrastructureMaintenanceTaskTypes(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_MAINTENANCE_TASK_TYPE_REFERENCE_TYPE && record.active)
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
}

export function infrastructurePropertyValues(referenceData: ReferenceDataRecord[], scope: string): ReferenceDataRecord[] {
  return referenceData
    .filter((record) =>
      record.referenceType === INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE &&
      record.active &&
      infrastructureReferenceDataParentId(record) === scope,
    )
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { numeric: true, sensitivity: 'base' }))
}

export function infrastructureReferenceDataLabel(referenceData: ReferenceDataRecord[], id: string | null | undefined): string {
  if (!id) return ''
  return referenceData.find((record) => record.id === id)?.label ?? ''
}

export function ensureInfrastructureReferenceData(referenceData: ReferenceDataRecord[], now = new Date().toISOString()): ReferenceDataRecord[] {
  let next = [...referenceData]
  const legacyDomainCategory = next.find((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.normalizedLabel === normalizeReferenceLabel('Domain'))
  const networkCategory = next.find((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.normalizedLabel === normalizeReferenceLabel('Network'))
  if (legacyDomainCategory && !networkCategory) {
    next = next.map((record) =>
      record.id === legacyDomainCategory.id
        ? {
            ...record,
            label: 'Network',
            normalizedLabel: normalizeReferenceLabel('Network'),
            updatedAt: now,
            updatedBy: 'System',
          }
        : record,
    )
  } else if (legacyDomainCategory && networkCategory) {
    next = next.map((record) => {
      if (record.id === legacyDomainCategory.id) {
        return { ...record, active: false, updatedAt: now, updatedBy: 'System' }
      }
      if (record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE && infrastructureReferenceDataParentId(record) === legacyDomainCategory.id) {
        return { ...record, parentReferenceId: networkCategory.id, versionNumberId: networkCategory.id, updatedAt: now, updatedBy: 'System' }
      }
      return record
    })
  }
  const cloudCategory = next.find((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.normalizedLabel === normalizeReferenceLabel('Cloud'))
  const legacyOpenVpnType = next.find((record) =>
    record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
    record.normalizedLabel === normalizeReferenceLabel('Open VPN') &&
    (!cloudCategory || infrastructureReferenceDataParentId(record) === cloudCategory.id),
  )
  const vpnType = next.find((record) =>
    record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
    record.normalizedLabel === normalizeReferenceLabel('VPN') &&
    (!cloudCategory || infrastructureReferenceDataParentId(record) === cloudCategory.id),
  )
  if (legacyOpenVpnType && !vpnType) {
    next = next.map((record) =>
      record.id === legacyOpenVpnType.id
        ? {
            ...record,
            label: 'VPN',
            normalizedLabel: normalizeReferenceLabel('VPN'),
            active: true,
            updatedAt: now,
            updatedBy: 'System',
          }
        : record,
    )
  }

  function appendReference(referenceType: string, label: string, parentReferenceId: string | null, prefix: string): ReferenceDataRecord {
    const existing = next.find((record) =>
      record.referenceType === referenceType &&
      record.normalizedLabel === normalizeReferenceLabel(label) &&
      infrastructureReferenceDataParentId(record) === parentReferenceId,
    )
    if (existing) {
      if (existing.active) return existing
      const reactivated = { ...existing, active: true, updatedAt: now, updatedBy: 'System' }
      next = next.map((record) => record.id === existing.id ? reactivated : record)
      return reactivated
    }
    const record: ReferenceDataRecord = {
      id: `${prefix}${String(next.filter((candidate) => candidate.referenceType === referenceType).length + 1).padStart(6, '0')}`,
      referenceType: referenceType as ReferenceDataRecord['referenceType'],
      parentReferenceId,
      versionNumberId: parentReferenceId,
      label: referenceDataLabel(label),
      normalizedLabel: normalizeReferenceLabel(label),
      active: true,
      createdAt: now,
      createdBy: 'System',
      updatedAt: now,
      updatedBy: 'System',
    }
    next = [...next, record]
    return record
  }

  INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS.forEach((group) => {
    const normalizedCategory = normalizeReferenceLabel(group.category)
    let category = next.find((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.normalizedLabel === normalizedCategory)
    if (!category) {
      category = {
        id: `IC${String(next.filter((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE).length + 1).padStart(6, '0')}`,
        referenceType: INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE,
        parentReferenceId: null,
        versionNumberId: null,
        label: referenceDataLabel(group.category),
        normalizedLabel: normalizedCategory,
        active: true,
        createdAt: now,
        createdBy: 'System',
        updatedAt: now,
        updatedBy: 'System',
      }
      next = [...next, category]
    }
    group.types.forEach((type) => {
      if (!category) return
      const typeRecord = appendReference(INFRASTRUCTURE_TYPE_REFERENCE_TYPE, type, category.id, 'ITY')
      ;(INFRASTRUCTURE_MANUFACTURER_DEFAULTS[type] ?? []).forEach((manufacturer) => {
        appendReference(INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE, manufacturer, typeRecord.id, 'IM')
      })
    })
  })
  INFRASTRUCTURE_OWNER_DEFAULTS.forEach((owner) => appendReference(INFRASTRUCTURE_OWNER_REFERENCE_TYPE, owner, null, 'IO'))
  INFRASTRUCTURE_BILLING_METHOD_DEFAULTS.forEach((method) => appendReference(INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE, method, null, 'IBM'))
  INFRASTRUCTURE_WARRANTY_TYPE_DEFAULTS.forEach((type) => appendReference(INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE, type, null, 'IWT'))
  Object.entries(INFRASTRUCTURE_PROPERTY_DEFAULTS).forEach(([scope, values]) => {
    values.forEach((value) => appendReference(INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE, value, scope, 'IPV'))
  })
  HP_SERVER_MODEL_DEFAULTS.forEach((value) => appendReference(INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE, value, 'manufacturer.hp.model', 'IPV'))
  next = next.map((record) => {
    if (record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE) {
      return APPROVED_INFRASTRUCTURE_CATEGORY_LABELS.has(record.normalizedLabel)
        ? record
        : { ...record, active: false, updatedAt: now, updatedBy: 'System' }
    }
    if (record.referenceType !== INFRASTRUCTURE_TYPE_REFERENCE_TYPE) return record
    const categoryLabel = infrastructureReferenceDataLabel(next, infrastructureReferenceDataParentId(record))
    const allowedTypes = APPROVED_INFRASTRUCTURE_TYPE_LABELS_BY_CATEGORY.get(normalizeReferenceLabel(categoryLabel))
    return allowedTypes?.has(record.normalizedLabel)
      ? record
      : { ...record, active: false, updatedAt: now, updatedBy: 'System' }
  })
  return next
}

export function normalizeMaintenanceRecurrence(
  value: unknown,
  fallbackSeriesId: string | null = null,
  fallbackStartDate: string | null = null,
): InfrastructureMaintenanceRecurrence {
  const raw = isRecord(value) ? value : {}
  const frequency = ['daily', 'weekly', 'monthly', 'yearly'].includes(text(raw.frequency))
    ? text(raw.frequency) as InfrastructureMaintenanceRecurrence['frequency']
    : 'none'
  const interval = Math.max(1, numberOrNull(raw.interval) ?? 1)
  const endType = ['after', 'by'].includes(text(raw.endType))
    ? text(raw.endType) as InfrastructureMaintenanceRecurrence['endType']
    : 'none'
  const weeklyWeekdays = Array.isArray(raw.weeklyWeekdays)
    ? raw.weeklyWeekdays.map((day) => text(day)).filter((day): day is NonNullable<InfrastructureMaintenanceRecurrence['weeklyWeekdays']>[number] =>
        ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(day),
      )
    : []

  return {
    frequency,
    seriesId: frequency === 'none' ? null : text(raw.seriesId) || fallbackSeriesId || `infrastructure-maintenance-series-${crypto.randomUUID()}`,
    interval,
    startDate: text(raw.startDate) || fallbackStartDate || null,
    endType,
    endAfterOccurrences: numberOrNull(raw.endAfterOccurrences),
    endByDate: text(raw.endByDate) || null,
    dailyMode: text(raw.dailyMode) === 'weekday' ? 'weekday' : 'interval',
    weeklyWeekdays,
    monthlyMode: text(raw.monthlyMode) === 'relative' ? 'relative' : 'day',
    monthlyDay: numberOrNull(raw.monthlyDay),
    monthlyOrdinal: ['first', 'second', 'third', 'fourth', 'last'].includes(text(raw.monthlyOrdinal)) ? text(raw.monthlyOrdinal) as InfrastructureMaintenanceRecurrence['monthlyOrdinal'] : 'first',
    monthlyRelativeDay: normalizeRelativeDay(raw.monthlyRelativeDay),
    yearlyMode: text(raw.yearlyMode) === 'relative' ? 'relative' : 'date',
    yearlyMonth: numberOrNull(raw.yearlyMonth),
    yearlyDay: numberOrNull(raw.yearlyDay),
    yearlyOrdinal: ['first', 'second', 'third', 'fourth', 'last'].includes(text(raw.yearlyOrdinal)) ? text(raw.yearlyOrdinal) as InfrastructureMaintenanceRecurrence['yearlyOrdinal'] : 'first',
    yearlyRelativeDay: normalizeRelativeDay(raw.yearlyRelativeDay),
    generatedThroughDate: text(raw.generatedThroughDate) || null,
  }
}

function normalizeRelativeDay(value: unknown): InfrastructureMaintenanceRecurrence['monthlyRelativeDay'] {
  const normalized = text(value)
  return ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'day', 'weekday', 'weekend-day'].includes(normalized)
    ? normalized as InfrastructureMaintenanceRecurrence['monthlyRelativeDay']
    : 'monday'
}

function normalizeMaintenanceTask(
  record: Partial<InfrastructureMaintenanceTask> & Record<string, unknown>,
  index: number,
  now: string,
  existingTaskIds: Array<string | null | undefined> = [],
): InfrastructureMaintenanceTask {
  const status = INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.includes(record.taskStatus as InfrastructureMaintenanceTaskStatus)
    ? record.taskStatus as InfrastructureMaintenanceTaskStatus
    : 'Open'
  const recurrence = normalizeMaintenanceRecurrence(record.recurrence, text(record.recurrenceSeriesId) || null, text(record.startDate) || null)
  return {
    id: text(record.id) || `infrastructure-maintenance-${crypto.randomUUID()}`,
    taskId: normalizeInfrastructureMaintenanceTaskId(record.taskId, existingTaskIds, index),
    taskTypeRefId: text(record.taskTypeRefId),
    task: text(record.task),
    startDate: text(record.startDate) || null,
    dueDate: text(record.dueDate) || null,
    location: text(record.location),
    taskStatus: status,
    completionDate: status === 'Done' ? text(record.completionDate) || businessDate(new Date(now)) : null,
    recurrence,
    recurrenceSeriesId: recurrence.seriesId,
    recurrenceOccurrenceDate: text(record.recurrenceOccurrenceDate) || null,
    recurrenceDefinitionTaskId: text(record.recurrenceDefinitionTaskId) || null,
    createdAt: text(record.createdAt) || now,
    createdBy: text(record.createdBy) || 'System',
    updatedAt: text(record.updatedAt) || now,
    updatedBy: text(record.updatedBy) || 'System',
  }
}

export function normalizeInfrastructureMaintenanceTasks(
  tasks: InfrastructureMaintenanceTask[] | undefined,
  now = new Date().toISOString(),
  existingTaskIds: Array<string | null | undefined> = [],
): InfrastructureMaintenanceTask[] {
  const usedTaskIds = [...existingTaskIds.map((id) => text(id).trim()).filter(Boolean)]
  return (Array.isArray(tasks) ? tasks : []).map((task, index) => {
    const normalized = normalizeMaintenanceTask(task as Partial<InfrastructureMaintenanceTask> & Record<string, unknown>, index, now, usedTaskIds)
    usedTaskIds.push(normalized.taskId)
    return normalized
  })
}

export function createInfrastructureMaintenanceTask(tasks: InfrastructureMaintenanceTask[], now = new Date().toISOString()): InfrastructureMaintenanceTask {
  return normalizeMaintenanceTask({
    id: `infrastructure-maintenance-${crypto.randomUUID()}`,
    taskId: reserveBusinessId('infrastructureMaintenanceTask', tasks.map((task) => task.taskId)),
    taskTypeRefId: '',
    task: '',
    startDate: null,
    dueDate: null,
    location: '',
    taskStatus: 'Open',
    completionDate: null,
    createdAt: now,
    createdBy: 'Demo User',
    updatedAt: now,
    updatedBy: 'Demo User',
  }, tasks.length, now, tasks.map((task) => task.taskId))
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.valueOf()) ? null : date
}

function dateOnly(value: Date): string {
  return businessDate(value)
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value)
  next.setDate(next.getDate() + days)
  return next
}

function addMonthsClamped(value: Date, months: number): Date {
  const next = new Date(value)
  const day = next.getDate()
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  const maxDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
  next.setDate(Math.min(day, maxDay))
  return next
}

function addYearsClamped(value: Date, years: number): Date {
  return addMonthsClamped(value, years * 12)
}

export function infrastructureMaintenanceTaskIsActive(task: Pick<InfrastructureMaintenanceTask, 'taskStatus'>): boolean {
  return task.taskStatus !== 'Done'
}

export function recurrenceSummary(recurrence: InfrastructureMaintenanceRecurrence | null | undefined): string {
  if (!recurrence || recurrence.frequency === 'none') return 'Does not repeat'
  const every = recurrence.interval > 1 ? `Every ${recurrence.interval} ` : 'Every '
  const end = recurrence.endType === 'after' && recurrence.endAfterOccurrences
    ? `, ${recurrence.endAfterOccurrences} occurrences`
    : recurrence.endType === 'by' && recurrence.endByDate
      ? `, until ${recurrence.endByDate}`
      : ', no end date'
  if (recurrence.frequency === 'daily') return recurrence.dailyMode === 'weekday' ? `Every weekday${end}` : `${every}${recurrence.interval > 1 ? 'days' : 'day'}${end}`
  if (recurrence.frequency === 'weekly') return `${every}${recurrence.interval > 1 ? 'weeks' : 'week'}${recurrence.weeklyWeekdays?.length ? ` on ${recurrence.weeklyWeekdays.join(', ')}` : ''}${end}`
  if (recurrence.frequency === 'monthly') return recurrence.monthlyMode === 'relative'
    ? `${every}${recurrence.interval > 1 ? 'months' : 'month'} on the ${recurrence.monthlyOrdinal} ${recurrence.monthlyRelativeDay}${end}`
    : `${every}${recurrence.interval > 1 ? 'months' : 'month'} on day ${recurrence.monthlyDay ?? ''}${end}`
  return recurrence.yearlyMode === 'relative'
    ? `Every year on the ${recurrence.yearlyOrdinal} ${recurrence.yearlyRelativeDay} of month ${recurrence.yearlyMonth ?? ''}${end}`
    : `Every year on ${recurrence.yearlyMonth ?? ''}/${recurrence.yearlyDay ?? ''}${end}`
}

function nextSimpleOccurrenceDate(current: Date, recurrence: InfrastructureMaintenanceRecurrence): Date {
  if (recurrence.frequency === 'daily') {
    if (recurrence.dailyMode === 'weekday') {
      let next = addDays(current, 1)
      while (next.getDay() === 0 || next.getDay() === 6) next = addDays(next, 1)
      return next
    }
    return addDays(current, recurrence.interval)
  }
  if (recurrence.frequency === 'weekly') return addDays(current, recurrence.interval * 7)
  if (recurrence.frequency === 'monthly') return addMonthsClamped(current, recurrence.interval)
  if (recurrence.frequency === 'yearly') return addYearsClamped(current, recurrence.interval)
  return current
}

const WEEKDAY_INDEX_BY_RECURRENCE_DAY: Record<NonNullable<InfrastructureMaintenanceRecurrence['weeklyWeekdays']>[number], number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

function recurrenceWeekIndex(start: Date, date: Date): number {
  const startDay = new Date(start)
  startDay.setHours(0, 0, 0, 0)
  const currentDay = new Date(date)
  currentDay.setHours(0, 0, 0, 0)
  return Math.floor((currentDay.getTime() - startDay.getTime()) / (7 * 86_400_000))
}

function weeklyOccurrenceDates(start: Date, maxDate: Date, recurrence: InfrastructureMaintenanceRecurrence, maxOccurrences: number): Date[] {
  const selectedWeekdays = new Set((recurrence.weeklyWeekdays ?? []).map((day) => WEEKDAY_INDEX_BY_RECURRENCE_DAY[day]))
  if (selectedWeekdays.size === 0) return []
  const dates: Date[] = []
  let cursor = new Date(start)
  while (cursor <= maxDate && dates.length < maxOccurrences) {
    const weekIndex = recurrenceWeekIndex(start, cursor)
    if (weekIndex >= 0 && weekIndex % recurrence.interval === 0 && selectedWeekdays.has(cursor.getDay())) {
      dates.push(new Date(cursor))
    }
    cursor = addDays(cursor, 1)
  }
  return dates
}

export function generateInfrastructureMaintenanceOccurrences(
  draft: InfrastructureMaintenanceTask,
  existingTasks: InfrastructureMaintenanceTask[],
  now = new Date().toISOString(),
): InfrastructureMaintenanceTask[] {
  const recurrence = normalizeMaintenanceRecurrence(draft.recurrence, draft.recurrenceSeriesId, draft.startDate)
  if (recurrence.frequency === 'none') return [draft]
  const start = parseDateOnly(recurrence.startDate ?? draft.startDate)
  if (!start) return [draft]
  const due = parseDateOnly(draft.dueDate) ?? start
  const durationDays = Math.max(0, Math.round((due.getTime() - (parseDateOnly(draft.startDate) ?? start).getTime()) / 86_400_000))
  const horizon = addMonthsClamped(new Date(), 12)
  const endByDate = recurrence.endType === 'by' ? parseDateOnly(recurrence.endByDate) : null
  const maxDate = endByDate && endByDate < horizon ? endByDate : horizon
  const maxOccurrences = recurrence.endType === 'after'
    ? Math.max(1, recurrence.endAfterOccurrences ?? 1)
    : 370
  const seriesId = recurrence.seriesId ?? `infrastructure-maintenance-series-${crypto.randomUUID()}`
  const existingKeys = new Set(existingTasks.map((task) => `${task.recurrenceSeriesId ?? ''}:${task.recurrenceOccurrenceDate ?? ''}`))
  const generated: InfrastructureMaintenanceTask[] = []
  const usedIds = existingTasks.map((task) => task.taskId)
  const occurrenceDates = recurrence.frequency === 'weekly'
    ? weeklyOccurrenceDates(start, maxDate, recurrence, maxOccurrences)
    : (() => {
        const dates: Date[] = []
        let occurrenceDate = start
        while (dates.length < maxOccurrences && occurrenceDate <= maxDate) {
          dates.push(new Date(occurrenceDate))
          occurrenceDate = nextSimpleOccurrenceDate(occurrenceDate, recurrence)
        }
        return dates
      })()

  occurrenceDates.forEach((occurrenceDate, occurrenceCount) => {
    const occurrenceDateText = dateOnly(occurrenceDate)
    const key = `${seriesId}:${occurrenceDateText}`
    if (!existingKeys.has(key) || occurrenceDateText === draft.recurrenceOccurrenceDate || draft.recurrenceOccurrenceDate == null) {
      const taskId = occurrenceCount === 0 ? draft.taskId : reserveBusinessId('infrastructureMaintenanceTask', [...usedIds, ...generated.map((task) => task.taskId)])
      generated.push(normalizeMaintenanceTask({
        ...draft,
        id: occurrenceCount === 0 ? draft.id : `infrastructure-maintenance-${crypto.randomUUID()}`,
        taskId,
        startDate: occurrenceDateText,
        dueDate: dateOnly(addDays(occurrenceDate, durationDays)),
        taskStatus: occurrenceCount === 0 ? draft.taskStatus : 'Open',
        completionDate: occurrenceCount === 0 ? draft.completionDate : null,
        recurrence: { ...recurrence, seriesId, generatedThroughDate: dateOnly(maxDate) },
        recurrenceSeriesId: seriesId,
        recurrenceOccurrenceDate: occurrenceDateText,
        recurrenceDefinitionTaskId: draft.id,
        createdAt: occurrenceCount === 0 ? draft.createdAt : now,
        updatedAt: now,
      }, occurrenceCount, now, [...usedIds, ...generated.map((task) => task.taskId)]))
    }
  })
  return generated.length > 0 ? generated : [draft]
}

export function commitInfrastructureMaintenanceTask(
  draft: InfrastructureMaintenanceTask,
  previous: InfrastructureMaintenanceTask | undefined,
  now = new Date().toISOString(),
  user = 'Demo User',
): InfrastructureMaintenanceTask {
  const normalized = normalizeMaintenanceTask({ ...draft, updatedAt: now, updatedBy: user }, 0, now)
  const previousStatus = previous?.taskStatus ?? 'Open'
  if (previousStatus !== 'Done' && normalized.taskStatus === 'Done') {
    return { ...normalized, completionDate: businessDate(new Date(now)) }
  }
  if (previousStatus === 'Done' && normalized.taskStatus === 'Done') {
    return { ...normalized, completionDate: previous?.completionDate ?? normalized.completionDate }
  }
  if (previousStatus === 'Done' && normalized.taskStatus === 'Open') {
    return { ...normalized, completionDate: null }
  }
  return { ...normalized, completionDate: null }
}

export type InfrastructureMaintenanceAlert = '' | 'Planned' | 'Pending' | 'Overdue' | 'Delayed'

export function infrastructureMaintenanceAlert(task: Pick<InfrastructureMaintenanceTask, 'taskStatus' | 'startDate' | 'dueDate'>, today = new Date()): InfrastructureMaintenanceAlert {
  if (task.taskStatus === 'Done') return ''
  const due = dateTimestamp(task.dueDate)
  const now = todayTimestamp(today)
  if (due !== null && now > due) return 'Overdue'
  const start = dateTimestamp(task.startDate)
  if (start === null) return ''
  if (now > start) return 'Delayed'
  if (now >= start - (90 * 86_400_000)) return 'Pending'
  return 'Planned'
}

export const INFRASTRUCTURE_MAINTENANCE_ALERT_SEVERITY: Array<Exclude<InfrastructureMaintenanceAlert, ''>> = ['Delayed', 'Overdue', 'Pending', 'Planned']

export function infrastructureMaintenanceStatusesFromTasks(item: Pick<InfrastructureItem, 'maintenanceTasks'>, today = new Date()): Array<Exclude<InfrastructureMaintenanceAlert, ''>> {
  const alerts = new Set<Exclude<InfrastructureMaintenanceAlert, ''>>(
    (item.maintenanceTasks ?? [])
      .map((task) => infrastructureMaintenanceAlert(task, today))
      .filter((alert): alert is Exclude<InfrastructureMaintenanceAlert, ''> => Boolean(alert)),
  )
  return INFRASTRUCTURE_MAINTENANCE_ALERT_SEVERITY.filter((status) => alerts.has(status))
}

export function infrastructureLastMaintenanceDate(item: Pick<InfrastructureItem, 'maintenanceTasks'>): string | null {
  const latestActivity = (item.maintenanceTasks ?? [])
    .filter((task) => task.taskStatus === 'Done')
    .map((task) => text(task.completionDate))
    .filter(Boolean)
    .sort((first, second) => second.localeCompare(first))[0]
  return latestActivity || null
}

export function infrastructureMaintenanceStatusFromTasks(item: Pick<InfrastructureItem, 'maintenanceTasks'>): InfrastructureMaintenanceStatus {
  return infrastructureMaintenanceStatusesFromTasks(item)[0] ?? 'None'
}

function normalizeVmProperties(value: unknown): InfrastructureItemProperties['vms'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((vm) => {
    const raw = isRecord(vm) ? vm : {}
    const quantity = Math.max(1, numberOrNull(raw.quantity) ?? 1)
    const base = {
      vmTypeRefId: text(raw.vmTypeRefId),
      diskTypeRefId: text(raw.diskTypeRefId),
      diskSizeRefId: text(raw.diskSizeRefId),
      memoryTypeRefId: text(raw.memoryTypeRefId),
      memorySizeRefId: text(raw.memorySizeRefId),
      osVersionRefId: text(raw.osVersionRefId) || text(raw.operatingSystemRefId),
      rdmName: text(raw.rdmName),
    }
    return Array.from({ length: quantity }, (_, index) => ({
      id: index === 0 ? text(raw.id) || `vm-${crypto.randomUUID()}` : `vm-${crypto.randomUUID()}`,
      ...base,
    }))
  })
}

function normalizeTokenProperties(value: unknown, raw: Record<string, unknown>): InfrastructureItemProperties['tokens'] {
  if (Array.isArray(value)) {
    return value.map((token) => {
      const record = isRecord(token) ? token : {}
      return {
        id: text(record.id) || `token-${crypto.randomUUID()}`,
        tokenTypeRefId: text(record.tokenTypeRefId),
        serialNumber: text(record.serialNumber),
        licenseEndDate: text(record.licenseEndDate) || null,
      }
    })
  }
  const legacyHasToken = raw.fwToken === 'YES' || (numberOrNull(raw.fwTokenQuantity) ?? 0) > 0
  if (!legacyHasToken) return []
  const count = Math.max(1, numberOrNull(raw.fwTokenQuantity) ?? 1)
  return Array.from({ length: count }, () => ({
    id: `token-${crypto.randomUUID()}`,
    tokenTypeRefId: '',
    serialNumber: '',
    licenseEndDate: null,
  }))
}

function normalizeInfrastructureProperties(item: Partial<InfrastructureItem> & Record<string, unknown>): InfrastructureItemProperties {
  const raw = isRecord(item.properties) ? item.properties : {}
  return {
    manufacturerRefId: text(raw.manufacturerRefId) || text(item.manufacturerRefId),
    hardwareTypeRefId: text(raw.hardwareTypeRefId),
    modelRefId: text(raw.modelRefId),
    modelText: text(raw.modelText) || text(item.model),
    firmwareVersionRefId: text(raw.firmwareVersionRefId),
    firmwareLastUpdatedDate: text(raw.firmwareLastUpdatedDate) || null,
    esxiVersionRefId: text(raw.esxiVersionRefId),
    esxiLastUpdatedDate: text(raw.esxiLastUpdatedDate) || null,
    linkedEsxiInfrastructureItemId: text(raw.linkedEsxiInfrastructureItemId),
    memoryTypeRefId: text(raw.memoryTypeRefId),
    memorySizeRefId: text(raw.memorySizeRefId),
    memoryQuantity: numberOrNull(raw.memoryQuantity),
    cpuTypeRefId: text(raw.cpuTypeRefId),
    cpuQuantity: numberOrNull(raw.cpuQuantity),
    disks: Array.isArray(raw.disks)
      ? raw.disks.map((disk) => ({
          id: text((disk as Record<string, unknown>).id) || `disk-${crypto.randomUUID()}`,
          diskTypeRefId: text((disk as Record<string, unknown>).diskTypeRefId),
          quantity: numberOrNull((disk as Record<string, unknown>).quantity),
        }))
      : [],
    vms: normalizeVmProperties(raw.vms),
    fortiManager: raw.fortiManager === 'YES' || raw.fortiManager === 'NO' ? raw.fortiManager : '',
    rackmount: raw.rackmount === 'YES' || raw.rackmount === 'NO' ? raw.rackmount : raw.firewallKit === 'YES' || raw.firewallKit === 'NO' ? raw.firewallKit : '',
    tokens: normalizeTokenProperties(raw.tokens, raw),
    domainProviderRefId: text(raw.domainProviderRefId),
    domainTypeRefId: text(raw.domainTypeRefId),
    domainName: text(raw.domainName),
    sslProviderRefId: text(raw.sslProviderRefId),
    sslTypeRefId: text(raw.sslTypeRefId),
    sslVersionRefId: text(raw.sslVersionRefId),
    sslVersion: text(raw.sslVersion),
    linkedDomainInfrastructureItemId: text(raw.linkedDomainInfrastructureItemId),
    vpnTypeRefId: text(raw.vpnTypeRefId),
    vpnLicenseCount: numberOrNull(raw.vpnLicenseCount),
  }
}

function normalizeInfrastructureWarranties(
  item: Partial<InfrastructureItem> & Record<string, unknown>,
  existingWarrantyIds: Array<string | null | undefined> = [],
): TenantWarranty[] {
  if (Array.isArray(item.warranties)) {
    return item.warranties.length > 0
      ? normalizeInfrastructureWarrantyCollection(
          item.warranties.map((warranty, index) => normalizeInfrastructureWarrantyRecord(warranty as Partial<TenantWarranty>, index, item)),
          existingWarrantyIds,
        )
      : [defaultInfrastructureWarranty(item, existingWarrantyIds)]
  }

  const hasLegacyWarranty =
    Boolean(text(item.warrantyTypeRefId)) ||
    Boolean(text(item.initialWarrantyStartDate)) ||
    Boolean(text(item.currentWarrantyStartDate)) ||
    Boolean(text(item.currentWarrantyEndDate)) ||
    item.manualWarrantyStatus === 'NO_WARRANTY'

  if (!hasLegacyWarranty) return [defaultInfrastructureWarranty(item, existingWarrantyIds)]

  return [normalizeInfrastructureWarrantyRecord({
    id: `infrastructure-warranty-${crypto.randomUUID()}`,
    warrantyId: '',
    warrantyType: text(item.warrantyTypeRefId),
    startDate: text(item.currentWarrantyStartDate) || null,
    endDate: text(item.currentWarrantyEndDate) || null,
    noWarranty: item.manualWarrantyStatus === 'NO_WARRANTY' ? 'YES' : 'NO',
    remark: text((item.warrantyContact as InfrastructureWarrantyContact | undefined)?.address) || text(item.locationAddress),
  }, 0, item)]
}

function defaultInfrastructureWarranty(
  item: Partial<InfrastructureItem> & Record<string, unknown>,
  existingWarrantyIds: Array<string | null | undefined> = [],
): TenantWarranty {
  return normalizeInfrastructureWarrantyRecord({
    id: `infrastructure-warranty-${normalizeInfrastructureBusinessId(item.infrastructureId) || text(item.id) || 'default'}`,
    warrantyId: '',
    noWarranty: 'NO',
  }, 0, item, existingWarrantyIds)
}

function normalizeInfrastructureWarrantyRecord(
  warranty: Partial<TenantWarranty>,
  index: number,
  item: Partial<InfrastructureItem> & Record<string, unknown>,
  existingWarrantyIds: Array<string | null | undefined> = [],
): TenantWarranty {
  const normalized: TenantWarranty = {
    id: text(warranty.id) || `infrastructure-warranty-${crypto.randomUUID()}`,
    warrantyId: text(warranty.warrantyId) || reserveBusinessId('warranty', existingWarrantyIds, index),
    firstWarranty: index === 0,
    predecessor: '',
    successor: '',
    accountId: '',
    relatedProjectId: '',
    warrantyType: '',
    warrantySubType: '',
    opportunityId: '',
    initialWarrantyDate: text(warranty.initialWarrantyDate) || null,
    startDate: text(warranty.startDate) || text(item.currentWarrantyStartDate) || null,
    endDate: text(warranty.endDate) || text(item.currentWarrantyEndDate) || null,
    durationDays: null,
    daysBeforeExpiration: null,
    warrantyStatus: 'NOT_SET',
    noWarranty: warranty.noWarranty === 'YES' ? 'YES' : 'NO',
    outOfContract: 'NO',
    alerts: '',
    remark: text(warranty.remark),
  }
  return normalizeInfrastructureWarrantyCollection([normalized], existingWarrantyIds)[0]
}

export function createInfrastructureWarranty(warranties: TenantWarranty[]): TenantWarranty {
  return {
    id: `infrastructure-warranty-${crypto.randomUUID()}`,
    warrantyId: reserveBusinessId('warranty', warranties.map((warranty) => warranty.warrantyId)),
    firstWarranty: warranties.length === 0,
    predecessor: '',
    successor: '',
    accountId: '',
    relatedProjectId: '',
    warrantyType: '',
    warrantySubType: '',
    opportunityId: '',
    initialWarrantyDate: null,
    startDate: null,
    endDate: null,
    durationDays: null,
    daysBeforeExpiration: null,
    warrantyStatus: 'NOT_SET',
    noWarranty: 'NO',
    outOfContract: 'NO',
    alerts: '',
    remark: '',
  }
}

export function normalizeInfrastructureWarrantyCollection(
  warranties: TenantWarranty[],
  existingWarrantyIds: Array<string | null | undefined> = [],
): TenantWarranty[] {
  const usedWarrantyIds = new Set(existingWarrantyIds.map(text).filter(Boolean))
  const normalizedWarranties = warranties.map((warranty, index) => {
    const currentWarrantyId = text(warranty.warrantyId)
    const isDuplicate = currentWarrantyId && usedWarrantyIds.has(currentWarrantyId)
    const warrantyId = currentWarrantyId && !isDuplicate
      ? currentWarrantyId
      : reserveBusinessId('warranty', Array.from(usedWarrantyIds), index)
    usedWarrantyIds.add(warrantyId)
    return { ...warranty, warrantyId }
  })
  const readModel = warrantyCollectionReadModel(normalizedWarranties, '')
  return readModel.map((row, index) => ({
    ...row.warranty,
    firstWarranty: index === 0,
    accountId: '',
    relatedProjectId: '',
    warrantySubType: '',
    warrantyType: '',
    opportunityId: '',
    initialWarrantyDate: row.warranty.initialWarrantyDate ?? null,
    predecessor: '',
    successor: '',
    durationDays: daysBetween(row.warranty.startDate, row.warranty.endDate),
    daysBeforeExpiration: daysBeforeExpiration(row.warranty.endDate),
    warrantyStatus: row.generatedStatus,
    alerts: warrantyAlertForStatus(row.generatedStatus),
  }))
}

export function currentInfrastructureWarranty(item: InfrastructureItem): TenantWarranty | null {
  const warranties = normalizeInfrastructureWarrantyCollection(item.warranties ?? [])
  return warranties.find((warranty) => warranty.warrantyStatus !== 'RENEWED') ?? warranties[warranties.length - 1] ?? null
}

export function createInfrastructureDraft(now = new Date().toISOString(), infrastructureId = ''): InfrastructureItem {
  return {
    id: `infrastructure-${crypto.randomUUID()}`,
    infrastructureId,
    identifier: '',
    normalizedIdentifier: '',
    categoryRefId: '',
    typeRefId: '',
    manufacturerRefId: '',
    model: '',
    lastUpdatedDate: null,
    owner: 'Penlink',
    ownerRefId: '',
    billingMethodRefId: '',
    operationalStatus: 'Active',
    maintenanceStatus: 'None',
    linkedSystemIds: [],
    initialWarrantyStartDate: null,
    currentWarrantyStartDate: null,
    currentWarrantyEndDate: null,
    warrantyTypeRefId: '',
    manualWarrantyStatus: '',
    warrantyContact: { ...EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT },
    locationAddress: '',
    properties: { disks: [], vms: [] },
    maintenanceTasks: [],
    warranties: [],
    remarks: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeInfrastructureItem(
  item: Partial<InfrastructureItem> & Record<string, unknown>,
  existingMaintenanceTaskIds: Array<string | null | undefined> = [],
  existingWarrantyIds: Array<string | null | undefined> = [],
): InfrastructureItem {
  const now = new Date().toISOString()
  const identifier = text(item.identifier).trim()
  const legacyPhysicalAddress = text(item.physicalAddress)
  const warrantyContact = {
    ...EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT,
    ...(typeof item.warrantyContact === 'object' && item.warrantyContact ? item.warrantyContact as InfrastructureWarrantyContact : {}),
  }
  const properties = normalizeInfrastructureProperties(item)
  const warranties = normalizeInfrastructureWarranties(item, existingWarrantyIds)
  const maintenanceTasks = normalizeInfrastructureMaintenanceTasks(item.maintenanceTasks, now, existingMaintenanceTaskIds)
  const currentWarranty = normalizeInfrastructureWarrantyCollection(warranties).find((warranty) => warranty.warrantyStatus !== 'RENEWED') ?? warranties[warranties.length - 1]
  return {
    id: text(item.id) || `infrastructure-${crypto.randomUUID()}`,
    infrastructureId: normalizeInfrastructureBusinessId(item.infrastructureId),
    identifier,
    normalizedIdentifier: text(item.normalizedIdentifier) || normalizeInfrastructureIdentifier(identifier),
    categoryRefId: text(item.categoryRefId),
    typeRefId: text(item.typeRefId),
    manufacturerRefId: properties.manufacturerRefId ?? '',
    model: properties.modelText ?? '',
    lastUpdatedDate: text(item.lastUpdatedDate) || null,
    owner: (text(item.owner) as InfrastructureOwner | '') || 'Penlink',
    ownerRefId: text(item.ownerRefId),
    billingMethodRefId: text(item.billingMethodRefId),
    operationalStatus: INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.includes(item.operationalStatus as InfrastructureOperationalStatus) ? item.operationalStatus as InfrastructureOperationalStatus : 'Active',
    maintenanceStatus: infrastructureMaintenanceStatusFromTasks({ maintenanceTasks }),
    linkedSystemIds: Array.isArray(item.linkedSystemIds) ? item.linkedSystemIds.map(text).filter(Boolean) : [],
    initialWarrantyStartDate: text(item.initialWarrantyStartDate) || currentWarranty?.startDate || null,
    currentWarrantyStartDate: (currentWarranty?.startDate ?? text(item.currentWarrantyStartDate)) || null,
    currentWarrantyEndDate: (currentWarranty?.endDate ?? text(item.currentWarrantyEndDate)) || null,
    warrantyTypeRefId: text(item.warrantyTypeRefId),
    manualWarrantyStatus: item.manualWarrantyStatus === 'NO_WARRANTY' || item.manualWarrantyStatus === 'OBSOLETE' ? item.manualWarrantyStatus : '',
    warrantyContact,
    locationAddress: text(item.locationAddress) || warrantyContact.address || legacyPhysicalAddress,
    properties,
    maintenanceTasks,
    warranties: normalizeInfrastructureWarrantyCollection(warranties, existingWarrantyIds),
    remarks: Array.isArray(item.remarks) ? item.remarks : [],
    documents: Array.isArray(item.documents) ? item.documents : [],
    createdAt: text(item.createdAt) || now,
    updatedAt: text(item.updatedAt) || now,
  }
}

export function normalizeInfrastructureItemsForReferenceData(
  items: Array<Partial<InfrastructureItem> & Record<string, unknown>>,
  referenceData: ReferenceDataRecord[],
): InfrastructureItem[] {
  const cloudCategory = referenceData.find((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.normalizedLabel === normalizeReferenceLabel('Cloud'))
  const vpnType = referenceData.find((record) =>
    record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
    record.normalizedLabel === normalizeReferenceLabel('VPN') &&
    (!cloudCategory || infrastructureReferenceDataParentId(record) === cloudCategory.id),
  )
  const legacyOpenVpnTypeIds = new Set(
    referenceData
      .filter((record) =>
        record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
        record.normalizedLabel === normalizeReferenceLabel('Open VPN') &&
        (!cloudCategory || infrastructureReferenceDataParentId(record) === cloudCategory.id),
      )
      .map((record) => record.id),
  )
  const usedMaintenanceTaskIds: string[] = []
  const usedWarrantyIds: string[] = []
  return items.map((item) => {
    const normalized = normalizeInfrastructureItem(item, usedMaintenanceTaskIds, usedWarrantyIds)
    usedMaintenanceTaskIds.push(...(normalized.maintenanceTasks ?? []).map((task) => task.taskId))
    usedWarrantyIds.push(...(normalized.warranties ?? []).map((warranty) => warranty.warrantyId))
    return vpnType && legacyOpenVpnTypeIds.has(normalized.typeRefId)
      ? { ...normalized, typeRefId: vpnType.id, updatedAt: normalized.updatedAt }
      : normalized
  })
}

export function infrastructureWarrantyStatusFromCollection(item: InfrastructureItem): InfrastructureWarrantyStatus {
  const warranties = normalizeInfrastructureWarrantyCollection(item.warranties ?? [])
  if (warranties.length === 0) return 'NOT_SET'
  return warrantyHeaderStatusReadModel(warranties, '').visualStatus as InfrastructureWarrantyStatus
}

export function infrastructureMaintenanceStatus(lastUpdatedDate: string | null | undefined, today = new Date()): InfrastructureMaintenanceStatus {
  const updated = dateTimestamp(lastUpdatedDate)
  if (updated === null) return 'Not Set Yet'
  const ageDays = Math.floor((todayTimestamp(today) - updated) / 86_400_000)
  if (ageDays < 0) return 'Planned'
  if (ageDays > 365) return 'Expired'
  if (ageDays >= 275) return 'Pending'
  return 'Current'
}

export function infrastructureDaysBeforeExpiration(item: Pick<InfrastructureItem, 'currentWarrantyEndDate' | 'manualWarrantyStatus'>, today = new Date()): number | null {
  if (item.manualWarrantyStatus === 'NO_WARRANTY' || item.manualWarrantyStatus === 'OBSOLETE') return null
  const end = dateTimestamp(item.currentWarrantyEndDate)
  if (end === null) return null
  return Math.ceil((end - todayTimestamp(today)) / 86_400_000)
}

export function infrastructureDaysBeforeExpirationFromCollection(item: InfrastructureItem, today = new Date()): number | null {
  const warranty = currentInfrastructureWarranty(item)
  if (!warranty) return infrastructureDaysBeforeExpiration(item, today)
  if (warranty.noWarranty === 'YES') return null
  return daysBeforeExpiration(warranty.endDate)
}

export function infrastructureWarrantyAlert(item: InfrastructureItem, today = new Date()): string {
  const status = infrastructureWarrantyStatusFromCollection(item)
  if (status === 'NO_WARRANTY' || status === 'OBSOLETE' || status === 'NOT_SET' || status === 'PLANNED') return ''
  const days = infrastructureDaysBeforeExpirationFromCollection(item, today)
  if (status === 'EXPIRED' || (days !== null && days < 0)) return 'Expired'
  if (status === 'PENDING' || (days !== null && days <= 90)) return 'Pending'
  return ''
}

export function infrastructureWarrantyContactDisplay(contact: InfrastructureWarrantyContact): string {
  return [contact.name, contact.email, contact.phone].map((value) => value.trim()).filter(Boolean).join('; ')
}

export function allSystemRecords(
  systems: System[],
  productionSystemInventory: ProductionSystemInventoryItem[],
  reusedInternalSystems: ReusedInternalSystem[],
): Array<System | ProductionSystemInventoryItem | ReusedInternalSystem> {
  return [...systems, ...productionSystemInventory, ...reusedInternalSystems]
}

export function linkedSystemBusinessIds(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
): string[] {
  return linkedSystemsForInfrastructureItem(item, systems)
    .map(systemBusinessId)
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}

function linkedSystemsForInfrastructureItem(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
): Array<System | ProductionSystemInventoryItem | ReusedInternalSystem> {
  const linkedIds = new Set(item.linkedSystemIds.map((id) => id.trim()).filter(Boolean))
  return systems.filter((system) => linkedIds.has(system.id) || linkedIds.has(systemBusinessId(system)))
}

export function linkedSystemProducts(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
): string[] {
  return Array.from(new Set(linkedSystemsForInfrastructureItem(item, systems)
    .map((system) => system.productType?.trim())
    .filter((value): value is string => Boolean(value))))
    .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }))
}

function linkedSidTidDisplay(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[],
): string {
  const linkedSystems = linkedSystemsForInfrastructureItem(item, systems)
    .sort((first, second) => systemBusinessId(first).localeCompare(systemBusinessId(second), undefined, { numeric: true, sensitivity: 'base' }))

  if (linkedSystems.length === 0) return '-'

  return linkedSystems
    .map((system) => {
      const tids = Array.from(new Set(
        tenants
          .filter((tenant) => tenantIsActivelyHostedBySystem(tenant, system.id))
          .map((tenant) => tenant.tid)
          .filter(Boolean),
      ))
        .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
      return `${systemBusinessId(system)}-${tids.join(',')}`
    })
    .join('; ')
}

function daysLeftUntil(endDate: string, today = new Date()): number {
  const end = dateTimestamp(endDate)
  if (end === null) return 0
  return Math.max(0, Math.ceil((end - todayTimestamp(today)) / 86_400_000))
}

function completeCalendarMonthsLeftUntil(endDate: string, today = new Date()): number {
  const end = dateTimestamp(endDate)
  if (end === null || end < todayTimestamp(today)) return 0
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const target = new Date(`${endDate}T00:00:00`)
  let months = (target.getFullYear() - current.getFullYear()) * 12 + target.getMonth() - current.getMonth()
  if (target.getDate() < current.getDate()) months -= 1
  return Math.max(0, months)
}

function latestTenantWarrantyForInfrastructureItem(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[],
): Pick<InfrastructureDashboardRow, 'latestExpiringTenantId' | 'latestTenantWarrantyEndDate' | 'latestExpiringTenantAccountName' | 'tidWarrantyMonthsLeft' | 'tidWarrantyDaysLeft'> {
  const linkedSystemIdSet = new Set(linkedSystemsForInfrastructureItem(item, systems).map((system) => system.id))
  const candidates = tenants
    .filter((tenant) => Array.from(linkedSystemIdSet).some((systemId) => tenantIsActivelyHostedBySystem(tenant, systemId)))
    .flatMap((tenant) => {
      const latestEndDate = (tenant.warranties ?? [])
        .map((warranty) => warranty.endDate)
        .filter((endDate): endDate is string => dateTimestamp(endDate) !== null)
        .sort((first, second) => (dateTimestamp(second) ?? 0) - (dateTimestamp(first) ?? 0))[0]
      return latestEndDate ? [{ tid: tenant.tid, accountName: tenant.accountName, endDate: latestEndDate }] : []
    })
    .sort((first, second) =>
      (dateTimestamp(second.endDate) ?? 0) - (dateTimestamp(first.endDate) ?? 0) ||
      first.tid.localeCompare(second.tid, undefined, { numeric: true, sensitivity: 'base' }),
    )

  const selected = candidates[0]
  if (!selected) {
    return {
      latestExpiringTenantId: '',
      latestTenantWarrantyEndDate: '',
      latestExpiringTenantAccountName: '',
      tidWarrantyMonthsLeft: null,
      tidWarrantyDaysLeft: null,
    }
  }

  return {
    latestExpiringTenantId: selected.tid,
    latestTenantWarrantyEndDate: selected.endDate,
    latestExpiringTenantAccountName: selected.accountName,
    tidWarrantyMonthsLeft: completeCalendarMonthsLeftUntil(selected.endDate),
    tidWarrantyDaysLeft: daysLeftUntil(selected.endDate),
  }
}

function linkedTenantsForInfrastructureItem(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[],
): Tenant[] {
  const linkedSystemIdSet = new Set(linkedSystemsForInfrastructureItem(item, systems).map((system) => system.id))
  return tenants
    .filter((tenant) => Array.from(linkedSystemIdSet).some((systemId) => tenantIsActivelyHostedBySystem(tenant, systemId)))
    .sort((first, second) => first.tid.localeCompare(second.tid, undefined, { numeric: true, sensitivity: 'base' }))
}

function uniqueJoined(values: string[]): string {
  return Array.from(new Set(values.map((value) => text(value).trim()).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
    .join('; ')
}

export function infrastructureMaintenanceDashboardRows(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[] = [],
  accounts: Account[] = [],
  today = new Date(),
): InfrastructureMaintenanceDashboardRow[] {
  return items.flatMap((item) => {
    const linkedSystems = linkedSystemsForInfrastructureItem(item, systems)
    const linkedTenants = linkedTenantsForInfrastructureItem(item, systems, tenants)
    const accountNameById = new Map(accounts.map((account) => [account.id, account.accountName]))
    const accountCodeById = new Map(accounts.map((account) => [account.id, account.accountCode]))
    const tenantDisplay = uniqueJoined(linkedTenants.map((tenant) => tenant.tid))
    const customerDisplay = uniqueJoined(linkedTenants.map((tenant) => accountNameById.get(tenant.accountId) || tenant.accountName))
    const accountDisplay = uniqueJoined(linkedTenants.map((tenant) => accountCodeById.get(tenant.accountId) || tenant.accountId))
    const regionDisplay = uniqueJoined(linkedSystems.map((system) => {
      if ('region' in system && system.region) return system.region
      if ('usedInRegion' in system && system.usedInRegion) return system.usedInRegion
      return system.cognitoRegion ?? ''
    }))

    return (item.maintenanceTasks ?? []).map((task) => ({
      id: `${item.id}-${task.id}`,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      taskId: task.taskId,
      taskType: infrastructureReferenceDataLabel(referenceData, task.taskTypeRefId),
      description: task.task,
      taskStatus: task.taskStatus,
      location: task.location,
      recurrenceSummary: recurrenceSummary(task.recurrence),
      infrastructureItemId: item.infrastructureId,
      infrastructureItemName: item.identifier,
      infrastructureType: infrastructureReferenceDataLabel(referenceData, item.typeRefId),
      region: regionDisplay,
      customer: customerDisplay,
      account: accountDisplay,
      tenant: tenantDisplay,
      startDate: task.startDate ?? '',
      dueDate: task.dueDate ?? '',
      alert: infrastructureMaintenanceAlert(task, today),
      daysRunning: dateOnlyDaysBetween(task.startDate, today),
    }))
  })
}

export function plannedInfrastructureMaintenanceDashboardRows(rows: InfrastructureMaintenanceDashboardRow[], today = new Date()): InfrastructureMaintenanceDashboardRow[] {
  const now = todayTimestamp(today)
  return rows
    .filter((row) => row.taskStatus !== 'Done' && row.startDate && (dateTimestamp(row.startDate) ?? 0) > now)
    .sort((first, second) =>
      first.startDate.localeCompare(second.startDate) ||
      first.dueDate.localeCompare(second.dueDate) ||
      first.infrastructureItemId.localeCompare(second.infrastructureItemId, undefined, { numeric: true, sensitivity: 'base' }),
    )
}

export function currentInfrastructureMaintenanceDashboardRows(rows: InfrastructureMaintenanceDashboardRow[], today = new Date()): InfrastructureMaintenanceDashboardRow[] {
  const now = todayTimestamp(today)
  return rows
    .filter((row) => row.taskStatus !== 'Done' && row.startDate && (dateTimestamp(row.startDate) ?? Number.MAX_SAFE_INTEGER) <= now)
    .sort((first, second) =>
      first.startDate.localeCompare(second.startDate) ||
      first.dueDate.localeCompare(second.dueDate) ||
      first.infrastructureItemId.localeCompare(second.infrastructureItemId, undefined, { numeric: true, sensitivity: 'base' }),
    )
}

export function infrastructureDashboardRows(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[] = [],
): InfrastructureDashboardRow[] {
  return items
    .map((item) => {
      const linkedSystemIds = linkedSystemBusinessIds(item, systems)
      const currentWarranty = currentInfrastructureWarranty(item)
      const tenantWarranty = latestTenantWarrantyForInfrastructureItem(item, systems, tenants)
      return {
        ...item,
        categoryLabel: infrastructureReferenceDataLabel(referenceData, item.categoryRefId),
        typeLabel: infrastructureReferenceDataLabel(referenceData, item.typeRefId),
        manufacturerLabel: infrastructureReferenceDataLabel(referenceData, item.properties?.manufacturerRefId ?? item.manufacturerRefId),
        ownerLabel: infrastructureReferenceDataLabel(referenceData, item.ownerRefId) || item.owner,
        billingMethodLabel: infrastructureReferenceDataLabel(referenceData, item.billingMethodRefId),
        lastMaintenanceDate: infrastructureLastMaintenanceDate(item),
        maintenanceStatus: infrastructureMaintenanceStatusFromTasks(item),
        maintenanceStatuses: infrastructureMaintenanceStatusesFromTasks(item),
        productsDisplay: linkedSystemProducts(item, systems).join('; '),
        linkedSystemBusinessIds: linkedSystemIds,
        linkedSystemsDisplay: linkedSystemIds.join('; '),
        linkedSidTidDisplay: linkedSidTidDisplay(item, systems, tenants),
        warrantyStatus: infrastructureWarrantyStatusFromCollection(item),
        itemWarrantyDaysLeft: infrastructureDaysBeforeExpirationFromCollection(item),
        ...tenantWarranty,
        warrantyContactDisplay: infrastructureWarrantyContactDisplay(item.warrantyContact),
        initialWarrantyStartDate: item.initialWarrantyStartDate ?? currentWarranty?.startDate ?? null,
        currentWarrantyStartDate: currentWarranty?.startDate ?? item.currentWarrantyStartDate,
        currentWarrantyEndDate: currentWarranty?.endDate ?? item.currentWarrantyEndDate,
        model: infrastructureReferenceDataLabel(referenceData, item.properties?.modelRefId) || item.properties?.modelText || item.model,
      }
    })
    .sort((first, second) => first.infrastructureId.localeCompare(second.infrastructureId, undefined, { numeric: true, sensitivity: 'base' }))
}

export function infrastructureItemsForSystem(
  items: InfrastructureItem[],
  systemId: string,
  referenceData: ReferenceDataRecord[],
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[] = [],
): InfrastructureDashboardRow[] {
  return infrastructureDashboardRows(items.filter((item) => item.linkedSystemIds.includes(systemId)), referenceData, systems, tenants)
}

export function eligibleInfrastructureItemsForSystemLink(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
  tenants: Tenant[] = [],
): InfrastructureDashboardRow[] {
  return infrastructureDashboardRows(
    items.filter((item) => item.operationalStatus !== 'Obsolete'),
    referenceData,
    systems,
    tenants,
  )
}

export function infrastructureSystemReference(system: System | ProductionSystemInventoryItem | ReusedInternalSystem) {
  return systemReference(system)
}

export function validateInfrastructureItemDraft(
  draft: InfrastructureItem,
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
): string[] {
  const messages: string[] = []
  const identifier = draft.identifier.trim()
  const normalizedIdentifier = normalizeInfrastructureIdentifier(identifier)
  if (!draft.categoryRefId) messages.push('Category is required.')
  if (!draft.typeRefId) messages.push('Type is required.')
  if (!identifier) messages.push('Identifier is required.')
  if (!draft.owner && !draft.ownerRefId) messages.push('Owner is required.')
  if (draft.owner && !INFRASTRUCTURE_OWNER_OPTIONS.includes(draft.owner as InfrastructureOwner)) messages.push('Owner is invalid.')
  if (!INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.includes(draft.operationalStatus)) messages.push('Operational Status is invalid.')
  if (!INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS.includes(draft.maintenanceStatus)) messages.push('Maintenance Status is invalid.')
  if (draft.typeRefId && !infrastructureTypesForCategory(referenceData, draft.categoryRefId).some((type) => type.id === draft.typeRefId)) {
    messages.push('Type must belong to the selected Category.')
  }
  if (draft.properties?.manufacturerRefId && !infrastructureManufacturersForType(referenceData, draft.typeRefId).some((manufacturer) => manufacturer.id === draft.properties.manufacturerRefId)) {
    messages.push('Manufacturer must belong to the selected Type.')
  }
  const typeLabel = infrastructureReferenceDataLabel(referenceData, draft.typeRefId)
  if ((typeLabel === 'Server' || typeLabel === 'Storage Server') && (draft.properties?.memoryQuantity ?? 0) < 0) messages.push('Memory Quantity cannot be negative.')
  if ((typeLabel === 'Server' || typeLabel === 'Storage Server') && (draft.properties?.cpuQuantity ?? 0) < 0) messages.push('CPU Quantity cannot be negative.')
  if (isInfrastructureItemType(draft, referenceData, 'SSL') && draft.properties?.linkedDomainInfrastructureItemId) {
    const linkedDomainId = draft.properties.linkedDomainInfrastructureItemId
    const linkedDomain = items.find((item) => item.id === linkedDomainId)
    if (!linkedDomain || !isInfrastructureItemType(linkedDomain, referenceData, 'Domain')) {
      messages.push('Linked Domain must be a Network Domain Infrastructure Item.')
    }
  }
  if (isInfrastructureItemType(draft, referenceData, 'Server') && draft.properties?.linkedEsxiInfrastructureItemId) {
    const linkedEsxiId = draft.properties.linkedEsxiInfrastructureItemId
    const linkedEsxi = items.find((item) => item.id === linkedEsxiId)
    if (!linkedEsxi || !isInfrastructureItemType(linkedEsxi, referenceData, 'ESXi')) {
      messages.push('Linked ESXi must be a Software ESXi Infrastructure Item.')
    }
  }
  ;(draft.properties?.disks ?? []).forEach((disk, index) => {
    if ((disk.quantity ?? 0) <= 0) messages.push(`Disk ${index + 1} Quantity must be greater than zero.`)
  })
  if (identifier && items.some((item) => item.id !== draft.id && item.normalizedIdentifier === normalizedIdentifier)) {
    messages.push('Identifier must be unique.')
  }
  if (draft.warrantyContact.email.trim() && (!draft.warrantyContact.email.includes('@') || /\s/.test(draft.warrantyContact.email))) {
    messages.push('Contact Person Email must be valid.')
  }
  if (draft.initialWarrantyStartDate && draft.currentWarrantyStartDate && draft.initialWarrantyStartDate > draft.currentWarrantyStartDate) {
    messages.push('Initial Warranty Start Date cannot be after Current Warranty Start Date.')
  }
  if (draft.currentWarrantyStartDate && draft.currentWarrantyEndDate && draft.currentWarrantyStartDate > draft.currentWarrantyEndDate) {
    messages.push('Current Warranty Start Date cannot be after Current Warranty End Date.')
  }
  return messages
}
