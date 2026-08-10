export const PERMANENT_DELETE_LABEL = 'Permanent Delete'

export function permanentDeleteConfirmationMessage(objectLabel: string): string {
  return `Permanently delete ${objectLabel}?\n\nThis permanently removes the business object and cannot be undone through the product UI.\n\nContinue?`
}
