import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 Time Group/Country/Status verification failed: ${message}`)
    process.exitCode = 1
  }
}

function assertIncludes(path, expected, message) {
  assert(read(path).includes(expected), message)
}

const packageJson = JSON.parse(read('package.json'))
const workbookData = read('src/domain/geographic-configuration/workbook-data.ts')
const geography = read('src/domain/geographic-configuration/index.ts')
const timeGroupsPage = read('src/pages/admin/TimeGroupSettingsPage.tsx')
const dashboard = read('src/components/dashboard/DataDashboard.tsx')
const projectLifecycle = read('src/domain/project-lifecycle/service.ts')
const projectColumns = read('src/config/project-columns.ts')
const countriesAdmin = read('src/pages/admin/GeographicConfigurationPages.tsx')

assert((workbookData.match(/"timeGroupId"/g) ?? []).length === 11, 'Workbook-backed Time Group source must still contain 11 Time Groups.')
assert(
  timeGroupsPage.includes("cellContentClassName: `${FULL_CELL_CLASS_NAME} whitespace-nowrap`") &&
    timeGroupsPage.includes("cellClassName: 'min-w-72 whitespace-nowrap'") &&
    timeGroupsPage.includes("headerClassName: 'min-w-72'"),
  'Time Group column must be widened, one-line, and opted out of dashboard cell clamping.',
)
for (const columnId of ['timeZones', 'countries', 'states', 'linkedSids', 'linkedTids']) {
  const columnPattern = new RegExp(`id: '${columnId}',[\\s\\S]*?cellContentClassName: FULL_CELL_CLASS_NAME`)
  assert(columnPattern.test(timeGroupsPage), `${columnId} column must use the full, unclamped wrapped cell presentation.`)
}
assert(
  dashboard.includes('cellContentClassName?: string') &&
    dashboard.includes('<ClampedTableCellContent title={raw} className={column.cellContentClassName}>') &&
    dashboard.includes('dashboardColumnById.get(cell.column.id)?.cellClassName') &&
    dashboard.includes('sourceColumn?.headerClassName'),
  'DataDashboard must expose column-level header, cell, and cell-content class hooks.',
)
assert(
  read('src/index.css').includes('.sf-full-table-cell') &&
    read('src/index.css').includes('-webkit-line-clamp: initial') &&
    read('src/index.css').includes('overflow-wrap: anywhere'),
  'Full table cell class must remove line clamp and allow wrapped full content.',
)

assert(
  geography.includes('function canonicalCountryName') &&
    geography.includes('countryRecordForName(records, countryName)?.countryCodeName') &&
    geography.includes('export function countryDisplayName'),
  'Geography domain must expose shared Country Name to Country Code Name presentation helpers.',
)
for (const path of [
  'src/domain/project-lifecycle/service.ts',
  'src/config/system-columns.ts',
  'src/config/system-inventory-columns.ts',
  'src/config/tenant-columns.ts',
  'src/config/opportunity-columns.ts',
  'src/config/customer-columns.ts',
  'src/components/systems/SystemCandidateDialog.tsx',
  'src/components/tenants/TenantDeliveryTable.tsx',
  'src/pages/projects/ProjectFormPage.tsx',
  'src/pages/tenants/TenantFormPage.tsx',
  'src/pages/opportunities/OpportunityFormPage.tsx',
  'src/pages/customers/Customer360Page.tsx',
]) {
  assertIncludes(path, 'countryDisplayName', `${path} must use the shared country display helper for operational Country presentation.`)
}
assert(
  countriesAdmin.includes("label: 'Country Name'") && countriesAdmin.includes("label: 'Country Code Name'"),
  'Countries admin dashboard must continue to show both Country Name and Country Code Name.',
)

assert(
  projectLifecycle.includes('export function projectStatusLabel(status: string): string') &&
    projectLifecycle.includes("String(status ?? '').trim().toLocaleUpperCase()") &&
    projectLifecycle.includes("normalized === 'CANCELLED' || normalized === 'CANCELED'"),
  'Project status label must normalize authoritative status values through the shared lifecycle selector.',
)
assert(
  projectColumns.includes('projectStatusLabel(row.status)') &&
    projectColumns.includes('showLabel: false'),
  'Project dashboard Status render must use the shared projectStatusLabel with the status icon.',
)
assert(
  packageJson.scripts['verify:v13-time-group-country-status'] === 'node scripts/verify-v13-time-group-country-status.mjs',
  'package.json must expose verify:v13-time-group-country-status.',
)

if (!process.exitCode) {
  console.log('V1.3 Time Group/Country/Status verification passed')
  console.log('Time Group dashboard: full content classes configured for all 11 rows and long columns')
  console.log('Country display: operational surfaces route through shared Country Code Name presentation helper')
  console.log('Project status: dashboard renders the shared lifecycle status label for all project types')
}
