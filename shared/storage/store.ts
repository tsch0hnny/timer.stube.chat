import { MAX_ABS_MS, MINUTE, idle, type TimerState } from '../timer/core'

/**
 * The one storage interface for timer state, presets and prefs. Phase 1 backs it with
 * localStorage; Pocket ID sync (phase 2) wraps or replaces this without touching the UI or core.
 */
export interface AppStore {
  loadTimer(): TimerState
  saveTimer(s: TimerState): void
  /** The saved presets, sorted by length; the 12 defaults until anything is changed. */
  loadPresets(): readonly Preset[]
  savePresets(list: readonly Preset[]): void
  loadPrefs(): Prefs
  savePrefs(p: Prefs): void
  /** The stored timer envelope as written, for the debug overlay. */
  rawTimer(): string | null
  /** Last load/save problem, for the debug overlay. Never thrown. */
  lastError(): string | null
}

export interface KeyValue {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface Preset {
  id: string
  durationMs: number
  builtIn: boolean
}

export const STEP_CHOICES = [1, 5, 10, 15] as const
export type StepMinutes = (typeof STEP_CHOICES)[number]
export interface Prefs {
  stepMinutes: StepMinutes
  /** Tapping a preset or the wheel's button starts counting at once instead of opening paused. */
  startOnTap: boolean
  /** The last length set with the wheel; the wheel opens on it. Whole seconds, 1 s to 9:59:59. */
  wheelMs: number
}
export const DEFAULT_PREFS: Prefs = Object.freeze({ stepMinutes: 1, startOnTap: false, wheelMs: 15 * MINUTE })

export const BUILT_IN_PRESETS: readonly Preset[] = Object.freeze(
  Array.from({ length: 12 }, (_, i) => Object.freeze({ id: `builtin-${(i + 1) * 15}`, durationMs: (i + 1) * 15 * MINUTE, builtIn: true })),
)

const VERSION = 1
export const KEYS = { timer: 'timer.v1.state', prefs: 'timer.v1.prefs', presets: 'timer.v1.presets' } as const

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
/** A length the timer can be set to: whole seconds, 1 s to 9:59:59. */
const okLength = (x: unknown): x is number => finite(x) && Number.isInteger(x / 1000) && x >= 1000 && x <= MAX_ABS_MS
const byLength = (a: Preset, b: Preset) => a.durationMs - b.durationMs

/** Valid entries only, one per length, sorted by length; null when it is not a list at all. */
function parsePresets(list: unknown): Preset[] | null {
  if (!Array.isArray(list)) return null
  const seen = new Set<number>()
  const out: Preset[] = []
  for (const p of list) {
    if (!p || typeof p !== 'object') continue
    const { id, durationMs, builtIn } = p as Record<string, unknown>
    if (typeof id !== 'string' || !okLength(durationMs) || seen.has(durationMs)) continue
    seen.add(durationMs)
    out.push({ id, durationMs, builtIn: builtIn === true })
  }
  return out.sort(byLength)
}
/** Adds a length unless it is already there (a default length gets its default identity back). */
export function withPreset(list: readonly Preset[], durationMs: number): { list: readonly Preset[]; added: Preset | null } {
  if (!okLength(durationMs) || list.some((p) => p.durationMs === durationMs)) return { list, added: null }
  const added = BUILT_IN_PRESETS.find((p) => p.durationMs === durationMs) ?? { id: `custom-${durationMs}`, durationMs, builtIn: false }
  return { list: [...list, added].sort(byLength), added }
}
export const withoutPreset = (list: readonly Preset[], id: string): readonly Preset[] => list.filter((p) => p.id !== id)
export const missingDefaults = (list: readonly Preset[]) => BUILT_IN_PRESETS.some((b) => !list.some((p) => p.durationMs === b.durationMs))
/** Brings back every missing default; lengths the player added stay. */
export const withDefaults = (list: readonly Preset[]): readonly Preset[] =>
  BUILT_IN_PRESETS.reduce((acc, b) => withPreset(acc, b.durationMs).list, list)

/** Validates a stored timer. Returns the state, or an error string. */
export function parseTimer(raw: string): TimerState | string {
  let o: unknown
  try { o = JSON.parse(raw) } catch { return 'timer: stored value is not JSON' }
  const env = o as { v?: unknown; state?: Record<string, unknown> } | null
  if (!env || env.v !== VERSION) return `timer: unknown version ${JSON.stringify(env?.v)}`
  const s = env.state
  if (!s || typeof s !== 'object') return 'timer: missing state'
  if (s.status === 'idle') return idle
  const okDuration = finite(s.durationMs) && s.durationMs > 0 && s.durationMs <= MAX_ABS_MS
  if (!okDuration || typeof s.hours !== 'boolean') return `timer: bad ${String(s.status)} state`
  if (s.status === 'paused' && finite(s.remainingMs) && Math.abs(s.remainingMs) <= MAX_ABS_MS) {
    return { status: 'paused', durationMs: s.durationMs as number, remainingMs: s.remainingMs, hours: s.hours }
  }
  if (s.status === 'running' && finite(s.endAt) && s.endAt > 0) {
    return { status: 'running', durationMs: s.durationMs as number, endAt: s.endAt, hours: s.hours }
  }
  return `timer: bad ${String(s.status)} state`
}

export function createLocalStore(kv: KeyValue | null, opts: { now?: () => number } = {}): AppStore {
  const now = opts.now ?? Date.now
  let error: string | null = null
  const memory = new Map<string, string>()
  const backend: KeyValue = kv ?? {
    getItem: (k) => memory.get(k) ?? null,
    setItem: (k, v) => { memory.set(k, v) },
    removeItem: (k) => { memory.delete(k) },
  }
  if (!kv) error = 'localStorage unavailable: state lives in memory only and will not survive a reload'

  const read = (key: string): string | null => {
    try { return backend.getItem(key) } catch (e) { error = `read ${key} failed: ${(e as Error).name}`; return null }
  }
  const write = (key: string, value: string, what: string) => {
    try { backend.setItem(key, value) } catch (e) { error = `${what} save failed: ${(e as Error).name}` }
  }

  return {
    loadTimer() {
      const raw = read(KEYS.timer)
      if (raw === null) return idle
      const r = parseTimer(raw)
      if (typeof r === 'string') { error = r; return idle }
      return r
    },
    saveTimer(s) {
      write(KEYS.timer, JSON.stringify({ v: VERSION, savedAt: now(), state: s }), 'timer')
    },
    loadPresets() {
      const raw = read(KEYS.presets)
      if (raw === null) return BUILT_IN_PRESETS
      // Unreadable presets fall back to the defaults quietly: the warning pill is about the timer.
      try {
        const o = JSON.parse(raw) as { v?: unknown; presets?: unknown }
        const list = o?.v === VERSION ? parsePresets(o.presets) : null
        if (list) return list
      } catch { /* fall through */ }
      return BUILT_IN_PRESETS
    },
    savePresets(list) {
      write(KEYS.presets, JSON.stringify({ v: VERSION, presets: list }), 'presets')
    },
    loadPrefs() {
      const raw = read(KEYS.prefs)
      if (raw === null) return { ...DEFAULT_PREFS }
      try {
        const o = JSON.parse(raw) as { v?: number; prefs?: { stepMinutes?: unknown; startOnTap?: unknown; wheelMs?: unknown } }
        if (o?.v === VERSION) {
          // Each field falls back on its own: a junk step must not switch "Start right away" off.
          const step = o.prefs?.stepMinutes
          return {
            stepMinutes: (STEP_CHOICES as readonly unknown[]).includes(step) ? (step as StepMinutes) : DEFAULT_PREFS.stepMinutes,
            startOnTap: o.prefs?.startOnTap === true,
            wheelMs: okLength(o.prefs?.wheelMs) ? o.prefs.wheelMs : DEFAULT_PREFS.wheelMs,
          }
        }
      } catch { /* fall through */ }
      return { ...DEFAULT_PREFS }
    },
    savePrefs(p) {
      write(KEYS.prefs, JSON.stringify({ v: VERSION, prefs: p }), 'prefs')
    },
    rawTimer: () => read(KEYS.timer),
    lastError: () => error,
  }
}
