import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { START, T0, mockWakeLock } from './helpers'

/** The acceptance list of docs/timer-mode-icons.md, on the real build, sampled on the fake clock. */

const svgPaths = (file: string) => [...readFileSync(resolve('app/icons', file), 'utf8').matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
const UP_SVG = svgPaths('timer-count-up.svg') // ring, hand, caret
const DOWN_SVG = svgPaths('timer-count-down.svg') // faded arc, bright arc, hand, caret
const HAND = 4.24

async function openApp(page: Page) {
  await mockWakeLock(page, 'grant')
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await expect(page.getByTestId('presets')).toBeVisible()
  await page.clock.pauseAt(START)
}
/** The icon as drawn: path data, the hand's angle (clock degrees) and length, its tip, its box. */
function icon(page: Page, kind: 'up' | 'down') {
  return page.locator(`[data-testid="direction-${kind}"] svg`).evaluate((svg) => {
    const line = svg.querySelector('line')!
    const angle = Number(/rotate\(([-\d.]+)/.exec(line.getAttribute('transform') ?? '')?.[1])
    const len = 12 - Number(line.getAttribute('y2'))
    const rad = (angle * Math.PI) / 180
    return {
      paths: [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? ''),
      opacities: [...svg.querySelectorAll('path')].map((p) => p.getAttribute('opacity')),
      handOpacity: line.getAttribute('opacity'),
      angle,
      len,
      tip: [12 + len * Math.sin(rad), 12 - len * Math.cos(rad)],
      box: (({ width, height }) => [width, height])(svg.getBoundingClientRect()),
    }
  })
}
/** Samples the icon every `step` ms of fake time for `ms`. */
async function sample(page: Page, kind: 'up' | 'down', ms: number, step = 20) {
  const out = []
  for (let t = step; t <= ms; t += step) {
    await page.clock.runFor(step)
    out.push({ t, ...(await icon(page, kind)) })
  }
  return out
}
const near = (a: number[], b: number[]) => a.every((v, i) => Math.abs(v - b[i]!) < 0.01)
const tipOf = (d: string) => (/L([\d.]+) ([\d.]+)/.exec(d)!.slice(1).map(Number))
/** The signed turn from a to b, in (−180, 180]: negative is counter-clockwise (0° and 360° are one place). */
const turn = (a: number, b: number) => { const d = (((b - a) % 360) + 540) % 360 - 180; return d === -180 ? 180 : d }
/** Where the bright arc starts: the first point of its path, as a clock angle. */
const startAngle = (d: string) => {
  const m = /^M([\d.]+) ([\d.]+)/.exec(d)
  if (!m) return null
  return ((Math.atan2(Number(m[1]) - 12, 12 - Number(m[2])) * 180) / Math.PI + 360) % 360
}

test('at rest both icons match the reference SVGs (no crown, carets bottom left, count-down at 10:00)', async ({ page }) => {
  await openApp(page)
  const up = await icon(page, 'up')
  expect(up.paths).toEqual([UP_SVG[0], UP_SVG[2]]) // ring with its own gap, up caret
  expect(near(up.tip, tipOf(UP_SVG[1]!)), `${up.tip}`).toBe(true) // hand at 1:30
  const down = await icon(page, 'down')
  expect(down.paths).toEqual([DOWN_SVG[0], DOWN_SVG[1], DOWN_SVG[3]]) // faded arc, bright arc, down caret
  expect(down.opacities[0]).toBe('0.25')
  expect(near(down.tip, tipOf(DOWN_SVG[2]!)), `${down.tip}`).toBe(true) // hand at 10:00, on the bright arc's end
})

test('count up: one smooth clockwise lap in about 0.9 s, ending exactly at rest', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('direction-up').click()
  const s = await sample(page, 'up', 1000)
  const lap = s.filter((x) => x.t < 900)
  for (let i = 1; i < lap.length; i++) expect(lap[i]!.angle, `t=${lap[i]!.t}`).toBeGreaterThanOrEqual(lap[i - 1]!.angle)
  expect(Math.abs(s.find((x) => x.t === 460)!.angle - 225)).toBeLessThan(12) // ease-in-out: halfway at half time
  expect(Math.max(...lap.map((x) => x.angle))).toBeGreaterThan(395)
  expect(s.at(-1)!.angle).toBe(45)
  expect(s.every((x) => Math.abs(x.len - HAND) < 0.01)).toBe(true) // nothing else moves
})

test('count down: drain to 12, hold, refill counter-clockwise from 10:00, the hand kicked back just before the bar arrives', async ({ page }) => {
  await openApp(page)
  const rest = await icon(page, 'down')
  await page.getByTestId('direction-down').click() // already selected: replays
  const s = await sample(page, 'down', 1800)
  // Nothing ever turns clockwise; the hand never shrinks or fades.
  const all = [{ t: 0, ...rest }, ...s]
  for (let i = 1; i < all.length; i++) expect(turn(all[i - 1]!.angle, all[i]!.angle), `t=${all[i]!.t}`).toBeLessThanOrEqual(0)
  expect(s.every((x) => Math.abs(x.len - HAND) < 0.01 && x.handOpacity === null)).toBe(true)
  // 1. Drain (1080 ms): the hand rides the bright arc's end down to 12.
  expect(Math.abs(s.find((x) => x.t === 540)!.angle - 150)).toBeLessThan(10)
  // 2. Hold (100 ms): ring fully faded, hand at 12.
  const hold = s.find((x) => x.t === 1120)!
  expect(hold.angle % 360).toBe(0)
  expect(hold.paths[1]).toBe('')
  // 3. Refill (520 ms): the bright arc keeps its 10:00 end and grows counter-clockwise towards 12.
  const refill = s.filter((x) => x.t > 1200 && x.t < 1680 && x.paths[1])
  for (const x of refill) expect(x.paths[1]!.endsWith('5.07 8'), `t=${x.t} ${x.paths[1]}`).toBe(true) // ends at 10:00
  const starts = refill.map((x) => startAngle(x.paths[1]!)!)
  for (let i = 1; i < starts.length; i++) expect(starts[i]!, `t=${refill[i]!.t}`).toBeLessThanOrEqual(starts[i - 1]! + 0.5)
  // 3a. The kick: the hand waits at 12 until the bar is 80 % back (about 356 ms in), then snaps to 10:00 by about 476 ms.
  expect(s.find((x) => x.t === 1180 + 340)!.angle % 360).toBe(0)
  expect(s.find((x) => x.t === 1180 + 500)!.angle).toBe(300)
  // About 1.7 s in all, ending exactly at rest.
  const end = s.find((x) => x.t === 1720)!
  expect(end.paths).toEqual(rest.paths)
  expect(near(end.tip, rest.tip)).toBe(true)
})

test('the mode changes the instant you tap, not after the animation', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('direction-up').click()
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'true') // no fake time has passed
  await page.getByTestId('direction-down').click()
  await expect(page.getByTestId('direction-down')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('preset-15').click()
  await expect(page.getByTestId('digits')).toHaveAttribute('aria-label', '15:00 left')
})

