/**
 * Phase 1 switches. If something is broken on the iPhone on Friday evening, cut in this order,
 * first to go first. Never cut: correct time, digits that don't jump, the screen staying on,
 * surviving reload and lock.
 */
export const FEATURES = {
  /** 1st to cut: swipe to delete, automatic adding, restore → the 12 default presets, fixed. */
  editablePresets: true,
  /** 2nd to cut: the countdown wheel (any length) → the 12 presets only. */
  wheel: true,
  /** 3rd to cut: hold-to-pick step strip → fixed ±1 and ±5 buttons. */
  stepPicker: true,
  /** 4th to cut: the shake at zero (the red and the minus sign stay). */
  shake: true,
  /**
   * Not in the cut order: the band rehearses with a clock that counts up. Off hides the "Count up"
   * switch and every timer counts down, exactly as c18efb0 did.
   */
  countUp: true,
} as const

/** Which way the landscape timer is rotated inside a portrait viewport. Set from the device spike. */
export const LANDSCAPE_ROTATION: 'cw' | 'ccw' = 'cw'

/** Reserve the minus sign's width from the start, so the digit size never changes at zero. */
export const RESERVE_MINUS_CELL = true

/**
 * The glyph drawn for the minus sign in overtime. The text itself always carries U+2212; only the
 * drawing changes. With the 'case' feature every candidate sits on the digits' centre (measured in
 * WebKit and Chromium with SF Pro): minus U+2212 0.647 em wide, en dash 0.576 em, hyphen 0.441 em.
 * The owner chose the hyphen (12 Nov): the shortest bar, and the narrower reserved cell lets the
 * digits grow about 4%.
 */
export const MINUS_GLYPH: string = '-'

/**
 * Fonts the timer can use; phase 1 ships one. The digit-stability test runs for each.
 * No quoted family names: system-ui resolves first on every target browser (it is Segoe UI on
 * Windows anyway), and Chromium writes quotes in the inline style as &quot;, which the design
 * detector misreads as a font called "&quot".
 */
export const TIMER_FONTS = [{ id: 'system', family: 'system-ui, -apple-system, Roboto, sans-serif', weight: 700 }] as const
