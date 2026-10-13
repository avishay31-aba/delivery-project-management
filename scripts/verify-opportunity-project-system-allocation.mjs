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
  /function ensureAutomaticRequirementRelationships\(/.test(store),
  'Opportunity save must use a shared helper for automatic Grid B/C Project relationships.',
)
assert(
  /requiredExistingTenantAllocationsForProject\(project, opportunity, state\.tenants\)/.test(functionBody(store, 'ensureAutomaticRequirementRelationships')),
  'Automatic Project relationship sync must use the AllocationContext Grid B/C derivation.',
)
assert(
  /source\.requirementType === 'A' && 'deployTarget' in requirement/.test(functionBody(allocationService, 'requestedSystemCandidatesForProject')) &&
    /requirement\.deployTarget === 'EXISTING_SID'/.test(functionBody(allocationService, 'requestedSystemCandidatesForProject')),
  'Grid A Existing SID requirements must drive only manual requested-existing System candidates.',
)
assert(
  /source\.requirementType !== 'B' && source\.requirementType !== 'C'/.test(functionBody(allocationService, 'requiredExistingTenantAllocationsForProject')) &&
    /tenantHostingSystemId\(tenant\)/.test(functionBody(allocationService, 'requiredExistingTenantAllocationsForProject')),
  'Grid B/C existing Tenant requirements must derive automatic Project relationships from the Tenant hosting System.',
)
assert(
  /sourcesByTenantId/.test(functionBody(store, 'ensureAutomaticRequirementRelationships')) &&
    /Array\.from\(sourcesByTenantId\.keys\(\)\)/.test(functionBody(store, 'ensureAutomaticRequirementRelationships')),
  'Automatic relationship sync must deduplicate repeated Grid B/C Tenant references.',
)
assert(
  /createProjectSystemLink\(project\.id, hostingSystem\.id/.test(functionBody(store, 'ensureProjectTenantHostingRelationships')) &&
    /allocationSources/.test(functionBody(store, 'ensureProjectTenantHostingRelationships')),
  'Opportunity Project sync must create or merge ProjectSystemLink records with allocation source metadata.',
)
assert(
  /result\.projectChanges\.forEach/.test(store) &&
    /ensureAutomaticRequirementRelationships\(/.test(store),
  'Opportunity save transaction must run automatic Grid B/C relationship sync for generated or updated Projects.',
)
assert(
  /validateProjectTenantHostingRelationshipSync\(state, existingTenantIds\)/.test(store),
  'Opportunity save must validate Grid B/C Tenants resolve to hosting Systems before syncing relationships.',
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
