import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { matchRoutes } from 'react-router-dom'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function source(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(message)
    process.exitCode = 1
  }
}

function isCreateRouteParam(value) {
  return String(value ?? '').trim().toLocaleLowerCase() === 'new'
}

function isCreateRoute(pathname, value) {
  if (isCreateRouteParam(value)) return true
  const segments = pathname.split('/').filter(Boolean)
  return segments.at(-1)?.toLocaleLowerCase() === 'new'
}

const routes = [
  { path: '/opportunities/new', id: 'opportunityCreate' },
  { path: '/opportunities/:opportunityId', id: 'opportunityExisting' },
  { path: '/projects/new', id: 'projectCreate' },
  { path: '/projects/:pid', id: 'projectExisting' },
  { path: '/systems/new', id: 'systemCreateRedirect' },
  { path: '/systems/production-inventory/new', id: 'productionSystemCreate' },
  { path: '/systems/production-inventory/:sid', id: 'productionSystemExisting' },
  { path: '/systems/reused-internal/new', id: 'reusedSystemCreate' },
  { path: '/systems/reused-internal/:mid', id: 'reusedSystemExisting' },
  { path: '/systems/cancelled', id: 'cancelledSystemsDashboard' },
  { path: '/systems/:sid', id: 'allocatedSystemExisting' },
  { path: '/tenants/:tid', id: 'tenantExisting' },
  { path: '/infrastructure/:infrastructureId', id: 'infrastructureExistingAndCreate' },
]

function lastRouteMatch(pathname) {
  return matchRoutes(routes, pathname)?.at(-1)
}

const routeCases = [
  { name: 'Project create', path: '/projects/new', routeId: 'projectCreate', param: 'pid', create: true, expectedParam: undefined },
  { name: 'Project existing', path: '/projects/P000001', routeId: 'projectExisting', param: 'pid', create: false, expectedParam: 'P000001' },
  { name: 'Project nonexistent', path: '/projects/P999999', routeId: 'projectExisting', param: 'pid', create: false, expectedParam: 'P999999' },
  { name: 'Opportunity create', path: '/opportunities/new', routeId: 'opportunityCreate', param: 'opportunityId', create: true, expectedParam: undefined },
  { name: 'Opportunity existing', path: '/opportunities/OPP000001', routeId: 'opportunityExisting', param: 'opportunityId', create: false, expectedParam: 'OPP000001' },
  { name: 'Production System create', path: '/systems/production-inventory/new', routeId: 'productionSystemCreate', param: 'sid', create: true, expectedParam: undefined },
  { name: 'Production System existing', path: '/systems/production-inventory/S000001', routeId: 'productionSystemExisting', param: 'sid', create: false, expectedParam: 'S000001' },
  { name: 'Reused Internal System create', path: '/systems/reused-internal/new', routeId: 'reusedSystemCreate', param: 'mid', create: true, expectedParam: undefined },
  { name: 'Reused Internal System existing', path: '/systems/reused-internal/M000001', routeId: 'reusedSystemExisting', param: 'mid', create: false, expectedParam: 'M000001' },
  { name: 'Cancelled Systems dashboard', path: '/systems/cancelled', routeId: 'cancelledSystemsDashboard', param: 'sid', create: false, expectedParam: undefined },
  { name: 'Allocated System existing', path: '/systems/S000001', routeId: 'allocatedSystemExisting', param: 'sid', create: false, expectedParam: 'S000001' },
  { name: 'Allocated System generic new redirect', path: '/systems/new', routeId: 'systemCreateRedirect', param: 'sid', create: true, expectedParam: undefined },
  { name: 'Tenant existing', path: '/tenants/T000001', routeId: 'tenantExisting', param: 'tid', create: false, expectedParam: 'T000001' },
  { name: 'Infrastructure create control', path: '/infrastructure/new', routeId: 'infrastructureExistingAndCreate', param: 'infrastructureId', create: true, expectedParam: 'new' },
  { name: 'Infrastructure existing control', path: '/infrastructure/INF000001', routeId: 'infrastructureExistingAndCreate', param: 'infrastructureId', create: false, expectedParam: 'INF000001' },
]

const routeResults = routeCases.map((testCase) => {
  const match = lastRouteMatch(testCase.path)
  const paramValue = match?.params?.[testCase.param]
  const actualCreate = isCreateRoute(testCase.path, paramValue)
  assert(match?.route.id === testCase.routeId, `${testCase.name} matched ${match?.route.id ?? 'nothing'} instead of ${testCase.routeId}.`)
  assert(paramValue === testCase.expectedParam, `${testCase.name} param ${testCase.param} was ${String(paramValue)} instead of ${String(testCase.expectedParam)}.`)
  assert(actualCreate === testCase.create, `${testCase.name} create-mode detection was ${actualCreate} instead of ${testCase.create}.`)
  return { name: testCase.name, path: testCase.path, routeId: match?.route.id, paramValue: paramValue ?? null, createMode: actualCreate }
})

