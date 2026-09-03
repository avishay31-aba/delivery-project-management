export type BusinessRegion = 'NA' | 'EMEA' | 'APAC' | 'LATAM'

export const BUSINESS_REGION_OPTIONS: BusinessRegion[] = ['NA', 'EMEA', 'APAC', 'LATAM']

const COUNTRY_ALIASES: Record<string, string> = {
  usa: 'United States',
  us: 'United States',
  'united states of america': 'United States',
  uk: 'United Kingdom',
}

const COUNTRY_BUSINESS_REGIONS: Record<string, BusinessRegion> = {
  Australia: 'APAC',
  Canada: 'NA',
  Colombia: 'LATAM',
  Germany: 'EMEA',
  Israel: 'EMEA',
  Japan: 'APAC',
  Mexico: 'LATAM',
  Singapore: 'APAC',
  'United Kingdom': 'EMEA',
  'United States': 'NA',
}

function canonicalCountry(country: string | null | undefined): string {
  const value = String(country ?? '').trim()
  if (!value) return ''
  return COUNTRY_ALIASES[value.toLocaleLowerCase()] ?? value
}

export function normalizeBusinessRegion(value: string | null | undefined): BusinessRegion | '' {
  const normalized = String(value ?? '').trim().toLocaleUpperCase()
  if (normalized === 'EU') return 'EMEA'
  if (normalized === 'AMER') return 'NA'
  if (normalized === 'NA' || normalized === 'EMEA' || normalized === 'APAC' || normalized === 'LATAM') return normalized
  return ''
}

export function getBusinessRegionForCountry(country: string | null | undefined, _state?: string | null): BusinessRegion | '' {
  void _state
  return COUNTRY_BUSINESS_REGIONS[canonicalCountry(country)] ?? ''
}
