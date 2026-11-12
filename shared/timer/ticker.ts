import type { TimerState } from './core'
import { nextTickDelay } from './display'

type VisibilityTarget = EventTarget & { readonly visibilityState: string }

export interface TickerOptions {
  /** Wall clock, epoch ms (Date.now). The only source of truth for the time shown. */
  now: () => number
  getState: () => TimerState
  /** Render. Called with the `now` the frame was computed from. */
  onTick: (now: number) => void
  /** Optional monotonic clock (performance.now) used only to *detect* wall-clock jumps. */
  mono?: () => number
  /** Reports wall-clock jumps seen between two ticks while the page stayed visible. Diagnostic only. */
  onClockJump?: (jumpMs: number) => void
  jumpToleranceMs?: number
  document?: VisibilityTarget
  window?: EventTarget
}

export interface Ticker {
  start(): void
  stop(): void
  /** Re-render now and reschedule, e.g. after a state change. */
  poke(): void
}

/**
 * Display tick. One setTimeout at a time, always aimed at the timer's next second boundary, and
 * the value shown is always recomputed from the clock: a late, throttled or skipped timer can
 * delay a repaint but can never make the display wrong. Nothing ticks while the page is hidden;
 * visibilitychange, pageshow and focus recompute immediately.
 */
export function createTicker(o: TickerOptions): Ticker {
  const tolerance = o.jumpToleranceMs ?? 1000
  let handle: ReturnType<typeof setTimeout> | null = null
  let active = false
  let last: { wall: number; mono: number } | null = null

  const visible = () => !o.document || o.document.visibilityState === 'visible'

  function sample(continuous: boolean) {
    if (!o.mono) return
    const wall = o.now()
    const mono = o.mono()
    if (continuous && last) {
      const jump = (wall - last.wall) - (mono - last.mono)
      if (Math.abs(jump) > tolerance) o.onClockJump?.(jump)
    }
    last = { wall, mono }
  }

  function frame(continuous: boolean) {
    if (handle !== null) { clearTimeout(handle); handle = null }
    if (!active) return
    sample(continuous)
    const now = o.now()
    o.onTick(now)
    if (!visible()) return
    const delay = nextTickDelay(o.getState(), now)
    if (delay !== null) handle = setTimeout(() => { handle = null; frame(true) }, delay)
  }

  // After the page was hidden or restored, the monotonic clock may have paused (device sleep),
  // so the next sample must not be compared with the old one.
  const resync = () => { last = null; frame(false) }

  return {
    start() {
      if (active) return
      active = true
      o.document?.addEventListener('visibilitychange', resync)
      o.window?.addEventListener('pageshow', resync)
      o.window?.addEventListener('focus', resync)
      last = null
      frame(false)
    },
    stop() {
      active = false
      if (handle !== null) { clearTimeout(handle); handle = null }
      o.document?.removeEventListener('visibilitychange', resync)
      o.window?.removeEventListener('pageshow', resync)
      o.window?.removeEventListener('focus', resync)
    },
    poke() { frame(true) },
  }
}
