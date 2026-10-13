import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function assert(condition, message) {
  if (!condition) {
    console.error(`V1.3 Cross-tab persistence verification failed: ${message}`)
    process.exitCode = 1
  }
}

function countMatches(value, pattern) {
  return value.match(pattern)?.length ?? 0
}

function functionBody(source, name) {
  const start = source.indexOf(`function ${name}()`)
  if (start < 0) return ''
  const bodyStart = source.indexOf('{', start)
  if (bodyStart < 0) return ''
  let depth = 0
  for (let index = bodyStart; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') {
      depth -= 1
      if (depth === 0) return source.slice(bodyStart + 1, index)
    }
  }
  return ''
}

const crossTabSync = read('src/store/crossTabSync.ts')
const appStore = read('src/store/useAppStore.ts')
const appStateRepository = read('src/platform/persistence/app-state-repository.ts')
const businessObjectLink = read('src/components/ui/BusinessObjectLink.tsx')
const linkId = read('src/components/ui/LinkId.tsx')
const dataDashboard = read('src/components/dashboard/DataDashboard.tsx')
const businessReferenceService = read('src/domain/business-reference/service.ts')
const routes = read('src/routes/index.tsx')
const packageJson = JSON.parse(read('package.json'))
const startupSnapshotBody = functionBody(appStore, 'requestCommittedStateSnapshotsOnStartup')
const startupRetryTimeouts = startupSnapshotBody.match(/window\.setTimeout\(requestCommittedStateSnapshot,\s*(\d+)\)/g) ?? []

assert(
  appStateRepository.includes("APP_STATE_COMPRESSED_KEYED_DELTA_FORMAT = 'dpm-compressed-keyed-seed-delta-v1'") &&
    appStateRepository.includes('compressedKeyedSeedDeltaAppDataState(compactAppDataStateForStorage(payload))') &&
    appStateRepository.includes('isCompressedKeyedSeedDeltaAppDataState(parsed)') &&
    appStateRepository.includes('isKeyedSeedDeltaAppDataState(parsed)') &&
    appStateRepository.includes('isSeedDeltaAppDataState(parsed)'),
  'authoritative app-state persistence must use compressed keyed seed-delta storage and keep backward-compatible hydration.',
)

assert(
  crossTabSync.includes("type: 'STATE_COMMITTED'") &&
    crossTabSync.includes("type: 'STATE_SNAPSHOT_REQUEST'") &&
    crossTabSync.includes("type: 'STATE_SNAPSHOT'") &&
    crossTabSync.includes('export function requestCommittedStateSnapshot') &&
    crossTabSync.includes('function postSnapshotResponse()') &&
    crossTabSync.includes('readAppDataStateStorageCommit') &&
    crossTabSync.includes('messageAlreadyHandled') &&
    crossTabSync.includes('requestAlreadyHandled') &&
    crossTabSync.includes("let lastNotifiedVersion = ''") &&
    crossTabSync.includes('if (!version) return') &&
    crossTabSync.includes('if (version && version <= lastNotifiedVersion) return') &&
    crossTabSync.includes('const nextState = loadPersistedState()') &&
    crossTabSync.includes('if (message.sourceId === SOURCE_ID) return') &&
    !crossTabSync.includes('persistState(state)') &&
    !crossTabSync.includes('state: AppDataState\n}') &&
    crossTabSync.includes('channel?.postMessage(message)') &&
    !crossTabSync.includes('if (state) postSnapshot(state)'),
  'cross-tab sync must support startup version request/response, ignore self-originated and stale messages, dedupe same-version messages, and avoid broadcasting or persisting full snapshots for normal committed saves.',
)

assert(
  appStore.includes('requestCommittedStateSnapshot') &&
    appStore.includes('function requestCommittedStateSnapshotsOnStartup()') &&
    appStore.includes('function rebaseAppDataStateForPersistence(current: AppDataState, latest: AppDataState | null): AppDataState') &&
    appStore.includes('latestPersistedAt <= currentPersistedAt') &&
    appStore.includes('rebaseCollectionForPersistence') &&
    appStore.includes('function stableIncomingCollection') &&
    appStore.includes('function mergeIncomingCommittedState') &&
    appStore.includes('set((current) => mergeIncomingCommittedState(current, state))') &&
    appStore.includes("collection === 'projects' ? record.pid ?? record.id") &&
    appStore.includes('const dataToPersist = rebaseAppDataStateForPersistence(data, loadPersistedState())') &&
    appStore.includes('subscribeToCommittedStateChanges((state) =>') &&
    startupSnapshotBody.includes('requestCommittedStateSnapshot()') &&
    startupSnapshotBody.includes('window.setTimeout(requestCommittedStateSnapshot, 250)') &&
    startupSnapshotBody.includes('window.setTimeout(requestCommittedStateSnapshot, 1000)') &&
    startupRetryTimeouts.length === 2 &&
    countMatches(startupSnapshotBody, /requestCommittedStateSnapshot\(\)/g) === 1 &&
    !startupSnapshotBody.includes('setInterval') &&
    !startupSnapshotBody.includes('while') &&
    !startupSnapshotBody.includes('requestCommittedStateSnapshotsOnStartup()') &&
    appStore.includes('requestCommittedStateSnapshotsOnStartup()'),
  'store initialization must subscribe to shared commits, issue one immediate startup request plus bounded 250ms and 1000ms retries only, and rebase stale-tab saves over newer durable state.',
)

assert(
  appStateRepository.includes('lastPersistedAt: state.lastPersistedAt ?? new Date().toISOString()'),
  'app-state repository must preserve the store transaction timestamp so raw storage and store versions stay aligned.',
)

assert(
    businessObjectLink.includes('businessObjectViewRoutePath(reference.routePath)') &&
    businessObjectLink.includes('businessObjectViewRoutePath(routePath)') &&
    businessObjectLink.includes('/[?&]mode=/.test(routePath)') &&
    businessObjectLink.includes("return `${routePath}${separator}mode=view`") &&
    linkId.includes('<a') &&
    linkId.includes('href={href}') &&
    linkId.includes("target={newTab ? '_blank' : undefined}") &&
    !businessObjectLink.includes('state={{'),
  'business-object links must be URL-based anchors that open read-only by default and do not depend on same-tab router state.',
)

assert(
  dataDashboard.includes('<Link') &&
    dataDashboard.includes('to={viewRoute}') &&
    dataDashboard.includes('to={editRoute}') &&
    !dataDashboard.includes('state={{ record') &&
    !dataDashboard.includes('state={{ item'),
  'dashboard object actions must navigate by route/id rather than passing in-memory records that disappear in a new tab.',
)

for (const [objectName, routeNeedle] of [
  ['Opportunity', '/opportunities/'],
  ['Project', '/projects/'],
  ['Tenant', '/tenants/'],
  ['Infrastructure Item', '/infrastructure/'],
  ['Production System', '/systems/production-inventory/'],
  ['Reused Internal System', '/systems/reused-internal/'],
]) {
  assert(
    businessReferenceService.includes(routeNeedle) && routes.includes(routeNeedle.slice(1, -1)),
    `${objectName} business reference routes must be resolvable from copied/new-tab URLs.`,
  )
}

assert(
  packageJson.scripts['verify:v13-cross-tab-persistence'] === 'node scripts/verify-v13-cross-tab-persistence.mjs',
  'package.json must expose verify:v13-cross-tab-persistence.',
)

if (!process.exitCode) {
  console.log('V1.3 Cross-tab persistence verification passed')
  console.log('Business object links are URL-based/read-only and startup hydration requests the latest committed state.')
}
