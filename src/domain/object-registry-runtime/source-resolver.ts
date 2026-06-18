import type { ObjectMetadataSourceRef } from '@/domain/object-registry'
import {
  ADDITIONAL_FEATURE_OPTIONS,
  AI_OPTIONS,
  CROSS_SYSTEM_OPTIONS,
  REGION_OPTIONS,
  TENANT_FORM_TYPE_OPTIONS,
  YES_NO_OPTIONS,
  YES_NO_REQUIRED_OPTIONS,
} from '@/config/picklist-options'
import {
  CLOUD_PLATFORM_OPTIONS,
  HOSTING_OPTIONS,
  PERFORMANCE_TIER_OPTIONS,
  PRODUCT_OPTIONS,
  VPN_TYPE_OPTIONS,
} from '@/domain/hosting-context'
import {
  APPLICATION_CONFIGURATION_FIELDS,
  TENANT_CONFIGURATION_FIELDS,
} from '@/domain/application-configuration'
import {
  PRODUCTION_OPERATIONAL_STATUS_OPTIONS,
  REUSED_OPERATIONAL_STATUS_OPTIONS,
  REUSED_PURPOSE_OPTIONS,
  REUSED_STATUS_OPTIONS,
  SYSTEM_INVENTORY_TABS,
} from '@/domain/system-inventory'
import {
  ENGAGEMENT_CIRCLE_TABLE_HEADERS,
  DEFAULT_ENGAGEMENT_CIRCLE_ROLES,
} from '@/domain/engagement-circle'
import {
  PROJECT_TABS,
} from '@/domain/project-lifecycle'
import {
  OPPORTUNITY_SUB_TYPE_OPTIONS,
} from '@/domain/opportunity-lifecycle'
import {
  NEW_TENANT_REQUIREMENT_FIELDS,
  TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
  TENANT_REQUIREMENT_CONTEXT_FIELDS,
  TENANT_REQUIREMENT_ENVIRONMENT_FIELDS,
  requirementAColumns,
  requirementBColumns,
  requirementCColumns,
} from '@/domain/tenant-requirement'
import {
  TENANT_HOSTING_FIELDS,
  TENANT_REMARK_TYPES,
} from '@/domain/tenant-operations'
import type { RuntimeSourceResolution, RuntimeSourceResolverOptions } from './types'

export function resolveObjectRegistrySource<T = unknown>(
  ref: ObjectMetadataSourceRef | undefined,
  options: RuntimeSourceResolverOptions = {},
): RuntimeSourceResolution<T> {
  if (!ref) return { ref, resolved: false, message: 'No source reference provided.' }
  const value = OBJECT_REGISTRY_RUNTIME_SOURCE_ALLOWLIST[sourceKey(ref)]
  if (value !== undefined) return { ref, resolved: true, value: value as T }

  const message = `Unsupported ObjectRegistry source: ${sourceKey(ref)}`
  if (options.strict) throw new Error(message)
  return { ref, resolved: false, message }
}

export function resolveObjectRegistryOptions(
  ref: ObjectMetadataSourceRef | undefined,
  options: RuntimeSourceResolverOptions = {},
): RuntimeSourceResolution<string[]> {
  const resolved = resolveObjectRegistrySource<unknown>(ref, options)
  if (!resolved.resolved) return { ...resolved, value: undefined }
  if (Array.isArray(resolved.value) && resolved.value.every((item) => typeof item === 'string')) {
    return { ref, resolved: true, value: resolved.value }
  }
  const message = `ObjectRegistry source is not a string option list: ${ref ? sourceKey(ref) : ''}`
  if (options.strict) throw new Error(message)
  return { ref, resolved: false, message }
}

function sourceKey(ref: ObjectMetadataSourceRef): string {
  return `${ref.domain}.${ref.exportName ?? ''}`
}

