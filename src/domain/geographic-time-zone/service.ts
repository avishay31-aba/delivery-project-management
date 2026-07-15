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

const SINGLE_ZONE_COUNTRIES: Record<string, string> = {
  Australia: 'Australia/Sydney',
  Germany: 'Europe/Berlin',
  Israel: 'Asia/Jerusalem',
  Japan: 'Asia/Tokyo',
  Singapore: 'Asia/Singapore',
  'United Kingdom': 'Europe/London',
}

const UNITED_STATES_STATE_ZONES: Record<string, string> = {
  Alabama: 'America/Chicago',
  Alaska: 'America/Anchorage',
  Arizona: 'America/Phoenix',
  Arkansas: 'America/Chicago',
  California: 'America/Los_Angeles',
  Colorado: 'America/Denver',
  Connecticut: 'America/New_York',
  Delaware: 'America/New_York',
  Florida: 'America/New_York',
  Georgia: 'America/New_York',
  Hawaii: 'Pacific/Honolulu',
  Idaho: 'America/Boise',
  Illinois: 'America/Chicago',
  Indiana: 'America/Indiana/Indianapolis',
  Iowa: 'America/Chicago',
  Kansas: 'America/Chicago',
  Kentucky: 'America/New_York',
  Louisiana: 'America/Chicago',
  Maine: 'America/New_York',
  Maryland: 'America/New_York',
  Massachusetts: 'America/New_York',
  Michigan: 'America/Detroit',
  Minnesota: 'America/Chicago',
  Mississippi: 'America/Chicago',
  Missouri: 'America/Chicago',
  Montana: 'America/Denver',
  Nebraska: 'America/Chicago',
  Nevada: 'America/Los_Angeles',
  'New Hampshire': 'America/New_York',
  'New Jersey': 'America/New_York',
  'New Mexico': 'America/Denver',
  'New York': 'America/New_York',
  'North Carolina': 'America/New_York',
  'North Dakota': 'America/Chicago',
  Ohio: 'America/New_York',
  Oklahoma: 'America/Chicago',
  Oregon: 'America/Los_Angeles',
  Pennsylvania: 'America/New_York',
  'Rhode Island': 'America/New_York',
  'South Carolina': 'America/New_York',
  'South Dakota': 'America/Chicago',
  Tennessee: 'America/Chicago',
  Texas: 'America/Chicago',
  Utah: 'America/Denver',
  Vermont: 'America/New_York',
  Virginia: 'America/New_York',
  Washington: 'America/Los_Angeles',
  'West Virginia': 'America/New_York',
  Wisconsin: 'America/Chicago',
  Wyoming: 'America/Denver',
}

const CANADA_PROVINCE_ZONES: Record<string, string> = {
  Alberta: 'America/Edmonton',
  'British Columbia': 'America/Vancouver',
  Manitoba: 'America/Winnipeg',
  'New Brunswick': 'America/Moncton',
  Newfoundland: 'America/St_Johns',
  'Newfoundland and Labrador': 'America/St_Johns',
  'Nova Scotia': 'America/Halifax',
  Ontario: 'America/Toronto',
  Quebec: 'America/Toronto',
  Saskatchewan: 'America/Regina',
}

const MULTI_ZONE_COUNTRIES: Record<string, Record<string, string>> = {
  Canada: CANADA_PROVINCE_ZONES,
  'United States': UNITED_STATES_STATE_ZONES,
}

function canonicalCountry(country: string | null | undefined): string {
  const value = String(country ?? '').trim()
  if (!value) return ''
  return COUNTRY_ALIASES[value.toLowerCase()] ?? value
}

function canonicalState(state: string | null | undefined, states: Record<string, string>): string {
  const value = String(state ?? '').trim()
  if (!value) return ''
  const lowerValue = value.toLowerCase()
  return Object.keys(states).find((candidate) => candidate.toLowerCase() === lowerValue) ?? value
}

function offsetForTimeZone(ianaTimeZone: string, referenceDate: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ianaTimeZone,
    timeZoneName: 'shortOffset',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(referenceDate)
  const offsetName = parts.find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
  const match = offsetName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/)
  if (!match) return 'UTC+00:00'
  const sign = match[1]
  const hours = match[2].padStart(2, '0')
  const minutes = (match[3] ?? '00').padStart(2, '0')
  return `UTC${sign}${hours}:${minutes}`
}

function referenceDateFor(dateOnlyValue: string | null | undefined): Date {
  if (!dateOnlyValue) return new Date()
  const [year, month, day] = dateOnlyValue.split('-').map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

export function resolveGeographicTimeZone(
  countryValue: string | null | undefined,
  stateValue: string | null | undefined,
  referenceDateValue?: string | null,
): TimeZoneResolution {
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

  const stateZones = MULTI_ZONE_COUNTRIES[country]
  if (stateZones) {
    const canonical = canonicalState(state, stateZones)
    const ianaTimeZone = stateZones[canonical]
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
    if (!ianaTimeZone) {
      return {
        status: 'UNMAPPED',
        country,
        state,
        ianaTimeZone: '',
        utcOffset: '',
        message: `No approved Time Zone mapping exists for ${country} and ${state}.`,
      }
    }
    return {
      status: 'RESOLVED',
      country,
      state: canonical,
      ianaTimeZone,
      utcOffset: offsetForTimeZone(ianaTimeZone, referenceDateFor(referenceDateValue)),
      message: '',
    }
  }

  const ianaTimeZone = SINGLE_ZONE_COUNTRIES[country]
  if (!ianaTimeZone) {
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
    ianaTimeZone,
    utcOffset: offsetForTimeZone(ianaTimeZone, referenceDateFor(referenceDateValue)),
    message: '',
  }
}

export function geographicTimeZoneDisplayValue(
  country: string | null | undefined,
  state: string | null | undefined,
  referenceDateValue?: string | null,
): string {
  const resolution = resolveGeographicTimeZone(country, state, referenceDateValue)
  return resolution.status === 'RESOLVED' ? resolution.utcOffset : ''
}

export function applyGeographicTimeZone<T extends GeographicTimeZoneFields>(
  record: T,
  referenceDateValue?: string | null,
): T {
  return {
    ...record,
    timeZone: geographicTimeZoneDisplayValue(record.country, record.state, referenceDateValue),
  }
}

export function projectTimeZoneDisplayValue(
  country: string | null | undefined,
  state: string | null | undefined,
  referenceDateValue?: string | null,
): string {
  return geographicTimeZoneDisplayValue(country, state, referenceDateValue)
}
