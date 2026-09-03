import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const state = JSON.parse(readFileSync(path.join(rootDir, 'src/data/seed.json'), 'utf8'))

function source(relativePath) {
  return readFileSync(path.join(rootDir, relativePath), 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(message)
    process.exitCode = 1
  }
}

function numericSuffix(value, prefix) {
  const match = String(value ?? '').trim().match(new RegExp(`^${prefix}-?(\\d+)$`, 'i'))
  return match ? Number.parseInt(match[1], 10) : null
}

function nextBusinessId(values, prefix, digits = 6) {
  const used = new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))
  let sequence = values.reduce((max, value) => {
    const numeric = numericSuffix(value, prefix)
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, 0) + 1
  let id = `${prefix}${String(sequence).padStart(digits, '0')}`
  while (used.has(id)) {
    sequence += 1
    id = `${prefix}${String(sequence).padStart(digits, '0')}`
  }
  return id
}

function allRequirements(opportunity) {
  return [
    ...(opportunity.newTenantRequirements ?? []),
    ...(opportunity.changeRequestRequirements ?? []),
    ...(opportunity.standardRenewalRequirements ?? []),
  ]
}

function normalizeRequirementId(value) {
  const text = String(value ?? '').trim()
  const suffixed = text.match(/^([A-Z])-(\d{3,})-[A-Z0-9]{6,}$/i)
  return suffixed ? `A-${String(Number.parseInt(suffixed[2], 10)).padStart(3, '0')}` : text
}

function pushRequirementReference(references, requirementId, source, owner) {
  const id = normalizeRequirementId(requirementId)
  if (!id) return
  references.push({ id, source, owner })
}

function requirementIdsFromUnknownRecord(record, seen = new Set()) {
  if (!record || typeof record !== 'object' || seen.has(record)) return []
  seen.add(record)
  const ids = []
  Object.entries(record).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase()
    const carriesRequirementIdentity =
      normalizedKey === 'requirementid' ||
      normalizedKey === 'requirementids' ||
      normalizedKey === 'sourcerequirementid' ||
      normalizedKey === 'releasedrequirementid'
    if (carriesRequirementIdentity) {
      const values = Array.isArray(value) ? value : [value]
      values.forEach((candidate) => {
        const id = normalizeRequirementId(candidate)
        if (id) ids.push(id)
      })
      return
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => ids.push(...requirementIdsFromUnknownRecord(entry, seen)))
      return
    }
    if (value && typeof value === 'object') ids.push(...requirementIdsFromUnknownRecord(value, seen))
  })
  return ids
}

function allRequirementIdentityReferences(inputState = state) {
  const projectsByIdOrPid = new Map()
  ;(inputState.projects ?? []).forEach((project) => {
    projectsByIdOrPid.set(project.id, project)
    projectsByIdOrPid.set(project.pid, project)
  })
  const references = []
  ;(inputState.opportunities ?? []).forEach((opportunity) => {
    allRequirements(opportunity).forEach((requirement) => {
      pushRequirementReference(references, requirement.requirementId, 'Opportunity requirement grid', `${opportunity.opportunityId}:${requirement.id}`)
    })
  })
  ;(inputState.projects ?? []).forEach((project) => {
    requirementIdsFromUnknownRecord(project).forEach((requirementId) => {
      pushRequirementReference(references, requirementId, 'Project retained requirement structure', `${project.pid}:${project.id}`)
    })
  })
  ;(inputState.tenants ?? []).forEach((tenant) => {
    const tenantProject = projectsByIdOrPid.get(tenant.deliveryPid)
    pushRequirementReference(references, tenant.sourceRequirementId, 'Tenant sourceRequirementId', `${tenant.tid}:${tenantProject?.pid ?? ''}`)
    pushRequirementReference(references, tenant.releasedRequirementId, 'Tenant releasedRequirementId', `${tenant.tid}:${tenantProject?.pid ?? ''}`)
    ;(tenant.requirementHistory ?? []).forEach((relationship) => {
      const project = projectsByIdOrPid.get(relationship.projectId) ?? projectsByIdOrPid.get(relationship.pid)
      pushRequirementReference(references, relationship.requirementId, `Tenant requirementHistory ${relationship.status}`, `${tenant.tid}:${project?.pid ?? relationship.pid ?? ''}`)
    })
  })
  ;(inputState.projectTenants ?? []).forEach((link) => {
    const project = projectsByIdOrPid.get(link.projectId)
    requirementIdsFromUnknownRecord(link).forEach((requirementId) => {
      pushRequirementReference(references, requirementId, 'Project tenant retained relationship', `${link.id}:${project?.pid ?? link.projectId}`)
    })
  })
  ;(inputState.projectSystems ?? []).forEach((link) => {
    const project = projectsByIdOrPid.get(link.projectId)
    requirementIdsFromUnknownRecord(link).forEach((requirementId) => {
      pushRequirementReference(references, requirementId, 'Project system retained relationship', `${link.id}:${project?.pid ?? link.projectId}`)
    })
  })
  return references
}

