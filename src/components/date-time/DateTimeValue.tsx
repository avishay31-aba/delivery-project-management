import {
  formatSemanticDateTimeValue,
  type DateTimePresentationValue,
  type DateTimeSemanticType,
} from '@/domain/date-time-presentation'
import { useDateTimePresentationPreference } from '@/hooks/useDateTimePresentationPreference'

interface DateTimeValueProps {
  value: DateTimePresentationValue
  semanticType: DateTimeSemanticType
  fallback?: string
}

export function DateTimeValue({ value, semanticType, fallback = '' }: DateTimeValueProps) {
  useDateTimePresentationPreference()
  const formattedValue = formatSemanticDateTimeValue(value, semanticType, { fallback })
  return <>{formattedValue}</>
}
