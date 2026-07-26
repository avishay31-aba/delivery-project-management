import type {
  InfrastructureItem,
  InfrastructureMaintenanceStatus,
  InfrastructureOperationalStatus,
  InfrastructureOwner,
  InfrastructureWarrantyContact,
  InfrastructureWarrantyStatus,
  ReferenceDataRecord,
  System,
  ProductionSystemInventoryItem,
  ReusedInternalSystem,
} from '@/data/seed.types'
import { normalizeReferenceLabel, referenceDataLabel } from '@/domain/reference-data'
import { systemBusinessId, systemReference } from '@/domain/business-reference'

export const INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE = 'INFRASTRUCTURE_CATEGORY'
export const INFRASTRUCTURE_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_TYPE'
export const INFRASTRUCTURE_MANUFACTURER_REFERENCE_TYPE = 'INFRASTRUCTURE_MANUFACTURER'
export const INFRASTRUCTURE_OWNER_REFERENCE_TYPE = 'INFRASTRUCTURE_OWNER'
export const INFRASTRUCTURE_BILLING_METHOD_REFERENCE_TYPE = 'INFRASTRUCTURE_BILLING_METHOD'
export const INFRASTRUCTURE_WARRANTY_TYPE_REFERENCE_TYPE = 'INFRASTRUCTURE_WARRANTY_TYPE'

export const INFRASTRUCTURE_OWNER_OPTIONS: InfrastructureOwner[] = ['Penlink', 'Agent', 'Customer']
export const INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS: InfrastructureOperationalStatus[] = ['Active', 'Obsolete', 'Will Not Renew']
export const INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS: InfrastructureMaintenanceStatus[] = ['Not Set Yet', 'Planned', 'Current', 'Pending', 'Expired', 'No Warranty', 'Obsolete']

export const EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT: InfrastructureWarrantyContact = {
  name: '',
  email: '',
  phone: '',
  address: '',
}

export const INFRASTRUCTURE_REFERENCE_DATA_DEFAULTS: Array<{ category: string; types: string[] }> = [
  { category: 'Hardware', types: ['Server', 'Firewall', 'Firewall Kit', 'Laptop', 'Storage Server', 'FW Token', 'Disk'] },
  { category: 'Software', types: ['Windows Server Standard 2019', 'Linux Ubuntu 22.04', 'VMware vSphere 7 Essentials Plus Kit', 'ESXi', 'VM', 'OpenVPN License', 'Firmware'] },
  { category: 'Certificate', types: ['SSL'] },
  { category: 'Domain', types: ['Product Domain', 'Trapdoor Domain'] },
]

const INFRASTRUCTURE_MANUFACTURER_DEFAULTS: Record<string, string[]> = {
  Server: ['HP', 'Dell'],
  'Storage Server': ['HP', 'Dell'],
  Firewall: ['FortiGate', 'Palo Alto'],
  Laptop: ['Lenovo'],
  'FW Token': ['FortiGate'],
}

const INFRASTRUCTURE_OWNER_DEFAULTS = ['Penlink', 'Agent', 'Customer']
const INFRASTRUCTURE_BILLING_METHOD_DEFAULTS = ['One Time Payment', 'Recurring Payment']

export interface InfrastructureDashboardRow extends InfrastructureItem {
  categoryLabel: string
  typeLabel: string
  manufacturerLabel: string
  ownerLabel: string
  billingMethodLabel: string
  warrantyTypeLabel: string
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

function text(value: unknown): string {
  return value == null ? '' : String(value)
}

function normalizeInfrastructureBusinessId(value: unknown): string {
  const current = text(value).trim()
  const legacy = /^IT(\d+)$/i.exec(current)
  return legacy ? `I${legacy[1]}` : current
}

function dateTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  return Number.isNaN(parsed.valueOf()) ? null : parsed.getTime()
}

function todayTimestamp(today = new Date()): number {
  return new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
}

export function normalizeInfrastructureIdentifier(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function infrastructureReferenceDataParentId(record: ReferenceDataRecord): string | null {
  return record.parentReferenceId ?? record.versionNumberId ?? null
}

export function infrastructureCategories(referenceData: ReferenceDataRecord[]): ReferenceDataRecord[] {
  return referenceData
    .filter((record) => record.referenceType === INFRASTRUCTURE_CATEGORY_REFERENCE_TYPE && record.active)
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
}

export function infrastructureTypesForCategory(referenceData: ReferenceDataRecord[], categoryRefId: string | null | undefined): ReferenceDataRecord[] {
  if (!categoryRefId) return []
  return referenceData
    .filter((record) =>
      record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
      record.active &&
      infrastructureReferenceDataParentId(record) === categoryRefId,
    )
    .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }))
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

export function infrastructureReferenceDataLabel(referenceData: ReferenceDataRecord[], id: string | null | undefined): string {
  if (!id) return ''
  return referenceData.find((record) => record.id === id)?.label ?? ''
}

