import { expect, test, type Page } from '@playwright/test'
import { MIN, START, T0, digits, expectOnScreen, expectTime, longPress, mockWakeLock, settle, turnToLandscape } from './helpers'

/**
 * Count up (the band rehearses with a clock that counts up): the same timer read as time elapsed,
 * 00:00 → the length, red and one shake there, then on without a minus. ± moves the time shown.
 */

/** Loads the presets screen on the paused fake clock, with count up chosen in the floating capsule. */
async function openApp(page: Page, opts: { countUp?: boolean } = {}) {
  await mockWakeLock(page, 'grant')
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await expect(page.getByTestId('presets')).toBeVisible()
  await page.clock.pauseAt(START)
  if (opts.countUp ?? true) await page.getByTestId('direction-up').click()
}
async function openCountUp(page: Page, minutes: number) {
  await openApp(page)
  await page.getByTestId(`preset-${minutes}`).click()
  await expect(page.getByTestId('timer-view')).toBeVisible()
}
const lineAnims = (page: Page) => page.evaluate(() => document.querySelector('[data-testid="digits"] .line')!.getAnimations().length)
const fontSize = (page: Page) => digits(page).evaluate((el) => parseFloat(getComputedStyle(el).fontSize))

test('counting down is the default; count up is remembered, and a preset then opens at 00:00, paused', async ({ page }) => {
  await openApp(page, { countUp: false })
  await expect(page.getByTestId('direction-down')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('direction-up').click()
  await page.reload()
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('direction-down')).toHaveAttribute('aria-checked', 'false')
  await page.getByTestId('preset-15').click()
  await expectTime(page, '00:00 elapsed')
  await expect(page.getByTestId('play')).toHaveText('Start')
  await page.clock.runFor(5000)
  await expectTime(page, '00:00 elapsed') // paused
  await expect(page.getByTestId('reset')).toBeDisabled()
  await expect(page.getByTestId('reset')).toHaveAttribute('aria-label', 'Reset to zero')
})

test('counts up to the length, turns red and shakes once there, and goes on without a minus', async ({ page }) => {
  await openCountUp(page, 15)
  await page.getByTestId('play').click()
  await page.clock.runFor(1000)
  await expectTime(page, '00:01 elapsed')
  await page.clock.runFor(15 * MIN - 2000)
  await expectTime(page, '14:59 elapsed')
  await expect(digits(page)).not.toHaveClass(/over/)
  expect(await lineAnims(page)).toBe(0)
  await page.clock.runFor(1000)
  await expectTime(page, '15:00 elapsed') // the end: the length itself
  await expect(digits(page)).toHaveClass(/over/)
  await expect(digits(page)).not.toHaveClass(/negative/)
  await expect(digits(page)).toHaveCSS('color', 'rgb(255, 69, 58)')
  expect(await lineAnims(page)).toBe(1) // the shake, once
  await page.clock.runFor(2 * MIN + 15_000)
  await expectTime(page, '17:15 elapsed')
  expect(await page.getByTestId('cell').allTextContents()).toEqual(['1', '7', ':', '1', '5'])
})

test('± moves the time shown, never below 00:00, and across the end both ways', async ({ page }) => {
  await openCountUp(page, 15)
  await page.getByTestId('step-plus').click()
  await expectTime(page, '01:00 elapsed')
  await expect(page.getByTestId('reset')).toBeEnabled()
  await page.getByTestId('step-minus').click()
  await page.getByTestId('step-minus').click()
  await expectTime(page, '00:00 elapsed')
  await page.getByTestId('play').click()
  await page.clock.runFor(13 * MIN + 30_000)
  await expectTime(page, '13:30 elapsed')
  await longPress(page)
  await page.getByTestId('step-plus').click()
  await page.getByTestId('step-plus').click()
  await expectTime(page, '15:30 elapsed')
  await expect(digits(page)).toHaveClass(/over/)
  await page.getByTestId('step-minus').click()
  await expectTime(page, '14:30 elapsed')
  await expect(digits(page)).not.toHaveClass(/over/)
  await page.clock.runFor(30_000)
  await expectTime(page, '15:00 elapsed') // the end has not moved
  await expect(digits(page)).toHaveClass(/over/)
})

test('a reload mid-set comes back counting up at the right time, also past the end', async ({ page }) => {
  await openCountUp(page, 15)
  await page.getByTestId('play').click()
  await page.clock.runFor(5 * MIN)
  await expectTime(page, '05:00 elapsed')
  await page.reload()
  await expect(page.getByTestId('timer-view')).toBeVisible()
  await expectTime(page, '05:00 elapsed')
  await page.clock.runFor(11 * MIN)
  await expectTime(page, '16:00 elapsed')
  await page.reload()
  await expectTime(page, '16:00 elapsed')
  await expect(digits(page)).toHaveClass(/over/)
  expect(await lineAnims(page)).toBe(0) // no shake replayed by the reload
})