test('a tap during an animation does nothing to it: no restart, no jump', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('direction-up').click()
  await page.clock.runFor(300)
  const before = (await icon(page, 'up')).angle
  expect(before).toBeGreaterThan(45)
  await page.getByTestId('direction-up').click()
  expect((await icon(page, 'up')).angle).toBe(before) // not back to rest
  const s = await sample(page, 'up', 700)
  expect(Math.abs(s.find((x) => x.t === 160)!.angle - 225)).toBeLessThan(12) // still timed from the first tap
  expect(s.at(-1)!.angle).toBe(45)
  await page.getByTestId('direction-up').click() // after it ended, a tap plays again
  await page.clock.runFor(460)
  expect(Math.abs((await icon(page, 'up')).angle - 225)).toBeLessThan(12)
})

test('rapid back-and-forth: each icon finishes its own animation and the mode matches the last tap', async ({ page }) => {
  await openApp(page)
  const rest = { up: await icon(page, 'up'), down: await icon(page, 'down') }
  for (const kind of ['up', 'down', 'up', 'down', 'up'] as const) {
    await page.getByTestId(`direction-${kind}`).click()
    await expect(page.getByTestId(`direction-${kind}`)).toHaveAttribute('aria-checked', 'true')
    await page.clock.runFor(60)
  }
  expect((await icon(page, 'up')).angle).not.toBe(45) // both are moving for a moment
  expect((await icon(page, 'down')).angle).not.toBe(300)
  await page.clock.runFor(2000)
  expect((await icon(page, 'up')).angle).toBe(45)
  expect((await icon(page, 'down')).paths).toEqual(rest.down.paths)
  expect((await icon(page, 'down')).angle).toBe(300)
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'true')
})

test('reduced motion: the selection changes, nothing animates', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openApp(page)
  await page.getByTestId('direction-up').click()
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'true')
  expect((await sample(page, 'up', 500, 100)).every((x) => x.angle === 45)).toBe(true)
  const rest = await icon(page, 'down')
  await page.getByTestId('direction-down').click()
  await expect(page.getByTestId('direction-down')).toHaveAttribute('aria-checked', 'true')
  expect((await sample(page, 'down', 500, 100)).every((x) => x.angle === 300 && x.paths[1] === rest.paths[1])).toBe(true)
})

test('the icons take the button\'s colour, selected and not, and keep their box while animating', async ({ page }) => {
  await openApp(page)
  const color = (kind: string) => page.locator(`[data-testid="direction-${kind}"] svg`).evaluate((el) => getComputedStyle(el).color)
  await expect.poll(() => color('down')).toBe('rgb(255, 255, 255)') // selected
  expect(await color('up')).toBe('rgb(142, 142, 147)') // --dim
  const box = (await icon(page, 'down')).box
  await page.getByTestId('direction-down').click()
  const s = await sample(page, 'down', 1800, 100)
  expect(s.every((x) => x.box[0] === box[0] && x.box[1] === box[1])).toBe(true)
  expect(box).toEqual([24, 24])
})
