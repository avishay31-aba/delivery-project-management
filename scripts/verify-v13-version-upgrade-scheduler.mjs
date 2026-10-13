import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = process.cwd()
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const failures = []

function expect(condition, message) {
  if (!condition) failures.push(message)
}

const domain = read('src/domain/version-upgrade-scheduler/index.ts')
const systemVersionPanel = read('src/components/systems/SystemVersionUpdatePanel.tsx')
const systemVersionDomain = read('src/domain/system-version-update/index.ts')
const store = read('src/store/useAppStore.ts')
const routes = read('src/routes/index.tsx')
const navigation = read('src/config/navigation.ts')
const persistence = read('src/platform/persistence/app-state-repository.ts')
const migration = read('src/platform/persistence/app-state-migration.ts')
const metadata = read('src/domain/notifications-alerts/metadata.ts')
const notificationService = read('src/domain/notifications-alerts/service.ts')
const page = read('src/pages/version-upgrades/VersionUpgradeSchedulerPage.tsx')
const systemDeliveryTable = read('src/components/systems/SystemDeliveryTable.tsx')
const projectForm = read('src/pages/projects/ProjectFormPage.tsx')
const infrastructureForm = read('src/pages/infrastructure/InfrastructureFormPage.tsx')
const architectureHandbook = read('docs/architecture-handbook.md')

function functionBody(source, functionName) {
  const start = source.indexOf(`function ${functionName}`)
  if (start === -1) return ''
  const open = source.indexOf('{', start)
  if (open === -1) return ''
  let depth = 0
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(open + 1, index)
    }
  }
  return ''
}

expect(domain.includes('eligibleProductionSystemsForUpgrade'), 'Missing shared eligible Production System derivation.')
expect(domain.includes("system.source !== SYSTEM_SOURCE_PRODUCTION"), 'Eligibility must be limited to Production Systems.')
expect(domain.includes('eligibleTenantsForProductionSystem'), 'Eligibility must be driven by shared qualifying Tenant sets.')
expect(domain.includes("tenantDerivedWarrantyContractStatus(tenant).status === 'UNDER_CONTRACT'"), 'Under Contract Tenant warranty must qualify.')
expect(domain.includes("tenantDerivedWarrantyContractStatus(tenant).status === 'NOT_SET_YET'"), 'Not Set Yet Tenant warranty must qualify.')
expect(domain.includes('inactiveStatus(system.operationalStatus)'), 'Cancelled/Deleted Systems must be excluded.')
expect(domain.includes('isTenantOperationallyVisible(tenant)'), 'Cancelled/Deleted Tenants must not create eligibility.')
expect(domain.includes('cloudPlatformMatches'), 'Cloud Platform limitation filter is missing.')
expect(domain.includes('systemIsUpgradedToVersionBuild'), 'Exact Version+Build upgrade derivation is missing.')
expect(domain.includes('update.versionNumberRefId === versionNumberRefId') && domain.includes('update.buildNumberRefId === buildNumberRefId'), 'System Upgraded must require exact Version + Build.')
expect(domain.includes('pending = total - upgraded - confirmed'), 'Pending + Confirmed + Upgraded invariant is not centrally derived.')
expect(domain.includes("completionStatus: upgradedPercent === 0 || total === 0 ? 'HAS_NOT_STARTED_YET'"), 'Zero population must not derive Completed/NaN.')
expect(domain.includes('intervalsOverlap'), 'Engineer availability must use interval-overlap logic.')
expect(domain.includes('supportEngineerAssignments') && domain.includes("roleIdForName('Support Engineer')"), 'Assigned Engineer options must derive from Support Engineer role.')
expect(domain.includes('VERSION_UPGRADE_CUSTOMER_TIME_ZONE_OPTIONS'), 'Customer Time Zone controlled list is missing.')
expect(domain.includes('currentVersionUpdateForSystem'), 'Current Version must use existing Version Update chronology.')

expect(systemVersionPanel.includes('versionUpgradeRecords'), 'System Version Update picker must consume scheduler records.')
expect(!systemVersionPanel.includes('Add new...'), 'System Version Update picker must not expose Add new/... for Version/Build.')
expect(!systemVersionPanel.includes("window.prompt('Add Version Number')"), 'System-level Version creation prompt must be removed.')
expect(!systemVersionPanel.includes("window.prompt('Add Build Number')"), 'System-level Build creation prompt must be removed.')
expect(systemVersionDomain.includes('Version and Build must come from an active Version Upgrade Scheduler record.'), 'System Version Update validation must require scheduler-defined Version/Build pairs.')

