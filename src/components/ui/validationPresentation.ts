import { errorMessageClassName, successMessageClassName } from '@/domain/status-presentation'

const ERROR_PATTERNS = [
  'required',
  'cannot',
  "can't",
  'invalid',
  'missing',
  'must',
  'not found',
  'unique',
  'blocked',
  'error',
  'failed',
  'unable',
  'unavailable',
  'not available',
  'already',
  'select ',
  'deallocate',
  'before ',
  'prerequisite',
]

export function isValidationErrorMessage(message: string): boolean {
  const normalized = message.trim().toLocaleLowerCase()
  return ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export function formMessageClassName(messages: string[]): string {
  return messages.some(isValidationErrorMessage) ? errorMessageClassName() : successMessageClassName()
}

export function hasCancellationValidationError(messages: string[]): boolean {
  return messages.some((message) => {
    const normalized = message.trim().toLocaleLowerCase()
    return isValidationErrorMessage(message) && (
      normalized.includes('cancellation') ||
      normalized.includes('cancelling') ||
      normalized.includes('cancel') ||
      normalized.includes('deallocate')
    )
  })
}

export function validationControlClassName(isInvalid: boolean): string {
  return isInvalid ? 'border-red-500 ring-1 ring-red-500' : ''
}
