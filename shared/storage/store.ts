import { MAX_ABS_MS, MINUTE, idle, type TimerState } from '../timer/core'

/**
 * The one storage interface for timer state, presets and prefs. Phase 1 backs it with
 * localStorage; Pocket ID sync (phase 2) wraps or replaces this without touching the UI or core.
 */
export interface AppStore {
  loadTimer(): TimerState
  saveTimer(s: TimerState): void
  loadPresets(): readonly Preset[]
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
export const KEYS = { timer: 'timer.v1.state', prefs: 'timer.v1.prefs' } as const

const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const okWheel = (x: unknown): x is number => finite(x) && Number.isInteger(x / 1000) && x >= 1000 && x <= MAX_ABS_MS

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
      return BUILT_IN_PRESETS
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
            wheelMs: okWheel(o.prefs?.wheelMs) ? o.prefs.wheelMs : DEFAULT_PREFS.wheelMs,
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
