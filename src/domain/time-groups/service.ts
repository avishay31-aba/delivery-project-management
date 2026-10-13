import type { AppDataState, GeographicCountryRecord, GeographicUsStateRecord, System, Tenant, TimeGroupLookupRecord } from '@/data/seed.types'
import { geographicTimeZoneDisplayValue } from '@/domain/geographic-time-zone'
import {
  GEOGRAPHIC_COUNTRY_SOURCE,
  GEOGRAPHIC_US_STATE_SOURCE,
  TIME_ZONE_PATTERN,
  countriesForTimeZones,
  usStatesForTimeZones,
} from '@/domain/geographic-configuration'
import { V1_3_TIME_GROUP_LOOKUP_SOURCE } from '@/domain/geographic-configuration/workbook-data'
import { tenantIsActivelyHostedBySystem } from '@/domain/tenant-operations/lifecycle'

export const TIME_GROUP_LOOKUP_SOURCE: TimeGroupLookupRecord[] = V1_3_TIME_GROUP_LOOKUP_SOURCE

function splitSemicolonValues(value: string | string[] | null | undefined): string[] {
  const values = Array.isArray(value) ? value : String(value ?? '').split(';')
  return values.map((candidate) => candidate.trim()).filter(Boolean)
}

export function joinSemicolonValues(values: string[]): string {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
    .join('; ')
}

export function deriveTimeGroupCountries(record: Pick<TimeGroupLookupRecord, 'timeZones'>, countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE): string[] {
  return countriesForTimeZones(countryRecords, record.timeZones)
}

export function deriveTimeGroupStates(record: Pick<TimeGroupLookupRecord, 'timeZones'>, stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE): string[] {
  return usStatesForTimeZones(stateRecords, record.timeZones)
}

export function withDerivedTimeGroupMembership(
  record: TimeGroupLookupRecord,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): TimeGroupLookupRecord {
  return {
    ...record,
    countries: deriveTimeGroupCountries(record, countryRecords),
    states: deriveTimeGroupStates(record, stateRecords),
  }
}

export function normalizeTimeGroupLookups(
  records: TimeGroupLookupRecord[] | undefined,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): TimeGroupLookupRecord[] {
  const byId = new Map((records ?? []).map((record) => [record.timeGroupId || record.id, record]))
  return TIME_GROUP_LOOKUP_SOURCE.map((source) => {
    const current = byId.get(source.timeGroupId) ?? byId.get(source.id)
    const normalized = current ? {
      ...source,
      timeGroup: String(current.timeGroup ?? source.timeGroup).trim() || source.timeGroup,
      timeZones: splitSemicolonValues(current.timeZones).length > 0 ? splitSemicolonValues(current.timeZones) : source.timeZones,
      active: current.active !== false,
      updatedAt: current.updatedAt,
    } : source
    return withDerivedTimeGroupMembership(normalized, countryRecords, stateRecords)
  })
}

export function validateTimeGroupLookupRows(records: TimeGroupLookupRecord[]): string[] {
  const messages: string[] = []
  const activeZones = new Map<string, TimeGroupLookupRecord>()

  function assertUnique(owner: Map<string, TimeGroupLookupRecord>, value: string, record: TimeGroupLookupRecord, label: 'Time Zone') {
    if (!record.active) return
    const previous = owner.get(value)
    if (previous && previous.timeGroupId !== record.timeGroupId) {
      messages.push(`${label} ${value} is already assigned to Time Group ${previous.timeGroup}.`)
      return
    }
    owner.set(value, record)
  }

  records.forEach((record) => {
    if (!record.timeGroup.trim()) messages.push(`Time Group is required for row ${record.timeGroupId}.`)
    if (record.timeZones.length === 0) messages.push(`Time Zone is required for row ${record.timeGroupId}.`)
    record.timeZones.forEach((timeZone) => {
      if (!TIME_ZONE_PATTERN.test(timeZone)) messages.push(`Time Zone ${timeZone} in row ${record.timeGroupId} is malformed.`)
      assertUnique(activeZones, timeZone, record, 'Time Zone')
    })
  })
  return messages
}

export function timeGroupForTimeZone(records: TimeGroupLookupRecord[], timeZone: string | null | undefined): string {
  const normalizedZone = String(timeZone ?? '').trim()
  if (!normalizedZone) return ''
  return records.find((record) => record.active && record.timeZones.includes(normalizedZone))?.timeGroup ?? ''
}

export function timeGroupFromLocation(
  records: TimeGroupLookupRecord[],
  country: string | null | undefined,
  state?: string | null,
  referenceDate?: string | null,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): { timeZone: string; timeGroup: string } {
  const timeZone = geographicTimeZoneDisplayValue(country, state, referenceDate, countryRecords, stateRecords)
  return { timeZone, timeGroup: timeGroupForTimeZone(records, timeZone) }
}

export function tenantTimeGroupFromLocation(
  tenant: Pick<Tenant, 'country'> & { state?: string; timeGroup?: string },
  records: TimeGroupLookupRecord[],
  referenceDate?: string | null,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): { timeZone: string; timeGroup: string; alert: string } {
  const { timeZone, timeGroup } = timeGroupFromLocation(records, tenant.country, tenant.state, referenceDate, countryRecords, stateRecords)
  return {
    timeZone,
    timeGroup,
    alert: timeZone && !timeGroup ? `No active Time Group mapping exists for Time Zone ${timeZone}.` : '',
  }
}

