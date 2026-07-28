import type {
  InfrastructureItem,
  InfrastructureMaintenanceTask,
  InfrastructureMaintenanceTaskStatus,
  InfrastructureItemProperties,
  InfrastructureMaintenanceStatus,
  InfrastructureOperationalStatus,
  InfrastructureOwner,
  InfrastructureWarrantyContact,
  InfrastructureWarrantyStatus,
  TenantWarranty,
  ReferenceDataRecord,
  System,
  ProductionSystemInventoryItem,
  ReusedInternalSystem,
} from '@/data/seed.types'
import { normalizeReferenceLabel, referenceDataLabel } from '@/domain/reference-data'
import { systemBusinessId, systemReference } from '@/domain/business-reference'
import { daysBeforeExpiration, daysBetween, nextWarrantyId, warrantyAlertForStatus, warrantyCollectionReadModel, warrantyHeaderStatusReadModel } from '@/domain/warranty-collection'

export const INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE = 'INFRASTRUCTURE_CATEGORY'
export const INFRASTRUCTURE_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_TYPE'
export const INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE = 'INFRASTRUCTURE_MANUFACTURER'
export const INFRASTRUCTURE_OWNER_REFERENCE_TYPE = 'INFRASTRUCTURE_OWNER'
export const INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE = 'INFRASTRUCTURE_BILLING_METHOD'
export const INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_WARRANTY_TYPE'
export const INFRASTRUCTURE_PROPERTY_VALUE_REFERENCE_TYPE = 'INFRASTRUCTURE_PROPERTY_VALUE'
export const ADD_NEW_REFERENCE_OPTION = '__ADD_NEW__'

export const INFRASTRUCTURE_OWNER_OPTIONS: InfrastructureOwner[] = ['Penlink', 'Agent', 'Customer']
export const INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS: InfrastructureOperationalStatus[] = ['Active', 'Obsolete', 'Will Not Renew']
export const INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS: InfrastructureMaintenanceStatus[] = ['Not Set Yet', 'Planned', 'Current', 'Pending', 'Expired', 'No Warranty', 'Obsolete']
export const INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS: InfrastructureMaintenanceTaskStatus[] = ['Open', 'Done']

export const EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT: InfrastructureWarrantyContact = {
  name: '',
  email: '',
  phone: '',
  address: '',
}

