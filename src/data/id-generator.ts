/**
 * ID helpers for future create flows (Phase B+).
 * Phase A: seed data uses pre-assigned IDs.
 */

export function nextNumericId(existing: string[], prefix: string, pad = 4): string {
  const numbers = existing
    .filter((id) => id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n))

  const next = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
  return `${prefix}${String(next).padStart(pad, '0')}`
}

export function nextPid(existingPids: string[]): string {
  return nextNumericId(existingPids, 'P')
}

export function nextSid(existingSids: (string | null)[]): string {
  return nextNumericId(
    existingSids.filter((s): s is string => s != null),
    'S',
  )
}

export function nextTid(existingTids: string[]): string {
  return nextNumericId(existingTids, 'T')
}
