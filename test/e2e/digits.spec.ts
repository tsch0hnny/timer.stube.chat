import { expect, test, type Page } from '@playwright/test'
import { longPress, openPreset } from './helpers'

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

/** Records every animation the app starts on the digit line (keyframes only). */
async function recordDigitAnimations(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __anims: Keyframe[][] }
    w.__anims = []
    const orig = Element.prototype.animate
    Element.prototype.animate = function (this: Element, kf: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
      if (this.matches('[data-testid="digits"]')) w.__anims.push(kf as Keyframe[])
      return orig.call(this, kf, opts)
    }
  })
}
/**
 * x of the seconds' units cell in layout coordinates of the fixed digit box (unrotated, transforms
 * ignored). The digits element shrinks to its content and is centred by that box, so both offsets count.
 */
const unitsX = (page: Page) =>
  page.evaluate(() => {
    const d = document.querySelector<HTMLElement>('[data-testid="digits"]')!
    const c = d.querySelectorAll<HTMLElement>('[data-testid="cell"]')
    return d.offsetLeft + c[c.length - 1]!.offsetLeft
  })
const anims = (page: Page) => page.evaluate(() => (window as unknown as { __anims: Keyframe[][] }).__anims)
const startShift = (kf: Keyframe[]) => Number(/translateX\((-?[\d.]+)px\)/.exec(String(kf[0]!.transform))![1])

test('crossing zero never jumps: the line starts where the digits were and glides to the new centre', async ({ page }) => {
  await recordDigitAnimations(page)
  await openPreset(page, 15)
  await page.getByTestId('play').click()
  await page.clock.runFor(15 * 60_000 - 1000) // 00:01 left
  const before = await unitsX(page)
  await page.clock.runFor(1000) // −00:00: the minus appears
  const after = await unitsX(page)
  const into = (await anims(page)).at(-1)!
  expect(Math.abs(after - before)).toBeGreaterThan(10) // the line did re-centre…
  expect(Math.abs(after + startShift(into) - before)).toBeLessThanOrEqual(1.5) // …but started where the digits were (offsets are whole px)

  // Stepping back out of overtime glides the other way.
  await longPress(page)
  await page.getByTestId('step-plus').click()
  const back = await unitsX(page)
  const out = (await anims(page)).at(-1)!
  expect(Math.abs(back + startShift(out) - after)).toBeLessThanOrEqual(1.5)
})

test('with reduced motion the re-centre is a fade, not a slide', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await recordDigitAnimations(page)
  await openPreset(page, 15)
  await page.getByTestId('play').click()
  await page.clock.runFor(15 * 60_000)
  const kf = (await anims(page)).at(-1)!
  expect(kf.map((k) => k.opacity)).toEqual([0, 1])
  expect(kf.some((k) => k.transform)).toBe(false)
})
