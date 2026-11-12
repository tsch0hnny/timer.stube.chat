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
  const sw = (await page.locator('.switch', { has: input }).boundingBox())!
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

/** Drags a preset row sideways by dx (negative = left), as a finger would. */
async function swipe(page: Page, testId: string, dx: number) {
  await page.getByTestId(`preset-${testId}`).scrollIntoViewIfNeeded()
  const b = (await page.getByTestId(`preset-${testId}`).boundingBox())!
  const x = b.x + b.width - 40
  const y = b.y + b.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y, { steps: 10 })
  await page.mouse.up()
}
const offsetOf = (page: Page, testId: string) =>
  page.getByTestId(`preset-${testId}`).evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41)

test('swipe left reveals Delete; deleting survives a reload; Restore brings the defaults back', async ({ page }) => {
  await openApp(page)
  await expect(page.getByTestId('restore-presets')).toHaveCount(0) // nothing missing yet
  await swipe(page, '30', -70)
  await expect.poll(() => offsetOf(page, '30')).toBe(-72) // snapped open, resting on the circle
  await page.getByTestId('delete-30').click()
  await expect(page.getByTestId('preset-30')).toHaveCount(0)
  await expect(page.getByTestId('presets')).toBeVisible() // no timer opened
  await page.reload()
  await expect(page.getByTestId('preset-15')).toBeVisible()
  await expect(page.getByTestId('preset-30')).toHaveCount(0)
  await page.getByTestId('restore-presets').click()
  await expect(page.getByTestId('preset-30')).toBeVisible()
  await expect(page.getByTestId('restore-presets')).toHaveCount(0)
})

test('a full swipe deletes on release; a short one snaps back', async ({ page }) => {
  await openApp(page)
  await swipe(page, '45', -30)
  await expect.poll(() => offsetOf(page, '45')).toBe(0)
  const w = (await page.getByTestId('preset-45').boundingBox())!.width
  await swipe(page, '45', -w * 0.75)
  await expect(page.getByTestId('preset-45')).toHaveCount(0)
  await expect(page.locator('[data-testid^="preset-"]')).toHaveCount(11)
})

test('with a row open, a tap only closes it: on that row, on another row, or anywhere else', async ({ page }) => {
  await openApp(page)
  // The end of the list, so both rows are on screen without scrolling (a scroll closes rows too).
  await page.getByTestId('presets').evaluate((el) => { el.scrollTop = el.scrollHeight })
  await swipe(page, '150', -100)
  await expect.poll(() => offsetOf(page, '150')).toBe(-72)
  await page.getByTestId('preset-150').click({ position: { x: 150, y: 20 } }) // on the shifted row
  await expect.poll(() => offsetOf(page, '150')).toBe(0)
  await expect(page.getByTestId('timer-view')).toHaveCount(0)
  await swipe(page, '150', -100)
  await expect.poll(() => offsetOf(page, '150')).toBe(-72)
  await page.getByTestId('preset-165').click()
  await expect.poll(() => offsetOf(page, '150')).toBe(0)
  await expect(page.getByTestId('timer-view')).toHaveCount(0) // that tap opened nothing
  await swipe(page, '150', -100)
  await expect.poll(() => offsetOf(page, '150')).toBe(-72)
  await page.getByTestId('version').click() // anywhere else
  await expect.poll(() => offsetOf(page, '150')).toBe(0)
  await page.getByTestId('preset-165').click() // now a tap opens the timer again
  await expect(page.getByTestId('timer-view')).toBeVisible()
})

test('a focused preset can be deleted from the keyboard', async ({ page }) => {
  await openApp(page)
  await page.getByTestId('preset-90').focus()
  await page.keyboard.press('Delete')
  await expect(page.getByTestId('preset-90')).toHaveCount(0)
})

