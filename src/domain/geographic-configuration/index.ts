import type { GeographicCountryRecord, GeographicUsStateRecord } from '@/data/seed.types'
import { GEOGRAPHIC_COUNTRY_SOURCE, GEOGRAPHIC_US_STATE_SOURCE } from './workbook-data'

export type GeographicConfigurationRegion = 'NA' | 'EMEA' | 'APAC' | 'LATAM'

export const GEOGRAPHIC_REGION_OPTIONS: GeographicConfigurationRegion[] = ['NA', 'EMEA', 'APAC', 'LATAM']
export const TIME_ZONE_PATTERN = /^UTC[+-]\d{2}:\d{2}$/

function normalizeKey(value: string | null | undefined): string {
  return String(value ?? '').trim().toLocaleLowerCase()
}

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
}

function canonicalCountryName(countryName: string | null | undefined): string {
  const key = normalizeKey(countryName)
  return COUNTRY_ALIASES[key] ?? String(countryName ?? '').trim()
}

function sortText(first: string, second: string): number {
  return first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' })
}

function fallbackCountryId(countryName: string): string {
  return `country-${normalizeKey(countryName).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

function fallbackStateId(state: string): string {
  return `us-state-${normalizeKey(state).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`
}

export function normalizeCountryLookups(records: GeographicCountryRecord[] | undefined): GeographicCountryRecord[] {
  const byName = new Map((records ?? []).map((record) => [normalizeKey(record.countryName), record]))
  return GEOGRAPHIC_COUNTRY_SOURCE.map((source) => {
    const current = byName.get(normalizeKey(source.countryName))
    return {
      ...source,
      ...(current ?? {}),
      id: current?.id?.trim() || source.id || fallbackCountryId(source.countryName),
      countryName: source.countryName,
      countryCodeName: String(current?.countryCodeName ?? source.countryCodeName).trim() || source.countryCodeName,
      region: GEOGRAPHIC_REGION_OPTIONS.includes(String(current?.region ?? source.region).trim().toLocaleUpperCase() as GeographicConfigurationRegion)
        ? String(current?.region ?? source.region).trim().toLocaleUpperCase()
        : source.region,
      timeZone: TIME_ZONE_PATTERN.test(String(current?.timeZone ?? source.timeZone).trim())
        ? String(current?.timeZone ?? source.timeZone).trim()
        : source.timeZone,
      active: current?.active !== false,
      updatedAt: current?.updatedAt,
    }
  })
}

export function normalizeUsStateLookups(records: GeographicUsStateRecord[] | undefined): GeographicUsStateRecord[] {
  const byName = new Map((records ?? []).map((record) => [normalizeKey(record.state), record]))
  return GEOGRAPHIC_US_STATE_SOURCE.map((source) => {
    const current = byName.get(normalizeKey(source.state))
    return {
      ...source,
      ...(current ?? {}),
      id: current?.id?.trim() || source.id || fallbackStateId(source.state),
      state: source.state,
      timeZone: TIME_ZONE_PATTERN.test(String(current?.timeZone ?? source.timeZone).trim())
        ? String(current?.timeZone ?? source.timeZone).trim()
        : source.timeZone,
      active: current?.active !== false,
      updatedAt: current?.updatedAt,
    }
  })
}

export function countryRecordForName(
  records: GeographicCountryRecord[],
  countryName: string | null | undefined,
): GeographicCountryRecord | undefined {
  const key = normalizeKey(canonicalCountryName(countryName))
  if (!key) return undefined
  return records.find((record) =>
    record.active &&
    (normalizeKey(record.countryName) === key || normalizeKey(record.countryCodeName) === key),
  )
}

export function usStateRecordForName(
  records: GeographicUsStateRecord[],
  state: string | null | undefined,
): GeographicUsStateRecord | undefined {
  const key = normalizeKey(state)
  if (!key) return undefined
  return records.find((record) => record.active && normalizeKey(record.state) === key)
}

export function countryTimeZoneForName(
  records: GeographicCountryRecord[],
  countryName: string | null | undefined,
): string {
  return countryRecordForName(records, countryName)?.timeZone ?? ''
}

export function usStateTimeZoneForName(
  records: GeographicUsStateRecord[],
  state: string | null | undefined,
): string {
  return usStateRecordForName(records, state)?.timeZone ?? ''
}

export function businessRegionForCountry(
  records: GeographicCountryRecord[],
  countryName: string | null | undefined,
): GeographicConfigurationRegion | '' {
  const region = countryRecordForName(records, countryName)?.region ?? ''
  return GEOGRAPHIC_REGION_OPTIONS.includes(region as GeographicConfigurationRegion)
    ? region as GeographicConfigurationRegion
    : ''
}

export function countryCodeNameForCountry(
  records: GeographicCountryRecord[],
  countryName: string | null | undefined,
): string {
  return countryRecordForName(records, countryName)?.countryCodeName ?? String(countryName ?? '').trim()
}

export function countryDisplayName(countryName: string | null | undefined): string {
  return countryCodeNameForCountry(GEOGRAPHIC_COUNTRY_SOURCE, countryName)
}

export function uniqueConfiguredTimeZones(
  countryRecords: GeographicCountryRecord[],
  stateRecords: GeographicUsStateRecord[],
): string[] {
  return Array.from(new Set([
    ...countryRecords.filter((record) => record.active).map((record) => record.timeZone),
    ...stateRecords.filter((record) => record.active).map((record) => record.timeZone),
  ].filter(Boolean))).sort(sortText)
}

export function countriesForTimeZones(
  records: GeographicCountryRecord[],
  timeZones: string[],
): string[] {
  const selected = new Set(timeZones.map((timeZone) => timeZone.trim()).filter(Boolean))
  return Array.from(new Set(records
    .filter((record) => record.active && selected.has(record.timeZone))
    .map((record) => record.countryName)))
    .sort(sortText)
}

export function usStatesForTimeZones(
  records: GeographicUsStateRecord[],
  timeZones: string[],
): string[] {
  const selected = new Set(timeZones.map((timeZone) => timeZone.trim()).filter(Boolean))
  return Array.from(new Set(records
    .filter((record) => record.active && selected.has(record.timeZone))
    .map((record) => record.state)))
    .sort(sortText)
}

export function validateCountryLookupRows(records: GeographicCountryRecord[]): string[] {
  const messages: string[] = []
  const countryNames = new Set<string>()
  const codeNames = new Set<string>()
  records.forEach((record) => {
    if (!record.countryName.trim()) messages.push('Country Name is required.')
    if (!record.countryCodeName.trim()) messages.push(`Country Code Name is required for ${record.countryName || record.id}.`)
    if (!GEOGRAPHIC_REGION_OPTIONS.includes(record.region as GeographicConfigurationRegion)) {
      messages.push(`Region ${record.region || '-'} is invalid for ${record.countryName || record.id}.`)
    }
    if (!TIME_ZONE_PATTERN.test(record.timeZone)) {
      messages.push(`Time Zone ${record.timeZone || '-'} is invalid for ${record.countryName || record.id}.`)
    }
    const countryKey = normalizeKey(record.countryName)
    if (countryKey && countryNames.has(countryKey)) messages.push(`Country Name ${record.countryName} is duplicated.`)
    if (countryKey) countryNames.add(countryKey)
    const codeKey = normalizeKey(record.countryCodeName)
    if (codeKey && codeNames.has(codeKey)) messages.push(`Country Code Name ${record.countryCodeName} is duplicated.`)
    if (codeKey) codeNames.add(codeKey)
  })
  return messages
}

export function validateUsStateLookupRows(records: GeographicUsStateRecord[]): string[] {
  const messages: string[] = []
  const states = new Set<string>()
  records.forEach((record) => {
    if (!record.state.trim()) messages.push('State is required.')
    if (!TIME_ZONE_PATTERN.test(record.timeZone)) messages.push(`Time Zone ${record.timeZone || '-'} is invalid for ${record.state || record.id}.`)
    const key = normalizeKey(record.state)
    if (key && states.has(key)) messages.push(`State ${record.state} is duplicated.`)
    if (key) states.add(key)
  })
  return messages
}

export { GEOGRAPHIC_COUNTRY_SOURCE, GEOGRAPHIC_US_STATE_SOURCE }
