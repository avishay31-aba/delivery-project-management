import type { RequirementCoverageMissingStep, RequirementCoverageStatus } from './types'

export const REQUIREMENT_COVERAGE_STATUS_LABELS: Record<RequirementCoverageStatus, string> = {
  COVERED: 'Covered',
  PARTIALLY_COVERED: 'Partially Covered',
  UNCOVERED: 'Uncovered',
  BLOCKED: 'Blocked',
  UNKNOWN: 'Unknown',
}

export const REQUIREMENT_COVERAGE_MISSING_STEP_LABELS: Record<RequirementCoverageMissingStep, string> = {
  NONE: '',
  MISSING_PROJECT: 'Missing Project',
  MISSING_SYSTEM_ALLOCATION: 'Missing System Allocation',
  MISSING_TENANT_CREATION: 'Missing Tenant Creation',
  MISSING_HOSTING: 'Missing Hosting',
  MISSING_PRODUCT_CONFIGURATION: 'Missing Product Configuration',
  MISSING_RELATED_REQUIREMENT_LINK: 'Missing Related Requirement Link',
  MISSING_DATA: 'Missing Data',
}

export const REQUIREMENT_COVERAGE_GRID_LABELS = {
  A: 'New Tenant Requirement',
  B: 'Change Request Requirement',
  C: 'Renewal Requirement',
} as const
