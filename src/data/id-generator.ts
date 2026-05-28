import type { AppDataState, IdCounterKey, IdCounters } from '@/data/seed.types'

const ID_PREFIXES: Record<IdCounterKey, string> = {
  pid: 'P',
  sid: 'S',
  tid: 'T',
  mid: 'M',
}

const MINIMUM_SEED_COUNTERS: IdCounters = {
  pid: 999,
  sid: 999,
  tid: 999,
  mid: 0,
}

function numericSuffix(value: string | null | undefined, prefix?: string): number | null {
  if (!value) return null
  const pattern = prefix ? new RegExp(`^${prefix}(\\d+)$`, 'i') : /^(?:[A-Z]+)?(\d+)$/i
  const match = value.match(pattern)
  if (!match) return null

  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : null
}

function maxCounter(values: Array<string | null | undefined>, prefix: string, minimum: number): number {
  return values.reduce((max, value) => {
    const numeric = numericSuffix(value, prefix)
    return numeric == null ? max : Math.max(max, numeric)
  }, minimum)
}

function maxMachineCounter(values: Array<string | null | undefined>, minimum: number): number {
  return values.reduce((max, value) => {
    const prefixed = numericSuffix(value, ID_PREFIXES.mid)
    const fallback = numericSuffix(value)
    const numeric = prefixed ?? fallback
    return numeric == null ? max : Math.max(max, numeric)
  }, minimum)
}

export function deriveIdCountersFromRecords(state: Pick<AppDataState, 'projects' | 'systems' | 'tenants'>): IdCounters {
  return {
    pid: maxCounter(state.projects.map((project) => project.pid), ID_PREFIXES.pid, MINIMUM_SEED_COUNTERS.pid),
    sid: maxCounter(state.systems.map((system) => system.sid), ID_PREFIXES.sid, MINIMUM_SEED_COUNTERS.sid),
    tid: maxCounter(state.tenants.map((tenant) => tenant.tid), ID_PREFIXES.tid, MINIMUM_SEED_COUNTERS.tid),
    mid: maxMachineCounter(state.systems.map((system) => system.machineId), MINIMUM_SEED_COUNTERS.mid),
  }
}

export function normalizeIdCounters(
  counters: Partial<IdCounters> | null | undefined,
  records: Pick<AppDataState, 'projects' | 'systems' | 'tenants'>,
): IdCounters {
  const derived = deriveIdCountersFromRecords(records)

  return {
    pid: Math.max(counters?.pid ?? derived.pid, derived.pid),
    sid: Math.max(counters?.sid ?? derived.sid, derived.sid),
    tid: Math.max(counters?.tid ?? derived.tid, derived.tid),
    mid: Math.max(counters?.mid ?? derived.mid, derived.mid),
  }
}

export function incrementCounter(counters: IdCounters, counterKey: IdCounterKey): { counters: IdCounters; id: string } {
  const nextValue = counters[counterKey] + 1

  return {
    counters: {
      ...counters,
      [counterKey]: nextValue,
    },
    id: `${ID_PREFIXES[counterKey]}${nextValue}`,
  }
}