export const INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS: Array<{ category: string; types: string[] }> = [
  { category: 'Hardware', types: ['Server', 'Storage Server', 'Firewall', 'Laptop'] },
  { category: 'Software', types: [] },
  { category: 'Cloud', types: ['Compute/Host', 'VPN'] },
  { category: 'Network', types: ['Domain'] },
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
  sslType: 'domain.sslType',
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
  warrantyStatus: InfrastructureWarrantyStatus
  itemWarrantyDaysLeft: number | null
  latestWarrantyTid: string
  latestWarrantyEndDate: string
  tidMonthsLeft: number | null
  tidDaysLeft: number | null
  warrantyContactDisplay: string
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

export function infrastructureWarrantyTypes(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE && record.active)
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

function normalizeMaintenanceTask(record: Partial<InfrastructureMaintenanceTask> & Record<string, unknown>, index: number, now: string): InfrastructureMaintenanceTask {
  const status = INFRASTRUCTURE_MAINTENANCE_TASK_STATUS_OPTIONS.includes(record.taskStatus as InfrastructureMaintenanceTaskStatus)
    ? record.taskStatus as InfrastructureMaintenanceTaskStatus
    : 'Open'
  return {
    id: text(record.id) || `infrastructure-maintenance-${crypto.randomUUID()}`,
    taskId: text(record.taskId) || `MT${String(index + 1).padStart(6, '0')}`,
    task: text(record.task),
    dueDate: text(record.dueDate) || null,
    taskStatus: status,
    completionDate: status === 'Done' ? text(record.completionDate) || businessDate(new Date(now)) : null,
    createdAt: text(record.createdAt) || now,
    createdBy: text(record.createdBy) || 'System',
    updatedAt: text(record.updatedAt) || now,
    updatedBy: text(record.updatedBy) || 'System',
  }
}

export function normalizeInfrastructureMaintenanceTasks(tasks: InfrastructureMaintenanceTask[] | undefined, now = new Date().toISOString()): InfrastructureMaintenanceTask[] {
  return (Array.isArray(tasks) ? tasks : []).map((task, index) => normalizeMaintenanceTask(task as Partial<InfrastructureMaintenanceTask> & Record<string, unknown>, index, now))
}

export function createInfrastructureMaintenanceTask(tasks: InfrastructureMaintenanceTask[], now = new Date().toISOString()): InfrastructureMaintenanceTask {
  return normalizeMaintenanceTask({
    id: `infrastructure-maintenance-${crypto.randomUUID()}`,
    taskId: `MT${String(tasks.length + 1).padStart(6, '0')}`,
    task: '',
    dueDate: null,
    taskStatus: 'Open',
    completionDate: null,
    createdAt: now,
    createdBy: 'Demo User',
    updatedAt: now,
    updatedBy: 'Demo User',
  }, tasks.length, now)
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

export function infrastructureMaintenanceAlert(task: Pick<InfrastructureMaintenanceTask, 'taskStatus' | 'dueDate'>, today = new Date()): '' | 'Pending' | 'Overdue' {
  if (task.taskStatus === 'Done' || !task.dueDate) return ''
  const due = dateTimestamp(task.dueDate)
  if (due === null) return ''
  const now = todayTimestamp(today)
  if (now > due) return 'Overdue'
  const pendingStart = due - (90 * 86_400_000)
  return now >= pendingStart ? 'Pending' : ''
}

export function infrastructureLastMaintenanceDate(item: Pick<InfrastructureItem, 'maintenanceTasks'>): string | null {
  const completedDates = (item.maintenanceTasks ?? [])
    .filter((task) => task.taskStatus === 'Done' && Boolean(task.completionDate))
    .map((task) => task.completionDate as string)
    .sort((first, second) => second.localeCompare(first))
  return completedDates[0] ?? null
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
    sslTypeRefId: text(raw.sslTypeRefId),
    sslVersion: text(raw.sslVersion),
    vpnTypeRefId: text(raw.vpnTypeRefId),
    vpnLicenseCount: numberOrNull(raw.vpnLicenseCount),
  }
}

function normalizeInfrastructureWarranties(item: Partial<InfrastructureItem> & Record<string, unknown>): TenantWarranty[] {
  if (Array.isArray(item.warranties)) {
    return item.warranties.map((warranty, index) => normalizeInfrastructureWarrantyRecord(warranty as Partial<TenantWarranty>, index, item))
  }

  const hasLegacyWarranty =
    Boolean(text(item.warrantyTypeRefId)) ||
    Boolean(text(item.initialWarrantyStartDate)) ||
    Boolean(text(item.currentWarrantyStartDate)) ||
    Boolean(text(item.currentWarrantyEndDate)) ||
    item.manualWarrantyStatus === 'NO_WARRANTY'

  if (!hasLegacyWarranty) return []

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

function normalizeInfrastructureWarrantyRecord(warranty: Partial<TenantWarranty>, index: number, item: Partial<InfrastructureItem> & Record<string, unknown>): TenantWarranty {
  const normalized: TenantWarranty = {
    id: text(warranty.id) || `infrastructure-warranty-${crypto.randomUUID()}`,
    warrantyId: text(warranty.warrantyId) || `W${String(index + 1).padStart(6, '0')}`,
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
  return normalizeInfrastructureWarrantyCollection([normalized])[0]
}

export function createInfrastructureWarranty(warranties: TenantWarranty[]): TenantWarranty {
  return {
    id: `infrastructure-warranty-${crypto.randomUUID()}`,
    warrantyId: nextWarrantyId(warranties),
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

export function normalizeInfrastructureWarrantyCollection(warranties: TenantWarranty[]): TenantWarranty[] {
  const readModel = warrantyCollectionReadModel(warranties, '')
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
    maintenanceStatus: 'Not Set Yet',
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

export function normalizeInfrastructureItem(item: Partial<InfrastructureItem> & Record<string, unknown>): InfrastructureItem {
  const now = new Date().toISOString()
  const identifier = text(item.identifier).trim()
  const legacyPhysicalAddress = text(item.physicalAddress)
  const warrantyContact = {
    ...EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT,
    ...(typeof item.warrantyContact === 'object' && item.warrantyContact ? item.warrantyContact as InfrastructureWarrantyContact : {}),
  }
  const properties = normalizeInfrastructureProperties(item)
  const warranties = normalizeInfrastructureWarranties(item)
  const maintenanceTasks = normalizeInfrastructureMaintenanceTasks(item.maintenanceTasks, now)
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
    maintenanceStatus: INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS.includes(item.maintenanceStatus as InfrastructureMaintenanceStatus) ? item.maintenanceStatus as InfrastructureMaintenanceStatus : 'Not Set Yet',
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
    warranties: normalizeInfrastructureWarrantyCollection(warranties),
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
  return items.map((item) => {
    const normalized = normalizeInfrastructureItem(item)
    return vpnType && legacyOpenVpnTypeIds.has(normalized.typeRefId)
      ? { ...normalized, typeRefId: vpnType.id, updatedAt: normalized.updatedAt }
      : normalized
  })
}

export function infrastructureWarrantyStatus(item: Pick<InfrastructureItem, 'manualWarrantyStatus' | 'currentWarrantyStartDate' | 'currentWarrantyEndDate'>, today = new Date()): InfrastructureWarrantyStatus {
  if (item.manualWarrantyStatus === 'NO_WARRANTY' || item.manualWarrantyStatus === 'OBSOLETE') return item.manualWarrantyStatus
  if (!item.currentWarrantyStartDate && !item.currentWarrantyEndDate) return 'NOT_SET'
  const start = dateTimestamp(item.currentWarrantyStartDate)
  const end = dateTimestamp(item.currentWarrantyEndDate)
  const todayValue = todayTimestamp(today)
  if (start !== null && start > todayValue) return 'PLANNED'
  if (end !== null && end < todayValue) return 'EXPIRED'
  if (end !== null && Math.ceil((end - todayValue) / 86_400_000) <= 90) return 'PENDING'
  return 'VALID'
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
  return item.linkedSystemIds
    .map((id) => systems.find((system) => system.id === id))
    .filter((system): system is System | ProductionSystemInventoryItem | ReusedInternalSystem => Boolean(system))
    .map(systemBusinessId)
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}

export function linkedSystemProducts(
  item: InfrastructureItem,
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
): string[] {
  return Array.from(new Set(item.linkedSystemIds
    .map((id) => systems.find((system) => system.id === id)?.productType?.trim())
    .filter((value): value is string => Boolean(value))))
    .sort((first, second) => first.localeCompare(second, undefined, { sensitivity: 'base' }))
}

export function infrastructureDashboardRows(
  items: InfrastructureItem[],
  referenceData: ReferenceDataRecord[],
  systems: Array<System | ProductionSystemInventoryItem | ReusedInternalSystem>,
): InfrastructureDashboardRow[] {
  return items
    .map((item) => {
      const linkedSystemIds = linkedSystemBusinessIds(item, systems)
      const currentWarranty = currentInfrastructureWarranty(item)
      return {
        ...item,
        categoryLabel: infrastructureReferenceDataLabel(referenceData, item.categoryRefId),
        typeLabel: infrastructureReferenceDataLabel(referenceData, item.typeRefId),
        manufacturerLabel: infrastructureReferenceDataLabel(referenceData, item.properties?.manufacturerRefId ?? item.manufacturerRefId),
        ownerLabel: infrastructureReferenceDataLabel(referenceData, item.ownerRefId) || item.owner,
        billingMethodLabel: infrastructureReferenceDataLabel(referenceData, item.billingMethodRefId),
        maintenanceStatus: item.maintenanceStatus,
        productsDisplay: linkedSystemProducts(item, systems).join('; '),
        linkedSystemBusinessIds: linkedSystemIds,
        linkedSystemsDisplay: linkedSystemIds.join('; '),
        warrantyStatus: infrastructureWarrantyStatusFromCollection(item),
        itemWarrantyDaysLeft: infrastructureDaysBeforeExpirationFromCollection(item),
        latestWarrantyTid: '',
        latestWarrantyEndDate: currentWarranty?.endDate ?? '',
        tidMonthsLeft: null,
        tidDaysLeft: null,
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
): InfrastructureDashboardRow[] {
  return infrastructureDashboardRows(items.filter((item) => item.linkedSystemIds.includes(systemId)), referenceData, systems)
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
