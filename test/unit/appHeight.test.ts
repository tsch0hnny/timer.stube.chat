import { describe, expect, it } from 'vitest'
import { appHeight } from '../../app/utils/appHeight'

const iPhone13Pro = { screenW: 390, screenH: 844 }

describe('appHeight (iOS home-screen app)', () => {
  it('fills the screen when the viewport stops 47 px short (iOS 27, e625305 install)', () => {
    expect(appHeight({ ...iPhone13Pro, innerW: 390, innerH: 797, lvh: 844 })).toBe(844)
  })
  it('keeps the full viewport when iOS already reports it (the spike install)', () => {
    expect(appHeight({ ...iPhone13Pro, innerW: 390, innerH: 844, lvh: 844 })).toBe(844)
  })
  it('never exceeds the screen, whatever lvh says', () => {
    expect(appHeight({ ...iPhone13Pro, innerW: 390, innerH: 797, lvh: 891 })).toBe(844)
  })
  it('never shrinks below the viewport when lvh is short too', () => {
    expect(appHeight({ ...iPhone13Pro, innerW: 390, innerH: 797, lvh: 797 })).toBe(797)
    expect(appHeight({ ...iPhone13Pro, innerW: 390, innerH: 797, lvh: 0 })).toBe(797)
  })
  it('uses the short side of the screen in a landscape viewport (rotation lock off)', () => {
    expect(appHeight({ ...iPhone13Pro, innerW: 844, innerH: 390, lvh: 390 })).toBe(390)
    expect(appHeight({ ...iPhone13Pro, innerW: 844, innerH: 343, lvh: 844 })).toBe(390)
  })
})
