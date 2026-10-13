import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const seedPath = fileURLToPath(new URL('../src/data/seed.json', import.meta.url))
const allocationService = readFileSync(fileURLToPath(new URL('../src/domain/allocation-context/service.ts', import.meta.url)), 'utf8')
const allocationValidation = readFileSync(fileURLToPath(new URL('../src/domain/allocation-context/validation.ts', import.meta.url)), 'utf8')
const projectForm = readFileSync(fileURLToPath(new URL('../src/pages/projects/ProjectFormPage.tsx', import.meta.url)), 'utf8')
const systemCandidateDialog = readFileSync(fileURLToPath(new URL('../src/components/systems/SystemCandidateDialog.tsx', import.meta.url)), 'utf8')
const projectMetadata = readFileSync(fileURLToPath(new URL('../src/domain/project-lifecycle/metadata.ts', import.meta.url)), 'utf8')
const state = JSON.parse(readFileSync(seedPath, 'utf8'))

function assert(condition, message) {
  if (!condition) {
    console.error(message)
    process.exitCode = 1
  }
}

function activeProjectSystemLinks(links) {
  return links.filter((link) => link.allocationStatus !== 'DEALLOCATED')
}

function routeKey(value) {
  const normalized = String(value ?? '').trim()
  const match = normalized.match(/^M(\d+)$/i)
  return match ? match[1] : normalized
}

function machineIdsEqual(first, second) {
  const firstKey = routeKey(first)
  const secondKey = routeKey(second)
  return Boolean(firstKey && secondKey && firstKey === secondKey)
}

function isVisible(row) {
  return !String(row?.operationalStatus ?? '').toLowerCase().includes('cancel')
}

function hasActivePocAllocation(system, activeLinks, projects, allocatedSystems) {
  return activeLinks.some((link) => {
    const allocatedSystem = allocatedSystems.find((candidate) => candidate.id === link.systemId)
    const belongsToSystem =
      machineIdsEqual(link.sourceMachineId, system.machineId) ||
      (system.currentProjectIds ?? []).includes(link.projectId) ||
      Boolean(allocatedSystem && machineIdsEqual(allocatedSystem.machineId, system.machineId))
    const project = projects.find((candidate) => candidate.id === link.projectId)
    return belongsToSystem && project?.mainType === 'POC' && project?.progressStatus === 'OPEN'
  })
}

function reusedInternalAvailabilityStatus(system, activeLinks, projects, allocatedSystems) {
  return hasActivePocAllocation(system, activeLinks, projects, allocatedSystems) ? 'Occupied' : system.purpose === 'None' ? 'Available' : 'Occupied'
}

function hasCurrentAllocation(system, activeLinks, allocatedSystems) {
  return activeLinks.some((link) => {
    if (machineIdsEqual(link.sourceMachineId, system.machineId)) return true
    const allocatedSystem = allocatedSystems.find((candidate) => candidate.id === link.systemId)
    return Boolean(allocatedSystem && machineIdsEqual(allocatedSystem.machineId, system.machineId))
  })
}

function availableReusedInternalCandidates(reusedSystems, projectSystems, projects, allocatedSystems) {
  const activeLinks = activeProjectSystemLinks(projectSystems)
  return reusedSystems.filter((system) =>
    isVisible(system) &&
    reusedInternalAvailabilityStatus(system, activeLinks, projects, allocatedSystems) === 'Available' &&
    system.purpose === 'None' &&
    !hasCurrentAllocation(system, activeLinks, allocatedSystems),
  )
}

function allRequirements(opportunity) {
  return [
    ...(opportunity.newTenantRequirements ?? []).map((requirement) => ({ opportunity, requirement, type: 'A' })),
    ...(opportunity.changeRequestRequirements ?? []).map((requirement) => ({ opportunity, requirement, type: 'B' })),
    ...(opportunity.standardRenewalRequirements ?? []).map((requirement) => ({ opportunity, requirement, type: 'C' })),
  ]
}

function requestedSystemCandidatesForProject(project, opportunity, systems, projectSystems) {
  const requestedSystemIds = new Set()
  allRequirements(opportunity ?? {})
    .filter(({ type, requirement }) => type === 'A' && requirement.deployTarget === 'EXISTING_SID' && requirement.existingSystemId)
    .forEach(({ requirement }) => requestedSystemIds.add(requirement.existingSystemId))
  const activeLinks = activeProjectSystemLinks(projectSystems)
  return systems.filter((system) =>
    requestedSystemIds.has(system.id) &&
    isVisible(system) &&
    !activeLinks.some((link) => link.projectId === project.id && link.systemId === system.id),
  )
}

