import { describe, expect, it } from 'vitest'
import {
  HOUR, MINUTE, SECOND, MAX_ABS_MS,
  idle, select, start, pause, toggle, step, clear, remainingMs, elapsedMs, phase, type TimerState,
} from '../../shared/timer/core'

const T0 = Date.UTC(2026, 10, 14, 20, 0, 0) // Sat 14 Nov 2026, 20:00 UTC

describe('select', () => {
  it('opens a preset paused at its full duration, not running', () => {
    const s = select(60 * MINUTE)
    expect(s).toEqual({ status: 'paused', durationMs: 60 * MINUTE, remainingMs: 60 * MINUTE, hours: false })
    expect(phase(s, T0)).toBe('paused')
  })
  it('marks timers longer than 60 minutes as hours format', () => {
    expect(select(60 * MINUTE).hours).toBe(false)
    expect(select(75 * MINUTE).hours).toBe(true)
  })
  it('rejects nonsense durations', () => {
    expect(() => select(0)).toThrow()
    expect(() => select(-MINUTE)).toThrow()
    expect(() => select(Number.NaN)).toThrow()
    expect(() => select(MAX_ABS_MS + SECOND)).toThrow()
  })
})

describe('running stores an absolute end time, never a counter', () => {
  it('start sets endAt = now + remaining', () => {
    const s = start(select(15 * MINUTE), T0)
    expect(s).toMatchObject({ status: 'running', endAt: T0 + 15 * MINUTE })
    expect(remainingMs(s, T0 + 5 * MINUTE)).toBe(10 * MINUTE)
  })
  it('crosses into overtime exactly at endAt', () => {
    const s = start(select(15 * MINUTE), T0)
    expect(phase(s, T0 + 15 * MINUTE - 1)).toBe('running')
    expect(phase(s, T0 + 15 * MINUTE)).toBe('overtime')
    expect(remainingMs(s, T0 + 17 * MINUTE + 15 * SECOND)).toBe(-(2 * MINUTE + 15 * SECOND))
  })
  it('start on a running timer changes nothing', () => {
    const s = start(select(15 * MINUTE), T0)
    expect(start(s, T0 + MINUTE)).toBe(s)
  })
})

describe('pause and resume keep the remaining time', () => {
  it('keeps the exact remaining milliseconds across a 10 minute pause', () => {
    let s = start(select(60 * MINUTE), T0)
    s = pause(s, T0 + 10 * MINUTE + 300)
    expect(s).toMatchObject({ status: 'paused', remainingMs: 50 * MINUTE - 300 })
    // ten minutes pass while paused
    expect(remainingMs(s, T0 + 20 * MINUTE)).toBe(50 * MINUTE - 300)
    s = start(s, T0 + 20 * MINUTE + 300)
    expect(s).toMatchObject({ status: 'running', endAt: T0 + 20 * MINUTE + 300 + 50 * MINUTE - 300 })
    expect(remainingMs(s, T0 + 20 * MINUTE + 300)).toBe(50 * MINUTE - 300)
  })
  it('pausing in overtime keeps the overtime, resuming continues it', () => {
    let s = start(select(15 * MINUTE), T0)
    s = pause(s, T0 + 16 * MINUTE)
    expect(s).toMatchObject({ status: 'paused', remainingMs: -MINUTE })
    expect(phase(s, T0 + 30 * MINUTE)).toBe('paused')
    s = start(s, T0 + 30 * MINUTE)
    expect(phase(s, T0 + 30 * MINUTE)).toBe('overtime')
    expect(remainingMs(s, T0 + 31 * MINUTE)).toBe(-2 * MINUTE)
  })
  it('toggle alternates between running and paused', () => {
    let s = toggle(select(15 * MINUTE), T0)
    expect(s.status).toBe('running')
    s = toggle(s, T0 + MINUTE)
    expect(s).toMatchObject({ status: 'paused', remainingMs: 14 * MINUTE })
  })
  it('pause and toggle do nothing when idle', () => {
    expect(pause(idle, T0)).toBe(idle)
    expect(toggle(idle, T0)).toBe(idle)
    expect(start(idle, T0)).toBe(idle)
  })
})