expect(store.includes('saveVersionUpgradeRecord'), 'Store missing Version Upgrade save mutation.')
expect(store.includes('cancelVersionUpgradeRecord'), 'Store missing Version Upgrade cancel mutation.')
expect(store.includes('materialScheduleChanged') && store.includes('scheduleConfirmed: materialScheduleChanged ? false'), 'Material schedule changes must require reconfirmation.')
expect(store.includes('deriveEngineerAvailability'), 'Store must block unavailable engineer confirmations.')
expect(store.includes('versionUpgrade.scheduleRequested') && store.includes('versionUpgrade.scheduleUpdated') && store.includes('versionUpgrade.scheduleConfirmed'), 'Real schedule activity events are missing.')

expect(routes.includes('version-upgrades') && routes.includes('VersionUpgradeSchedulerPage'), 'Version Upgrade Scheduler route is missing.')
expect(routes.includes("path: 'version-upgrades/new'"), 'Version Upgrade Scheduler create route is missing.')
expect(navigation.includes('Version Upgrade Scheduler'), 'Version Upgrade Scheduler navigation entry is missing.')
expect(persistence.includes("'versionUpgradeRecords'"), 'Persistence collection must include versionUpgradeRecords.')
expect(migration.includes('versionUpgradeRecords: Array.isArray(state.versionUpgradeRecords)'), 'Migration must normalize versionUpgradeRecords.')
expect(page.includes('Systems to Upgrade') && page.includes('Pending Upgrade Schedule') && domain.includes('Upgrade Schedule Confirmed'), 'Workspace/page missing required scheduler presentation.')
expect(page.includes("location.pathname === '/version-upgrades/new'"), 'Version Upgrade form must recognize the explicit /version-upgrades/new route as create mode.')
expect(page.includes('toolbar={(') && page.includes('+ New Version'), 'New Version action must use DataDashboard toolbar placement.')
expect(!/PageHeader[\s\S]{0,400}actions=\{\([\s\S]{0,400}\+ New Version/.test(page), 'New Version action must not be rendered as a PageHeader action.')

expect(metadata.includes('SYSTEM_UPGRADE_SCHEDULE_REQUESTED'), 'Notification rule missing for schedule requested.')
expect(metadata.includes('SYSTEM_UPGRADE_SCHEDULE_UPDATED'), 'Notification rule missing for schedule updated.')
expect(metadata.includes('SYSTEM_UPGRADE_SCHEDULE_CONFIRMED'), 'Notification rule missing for schedule confirmed.')
expect(notificationService.includes("eventType === 'versionupgrade.schedulerequested'"), 'Notification event mapping missing for schedule requested.')
expect(notificationService.includes("eventType === 'versionupgrade.scheduleupdated'"), 'Notification event mapping missing for schedule updated.')
expect(notificationService.includes("eventType === 'versionupgrade.scheduleconfirmed'"), 'Notification event mapping missing for schedule confirmed.')

expect(architectureHandbook.includes('Read-only Details, Advanced, Expand, and View-details controls'), 'Architecture handbook missing read-only details/advanced control rule.')
expect(systemDeliveryTable.includes("title: 'Access Details'") && systemDeliveryTable.includes("title: 'Hosting'") && systemDeliveryTable.includes("title: 'Identifiers'"), 'System Details must expose Access Details, Hosting, and Identifiers groups.')
expect(systemDeliveryTable.includes('onToggleDetails') && systemDeliveryTable.includes('expandedSystemIds.includes(system.id)'), 'System Details expand/collapse support is missing from the shared System delivery table.')
expect(systemDeliveryTable.includes('formatReadOnlyValue') && !functionBody(systemDeliveryTable, 'renderSystemDetails').match(/<(input|select|textarea)\b|RichTextEditor/), 'System Details content must remain read-only.')
expect(!functionBody(projectForm, 'toggleLinkedSystemDetails').includes('isViewMode'), 'Project System Details toggle must remain available in View mode.')
expect(projectForm.includes('onToggleDetails={toggleLinkedSystemDetails}'), 'Project allocated Systems must use the shared System Details toggle.')
expect(infrastructureForm.includes('onToggleDetails={(systemId) => setExpandedSystemIds'), 'Infrastructure related Systems must keep read-only System Details expandable.')
expect(projectForm.includes('{isViewMode ? null : (') && projectForm.includes('onClick={openAllocationDialog}'), 'Editable allocation actions must still respect View mode.')

if (failures.length > 0) {
  console.error('V1.3 Version Upgrade Scheduler verification failed:')
  failures.forEach((failure) => console.error(`- ${failure}`))
  process.exit(1)
}

console.log('V1.3 Version Upgrade Scheduler verification passed.')