test('reset goes back to 00:00, paused, also from past the end', async ({ page }) => {
  await openCountUp(page, 15)
  await page.getByTestId('play').click()
  await page.clock.runFor(15 * MIN + 20_000)
  await expectTime(page, '15:20 elapsed')
  await longPress(page)
  await page.getByTestId('reset').click()
  await page.getByTestId('reset-confirm-reset').click()
  await expectTime(page, '00:00 elapsed')
  await expect(digits(page)).not.toHaveClass(/over/)
  await settle(page) // the Pause → Start cross-fade
  await expect(page.getByTestId('play')).toHaveText('Start')
  await page.clock.runFor(5000)
  await expectTime(page, '00:00 elapsed')
})

test('with "Start right away" the tap starts counting up from 00:00', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('start-on-tap').check()
  await page.getByTestId('preset-15').click()
  await expect(page.getByTestId('pause')).toBeAttached()
  await page.clock.runFor(2000)
  await expectTime(page, '00:02 elapsed')
})

test('switched off again, the next timer counts down as before', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('direction-down').click()
  await page.getByTestId('preset-15').click()
  await expectTime(page, '15:00 left')
})

test('count-up digits are bigger than the countdown\'s (no minus to make room for) and keep their size at the end', async ({ page }) => {
  await openApp(page, { countUp: false })
  await page.getByTestId('preset-15').click()
  const down = await fontSize(page)
  await page.getByTestId('exit').click()
  await page.getByTestId('direction-up').click()
  await page.getByTestId('preset-15').click()
  const up = await fontSize(page)
  expect(up / down).toBeGreaterThan(1.05)
  await expectOnScreen(page, 'digits')
  await page.getByTestId('play').click()
  await page.clock.runFor(15 * MIN + 5000)
  await expectTime(page, '15:05 elapsed')
  expect(await fontSize(page)).toBe(up)
  await expectOnScreen(page, 'digits')
  await turnToLandscape(page)
  await expectOnScreen(page, 'digits')
})

test('the digits stay clear of the controls when they are shown, rotated and in a landscape viewport', async ({ page }) => {
  await openCountUp(page, 45)
  const gap = () => page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('.digits-box')!
    const d = document.querySelector<HTMLElement>('[data-testid="digits"]')!
    const row = document.querySelector<HTMLElement>('.row')!
    const fs = parseFloat(getComputedStyle(d).fontSize)
    // Untransformed layout coordinates, so this holds for the rotated stage too.
    return row.offsetTop - (box.offsetTop + d.offsetTop + d.offsetHeight / 2 + 0.4 * fs)
  })
  expect(await gap()).toBeGreaterThanOrEqual(0)
  await turnToLandscape(page)
  expect(await gap()).toBeGreaterThanOrEqual(0)
})

test('the capsule floats above the list, which scrolls clear of it to the very end', async ({ page }) => {
  await openApp(page, { countUp: false })
  const capsule = (await page.getByTestId('direction').boundingBox())!
  await page.getByTestId('presets').evaluate((el) => { el.scrollTop = el.scrollHeight })
  for (const id of ['restore-presets', 'version']) {
    if (!(await page.getByTestId(id).count())) continue
    const b = (await page.getByTestId(id).boundingBox())!
    expect(b.y + b.height <= capsule.y || b.x >= capsule.x + capsule.width, `${id} ${JSON.stringify(b)} vs ${JSON.stringify(capsule)}`).toBe(true)
  }
  const last = (await page.getByTestId('preset-180').boundingBox())!
  expect(last.y + last.height).toBeLessThanOrEqual(capsule.y)
})

test('in a landscape viewport the switch and both halves of the capsule can be reached and tapped', async ({ page }) => {
  await openApp(page, { countUp: false })
  const v = page.viewportSize()!
  await page.setViewportSize({ width: Math.max(v.width, v.height), height: Math.min(v.width, v.height) })
  await page.getByTestId('start-on-tap').click() // Playwright refuses if anything covers it
  await expect(page.getByTestId('start-on-tap')).toBeChecked()
  await page.getByTestId('direction-up').click()
  await expect(page.getByTestId('direction-up')).toHaveAttribute('aria-checked', 'true')
  await page.getByTestId('wheel-set').click()
  await expectTime(page, '00:00 elapsed')
})
