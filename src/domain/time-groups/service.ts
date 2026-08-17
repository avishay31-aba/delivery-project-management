import type { AppDataState, System, Tenant, TimeGroupLookupRecord } from '@/data/seed.types'
import { geographicTimeZoneDisplayValue } from '@/domain/geographic-time-zone'
import { tenantIsActivelyHostedBySystem } from '@/domain/tenant-operations/lifecycle'

export const TIME_GROUP_LOOKUP_SOURCE: TimeGroupLookupRecord[] = [
  {
    id: 'time-group-1',
    timeGroupId: '1',
    timeGroup: 'EU/AF_CentralWest',
    timeZones: ['UTC+00:00', 'UTC+01:00'],
    countries: ['Albania', 'Algeria', 'Andorra', 'Angola', 'Austria', 'Belgium', 'Benin', 'Bosnia and Herzegovina', 'Burkina Faso', 'Cameroon', 'Central African Republic', 'Chad', 'Congo', "Cote d'Ivoire", 'Croatia', 'Czech Republic', 'Denmark', 'Equatorial Guinea', 'Faroe Islands', 'France', 'Gabon', 'Gambia', 'Germany', 'Ghana', 'Gibraltar', 'Guinea', 'Guinea-Bissau', 'Hungary', 'Iceland', 'Ireland', 'Italy', 'Kosovo', 'Liberia', 'Liechtenstein', 'Luxembourg', 'Macedonia', 'Mali', 'Malta', 'Mauritania', 'Monaco', 'Montenegro', 'Morocco', 'Namibia', 'Netherlands', 'Niger', 'Nigeria', 'Norway', 'Poland', 'Portugal', 'San Marino', 'Senegal', 'Serbia', 'Sierra Leone', 'Slovakia', 'Slovenia', 'Spain', 'Sweden', 'Switzerland', 'Togo', 'Tunisia', 'United Kingdom', 'Western Sahara'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-2',
    timeGroupId: '2',
    timeGroup: 'MiddleEast/AF_east',
    timeZones: ['UTC+02:00', 'UTC+03:00'],
    countries: ['Aland Islands', 'Bahrain', 'Belarus', 'Botswana', 'Bulgaria', 'Burundi', 'Cyprus', 'Djibouti', 'Egypt', 'Eritrea', 'Estonia', 'Ethiopia', 'Finland', 'Greece', 'Iran', 'Iraq', 'Israel', 'Jordan', 'Kenya', 'Kuwait', 'Latvia', 'Lebanon', 'Lesotho', 'Libya', 'Lithuania', 'Madagascar', 'Malawi', 'Mayotte', 'Moldova', 'Mozambique', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saudi Arabia', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Swaziland', 'Tanzania', 'Turkey', 'Uganda', 'Ukraine', 'Yemen', 'Zambia', 'Zimbabwe'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-3',
    timeGroupId: '3',
    timeGroup: 'IND_Central/ARE_north',
    timeZones: ['UTC+04:00', 'UTC+05:00'],
    countries: ['Abu Dhabi', 'Afghanistan', 'Armenia', 'Azerbaijan', 'Dubai', 'Georgia', 'India', 'Maldives', 'Mauritius', 'Oman', 'Pakistan', 'Reunion', 'Seychelles', 'Sri Lanka', 'Tajikistan', 'Turkmenistan', 'Uzbekistan'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-4',
    timeGroupId: '4',
    timeGroup: 'THA/SGP/HKG/AUS_west',
    timeZones: ['UTC+06:00', 'UTC+07:00', 'UTC+08:00'],
    countries: ['Bangladesh', 'Bhutan', 'Brunei', 'Cambodia', 'China', 'Hong Kong', 'Indonesia', 'Kazakhstan', 'Kyrgyzstan', 'Laos', 'Macao', 'Malaysia', 'Mongolia', 'Myanmar', 'Nepal', 'Philippines', 'Singapore', 'Taiwan', 'Thailand', 'Vietnam'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-5',
    timeGroupId: '5',
    timeGroup: 'JPN/AUS_CenterEast',
    timeZones: ['UTC+09:00', 'UTC+10:00'],
    countries: ['Australia', 'Guam', 'Japan', 'Micronesia', 'Palau', 'Papua New Guinea', 'South Korea', 'Timor-Leste'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-6',
    timeGroupId: '6',
    timeGroup: 'New Zealand',
    timeZones: ['UTC+11:00', 'UTC+12:00', 'UTC+13:00'],
    countries: ['Fiji', 'Kiribati', 'Marshall Islands', 'Nauru', 'New Caledonia', 'New Zealand', 'Norfolk Island', 'Samoa', 'Solomon Islands', 'Tokelau', 'Tonga', 'Tuvalu', 'Vanuatu', 'Wallis and Futuna'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-7',
    timeGroupId: '7',
    timeGroup: 'LATAM_East',
    timeZones: ['UTC-01:00', 'UTC-02:00', 'UTC-03:00'],
    countries: ['Antarctica', 'Argentina', 'Brazil', 'Cape Verde', 'Chile', 'French Guiana', 'Greenland', 'Suriname', 'Uruguay'],
    states: [],
    active: true,
  },
  {
    id: 'time-group-8',
    timeGroupId: '8',
    timeGroup: 'US East_Central/LATM_Central',
    timeZones: ['UTC-04:00', 'UTC-05:00'],
    countries: ['Anguilla', 'Antigua and Barbuda', 'Aruba', 'Bahamas', 'Barbados', 'Bermuda', 'Bolivia', 'Bonaire', 'Canada', 'Cayman Islands', 'Colombia', 'Cuba', 'Dominican Republic', 'Ecuador', 'Grenada', 'Guadeloupe', 'Guyana', 'Haiti', 'Jamaica', 'Martinique', 'Montserrat', 'Panama', 'Paraguay', 'Peru', 'Puerto Rico', 'Saint Barthelemy', 'Saint Kitts and Nevis', 'Saint Lucia', 'Trinidad and Tobago', 'Turks and Caicos Islands', 'Venezuela', 'Virgin Islands, British', 'Virgin Islands, US'],
    states: ['Alabama', 'Arkansas', 'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Nebraska', 'New Hampshire', 'New Jersey', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Vermont', 'Virginia', 'West Virginia', 'Wisconsin'],
    active: true,
  },
  {
    id: 'time-group-9',
    timeGroupId: '9',
    timeGroup: 'US Mountain_Pacific/LATM_Pacific',
    timeZones: ['UTC-06:00', 'UTC-07:00'],
    countries: ['Belize', 'Costa Rica', 'El Salvador', 'Guatemala', 'Honduras', 'Mexico', 'Nicaragua'],
    states: ['Arizona', 'California', 'Colorado', 'Idaho', 'Montana', 'Nevada', 'New Mexico', 'Oregon', 'Utah', 'Washington', 'Wyoming'],
    active: true,
  },
  {
    id: 'time-group-10',
    timeGroupId: '10',
    timeGroup: 'Alaska',
    timeZones: ['UTC-08:00', 'UTC-09:00'],
    countries: ['Pitcairn Islands'],
    states: ['Alaska'],
    active: true,
  },
  {
    id: 'time-group-11',
    timeGroupId: '11',
    timeGroup: 'Hawaii',
    timeZones: ['UTC-10:00', 'UTC-11:00'],
    countries: ['American Samoa', 'Cook Islands', 'French Polynesia', 'Niue', 'United States Minor Outlying Islands'],
    states: ['Hawaii'],
    active: true,
  },
]

const TIME_ZONE_PATTERN = /^UTC[+-]\d{2}:\d{2}$/

function splitSemicolonValues(value: string | string[] | null | undefined): string[] {
  const values = Array.isArray(value) ? value : String(value ?? '').split(';')
  return values.map((candidate) => candidate.trim()).filter(Boolean)
}

export function joinSemicolonValues(values: string[]): string {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
    .sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
    .join('; ')
}

export function normalizeTimeGroupLookups(records: TimeGroupLookupRecord[] | undefined): TimeGroupLookupRecord[] {
  const byId = new Map((records ?? []).map((record) => [record.timeGroupId || record.id, record]))
  return TIME_GROUP_LOOKUP_SOURCE.map((source) => {
    const current = byId.get(source.timeGroupId) ?? byId.get(source.id)
    if (!current) return source
    return {
      ...source,
      timeGroup: String(current.timeGroup ?? source.timeGroup).trim() || source.timeGroup,
      timeZones: splitSemicolonValues(current.timeZones).length > 0 ? splitSemicolonValues(current.timeZones) : source.timeZones,
      countries: splitSemicolonValues(current.countries).length > 0 ? splitSemicolonValues(current.countries) : source.countries,
      states: splitSemicolonValues(current.states),
      active: current.active !== false,
      updatedAt: current.updatedAt,
    }
  })
}

export function validateTimeGroupLookupRows(records: TimeGroupLookupRecord[]): string[] {
  const messages: string[] = []
  const activeZones = new Map<string, TimeGroupLookupRecord>()
  const activeCountries = new Map<string, TimeGroupLookupRecord>()
  const activeStates = new Map<string, TimeGroupLookupRecord>()

  function assertUnique(owner: Map<string, TimeGroupLookupRecord>, value: string, record: TimeGroupLookupRecord, label: 'Time Zone' | 'Country' | 'State') {
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
    record.countries.forEach((country) => assertUnique(activeCountries, country, record, 'Country'))
    record.states.forEach((state) => assertUnique(activeStates, state, record, 'State'))
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
): { timeZone: string; timeGroup: string } {
  const timeZone = geographicTimeZoneDisplayValue(country, state, referenceDate)
  return { timeZone, timeGroup: timeGroupForTimeZone(records, timeZone) }
}

export function tenantTimeGroupFromLocation(
  tenant: Pick<Tenant, 'country'> & { state?: string; timeGroup?: string },
  records: TimeGroupLookupRecord[],
  referenceDate?: string | null,
): { timeZone: string; timeGroup: string; alert: string } {
  const { timeZone, timeGroup } = timeGroupFromLocation(records, tenant.country, tenant.state, referenceDate)
  return {
    timeZone,
    timeGroup,
    alert: timeZone && !timeGroup ? `No active Time Group mapping exists for Time Zone ${timeZone}.` : '',
  }
}

export function normalizeTenantTimeGroup(tenant: Tenant, records: TimeGroupLookupRecord[]): Tenant {
  const result = tenantTimeGroupFromLocation(tenant, records)
  return {
    ...tenant,
    timeGroup: result.timeGroup,
  }
}

function activeHostingDateForTenant(tenant: Tenant, systemId: string): string {
  const activeHistory = (tenant.hostedSystemHistory ?? [])
    .filter((entry) => entry.systemId === systemId && entry.endedAt == null)
    .sort((first, second) => first.startedAt.localeCompare(second.startedAt))[0]
  return activeHistory?.startedAt || tenant.createdAt || ''
}

export function tenantCanGovernSystemTimeGroup(tenant: Tenant): boolean {
  const type = tenant.tenantFormType ?? tenant.tenantType
  return type === 'CUSTOMER' || type === 'POC'
}

export function mostVeteranActiveTenantForSystem(systemId: string, tenants: Tenant[]): Tenant | undefined {
  return tenants
    .filter((tenant) => tenantCanGovernSystemTimeGroup(tenant) && tenantIsActivelyHostedBySystem(tenant, systemId))
    .sort((first, second) => {
      const firstDate = activeHostingDateForTenant(first, systemId)
      const secondDate = activeHostingDateForTenant(second, systemId)
      if (firstDate !== secondDate) return firstDate.localeCompare(secondDate)
      return first.tid.localeCompare(second.tid, undefined, { numeric: true, sensitivity: 'base' })
    })[0]
}

export function systemTimeGroupSource(
  system: Pick<System, 'id' | 'timeGroupGovernanceTenantId'>,
  tenants: Tenant[],
  records: TimeGroupLookupRecord[],
): { timeGroup: string; tenant?: Tenant; timeZone: string } {
  const explicitGovernor = system.timeGroupGovernanceTenantId
    ? tenants.find((tenant) =>
        tenant.id === system.timeGroupGovernanceTenantId &&
        tenantCanGovernSystemTimeGroup(tenant) &&
        tenantIsActivelyHostedBySystem(tenant, system.id),
      )
    : undefined
  const tenant = explicitGovernor ?? mostVeteranActiveTenantForSystem(system.id, tenants)
  if (!tenant) return { timeGroup: '', tenant: undefined, timeZone: '' }
  const derived = tenantTimeGroupFromLocation(tenant, records)
  return { timeGroup: derived.timeGroup, tenant, timeZone: derived.timeZone }
}

export function systemTimeGroupFromVeteranTenant(
  systemId: string,
  tenants: Tenant[],
  records: TimeGroupLookupRecord[],
): { timeGroup: string; tenant?: Tenant; timeZone: string } {
  const tenant = mostVeteranActiveTenantForSystem(systemId, tenants)
  if (!tenant) return { timeGroup: '', tenant: undefined, timeZone: '' }
  const derived = tenantTimeGroupFromLocation(tenant, records)
  return { timeGroup: derived.timeGroup, tenant, timeZone: derived.timeZone }
}

export function systemTimeGroupChangeMessage(systemIdLabel: string, previous: string, next: string, veteranTenant?: Tenant): string {
  if (previous && next) {
    return `System ${systemIdLabel} Time Group changed from ${previous} to ${next}. The value is now governed by active Customer/POC Tenant ${veteranTenant?.tid ?? '-'}.`
  }
  if (previous && !next) {
    return `System ${systemIdLabel} Time Group changed from ${previous} to empty because the System no longer has an active hosted Tenant.`
  }
  return `System ${systemIdLabel} Time Group was set to ${next}, based on active Customer/POC Tenant ${veteranTenant?.tid ?? '-'}.`
}

export function systemsWithDerivedTimeGroups<T extends System>(systems: T[], tenants: Tenant[], records: TimeGroupLookupRecord[]): T[] {
  return systems.map((system) => {
    const source = systemTimeGroupSource(system, tenants, records)
    return source.timeGroup === system.timeGroup && source.tenant?.id === system.timeGroupGovernanceTenantId
      ? system
      : { ...system, timeGroup: source.timeGroup, timeGroupGovernanceTenantId: source.tenant?.id }
  })
}

export function linkedSidsForTimeGroup(
  record: TimeGroupLookupRecord,
  systems: Array<System | AppDataState['productionSystemInventory'][number] | AppDataState['reusedInternalSystems'][number]>,
  tenants: Tenant[] = [],
  records: TimeGroupLookupRecord[] = [],
): string[] {
  return Array.from(new Set(
    systems
      .filter((system) => {
        if (!('sid' in system)) return false
        return systemTimeGroupSource(system, tenants, records).timeGroup === record.timeGroup
      })
      .map((system) => ('sid' in system ? system.sid : 'machineId' in system ? system.machineId : ''))
      .filter((value): value is string => Boolean(value)),
  )).sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}

export function linkedTidsForTimeGroup(record: TimeGroupLookupRecord, tenants: Tenant[], records: TimeGroupLookupRecord[]): string[] {
  return Array.from(new Set(
    tenants
      .filter((tenant) => normalizeTenantTimeGroup(tenant, records).timeGroup === record.timeGroup)
      .map((tenant) => tenant.tid)
      .filter(Boolean),
  )).sort((first, second) => first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' }))
}
