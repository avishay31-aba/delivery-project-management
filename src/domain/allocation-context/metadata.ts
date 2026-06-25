import type { Project } from '@/data/seed.types'
import type { AllocationMode } from './types'

export const ALLOCATION_MODE_LABELS: Record<AllocationMode, string> = {
  PRODUCTION: 'Allocate Production System',
  REUSED_INTERNAL: 'Allocate Reused Internal System',
  EXISTING_SYSTEM: 'Link Existing System',
}

export function allocationModeLabel(mode: AllocationMode): string {
  return ALLOCATION_MODE_LABELS[mode]
}

export function allocationModeLabelForProject(mode: AllocationMode, project: Project): string {
  if (mode === 'EXISTING_SYSTEM') return 'Allocate Requested System'
  if (mode === 'REUSED_INTERNAL' && project.mainType === 'POC') return 'Allocate Available Reused System'
  if (mode === 'PRODUCTION') return 'Allocate Available Production System'
  return allocationModeLabel(mode)
}
