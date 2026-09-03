import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path) {
  return readFileSync(join(root, path), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Opportunity project-system allocation verification failed: ${message}`)
    process.exitCode = 1
  }
}

const store = read('src/store/useAppStore.ts')
const lifecycleApplicability = read('src/domain/opportunity-lifecycle/applicability.ts')
const lifecycleValidation = read('src/domain/opportunity-lifecycle/validation.ts')
const coverageAdapters = read('src/domain/requirement-coverage/adapters.ts')
const allocationService = read('src/domain/allocation-context/service.ts')
const allocationValidation = read('src/domain/allocation-context/validation.ts')

function functionBody(source, functionName) {
  const start = source.indexOf(`function ${functionName}`)
  if (start < 0) return ''
  const braceStart = source.indexOf('{', start)
  let depth = 0
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') depth -= 1
    if (depth === 0) return source.slice(braceStart, index + 1)
  }
  return ''
}

assert(
  /function opportunityRequestedSystemTenantIds\(opportunity: Opportunity\): Map<string, string\[\]>/.test(store),
  'Opportunity save must collect requested System IDs through a shared helper.',
)
assert(
  /applicableOpportunityRequirementSources\(opportunity\)/.test(functionBody(store, 'opportunityRequestedSystemTenantIds')),
  'Opportunity requested-System allocation must use currently applicable requirement sources, not all stored rows.',
)
assert(
  /deployTarget === 'EXISTING_SID'/.test(functionBody(store, 'opportunityRequestedSystemTenantIds')) && /add\(requirement\.existingSystemId\)/.test(store),
  'Grid A Existing SID requirements must drive Project/System allocation.',
)
assert(
  /add\(requirement\.systemId, requirement\.tenantId\)/.test(store),
  'Grid B/C existing Tenant/System requirements must preserve Tenant IDs on Project/System links.',
)
assert(
  /new Map<string, string\[\]>\(\)/.test(store) && /Array\.from\(new Set/.test(store),
  'Requested existing System allocation must deduplicate repeated Systems and Tenant IDs.',
)
assert(
  /ensureOpportunityRequestedSystemAllocations\(/.test(store) &&
    /createProjectSystemLink\(project\.id, system\.id/.test(store),
  'Opportunity Project sync must create missing ProjectSystemLink records at Save.',
)
assert(
  /result\.projectChanges\.forEach/.test(store) &&
    /ensureOpportunityRequestedSystemAllocations\(\s*allocationState,\s*committedOpportunity,\s*project,\s*now,\s*\)/m.test(store),
  'Opportunity save transaction must run requested-System allocation for generated or updated Projects.',
)
assert(
  /isSystemOperationallyVisible\(candidate\)/.test(store),
  'Opportunity allocation must not link cancelled or operationally hidden Systems.',
)
assert(
  /export function opportunityWithApplicableRequirements/.test(lifecycleApplicability) &&
    /export function applicableOpportunityRequirementSources/.test(lifecycleApplicability),
  'Opportunity lifecycle domain must define the shared current-applicable requirement rule.',
)
assert(
  /opportunityWithApplicableRequirements\(opportunity\)/.test(lifecycleValidation) &&
    !/has stored rows that are hidden for the selected Opportunity Type\/Subtype/.test(lifecycleValidation),
  'Opportunity validation must validate applicable rows without warning on retained hidden historical rows.',
)
assert(
  /applicableOpportunityRequirementSources\(opportunity\)/.test(coverageAdapters),
  'Requirement Coverage must only project currently applicable Opportunity requirements.',
)
assert(
  /applicableOpportunityRequirementSources\(opportunity\)/.test(allocationService) &&
    /applicableOpportunityRequirementSources\(opportunity\)/.test(allocationValidation),
  'System allocation candidates and validators must use currently applicable Opportunity requirements.',
)

if (!process.exitCode) {
  console.log('Opportunity project-system allocation save flow verified.')
}