const projectForm = source('src/pages/projects/ProjectFormPage.tsx')
const opportunityForm = source('src/pages/opportunities/OpportunityFormPage.tsx')
const systemInventoryForm = source('src/pages/systems/SystemInventoryFormPages.tsx')
const routesSource = source('src/routes/index.tsx')
const infrastructureForm = source('src/pages/infrastructure/InfrastructureFormPage.tsx')

const lookupSource = source('src/components/ui/SearchableReferenceLookup.tsx')

assert(projectForm.includes('isCreateRoute(location, pid)'), 'Project form must use route-aware create detection.')
assert(projectForm.includes('SearchableReferenceLookup'), 'Project Opportunity field must use the shared searchable reference lookup.')
assert(
  /if \(field\.key === 'opportunityId'\)[\s\S]*controlWidthClassName="w-64"/.test(projectForm) &&
    /return \(\s*<FormField key=\{field\.key\} label=\{label\} controlWidthClassName="w-64">/.test(projectForm),
  'Project Opportunity lookup must use the same shared header width as Project Name.',
)
assert(
  projectForm.includes('searchTitle="Search Opportunities"') &&
    projectForm.includes('searchPlaceholder="Search by Opportunity Name or Opportunity ID"'),
  'Project Opportunity lookup must search the full Opportunity name and ID dataset.',
)
assert(
  lookupSource.includes('export const SEARCHABLE_REFERENCE_DEFAULT_LIMIT = 5') &&
    lookupSource.includes("searchOptionLabel = 'Search...'") &&
    lookupSource.includes('selectLabel = \'Select\''),
  'Shared reference lookup must default to five options plus Search... and confirm with Select.',
)
assert(
  systemInventoryForm.includes("tenantOccupiesRequirement(tenant) ? 'Replace REQ-ID' : 'Attach REQ-ID'"),
  'System Tenant actions must label Requirement ID attach versus replace without changing eligibility.',
)
assert(opportunityForm.includes('isCreateRoute(location, opportunityId)'), 'Opportunity form must use route-aware create detection.')
assert(systemInventoryForm.includes('isCreateRoute(location, sid)'), 'Production System form must use route-aware create detection.')
assert(systemInventoryForm.includes('isCreateRoute(location, mid)'), 'Reused Internal System form must use route-aware create detection.')
assert(systemInventoryForm.includes('isCreateMode={isNewRoute}'), 'System inventory form must pass explicit create mode into the shared form.')
assert(systemInventoryForm.includes('const hasBusinessChanges = isCreateMode ||'), 'System save must treat create mode as a real Save-boundary creation.')
assert(routesSource.indexOf("path: 'projects/new'") < routesSource.indexOf("path: 'projects/:pid'"), 'Project /new route must be declared before /:pid.')
assert(routesSource.indexOf("path: 'opportunities/new'") < routesSource.indexOf("path: 'opportunities/:opportunityId'"), 'Opportunity /new route must be declared before /:opportunityId.')
assert(routesSource.indexOf("path: 'systems/production-inventory/new'") < routesSource.indexOf("path: 'systems/production-inventory/:sid'"), 'Production System /new route must be declared before /:sid.')
assert(routesSource.indexOf("path: 'systems/reused-internal/new'") < routesSource.indexOf("path: 'systems/reused-internal/:mid'"), 'Reused Internal System /new route must be declared before /:mid.')
assert(routesSource.indexOf("path: 'systems/cancelled'") < routesSource.indexOf("path: 'systems/:sid'"), 'Cancelled Systems dashboard route must be declared before /systems/:sid.')
assert(!routesSource.includes("path: 'tenants/cancelled'"), 'Tenant Workspace must not expose a Cancelled Tenants dashboard route.')
assert(routesSource.includes('<Navigate to="/systems/production-inventory/new" replace />'), 'Generic /systems/new must redirect to the supported Production System create route.')
assert(infrastructureForm.includes("const isNew = infrastructureId === 'new'"), 'Infrastructure control flow must remain route-param create mode.')

const listSources = [
  'src/pages/projects/ProjectListPage.tsx',
  'src/pages/opportunities/OpportunityListPage.tsx',
  'src/pages/systems/ProductionSystemInventoryPage.tsx',
  'src/pages/systems/ReusedInternalSystemsInventoryPage.tsx',
  'src/pages/systems/SystemListPage.tsx',
].map((file) => ({ file, text: source(file) }))
const forbiddenDashboardCreates = /\b(createOpportunity|createProject|createProductionSystemInventoryItem|createReusedInternalSystem)\s*\(/g
listSources.forEach(({ file, text }) => {
  assert(!forbiddenDashboardCreates.test(text), `${file} must not call persisted create mutations from dashboard New actions.`)
})

console.log(JSON.stringify({ verifiedCreateRoutes: routeResults }, null, 2))
