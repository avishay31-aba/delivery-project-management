import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 Save/Apply semantics verification failed: ${message}`)
    process.exitCode = 1
  }
}

const helper = read('src/utils/save-apply-navigation.ts')
const projectForm = read('src/pages/projects/ProjectFormPage.tsx')
const opportunityForm = read('src/pages/opportunities/OpportunityFormPage.tsx')
const systemForm = read('src/pages/systems/SystemInventoryFormPages.tsx')
const infrastructureForm = read('src/pages/infrastructure/InfrastructureFormPage.tsx')
const tenantForm = read('src/pages/tenants/TenantFormPage.tsx')
const checkboxMultiSelect = read('src/components/ui/CheckboxMultiSelect.tsx')
const validationPresentation = read('src/components/ui/validationPresentation.ts')
const projectValidation = read('src/domain/project-lifecycle/validation.ts')
const projectService = read('src/domain/project-lifecycle/service.ts')
const appStore = read('src/store/useAppStore.ts')
const appStateRepository = read('src/platform/persistence/app-state-repository.ts')
const architectureHandbook = read('docs/architecture-handbook.md')
const standingRules = read('docs/v1.2-standing-product-rules.md')
const decisionLog = read('docs/product-decision-log.md')
const packageJson = JSON.parse(read('package.json'))

assert(
  helper.includes('export function successfulSaveApplyNavigationTarget') &&
    helper.includes('if (stayOnPage) return isCreateMode ? persistedRoute : null') &&
    helper.includes('return fallbackExitRoute') &&
    helper.includes('export function cancelFormNavigationTarget') &&
    helper.includes('if (returnTo) return returnTo') &&
    helper.includes('const target = readOnlyRoutePath(persistedRoute)') &&
    helper.includes('target === currentRoute ? fallbackExitRoute : target'),
  'Shared form navigation helper must encode Save-to-dashboard, Apply-stays-on-persisted-create-route, and Cancel origin-or-read-only fallback semantics.',
)

for (const [name, source, fallbackRoute] of [
  ['Project', projectForm, '/projects'],
  ['Opportunity', opportunityForm, '/opportunities'],
]) {
  assert(
    source.includes("cancelFormNavigationTarget, successfulSaveApplyNavigationTarget") &&
      source.includes('successfulSaveApplyNavigationTarget({') &&
      source.includes('isCreateMode: isNewRoute') &&
      source.includes('replace: isNewRoute') &&
      source.includes(`fallbackExitRoute: '${fallbackRoute}'`) &&
      source.includes('cancelFormNavigationTarget({') &&
      source.includes(`fallbackExitRoute: '${fallbackRoute}'`),
    `${name} form must use shared Save/Apply/Cancel navigation for lifecycle persistence semantics.`,
  )
}

assert(
  systemForm.includes("cancelFormNavigationTarget, successfulSaveApplyNavigationTarget") &&
    systemForm.includes('successfulSaveApplyNavigationTarget({') &&
    systemForm.includes('isCreateMode,') &&
    systemForm.includes('replace: isCreateMode') &&
    systemForm.includes('fallbackExitRoute: dashboardPath') &&
    systemForm.includes('cancelFormNavigationTarget({') &&
    systemForm.includes('resetDraft(cloneRecord(committedRecord as T))') &&
    systemForm.includes("metadata.source === SYSTEM_SOURCE_REUSED_INTERNAL") &&
    systemForm.includes('/systems/production-inventory/'),
  'Production and Reused/Internal System forms must use shared Save/Apply/Cancel navigation, reset from committed records, and land Apply-on-create on the persisted System route.',
)

assert(
  projectForm.includes('let committedProject: Project | undefined') &&
    projectForm.includes('createProjectFromDraft({ ...projectDraft, ...savePatch })') &&
    projectForm.includes("setSaveMessages([`Project could not be saved.${reason}`])") &&
    projectForm.includes('resetDraft(cloneProjectDraft(committedProject))') &&
    projectForm.includes('const [pendingCreateApplyPid, setPendingCreateApplyPid] = useState<string | null>(null)') &&
    projectForm.includes('const persistedCreatedProject = useMemo(') &&
    projectForm.includes('const isPersistedCreateDraft = Boolean(') &&
    projectForm.includes('? !isPersistedCreateDraft') &&
    projectForm.includes('if (isNewRoute && stayOnPage) setPendingCreateApplyPid(committedProject.pid)') &&
    projectForm.includes('pendingCreateApplyPid !== persistedCreatedProject.pid') &&
    projectForm.includes("setSaveMessages(['Project saved.'])") &&
    projectForm.includes('const bypassUnsavedPromptRef = useRef(false)') &&
    projectForm.includes('const navigationBlocker = useBlocker(() => isDirty && !isViewMode && !bypassUnsavedPrompt && !bypassUnsavedPromptRef.current)') &&
    projectForm.includes('function bypassNextProjectNavigation()') &&
    projectForm.includes('bypassNextProjectNavigation()') &&
    projectValidation.includes('if (projectHasLocationValidationSource(project, context))') &&
    projectService.includes('export function projectHasLocationValidationSource'),
  'Manual Project Save/Apply must persist through the store, reset from the committed Project, bypass the blocker synchronously for post-save navigation, show success, and keep optional Opportunity geography validation optional.',
)

assert(
  appStore.includes('saveToStorage: () => {') &&
    appStore.includes('const dataToPersist = rebaseAppDataStateForPersistence(data, loadPersistedState())') &&
    appStore.includes('persistState(dataToPersist)') &&
    appStore.includes('set({') &&
    appStore.includes('...dataToPersist') &&
    appStore.includes("console.error('Delivery ERP state cross-tab notification failed after persistence completed.', error)") &&
    appStore.includes('const existingCreatedProject = draft.pid') &&
    appStore.includes('set(state)') &&
    appStore.includes('throw error'),
  'Shared persistence must rebase stale-tab saves over newer durable state, treat the authoritative storage write as fatal, keep only cross-tab notification best-effort, and roll back Project create attempts that fail persistence.',
)

assert(
  appStateRepository.includes("const APP_STATE_KEYED_DELTA_FORMAT = 'dpm-keyed-seed-delta-v1'") &&
    appStateRepository.includes("const APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT = 'dpm-compressed-keyed-seed-delta-v1'") &&
    appStateRepository.includes('function encodeObjectKeys') &&
    appStateRepository.includes('function decodeObjectKeys') &&
    appStateRepository.includes('function compressString') &&
    appStateRepository.includes('function decompressString') &&
    appStateRepository.includes('compressedKeyedSeedDeltaAppDataState(compactAppDataStateForStorage(payload))') &&
    appStateRepository.includes('isCompressedKeyedSeedDeltaAppDataState(parsed)') &&
    appStateRepository.includes('isKeyedSeedDeltaAppDataState(parsed)'),
  'Authoritative app-state persistence must use the compressed keyed seed-delta storage format and remain backward compatible with existing keyed and seed-delta state.',
)

assert(
  opportunityForm.includes('let result: ReturnType<typeof saveOpportunityWithProjectSync>') &&
    opportunityForm.includes('result = saveOpportunityWithProjectSync') &&
    opportunityForm.includes('Opportunity could not be saved.') &&
    opportunityForm.includes('resetDraft(cloneOpportunityDraft(result.opportunity))') &&
    opportunityForm.includes('setSaveMessages(result.messages)') &&
    opportunityForm.includes('const bypassUnsavedPromptRef = useRef(false)') &&
    opportunityForm.includes('function bypassNextOpportunityNavigation()') &&
    systemForm.includes('const committedRecord = onSave(') &&
    systemForm.includes("setMessages(['System inventory record saved.'])") &&
    systemForm.includes('const bypassUnsavedPromptRef = useRef(false)') &&
    systemForm.includes('function bypassNextSystemNavigation()') &&
    infrastructureForm.includes('const result = isNew ? createInfrastructureItem(draft) : updateInfrastructureItem(draft.id, draft)') &&
    infrastructureForm.includes('if (!result.ok || !result.record)') &&
    infrastructureForm.includes('resetDraft(cloneInfrastructureItem(result.record))') &&
    infrastructureForm.includes("fallbackExitRoute: '/infrastructure'") &&
    infrastructureForm.includes('cancelFormNavigationTarget({') &&
    tenantForm.includes('let committedTenant: Tenant | undefined') &&
    tenantForm.includes('committedTenant = saveTenantConfiguration(persistedTenant.id, normalizedDraft') &&
    tenantForm.includes("setMessages([`Tenant could not be saved.${reason}`])") &&
    tenantForm.includes('resetDraft(cloneTenant(committedTenant))') &&
    tenantForm.includes('const TENANT_CONFIGURATION_MIRROR_FIELDS: Array<keyof Tenant>') &&
    tenantForm.includes("'blockchain'") &&
    tenantForm.includes('TENANT_CONFIGURATION_MIRROR_FIELDS.forEach((field) =>') &&
    tenantForm.includes('delete parentScope.configurationHistory') &&
    tenantForm.includes('cancelFormNavigationTarget({') &&
    tenantForm.includes("setMessages(['Tenant saved.'])") &&
    tenantForm.includes('const bypassUnsavedPromptRef = useRef(false)') &&
    tenantForm.includes('function bypassNextTenantNavigation()'),
  'Audited major forms must validate/persist/check result where applicable, reset committed baselines, use lifecycle Cancel navigation, and show success/error feedback.',
)

assert(
  validationPresentation.includes('export function dirtyControlClassName') &&
    validationPresentation.includes("return isDirty ? 'bg-yellow-100' : 'bg-white'") &&
    checkboxMultiSelect.includes('dirty?: boolean') &&
    checkboxMultiSelect.includes('dirtyControlClassName(dirty)') &&
    projectForm.includes('dirtyControlClassName(isChanged)') &&
    opportunityForm.includes('dirtyControlClassName(isChanged)') &&
    systemForm.includes('dirtyControlClassName(isChanged)') &&
    infrastructureForm.includes('dirtyControlClassName(isChanged)') &&
    infrastructureForm.includes('function fieldIsDirty') &&
    infrastructureForm.includes('function propertyIsDirty') &&
    tenantForm.includes('compareApplicationConfigurationField') &&
    tenantForm.includes('const persistedConfiguration = configurationFromTenant(persistedTenant, activeSystem)') &&
    tenantForm.includes('dirty={isChanged}') &&
    tenantForm.includes('dirtyControlClassName(isChanged)'),
  'Dirty presentation must be centralized and driven from persisted-baseline comparisons across audited forms, including Tenant Application Configuration controls.',
)

assert(
  architectureHandbook.includes('Application form-action semantics are standardized') &&
    standingRules.includes('Standard form actions have application-wide lifecycle semantics') &&
    decisionLog.includes('Standard form actions have application-wide lifecycle semantics'),
  'Save/Apply persistence semantics must be recorded as durable repository rules.',
)

assert(
  packageJson.scripts['verify:v13-save-apply-semantics'] === 'node scripts/verify-v13-save-apply-semantics.mjs',
  'package.json must expose verify:v13-save-apply-semantics.',
)

if (!process.exitCode) {
  console.log('V1.3 Save/Apply semantics verification passed')
  console.log('Save: validate -> persist -> confirm -> clean -> feedback -> exit')
  console.log('Apply Changes: validate -> persist -> confirm -> clean -> feedback -> stay on persisted form')
  console.log('Failure: explain -> stay -> preserve dirty state')
}
