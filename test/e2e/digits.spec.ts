import { expect, test } from '@playwright/test'
import { openPreset } from './helpers'

type Box = { x: number; y: number; width: number; height: number }
const round = (b: Box) => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, w: Math.round(b.width * 100) / 100, h: Math.round(b.height * 100) / 100 })

// Phase 1 ships one timer font (features.ts TIMER_FONTS); this runs once per font.
for (const font of ['system']) {
  test(`digits never move (${font}): every cell box is identical for 0–9, the line does not shift between seconds`, async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('play').click()
    await page.clock.runFor(6000) // let the controls fade; nothing else on screen

    const samples: Array<{ text: string; line: ReturnType<typeof round>; cells: ReturnType<typeof round>[] }> = []
    for (let i = 0; i < 12; i++) {
      samples.push(await page.evaluate(() => {
        const r = (el: Element) => { const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height } }
        const cells = [...document.querySelectorAll('[data-testid="cell"]')]
        return { text: cells.map((c) => c.textContent).join(''), line: r(document.querySelector('[data-testid="digits"] .line')!), cells: cells.map(r) }
      }).then((s) => ({ text: s.text, line: round(s.line), cells: s.cells.map(round) })))
      await page.clock.runFor(1000)
    }

    // The seconds' units cell went through all ten digits.
    expect(new Set(samples.map((s) => s.text.at(-1))).size).toBe(10)
    // Every cell keeps exactly the same box whatever digit it shows, and the line never moves.
    for (const s of samples) {
      expect(s.cells).toEqual(samples[0]!.cells)
      expect(s.line).toEqual(samples[0]!.line)
    }
    // All digit cells share one size (colon cells are narrower by design). Compare w×h: in the
    // CSS-rotated view a cell's on-screen height is its layout width.
    const digitBoxes = new Set(samples[0]!.cells.filter((_, i) => samples[0]!.text[i] !== ':').map((c) => `${c.w}x${c.h}`))
    expect(digitBoxes.size).toBe(1)
  })
}
