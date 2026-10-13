import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 System form final QA verification failed: ${message}`)
    process.exitCode = 1
  }
}

const systemForm = read('src/pages/systems/SystemInventoryFormPages.tsx')
const tenantRequirementService = read('src/domain/tenant-requirement/service.ts')
const appStore = read('src/store/useAppStore.ts')
const linkedProjectsService = read('src/domain/linked-projects/service.ts')
const linkedProjectsTable = read('src/components/projects/LinkedProjectsTable.tsx')
const ownerGrid = read('src/components/owners/OwnerGrid.tsx')
const systemInventoryService = read('src/domain/system-inventory/service.ts')
const systemInventoryColumns = read('src/config/system-inventory-columns.ts')
const systemInventoryMetadata = read('src/domain/system-inventory/metadata.ts')
const systemInventoryMetadataConfig = read('src/config/system-inventory-metadata.ts')
const systemInventoryValidation = read('src/domain/system-inventory/validation.ts')
const projectLifecycleTypes = read('src/domain/project-lifecycle/types.ts')
const projectLifecycleValidation = read('src/domain/project-lifecycle/validation.ts')
const projectLifecycleService = read('src/domain/project-lifecycle/service.ts')
const projectForm = read('src/pages/projects/ProjectFormPage.tsx')
const opportunityForm = read('src/pages/opportunities/OpportunityFormPage.tsx')
const tenantForm = read('src/pages/tenants/TenantFormPage.tsx')
const infrastructureForm = read('src/pages/infrastructure/InfrastructureFormPage.tsx')
const notificationsPage = read('src/pages/notifications/NotificationsAlertsPage.tsx')
const saveApplyNavigation = read('src/utils/save-apply-navigation.ts')
const standingRules = read('docs/v1.2-standing-product-rules.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  tenantRequirementService.includes('occupyingTenants: Tenant[]') &&
    tenantRequirementService.includes('const occupancy = new Map<string, Tenant[]>()') &&
    tenantRequirementService.includes('disabled: false') &&
    !tenantRequirementService.includes('currentTenantId') &&
    !tenantRequirementService.includes('disabled: Boolean(occupyingTenant'),
  'Tenant Requirement options must support one-to-many Tenant references and must not disable options because another Tenant already uses the Requirement.',
)

assert(
  systemForm.includes('Replace tenant requirement') &&
    systemForm.includes('Replace Requirement ID') &&
    systemForm.includes('Replace Requirement') &&
    systemForm.includes('<FormField label="PID"') &&
    systemForm.includes('<FormField label="Tenant Requirement ID"') &&
    systemForm.includes("tenant.tenantType !== 'CUSTOMER' && tenant.tenantType !== 'POC'") &&
    !systemForm.includes('Attach REQ-ID') &&
    !systemForm.includes('Replace REQ-ID') &&
    !systemForm.includes('renderAttachTenantRequirementDialog'),
  'System Tenant row actions must expose Add-Tenant-structured Replace Requirement ID only for Customer/POC Tenants and must remove legacy Attach/REQ-ID actions.',
)

assert(
  appStore.includes("eventType: 'tenant.requirementReplaced'") &&
    appStore.includes("status: 'HISTORICAL' as const") &&
    appStore.includes('deliveryPid: project.pid') &&
    appStore.includes('sourceRequirementId: requirement.requirementId') &&
    !appStore.includes('blockingTenant') &&
    !appStore.includes('already occupied by Tenant'),
  'Replace Requirement transaction must update the existing Tenant Project/Requirement relationship without creating a new Tenant or blocking many-to-one Requirement reuse.',
)

assert(
  linkedProjectsService.includes('allocatedSystems: System[]') &&
    linkedProjectsService.includes('linkBelongsToSystem') &&
    linkedProjectsService.includes('linkedProjectIdsForSystem(system, context.projectSystems)') &&
    linkedProjectsService.includes('context.projectSystems\n    .filter(linkBelongsToSystem)') &&
    linkedProjectsService.includes('reusedInternalMachineIdsEqual(allocatedSystem.machineId, system.machineId)') &&
    linkedProjectsService.includes('linkedProjectAllocatedSystemLabel') &&
    linkedProjectsTable.includes('includeAllocatedSystems') &&
    linkedProjectsTable.includes('chunked(row.allocatedSystems, 5)') &&
    linkedProjectsTable.includes('systemReference(system)') &&
    systemInventoryMetadata.includes("label: 'Linked Projects'") &&
    systemForm.includes('title="Linked Projects"') &&
    !systemInventoryMetadata.includes("label: 'Current Linked Project'") &&
    !systemForm.includes('title="Current Linked Project"'),
  'Linked Projects table must derive historical relationships from authoritative Project/System allocation links and render linked SIDs in groups of five.',
)

assert(
  ownerGrid.includes('maxOwners?: number') &&
    ownerGrid.includes('currentOwners = typeof maxOwners') &&
    systemForm.includes('maxOwners={1}') &&
    systemForm.includes("const OWNER_REQUIRED_PURPOSES = new Set(['Demo', 'Training', 'Support'])") &&
    appStore.includes("const RIS_OWNER_REQUIRED_PURPOSES = new Set(['Demo', 'Training', 'Support'])") &&
    appStore.includes('reusedInternalOwnerRequirementMessages'),
  'RIS Owner tab and save paths must enforce exactly one current owner and require an owner when Purpose changes to Demo, Training, or Support.',
)

assert(
  systemInventoryService.includes("const REUSED_INTERNAL_MANUAL_OCCUPATION_PURPOSES = new Set(['Demo', 'Training', 'Support'])") &&
    systemInventoryService.includes('export function isOccupationPeriodVisibleForPurpose') &&
    systemInventoryService.includes('REUSED_INTERNAL_MANUAL_OCCUPATION_PURPOSES.has(system.purpose)') &&
    systemInventoryValidation.includes('isOccupationPeriodVisibleForPurpose(textValue(purpose))') &&
    systemInventoryService.includes('derivedFromActivePocAllocation: true') &&
    systemForm.includes('leavingPoc || !isOccupationPeriodVisibleForPurpose(nextPurpose)') &&
    systemForm.includes('if (isReusedInternalRecord && isOccupationDateField && !isOccupationPeriodVisibleForPurpose(purpose)) return null') &&
    appStore.includes('safePatch.occupationStartDate = null') &&
    appStore.includes('safePatch.occupationEndDate = null') &&
    systemInventoryService.includes("project.progressStatus === 'OPEN'") &&
    systemInventoryService.includes('allocatedSystems.find((candidate) => candidate.id === link.systemId)') &&
    systemInventoryService.includes('currentProjectIds: activePocProjects.map((project) => project.id)') &&
    systemInventoryService.includes('system.purpose === SYSTEM_PURPOSE_POC') &&
    systemInventoryService.includes('REUSED_INTERNAL_PURPOSE_NONE') &&
    systemInventoryService.includes("currentProjectIds: window.derivedFromActivePocAllocation ? Array.from(new Set(window.currentProjectIds ?? [])) : []") &&
    systemInventoryValidation.includes('context.systems ?? []'),
  'RIS occupied-period rules must hide and clear only None/OBSOLETE, derive current POC state from authoritative open POC Projects, clear stale current POC fields when no active POC exists, and preserve mandatory user-entered Demo/Training/Support dates.',
)

assert(
  systemInventoryMetadata.includes("REUSED_MANUAL_PURPOSE_OPTIONS = [REUSED_INTERNAL_PURPOSE_NONE, 'Demo', 'Training', 'Support', REUSED_INTERNAL_PURPOSE_OBSOLETE]") &&
    systemInventoryMetadataConfig.includes('REUSED_MANUAL_PURPOSE_OPTIONS') &&
    systemInventoryColumns.includes('REUSED_MANUAL_PURPOSE_OPTIONS'),
  'Manual RIS Purpose picklists must exclude POC while retaining POC as a system-managed lifecycle/domain value.',
)

assert(
  systemInventoryColumns.match(/label: 'Performance Tier'/g)?.length >= 4 &&
    systemInventoryColumns.indexOf("id: 'operationalStatus'") < systemInventoryColumns.indexOf("id: 'allocatedAt'"),
  'System dashboards must expose Performance Tier and Allocated Systems must place Allocated At immediately after Operational Status.',
)

assert(
  projectLifecycleService.includes("label: 'POC end date overdue'") &&
    notificationsPage.includes("POC_ENDED: 'POC end date overdue'") &&
    !projectLifecycleService.includes("label: 'POC Overdue'") &&
    !notificationsPage.includes("POC_ENDED: 'POC Ended'"),
  'POC overdue alert presentation must use the user-facing name POC end date overdue without changing the POC_ENDED condition key.',
)

assert(
  saveApplyNavigation.includes('currentRoute?: string') &&
    saveApplyNavigation.includes('target === currentRoute ? fallbackExitRoute : target') &&
    [systemForm, projectForm, opportunityForm, tenantForm, infrastructureForm].every((source) => source.includes('currentRoute: `${location.pathname}${location.search}`')),
  'Global form Back/Cancel navigation must use the shared route-aware fallback so direct view-mode Back does not navigate to the same route.',
)

assert(
  projectLifecycleTypes.includes('projectSystems?: ProjectSystemLink[]') &&
    projectLifecycleTypes.includes('systems?: System[]') &&
    projectLifecycleValidation.includes('function hasActiveReusedInternalAllocation') &&
    projectLifecycleValidation.includes("project.mainType !== 'POC'") &&
    projectLifecycleValidation.includes("project.progressStatus !== 'OPEN'") &&
    projectLifecycleValidation.includes("link.allocationType === 'REUSED_INTERNAL'") &&
    projectLifecycleValidation.includes('Boolean(link.sourceMachineId)') &&
    projectLifecycleValidation.includes("systemById.get(link.systemId)?.source === 'Reused Internal Systems'") &&
    projectLifecycleValidation.includes('must have a POC Start Date while it has an active Reused Internal System allocation') &&
    projectLifecycleValidation.includes('must have a POC End Date while it has an active Reused Internal System allocation') &&
    projectLifecycleValidation.includes('POC End Date cannot be earlier than POC Start Date.') &&
    projectForm.includes('validateProjectSave(projectDraft, { linkedOpportunity, account, salesManager, projectSystems, systems })'),
  'Open POC Projects with active RIS allocations must be save-validated for authoritative Project POC Start/End dates and preserve date ordering.',
)

assert(
  !appStore.includes('if (previous.purpose === next.purpose) return []') &&
    systemForm.includes('if (OWNER_REQUIRED_PURPOSES.has(purpose) && owners.length === 0)') &&
    !systemForm.includes("'A Demo system must have an owner.',") &&
    !systemForm.includes("'A Training system must have an owner.',") &&
    !systemForm.includes("'A Support system must have an owner.',"),
  'RIS owner validation must block existing and changed Demo/Training/Support records and surface the missing-owner error as a visible form summary message.',
)

assert(
  standingRules.includes('A Tenant Requirement may be referenced by multiple Tenants. Requirement ID is a one-to-many relationship from Tenant Requirement to Tenant and is not an exclusive allocation resource.') &&
    standingRules.includes('Requirement pickers must not disable a Requirement merely because another Tenant already references it'),
  'Standing documentation must state Tenant Requirement one-to-many behavior and remove exclusivity as an availability rule.',
)

assert(
  packageJson.scripts['verify:v13-system-form-final-qa'] === 'node scripts/verify-v13-system-form-final-qa.mjs',
  'package.json must expose verify:v13-system-form-final-qa.',
)

if (!process.exitCode) {
  console.log('V1.3 System form final QA verification passed.')
}