function allRequirementIdentityIds(inputState = state) {
  return allRequirementIdentityReferences(inputState).map((reference) => reference.id)
}

function nextRequirementIdsFromValues(values, count) {
  const used = new Set(values)
  const maxSequence = Array.from(used).reduce((max, requirementId) => {
    const numeric = numericSuffix(requirementId, 'A')
    return Number.isFinite(numeric) ? Math.max(max, numeric) : max
  }, 0)
  const ids = []
  let sequence = maxSequence
  while (ids.length < count) {
    sequence += 1
    const requirementId = `A-${String(sequence).padStart(3, '0')}`
    if (used.has(requirementId)) continue
    used.add(requirementId)
    ids.push(requirementId)
  }
  return ids
}

function nextRequirementIds(count, inputState = state) {
  return nextRequirementIdsFromValues(allRequirementIdentityIds(inputState), count)
}

function duplicates(values) {
  const seen = new Set()
  const duplicated = new Set()
  values.forEach((value) => {
    if (seen.has(value)) duplicated.add(value)
    seen.add(value)
  })
  return Array.from(duplicated)
}

function duplicateSources(references) {
  const byId = new Map()
  references.forEach((reference) => {
    const current = byId.get(reference.id) ?? []
    current.push(reference)
    byId.set(reference.id, current)
  })
  return Array.from(byId.entries())
    .filter(([, refs]) => refs.length > 1)
    .map(([id, refs]) => ({ id, sources: refs.map((ref) => `${ref.source}:${ref.owner}`) }))
}

const hostedProductionSystems = state.systems ?? []
const productionInventory = state.productionSystemInventory ?? []
const reusedInternalSystems = state.reusedInternalSystems ?? []
const tenants = state.tenants ?? []
const opportunities = state.opportunities ?? []
const projects = state.projects ?? []
const infrastructureItems = state.infrastructureItems ?? []
const maintenanceTasks = infrastructureItems.flatMap((item) => item.maintenanceTasks ?? [])
const warrantyIds = [
  ...(state.warrantyRecords ?? []).map((warranty) => warranty.warrantyRecordId),
  ...tenants.flatMap((tenant) => (tenant.warranties ?? []).map((warranty) => warranty.warrantyId)),
  ...infrastructureItems.flatMap((item) => (item.warranties ?? []).map((warranty) => warranty.warrantyId)),
]

