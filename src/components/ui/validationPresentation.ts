import { errorMessageClassName, successMessageClassName } from '@/domain/status-presentation'

const ERROR_PATTERNS = [
  'required',
  'cannot',
  'invalid',
  'missing',
  'must',
  'not found',
  'unique',
  'blocked',
  'error',
]

export function isValidationErrorMessage(message: string): boolean {
  const normalized = message.trim().toLocaleLowerCase()
  return ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))
}

export function formMessageClassName(messages: string[]): string {
  return messages.some(isValidationErrorMessage) ? errorMessageClassName() : successMessageClassName()
}

export function validationControlClassName(isInvalid: boolean): string {
  return isInvalid ? 'border-red-500 ring-1 ring-red-500' : ''
}
