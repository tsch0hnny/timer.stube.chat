import { HOURS_FORMAT_ABOVE_MS, SECOND, phase, remainingMs, shownSeconds, type Phase, type TimerState } from './core'

/** U+2212 MINUS SIGN: same width as a tabular digit's neighbourhood, unlike the short hyphen. */
export const MINUS = '−'

export interface Display {
  /** e.g. "15:00", "1:30:00", "−02:15" */
  text: string
  negative: boolean
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
  const negative = r <= 0
  const secs = shownSeconds(r)
  const hours = s.hours || secs * SECOND > HOURS_FORMAT_ABOVE_MS
  return { text: formatClock(secs, negative, hours), negative, hours, phase: phase(s, now) }
}

/**
 * Milliseconds until the displayed value next changes, i.e. the timer's own second boundary
 * (not the wall clock's). Always in (0, 1000]. Null when nothing changes on its own.
 */
export function nextTickDelay(s: TimerState, now: number): number | null {
  if (s.status !== 'running') return null
  const r = s.endAt - now
  if (r > 0) return r - (Math.ceil(r / SECOND) - 1) * SECOND
  return SECOND - (-r % SECOND)
}