const nextIds = {
  opportunity: nextBusinessId(opportunities.map((opportunity) => opportunity.opportunityId), 'OPP'),
  project: nextBusinessId(projects.map((project) => project.pid), 'P'),
  productionSystem: nextBusinessId([...hostedProductionSystems, ...productionInventory].map((system) => system.sid), 'S'),
  tenant: nextBusinessId(tenants.map((tenant) => tenant.tid), 'T'),
  infrastructureItem: nextBusinessId(infrastructureItems.map((item) => item.infrastructureId), 'INF'),
  infrastructureMaintenanceTask: nextBusinessId(maintenanceTasks.map((task) => task.taskId), 'IMT'),
  warranty: nextBusinessId(warrantyIds, 'W'),
  requirements: nextRequirementIds(3),
}
const existingRequirementIds = allRequirementIdentityIds()
const existingMidValues = reusedInternalSystems.map((system) => String(system.machineId ?? '').replace(/^M/i, '')).filter(Boolean)
const duplicateMidCandidate = existingMidValues[0]
const uniqueMidCandidate = String(Math.max(0, ...existingMidValues.map((value) => Number.parseInt(value, 10)).filter(Number.isFinite)) + 1)
const duplicateRequirementIds = duplicates(existingRequirementIds)
const requirementIdentityReferences = allRequirementIdentityReferences()
const requirementIdentitySourceCategories = Array.from(new Set(requirementIdentityReferences.map((reference) => reference.source))).sort()
const opportunityRequirementDefinitions = opportunities.flatMap((opportunity) =>
  allRequirements(opportunity).map((requirement) => ({ id: normalizeRequirementId(requirement.requirementId), source: `${opportunity.opportunityId}:${requirement.id}` })),
)
const projectTenantRuntimeState = {
  ...state,
  projectTenants: [
    ...(state.projectTenants ?? []),
    { id: 'verify-retained-requirement-a-711', projectId: projects[0]?.id ?? '', tenantId: tenants[0]?.id ?? '', requirementId: 'A-711' },
  ],
}
const nextPersistedRuntimeRequirementIds = nextRequirementIds(3, projectTenantRuntimeState)

const businessIdentitySource = source('src/domain/business-identity/service.ts')
const businessReferenceSource = source('src/domain/business-reference/service.ts')
const idGeneratorSource = source('src/data/id-generator.ts')
const tenantRequirementService = source('src/domain/tenant-requirement/service.ts')
const tenantRequirementMetadata = source('src/domain/tenant-requirement/metadata.ts')
const opportunityValidation = source('src/domain/opportunity-lifecycle/validation.ts')
const opportunityForm = source('src/pages/opportunities/OpportunityFormPage.tsx')
const opportunityLifecycleAdapters = source('src/domain/opportunity-lifecycle/adapters.ts')
const storeSource = source('src/store/useAppStore.ts')
const systemValidation = source('src/domain/system-inventory/validation.ts')
const infrastructureForm = source('src/pages/infrastructure/InfrastructureFormPage.tsx')
const infrastructureItemService = source('src/domain/infrastructure-item/service.ts')
const projectForm = source('src/pages/projects/ProjectFormPage.tsx')
const systemInventoryForms = source('src/pages/systems/SystemInventoryFormPages.tsx')
const tenantOperationAdapters = source('src/domain/tenant-operations/adapters.ts')