describe('± steps', () => {
  it('while running, moves the end time', () => {
    let s = start(select(30 * MINUTE), T0)
    s = step(s, +5 * MINUTE, T0 + MINUTE)
    expect(remainingMs(s, T0 + MINUTE)).toBe(34 * MINUTE)
    s = step(s, -1 * MINUTE, T0 + MINUTE)
    expect(remainingMs(s, T0 + MINUTE)).toBe(33 * MINUTE)
    expect(s.status).toBe('running')
  })
  it('while paused, changes the remaining time and stays paused', () => {
    let s: TimerState = select(30 * MINUTE)
    s = step(s, +10 * MINUTE, T0)
    expect(s).toMatchObject({ status: 'paused', remainingMs: 40 * MINUTE })
    s = step(s, -15 * MINUTE, T0 + HOUR)
    expect(s).toMatchObject({ status: 'paused', remainingMs: 25 * MINUTE })
  })
  it('keeps the sub-second phase so the tick boundary does not shift', () => {
    let s = start(select(30 * MINUTE), T0)
    s = step(s, MINUTE, T0 + 1234)
    expect(remainingMs(s, T0 + 1234)).toBe(31 * MINUTE - 1234)
  })
  it('is a no-op when idle', () => {
    expect(step(idle, MINUTE, T0)).toBe(idle)
  })
  it('clamps to the largest value the H:MM:SS display can show', () => {
    const s = step(select(3 * HOUR), 10 * HOUR, T0)
    expect(s).toMatchObject({ remainingMs: MAX_ABS_MS })
    const r = step(start(select(15 * MINUTE), T0), -20 * HOUR, T0)
    expect(remainingMs(r, T0)).toBe(-MAX_ABS_MS)
  })
})

describe('stepping across zero', () => {
  it('running: −1 from 00:30 goes to 30 s overtime, +1 brings it back', () => {
    let s = start(select(15 * MINUTE), T0)
    const now = T0 + 14 * MINUTE + 30 * SECOND // 00:30 left
    s = step(s, -MINUTE, now)
    expect(phase(s, now)).toBe('overtime')
    expect(remainingMs(s, now)).toBe(-30 * SECOND)
    s = step(s, +MINUTE, now)
    expect(phase(s, now)).toBe('running')
    expect(remainingMs(s, now)).toBe(30 * SECOND)
  })
  it('overtime: +5 from −02:00 resumes the countdown at 03:00', () => {
    let s = start(select(15 * MINUTE), T0)
    const now = T0 + 17 * MINUTE
    expect(phase(s, now)).toBe('overtime')
    s = step(s, 5 * MINUTE, now)
    expect(phase(s, now)).toBe('running')
    expect(remainingMs(s, now)).toBe(3 * MINUTE)
  })
  it('paused: steps cross zero in both directions and stay paused', () => {
    let s = step(select(15 * MINUTE), -14 * MINUTE - 40 * SECOND, T0) // 00:20 left
    s = step(s, -MINUTE, T0)
    expect(s).toMatchObject({ status: 'paused', remainingMs: -40 * SECOND })
    s = step(s, 5 * MINUTE, T0)
    expect(s).toMatchObject({ status: 'paused', remainingMs: 4 * MINUTE + 20 * SECOND })
  })
})

describe('hours format is sticky (keep hours format, default ON)', () => {
  it('a 60:00 timer stepped to 61:00 switches to hours and stays there', () => {
    let s = step(select(60 * MINUTE), MINUTE, T0)
    expect(s.status === 'paused' && s.hours).toBe(true)
    s = step(s, -10 * MINUTE, T0)
    expect(s.status === 'paused' && s.hours).toBe(true)
  })
  it('clear returns to idle', () => {
    expect(clear()).toEqual(idle)
  })
})

