/**
 * Timer core: a pure state machine with no clock of its own.
 *
 * Every operation takes `now` (wall-clock epoch milliseconds, i.e. UTC, from Date.now()) as an
 * argument, and nothing here keeps a ticking counter:
 *  - running stores the absolute end time (`endAt`),
 *  - paused stores the remaining milliseconds (negative when paused in overtime).
 * "Overtime" is not stored; it is a running timer whose end time has passed.
 *
 * Count-up (`countUp: true`, the band's choice) is the same timer read the other way: the display
 * shows the time elapsed, durationMs − remaining, and the end is still `endAt`. Only the ± steps
 * differ (they move the elapsed time, see step). Countdown states carry no countUp field at all, so
 * they are stored exactly as before.
 *
 * Why the wall clock: it is the only clock that survives phone lock, suspend, reload and the
 * app being killed. performance.now() pauses while the device sleeps, so it cannot be trusted
 * across a lock. Consequence: if the system clock is changed mid-run, the timer follows it
 * (see ticker.ts, which reports such jumps for the debug overlay but never acts on them).
 */

export const SECOND = 1_000
export const MINUTE = 60 * SECOND
export const HOUR = 60 * MINUTE
/** Largest magnitude the H:MM:SS display can show: 9:59:59. */
export const MAX_ABS_MS = 9 * HOUR + 59 * MINUTE + 59 * SECOND
/** Timers longer than this use H:MM:SS; up to and including 60:00 use MM:SS. */
export const HOURS_FORMAT_ABOVE_MS = HOUR

export type TimerState =
  | { readonly status: 'idle' }
  | { readonly status: 'paused'; readonly durationMs: number; readonly remainingMs: number; readonly hours: boolean; readonly countUp?: true }
  | { readonly status: 'running'; readonly durationMs: number; readonly endAt: number; readonly hours: boolean; readonly countUp?: true }

export type PausedState = Extract<TimerState, { status: 'paused' }>
export type RunningState = Extract<TimerState, { status: 'running' }>

export type Phase = 'idle' | 'paused' | 'running' | 'overtime'

export const idle: TimerState = Object.freeze({ status: 'idle' })

const clamp = (ms: number) => Math.max(-MAX_ABS_MS, Math.min(MAX_ABS_MS, ms))

/** Seconds as the display shows them: ceil while counting down, floor in overtime. */
export function shownSeconds(remaining: number): number {
  return remaining > 0 ? Math.ceil(remaining / SECOND) : Math.floor(-remaining / SECOND)
}

/** Keep hours format: once a timer shows more than 60:00 it stays H:MM:SS. */
const stickyHours = (hours: boolean, remaining: number) => hours || shownSeconds(remaining) * SECOND > HOURS_FORMAT_ABOVE_MS

/** The countUp field as stored: present (true) on count-up timers only. */
const upField = (s: { countUp?: true }) => (s.countUp ? { countUp: true as const } : {})

/**
 * Tap on a preset: the timer view opens paused at the full duration (counting down) or at 00:00
 * (counting up). The hours format follows the length either way.
 */
export function select(durationMs: number, countUp = false): PausedState {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || durationMs > MAX_ABS_MS) {
    throw new RangeError(`invalid timer duration: ${durationMs}`)
  }
  const s: PausedState = { status: 'paused', durationMs, remainingMs: durationMs, hours: durationMs > HOURS_FORMAT_ABOVE_MS }
  return countUp ? { ...s, countUp: true } : s
}

export function start(s: TimerState, now: number): TimerState {
  if (s.status !== 'paused') return s
  return { status: 'running', durationMs: s.durationMs, endAt: now + s.remainingMs, hours: s.hours, ...upField(s) }
}

export function pause(s: TimerState, now: number): TimerState {
  if (s.status !== 'running') return s
  return { status: 'paused', durationMs: s.durationMs, remainingMs: s.endAt - now, hours: s.hours, ...upField(s) }
}

export function toggle(s: TimerState, now: number): TimerState {
  return s.status === 'running' ? pause(s, now) : start(s, now)
}

/**
 * ± buttons. Works while running and paused, and across zero in both directions. Counting up, the
 * step moves the time shown (12:30 → 13:30) and the end stays at the length; never below 00:00.
 */
export function step(s: TimerState, deltaMs: number, now: number): TimerState {
  if (s.status === 'idle' || !Number.isFinite(deltaMs)) return s
  if (s.countUp) {
    const elapsed = Math.max(0, Math.min(MAX_ABS_MS, s.durationMs - remainingMs(s, now)! + deltaMs))
    const remaining = s.durationMs - elapsed
    const hours = s.hours || Math.floor(elapsed / SECOND) * SECOND > HOURS_FORMAT_ABOVE_MS
    return s.status === 'paused' ? { ...s, remainingMs: remaining, hours } : { ...s, endAt: now + remaining, hours }
  }
  if (s.status === 'paused') {
    const remainingMs = clamp(s.remainingMs + deltaMs)
    return { ...s, remainingMs, hours: stickyHours(s.hours, remainingMs) }
  }
  const remaining = clamp(s.endAt - now + deltaMs)
  return { ...s, endAt: now + remaining, hours: stickyHours(s.hours, remaining) }
}

export function clear(): TimerState {
  return idle
}

/** Remaining milliseconds at `now`; negative in overtime; null when idle. */
export function remainingMs(s: TimerState, now: number): number | null {
  if (s.status === 'idle') return null
  return s.status === 'paused' ? s.remainingMs : s.endAt - now
}

/** Elapsed milliseconds at `now` (never below 0); null when idle. What a count-up timer shows. */
export function elapsedMs(s: TimerState, now: number): number | null {
  const r = remainingMs(s, now)
  return r === null || s.status === 'idle' ? null : Math.max(0, s.durationMs - r)
}

export function phase(s: TimerState, now: number): Phase {
  if (s.status !== 'running') return s.status
  return now >= s.endAt ? 'overtime' : 'running'
}
