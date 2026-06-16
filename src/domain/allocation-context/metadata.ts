import type { AllocationMode } from './types'

export const ALLOCATION_MODE_LABELS: Record<AllocationMode, string> = {
  PRODUCTION: 'Allocate Production System',
  REUSED_INTERNAL: 'Allocate Reused Internal System',
  EXISTING_SYSTEM: 'Link Existing System',
}

export function allocationModeLabel(mode: AllocationMode): string {
  return ALLOCATION_MODE_LABELS[mode]
}
