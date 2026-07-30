import {
  WARRANTY_MANAGEABILITY_MESSAGE,
  WARRANTY_RELATED_PROJECT_REQUIRED_MESSAGE,
} from './metadata'

export function canManageWarrantyCollection(project: unknown, opportunityReference: string | null | undefined): boolean {
  return Boolean(project && opportunityReference)
}

export function warrantyManageabilityMessage(): string {
  return WARRANTY_MANAGEABILITY_MESSAGE
}

export const WARRANTY_START_DATE_REQUIRED_MESSAGE = 'Start Date is required.'
export const WARRANTY_END_DATE_REQUIRED_MESSAGE = 'End Date is required.'
export const WARRANTY_DATE_ORDER_MESSAGE = 'Start Date cannot be after End Date.'

export function validateWarrantyDateDraft(warranty: { startDate?: string | null, endDate?: string | null }): string[] {
  const messages: string[] = []
  if (!warranty.startDate) messages.push(WARRANTY_START_DATE_REQUIRED_MESSAGE)
  if (!warranty.endDate) messages.push(WARRANTY_END_DATE_REQUIRED_MESSAGE)
  if (warranty.startDate && warranty.endDate && warranty.startDate > warranty.endDate) messages.push(WARRANTY_DATE_ORDER_MESSAGE)
  return messages
}

export function validateWarrantyEditDraft(warranty: { relatedProjectId?: string | null, startDate?: string | null, endDate?: string | null }): string[] {
  const messages = validateWarrantyDateDraft(warranty)
  if (!warranty.relatedProjectId?.trim()) messages.push(WARRANTY_RELATED_PROJECT_REQUIRED_MESSAGE)
  return messages
}

export function isSelfWarrantyPredecessorSelection(
  currentWarranty: { warrantyId: string },
  currentTenantId: string,
  selectedTenantId: string,
  selectedWarrantyId: string,
): boolean {
  return currentTenantId === selectedTenantId && currentWarranty.warrantyId === selectedWarrantyId
}
