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

test('wheel columns scroll vertically only: a sideways swipe or wheel does not move them', async ({ page, browserName }) => {
  await openApp(page)
  for (const c of ['hours', 'minutes', 'seconds']) {
    const col = page.getByTestId(`wheel-${c}`)
    const o = await col.evaluate((el) => ({ ox: getComputedStyle(el).overflowX, ta: getComputedStyle(el).touchAction }))
    expect(o).toEqual({ ox: 'hidden', ta: 'pan-y' }) // touch: vertical pans only
    if (browserName === 'webkit') continue // Playwright's mobile WebKit has no mouse wheel
    const b = (await col.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.wheel(120, 0)
    await page.waitForTimeout(100)
    expect(await col.evaluate((el) => el.scrollLeft), c).toBe(0)
  }
})

test('"Start right away": the whole switch is the tap target, and a tap on the words works too', async ({ page }) => {
  await openApp(page)
  const input = page.getByTestId('start-on-tap')
  const sw = (await page.locator('.switch').boundingBox())!
  const box = (await input.boundingBox())!
  expect([Math.round(box.width), Math.round(box.height)]).toEqual([Math.round(sw.width), Math.round(sw.height)])
  await page.mouse.click(sw.x + sw.width - 6, sw.y + sw.height / 2) // the right end of the track
  await expect(input).toBeChecked()
  await page.getByText('Start right away').click()
  await expect(input).not.toBeChecked()
})

test('toggling "Start right away" swaps chevrons and play buttons in the same spot', async ({ page }) => {
  await openApp(page)
  const row = page.getByTestId('preset-30')
  const centre = async (sel: string) => {
    await expect.poll(() => row.evaluate((el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length)).toBe(0)
    const b = (await row.locator(sel).boundingBox())!
    return [Math.round(b.x + b.width / 2), Math.round(b.y + b.height / 2)]
  }
  const chevron = await centre('.chevron')
  await page.getByTestId('start-on-tap').check()
  expect(await centre('.go')).toEqual(chevron)
})

test('no double-tap zoom and no text selection, except in the debug sheet', async ({ page }) => {
  await openApp(page)
  for (const sel of ['body', '[data-testid="presets"]']) {
    expect(await page.locator(sel).evaluate((el) => getComputedStyle(el).touchAction), sel).toBe('manipulation')
  }
  const selected = () => page.evaluate(() => getSelection()?.toString() ?? '')
  for (const sel of ['.heading', '.cell span', '[data-testid="preset-75"] .words']) {
    await page.locator(sel).first().dblclick()
    expect(await selected(), sel).toBe('')
  }
  for (let i = 0; i < 5; i++) await page.getByTestId('version').click()
  await page.getByTestId('debug-version').dblclick({ position: { x: 12, y: 8 } }) // on the text, not the empty end of the row
  expect(await selected()).not.toBe('') // the report stays selectable
})
