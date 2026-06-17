import {
  type ApplicationConfigurationFieldMetadata,
  type ApplicationConfigurationKey,
} from '@/domain/application-configuration'

export type {
  ApplicationConfigurationKey as TenantConfigurationKey,
  ApplicationConfigurationFieldMetadata as TenantConfigurationFieldMetadata,
  SharedFieldMetadata,
} from '@/domain/application-configuration'

export {
  APPLICATION_CONFIGURATION_FIELDS,
  APPLICATION_CONFIGURATION_SUMMARY_FIELDS,
  TENANT_CONFIGURATION_FIELDS,
} from '@/domain/application-configuration'

export {
  NEW_TENANT_REQUIREMENT_FIELDS,
  TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
  TENANT_REQUIREMENT_CONTEXT_FIELDS,
  TENANT_REQUIREMENT_ENVIRONMENT_FIELDS,
} from '@/domain/tenant-requirement'
export { SYSTEM_OBJECT_DEFINITION, TENANT_OBJECT_DEFINITION } from '@/domain/object-registry'

export type _ApplicationConfigurationCompatibilityKey = ApplicationConfigurationKey
export type _ApplicationConfigurationCompatibilityField = ApplicationConfigurationFieldMetadata
