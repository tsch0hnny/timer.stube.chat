import { describe, expect, it } from 'vitest'
import { HOUR, MINUTE, SECOND, select, start, pause, step, idle } from '../../shared/timer/core'
import { display, formatClock, nextTickDelay, MINUS } from '../../shared/timer/display'

const T0 = Date.UTC(2026, 10, 14, 20, 0, 0)

describe('formatClock', () => {
  it('MM:SS for up to 60 minutes, H:MM:SS above', () => {
    expect(formatClock(15 * 60, false, false)).toBe('15:00')
    expect(formatClock(60 * 60, false, false)).toBe('60:00')
    expect(formatClock(60 * 60 + 1, false, false)).toBe('1:00:01')
    expect(formatClock(3 * 3600, false, false)).toBe('3:00:00')
    expect(formatClock(5, false, false)).toBe('00:05')
  })
  it('forced hours format keeps H:MM:SS below one hour', () => {
    expect(formatClock(59 * 60 + 59, false, true)).toBe('0:59:59')
  })
  it('overtime uses a real minus sign (U+2212), not a hyphen', () => {
    expect(MINUS).toBe('−')
    expect(formatClock(135, true, false)).toBe('−02:15')
    expect(formatClock(3601, true, false)).toBe('−1:00:01')
  })
})

describe('display', () => {
  it('idle shows nothing', () => {
    expect(display(idle, T0)).toBeNull()
  })
  it('the 12 presets render exactly as on the tiles', () => {
    const tiles = Array.from({ length: 12 }, (_, i) => display(select((i + 1) * 15 * MINUTE), T0)!.text)
    expect(tiles).toEqual(['15:00', '30:00', '45:00', '60:00', '1:15:00', '1:30:00', '1:45:00', '2:00:00', '2:15:00', '2:30:00', '2:45:00', '3:00:00'])
  })
  it('counts down with ceil: the full value shows for the first second, 00:01 for the last', () => {
    const s = start(select(MINUTE), T0)
    expect(display(s, T0)!.text).toBe('01:00')
    expect(display(s, T0 + 1)!.text).toBe('01:00')
    expect(display(s, T0 + 999)!.text).toBe('01:00')
    expect(display(s, T0 + 1000)!.text).toBe('00:59')
    expect(display(s, T0 + MINUTE - 1)!.text).toBe('00:01')
  })
  it('at zero turns negative (minus appears) and counts up', () => {
    const s = start(select(MINUTE), T0)
    expect(display(s, T0 + MINUTE)).toMatchObject({ text: '−00:00', negative: true, phase: 'overtime' })
    expect(display(s, T0 + MINUTE + 999)!.text).toBe('−00:00')
    expect(display(s, T0 + MINUTE + 1000)!.text).toBe('−00:01')
    expect(display(s, T0 + MINUTE + 2 * MINUTE + 15 * SECOND)!.text).toBe('−02:15')
  })
  it('a 1:30:00 timer keeps H:MM:SS below one hour and into overtime', () => {
    const s = start(select(90 * MINUTE), T0)
    expect(display(s, T0 + 31 * MINUTE)!.text).toBe('0:59:00')
    expect(display(s, T0 + 90 * MINUTE + 5 * SECOND)!.text).toBe('−0:00:05')
  })
  it('a 60:00 timer goes to hours format only when it shows more than 60:00', () => {
    const s = start(select(60 * MINUTE), T0)
    expect(display(s, T0)!.text).toBe('60:00')
    expect(display(s, T0 + 60 * MINUTE + HOUR + SECOND)!.text).toBe('−1:00:01')
  })
  it('paused shows the frozen value', () => {
    const s = pause(start(select(15 * MINUTE), T0), T0 + 61 * SECOND + 500)
    expect(display(s, T0 + HOUR)).toMatchObject({ text: '13:59', phase: 'paused', negative: false })
    // 838.5 s left (shown 13:59) minus 20 min = −361.5 s, shown −06:01: 13:59 − 20:00 = −6:01.
    const o = step(s, -20 * MINUTE, T0)
    expect(display(o, T0)).toMatchObject({ text: '−06:01', phase: 'paused', negative: true })
  })
})

