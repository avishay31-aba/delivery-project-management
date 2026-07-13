import { useSyncExternalStore } from 'react'
import {
  regionalDateFormatPreference,
  subscribeToRegionalDateFormatPreference,
} from '@/domain/date-time-presentation'

export function useDateTimePresentationPreference() {
  return useSyncExternalStore(
    subscribeToRegionalDateFormatPreference,
    regionalDateFormatPreference,
    regionalDateFormatPreference,
  )
}
