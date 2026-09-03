import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Configuration schema verification failed: ${message}`)
    process.exitCode = 1
  }
}

const applicationMetadata = read('src/domain/application-configuration/metadata.ts')
const tenantRequirementMetadata = read('src/domain/tenant-requirement/metadata.ts')
const tenantFormPage = read('src/pages/tenants/TenantFormPage.tsx')
const tenantDeliveryTable = read('src/components/tenants/TenantDeliveryTable.tsx')
const systemDeliveryTable = read('src/components/systems/SystemDeliveryTable.tsx')
const applicationSummaryTable = read('src/components/application-configuration/ApplicationConfigurationSummaryTable.tsx')
const systemInventoryService = read('src/domain/system-inventory/service.ts')
const configurationColumnRenderer = read('src/components/configuration/ConfigurationColumnRenderer.tsx')
const applicationValidation = read('src/domain/application-configuration/validation.ts')
const tenantColumns = read('src/config/tenant-columns.ts')
const seed = JSON.parse(read('src/data/seed.json'))

assert(
  /export const TENANT_APPLICATION_CONFIGURATION_FIELDS: ApplicationConfigurationFieldMetadata\[\] = \[/.test(applicationMetadata),
  'TENANT_APPLICATION_CONFIGURATION_FIELDS must be the authoritative Product-to-end metadata array.',
)

for (const alias of [
  'APPLICATION_CONFIGURATION_FIELDS',
  'TENANT_CONFIGURATION_FIELDS',
  'APPLICATION_CONFIGURATION_SUMMARY_FIELDS',
]) {
  assert(
    new RegExp(`export const ${alias} = TENANT_APPLICATION_CONFIGURATION_FIELDS`).test(applicationMetadata),
    `${alias} must alias TENANT_APPLICATION_CONFIGURATION_FIELDS instead of defining an independent schema.`,
  )
}

assert(
  /\.\.\.APPLICATION_CONFIGURATION_FIELDS/.test(tenantRequirementMetadata),
  'Opportunity New Tenant Requirements must compose the shared Product-to-end metadata directly.',
)
assert(
  !/APPLICATION_CONFIGURATION_FIELDS\.map/.test(tenantRequirementMetadata),
  'Opportunity New Tenant Requirements must not copy or strip shared configuration field metadata.',
)
assert(
  /const CONFIGURATION_FIELDS: TenantConfigurationFieldMetadata\[\] = TENANT_CONFIGURATION_FIELDS/.test(tenantFormPage),
  'Tenant Configuration must consume TENANT_CONFIGURATION_FIELDS.',
)
assert(
  /import \{ TENANT_CONFIGURATION_FIELDS \} from '@\/domain\/application-configuration'/.test(tenantDeliveryTable) &&
    !/TENANT_REQUIREMENT_CONFIGURATION_FIELDS/.test(tenantDeliveryTable),
  'System Tenant tables must consume TENANT_CONFIGURATION_FIELDS, not the broader requirement-environment schema.',
)
assert(
  /ConfigurationColumnHeaders fields=\{APPLICATION_CONFIGURATION_SUMMARY_FIELDS\}/.test(systemDeliveryTable) &&
    /ConfigurationValueCells record=\{applicationConfigurationSummary\} fields=\{APPLICATION_CONFIGURATION_SUMMARY_FIELDS\}/.test(systemDeliveryTable),
  'System delivery summary columns must consume APPLICATION_CONFIGURATION_SUMMARY_FIELDS.',
)
assert(
  /APPLICATION_CONFIGURATION_SUMMARY_FIELDS\.map/.test(applicationSummaryTable),
  'Application Configuration Summary table must render from APPLICATION_CONFIGURATION_SUMMARY_FIELDS.',
)
assert(
  /APPLICATION_CONFIGURATION_SUMMARY_FIELDS\.forEach/.test(systemInventoryService),
  'System aggregation must iterate APPLICATION_CONFIGURATION_SUMMARY_FIELDS.',
)
assert(
  /createConfigurationColumnsFromMetadata\(fields: SharedFieldMetadata\[\]\): SharedFieldMetadata\[\] \{\s*return fields\s*\}/m.test(configurationColumnRenderer),
  'Configuration renderers must preserve authoritative metadata order.',
)

assert(
  applicationMetadata.indexOf("key: 'aiFeatures'") > -1 &&
    applicationMetadata.indexOf("key: 'apiEnabled'") > -1 &&
    applicationMetadata.indexOf("key: 'aiFeatures'") < applicationMetadata.indexOf("key: 'apiEnabled'"),
  'AI fields must precede API fields in the shared application configuration metadata.',
)
assert(
  tenantColumns.indexOf("id: 'aiFeatures'") > -1 &&
    tenantColumns.indexOf("id: 'apiEnabled'") > -1 &&
    tenantColumns.indexOf("id: 'aiFeatures'") < tenantColumns.indexOf("id: 'apiEnabled'"),
  'Tenant dashboard configuration columns must present AI before API.',
)
assert(
  /key: 'blockchain'[^}]*inputType: 'integer'/.test(applicationMetadata),
  'Blockchain must use the shared integer module-quantity field presentation.',
)
assert(
  /\['blockchain', 'Blockchain'\]/.test(applicationValidation),
  'Blockchain must participate in shared integer and module quantity validation.',
)

function configurationRecords() {
  const records = []
  for (const opportunity of seed.opportunities ?? []) {
    records.push(...(opportunity.newTenantRequirements ?? []))
    records.push(...(opportunity.changeRequestRequirements ?? []))
    records.push(...(opportunity.standardRenewalRequirements ?? []))
  }
  records.push(...(seed.tenants ?? []))
  records.push(...(seed.tenants ?? []).map((tenant) => tenant.configuration).filter(Boolean))
  records.push(...(seed.systems ?? []))
  records.push(...(seed.productionSystemInventory ?? []))
  records.push(...(seed.reusedInternalSystems ?? []))
  return records
}

configurationRecords().forEach((record, index) => {
  const value = record.blockchain
  assert(
    value == null || (typeof value === 'number' && Number.isInteger(value) && value >= 0),
    `Configuration record ${index + 1} has a non-integer Blockchain value.`,
  )
  if (typeof value === 'number' && typeof record.users === 'number') {
    assert(
      value <= record.users,
      `Configuration record ${index + 1} has Blockchain greater than Users.`,
    )
  }
})

if (!process.exitCode) {
  console.log('Shared application configuration schema verified.')
}
