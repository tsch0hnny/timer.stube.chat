import { describe, expect, it } from 'vitest'
import { unpaintedStrip } from '../../app/utils/unpaintedStrip'

const iPhone13Pro = { screenW: 390, screenH: 844 }

describe('unpaintedStrip (iOS home-screen app)', () => {
  it('is the 47 px below the 797 px viewport on the iPhone 13 Pro (iOS 27, measured)', () => {
    expect(unpaintedStrip({ ...iPhone13Pro, innerW: 390, innerH: 797 })).toBe(47)
  })
  it('is 0 when the page gets the whole screen (the spike install, other phones)', () => {
    expect(unpaintedStrip({ ...iPhone13Pro, innerW: 390, innerH: 844 })).toBe(0)
  })
  it('never goes negative', () => {
    expect(unpaintedStrip({ ...iPhone13Pro, innerW: 390, innerH: 900 })).toBe(0)
  })
  it('uses the short side in a landscape viewport', () => {
    expect(unpaintedStrip({ ...iPhone13Pro, innerW: 844, innerH: 390 })).toBe(0)
    expect(unpaintedStrip({ ...iPhone13Pro, innerW: 844, innerH: 360 })).toBe(30)
  })
})
