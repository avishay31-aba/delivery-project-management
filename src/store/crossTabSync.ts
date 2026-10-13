import type { AppDataState } from '@/data/seed.types'
import { APP_STATE_STORAGE_KEY, readAppDataStateStorageCommit } from '@/platform/persistence'
import { loadPersistedState } from '@/store/persistence'

const CHANNEL_NAME = 'delivery-erp-state-sync'
const NOTIFICATION_STORAGE_KEY = 'delivery-erp-state-sync-notification'
const SOURCE_ID = crypto.randomUUID()
const RECENT_MESSAGE_LIMIT = 128

type StateCommittedMessage = {
  type: 'STATE_COMMITTED'
  sourceId: string
  messageId: string
  version: string
  sentAt: string
}

type StateSnapshotRequestMessage = {
  type: 'STATE_SNAPSHOT_REQUEST'
  sourceId: string
  requestId: string
  requestedAt: string
}

type StateSnapshotMessage = {
  type: 'STATE_SNAPSHOT'
  sourceId: string
  messageId: string
  version: string
  sentAt: string
}

type StateSyncMessage = StateCommittedMessage | StateSnapshotRequestMessage | StateSnapshotMessage

let channel: BroadcastChannel | null = null
let lastNotifiedVersion = ''
const listeners = new Set<(state: AppDataState) => void>()
const handledMessageIds = new Set<string>()
const handledSnapshotRequestIds = new Set<string>()

function rememberHandled(set: Set<string>, id: string) {
  if (!id) return
  set.add(id)
  if (set.size <= RECENT_MESSAGE_LIMIT) return
  const oldest = set.values().next().value
  if (oldest) set.delete(oldest)
}

function messageAlreadyHandled(messageId: string): boolean {
  if (!messageId) return false
  if (handledMessageIds.has(messageId)) return true
  rememberHandled(handledMessageIds, messageId)
  return false
}

function requestAlreadyHandled(requestId: string): boolean {
  if (!requestId) return false
  if (handledSnapshotRequestIds.has(requestId)) return true
  rememberHandled(handledSnapshotRequestIds, requestId)
  return false
}

function committedVersion(state: AppDataState | null): string {
  return state?.lastPersistedAt ?? ''
}

function currentDurableVersion(): string {
  return readAppDataStateStorageCommit()?.version ?? committedVersion(loadPersistedState())
}

function notifyListeners(version: string) {
  if (!version) return
  if (version && version <= lastNotifiedVersion) return
  const nextState = loadPersistedState()
  if (!nextState) return
  const nextVersion = committedVersion(nextState)
  if (!nextVersion || nextVersion < version || nextVersion <= lastNotifiedVersion) return
  lastNotifiedVersion = nextVersion
  listeners.forEach((listener) => listener(nextState))
}

function commitMessage(version: string): StateCommittedMessage {
  return {
    type: 'STATE_COMMITTED',
    sourceId: SOURCE_ID,
    messageId: crypto.randomUUID(),
    version,
    sentAt: new Date().toISOString(),
  }
}

function postVersionMessage(message: StateCommittedMessage | StateSnapshotMessage) {
  rememberHandled(handledMessageIds, message.messageId)
  ensureChannel()
  channel?.postMessage(message)
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(message))
  } catch {
    // BroadcastChannel is the primary mechanism; localStorage is best-effort fallback.
  }
}

function postSnapshotResponse() {
  const commit = readAppDataStateStorageCommit()
  if (!commit?.version) return
  postVersionMessage({
    type: 'STATE_SNAPSHOT',
    sourceId: SOURCE_ID,
    messageId: crypto.randomUUID(),
    version: commit.version,
    sentAt: new Date().toISOString(),
  })
}

function handleMessage(message: StateSyncMessage) {
  if (message.sourceId === SOURCE_ID) return
  if (message.type === 'STATE_COMMITTED' || message.type === 'STATE_SNAPSHOT') {
    if (messageAlreadyHandled(message.messageId)) return
    notifyListeners(message.version)
    return
  }
  if (message.type === 'STATE_SNAPSHOT_REQUEST') {
    if (requestAlreadyHandled(message.requestId)) return
    postSnapshotResponse()
  }
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<StateSyncMessage>) => handleMessage(event.data)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === APP_STATE_STORAGE_KEY) {
      const commit = readAppDataStateStorageCommit()
      if (commit?.version) notifyListeners(commit.version)
      return
    }
    if (event.key !== NOTIFICATION_STORAGE_KEY || !event.newValue) return
    try {
      handleMessage(JSON.parse(event.newValue) as StateSyncMessage)
    } catch {
      // Ignore malformed cross-tab notifications.
    }
  })
}

export function subscribeToCommittedStateChanges(listener: (state: AppDataState) => void): () => void {
  ensureChannel()
  listeners.add(listener)
  lastNotifiedVersion = lastNotifiedVersion || currentDurableVersion()
  return () => {
    listeners.delete(listener)
  }
}

export function publishCommittedStateChange(committedState?: AppDataState) {
  const version = committedVersion(committedState ?? null) || readAppDataStateStorageCommit()?.version || new Date().toISOString()
  postVersionMessage(commitMessage(version))
}

export function requestCommittedStateSnapshot() {
  const message: StateSnapshotRequestMessage = {
    type: 'STATE_SNAPSHOT_REQUEST',
    sourceId: SOURCE_ID,
    requestId: crypto.randomUUID(),
    requestedAt: new Date().toISOString(),
  }
  rememberHandled(handledSnapshotRequestIds, message.requestId)
  ensureChannel()
  channel?.postMessage(message)
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(message))
  } catch {
    // Snapshot requests are best-effort; regular storage hydration still covers same-storage tabs.
  }
}
