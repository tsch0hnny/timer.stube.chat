import { expect, test, type Page } from '@playwright/test'
import { START, T0, expectTime, mockWakeLock } from './helpers'

/** Loads the presets screen on the paused fake clock. */
async function openApp(page: Page) {
  await mockWakeLock(page, 'grant')
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await expect(page.getByTestId('presets')).toBeVisible()
  await page.clock.pauseAt(START)
}
/** Rolls one wheel column to n, as a finger would leave it, and lets it settle. */
async function roll(page: Page, column: 'hours' | 'minutes' | 'seconds', n: number) {
  await page.getByTestId(`wheel-${column}`).evaluate((el, v) => { el.scrollTop = v * 34 }, n)
  await expect.poll(async () => {
    await page.clock.runFor(200) // the column reads its value 120 ms after the last scroll event
    return page.getByTestId(`wheel-${column}`).getAttribute('aria-valuenow')
  }).toBe(String(n))
}

test('the wheel sets any length: 1:07:30 opens the timer paused at 1:07:30', async ({ page }) => {
  await openApp(page)
  await expect(page.getByTestId('wheel-minutes')).toHaveAttribute('aria-valuenow', '15') // starts at 15 min
  await roll(page, 'hours', 1)
  await roll(page, 'minutes', 7)
  await roll(page, 'seconds', 30)
  await expect(page.getByTestId('wheel-set')).toHaveText('Set')
  await page.getByTestId('wheel-set').click()
  await expect(page.getByTestId('timer-view')).toBeVisible()
  await expectTime(page, '1:07:30 left')
  await expect(page.getByTestId('play')).toHaveText('Start')
  await page.clock.runFor(5000)
  await expectTime(page, '1:07:30 left') // still paused
})

test('the wheel cannot set 0:00:00', async ({ page }) => {
  await openApp(page)
  await roll(page, 'minutes', 0)
  await expect(page.getByTestId('wheel-set')).toBeDisabled()
  await roll(page, 'seconds', 5)
  await expect(page.getByTestId('wheel-set')).toBeEnabled()
})

test('wheel columns work from the keyboard; repeated presses add up', async ({ page }) => {
  await openApp(page)
  const minutes = page.getByTestId('wheel-minutes')
  await minutes.focus()
  await page.keyboard.press('ArrowUp')
  await page.keyboard.press('ArrowUp')
  await expect.poll(async () => { await page.clock.runFor(200); return minutes.getAttribute('aria-valuenow') }).toBe('17')
  await page.keyboard.press('End')
  await expect.poll(async () => { await page.clock.runFor(200); return minutes.getAttribute('aria-valuenow') }).toBe('59')
})

test('presets read like Apple\'s Recents list: the time, then the words', async ({ page }) => {
  await openApp(page)
  const row = page.getByTestId('preset-75')
  await expect(row.locator('.time')).toHaveText('1:15:00')
  await expect(row.locator('.words')).toHaveText('1 hr, 15 min')
  await expect(page.getByTestId('preset-15').locator('.words')).toHaveText('15 min')
  await expect(page.getByTestId('preset-120').locator('.words')).toHaveText('2 hr')
})

test('"Start right away" starts counting on the tap, is remembered, and the labels follow it', async ({ page }) => {
  await openApp(page)
  await expect(page.getByTestId('start-on-tap')).not.toBeChecked()
  await page.getByTestId('start-on-tap').check()
  await expect(page.getByTestId('wheel-set')).toHaveText('Start')
  await expect(page.getByTestId('preset-15')).toHaveAttribute('aria-label', 'Start a 15 min timer')
  await page.reload()
  await expect(page.getByTestId('start-on-tap')).toBeChecked()
  await page.getByTestId('preset-15').click()
  await expect(page.getByTestId('pause')).toBeAttached() // already running
  await page.clock.runFor(2000)
  await expectTime(page, '14:58 left')
})

test('in a landscape viewport every control of the presets screen can be reached and tapped', async ({ page }) => {
  await openApp(page)
  const v = page.viewportSize()!
  await page.setViewportSize({ width: Math.max(v.width, v.height), height: Math.min(v.width, v.height) })
  for (const id of ['wheel-set', 'start-on-tap', 'preset-180']) {
    await page.getByTestId(id).scrollIntoViewIfNeeded()
    const b = (await page.getByTestId(id).boundingBox())!
    const vh = page.viewportSize()!.height
    expect(b.y >= 0 && b.y + b.height <= vh, `${id} ${JSON.stringify(b)} in ${vh}`).toBe(true)
  }
  await page.getByTestId('wheel-set').click()
  await expectTime(page, '15:00 left')
})

test('the wheel opens on the last length set with it; reset dials it back to 0:00:00', async ({ page }) => {
  await openApp(page)
  await roll(page, 'hours', 1)
  await roll(page, 'minutes', 7)
  await roll(page, 'seconds', 30)
  await page.getByTestId('wheel-set').click()
  await expectTime(page, '1:07:30 left')
  await page.getByTestId('exit').click() // paused: straight back to the presets
  const at = async () => Promise.all(['hours', 'minutes', 'seconds'].map((c) => page.getByTestId(`wheel-${c}`).getAttribute('aria-valuenow')))
  await expect.poll(at).toEqual(['1', '7', '30'])
  await page.reload()
  await expect.poll(at).toEqual(['1', '7', '30'])
  await page.getByTestId('wheel-reset').click()
  await expect.poll(async () => { await page.clock.runFor(200); return at() }).toEqual(['0', '0', '0'])
  await expect(page.getByTestId('wheel-set')).toBeDisabled()
  await expect(page.getByTestId('wheel-reset')).toBeDisabled()
  await page.reload() // resetting alone does not forget the last length set
  await expect.poll(at).toEqual(['1', '7', '30'])
})
