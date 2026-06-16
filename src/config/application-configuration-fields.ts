import {
  APPLICATION_CONFIGURATION_FIELDS,
  type ApplicationConfigurationFieldMetadata,
  type ApplicationConfigurationKey,
  type SharedFieldMetadata,
} from '@/domain/application-configuration'

export type {
  ApplicationConfigurationKey as TenantConfigurationKey,
  ApplicationConfigurationFieldMetadata as TenantConfigurationFieldMetadata,
  SharedFieldMetadata,
}

export {
  APPLICATION_CONFIGURATION_FIELDS,
  APPLICATION_CONFIGURATION_SUMMARY_FIELDS,
  TENANT_CONFIGURATION_FIELDS,
} from '@/domain/application-configuration'

export const TENANT_REQUIREMENT_CONTEXT_FIELDS: SharedFieldMetadata[] = [
  { key: 'requirementId', label: 'Requirement ID', group: 'Tenant requirements', editable: true },
  { key: 'deployTarget', label: 'New / Existing System', group: 'Environment', editable: true, inputType: 'picklist', required: true },
  {
    key: 'existingSystemId',
    label: 'Existing System ID',
    group: 'Environment',
    editable: true,
    requiredWhen: 'Required when New / Existing System = Existing System',
  },
]

export const TENANT_REQUIREMENT_ENVIRONMENT_FIELDS: SharedFieldMetadata[] = [
  { key: 'hostingType', label: 'Hosting', group: 'Environment', editable: true, inputType: 'picklist', required: true },
  { key: 'cloudPlatform', label: 'Cloud Platform', group: 'Environment', editable: true, inputType: 'picklist', required: true },
]

export const TENANT_REQUIREMENT_CONFIGURATION_FIELDS: SharedFieldMetadata[] = [
  ...TENANT_REQUIREMENT_ENVIRONMENT_FIELDS,
  ...APPLICATION_CONFIGURATION_FIELDS.map(({ configKey: _configKey, ...field }) => field),
]

export const NEW_TENANT_REQUIREMENT_FIELDS: SharedFieldMetadata[] = [
  ...TENANT_REQUIREMENT_CONTEXT_FIELDS,
  ...TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
]

export type _ApplicationConfigurationCompatibilityKey = ApplicationConfigurationKey
export type _ApplicationConfigurationCompatibilityField = ApplicationConfigurationFieldMetadata
