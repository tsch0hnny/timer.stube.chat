import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MINUTE, SECOND, select, start, pause, step, type TimerState } from '../../shared/timer/core'
import { display } from '../../shared/timer/display'
import { createTicker } from '../../shared/timer/ticker'

const T0 = Date.UTC(2026, 10, 14, 20, 0, 0)

/** Minimal document stand-in: an EventTarget with a settable visibilityState. */
function fakeDocument() {
  const t = new EventTarget() as EventTarget & { visibilityState: 'visible' | 'hidden' }
  t.visibilityState = 'visible'
  return t
}

describe('ticker', () => {
  let state: TimerState
  let frames: string[]
  let doc: ReturnType<typeof fakeDocument>
  let win: EventTarget

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(T0)
    frames = []
    doc = fakeDocument()
    win = new EventTarget()
  })
  afterEach(() => vi.useRealTimers())

  const make = () => createTicker({
    now: () => Date.now(),
    getState: () => state,
    onTick: (now) => { const d = display(state, now); frames.push(d ? d.text : '–') },
    document: doc,
    window: win,
  })

  it('renders once per displayed second, never repeating or skipping a value', () => {
    state = start(select(MINUTE), T0)
    const t = make()
    t.start()
    vi.advanceTimersByTime(MINUTE + 3 * SECOND)
    // 01:00 at start, then 00:59 … 00:01, then −00:00 … −00:03
    const expected = ['01:00']
    for (let s = 59; s >= 1; s--) expected.push(`00:${String(s).padStart(2, '0')}`)
    expected.push('−00:00', '−00:01', '−00:02', '−00:03')
    expect(frames).toEqual(expected)
    t.stop()
  })

  it('uses no 1-second interval: every timeout is scheduled to the next boundary', () => {
    const spy = vi.spyOn(globalThis, 'setTimeout')
    state = start(select(MINUTE), T0 - 300) // started 300 ms ago → boundary 700 ms away
    const t = make()
    t.start()
    expect(spy.mock.calls.at(-1)![1]).toBe(700)
    vi.advanceTimersByTime(700)
    expect(spy.mock.calls.at(-1)![1]).toBe(1000)
    expect(vi.getTimerCount()).toBe(1)
    t.stop()
    expect(vi.getTimerCount()).toBe(0)
    spy.mockRestore()
  })

  it('a late timer still shows the right value (time comes from the clock, not the tick count)', () => {
    state = start(select(MINUTE), T0)
    const t = make()
    t.start()
    // The browser throttles: no timer fires for 20 s, then the clock is simply later.
    vi.setSystemTime(T0 + 20 * SECOND + 400)
    t.poke()
    expect(frames.at(-1)).toBe('00:40')
    t.stop()
  })

  it('recomputes immediately on visibilitychange (back from lock)', () => {
    state = start(select(10 * MINUTE), T0)
    const t = make()
    t.start()
    doc.visibilityState = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    const timersWhileHidden = vi.getTimerCount()
    // Locked for 4 min 30.2 s: JS is frozen, nothing fires.
    vi.setSystemTime(T0 + 4 * MINUTE + 30 * SECOND + 200)
    doc.visibilityState = 'visible'
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(timersWhileHidden).toBe(0) // no ticking while hidden
    expect(frames.at(-1)).toBe('05:30')
    t.stop()
  })

  it('also recomputes on pageshow (bfcache restore) and focus', () => {
    state = start(select(10 * MINUTE), T0)
    const t = make()
    t.start()
    vi.setSystemTime(T0 + 2 * MINUTE)
    win.dispatchEvent(new Event('pageshow'))
    expect(frames.at(-1)).toBe('08:00')
    vi.setSystemTime(T0 + 3 * MINUTE)
    win.dispatchEvent(new Event('focus'))
    expect(frames.at(-1)).toBe('07:00')
    t.stop()
  })

  it('does not tick while paused, but poke() renders state changes', () => {
    state = select(MINUTE)
    const t = make()
    t.start()
    vi.advanceTimersByTime(10 * SECOND)
    expect(frames).toEqual(['01:00'])
    expect(vi.getTimerCount()).toBe(0)
    state = step(state, MINUTE, Date.now())
    t.poke()
    expect(frames.at(-1)).toBe('02:00')
    state = start(state, Date.now())
    t.poke()
    vi.advanceTimersByTime(1000)
    expect(frames.at(-1)).toBe('01:59')
    state = pause(state, Date.now())
    t.poke()
    expect(vi.getTimerCount()).toBe(0)
    t.stop()
  })

  it('a system clock change mid-run: the wall clock is the truth, the display re-syncs and keeps ticking', () => {
    state = start(select(10 * MINUTE), T0)
    const jumps: number[] = []
    let mono = 0
    const t = createTicker({
      now: () => Date.now(), mono: () => mono, getState: () => state, document: doc, window: win,
      onTick: (now) => frames.push(display(state, now)!.text),
      onClockJump: (ms) => jumps.push(ms),
    })
    t.start()
    mono += 1000; vi.advanceTimersByTime(1000)
    expect(frames.at(-1)).toBe('09:59')
    // The user (or NTP) sets the clock 5 minutes forward while the page is visible.
    vi.setSystemTime(Date.now() + 5 * MINUTE)
    mono += 1000; vi.advanceTimersByTime(1000)
    expect(frames.at(-1)).toBe('04:58')
    expect(jumps).toEqual([5 * MINUTE])
    // ...and back again.
    vi.setSystemTime(Date.now() - 5 * MINUTE)
    t.poke()
    mono += 1000; vi.advanceTimersByTime(1000)
    expect(frames.at(-1)).toBe('09:57')
    expect(jumps).toEqual([5 * MINUTE, -5 * MINUTE])
    // Scheduling stays sane after both jumps: one timer, at most a second away.
    expect(vi.getTimerCount()).toBe(1)
    t.stop()
  })

  it('does not report a clock jump for time spent hidden (device sleep pauses the monotonic clock)', () => {
    state = start(select(10 * MINUTE), T0)
    const jumps: number[] = []
    const mono = 0 // frozen during sleep
    const t = createTicker({
      now: () => Date.now(), mono: () => mono, getState: () => state, document: doc, window: win,
      onTick: () => {}, onClockJump: (ms) => jumps.push(ms),
    })
    t.start()
    doc.visibilityState = 'hidden'
    doc.dispatchEvent(new Event('visibilitychange'))
    vi.setSystemTime(T0 + 3 * MINUTE)
    doc.visibilityState = 'visible'
    doc.dispatchEvent(new Event('visibilitychange'))
    expect(jumps).toEqual([])
    t.stop()
  })
})
