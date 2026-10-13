import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 Application Configuration Summary order verification failed: ${message}`)
    process.exitCode = 1
  }
}

function keyOrder(source, marker) {
  const order = []
  const pattern = new RegExp(`${marker}: '([^']+)'`, 'g')
  let match
  while ((match = pattern.exec(source))) order.push(match[1])
  return order
}

function assertTailOrder(order, label) {
  const aiIndex = order.indexOf('aiFeatures')
  const additionalIndex = order.indexOf('additionalFeatures')
  const apiEnabledIndex = order.indexOf('apiEnabled')
  const apiDailyIndex = order.indexOf('apiDailyQty')
  const apiMonthlyIndex = order.indexOf('apiMonthlyQty')

  assert(aiIndex > -1, `${label} must include AI.`)
  assert(additionalIndex > -1, `${label} must include Additional Features.`)
  assert(apiEnabledIndex > -1, `${label} must include API Enable.`)
  assert(apiDailyIndex > -1, `${label} must include API Daily Qty.`)
  assert(apiMonthlyIndex > -1, `${label} must include API Monthly Qty.`)
  assert(aiIndex < additionalIndex, `${label} must place AI before Additional Features.`)
  assert(additionalIndex + 1 === apiEnabledIndex, `${label} must place API Enable immediately after Additional Features.`)
  assert(apiEnabledIndex + 1 === apiDailyIndex, `${label} must place API Daily Qty immediately after API Enable.`)
  assert(apiDailyIndex + 1 === apiMonthlyIndex, `${label} must place API Monthly Qty immediately after API Daily Qty.`)
  assert(order.at(-3) === 'apiEnabled' && order.at(-2) === 'apiDailyQty' && order.at(-1) === 'apiMonthlyQty', `${label} must keep the three API fields as the final configuration columns.`)
}

function sliceOrder(order, firstKey, afterLastKey) {
  const start = order.indexOf(firstKey)
  const end = order.indexOf(afterLastKey)
  return start > -1 && end > start ? order.slice(start, end) : order
}

const packageJson = JSON.parse(read('package.json'))
const metadata = read('src/domain/application-configuration/metadata.ts')
const tenantColumns = read('src/config/tenant-columns.ts')
const tenantRequirementMetadata = read('src/domain/tenant-requirement/metadata.ts')
const tenantForm = read('src/pages/tenants/TenantFormPage.tsx')
const tenantDeliveryTable = read('src/components/tenants/TenantDeliveryTable.tsx')
const systemDeliveryTable = read('src/components/systems/SystemDeliveryTable.tsx')
const applicationSummaryTable = read('src/components/application-configuration/ApplicationConfigurationSummaryTable.tsx')
const systemInventoryService = read('src/domain/system-inventory/service.ts')
const configurationRenderer = read('src/components/configuration/ConfigurationColumnRenderer.tsx')
const applicationConfigurationService = read('src/domain/application-configuration/service.ts')

assertTailOrder(keyOrder(metadata, 'key'), 'TENANT_APPLICATION_CONFIGURATION_FIELDS')
assertTailOrder(sliceOrder(keyOrder(tenantColumns, 'id'), 'users', 'warrantyInitialDate'), 'Tenant dashboard configuration block')

for (const alias of ['APPLICATION_CONFIGURATION_FIELDS', 'TENANT_CONFIGURATION_FIELDS', 'APPLICATION_CONFIGURATION_SUMMARY_FIELDS']) {
  assert(
    new RegExp(`export const ${alias} = TENANT_APPLICATION_CONFIGURATION_FIELDS`).test(metadata),
    `${alias} must alias TENANT_APPLICATION_CONFIGURATION_FIELDS.`,
  )
}
assert(tenantRequirementMetadata.includes('...APPLICATION_CONFIGURATION_FIELDS'), 'Opportunity requirement grids must compose the shared application configuration fields.')
assert(tenantForm.includes('const CONFIGURATION_FIELDS: TenantConfigurationFieldMetadata[] = TENANT_CONFIGURATION_FIELDS'), 'Tenant form must consume TENANT_CONFIGURATION_FIELDS.')
assert(tenantDeliveryTable.includes('ConfigurationColumnHeaders fields={TENANT_CONFIGURATION_FIELDS}') && tenantDeliveryTable.includes('ConfigurationValueCells record={configurationRecord as unknown as Record<string, unknown>} fields={TENANT_CONFIGURATION_FIELDS}'), 'Tenant related tables must render from TENANT_CONFIGURATION_FIELDS.')
assert(systemDeliveryTable.includes('ConfigurationColumnHeaders fields={APPLICATION_CONFIGURATION_SUMMARY_FIELDS}') && systemDeliveryTable.includes('ConfigurationValueCells record={applicationConfigurationSummary} fields={APPLICATION_CONFIGURATION_SUMMARY_FIELDS}'), 'Project/System related System tables must render from APPLICATION_CONFIGURATION_SUMMARY_FIELDS.')
assert(applicationSummaryTable.includes('APPLICATION_CONFIGURATION_SUMMARY_FIELDS.map'), 'Application Configuration Summary table must render from APPLICATION_CONFIGURATION_SUMMARY_FIELDS.')
assert(systemInventoryService.includes('APPLICATION_CONFIGURATION_SUMMARY_FIELDS.forEach'), 'System configuration aggregation must iterate APPLICATION_CONFIGURATION_SUMMARY_FIELDS.')
assert(/return fields\s*\}/.test(configurationRenderer), 'Shared configuration renderers must preserve metadata order.')
assert(applicationConfigurationService.includes("'API',"), 'Shared application configuration category order must include API as the final configuration category.')
assert(/field\.group === 'API'[\s\S]*return 'API'/.test(applicationConfigurationService), 'Shared category label helper must render API fields with the API group label.')
assert(!/field\.group === 'Additional Sources'[\s\S]*field\.group === 'API'[\s\S]*return 'Additional Features'/.test(applicationConfigurationService), 'Shared category label helper must not render API fields as Additional Features.')
assert(packageJson.scripts['verify:v13-application-configuration-summary-order'] === 'node scripts/verify-v13-application-configuration-summary-order.mjs', 'package.json must expose verify:v13-application-configuration-summary-order.')

if (!process.exitCode) {
  console.log('V1.3 Application Configuration Summary order verification passed')
  console.log('Shared order: AI, Additional Features, API Enable, API Daily Qty, API Monthly Qty')
  console.log('API fields remain the final three shared configuration columns')
}
