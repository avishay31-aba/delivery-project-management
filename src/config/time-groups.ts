import { getBusinessRegionForCountry } from '@/domain/business-region'

export function timeGroupForCountry(country: string | null | undefined): string {
  return getBusinessRegionForCountry(country)
}
