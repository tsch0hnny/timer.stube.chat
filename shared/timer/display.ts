import { HOURS_FORMAT_ABOVE_MS, SECOND, elapsedMs, phase, remainingMs, shownSeconds, type Phase, type TimerState } from './core'

/** U+2212 MINUS SIGN: same width as a tabular digit's neighbourhood, unlike the short hyphen. */
export const MINUS = '−'

export interface Display {
  /** e.g. "15:00", "1:30:00", "−02:15"; counting up "00:00", "12:30", "45:01" */
  text: string
  /** The text starts with the minus sign (countdown overtime only). */
  negative: boolean
  /** Past the end: red. Countdown: the same as negative. Counting up: from the length on, no minus. */
  over: boolean
  hours: boolean
  phase: Phase
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatClock(totalSeconds: number, negative: boolean, forceHours: boolean): string {
  const s = totalSeconds % 60
  const hours = forceHours || totalSeconds * SECOND > HOURS_FORMAT_ABOVE_MS
  // MM:SS counts whole minutes (60:00 is sixty minutes, not zero); H:MM:SS takes minutes within the hour.
  const body = hours
    ? `${Math.floor(totalSeconds / 3600)}:${pad(Math.floor((totalSeconds % 3600) / 60))}:${pad(s)}`
    : `${pad(Math.floor(totalSeconds / 60))}:${pad(s)}`
  return negative ? MINUS + body : body
}

export function display(s: TimerState, now: number): Display | null {
  const r = remainingMs(s, now)
  if (r === null || s.status === 'idle') return null
  if (s.countUp) {
    // Floor, like a stopwatch: 00:00 for the first second, the length itself at the end.
    const secs = Math.floor(elapsedMs(s, now)! / SECOND)
    const hours = s.hours || secs * SECOND > HOURS_FORMAT_ABOVE_MS
    return { text: formatClock(secs, false, hours), negative: false, over: r <= 0, hours, phase: phase(s, now) }
  }
  const negative = r <= 0
  const secs = shownSeconds(r)
  const hours = s.hours || secs * SECOND > HOURS_FORMAT_ABOVE_MS
  return { text: formatClock(secs, negative, hours), negative, over: negative, hours, phase: phase(s, now) }
}

/**
 * Milliseconds until the displayed value next changes, i.e. the timer's own second boundary
 * (not the wall clock's). Always in (0, 1000]. Null when nothing changes on its own.
 */
export function nextTickDelay(s: TimerState, now: number): number | null {
  if (s.status !== 'running') return null
  if (s.countUp) {
    const e = s.durationMs - (s.endAt - now)
    return SECOND - (((e % SECOND) + SECOND) % SECOND)
  }
  const r = s.endAt - now
  if (r > 0) return r - (Math.ceil(r / SECOND) - 1) * SECOND
  return SECOND - (-r % SECOND)
}
