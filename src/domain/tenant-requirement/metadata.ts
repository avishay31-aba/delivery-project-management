import {
  APPLICATION_CONFIGURATION_FIELDS,
  type SharedFieldMetadata,
} from '@/domain/application-configuration'
import type { RequirementColumnMetadata } from './types'

export const TENANT_REQUIREMENT_CONTEXT_FIELDS: SharedFieldMetadata[] = [
  { key: 'requirementId', label: 'Requirement ID', group: 'Tenant requirements', editable: false },
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
  { key: 'cloudPlatform', label: 'Cloud Platform', group: 'Environment', editable: true, inputType: 'picklist' },
]

export const TENANT_REQUIREMENT_CONFIGURATION_FIELDS: SharedFieldMetadata[] = [
  ...TENANT_REQUIREMENT_ENVIRONMENT_FIELDS,
  ...APPLICATION_CONFIGURATION_FIELDS,
]

export const NEW_TENANT_REQUIREMENT_FIELDS: SharedFieldMetadata[] = [
  ...TENANT_REQUIREMENT_CONTEXT_FIELDS,
  ...TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
]

export const requirementAColumns: RequirementColumnMetadata[] = NEW_TENANT_REQUIREMENT_FIELDS

export const requirementBColumns: RequirementColumnMetadata[] = [
  { key: 'requirementId', label: 'Req ID', group: 'Tenant requirements', editable: false },
  { key: 'tenantId', label: 'TID', group: 'Tenant requirements', editable: true, required: true },
  { key: 'systemId', label: 'SID', group: 'Tenant requirements', editable: false },
  { key: 'deliveryPid', label: 'Delivery PID', group: 'Tenant requirements', editable: false },
  ...TENANT_REQUIREMENT_CONFIGURATION_FIELDS,
]

export const requirementCColumns: RequirementColumnMetadata[] = [
  { key: 'requirementId', label: 'Req ID', group: 'Tenant requirements', editable: false },
  { key: 'tenantId', label: 'TID', group: 'Tenant requirements', editable: true, required: true },
  { key: 'systemId', label: 'SID', group: 'Tenant requirements', editable: false },
  { key: 'deliveryPid', label: 'Delivery PID', group: 'Tenant requirements', editable: false },
  { key: 'warrantyStatus', label: 'Warranty status', group: 'Renewal context', editable: false },
  { key: 'warrantyEndDate', label: 'Warranty end date', group: 'Renewal context', editable: false },
  ...TENANT_REQUIREMENT_CONFIGURATION_FIELDS.map((column) => ({ ...column, editable: false, required: false, requiredWhen: undefined })),
]
