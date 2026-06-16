import {
  AWS_CSP_OPTIONS,
  AWS_GOV_REGIONS,
  AWS_REGIONS,
  AZURE_CSP_OPTIONS,
  AZURE_GOV_REGIONS,
  AZURE_REGIONS,
  CLOUD_PLATFORM_OPTIONS,
  CUSTOMER_DATACENTER_CSP_OPTIONS,
} from './metadata'

export function cloudPlatformOptionsForHosting(hosting: string): string[] {
  return hosting === 'Cloud' || hosting === 'Hybrid' ? CLOUD_PLATFORM_OPTIONS : []
}

export function cspOptionsForCloudPlatform(cloudPlatform: string): string[] {
  if (cloudPlatform === 'AWS' || cloudPlatform === 'AWS Gov') return AWS_CSP_OPTIONS
  if (cloudPlatform === 'Azure' || cloudPlatform === 'Azure Gov') return AZURE_CSP_OPTIONS
  if (cloudPlatform === "Customer's datacenter") return CUSTOMER_DATACENTER_CSP_OPTIONS
  return []
}

export function cloudRegionOptionsForCloudPlatform(cloudPlatform: string): string[] {
  if (cloudPlatform === 'AWS') return AWS_REGIONS
  if (cloudPlatform === 'AWS Gov') return AWS_GOV_REGIONS
  if (cloudPlatform === 'Azure') return AZURE_REGIONS
  if (cloudPlatform === 'Azure Gov') return AZURE_GOV_REGIONS
  return []
}

export function requiresCloudRegion(cloudPlatform: string): boolean {
  return cloudPlatform === 'AWS' || cloudPlatform === 'AWS Gov' || cloudPlatform === 'Azure' || cloudPlatform === 'Azure Gov'
}

export function isServerHosting(value: string | null | undefined): boolean {
  const normalized = String(value ?? '').toLowerCase()
  return normalized.includes('prem') || normalized.includes('hybrid') || normalized.includes('server')
}
