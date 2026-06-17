import type { TenantOperationResult } from './types'

export function tenantOperationSuccess(message: string, allocationId?: string): TenantOperationResult {
  return { ok: true, message, allocationId }
}

export function tenantOperationError(message: string): TenantOperationResult {
  return { ok: false, message }
}