function requiredExistingTenantAllocationsForProject(project, opportunity, tenants) {
  const tenantsById = new Map(tenants.map((tenant) => [tenant.id, tenant]))
  const requirementsByTenant = new Map()
  allRequirements(opportunity ?? {}).forEach(({ type, requirement }) => {
    if (type !== 'B' && type !== 'C') return
    if (!requirement.tenantId) return
    const source = type === 'B' ? 'GRID_B' : 'GRID_C'
    requirementsByTenant.set(requirement.tenantId, Array.from(new Set([...(requirementsByTenant.get(requirement.tenantId) ?? []), source])))
  })
  return Array.from(requirementsByTenant.entries())
    .map(([tenantId, sources]) => {
      const tenant = tenantsById.get(tenantId)
      return {
        projectId: project.id,
        tenantId,
        systemId: tenant?.hostedSystemId || tenant?.systemId || '',
        sources,
      }
    })
    .filter((allocation) => allocation.systemId)
}

function allocationModesFor(project) {
  return project.mainType === 'POC' ? ['REUSED_INTERNAL', 'EXISTING_SYSTEM'] : ['PRODUCTION', 'EXISTING_SYSTEM']
}

function candidateRegion(candidate) {
  return candidate.usedInRegion || candidate.region || candidate.timeGroup || ''
}

function candidatePresentation(candidate) {
  const isCurrentRis = Boolean(!candidate.sid && candidate.machineId)
  return {
    id: candidate.sid || candidate.machineId || candidate.id,
    mid: candidate.machineId || '',
    purpose: candidate.purpose || '',
    operationalStatus: candidate.operationalStatus || '',
    availability: isCurrentRis
      ? (candidate.purpose === 'None' ? 'Available' : 'Occupied')
      : candidate.availability || candidate.allocationStatus || '',
    usedInRegion: candidateRegion(candidate),
    hostingType: candidate.hostingType || '',
    cloudPlatform: candidate.cloudPlatform || '',
    cloudRegion: candidate.cloudRegion || '',
    product: candidate.productType || '',
  }
}

function candidateMatchesFilters(candidate, filters) {
  return Object.entries(filters).every(([key, expected]) => {
    if (!expected) return true
    if (key === 'regionTimeGroup') return candidateRegion(candidate) === expected
    return String(candidate[key] ?? '') === expected
  })
}

const projects = state.projects ?? []
const opportunities = state.opportunities ?? []
const systems = state.systems ?? []
const projectSystems = state.projectSystems ?? []
const tenants = state.tenants ?? []
const reusedInternalSystems = state.reusedInternalSystems ?? []
const productionSystemInventory = state.productionSystemInventory ?? []

const opportunitiesByProjectId = new Map(projects.map((project) => [
  project.id,
  opportunities.find((opportunity) => opportunity.id === project.opportunityId || opportunity.opportunityId === project.opportunityId),
]))

const sharedImplementation = {
  candidatesUseDerivedAvailability: /reusedInternalAvailabilityStatus\(system, activeLinks, projects, allocatedSystems\) === REUSED_INTERNAL_STATUS_AVAILABLE/.test(allocationService),
  candidatesExcludeCurrentAllocatedMid: /const hasCurrentAllocation = \(system: ReusedInternalSystem\)/.test(allocationService) &&
    /!hasCurrentAllocation\(system\)/.test(allocationService),
  validationUsesDerivedAvailability: /const derivedAvailability = reusedInternalAvailabilityStatus\(reusedSystem, allActiveLinks, context\.projects, context\.systems\)/.test(allocationValidation),
  projectFormPassesFullAllocationContext: /availableReusedInternalCandidates\(reusedInternalSystems, projectSystems, projects, systems\)/.test(projectForm),
  requestedExistingUsesGridAOnly: /source\.requirementType === 'A' && 'deployTarget' in requirement/.test(allocationService) &&
    /requirement\.deployTarget === 'EXISTING_SID'/.test(allocationService),
  candidateDialogSupportsRegionHostingCloudFilters: /SystemCandidateFilterKey = 'hostingType' \| 'cloudPlatform' \| 'regionTimeGroup'/.test(systemCandidateDialog),
  candidateDialogUsesOperationalStatus: /export function candidateStatus\(candidate: SystemCandidate\): string \{\s+return candidate\.operationalStatus\s+\}/m.test(systemCandidateDialog) &&
    /'Operational Status'/.test(systemCandidateDialog),
  candidateDialogDerivesRisAvailability: /reusedInternalAvailabilityStatusForPurpose/.test(systemCandidateDialog) &&
    /return reusedInternalAvailabilityStatusForPurpose\(candidate\.purpose\)/.test(systemCandidateDialog),
}

