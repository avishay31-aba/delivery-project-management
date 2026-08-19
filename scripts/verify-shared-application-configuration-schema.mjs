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

if (!process.exitCode) {
  console.log('Shared application configuration schema verified.')
}
