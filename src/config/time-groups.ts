const COUNTRY_TIME_GROUPS: Record<string, string> = {
  Australia: 'APAC',
  Canada: 'AMER',
  Germany: 'EMEA',
  Israel: 'EMEA',
  Japan: 'APAC',
  Singapore: 'APAC',
  UK: 'EMEA',
  USA: 'AMER',
}

export function timeGroupForCountry(country: string | null | undefined): string {
  if (!country) return ''
  return COUNTRY_TIME_GROUPS[country] ?? ''
}