test('a length set with the wheel joins the presets, sorted, once, and lights up', async ({ page }) => {
  await openApp(page)
  await roll(page, 'hours', 1)
  await roll(page, 'minutes', 7)
  await roll(page, 'seconds', 30)
  await page.getByTestId('wheel-set').click()
  await expect(page.getByTestId('timer-view')).toBeVisible()
  await page.getByTestId('exit').click()
  const row = page.getByTestId('preset-67.5')
  await expect(row.locator('.time')).toHaveText('1:07:30')
  await expect(row.locator('.words')).toHaveText('1 hr, 7 min, 30 secs')
  await expect(page.locator('li.fresh')).toHaveCount(1)
  const order = await page.locator('[data-testid^="preset-"]').evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(order.indexOf('preset-67.5')).toBe(order.indexOf('preset-60') + 1) // between 1:00:00 and 1:15:00
  await page.getByTestId('wheel-set').click() // the same length again
  await page.getByTestId('exit').click()
  await expect(page.getByTestId('preset-67.5')).toHaveCount(1)
  await roll(page, 'hours', 0)
  await roll(page, 'minutes', 15)
  await roll(page, 'seconds', 0)
  await page.getByTestId('wheel-set').click() // a default length: nothing new
  await page.getByTestId('exit').click()
  await expect(page.locator('[data-testid^="preset-"]')).toHaveCount(13)
})

test('with every preset deleted, the list says how to get them back', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('timer.v1.presets', JSON.stringify({ v: 1, presets: [] })))
  await openApp(page)
  await expect(page.getByTestId('presets-empty')).toBeVisible()
  await page.getByTestId('restore-presets').click()
  await expect(page.locator('[data-testid^="preset-"]')).toHaveCount(12)
})

test('the delete circle grows and brightens with the finger, stretches, and arms past 60%', async ({ page }) => {
  await openApp(page)
  const row = page.getByTestId('preset-30')
  await row.scrollIntoViewIfNeeded()
  const b = (await row.boundingBox())!
  const y = b.y + b.height / 2
  const x = b.x + b.width - 20
  const pill = () => page.getByTestId('delete-30').evaluate((el) => {
    const s = getComputedStyle(el)
    return { scale: new DOMMatrix(s.transform).a, opacity: Number(s.opacity), width: el.getBoundingClientRect().width, armed: el.classList.contains('armed') }
  })
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 30, y, { steps: 5 })
  const small = await pill()
  expect(small.scale).toBeLessThan(0.9)
  expect(small.opacity).toBeLessThan(0.9)
  await page.mouse.move(x - 200, y, { steps: 10 })
  const stretched = await pill()
  expect(stretched.scale).toBe(1)
  expect(stretched.width).toBeGreaterThan(150) // a capsule now, following the finger
  expect(stretched.armed).toBe(false)
  await page.mouse.move(x - b.width * 0.7, y, { steps: 10 })
  expect((await pill()).armed).toBe(true) // the icon jumps left: releasing deletes
  await page.mouse.up()
  await expect(row).toHaveCount(0)
})

test('a swipe never sticks halfway, even when the browser takes the touch away mid-swipe', async ({ page }) => {
  await openApp(page)
  const row = page.getByTestId('preset-30')
  await row.scrollIntoViewIfNeeded()
  const b = (await row.boundingBox())!
  const y = b.y + b.height / 2
  const x = b.x + b.width - 40
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 30, y, { steps: 5 })
  // iOS can cancel a touch's capture during fast, overlapping gestures without a pointerup.
  await row.evaluate((el) => el.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 })))
  await expect.poll(() => offsetOf(page, '30')).toBe(0) // settled closed (30 px is short of half the circle's strip), not stuck at −30
  await expect(row).not.toHaveClass(/dragging/)
  await page.mouse.up()
  await swipe(page, '30', -100) // and it still swipes normally afterwards
  await expect.poll(() => offsetOf(page, '30')).toBe(-72)
})

test('iOS: the touch moving from the text to the row (a bubbling lostpointercapture) does not end the swipe', async ({ page }) => {
  await openApp(page)
  const row = page.getByTestId('preset-30')
  await row.scrollIntoViewIfNeeded()
  const b = (await row.boundingBox())!
  const y = b.y + b.height / 2
  const x = b.x + b.width - 40
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 20, y, { steps: 3 })
  // On iOS a touch is first captured by the element under the finger (here the time text); when the
  // row takes the capture, the text reports lostpointercapture, which bubbles up through the row.
  await row.locator('.time').evaluate((el) => el.dispatchEvent(new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 1 })))
  await page.mouse.move(x - b.width * 0.75, y, { steps: 10 }) // a flick on across the row
  await page.mouse.up()
  await expect(row).toHaveCount(0) // deleted, as a full swipe should
})