const OBJECT_REGISTRY_RUNTIME_SOURCE_ALLOWLIST: Record<string, unknown> = {
  'ApplicationConfiguration.APPLICATION_CONFIGURATION_FIELDS': APPLICATION_CONFIGURATION_FIELDS,
  'ApplicationConfiguration.TENANT_CONFIGURATION_FIELDS': TENANT_CONFIGURATION_FIELDS,
  'EngagementCircle.DEFAULT_ENGAGEMENT_CIRCLE_ROLES': DEFAULT_ENGAGEMENT_CIRCLE_ROLES,
  'EngagementCircle.ENGAGEMENT_CIRCLE_TABLE_HEADERS': ENGAGEMENT_CIRCLE_TABLE_HEADERS,
  'EngagementCircle.ENGAGEMENT_ROLE_OPTIONS': DEFAULT_ENGAGEMENT_CIRCLE_ROLES,
  'HostingContext.CLOUD_PLATFORM_OPTIONS': CLOUD_PLATFORM_OPTIONS,
  'HostingContext.HOSTING_OPTIONS': HOSTING_OPTIONS,
  'HostingContext.PERFORMANCE_TIER_OPTIONS': PERFORMANCE_TIER_OPTIONS,
  'HostingContext.PRODUCT_OPTIONS': PRODUCT_OPTIONS,
  'HostingContext.VPN_TYPE_OPTIONS': VPN_TYPE_OPTIONS,
  'OpportunityLifecycle.OPPORTUNITY_SUB_TYPE_OPTIONS': OPPORTUNITY_SUB_TYPE_OPTIONS,
  'ProjectLifecycle.PROJECT_TABS': PROJECT_TABS,
  'SystemInventory.PRODUCTION_OPERATIONAL_STATUS_OPTIONS': PRODUCTION_OPERATIONAL_STATUS_OPTIONS,
  'SystemInventory.REUSED_OPERATIONAL_STATUS_OPTIONS': REUSED_OPERATIONAL_STATUS_OPTIONS,
  'SystemInventory.REUSED_PURPOSE_OPTIONS': REUSED_PURPOSE_OPTIONS,
  'SystemInventory.REUSED_STATUS_OPTIONS': REUSED_STATUS_OPTIONS,
  'SystemInventory.SYSTEM_INVENTORY_TABS': SYSTEM_INVENTORY_TABS,
  'TenantRequirement.NEW_TENANT_REQUIREMENT_FIELDS': NEW_TENANT_REQUIREMENT_FIELDS,
  'TenantRequirement.TENANT_REQUIREMENT_CONFIGURATION_FIELDS': TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
  'TenantRequirement.TENANT_REQUIREMENT_CONTEXT_FIELDS': TENANT_REQUIREMENT_CONTEXT_FIELDS,
  'TenantRequirement.TENANT_REQUIREMENT_ENVIRONMENT_FIELDS': TENANT_REQUIREMENT_ENVIRONMENT_FIELDS,
  'TenantRequirement.requirementAColumns': requirementAColumns,
  'TenantRequirement.requirementAColumns/requirementBColumns/requirementCColumns': [
    ...requirementAColumns,
    ...requirementBColumns,
    ...requirementCColumns,
  ],
  'TenantRequirement.requirementBColumns': requirementBColumns,
  'TenantRequirement.requirementCColumns': requirementCColumns,
  'TenantOperations.TENANT_HOSTING_FIELDS': TENANT_HOSTING_FIELDS,
  'TenantOperations.TENANT_REMARK_TYPES': TENANT_REMARK_TYPES,
  'Picklist.ADDITIONAL_FEATURE_OPTIONS': ADDITIONAL_FEATURE_OPTIONS,
  'Picklist.AI_OPTIONS': AI_OPTIONS,
  'Picklist.CROSS_SYSTEM_OPTIONS': CROSS_SYSTEM_OPTIONS,
  'Picklist.REGION_OPTIONS': REGION_OPTIONS,
  'Picklist.TENANT_FORM_TYPE_OPTIONS': TENANT_FORM_TYPE_OPTIONS,
  'Picklist.YES_NO_OPTIONS': YES_NO_OPTIONS,
  'Picklist.YES_NO_REQUIRED_OPTIONS': YES_NO_REQUIRED_OPTIONS,
}