assert(!opportunityValidation.includes("requiredText(opportunity.opportunityId, 'Opportunity ID')"), 'Opportunity ID must not be user-required in Opportunity validation.')
assert(!opportunityForm.includes("opportunityId: ['Opportunity ID is required.']"), 'Opportunity form must not mark application-owned Opportunity ID as user-missing.')
assert(!opportunityForm.includes('Opportunity ID is required.'), 'Opportunity form must not mask or emit application-owned Opportunity ID validation.')
assert(tenantRequirementMetadata.match(/key: 'requirementId'[\s\S]*?editable: false/g)?.length >= 3, 'Requirement ID columns must be read-only/application-generated.')
assert(tenantRequirementService.includes('requirementIdentityReferences'), 'Requirement allocator must use the shared authoritative Requirement identity-reference namespace.')
assert(tenantRequirementService.includes('Tenant sourceRequirementId'), 'Requirement namespace must include Tenant sourceRequirementId.')
assert(tenantRequirementService.includes('Tenant releasedRequirementId'), 'Requirement namespace must include Tenant releasedRequirementId.')
assert(tenantRequirementService.includes('Tenant requirementHistory'), 'Requirement namespace must include Tenant requirementHistory for current/released/historical/deleted/cancelled tenants.')
assert(tenantRequirementService.includes('Project tenant retained relationship'), 'Requirement namespace must include retained Project/Tenant relationship fields when present.')
assert(tenantRequirementService.includes('Project system retained relationship'), 'Requirement namespace must include retained Project/System relationship fields when present.')
assert(tenantRequirementService.includes('Project retained requirement structure'), 'Requirement namespace must include legacy Project requirement structures when present.')
assert(tenantRequirementService.includes('opportunityWithUniqueTenantRequirementIds'), 'Opportunity Save must have a deterministic Requirement ID normalization helper.')
assert(tenantRequirementService.includes('unavailableRequirementIdsForOpportunitySave'), 'Opportunity Save duplicate safety net must use the shared Requirement namespace.')
assert(opportunityForm.includes('nextTenantRequirementIdForContext'), 'Opportunity form Requirement previews must use the shared Requirement namespace.')
assert(storeSource.includes('opportunityWithUniqueTenantRequirementIds(opportunity'), 'Opportunity Save must normalize generated Requirement IDs before duplicate validation.')
assert(storeSource.includes('projectSystems: state.projectSystems'), 'Opportunity Save must pass Project/System retained context into Requirement ID normalization.')
assert(storeSource.includes('projectTenants: state.projectTenants'), 'Opportunity Save must pass Project/Tenant retained context into Requirement ID normalization.')
assert(!infrastructureForm.includes("createInfrastructureDraft(undefined, reserveBusinessId('infrastructureItem'"), 'Infrastructure New must not reserve/consume an Infrastructure Item ID during draft initialization.')
assert(opportunityForm.includes("previewBusinessIdFromCounter('opportunity'"), 'Opportunity New must initialize an unsaved draft with a non-mutating generated ID preview.')
assert(projectForm.includes("previewBusinessIdFromCounter('project'"), 'Project New must initialize an unsaved draft with a non-mutating PID preview.')
assert(systemInventoryForms.includes("previewBusinessIdFromCounter('productionSystem'"), 'Production System New must initialize an unsaved draft with a non-mutating SID preview.')
assert(systemInventoryForms.includes("isNewRoute ? createReusedInternalInventorySystem('', new Date().toISOString()"), 'Reused Internal System New must initialize a blank unsaved draft and leave MID user-entered.')
assert(infrastructureForm.includes("previewBusinessIdFromCounter('infrastructureItem'"), 'Infrastructure New must initialize an unsaved draft with a non-mutating Infrastructure Item ID preview.')
assert(!infrastructureItemService.includes("reserveBusinessId('infrastructureMaintenanceTask'"), 'Infrastructure Maintenance Task draft/normalization must not permanently reserve IMT IDs before parent Save.')
assert(storeSource.includes('commitBusinessIdFromCounter('), 'Store Save transactions must commit or replace create-mode ID previews at the Save boundary.')
assert(!storeSource.includes('incrementCounter('), 'Store create/save transactions must allocate application-owned IDs with live namespace-aware generators.')
assert(!opportunityLifecycleAdapters.includes('incrementCounter('), 'Opportunity Project sync must allocate PIDs with live namespace-aware generators.')
assert(!tenantOperationAdapters.includes('incrementCounter('), 'Tenant creation must allocate TIDs with live namespace-aware generators.')
assert(businessReferenceSource.includes("if ('sid' in system && system.sid && ('deliveryPid' in system || 'linkedProjectIds' in system || 'tenantIds' in system)) return 'SYSTEM'"), 'Business references must route allocated System instances by SID before source-specific inventory routing.')
assert(!businessReferenceSource.includes("system.source === 'Reused Internal Systems' && 'machineId' in system) return 'INTERNAL_REUSED_SYSTEM'\\n  if ('source' in system && system.source === 'Production'"), 'Business references must not classify Systems by source before allocated-instance SID identity.')
assert(idGeneratorSource.includes("throw new Error('MID is user-defined and must not be autogenerated.')"), 'MID must remain user-defined and unavailable to automatic counters.')
assert(systemValidation.includes("message: 'MID must be unique.'"), 'Duplicate MID must remain validation-blocked.')
assert(businessIdentitySource.includes('maxExistingCounter(entityType, existingIds)'), 'Business ID reservation must consider authoritative existing IDs.')
assert(!businessIdentitySource.match(/function generateBusinessIdFromCounter[\s\S]*?reserveBusinessId\(/), 'Committed business ID generation must not use browser reservation state.')
assert(businessIdentitySource.includes('previewBusinessIdFromCounter'), 'Business Identity must expose non-mutating create-mode ID previews.')
assert(businessIdentitySource.includes('commitBusinessIdFromCounter'), 'Business Identity must commit preview IDs only at Save when still unique.')

Object.entries({
  opportunity: opportunities.map((opportunity) => opportunity.opportunityId),
  project: projects.map((project) => project.pid),
  productionSystem: [...hostedProductionSystems, ...productionInventory].map((system) => system.sid),
  tenant: tenants.map((tenant) => tenant.tid),
  infrastructureItem: infrastructureItems.map((item) => item.infrastructureId),
  infrastructureMaintenanceTask: maintenanceTasks.map((task) => task.taskId),
  warranty: warrantyIds,
}).forEach(([namespace, values]) => {
  assert(!values.includes(nextIds[namespace]), `Next ${namespace} ID ${nextIds[namespace]} must not already exist.`)
})
assert(duplicates(nextIds.requirements).length === 0, 'Multiple generated Requirement IDs in one transaction must be distinct.')
nextIds.requirements.forEach((requirementId) => {
  assert(!existingRequirementIds.includes(requirementId), `Generated Requirement ID ${requirementId} must not already exist in Opportunity or Tenant history.`)
})
assert(!nextPersistedRuntimeRequirementIds.includes('A-711'), 'Existing/historical persisted Requirement ID A-711 must not be regenerated when present.')
assert(Boolean(duplicateMidCandidate), 'Seed must include at least one existing MID for duplicate validation coverage.')
assert(!existingMidValues.includes(uniqueMidCandidate), 'Unique MID candidate must not already exist.')

const illegalDuplicateDefinitions = {
  account: duplicateSources((state.accounts ?? []).map((account) => ({ id: account.accountCode, source: 'Account', owner: account.id }))),
  opportunity: duplicateSources(opportunities.map((opportunity) => ({ id: opportunity.opportunityId, source: 'Opportunity', owner: opportunity.id }))),
  project: duplicateSources(projects.map((project) => ({ id: project.pid, source: 'Project', owner: project.id }))),
  productionSystem: duplicateSources([...hostedProductionSystems, ...productionInventory].map((system) => ({ id: system.sid, source: 'Production System', owner: system.id }))),
  reusedInternalSystemMid: duplicateSources(reusedInternalSystems.map((system) => ({ id: system.machineId, source: 'Reused Internal System MID', owner: system.id }))),
  tenant: duplicateSources(tenants.map((tenant) => ({ id: tenant.tid, source: 'Tenant', owner: tenant.id }))),
  requirementDefinition: duplicateSources(opportunityRequirementDefinitions),
  infrastructureItem: duplicateSources(infrastructureItems.map((item) => ({ id: item.infrastructureId, source: 'Infrastructure Item', owner: item.id }))),
  infrastructureMaintenanceTask: duplicateSources(maintenanceTasks.map((task) => ({ id: task.taskId, source: 'Infrastructure Maintenance Task', owner: task.id }))),
}

Object.entries(illegalDuplicateDefinitions).forEach(([namespace, duplicateRows]) => {
  assert(duplicateRows.length === 0, `Illegal duplicate ${namespace} business IDs found: ${JSON.stringify(duplicateRows.slice(0, 5))}`)
})

console.log(JSON.stringify({
  nextIds,
  nextPersistedRuntimeRequirementIds,
  requirementIdentitySourceCategories,
  existingRequirementIdentityReferenceCount: existingRequirementIds.length,
  duplicateRequirementIdentityReferenceCount: duplicateRequirementIds.length,
  duplicateRequirementIdentityReferenceSample: duplicateRequirementIds.slice(0, 10),
  duplicateRequirementIdentityReferenceDetailsSample: duplicateSources(requirementIdentityReferences).slice(0, 5),
  illegalDuplicateDefinitions,
  duplicateMidCandidate,
  uniqueMidCandidate,
}, null, 2))