const projectSubtypeMetadata = [
  ['POC', 'FREE'],
  ['POC', 'PAID'],
  ['POC', 'NONE'],
  ['DELIVERY', 'NEW'],
  ['DELIVERY', 'UPSELL'],
  ['RENEWAL', 'STANDARD'],
  ['RENEWAL', 'UPSELL'],
  ['RENEWAL', 'DOWN_SELL'],
].map(([mainType, subType]) => ({
  mainType,
  subType,
  hasMetadata: projectMetadata.includes(`keyForProject('${mainType}', '${subType}')`),
  allowedModes: allocationModesFor({ mainType }),
}))

const freeRisCandidates = availableReusedInternalCandidates(reusedInternalSystems, projectSystems, projects, systems)
const seededFreeRis = freeRisCandidates.find((system) => system.purpose === 'None')
const manualCreatedRis = {
  ...(seededFreeRis ?? reusedInternalSystems[0]),
  id: 'manual-created-ris-qa',
  machineId: 'M111111',
  purpose: 'None',
  status: 'Occupied',
  usedInRegion: 'NA',
  region: 'NA',
  timeGroup: 'NA',
  hostingType: 'Cloud',
  cloudPlatform: 'AWS',
  currentProjectIds: [],
  operationalStatus: 'On',
}
const manualRisVisible = availableReusedInternalCandidates(
  [...reusedInternalSystems, manualCreatedRis],
  projectSystems,
  projects,
  systems,
).some((system) => system.id === manualCreatedRis.id)
const historicalManualRisVisible = availableReusedInternalCandidates(
  [...reusedInternalSystems, manualCreatedRis],
  [
    ...projectSystems,
    {
      id: 'historical-manual-ris-link',
      projectId: projects.find((project) => project.mainType === 'POC')?.id ?? 'missing-project',
      systemId: 'historical-manual-ris-system',
      sourceMachineId: manualCreatedRis.machineId,
      allocationStatus: 'DEALLOCATED',
      allocationType: 'REUSED_INTERNAL',
      allocatedAt: '2026-08-01T00:00:00.000Z',
      deallocatedAt: '2026-08-02T00:00:00.000Z',
    },
  ],
  projects,
  systems,
).some((system) => system.id === manualCreatedRis.id)
const activeManualRisExcluded = !availableReusedInternalCandidates(
  [...reusedInternalSystems, manualCreatedRis],
  [
    ...projectSystems,
    {
      id: 'active-manual-ris-link',
      projectId: projects.find((project) => project.mainType === 'POC')?.id ?? 'missing-project',
      systemId: 'active-manual-ris-system',
      sourceMachineId: manualCreatedRis.machineId,
      allocationStatus: 'ALLOCATED',
      allocationType: 'REUSED_INTERNAL',
      allocatedAt: '2026-08-01T00:00:00.000Z',
      deallocatedAt: null,
    },
  ],
  projects,
  systems,
).some((system) => system.id === manualCreatedRis.id)

const occupiedRisExcluded = reusedInternalSystems
  .filter((system) => system.purpose !== 'None')
  .every((system) => !freeRisCandidates.some((candidate) => candidate.id === system.id))

const reusedByMachineId = new Map(reusedInternalSystems.map((system) => [routeKey(system.machineId), system]))
const allocatedSystemSnapshotsByMachineId = systems.reduce((groups, system) => {
  if (!system.machineId) return groups
  const key = routeKey(system.machineId)
  groups.set(key, [...(groups.get(key) ?? []), system])
  return groups
}, new Map())
const risCandidatePresentationMismatches = freeRisCandidates
  .map((candidate) => {
    const authoritative = reusedByMachineId.get(routeKey(candidate.machineId))
    const candidateValues = candidatePresentation(candidate)
    const authoritativeValues = authoritative ? candidatePresentation(authoritative) : null
    const differingFields = authoritativeValues
      ? Object.keys(authoritativeValues).filter((field) => candidateValues[field] !== authoritativeValues[field])
      : ['missingAuthoritativeRecord']
    return {
      machineId: candidate.machineId,
      candidateValues,
      authoritativeValues,
      allocatedSystemSnapshotIds: (allocatedSystemSnapshotsByMachineId.get(routeKey(candidate.machineId)) ?? []).map((system) => system.sid || system.id),
      differingFields,
    }
  })
  .filter((row) => row.differingFields.length > 0)