export function normalizeTenantTimeGroup(
  tenant: Tenant,
  records: TimeGroupLookupRecord[],
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): Tenant {
  const result = tenantTimeGroupFromLocation(tenant, records, undefined, countryRecords, stateRecords)
  return {
    ...tenant,
    timeGroup: result.timeGroup,
  }
}

export function tenantIsEligibleSystemTimeGroupGovernor(tenant: Pick<Tenant, 'tenantType'>): boolean {
  return tenant.tenantType === 'CUSTOMER' || tenant.tenantType === 'POC'
}

function activeHostingDateForTenant(tenant: Tenant, systemId: string): string {
  const activeHistory = (tenant.hostedSystemHistory ?? [])
    .filter((entry) => entry.systemId === systemId && entry.endedAt == null)
    .sort((first, second) => first.startedAt.localeCompare(second.startedAt))[0]
  return activeHistory?.startedAt || tenant.createdAt || ''
}

export function mostVeteranActiveTenantForSystem(systemId: string, tenants: Tenant[]): Tenant | undefined {
  return tenants
    .filter((tenant) =>
      tenantIsEligibleSystemTimeGroupGovernor(tenant) && tenantIsActivelyHostedBySystem(tenant, systemId),
    )
    .sort((first, second) => {
      const firstDate = activeHostingDateForTenant(first, systemId)
      const secondDate = activeHostingDateForTenant(second, systemId)
      if (firstDate !== secondDate) return firstDate.localeCompare(secondDate)
      return first.tid.localeCompare(second.tid, undefined, { numeric: true, sensitivity: 'base' })
    })[0]
}

export interface SystemTimeGroupSourceReadModel {
  timeGroup: string
  timeZone: string
  governorTenantId?: string
  tenant?: Tenant
  source: 'EXPLICIT' | 'VETERAN' | 'INVENTORY' | 'NONE'
}

/** The single authoritative source selection for System Time Group governance. */
export function systemTimeGroupSource(
  system: Pick<System, 'id' | 'timeGroup' | 'timeGroupGovernanceTenantId'>,
  tenants: Tenant[],
  records: TimeGroupLookupRecord[],
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): SystemTimeGroupSourceReadModel {
  const explicitGovernor = system.timeGroupGovernanceTenantId
    ? tenants.find((tenant) =>
        tenant.id === system.timeGroupGovernanceTenantId &&
        tenantIsEligibleSystemTimeGroupGovernor(tenant) &&
        tenantIsActivelyHostedBySystem(tenant, system.id),
      )
    : undefined
  const tenant = explicitGovernor ?? mostVeteranActiveTenantForSystem(system.id, tenants)
  if (!tenant) {
    return system.timeGroup
      ? { timeGroup: system.timeGroup, timeZone: '', source: 'INVENTORY' }
      : { timeGroup: '', timeZone: '', source: 'NONE' }
  }
  const derived = tenantTimeGroupFromLocation(tenant, records, undefined, countryRecords, stateRecords)
  return {
    timeGroup: derived.timeGroup,
    timeZone: derived.timeZone,
    governorTenantId: tenant.id,
    tenant,
    source: explicitGovernor ? 'EXPLICIT' : 'VETERAN',
  }
}

export function systemTimeGroupChangeMessage(systemIdLabel: string, previous: string, next: string, governorTenant?: Tenant): string {
  if (previous && next) {
    return `System ${systemIdLabel} Time Group changed from ${previous} to ${next}. The value is now derived from eligible Tenant ${governorTenant?.tid ?? '-'}.`
  }
  if (previous && !next) {
    return `System ${systemIdLabel} Time Group changed from ${previous} to empty because the System no longer has an active Customer/POC Tenant.`
  }
  return `System ${systemIdLabel} Time Group was set to ${next}, based on eligible Tenant ${governorTenant?.tid ?? '-'}.`
}

export function systemsWithDerivedTimeGroups<T extends System>(
  systems: T[],
  tenants: Tenant[],
  records: TimeGroupLookupRecord[],
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): T[] {
  return systems.map((system) => {
    const source = systemTimeGroupSource(system, tenants, records, countryRecords, stateRecords)
    return source.timeGroup === system.timeGroup && source.governorTenantId === system.timeGroupGovernanceTenantId
      ? system
      : { ...system, timeGroup: source.timeGroup, timeGroupGovernanceTenantId: source.governorTenantId }
  })
}

export function linkedSidsForTimeGroup(
  record: TimeGroupLookupRecord,
  systems: Array<System | AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number]>,
  tenants: Tenant[] = [],
  records: TimeGroupLookupRecord[] = [],
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): string[] {
  return Array.from(new Set(
    systems
      .filter((system) => {
        if (!('sid' in system)) return false
        return systemTimeGroupSource(system, tenants, records, countryRecords, stateRecords).timeGroup === record.timeGroup
      })
      .map((system) => ('sid' in system ? system.sid : 'machineId' in system ? system.machineId : ''))
      .filter((value): value is string => Boolean(value)),
  )).sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}

export function linkedTidsForTimeGroup(
  record: TimeGroupLookupRecord,
  tenants: Tenant[],
  records: TimeGroupLookupRecord[],
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  stateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): string[] {
  return Array.from(new Set(
    tenants
      .filter((tenant) => normalizeTenantTimeGroup(tenant, records, countryRecords, stateRecords).timeGroup === record.timeGroup)
      .map((tenant) => tenant.tid)
      .filter(Boolean),
  )).sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}