test('a swipe whose finger lifts somewhere else still comes to rest', async ({ page }) => {
  await openApp(page)
  const row = page.getByTestId('preset-30')
  await row.scrollIntoViewIfNeeded()
  const b = (await row.boundingBox())!
  const y = b.y + b.height / 2
  const x = b.x + b.width - 40
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x - 30, y, { steps: 5 })
  await row.evaluate((el) => { try { el.releasePointerCapture(1) } catch { /* not captured: fine */ } })
  await page.mouse.move(x - 30, y - 300, { steps: 5 }) // the finger wanders off the row
  await page.mouse.up()
  await expect.poll(() => offsetOf(page, '30')).toBe(0)
  await expect(row).not.toHaveClass(/dragging/)
})

// Real touch input (Chromium's DevTools protocol), not a mouse: the browser captures the touch to
// the element under the finger first and hands it over when the row takes it, as iOS does. This is
// the path the mouse-driven tests missed when b39a186 broke swiping on the iPhone.
test.describe('swipe with real touch input', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch injection is Chromium-only')

  /** A touch swipe; `curve` bends the last third of the path by that many px vertically, as a thumb does. */
  async function touchSwipe(page: Page, testId: string, dx: number, steps: number, curve = 0) {
    const cdp = await page.context().newCDPSession(page)
    const row = page.getByTestId(`preset-${testId}`)
    await row.scrollIntoViewIfNeeded()
    const b = (await row.boundingBox())!
    const x = b.x + b.width - 40 // on the chevron, a child of the row
    const y = b.y + b.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const bend = t > 2 / 3 ? curve * ((t - 2 / 3) * 3) ** 2 : 0
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * t, y: y + bend }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }

  test('a short swipe rests open on the circle', async ({ page }) => {
    await openApp(page)
    await touchSwipe(page, '30', -100, 8)
    await expect.poll(() => offsetOf(page, '30')).toBe(-72)
  })
  test('a quick flick across the row deletes it', async ({ page }) => {
    await openApp(page)
    const w = (await page.getByTestId('preset-45').boundingBox())!.width
    await touchSwipe(page, '45', -w * 0.75, 3) // three big moves: a flick
    await expect(page.getByTestId('preset-45')).toHaveCount(0)
  })
  test('a slow full swipe deletes it', async ({ page }) => {
    await openApp(page)
    const w = (await page.getByTestId('preset-60').boundingBox())!.width
    await touchSwipe(page, '60', -w * 0.75, 20)
    await expect(page.getByTestId('preset-60')).toHaveCount(0)
  })
})

test.describe('swipe with real touch input, curving off the row', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch injection is Chromium-only')
  async function curved(page: Page, testId: string, dx: number, curve: number) {
    const cdp = await page.context().newCDPSession(page)
    const row = page.getByTestId(`preset-${testId}`)
    await row.scrollIntoViewIfNeeded()
    const b = (await row.boundingBox())!
    const x = b.x + b.width - 40
    const y = b.y + b.height / 2
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
    for (let i = 1; i <= 15; i++) {
      const t = i / 15
      const bend = t > 1 / 2 ? curve * ((t - 1 / 2) * 2) ** 2 : 0
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * t, y: y + bend }] })
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  test('a full swipe that curves up off the row still deletes, and nothing scrolls', async ({ page }) => {
    await openApp(page)
    const list = page.getByTestId('presets')
    await page.getByTestId('preset-75').scrollIntoViewIfNeeded()
    const before = await list.evaluate((el) => el.scrollTop)
    const w = (await page.getByTestId('preset-75').boundingBox())!.width
    await curved(page, '75', -w * 0.75, -160)
    await expect(page.getByTestId('preset-75')).toHaveCount(0)
    expect(await list.evaluate((el) => el.scrollTop)).toBe(before)
  })
  test('a short swipe that curves down off the row still rests open', async ({ page }) => {
    await openApp(page)
    await curved(page, '90', -100, 140)
    await expect.poll(() => offsetOf(page, '90')).toBe(-72)
  })
})