const m000058Authoritative = reusedByMachineId.get(routeKey('M000058'))
const m000058Candidate = freeRisCandidates.find((candidate) => machineIdsEqual(candidate.machineId, 'M000058'))
const m000058Presentation = {
  authoritative: m000058Authoritative ? candidatePresentation(m000058Authoritative) : null,
  candidate: m000058Candidate ? candidatePresentation(m000058Candidate) : null,
  allocatedSystemSnapshots: (allocatedSystemSnapshotsByMachineId.get(routeKey('M000058')) ?? []).map((system) => ({
    sid: system.sid,
    machineId: system.machineId,
    usedInRegion: candidateRegion(system),
    cloudRegion: system.cloudRegion || '',
    product: system.productType || '',
    purpose: system.purpose || '',
    allocationLinks: projectSystems
      .filter((link) => link.systemId === system.id || machineIdsEqual(link.sourceMachineId, system.machineId))
      .map((link) => ({ projectId: link.projectId, allocationStatus: link.allocationStatus })),
  })),
}

const requestedExistingScenarios = projects.flatMap((project) => {
  const opportunity = opportunitiesByProjectId.get(project.id)
  const requirements = allRequirements(opportunity ?? {}).filter(({ type, requirement }) =>
    type === 'A' &&
    requirement.deployTarget === 'EXISTING_SID' &&
    requirement.existingSystemId,
  )
  return requirements.map(({ requirement }) => ({
    pid: project.pid,
    requirementId: requirement.requirementId,
    existingSystemId: requirement.existingSystemId,
    candidatePresent: requestedSystemCandidatesForProject(project, opportunity, systems, projectSystems)
      .some((system) => system.id === requirement.existingSystemId),
    candidatePresentation: requestedSystemCandidatesForProject(project, opportunity, systems, projectSystems)
      .filter((system) => system.id === requirement.existingSystemId)
      .map(candidatePresentation)[0] ?? null,
    authoritativePresentation: candidatePresentation(systems.find((system) => system.id === requirement.existingSystemId) ?? {}),
  }))
})
const requestedExistingPresentationMismatches = requestedExistingScenarios
  .filter((scenario) => scenario.candidatePresentation)
  .filter((scenario) =>
    Object.keys(scenario.authoritativePresentation).some((field) =>
      scenario.candidatePresentation[field] !== scenario.authoritativePresentation[field],
    ),
  )

const automaticTenantAllocationScenarios = projects.flatMap((project) => {
  const opportunity = opportunitiesByProjectId.get(project.id)
  return requiredExistingTenantAllocationsForProject(project, opportunity, tenants)
    .map((allocation) => ({
      pid: project.pid,
      tenantId: allocation.tenantId,
      systemId: allocation.systemId,
      sources: allocation.sources,
      activeSystemLinkPresent: activeProjectSystemLinks(projectSystems).some((link) =>
        link.projectId === project.id &&
        link.systemId === allocation.systemId,
      ),
    }))
})

const filterCoverage = {
  regionMatch: manualRisVisible && candidateMatchesFilters(manualCreatedRis, { regionTimeGroup: 'NA', hostingType: '', cloudPlatform: '' }),
  regionMismatch: manualRisVisible && !candidateMatchesFilters(manualCreatedRis, { regionTimeGroup: 'EMEA', hostingType: '', cloudPlatform: '' }),
  hostingMatch: manualRisVisible && candidateMatchesFilters(manualCreatedRis, { regionTimeGroup: '', hostingType: 'Cloud', cloudPlatform: '' }),
  hostingMismatch: manualRisVisible && !candidateMatchesFilters(manualCreatedRis, { regionTimeGroup: '', hostingType: 'On premise', cloudPlatform: '' }),
  cloudMatch: manualRisVisible && candidateMatchesFilters(manualCreatedRis, { regionTimeGroup: '', hostingType: '', cloudPlatform: 'AWS' }),
  cloudMismatch: manualRisVisible && !candidateMatchesFilters(manualCreatedRis, { regionTimeGroup: '', hostingType: '', cloudPlatform: 'Azure' }),
}

