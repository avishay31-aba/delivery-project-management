import { buildInformation } from '@/domain/build-info/service'
import type { KeyValuePersistenceAdapter } from './types'

export const STORAGE_DIAGNOSTIC_PROBE_KEY = 'delivery-erp-storage-diagnostic-probe'
export const LAST_PERSISTENCE_WRITE_DIAGNOSTIC_KEY = 'delivery-erp-storage-diagnostic-last-write'

export interface StorageEntryMetadata {
  key: string
  length: number
  approximateBytes: number
  format: string
  detectedVersion: string
  isDpmRelated: boolean
}

export interface StorageDiagnosticSummary {
  totalKeys: number
  totalApproximateBytes: number
  totalDpmApproximateBytes: number
  dpmMvpLength: number
  dpmMvpFormat: string
  dpmMvpVersion: string
  crossTabNotificationLength: number
  crossTabNotificationType: string
  largeKeys: StorageEntryMetadata[]
}

export interface StorageDiagnosticSnapshot {
  capturedAt: string
  origin: string
  persistenceFormat: string
  appVersion: string
  environment: string
  gitCommit: string
  legacyCleanupActive: boolean
  quotaRetryActive: boolean
  summary: StorageDiagnosticSummary
  entries: StorageEntryMetadata[]
}

export interface StorageWriteDiagnostic {
  capturedAt: string
  phase: string
  proposedValueLength: number
  proposedValueApproximateBytes: number
  proposedValueFormat: string
  proposedValueVersion: string
  obsoleteCleanupRan: boolean
  cleanupRemovedKeys: string[]
  usageBefore?: StorageDiagnosticSnapshot
  usageAfterCleanup?: StorageDiagnosticSnapshot
  error?: {
    name: string
    message: string
  }
}

export interface StorageWriteProbeResult {
  testedAt: string
  testSize: number
  success: boolean
  exceptionName: string
  exceptionMessage: string
  usageBefore: StorageDiagnosticSummary
  usageAfter: StorageDiagnosticSummary
}

let lastPersistenceWriteDiagnostic: StorageWriteDiagnostic | null = null

function approximateStorageBytes(value: string): number {
  return value.length * 2
}

function storageLength(storage: KeyValuePersistenceAdapter): number {
  return typeof storage.length === 'number' ? storage.length : 0
}

function storageKey(storage: KeyValuePersistenceAdapter, index: number): string | null {
  return typeof storage.key === 'function' ? storage.key(index) : null
}

export function isDpmStorageKey(key: string): boolean {
  return key === 'dpm-mvp-v1' ||
    key === 'delivery-erp-state-sync-notification' ||
    key.startsWith('dpm-') ||
    key.startsWith('dpm.') ||
    key.startsWith('delivery-erp')
}

export function detectStorageValue(raw: string): { format: string; detectedVersion: string } {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>
      const format = typeof record.persistenceFormat === 'string'
        ? record.persistenceFormat
        : typeof record.type === 'string'
          ? record.type
          : typeof record.version === 'number' && Array.isArray(record.projects)
            ? 'legacy-full-app-state'
            : 'object'
      const detectedVersion = typeof record.version === 'string' || typeof record.version === 'number'
        ? String(record.version)
        : typeof record.persistenceFormat === 'string'
          ? record.persistenceFormat
          : typeof record.type === 'string'
            ? record.type
            : 'n/a'
      return { format, detectedVersion }
    }
    return { format: typeof parsed, detectedVersion: 'n/a' }
  } catch {
    return { format: 'unparseable', detectedVersion: 'n/a' }
  }
}

function localStorageEntries(storage: KeyValuePersistenceAdapter): StorageEntryMetadata[] {
  const entries: StorageEntryMetadata[] = []
  for (let index = 0; index < storageLength(storage); index += 1) {
    const key = storageKey(storage, index)
    if (!key) continue
    const value = storage.getItem(key) ?? ''
    const detected = detectStorageValue(value)
    entries.push({
      key,
      length: value.length,
      approximateBytes: approximateStorageBytes(value),
      format: detected.format,
      detectedVersion: detected.detectedVersion,
      isDpmRelated: isDpmStorageKey(key),
    })
  }
  return entries.sort((left, right) => right.length - left.length || left.key.localeCompare(right.key))
}

