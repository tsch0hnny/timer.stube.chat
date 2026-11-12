import { describe, expect, it } from 'vitest'
import { HOUR, MINUTE, SECOND, idle, select, start, pause, step, remainingMs, phase, type TimerState } from '../../shared/timer/core'
import { display } from '../../shared/timer/display'
import { createLocalStore, BUILT_IN_PRESETS, type KeyValue } from '../../shared/storage/store'

const T0 = Date.UTC(2026, 10, 14, 20, 0, 0)

/** In-memory localStorage stand-in. `fail` makes writes throw like Safari when storage is full or blocked. */
function memoryKV(fail = false): KeyValue & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { if (fail) throw new DOMException('quota', 'QuotaExceededError'); data.set(k, v) },
    removeItem: (k) => { data.delete(k) },
  }
}

/** Save with one page instance, read back with a fresh one: a reload. */
function reload(kv: KeyValue, s: TimerState, savedAt = T0) {
  createLocalStore(kv, { now: () => savedAt }).saveTimer(s)
  return createLocalStore(kv).loadTimer()
}

describe('restoring each state after a reload', () => {
  it('idle', () => {
    expect(reload(memoryKV(), idle)).toEqual(idle)
  })
  it('paused keeps the exact remaining time, however long the reload took', () => {
    const s = pause(start(select(60 * MINUTE), T0), T0 + 10 * MINUTE + 123)
    const r = reload(memoryKV(), s)
    expect(r).toEqual(s)
    expect(remainingMs(r, T0 + 5 * HOUR)).toBe(50 * MINUTE - 123)
  })
  it('running continues from the stored end time', () => {
    const s = start(select(60 * MINUTE), T0)
    const r = reload(memoryKV(), s, T0 + 5 * MINUTE)
    expect(r).toEqual(s)
    expect(display(r, T0 + 7 * MINUTE)!.text).toBe('53:00') // 2 min passed during the reload
  })
  it('overtime comes back as overtime with the right value', () => {
    const s = start(select(15 * MINUTE), T0)
    const r = reload(memoryKV(), s, T0 + 16 * MINUTE)
    expect(phase(r, T0 + 17 * MINUTE)).toBe('overtime')
    expect(display(r, T0 + 17 * MINUTE + 5 * SECOND)!.text).toBe('−02:05')
  })
  it('paused in overtime and hours format survive', () => {
    const s = step(select(90 * MINUTE), -100 * MINUTE, T0)
    const r = reload(memoryKV(), s)
    expect(r).toEqual(s)
    expect(display(r, T0)!.text).toBe('−0:10:00')
  })
  it('stores absolute timestamps and the save time, readable for the debug overlay', () => {
    const kv = memoryKV()
    createLocalStore(kv, { now: () => T0 + 1 }).saveTimer(start(select(MINUTE), T0))
    const raw = JSON.parse(kv.data.get('timer.v1.state')!)
    expect(raw).toEqual({ v: 1, savedAt: T0 + 1, state: { status: 'running', durationMs: MINUTE, endAt: T0 + MINUTE, hours: false } })
  })
})

describe('bad or foreign data never crashes the app', () => {
  const cases: Array<[string, string]> = [
    ['not JSON', '{oops'],
    ['wrong version', JSON.stringify({ v: 99, state: { status: 'idle' } })],
    ['unknown status', JSON.stringify({ v: 1, state: { status: 'exploded' } })],
    ['running without endAt', JSON.stringify({ v: 1, state: { status: 'running', durationMs: 1000, hours: false } })],
    ['NaN remaining', JSON.stringify({ v: 1, state: { status: 'paused', durationMs: 1000, remainingMs: 'x', hours: false } })],
    ['absurd value', JSON.stringify({ v: 1, state: { status: 'paused', durationMs: 1000, remainingMs: 1e15, hours: false } })],
  ]
  for (const [name, raw] of cases) {
    it(`${name} → idle, and the problem is reported`, () => {
      const kv = memoryKV()
      kv.data.set('timer.v1.state', raw)
      const store = createLocalStore(kv)
      expect(store.loadTimer()).toEqual(idle)
      expect(store.lastError()).toMatch(/timer/)
    })
  }
  it('no storage at all (blocked) works in memory and says so', () => {
    const store = createLocalStore(null)
    store.saveTimer(select(MINUTE))
    expect(store.loadTimer()).toEqual(select(MINUTE))
    expect(store.lastError()).toMatch(/unavailable/)
  })
  it('a failing write is reported, not thrown', () => {
    const store = createLocalStore(memoryKV(true))
    expect(() => store.saveTimer(select(MINUTE))).not.toThrow()
    expect(store.lastError()).toMatch(/QuotaExceededError/)
  })
})

describe('presets and prefs live behind the same interface', () => {
  it('ships the 12 built-in presets, 15 minutes to 3 hours', () => {
    expect(BUILT_IN_PRESETS.map((p) => p.durationMs / MINUTE)).toEqual([15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180])
    expect(createLocalStore(memoryKV()).loadPresets()).toEqual(BUILT_IN_PRESETS)
  })
  it('remembers the chosen step size, defaults to 1 minute, rejects junk', () => {
    const kv = memoryKV()
    expect(createLocalStore(kv).loadPrefs()).toEqual({ stepMinutes: 1 })
    createLocalStore(kv).savePrefs({ stepMinutes: 10 })
    expect(createLocalStore(kv).loadPrefs()).toEqual({ stepMinutes: 10 })
    kv.data.set('timer.v1.prefs', JSON.stringify({ v: 1, prefs: { stepMinutes: 7 } }))
    expect(createLocalStore(kv).loadPrefs()).toEqual({ stepMinutes: 1 })
  })
  it('does not touch the spike’s keys', () => {
    const kv = memoryKV()
    kv.data.set('spike:log', '[]')
    createLocalStore(kv).saveTimer(select(MINUTE))
    expect([...kv.data.keys()].sort()).toEqual(['spike:log', 'timer.v1.state'])
  })
})