const productionCandidates = productionSystemInventory.filter(isVisible)
const projectModeCoverage = projects.reduce((coverage, project) => {
  coverage[`${project.mainType}:${project.subType}`] = allocationModesFor(project)
  return coverage
}, {})

console.log(JSON.stringify({
  seedPath,
  sharedImplementation,
  projectSubtypeMetadata,
  projectModeCoverage,
  productionCandidateCount: productionCandidates.length,
  reusedInternalCandidateCount: freeRisCandidates.length,
  manualCreatedRis: {
    id: manualCreatedRis.id,
    machineId: manualCreatedRis.machineId,
    purpose: manualCreatedRis.purpose,
    rawStatus: manualCreatedRis.status,
    derivedCandidateRegion: candidateRegion(manualCreatedRis),
    hostingType: manualCreatedRis.hostingType,
    cloudPlatform: manualCreatedRis.cloudPlatform,
  },
  manualRisVisible,
  historicalManualRisVisible,
  activeManualRisExcluded,
  occupiedRisExcluded,
  risCandidatePresentationMismatches,
  m000058Presentation,
  filterCoverage,
  requestedExistingScenarios,
  requestedExistingPresentationMismatches,
  automaticTenantAllocationScenarioCount: automaticTenantAllocationScenarios.length,
  automaticTenantAllocationSamples: automaticTenantAllocationScenarios.slice(0, 8),
}, null, 2))

Object.entries(sharedImplementation).forEach(([name, ok]) => {
  assert(ok, `Allocation shared implementation safeguard failed: ${name}.`)
})
projectSubtypeMetadata.forEach((row) => {
  assert(row.hasMetadata, `Project subtype metadata missing for ${row.mainType}/${row.subType}.`)
})
assert(projectSubtypeMetadata.filter((row) => row.mainType === 'POC').every((row) => row.allowedModes.join('|') === 'REUSED_INTERNAL|EXISTING_SYSTEM'), 'POC projects must allocate RIS or requested existing systems.')
assert(projectSubtypeMetadata.filter((row) => row.mainType !== 'POC').every((row) => row.allowedModes.join('|') === 'PRODUCTION|EXISTING_SYSTEM'), 'Delivery/Renewal projects must allocate Production or requested existing systems.')
assert(productionCandidates.length > 0, 'Canonical seed must include available Production allocation candidates.')
assert(freeRisCandidates.length > 0, 'Canonical seed must include available Reused Internal allocation candidates.')
assert(manualRisVisible, 'A manually created RIS with Purpose None must be an allocation candidate even if stale raw status is Occupied.')
assert(historicalManualRisVisible, 'Historical/deallocated RIS relationships must not remove an otherwise available RIS from candidates.')
assert(activeManualRisExcluded, 'Active RIS relationships must exclude that RIS from candidates.')
assert(occupiedRisExcluded, 'Occupied RIS rows must not appear as allocation candidates.')
assert(risCandidatePresentationMismatches.length === 0, 'Every RIS candidate must present values from the authoritative current Reused Internal System record.')
assert(Boolean(m000058Authoritative), 'Canonical seed must contain authoritative current RIS M000058.')
assert(Boolean(m000058Candidate), 'Canonical seed must expose M000058 as an available RIS allocation candidate.')
assert(JSON.stringify(m000058Presentation.authoritative) === JSON.stringify(m000058Presentation.candidate), 'M000058 candidate presentation must match the authoritative current RIS record.')
Object.entries(filterCoverage).forEach(([name, ok]) => {
  assert(ok, `Allocation candidate filter coverage failed: ${name}.`)
})
assert(requestedExistingScenarios.length > 0, 'Canonical seed must include a Grid A requested existing SID scenario.')
assert(requestedExistingScenarios.every((scenario) => scenario.candidatePresent), 'Requested existing SID scenarios must expose the requested SID as a candidate.')
assert(requestedExistingPresentationMismatches.length === 0, 'Requested Existing System candidates must present values from the authoritative current System record.')
assert(automaticTenantAllocationScenarios.some((scenario) => scenario.sources.includes('GRID_B') && scenario.activeSystemLinkPresent), 'Canonical seed must include a Grid B auto-allocation Tenant/System scenario.')
assert(automaticTenantAllocationScenarios.some((scenario) => scenario.sources.includes('GRID_C') && scenario.activeSystemLinkPresent), 'Canonical seed must include a Grid C auto-allocation Tenant/System scenario.')