describe('nextTickDelay: the tick lands on the timer’s own second boundary', () => {
  it('is null unless running', () => {
    expect(nextTickDelay(idle, T0)).toBeNull()
    expect(nextTickDelay(select(MINUTE), T0)).toBeNull()
  })
  it('a whole second after start, then whatever is left of the current second', () => {
    const s = start(select(MINUTE), T0)
    expect(nextTickDelay(s, T0)).toBe(1000)
    expect(nextTickDelay(s, T0 + 1)).toBe(999)
    expect(nextTickDelay(s, T0 + 400)).toBe(600)
  })
  it('resuming mid-second keeps the boundary', () => {
    const s = start(pause(start(select(MINUTE), T0), T0 + 2300), T0 + 9000) // 57.7 s left
    expect(nextTickDelay(s, T0 + 9000)).toBe(700)
  })
  it('crossing zero and in overtime', () => {
    const s = start(select(MINUTE), T0)
    expect(nextTickDelay(s, T0 + MINUTE - 1)).toBe(1)
    expect(nextTickDelay(s, T0 + MINUTE)).toBe(1000)
    expect(nextTickDelay(s, T0 + MINUTE + 250)).toBe(750)
  })
  it('every delay lands where the displayed text changes, never before', () => {
    const s = start(select(3 * MINUTE), T0)
    let now = T0 + 137 // started a bit late
    let prev = display(s, now)!.text
    for (let i = 0; i < 400; i++) {
      const d = nextTickDelay(s, now)!
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThanOrEqual(1000)
      expect(display(s, now + d - 1)!.text).toBe(prev) // one ms earlier: still the old value
      now += d
      const next = display(s, now)!.text
      expect(next).not.toBe(prev) // at the boundary: changed
      prev = next
    }
  })
})

describe('count-up display', () => {
  it('counts up with floor: 00:00 for the first second, the length itself at the end, no minus', () => {
    const s = start(select(MINUTE, true), T0)
    expect(display(s, T0)).toMatchObject({ text: '00:00', negative: false, over: false, phase: 'running' })
    expect(display(s, T0 + 999)!.text).toBe('00:00')
    expect(display(s, T0 + 1000)!.text).toBe('00:01')
    expect(display(s, T0 + MINUTE - 1)).toMatchObject({ text: '00:59', over: false })
    expect(display(s, T0 + MINUTE)).toMatchObject({ text: '01:00', negative: false, over: true, phase: 'overtime' })
    expect(display(s, T0 + MINUTE + 2 * MINUTE + 15 * SECOND)).toMatchObject({ text: '03:15', negative: false, over: true })
  })
  it('changes digits at the same moments as the countdown of the same length', () => {
    const up = start(select(3 * MINUTE, true), T0)
    const down = start(select(3 * MINUTE), T0)
    for (let t = T0; t < T0 + 4 * MINUTE; t += 250) {
      const [u, d] = [display(up, t)!.text, display(down, t)!.text]
      const secs = (x: string) => x.replace('−', '').split(':').reduce((a, b) => a * 60 + Number(b), 0)
      if (t < T0 + 3 * MINUTE) expect(secs(u) + secs(d), `${u} + ${d}`).toBe(180) // they always add up to the length
      expect(nextTickDelay(up, t)).toBe(nextTickDelay(down, t))
    }
  })
  it('the countdown reports over exactly when it is negative', () => {
    const s = start(select(MINUTE), T0)
    expect(display(s, T0 + MINUTE - 1)).toMatchObject({ negative: false, over: false })
    expect(display(s, T0 + MINUTE)).toMatchObject({ negative: true, over: true })
  })
  it('a 1:30:00 length counts up in H:MM:SS from 0:00:00', () => {
    const s = start(select(90 * MINUTE, true), T0)
    expect(display(s, T0)!.text).toBe('0:00:00')
    expect(display(s, T0 + 75 * MINUTE)!.text).toBe('1:15:00')
    expect(display(s, T0 + 91 * MINUTE)).toMatchObject({ text: '1:31:00', over: true })
  })
  it('a 45:00 length runs on past 60:00 in H:MM:SS', () => {
    const s = start(select(45 * MINUTE, true), T0)
    expect(display(s, T0 + 60 * MINUTE)!.text).toBe('60:00')
    expect(display(s, T0 + 60 * MINUTE + SECOND)!.text).toBe('1:00:01')
  })
  it('every delay lands where the displayed text changes, never before', () => {
    const s = start(select(2 * MINUTE, true), T0)
    let now = T0 + 137
    let prev = display(s, now)!.text
    for (let i = 0; i < 300; i++) {
      const d = nextTickDelay(s, now)!
      expect(d).toBeGreaterThan(0)
      expect(d).toBeLessThanOrEqual(1000)
      expect(display(s, now + d - 1)!.text).toBe(prev)
      now += d
      const next = display(s, now)!.text
      expect(next).not.toBe(prev)
      prev = next
    }
  })
})