function storageSummary(entries: StorageEntryMetadata[]): StorageDiagnosticSummary {
  const dpmMvp = entries.find((entry) => entry.key === 'dpm-mvp-v1')
  const crossTabNotification = entries.find((entry) => entry.key === 'delivery-erp-state-sync-notification')
  return {
    totalKeys: entries.length,
    totalApproximateBytes: entries.reduce((sum, entry) => sum + entry.approximateBytes, 0),
    totalDpmApproximateBytes: entries.filter((entry) => entry.isDpmRelated).reduce((sum, entry) => sum + entry.approximateBytes, 0),
    dpmMvpLength: dpmMvp?.length ?? 0,
    dpmMvpFormat: dpmMvp?.format ?? 'missing',
    dpmMvpVersion: dpmMvp?.detectedVersion ?? 'n/a',
    crossTabNotificationLength: crossTabNotification?.length ?? 0,
    crossTabNotificationType: crossTabNotification?.format ?? 'missing',
    largeKeys: entries.filter((entry) => entry.length >= 100_000).slice(0, 10),
  }
}

export function captureStorageDiagnosticSnapshot(
  storage: KeyValuePersistenceAdapter = localStorage,
  persistenceFormat = 'unknown',
): StorageDiagnosticSnapshot {
  const entries = localStorageEntries(storage)
  return {
    capturedAt: new Date().toISOString(),
    origin: typeof window === 'undefined' ? 'server' : window.location.origin,
    persistenceFormat,
    appVersion: buildInformation.version,
    environment: buildInformation.environment,
    gitCommit: buildInformation.shortGitCommit,
    legacyCleanupActive: true,
    quotaRetryActive: true,
    summary: storageSummary(entries),
    entries,
  }
}

function errorMetadata(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return { name: error.name, message: error.message }
  }
  return { name: 'UnknownError', message: String(error) }
}

function writeSessionDiagnostic(diagnostic: StorageWriteDiagnostic) {
  lastPersistenceWriteDiagnostic = diagnostic
  if (typeof sessionStorage === 'undefined') return
  try {
    sessionStorage.setItem(LAST_PERSISTENCE_WRITE_DIAGNOSTIC_KEY, JSON.stringify(diagnostic))
  } catch {
    // Diagnostics are best-effort and must never interfere with persistence.
  }
}

export function recordPersistenceWriteDiagnostic(diagnostic: StorageWriteDiagnostic): void {
  writeSessionDiagnostic(diagnostic)
}

export function persistenceWriteDiagnosticFromSession(): StorageWriteDiagnostic | null {
  if (lastPersistenceWriteDiagnostic) return lastPersistenceWriteDiagnostic
  if (typeof sessionStorage === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(LAST_PERSISTENCE_WRITE_DIAGNOSTIC_KEY)
    return raw ? JSON.parse(raw) as StorageWriteDiagnostic : null
  } catch {
    return null
  }
}

export function buildPersistenceWriteDiagnostic(
  phase: string,
  proposedRaw: string,
  persistenceFormat: string,
  storage: KeyValuePersistenceAdapter,
  options: {
    obsoleteCleanupRan?: boolean
    cleanupRemovedKeys?: string[]
    usageBefore?: StorageDiagnosticSnapshot
    usageAfterCleanup?: StorageDiagnosticSnapshot
    error?: unknown
  } = {},
): StorageWriteDiagnostic {
  const detected = detectStorageValue(proposedRaw)
  return {
    capturedAt: new Date().toISOString(),
    phase,
    proposedValueLength: proposedRaw.length,
    proposedValueApproximateBytes: approximateStorageBytes(proposedRaw),
    proposedValueFormat: detected.format,
    proposedValueVersion: detected.detectedVersion,
    obsoleteCleanupRan: options.obsoleteCleanupRan ?? false,
    cleanupRemovedKeys: options.cleanupRemovedKeys ?? [],
    usageBefore: options.usageBefore ?? captureStorageDiagnosticSnapshot(storage, persistenceFormat),
    usageAfterCleanup: options.usageAfterCleanup,
    error: options.error ? errorMetadata(options.error) : undefined,
  }
}

export function runStorageWriteProbe(
  storage: KeyValuePersistenceAdapter = localStorage,
  persistenceFormat = 'unknown',
): StorageWriteProbeResult {
  const testSize = 64 * 1024
  const usageBefore = captureStorageDiagnosticSnapshot(storage, persistenceFormat).summary
  let success = false
  let exceptionName = ''
  let exceptionMessage = ''
  try {
    storage.setItem(STORAGE_DIAGNOSTIC_PROBE_KEY, 'x'.repeat(testSize))
    success = true
  } catch (error) {
    const metadata = errorMetadata(error)
    exceptionName = metadata.name
    exceptionMessage = metadata.message
  } finally {
    try {
      storage.removeItem(STORAGE_DIAGNOSTIC_PROBE_KEY)
    } catch {
      // Removing the temporary diagnostic key is best-effort.
    }
  }
  const usageAfter = captureStorageDiagnosticSnapshot(storage, persistenceFormat).summary
  return {
    testedAt: new Date().toISOString(),
    testSize,
    success,
    exceptionName,
    exceptionMessage,
    usageBefore,
    usageAfter,
  }
}
