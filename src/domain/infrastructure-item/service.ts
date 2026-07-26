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
  { category: 'Hardware', types: ['Server', 'Firewall', 'Firewall Kit', 'Laptop', 'Storage Server', 'FW Token'] },
  { category: 'Software', types: ['OpenVPN License', 'Windows Server Standard 2019', 'VMware vSphere 7 Essentials Plus Kit', 'ESXi'] },
  { category: 'Certificate', types: ['SSL'] },
  { category: 'Domain', types: ['Domain'] },
]

export interface InfrastructureDashboardRow extends InfrastructureItem {
  categoryLabel: string
  typeLabel: string
  productsDisplay: string
  linkedSystemBusinessIds: string[]
  linkedSystemsDisplay: string
  warrantyStatus: InfrastructureWarrantyStatus
  daysBeforeExpiration: number | null
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

export function infrastructureReferenceDataLabel(referenceData: ReferenceDataRecord[], id: string | null | undefined): string {
  if (!id) return ''
  return referenceData.find((record) => record.id === id)?.label ?? ''
}

export function ensureInfrastructureReferenceData(referenceData: ReferenceDataRecord[], now = new Date().toISOString()): ReferenceDataRecord[] {
  let next = [...referenceData]
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
      const normalizedType = normalizeReferenceLabel(type)
      const exists = next.some((record) =>
        record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE &&
        record.normalizedLabel === normalizedType &&
        infrastructureReferenceDataParentId(record) === category?.id,
      )
      if (!exists && category) {
        next = [
          ...next,
          {
            id: `ITY${String(next.filter((record) => record.referenceType === INFRASTRUCTURE_TYPE_REFERENCE_TYPE).length + 1).padStart(6, '0')}`,
            referenceType: INFRASTRUCTURE_TYPE_REFERENCE_TYPE,
            parentReferenceId: category.id,
            versionNumberId: category.id,
            label: referenceDataLabel(type),
            normalizedLabel: normalizedType,
            active: true,
            createdAt: now,
            createdBy: 'System',
            updatedAt: now,
            updatedBy: 'System',
          },
        ]
      }
    })
  })
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
    owner: '',
    operationalStatus: 'Active',
    maintenanceStatus: 'Not Set Yet',
    linkedSystemIds: [],
    initialWarrantyStartDate: null,
    currentWarrantyStartDate: null,
    currentWarrantyEndDate: null,
    manualWarrantyStatus: '',
    warrantyContact: { ...EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT },
    physicalAddress: '',
    remarks: [],
    documents: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function normalizeInfrastructureItem(item: Partial<InfrastructureItem> & Record<string, unknown>): InfrastructureItem {
  const now = new Date().toISOString()
  const identifier = text(item.identifier).trim()
  return {
    id: text(item.id) || `infrastructure-${crypto.randomUUID()}`,
    infrastructureId: normalizeInfrastructureBusinessId(item.infrastructureId),
    identifier,
    normalizedIdentifier: text(item.normalizedIdentifier) || normalizeInfrastructureIdentifier(identifier),
    categoryRefId: text(item.categoryRefId),
    typeRefId: text(item.typeRefId),
    owner: (text(item.owner) as InfrastructureOwner | '') || '',
    operationalStatus: INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.includes(item.operationalStatus as InfrastructureOperationalStatus) ? item.operationalStatus as InfrastructureOperationalStatus : 'Active',
    maintenanceStatus: INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS.includes(item.maintenanceStatus as InfrastructureMaintenanceStatus) ? item.maintenanceStatus as InfrastructureMaintenanceStatus : 'Not Set Yet',
    linkedSystemIds: Array.isArray(item.linkedSystemIds) ? item.linkedSystemIds.map(text).filter(Boolean) : [],
    initialWarrantyStartDate: text(item.initialWarrantyStartDate) || null,
    currentWarrantyStartDate: text(item.currentWarrantyStartDate) || null,
    currentWarrantyEndDate: text(item.currentWarrantyEndDate) || null,
    manualWarrantyStatus: item.manualWarrantyStatus === 'NO_WARRANTY' || item.manualWarrantyStatus === 'OBSOLETE' ? item.manualWarrantyStatus : '',
    warrantyContact: {
      ...EMPTY_INFRASTRUCTURE_WARRANTY_CONTACT,
      ...(typeof item.warrantyContact === 'object' && item.warrantyContact ? item.warrantyContact as InfrastructureWarrantyContact : {}),
    },
    physicalAddress: text(item.physicalAddress),
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
  return 'VALID'
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
  if (days !== null && days <= 90) return 'Pending'
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
        productsDisplay: linkedSystemProducts(item, systems).join('; '),
        linkedSystemBusinessIds: linkedSystemIds,
        linkedSystemsDisplay: linkedSystemIds.join('; '),
        warrantyStatus: infrastructureWarrantyStatus(item),
        daysBeforeExpiration: infrastructureDaysBeforeExpiration(item),
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
  if (!draft.owner) messages.push('Owner is required.')
  if (draft.owner && !INFRASTRUCTURE_OWNER_OPTIONS.includes(draft.owner as InfrastructureOwner)) messages.push('Owner is invalid.')
  if (!INFRASTRUCTURE_OPERATIONAL_STATUS_OPTIONS.includes(draft.operationalStatus)) messages.push('Operational Status is invalid.')
  if (!INFRASTRUCTURE_MAINTENANCE_STATUS_OPTIONS.includes(draft.maintenanceStatus)) messages.push('Maintenance Status is invalid.')
  if (draft.typeRefId && !infrastructureTypesForCategory(referenceData, draft.categoryRefId).some((type) => type.id === draft.typeRefId)) {
    messages.push('Type must belong to the selected Category.')
  }
  if (identifier && items.some((item) => item.id !== draft.id && item.normalizedIdentifier === normalizedIdentifier)) {
    messages.push('Identifier must be unique.')
  }
  if (draft.warrantyContact.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.warrantyContact.email.trim())) {
    messages.push('Warranty Contact Email must be valid.')
  }
  if (draft.initialWarrantyStartDate && draft.currentWarrantyStartDate && draft.initialWarrantyStartDate > draft.currentWarrantyStartDate) {
    messages.push('Initial Warranty Start Date cannot be after Current Warranty Start Date.')
  }
  if (draft.currentWarrantyStartDate && draft.currentWarrantyEndDate && draft.currentWarrantyStartDate > draft.currentWarrantyEndDate) {
    messages.push('Current Warranty Start Date cannot be after Current Warranty End Date.')
  }
  return messages
}
