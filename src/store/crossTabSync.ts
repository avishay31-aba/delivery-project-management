import type { AppDataState } from '@/data/seed.types'
import { loadPersistedState } from '@/store/persistence'

const CHANNEL_NAME = 'delivery-erp-state-sync'
const NOTIFICATION_STORAGE_KEY = 'delivery-erp-state-sync-notification'
const SOURCE_ID = crypto.randomUUID()

type StateSyncMessage = {
  type: 'STATE_COMMITTED'
  sourceId: string
  version: string
}

let channel: BroadcastChannel | null = null
const listeners = new Set<(state: AppDataState) => void>()

function notifyListeners() {
  const state = loadPersistedState()
  if (!state) return
  listeners.forEach((listener) => listener(state))
}

function handleMessage(message: StateSyncMessage) {
  if (message.type !== 'STATE_COMMITTED' || message.sourceId === SOURCE_ID) return
  notifyListeners()
}

function ensureChannel() {
  if (channel || typeof BroadcastChannel === 'undefined') return
  channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event: MessageEvent<StateSyncMessage>) => handleMessage(event.data)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
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
  return () => {
    listeners.delete(listener)
  }
}

export function publishCommittedStateChange() {
  const message: StateSyncMessage = {
    type: 'STATE_COMMITTED',
    sourceId: SOURCE_ID,
    version: new Date().toISOString(),
  }
  ensureChannel()
  channel?.postMessage(message)
  try {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(message))
  } catch {
    // BroadcastChannel is the primary mechanism; localStorage is best-effort fallback.
  }
}