export function ensureInfrastructureReferenceData(referenceData: ReferenceDataRecord[], now = new Date().toISOString()): ReferenceDataRecord[] {
  let next = [...referenceData]
  function appendReference(referenceType: string, label: string, parentReferenceId: string | null, prefix: string): ReferenceDataRecord {
    const existing = next.find((record) =>
      record.referenceType === referenceType &&
      record.normalizedLabel === normalizeReferenceLabel(label) &&
      infrastructureReferenceDataParentId(record) === parentReferenceId,
    )
    if (existing) return existing
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
  return next
}

export function createInfrastructureDraft(now = new Date().toISOString()): InfrastructureItem {
  return {
    id: `infrastructure-${crypto.randomUUID()}`,
    infrastructureId: '',
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
  return {
    id: text(item.id) || `infrastructure-${crypto.randomUUID()}`,
    infrastructureId: normalizeInfrastructureBusinessId(item.infrastructureId),
    identifier,
    normalizedIdentifier: text(item.normalizedIdentifier) || normalizeInfrastructureIdentifier(identifier),
    categoryRefId: text(item.categoryRefId),
    typeRefId: text(item.typeRefId),
    manufacturerRefId: text(item.manufacturerRefId),
    model: text(item.model),
    lastUpdatedDate: text(item.lastUpdatedDate) || null,
    owner: (text(item.owner) as InfrastructureOwner | '') || 'Penlink',
    ownerRefId: text(item.ownerRefId),
    billingMethodRefId: text(item.billingMethodRefId),
    operationalStatus: INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.includes(item.operationalStatus as InfrastructureOperationalStatus) ? item.operationalStatus as InfrastructureOperationalStatus : 'Active',
    maintenanceStatus: infrastructureMaintenanceStatus(text(item.lastUpdatedDate) || null),
    linkedSystemIds: Array.isArray(item.linkedSystemIds) ? item.linkedSystemIds.map(text).filter(Boolean) : [],
    initialWarrantyStartDate: text(item.initialWarrantyStartDate) || null,
    currentWarrantyStartDate: text(item.currentWarrantyStartDate) || null,
    currentWarrantyEndDate: text(item.currentWarrantyEndDate) || null,
    warrantyTypeRefId: text(item.warrantyTypeRefId),
    manualWarrantyStatus: item.manualWarrantyStatus === 'NO_WARRANTY' || item.manualWarrantyStatus === 'OBSOLETE' ? item.manualWarrantyStatus : '',
    warrantyContact,
    locationAddress: text(item.locationAddress) || warrantyContact.address || legacyPhysicalAddress,
    remarks: Array.isArray(item.remarks) ? item.remarks : [],
    documents: Array.isArray(item.documents) ? item.documents : [],
    createdAt: text(item.createdAt) || now,
    updatedAt: text(item.updatedAt) || now,
  }
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

export function infrastructureWarrantyAlert(item: InfrastructureItem, today = new Date()): string {
  const status = infrastructureWarrantyStatus(item, today)
  if (status === 'NO_WARRANTY' || status === 'OBSOLETE' || status === 'NOT_SET' || status === 'PLANNED') return ''
  const days = infrastructureDaysBeforeExpiration(item, today)
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
      return {
        ...item,
        categoryLabel: infrastructureReferenceDataLabel(referenceData, item.categoryRefId),
        typeLabel: infrastructureReferenceDataLabel(referenceData, item.typeRefId),
        manufacturerLabel: infrastructureReferenceDataLabel(referenceData, item.manufacturerRefId),
        ownerLabel: infrastructureReferenceDataLabel(referenceData, item.ownerRefId) || item.owner,
        billingMethodLabel: infrastructureReferenceDataLabel(referenceData, item.billingMethodRefId),
        warrantyTypeLabel: infrastructureReferenceDataLabel(referenceData, item.warrantyTypeRefId),
        maintenanceStatus: infrastructureMaintenanceStatus(item.lastUpdatedDate),
        productsDisplay: linkedSystemProducts(item, systems).join('; '),
        linkedSystemBusinessIds: linkedSystemIds,
        linkedSystemsDisplay: linkedSystemIds.join('; '),
        warrantyStatus: infrastructureWarrantyStatus(item),
        itemWarrantyDaysLeft: infrastructureDaysBeforeExpiration(item),
        latestWarrantyTid: '',
        latestWarrantyEndDate: '',
        tidMonthsLeft: null,
        tidDaysLeft: null,
        warrantyContactDisplay: infrastructureWarrantyContactDisplay(item.warrantyContact),
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
  if (!draft.manufacturerRefId) messages.push('Manufacturer is required.')
  if (!draft.owner && !draft.ownerRefId) messages.push('Owner is required.')
  if (draft.owner && !INFRASTRUCTURE_OWNER_OPTIONS.includes(draft.owner as InfrastructureOwner)) messages.push('Owner is invalid.')
  if (!INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.includes(draft.operationalStatus)) messages.push('Operational Status is invalid.')
  if (!INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS.includes(draft.maintenanceStatus)) messages.push('Maintenance Status is invalid.')
  if (draft.typeRefId && !infrastructureTypesForCategory(referenceData, draft.categoryRefId).some((type) => type.id === draft.typeRefId)) {
    messages.push('Type must belong to the selected Category.')
  }
  if (draft.manufacturerRefId && !infrastructureManufacturersForType(referenceData, draft.typeRefId).some((manufacturer) => manufacturer.id === draft.manufacturerRefId)) {
    messages.push('Manufacturer must belong to the selected Type.')
  }
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
