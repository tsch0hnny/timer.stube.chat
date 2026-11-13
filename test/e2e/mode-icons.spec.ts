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
/** The icon as drawn: its path data, the hand's angle (clock degrees) and length, and its tip. */
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

test('at rest both icons match the reference SVGs, carets bottom left, count-down resting at 10:00', async ({ page }) => {
  await openApp(page)
  const up = await icon(page, 'up')
  expect(up.paths).toEqual([UP_SVG[0], UP_SVG[2]]) // ring with its own gap, up caret
  expect(near(up.tip, tipOf(UP_SVG[1]!)), `${up.tip}`).toBe(true) // hand at 1:30
  const down = await icon(page, 'down')
  expect(down.paths).toEqual([DOWN_SVG[0], DOWN_SVG[1], DOWN_SVG[3]]) // faded arc, bright arc, down caret
  expect(down.opacities[0]).toBe('0.25')
  expect(near(down.tip, tipOf(DOWN_SVG[2]!)), `${down.tip}`).toBe(true) // hand at 10:00, on the bright arc's end
})

test('count up: one smooth clockwise lap in 0.9 s, ending exactly at rest', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('direction-up').click()
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'true')
  const s = await sample(page, 'up', 1000)
  const lap = s.filter((x) => x.t < 900)
  for (let i = 1; i < lap.length; i++) expect(lap[i]!.angle, `t=${lap[i]!.t}`).toBeGreaterThanOrEqual(lap[i - 1]!.angle)
  expect(Math.abs(s.find((x) => x.t === 460)!.angle - 225)).toBeLessThan(12) // ease-in-out: halfway at half time
  expect(Math.max(...lap.map((x) => x.angle))).toBeGreaterThan(395)
  expect(s.at(-1)!.angle).toBe(45)
  expect(s.every((x) => Math.abs(x.len - HAND) < 0.01)).toBe(true) // nothing else moves
})

test('count down: drains counter-clockwise to 12, retracts to a dot, refills, regrows at 10:00', async ({ page }) => {
  await openApp(page)
  const rest = await icon(page, 'down')
  await page.getByTestId('direction-up').click()
  await page.getByTestId('direction-down').click()
  await expect(page.getByTestId('direction-down')).toHaveAttribute('aria-checked', 'true')
  const s = await sample(page, 'down', 2000)
  const drain = s.filter((x) => x.t <= 1060)
  for (let i = 1; i < drain.length; i++) expect(drain[i]!.angle, `t=${drain[i]!.t}`).toBeLessThanOrEqual(drain[i - 1]!.angle) // never clockwise
  expect(drain.every((x) => Math.abs(x.len - HAND) < 0.01)).toBe(true) // the hand rides the arc's end
  const atTwelve = s.find((x) => x.t === 1100)!
  expect(atTwelve.angle).toBe(0)
  expect(atTwelve.paths[1]).toBe('') // no bright arc left: the ring is fully faded
  const shrink = s.filter((x) => x.t > 1100 && x.t <= 1300)
  for (let i = 1; i < shrink.length; i++) expect(shrink[i]!.len).toBeLessThanOrEqual(shrink[i - 1]!.len)
  expect(Math.min(...s.map((x) => x.len))).toBeCloseTo(0.01, 4) // a dot (the module's 0.01 minimum), never gone
  expect(s.every((x) => x.handOpacity === null)).toBe(true) // the hand never fades
  const refill = s.filter((x) => x.t > 1400 && x.t <= 1860)
  expect(refill.every((x) => x.angle === 300)).toBe(true) // waits at 10:00 while it regrows
  for (let i = 1; i < refill.length; i++) expect(refill[i]!.len).toBeGreaterThanOrEqual(refill[i - 1]!.len)
  const end = s.at(-1)!
  expect(end.paths).toEqual(rest.paths)
  expect(near(end.tip, rest.tip)).toBe(true)
})

test('rapid repeated taps restart from rest; two sequences never stack', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('direction-up').click()
  await page.clock.runFor(300)
  await page.getByTestId('direction-up').click()
  expect((await icon(page, 'up')).angle).toBe(45) // back at rest at once
  const s = await sample(page, 'up', 1000)
  expect(Math.abs(s.find((x) => x.t === 460)!.angle - 225)).toBeLessThan(12) // timed from the second tap only
  expect(s.at(-1)!.angle).toBe(45)

  const rest = await icon(page, 'down')
  await page.getByTestId('direction-down').click()
  await page.clock.runFor(700)
  await page.getByTestId('direction-down').click()
  const again = await icon(page, 'down')
  expect(again.paths).toEqual(rest.paths)
  expect(again.angle).toBe(300)
  const d = await sample(page, 'down', 2000)
  expect(d.find((x) => x.t === 1100)!.angle).toBe(0) // one sequence, from the second tap
  expect(d.at(-1)!.paths).toEqual(rest.paths)
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
  const s = await sample(page, 'down', 1900, 100)
  expect(s.every((x) => x.box[0] === box[0] && x.box[1] === box[1])).toBe(true)
  expect(box).toEqual([24, 24])
})
