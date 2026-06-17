import { WARRANTY_MANAGEABILITY_MESSAGE } from './metadata'

export function canManageWarrantyCollection(project: unknown, opportunityReference: string | null | undefined): boolean {
  return Boolean(project && opportunityReference)
}

export function warrantyManageabilityMessage(): string {
  return WARRANTY_MANAGEABILITY_MESSAGE
}
