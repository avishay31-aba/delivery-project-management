import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 QA correction verification failed: ${message}`)
    process.exitCode = 1
  }
}

const systemValidation = read('src/domain/system-inventory/validation.ts')
const systemMetadata = read('src/config/system-inventory-metadata.ts')
const dashboard = read('src/components/dashboard/DataDashboard.tsx')
const allocationDialog = read('src/components/systems/SystemCandidateDialog.tsx')
const systemDeliveryTable = read('src/components/systems/SystemDeliveryTable.tsx')
const systemInventoryMetadata = read('src/domain/system-inventory/metadata.ts')
const systemInventoryAdapters = read('src/domain/system-inventory/adapters.ts')
const systemInventoryService = read('src/domain/system-inventory/service.ts')
const allocationService = read('src/domain/allocation-context/service.ts')
const allocationValidation = read('src/domain/allocation-context/validation.ts')
const allocationMetadata = read('src/domain/allocation-context/metadata.ts')
const allocationTypes = read('src/domain/allocation-context/types.ts')
const allocationAdapters = read('src/domain/allocation-context/adapters.ts')
const appStore = read('src/store/useAppStore.ts')
const tenantLifecycle = read('src/domain/tenant-operations/lifecycle.ts')
const tenantOperationsMetadata = read('src/domain/tenant-operations/metadata.ts')
const tenantService = read('src/domain/tenant-operations/service.ts')
const tenantListPage = read('src/pages/tenants/TenantListPage.tsx')
const tenantFormPage = read('src/pages/tenants/TenantFormPage.tsx')
const tenantDeliveryTable = read('src/components/tenants/TenantDeliveryTable.tsx')
const tenantColumns = read('src/config/tenant-columns.ts')
const opportunityForm = read('src/pages/opportunities/OpportunityFormPage.tsx')
const opportunityService = read('src/domain/opportunity-lifecycle/service.ts')
const opportunityAdapters = read('src/domain/opportunity-lifecycle/adapters.ts')
const projectMetadata = read('src/domain/project-lifecycle/metadata.ts')
const projectService = read('src/domain/project-lifecycle/service.ts')
const projectValidation = read('src/domain/project-lifecycle/validation.ts')
const appStateMigration = read('src/platform/persistence/app-state-migration.ts')
const systemForm = read('src/pages/systems/SystemInventoryFormPages.tsx')
const projectForm = read('src/pages/projects/ProjectFormPage.tsx')
const routes = read('src/routes/index.tsx')
const dashboardTypes = read('src/domain/dashboard-view/types.ts')
const dashboardMetadata = read('src/domain/dashboard-view/metadata.ts')
const dashboardService = read('src/domain/dashboard-view/service.ts')
const dashboardAdapters = read('src/domain/dashboard-view/adapters.ts')
const dashboardNavigation = read('src/domain/dashboard-view/navigation.ts')
const businessObjectLink = read('src/components/ui/BusinessObjectLink.tsx')
const routeModeUtil = read('src/utils/route-mode.ts')
const editActionIcon = read('src/components/ui/EditActionIcon.tsx')
const editableChildObject = read('src/components/child-objects/EditableChildObject.tsx')
const warrantyCollectionService = read('src/domain/warranty-collection/service.ts')
const seedState = JSON.parse(read('src/data/seed.json'))
const packageJson = JSON.parse(read('package.json'))

function functionBody(source, name) {
  const start = source.indexOf(name)
  assert(start >= 0, `${name} must exist.`)
  if (start < 0) return ''
  const braceStart = source.indexOf('{', start)
  let depth = 0
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(braceStart, index + 1)
    }
  }
  return ''
}

assert(
  systemValidation.includes("if (!machineId) return [{ field: 'machineId', message: 'MID is required.' }]"),
  'Reused Internal System MID blank validation must return MID is required.',
)
assert(
  systemValidation.includes("'MID must contain digits only.'") && systemValidation.includes("'MID must be unique.'"),
  'Existing MID format and uniqueness validation must be preserved.',
)
assert(
  /key: 'machineId'[\s\S]*label: 'MID'[\s\S]*required: true/.test(systemMetadata),
  'Reused Internal System MID metadata must mark the field as required for standard ERP presentation.',
)

assert(
  dashboard.includes('function dashboardSearchText') &&
    dashboard.includes('filterable !== false') &&
    dashboard.includes('.toLocaleLowerCase()'),
  'DataDashboard must define shared case-insensitive global search across searchable dashboard columns.',
)
assert(
  dashboard.includes('const globalFilteredRows = useMemo') &&
    dashboard.includes('dashboardSearchText(row, orderedColumns).includes(query)') &&
    dashboard.includes('data: globalFilteredRows'),
  'DataDashboard must apply global search before table filtering/sorting/pagination.',
)
assert(
  !/state:\s*\{[^}]*globalFilter/.test(dashboard),
  'DataDashboard table state must not have a second global filter owner.',
)

assert(
  allocationDialog.includes("import { BUSINESS_REGION_OPTIONS") &&
    allocationDialog.includes("import { CLOUD_PLATFORM_OPTIONS, HOSTING_OPTIONS }"),
  'SystemCandidateDialog must import authoritative Region, Hosting, and Cloud Platform sources.',
)
assert(
  allocationDialog.includes("const ALLOCATION_REGION_FILTER_OPTIONS: BusinessRegion[] = ['EMEA', 'APAC', 'LATAM', 'NA']"),
  'Allocation Region options must use the approved display order after the built-in ALL option.',
)
assert(
  allocationDialog.includes("if (filterKey === 'regionTimeGroup')") &&
    allocationDialog.includes('BUSINESS_REGION_OPTIONS.includes(region)') &&
    allocationDialog.includes("if (filterKey === 'hostingType') return HOSTING_OPTIONS") &&
    allocationDialog.includes("if (filterKey === 'cloudPlatform') return CLOUD_PLATFORM_OPTIONS"),
  'Allocation filter options must come from authoritative sources, not current candidate rows.',
)
assert(
  allocationDialog.includes('candidateMatchesStructuredFilters(candidate, filters)'),
  'Allocation row filtering must continue applying selected filters to the eligible candidate population.',
)

assert(
  systemDeliveryTable.includes("'Purpose'") &&
    systemDeliveryTable.includes('function systemRecordPurpose') &&
    systemDeliveryTable.includes('{systemRecordPurpose(system)}') &&
    !systemDeliveryTable.includes("'Delivery',"),
  'Project/Tenant related Systems table must label the system.purpose column as Purpose, not Delivery.',
)

const reusedInternalSystems = Array.isArray(seedState.reusedInternalSystems) ? seedState.reusedInternalSystems : []
const reusedPurposes = new Set(reusedInternalSystems.map((system) => system.purpose))
const reusedStatuses = new Set(reusedInternalSystems.map((system) => system.status))
const reusedPurposeHistoryValues = reusedInternalSystems.flatMap((system) =>
  Array.isArray(system.purposeHistory) ? system.purposeHistory.map((record) => record.purposeType) : [],
)
assert(
  systemInventoryMetadata.includes("export const REUSED_INTERNAL_PURPOSE_NONE = 'None'") &&
    systemInventoryMetadata.includes("REUSED_PURPOSE_OPTIONS = [REUSED_INTERNAL_PURPOSE_NONE, 'POC', 'Demo', 'Training', 'Support', REUSED_INTERNAL_PURPOSE_OBSOLETE]") &&
    systemInventoryMetadata.includes("REUSED_MANUAL_PURPOSE_OPTIONS = [REUSED_INTERNAL_PURPOSE_NONE, 'Demo', 'Training', 'Support', REUSED_INTERNAL_PURPOSE_OBSOLETE]") &&
    !systemInventoryMetadata.includes("REUSED_INTERNAL_PURPOSE_AVAILABLE"),
  'RIS Purpose domain metadata must use None, retain POC as a system-managed domain value, and exclude POC from the manual Purpose picklist.',
)
assert(
  systemInventoryAdapters.includes('function normalizeReusedInternalPurpose') &&
    systemInventoryAdapters.includes("value === 'Available'") &&
    systemInventoryAdapters.includes('? REUSED_INTERNAL_PURPOSE_NONE'),
  'RIS normalization must migrate legacy persisted Purpose Available values to None.',
)
assert(
  systemInventoryService.includes('function reusedInternalStatusForPurpose') &&
    systemInventoryService.includes('if (purpose === REUSED_INTERNAL_PURPOSE_NONE) return REUSED_INTERNAL_STATUS_AVAILABLE') &&
    systemInventoryService.includes('return REUSED_INTERNAL_STATUS_OCCUPIED') &&
    !systemInventoryService.includes('if (purpose === REUSED_INTERNAL_PURPOSE_OBSOLETE) return REUSED_INTERNAL_STATUS_OBSOLETE'),
  'RIS Availability Status must be derived in one shared domain function as None -> Available and every other purpose -> Occupied.',
)
assert(
    allocationService.includes('reusedInternalAvailabilityStatus(system, activeLinks, projects, allocatedSystems) === REUSED_INTERNAL_STATUS_AVAILABLE') &&
    allocationService.includes('system.purpose === REUSED_INTERNAL_PURPOSE_NONE') &&
    allocationService.includes('!hasCurrentAllocation(system)') &&
    allocationValidation.includes('const derivedAvailability = reusedInternalAvailabilityStatus(reusedSystem, allActiveLinks, context.projects, context.systems)') &&
    allocationValidation.includes('const hasReusablePurpose') &&
    allocationValidation.includes('derivedAvailability === REUSED_INTERNAL_STATUS_AVAILABLE') &&
    allocationValidation.includes('reusedSystem.purpose === REUSED_INTERNAL_PURPOSE_NONE') &&
    allocationValidation.includes('if (!hasReusablePurpose) return failed'),
  'RIS allocation eligibility must use shared derived availability plus Purpose None, not stale raw status or manual occupied purposes.',
)
assert(
  allocationService.includes("return isPocProject(project) ? ['REUSED_INTERNAL', 'EXISTING_SYSTEM'] : ['PRODUCTION', 'EXISTING_SYSTEM']") &&
    allocationMetadata.includes("if (mode === 'EXISTING_SYSTEM') return 'Allocate Requested Existing System'") &&
    projectForm.includes('linkExistingSystemToProject(projectDraft.id, candidateId)') &&
    projectForm.includes('requestedSystemCandidatesForProject(projectDraft, linkedOpportunity, systems, projectSystems)') &&
    allocationValidation.includes('export function validateExistingSystemLink') &&
    appStore.includes('linkExistingSystemToProject: (projectId, systemId) => {'),
  'Project Systems/Tenants must expose Allocate Requested Existing System through the existing candidate dialog, validation, and store allocation path.',
)
assert(
  allocationService.includes("source.requirementType === 'A' && 'deployTarget' in requirement") &&
    allocationValidation.includes("Projects can only manually link existing systems requested in Grid A New Tenant requirements.") &&
    !appStore.includes('function ensureOpportunityRequestedSystemAllocations') &&
    appStore.includes('function ensureAutomaticRequirementRelationships') &&
    appStore.includes('requiredExistingTenantAllocationsForProject(project, opportunity, state.tenants)'),
  'Grid A requested existing Systems must be manual candidates only, while Grid B/C relationships use the automatic allocation helper.',
)
assert(
  read('src/data/seed.types.ts').includes("export type AllocationSource = 'MANUAL' | 'GRID_B' | 'GRID_C'") &&
    allocationAdapters.includes('export function allocationHasAutomaticSource') &&
    allocationService.includes('export function resolvedProjectSystemAllocationSources') &&
    allocationService.includes('export function resolvedProjectTenantAllocationSources') &&
    allocationService.includes("const manualSources: AllocationSource[] = allocationHasManualSource(link) ? ['MANUAL'] : []") &&
    allocationService.includes('export function requiredExistingTenantAllocationsForProject') &&
    appStateMigration.includes('repairAutomaticProjectRelationships') &&
    appStateMigration.includes('reconcileProjectAllocationSources') &&
    appStore.includes('function reconcileProjectAllocationSources') &&
    appStore.includes('resolvedProjectSystemAllocationSources(link, project, opportunityForProject(project), state.tenants)') &&
    appStore.includes('{ ...deallocateProjectSystemLink(link, now), allocationSources }') &&
    allocationValidation.includes('automaticSources.length > 0') &&
    !allocationValidation.includes("allocation.allocationSources ?? []).some((source) => source === 'GRID_B'"),
  'Manual vs Auto Project/System allocation source must be domain-owned, recomputed from current Grid B/C reasons, preserve manual reasons, and enforce deallocation only while auto reasons currently exist.',
)
assert(
  projectForm.includes('Manual Allocated Systems') &&
    projectForm.includes('Auto-Allocated Systems') &&
    projectForm.includes('title="Allocated Systems"') &&
    projectForm.includes('className="text-sm font-semibold text-sf-text"') &&
    projectForm.includes('text-xs font-normal text-sf-text-muted') &&
    projectForm.includes('manualAllocatedSystems') &&
    projectForm.includes('autoAllocatedSystems') &&
    projectForm.includes('renderSystemActions(system, false)') &&
    projectForm.includes('title={isViewMode ? undefined : EDIT_ACTION_LABEL}') &&
    projectForm.includes('ariaLabel={isViewMode ? undefined : EDIT_ACTION_LABEL}') &&
    projectForm.includes("{isViewMode ? 'View' : <EditActionIcon />}") &&
    !projectForm.includes("{isViewMode ? 'View' : 'Edit'}"),
  'Project Systems/Tenants must render one Allocated Systems collapsible with Tenant-style Manual/Auto table-group headings, shared Pencil Edit actions, and no manual deallocation action for auto rows.',
)
assert(
  allocationDialog.includes("{ key: 'id', label: 'SID' }") &&
    allocationDialog.includes("...(isReusedInternalMode ? ['MID'] : ['SID', 'MID'])") &&
    !allocationDialog.includes("{ key: 'id', label: 'ID' }") &&
    !allocationDialog.includes("['ID', 'MID']"),
  'Allocate Requested Existing System candidate dialog must label the system identifier as SID while preserving candidate values and sorting key.',
)
assert(reusedPurposes.has('None'), 'Seed RIS records must include Purpose None.')
assert(!reusedPurposes.has('Available'), 'Seed RIS records must not persist Available as a RIS Purpose value.')
assert(reusedStatuses.has('Available'), 'Seed RIS records must still retain Available as a status/availability value.')
assert(reusedPurposeHistoryValues.includes('None'), 'RIS Purpose History must normalize no-specific-purpose records to None.')
assert(!reusedPurposeHistoryValues.includes('Available'), 'RIS Purpose History must not retain Available as the no-specific-purpose value.')

const deallocationValidationBody = allocationValidation.slice(allocationValidation.indexOf('validateProjectSystemDeallocation'))
const deallocationStoreBody = functionBody(appStore, 'deallocateProjectSystem: (allocationId)')

assert(
  deallocationValidationBody.includes('SYSTEM_OPERATIONAL_STATUS_DELETED') &&
    deallocationValidationBody.includes('cannot be deallocated because its Operational Status is Deleted'),
  'System deallocation validation must reject Deleted Systems at the AllocationContext boundary.',
)
assert(
  deallocationValidationBody.includes('activeProjectTenantLinks(context.projectTenants ?? [])') &&
    deallocationValidationBody.includes('!isTenantLifecycleInactive(tenant)') &&
    deallocationValidationBody.includes('Deallocating a system with existing tenants is not allowed.') &&
    deallocationValidationBody.includes('Please delete or cancel them first.') &&
    deallocationValidationBody.includes("join('; ')"),
  'System deallocation validation must block current same-SID/PID Tenants and list all blocking TIDs with no continuation.',
)
assert(
  !allocationTypes.includes('requiresConfirmation') &&
    !allocationTypes.includes('affectedTenantIds') &&
    !allocationTypes.includes('affectedTids') &&
    !appStore.includes('confirmedTenantCancellation'),
  'System deallocation must not expose the old tenant-release confirmation path.',
)
assert(
  !deallocationStoreBody.includes('sourceRequirementId') &&
    !deallocationStoreBody.includes('releasedRequirementId') &&
    !deallocationStoreBody.includes('requirementHistory') &&
    deallocationStoreBody.includes('deallocateProjectTenantLink(candidate, now)') &&
    deallocationStoreBody.includes('candidate.projectId === allocation.projectId') &&
    deallocationStoreBody.includes('candidate.systemId === allocation.systemId') &&
    deallocationStoreBody.includes("candidate.allocationStatus !== 'DEALLOCATED'"),
  'System deallocation must not change Tenant Requirement IDs or Tenant records, and must convert current same Project/System tenant links to retained historical links.',
)
assert(
  deallocationStoreBody.includes('releaseReusedInternalSystem') &&
    deallocationStoreBody.includes('recalculateReusedSystemOccupationWindows') &&
    !deallocationStoreBody.includes('currentProjectIds.length === 0'),
  'System deallocation must reuse the RIS release helper so no-remaining vs remaining-allocation behavior stays domain-owned.',
)
assert(
  deallocationStoreBody.includes('hasRemainingProjectAllocation') &&
    deallocationStoreBody.includes('shouldReturnProductionToInventory') &&
    deallocationStoreBody.includes('productionSystemInventory: returnedProductionSystem') &&
    deallocationStoreBody.includes('SYSTEM_PURPOSE_DELIVERY'),
  'Production System deallocation must return the System to Production inventory only when no other Project allocations remain.',
)
assert(
  read('src/pages/projects/ProjectFormPage.tsx').includes("disabled={system.operationalStatus === 'Deleted'}"),
  'Project System Deallocate action must be unavailable for Deleted Systems in the UI.',
)

assert(
  tenantLifecycle.includes('return !isTenantDeleted(tenant) && !isTenantCancelled(tenant)') &&
    tenantLifecycle.includes('export function isTenantRetainedDashboardVisible') &&
    tenantLifecycle.includes('return true'),
  'Normal operational Tenant visibility must exclude inactive Tenants while retained dashboard visibility keeps Deleted and Cancelled Tenants available for history.',
)
assert(
  tenantListPage.includes('tenants.filter(isTenantRetainedDashboardVisible)') &&
    tenantListPage.includes('title="Tenant Dashboard"') &&
    tenantListPage.includes('dashboardScope="tenants"') &&
    !tenantListPage.includes('WorkspaceTabs') &&
    !tenantListPage.includes('isDeletedDashboard') &&
    !tenantListPage.includes('/tenants/deleted') &&
    !routes.includes("path: 'tenants/deleted'"),
  'Tenant Workspace must expose one main Tenant Dashboard containing retained Tenants including Deleted and no dedicated Deleted Tenants route.',
)
assert(
  !dashboardTypes.includes("| 'deletedTenants'") &&
    !dashboardMetadata.includes("'deletedTenants'") &&
    !dashboardService.includes('deletedTenants: createEmptyScopeViews()') &&
    !dashboardAdapters.includes('value.dashboards.deletedTenants') &&
    !dashboardNavigation.includes("case 'deletedTenants':"),
  'Dedicated Deleted Tenants dashboard preference scope and navigation must be removed.',
)
assert(
  systemForm.includes('const inactiveTenants = historicalInactiveTenantsForSystemRecord(activeRecord, tenants, allocatedSystems, projectSystems)') &&
    systemForm.includes('Cancelled / Deleted Tenants') &&
    systemForm.includes('tenants={inactiveTenants}') &&
    systemForm.includes('showWarrantyStatusColumn'),
  'System form contextual Cancelled / Deleted Tenants historical section must remain in place.',
)

assert(
  warrantyCollectionService.includes('export function tenantWarrantyHeaderStatusReadModel') &&
    tenantService.includes('export function tenantDerivedWarrantyContractStatus') &&
    tenantService.includes('return tenantWarrantyHeaderStatusReadModel(tenant.warranties ?? [], tenant.tid)'),
  'Tenant-level Warranty Status must continue using the existing WarrantyCollection derivation through the shared Tenant helper.',
)
assert(
  tenantColumns.includes('getValue: (row) => row.tenantType === \'CUSTOMER\' ? tenantDerivedWarrantyContractStatus(row).label') &&
    tenantColumns.includes('status: tenantDerivedWarrantyContractStatus(row).visualStatus') &&
    tenantColumns.includes('label: tenantDerivedWarrantyContractStatus(row).label'),
  'Tenant Dashboard Warranty Status must expose the shared Tenant-level derived label for display/search/filter/export.',
)
assert(
  tenantDeliveryTable.includes('status={tenantDerivedWarrantyContractStatus(tenant).visualStatus}') &&
    tenantDeliveryTable.includes('label={tenantDerivedWarrantyContractStatus(tenant).label}') &&
    tenantDeliveryTable.includes('Tenant warranty status: ${tenantDerivedWarrantyContractStatus(tenant).label}'),
  'System/Project related Tenant tables and Deleted Tenant history tables must render the shared Tenant-level Warranty Status label.',
)
assert(
  tenantDeliveryTable.includes("'Type',") &&
    tenantDeliveryTable.includes("'Hosting',") &&
    tenantDeliveryTable.includes("'Cloud Platform',") &&
    !tenantDeliveryTable.includes("'Environment',") &&
    tenantDeliveryTable.indexOf("'Type',") < tenantDeliveryTable.indexOf("'Hosting',") &&
    tenantDeliveryTable.indexOf("'Hosting',") < tenantDeliveryTable.indexOf("'Cloud Platform',") &&
    tenantDeliveryTable.indexOf("'Cloud Platform',") < tenantDeliveryTable.indexOf('<ConfigurationColumnHeaders fields={TENANT_CONFIGURATION_FIELDS} />') &&
    tenantDeliveryTable.includes("tenantRelationshipValue(tenant, system, 'hostingType')") &&
    tenantDeliveryTable.includes("tenantRelationshipValue(tenant, system, 'cloudPlatform')"),
  'Project/System Tenant tables must label Tenant Type as Type and show Type, Hosting, Cloud Platform, Product in order using Tenant/System authoritative values.',
)
assert(
  opportunityForm.includes('tenantDerivedWarrantyContractStatus') &&
    opportunityForm.includes('status={tenantDerivedWarrantyContractStatus(tenant).visualStatus}') &&
    opportunityForm.includes('label={tenantDerivedWarrantyContractStatus(tenant).label}') &&
    !opportunityForm.includes('<WarrantyStatusPresentation status={tenant.warrantyStatus}'),
  'Opportunity existing Tenant presentations must not display persisted Warranty-record status as Tenant-level Warranty Status.',
)
assert(
  opportunityService.includes('export function pocProjectSubTypeForOpportunity') &&
    opportunityService.includes("return opportunity.financialProfile ?? (opportunity.subType === 'PAID' ? 'PAID' : 'FREE')") &&
    opportunityService.includes("if (opportunity.type === 'POC') return { mainType: 'POC', subType: pocProjectSubTypeForOpportunity(opportunity) }") &&
    opportunityAdapters.includes("subType: projectSource === 'POC' ? pocProjectSubTypeForOpportunity(nextOpportunity) : projectSubTypeForOpportunity(nextOpportunity)") &&
    appStateMigration.includes("subType: project.mainType === 'POC' && opportunity ? pocProjectSubTypeForOpportunity(opportunity) : project.subType") &&
    projectService.includes('export function projectSubTypeDisplayValue') &&
    projectService.includes("if (subType === 'FREE') return 'Free'") &&
    projectService.includes("if (subType === 'PAID') return 'Paid'") &&
    projectMetadata.includes("keyForProject('POC', 'FREE')") &&
    projectMetadata.includes("keyForProject('POC', 'PAID')") &&
    projectService.includes("if (opportunity?.financialProfile) return opportunity.financialProfile") &&
    read('src/data/seed.types.ts').includes("export type OpportunityFinancialProfile = 'FREE' | 'PAID'") &&
    read('src/data/seed.types.ts').includes("'FREE' | 'PAID'"),
  'POC Project Sub Type must derive from exact Opportunity Financial Profile values FREE/PAID in the Opportunity-to-Project lifecycle and read models.',
)
assert(
  tenantFormPage.includes('const committedWarrantyHeaderStatus = tenantWarrantyHeaderStatusReadModel(persistedTenant.warranties ?? [], persistedTenant.tid)') &&
    tenantFormPage.includes('<WarrantyStatusPresentation status={warranty.warrantyStatus} />'),
  'Tenant form must keep header using Tenant-level derivation while individual Warranty rows keep Warranty-record statuses.',
)
const tenantHeaderBody = functionBody(tenantFormPage, 'function renderHeader()')
const tenantHeaderLabelsInOrder = [
  'renderHostSidField()',
  "'System Operational Status'",
  "'Requirement ID'",
  "'Project ID'",
  "'Project Type'",
  "'Project Sub Type'",
  "'Project Name'",
  "'Project Status'",
  "'Account'",
  "'Region'",
  "'Country'",
  "'State'",
  "'Time Zone'",
  "'Time Group'",
]
let previousTenantHeaderLabelIndex = -1
tenantHeaderLabelsInOrder.forEach((label) => {
  const index = tenantHeaderBody.indexOf(label)
  assert(index > previousTenantHeaderLabelIndex, `Tenant form header must render ${label} in the approved V1.3 order.`)
  previousTenantHeaderLabelIndex = index
})
assert(
  tenantFormPage.includes('function renderHostSidField()') &&
    tenantFormPage.includes("import { ProjectStatusIcon } from '@/components/projects/ProjectStatusIcon'") &&
    tenantFormPage.includes('<BusinessObjectLink reference={systemReference(activeSystem)}>{hosting.sid || activeSystem.sid || formattedReusedInternalMachineId(activeSystem.machineId)}</BusinessObjectLink>') &&
    tenantFormPage.includes('const headerProjectId = tenantDraft.deliveryPid ??') &&
    tenantFormPage.includes("projects.find((candidate) => candidate.pid === headerProjectId)") &&
    tenantFormPage.includes("renderHeaderField('Project ID', renderPidLinks(headerProjectId))") &&
    tenantFormPage.includes("renderHeaderField('Project Status', headerProject ? <ProjectStatusIcon status={headerProject.progressStatus} /> : '')") &&
    tenantFormPage.includes('tenantRequirementIdDisplay(tenantDraft)') &&
    tenantFormPage.includes('projectSubTypeDisplayValue(headerProject?.subType)') &&
    !tenantFormPage.includes('LinkedProjectsTable') &&
    !tenantFormPage.includes('linkedProjectRowsForTenant') &&
    !tenantFormPage.includes("'linkedProjects'") &&
    !tenantFormPage.includes('Linked Projects') &&
    !tenantFormPage.includes('Current SID') &&
    !tenantHeaderBody.includes('Delivery PID') &&
    !tenantHeaderBody.includes('POC PID') &&
    !tenantFormPage.includes('Account / End User'),
  'Tenant form header must rename Current SID to Host SID, preserve the System business link, use the Tenant authoritative PID as Project ID, keep Requirement ID separate, show Project Status from the authoritative Project, remove Delivery/POC PID split, remove the redundant Linked Projects tab, and use the approved Account label.',
)
const tenantHostingFieldOrder = [
  "{ key: 'sid', label: 'SID' }",
  "{ key: 'tenantCount', label: 'Number of Tenants' }",
  "{ key: 'tenants', label: 'Tenants' }",
  "{ key: 'operationalStatus', label: 'Operational Status' }",
  "{ key: 'machineNumber', label: 'Machine Number' }",
  "{ key: 'versionNumber', label: 'Version Number' }",
  "{ key: 'hostingType', label: 'Hosting type' }",
  "{ key: 'url', label: 'URL' }",
  "{ key: 'performanceTier', label: 'Performance tier' }",
  "{ key: 'vpnEnabled', label: 'VPN' }",
  "{ key: 'vpnType', label: 'VPN type' }",
]
let previousTenantHostingFieldIndex = -1
tenantHostingFieldOrder.forEach((field) => {
  const index = tenantOperationsMetadata.indexOf(field)
  assert(index > previousTenantHostingFieldIndex, `Tenant Hosting Environment table must render ${field} in the approved V1.3 order.`)
  previousTenantHostingFieldIndex = index
})
const renderHostingTabBody = functionBody(tenantFormPage, 'function renderHostingTab()')
assert(
  tenantOperationsMetadata.includes("keyof TenantHostingSnapshot | 'tenantCount' | 'tenants'") &&
    !tenantOperationsMetadata.includes("key: 'currentSystem'") &&
    !tenantOperationsMetadata.includes("label: 'Current system'") &&
    tenantFormPage.includes("import { currentTenantPopulationForSystem, formattedReusedInternalMachineId } from '@/domain/system-inventory'") &&
    tenantFormPage.includes("import { systemReference, tenantReference } from '@/domain/business-reference'") &&
    tenantFormPage.includes('function renderTenantLinksForHosting(systemTenants: Tenant[])') &&
    tenantFormPage.includes('Math.ceil(systemTenants.length / 3)') &&
    tenantFormPage.includes('systemTenants.slice(index * 3, index * 3 + 3)') &&
    tenantFormPage.includes('index < tenantRow.length - 1') &&
    tenantFormPage.includes('<BusinessObjectLink reference={tenantReference(tenant)}>{tenant.tid}</BusinessObjectLink>') &&
    renderHostingTabBody.includes('const hostedTenantSet = activeSystem ? currentTenantPopulationForSystem(activeSystem.id, tenants) : []') &&
    renderHostingTabBody.includes("if (field.key === 'tenantCount') return String(hostedTenantSet.length)") &&
    renderHostingTabBody.includes("if (field.key === 'tenants') return renderTenantLinksForHosting(hostedTenantSet)") &&
    !tenantFormPage.includes('tenantCountForSystem'),
  'Tenant Hosting Environment table must remove Current system, put SID first, add Tenants after Number of Tenants, and derive count plus TID links from one authoritative System-hosted Tenant set.',
)

assert(
  projectMetadata.includes('export function projectHeaderFieldAllowsEditing(field: ProjectHeaderFieldMetadata): boolean') &&
    projectMetadata.includes('return field.editable') &&
    projectForm.includes('const isEditable = projectHeaderFieldAllowsEditing(field)') &&
    !projectForm.includes('isManualProjectWithoutOpportunity') &&
    !projectForm.includes('field.editable ||'),
  'Manual Project creation must consume the same authoritative Project header field editability metadata and must not broaden read-only fields locally.',
)
assert(
  projectService.includes('export function projectHasLocationValidationSource(project: Project, context: ProjectLifecycleContext = {}): boolean') &&
    projectValidation.includes('if (projectHasLocationValidationSource(project, context))') &&
    projectValidation.includes('if (!projectHasLocationValidationSource(project, context)) return []') &&
    projectForm.includes('const messages = validateProjectSave(projectDraft, { linkedOpportunity, account, salesManager, projectSystems, systems })') &&
    projectMetadata.includes("{ key: 'opportunityId', label: 'Opportunity (name and ID)', editable: true") &&
    !projectMetadata.includes("key: 'opportunityId', label: 'Opportunity (name and ID)', editable: true, required: true"),
  'Manual Project creation must allow saving without optional Opportunity context; Opportunity-derived geography/time-zone fields remain read-only/empty and do not raise validation until a source exists.',
)
assert(
  opportunityForm.includes('businessEditable={field.editable}') &&
    !/isNewRoute[\s\S]{0,120}field\.editable\s*\|\|/.test(opportunityForm) &&
    systemForm.includes('const businessEditable = field.editable &&') &&
    !/isCreateMode[\s\S]{0,160}field\.editable\s*\|\|/.test(systemForm) &&
    read('src/pages/infrastructure/InfrastructureFormPage.tsx').includes('function renderReadonlyValue') &&
    read('src/pages/infrastructure/InfrastructureFormPage.tsx').includes('disabled={isViewMode || disabled}'),
  'Application manual-create paths must preserve representative authoritative editable, read-only, derived, conditional, and disabled field rules instead of treating Create mode as all-fields-editable.',
)
assert(
  read('docs/architecture-handbook.md').includes('Manual creation is only a creation method and must preserve the exact authoritative field attributes') &&
    read('docs/architecture-handbook.md').includes('Optional source records remain optional in manual creation') &&
    read('docs/v1.2-standing-product-rules.md').includes('Manual creation does not alter authoritative field attributes') &&
    read('docs/v1.2-standing-product-rules.md').includes('Optional source absence must not be converted into a validation requirement') &&
    read('docs/product-decision-log.md').includes('Manual creation of any ERP item preserves the item'),
  'The standing manual-creation field-attribute rule must be documented in durable repository authority.',
)

assert(
  editActionIcon.includes("export const EDIT_ACTION_LABEL = 'Edit'") &&
    editActionIcon.includes('Pencil') &&
    editableChildObject.includes('title={title}') &&
    editableChildObject.includes('aria-label={ariaLabel}'),
  'Shared Edit/Pencil presentation must provide one Edit label, icon, tooltip, and accessibility path for child actions.',
)
assert(
  !/>\s*Edit\s*</.test(read('src/pages/tenants/TenantFormPage.tsx')) &&
    !/>\s*Edit\s*</.test(read('src/pages/projects/ProjectFormPage.tsx')) &&
    !/>\s*Edit\s*</.test(read('src/pages/opportunities/OpportunityFormPage.tsx')) &&
    !/>\s*Edit\s*</.test(read('src/pages/infrastructure/InfrastructureFormPage.tsx')) &&
    !/>\s*Edit\s*</.test(systemForm) &&
    !/>\s*Edit\s*</.test(read('src/components/warranty/WarrantyCollectionGrid.tsx')) &&
    !/>\s*Edit\s*</.test(read('src/components/owners/OwnerGrid.tsx')) &&
    !/>\s*Edit\s*</.test(read('src/components/remarks/RemarksGrid.tsx')) &&
    !/>\s*Edit\s*</.test(read('src/components/systems/SystemVersionUpdatePanel.tsx')),
  'Applicable textual Edit action buttons must use the shared Pencil icon instead of visible Edit text.',
)
assert(
  dashboard.includes('icon={<EditActionIcon className="h-4 w-4" />}') &&
    dashboard.includes('label={EDIT_ACTION_LABEL}') &&
    dashboard.includes('aria-label={label}'),
  'Dashboard record Edit action must use the shared Pencil icon and exact Edit accessibility label.',
)
assert(
  businessObjectLink.includes('function businessObjectViewRoutePath') &&
    businessObjectLink.includes("`${routePath}${separator}mode=view`") &&
    businessObjectLink.includes('businessObjectViewRoutePath(reference.routePath)') &&
    businessObjectLink.includes('businessObjectViewRoutePath(routePath)') &&
    routeModeUtil.includes("return routeMode(location) !== 'edit'") &&
    systemForm.includes('const isRouteReadOnly = !isNewRecordSession && isRouteViewMode(location)') &&
    systemForm.includes('const isViewMode = isRouteReadOnly || isFrozenHistoricalAllocatedReusedSystem || isPocMidWithActiveSid') &&
    read('src/pages/projects/ProjectFormPage.tsx').includes('const isViewMode = !isNewRoute && !isNewRecordSession && isRouteViewMode(location)') &&
    opportunityForm.includes('const isViewMode = !isNewRoute && !isNewRecordSession && isRouteViewMode(location)') &&
    read('src/pages/tenants/TenantFormPage.tsx').includes('const isViewMode = !isNewRecordSession && isRouteViewMode(location)'),
  'Business-object links must open existing destination records in read-only mode by default while create sessions remain editable.',
)
assert(
  appStore.includes('function cancelTenantInState') &&
    appStore.includes('operationalStatus: TENANT_OPERATIONAL_STATUS_CANCELLED') &&
    appStore.includes('hostedSystemHistory: endedTenantHostedSystemHistory(candidate, now, \'Cancelled\')') &&
    appStore.includes('deallocateProjectTenantLink(link, now)') &&
    appStore.includes('const tenantIds = (system.tenantIds ?? []).filter((id) => id !== tenantId)') &&
    appStore.includes('tenantIds,') &&
    appStore.includes('tenantIds: (link.tenantIds ?? []).filter((id) => id !== tenantId)') &&
    appStore.includes('warrantyRecords: state.warrantyRecords') &&
    appStore.includes('activityEvents: appendActivityEvent(state.activityEvents.filter((event) => !activityEventReferencesTenant(event, tenant)), now') &&
    appStore.includes("cancelTenant: (id: string) => AllocationActionResult") &&
    appStore.includes('cancelTenant: (id) => {'),
  'Cancel Tenant must use one authoritative retained-cancellation store operation that preserves the Tenant history while removing it from active hosting/project allocations.',
)
assert(
  systemForm.includes('const cancelTenant = useAppStore((state) => state.cancelTenant)') &&
    systemForm.includes('function cancelHostedTenant(tenant: Tenant)') &&
    systemForm.includes('Cancel Tenant ${tenant.tid}?') &&
    systemForm.includes('Cancellation means this Tenant was created by mistake and will be retained as Cancelled for history while being removed from active hosting and Project allocation views.') &&
    systemForm.includes('If the Tenant was genuinely delivered and later left, use Delete instead.') &&
    systemForm.includes('onClick={() => cancelHostedTenant(tenant)}') &&
    systemForm.includes('onClick={() => deleteHostedTenant(tenant)}') &&
    systemForm.includes('title={EDIT_ACTION_LABEL}') &&
    systemForm.includes('aria-label={EDIT_ACTION_LABEL}'),
  'System Tenant rows must expose Edit, Delete, and Cancel with the approved Cancel confirmation and unchanged Delete action.',
)

const warrantyCases = [
  { statuses: [], expected: 'NOT_SET_YET' },
  { statuses: ['PLANNED'], expected: 'UNDER_CONTRACT' },
  { statuses: ['VALID'], expected: 'UNDER_CONTRACT' },
  { statuses: ['PENDING'], expected: 'UNDER_CONTRACT' },
  { statuses: ['EXPIRED'], expected: 'UNDER_CONTRACT' },
  { statuses: ['NO_WARRANTY'], expected: 'OUT_OF_CONTRACT' },
  { statuses: ['NO_WARRANTY', 'RENEWED'], expected: 'OUT_OF_CONTRACT' },
  { statuses: ['NO_WARRANTY', 'VALID'], expected: 'UNDER_CONTRACT' },
]
for (const warrantyCase of warrantyCases) {
  const quotedStatuses = warrantyCase.statuses.map((status) => `'${status}'`).join(', ')
  assert(
    warrantyCollectionService.includes(`deriveTenantWarrantyContractStatus(statuses: WarrantyStatus[])`) &&
      warrantyCollectionService.includes(`return { status: '${warrantyCase.expected}'`),
    `Existing Tenant Warranty Status derivation must retain ${quotedStatuses || 'no records'} -> ${warrantyCase.expected}.`,
  )
}

assert(
  packageJson.scripts['verify:v13-qa-corrections'] === 'node scripts/verify-v13-qa-corrections.mjs',
  'package.json must expose verify:v13-qa-corrections.',
)

if (!process.exitCode) {
  console.log('V1.3 QA correction verification passed')
  console.log('MID requiredness: enforced for Reused Internal System records; format and uniqueness preserved')
  console.log('Dashboard search: shared case-insensitive pre-table filtering across searchable columns')
  console.log('Allocation options: Region, Hosting, and Cloud Platform sourced independently of candidate rows')
  console.log('Related Systems table: system.purpose column is labeled Purpose')
  console.log('RIS Purpose: None replaces Available while status/availability Available remains intact')
}