describe('count-up: the same timer, read as time elapsed', () => {
  it('opens paused at 00:00 of its length; a countdown carries no countUp field at all', () => {
    expect(select(45 * MINUTE, true)).toEqual({ status: 'paused', durationMs: 45 * MINUTE, remainingMs: 45 * MINUTE, hours: false, countUp: true })
    expect(elapsedMs(select(45 * MINUTE, true), T0)).toBe(0)
    expect('countUp' in select(45 * MINUTE)).toBe(false)
    expect('countUp' in start(select(45 * MINUTE), T0)).toBe(false)
  })
  it('start, pause and resume keep the direction and the elapsed time', () => {
    let s = start(select(45 * MINUTE, true), T0)
    expect(s).toMatchObject({ status: 'running', endAt: T0 + 45 * MINUTE, countUp: true })
    expect(elapsedMs(s, T0 + 12 * MINUTE + 300)).toBe(12 * MINUTE + 300)
    s = pause(s, T0 + 12 * MINUTE + 300)
    expect(s).toMatchObject({ status: 'paused', countUp: true })
    expect(elapsedMs(s, T0 + HOUR)).toBe(12 * MINUTE + 300)
    s = toggle(s, T0 + HOUR)
    expect(s).toMatchObject({ status: 'running', countUp: true })
    expect(elapsedMs(s, T0 + HOUR + MINUTE)).toBe(13 * MINUTE + 300)
  })
  it('the end comes at the length, and the count goes on past it', () => {
    const s = start(select(45 * MINUTE, true), T0)
    expect(phase(s, T0 + 45 * MINUTE - 1)).toBe('running')
    expect(phase(s, T0 + 45 * MINUTE)).toBe('overtime')
    expect(elapsedMs(s, T0 + 46 * MINUTE)).toBe(46 * MINUTE)
  })
  it('± moves the time shown and leaves the end at the length, running and paused', () => {
    let s = start(select(45 * MINUTE, true), T0)
    const now = T0 + 12 * MINUTE + 30 * SECOND
    s = step(s, MINUTE, now)
    expect(elapsedMs(s, now)).toBe(13 * MINUTE + 30 * SECOND)
    expect(s.status !== 'idle' && s.durationMs).toBe(45 * MINUTE)
    s = step(pause(s, now), -2 * MINUTE, now)
    expect(s).toMatchObject({ status: 'paused', durationMs: 45 * MINUTE, countUp: true })
    expect(elapsedMs(s, now)).toBe(11 * MINUTE + 30 * SECOND)
  })
  it('never below 00:00: −1 at 00:30 stops at 00:00', () => {
    const s = step(start(select(45 * MINUTE, true), T0), -MINUTE, T0 + 30 * SECOND)
    expect(elapsedMs(s, T0 + 30 * SECOND)).toBe(0)
    expect(elapsedMs(s, T0 + 31 * SECOND)).toBe(SECOND)
  })
  it('± across the end in both directions', () => {
    let s = start(select(15 * MINUTE, true), T0)
    const now = T0 + 14 * MINUTE + 30 * SECOND
    s = step(s, MINUTE, now)
    expect(phase(s, now)).toBe('overtime')
    expect(elapsedMs(s, now)).toBe(15 * MINUTE + 30 * SECOND)
    s = step(s, -MINUTE, now)
    expect(phase(s, now)).toBe('running')
  })
  it('the hours format follows the length, and turns on (and stays) past 60:00 elapsed', () => {
    expect(select(90 * MINUTE, true).hours).toBe(true)
    let s = step(select(45 * MINUTE, true), 61 * MINUTE, T0)
    expect(s.status === 'paused' && s.hours).toBe(true)
    s = step(s, -30 * MINUTE, T0)
    expect(s.status === 'paused' && s.hours).toBe(true)
  })
  it('elapsed is null when idle', () => {
    expect(elapsedMs(idle, T0)).toBeNull()
  })
})
