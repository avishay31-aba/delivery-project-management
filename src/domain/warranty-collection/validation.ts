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

export function validateWarrantyEditDraft(warranty: { relatedProjectId?: string | null }): string[] {
  return warranty.relatedProjectId?.trim() ? [] : [WARRANTY_RELATED_PROJECT_REQUIRED_MESSAGE]
}

export function isSelfWarrantyPredecessorSelection(
  currentWarranty: { warrantyId: string },
  currentTenantId: string,
  selectedTenantId: string,
  selectedWarrantyId: string,
): boolean {
  return currentTenantId === selectedTenantId && currentWarranty.warrantyId === selectedWarrantyId
}
