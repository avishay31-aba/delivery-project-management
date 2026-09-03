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
import { normalizeBusinessRegion } from '@/domain/business-region'

export function cloudPlatformOptionsForHosting(hosting: string): string[] {
  return requiresCloudPlatform(hosting) ? CLOUD_PLATFORM_OPTIONS : []
}

export function normalizeHostingType(value: string | null | undefined): string {
  const normalized = String(value ?? '').trim().toLocaleLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ')
  if (normalized === 'cloud') return 'Cloud'
  if (normalized === 'hybrid') return 'Hybrid'
  if (normalized === 'on prem' || normalized === 'on premise' || normalized === 'on premises') return 'On premise'
  return String(value ?? '').trim()
}

export function requiresCloudPlatform(hosting: string | null | undefined): boolean {
  const normalized = normalizeHostingType(hosting)
  return normalized === 'Cloud' || normalized === 'Hybrid'
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

export function usedRegionForCognitoRegion(cognitoRegion: string | null | undefined): string {
  return normalizeBusinessRegion(cognitoRegion)
}

export function isCognitoRegionCompatibleWithUsedRegion(
  cognitoRegion: string | null | undefined,
  usedInRegion: string | null | undefined,
): boolean {
  const expectedRegion = usedRegionForCognitoRegion(cognitoRegion)
  const usedRegion = String(usedInRegion ?? '').trim().toLocaleUpperCase()
  return !expectedRegion || !usedRegion || expectedRegion.toLocaleUpperCase() === usedRegion
}

export function usedRegionForCloudRegion(cloudRegion: string | null | undefined): string {
  const normalized = String(cloudRegion ?? '').trim().toLocaleLowerCase()
  if (!normalized) return ''
  if (normalized.startsWith('us-') || normalized.startsWith('ca-') || normalized.startsWith('usgov') || normalized.includes(' us') || normalized.includes('canada')) return 'NA'
  if (normalized.startsWith('sa-') || normalized.includes('brazil')) return 'LATAM'
  if (
    normalized.startsWith('eu-') ||
    normalized.startsWith('af-') ||
    normalized.startsWith('me-') ||
    normalized.includes('europe') ||
    normalized.includes('uk ') ||
    normalized.includes('france') ||
    normalized.includes('germany') ||
    normalized.includes('switzerland') ||
    normalized.includes('norway') ||
    normalized.includes('sweden') ||
    normalized.includes('poland') ||
    normalized.includes('italy') ||
    normalized.includes('spain') ||
    normalized.includes('uae') ||
    normalized.includes('qatar') ||
    normalized.includes('israel') ||
    normalized.includes('south africa')
  ) return 'EMEA'
  if (
    normalized.startsWith('ap-') ||
    normalized.includes('india') ||
    normalized.includes('asia') ||
    normalized.includes('singapore') ||
    normalized.includes('japan') ||
    normalized.includes('korea') ||
    normalized.includes('australia')
  ) return 'APAC'
  return ''
}

export function isCloudRegionWithinUsedRegion(
  cloudRegion: string | null | undefined,
  usedInRegion: string | null | undefined,
): boolean {
  const expectedRegion = usedRegionForCloudRegion(cloudRegion)
  const usedRegion = String(usedInRegion ?? '').trim().toLocaleUpperCase()
  return !expectedRegion || !usedRegion || expectedRegion === usedRegion
}

export function isServerHosting(value: string | null | undefined): boolean {
  const normalized = normalizeHostingType(value).toLowerCase()
  return normalized.includes('prem') || normalized.includes('hybrid') || normalized.includes('server')
}
