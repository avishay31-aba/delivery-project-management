import type { GeographicCountryRecord, GeographicUsStateRecord } from '@/data/seed.types'
import {
  GEOGRAPHIC_COUNTRY_SOURCE,
  GEOGRAPHIC_US_STATE_SOURCE,
  countryTimeZoneForName,
  usStateTimeZoneForName,
} from '@/domain/geographic-configuration'

export type TimeZoneResolutionStatus = 'RESOLVED' | 'STATE_REQUIRED' | 'UNMAPPED'

export interface TimeZoneResolution {
  status: TimeZoneResolutionStatus
  country: string
  state: string
  ianaTimeZone: string
  utcOffset: string
  message: string
}

export interface GeographicTimeZoneFields {
  country?: string | null
  state?: string | null
  timeZone?: string | null
}

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
}

function canonicalCountry(country: string | null | undefined): string {
  const value = String(country ?? '').trim()
  if (!value) return ''
  return COUNTRY_ALIASES[value.toLowerCase()] ?? value
}

function countryUsesUsStateLookup(country: string): boolean {
  return country.toLocaleLowerCase() === 'united states'
}

export function resolveGeographicTimeZone(
  countryValue: string | null | undefined,
  stateValue: string | null | undefined,
  referenceDateValue?: string | null,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  usStateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): TimeZoneResolution {
  void referenceDateValue
  const country = canonicalCountry(countryValue)
  const state = String(stateValue ?? '').trim()
  if (!country) {
    return {
      status: 'UNMAPPED',
      country,
      state,
      ianaTimeZone: '',
      utcOffset: '',
      message: 'Country is required to determine the Time Zone.',
    }
  }

  if (countryUsesUsStateLookup(country)) {
    const utcOffset = usStateTimeZoneForName(usStateRecords, state)
    if (!state) {
      return {
        status: 'STATE_REQUIRED',
        country,
        state: '',
        ianaTimeZone: '',
        utcOffset: '',
        message: `State is required to determine the Time Zone for ${country}.`,
      }
    }
    if (!utcOffset) {
      return {
        status: 'UNMAPPED',
        country,
        state,
        ianaTimeZone: utcOffset,
        utcOffset: '',
        message: `No approved Time Zone mapping exists for ${country} and ${state}.`,
      }
    }
    return {
      status: 'RESOLVED',
      country,
      state,
      ianaTimeZone: utcOffset,
      utcOffset,
      message: '',
    }
  }

  const utcOffset = countryTimeZoneForName(countryRecords, country)
  if (!utcOffset) {
    return {
      status: 'UNMAPPED',
      country,
      state,
      ianaTimeZone: '',
      utcOffset: '',
      message: `No approved Time Zone mapping exists for ${country}.`,
    }
  }

  return {
    status: 'RESOLVED',
    country,
    state,
    ianaTimeZone: utcOffset,
    utcOffset,
    message: '',
  }
}

export function geographicTimeZoneDisplayValue(
  country: string | null | undefined,
  state: string | null | undefined,
  referenceDateValue?: string | null,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  usStateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): string {
  const resolution = resolveGeographicTimeZone(country, state, referenceDateValue, countryRecords, usStateRecords)
  return resolution.status === 'RESOLVED' ? resolution.utcOffset : ''
}

export function applyGeographicTimeZone<T extends GeographicTimeZoneFields>(
  record: T,
  referenceDateValue?: string | null,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  usStateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): T {
  return {
    ...record,
    timeZone: geographicTimeZoneDisplayValue(record.country, record.state, referenceDateValue, countryRecords, usStateRecords),
  }
}

export function projectTimeZoneDisplayValue(
  country: string | null | undefined,
  state: string | null | undefined,
  referenceDateValue?: string | null,
  countryRecords: GeographicCountryRecord[] = GEOGRAPHIC_COUNTRY_SOURCE,
  usStateRecords: GeographicUsStateRecord[] = GEOGRAPHIC_US_STATE_SOURCE,
): string {
  return geographicTimeZoneDisplayValue(country, state, referenceDateValue, countryRecords, usStateRecords)
}
