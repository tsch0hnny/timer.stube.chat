import { expect, test, type Page } from '@playwright/test'
import { MIN, expectTime, inkMids, longPress, openPreset, turnToLandscape } from './helpers'

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
    const w = window as unknown as { __anims: Keyframe[][]; __minus: Keyframe[][] }
    w.__anims = []
    w.__minus = []
    const orig = Element.prototype.animate
    Element.prototype.animate = function (this: Element, kf: Keyframe[] | PropertyIndexedKeyframes | null, opts?: number | KeyframeAnimationOptions) {
      if (this.matches('[data-testid="digits"]')) w.__anims.push(kf as Keyframe[])
      if (this.matches('[data-testid="cell"].minus')) w.__minus.push(kf as Keyframe[])
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
  // The minus starts half a cell out, at the notch edge: it fades in while it slides into place.
  const minus = await page.evaluate(() => (window as unknown as { __minus: Keyframe[][] }).__minus)
  expect(minus.at(-1)!.map((k) => k.opacity)).toEqual([0, 1])

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

/**
 * Every cell of the line lies inside the viewport. getBoundingClientRect includes transforms, so
 * this holds for the CSS-rotated stage too. Waits for the glide and the shake to finish first.
 */
async function expectLineOnScreen(page: Page) {
  await expect.poll(() => page.evaluate(() => document.querySelector('[data-testid="digits"]')!
    .getAnimations({ subtree: true }).filter((a) => a.playState === 'running').map((a) => a.constructor.name))).toEqual([])
  const outside = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="cell"]')]
      .map((c) => ({ ch: c.textContent, b: c.getBoundingClientRect() }))
      .filter(({ b }) => b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight)
      .map(({ ch, b }) => `${ch} ${Math.round(b.left)},${Math.round(b.top)}–${Math.round(b.right)},${Math.round(b.bottom)}`))
  expect(outside, `cells outside ${await page.evaluate(() => `${innerWidth}×${innerHeight}`)}`).toEqual([])
}

// Digits are tabular and the hour has one digit (the clamp is 9:59:59), so overtime is the widest
// line each format can show: −MM:SS and −H:MM:SS.
for (const [minutes, label, over] of [[15, '15:00 left', '00:05 over'], [75, '1:15:00 left', '0:00:05 over']] as const) {
  test(`the line stays on screen: ${label.split(' ')[0]} and overtime, rotated and in a landscape viewport`, async ({ page }) => {
    await openPreset(page, minutes)
    await expectTime(page, label)
    await expectLineOnScreen(page)
    await page.getByTestId('play').click()
    await page.clock.runFor(minutes * MIN + 5000)
    await expectTime(page, over)
    await expectLineOnScreen(page)
    await turnToLandscape(page)
    await expectLineOnScreen(page)
  })
}

test('the digits sit on the centre of the short axis, paused and running, clear of the controls', async ({ page }) => {
  await openPreset(page, 45)
  const measure = () => page.evaluate(() => {
    const safe = document.querySelector<HTMLElement>('.safe')!
    const box = document.querySelector<HTMLElement>('.digits-box')!
    const d = document.querySelector<HTMLElement>('[data-testid="digits"]')!
    const row = document.querySelector<HTMLElement>('.row')
    const fs = parseFloat(getComputedStyle(d).fontSize)
    const centre = box.offsetTop + d.offsetTop + d.offsetHeight / 2
    // Untransformed layout coordinates, so this holds for the rotated stage too.
    return { off: Math.abs(centre - safe.clientHeight / 2), inkBottom: centre + 0.4 * fs, rowTop: row ? row.offsetTop : Infinity }
  })
  for (const turn of [false, true]) {
    if (turn) await turnToLandscape(page)
    const paused = await measure()
    expect(paused.off).toBeLessThanOrEqual(1)
    expect(paused.inkBottom).toBeLessThanOrEqual(paused.rowTop)
  }
  await page.getByTestId('play').click()
  await page.clock.runFor(6000) // controls gone
  expect((await measure()).off).toBeLessThanOrEqual(1)
})

test('the colon and the minus sit on the digits\' centre line', async ({ page }) => {
  await openPreset(page, 15)
  await turnToLandscape(page) // upright text for the pixel read
  const check = async () => {
    const cells = await inkMids(page)
    const digit = cells.find((c) => /\d/.test(c.ch ?? ''))!.mid
    for (const c of cells.filter((c) => !/\d/.test(c.ch ?? ''))) expect(Math.abs(c.mid - digit), `${c.ch} at ${c.mid.toFixed(3)} em, digits at ${digit.toFixed(3)} em`).toBeLessThanOrEqual(0.02)
    return cells.map((c) => c.ch).join('')
  }
  expect(await check()).toBe('15:00')
  await page.getByTestId('play').click()
  await page.clock.runFor(15 * MIN + 5000)
  await expect.poll(() => page.evaluate(() => document.querySelector('[data-testid="digits"]')!.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0)
  expect(await check()).toMatch(/^.00:05$/)
})
