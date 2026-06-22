const COUNTRY_FLAG_BY_NAME: Record<string, string> = {
  argentina: '🇦🇷',
  australia: '🇦🇺',
  austria: '🇦🇹',
  belgium: '🇧🇪',
  brazil: '🇧🇷',
  canada: '🇨🇦',
  chile: '🇨🇱',
  china: '🇨🇳',
  colombia: '🇨🇴',
  denmark: '🇩🇰',
  france: '🇫🇷',
  germany: '🇩🇪',
  india: '🇮🇳',
  ireland: '🇮🇪',
  israel: '🇮🇱',
  italy: '🇮🇹',
  japan: '🇯🇵',
  mexico: '🇲🇽',
  netherlands: '🇳🇱',
  norway: '🇳🇴',
  poland: '🇵🇱',
  portugal: '🇵🇹',
  singapore: '🇸🇬',
  spain: '🇪🇸',
  sweden: '🇸🇪',
  switzerland: '🇨🇭',
  uk: '🇬🇧',
  'united kingdom': '🇬🇧',
  us: '🇺🇸',
  usa: '🇺🇸',
  'united states': '🇺🇸',
  'united states of america': '🇺🇸',
}

const COUNTRY_FLAG_BY_CODE: Record<string, string> = {
  AR: '🇦🇷',
  AU: '🇦🇺',
  AT: '🇦🇹',
  BE: '🇧🇪',
  BR: '🇧🇷',
  CA: '🇨🇦',
  CH: '🇨🇭',
  CL: '🇨🇱',
  CN: '🇨🇳',
  CO: '🇨🇴',
  DE: '🇩🇪',
  DK: '🇩🇰',
  ES: '🇪🇸',
  FR: '🇫🇷',
  GB: '🇬🇧',
  IE: '🇮🇪',
  IL: '🇮🇱',
  IN: '🇮🇳',
  IT: '🇮🇹',
  JP: '🇯🇵',
  MX: '🇲🇽',
  NL: '🇳🇱',
  NO: '🇳🇴',
  PL: '🇵🇱',
  PT: '🇵🇹',
  SE: '🇸🇪',
  SG: '🇸🇬',
  UK: '🇬🇧',
  US: '🇺🇸',
}

function normalizeCountry(value: string): string {
  return value.trim().toLowerCase()
}

export function countryFlag(value?: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (/^[a-z]{2}$/i.test(trimmed)) return COUNTRY_FLAG_BY_CODE[trimmed.toUpperCase()] ?? ''
  return COUNTRY_FLAG_BY_NAME[normalizeCountry(trimmed)] ?? ''
}

export function CountryFlag({
  value,
  country,
}: {
  value?: string | null
  country?: string | null
}) {
  const displayValue = value ?? ''
  const flag = countryFlag(displayValue) || countryFlag(country)
  if (!displayValue) return null

  return (
    <span className="inline-flex items-center gap-1">
      {flag ? <span aria-hidden="true">{flag}</span> : null}
      <span>{displayValue}</span>
    </span>
  )
}
