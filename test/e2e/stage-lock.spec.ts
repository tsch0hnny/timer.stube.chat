import { expect, test, type Page } from '@playwright/test'
import { MIN, digits, expectTime, longPress, openPreset, settle, tapStage } from './helpers'

/**
 * The stage's touch model (owner, 13 Nov): a tap shows the controls and the next one hides them; the
 * padlock among them locks the stage, after which a tap only says "Hold to unlock" and a long press
 * anywhere unlocks it. It stays unlocked until the padlock is tapped again.
 */

/** Opens 15:00, starts it and waits until the controls have faded; returns where each control sat. */
async function runningWithControlsHidden(page: Page) {
  await openPreset(page, 15)
  await page.getByTestId('play').click()
  const centre = async (id: string) => {
    const b = (await page.getByTestId(id).boundingBox())!
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }
  const spots = { pause: await centre('pause'), exit: await centre('exit'), lock: await centre('lock') }
  await page.clock.runFor(5500)
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
  return spots
}
async function lock(page: Page) {
  await page.getByTestId('lock').click()
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
  await expect(page.getByTestId('hint')).toHaveText('Hold to unlock')
}

test('a tap shows the controls and the next tap hides them; a long press works as before', async ({ page }) => {
  await runningWithControlsHidden(page)
  await tapStage(page)
  await expect(page.getByTestId('controls')).toBeVisible()
  await expect(page.getByTestId('hint')).toHaveCount(0)
  await tapStage(page)
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
  await longPress(page)
  await expect(page.getByTestId('controls')).toBeVisible()
  await page.clock.runFor(5500) // and they fade as usual
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
})

test('locked, a tap only says "Hold to unlock" and nothing can change the timer; a long press anywhere unlocks, for good', async ({ page }) => {
  await runningWithControlsHidden(page)
  await tapStage(page)
  await lock(page)
  await page.clock.runFor(2000)
  await settle(page)
  await expect(page.getByTestId('hint')).toHaveCount(0)
  await tapStage(page)
  await expect(page.getByTestId('hint')).toHaveText('Hold to unlock')
  await expect(page.getByTestId('controls')).toHaveCount(0)
  for (const key of [' ', 'ArrowUp', 'Escape']) await page.keyboard.press(key) // a keyboard cannot get past it either
  await expectTime(page, '14:52 left')
  await page.clock.runFor(1000)
  await expectTime(page, '14:51 left') // still running
  await longPress(page)
  await expect(page.getByTestId('controls')).toBeVisible()
  await expect(page.getByTestId('pause')).toBeAttached()
  await page.clock.runFor(5500)
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
  await tapStage(page) // it did not lock itself again
  await expect(page.getByTestId('controls')).toBeVisible()
})

test('the lock survives a reload and ends with the timer: the next timer opens unlocked', async ({ page }) => {
  await runningWithControlsHidden(page)
  await tapStage(page)
  await lock(page)
  await page.reload()
  await expect(page.getByTestId('timer-view')).toBeVisible()
  await expect(page.getByTestId('controls')).toHaveCount(0)
  await tapStage(page)
  await expect(page.getByTestId('hint')).toHaveText('Hold to unlock')
  await longPress(page)
  await page.getByTestId('lock').click() // locked again, then end the timer the long way round
  await settle(page)
  await longPress(page)
  await page.getByTestId('exit').click()
  await page.getByTestId('exit-confirm-end').click()
  await page.getByTestId('preset-30').click()
  await expect(page.getByTestId('controls')).toBeVisible() // paused, unlocked
  await page.getByTestId('play').click()
  await page.clock.runFor(5500)
  await settle(page)
  await tapStage(page)
  await expect(page.getByTestId('controls')).toBeVisible()
})

test('locked while paused: the controls go; a long press brings them back with Start', async ({ page }) => {
  await openPreset(page, 15)
  await lock(page)
  await tapStage(page)
  await expect(page.getByTestId('hint')).toHaveText('Hold to unlock')
  await longPress(page)
  await expect(page.getByTestId('play')).toBeVisible()
  await expectTime(page, '15:00 left')
})

// Real touch input (Chromium's DevTools protocol): when the finger lifts the browser delivers a click
// where it was, and the controls that touch showed are under it. That click must not press them.
test.describe('with real touch input', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch injection is Chromium-only')

  async function touch(page: Page, p: { x: number; y: number }, holdMs = 0) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] })
    if (holdMs) {
      await page.clock.runFor(holdMs) // the page's long-press timer
      await page.waitForTimeout(holdMs + 300) // the browser's own sense of a long press
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(400) // real time for the browser's own click to arrive
  }

  for (const spot of ['pause', 'exit', 'lock'] as const) {
    test(`a tap where the ${spot === 'exit' ? '✕' : spot === 'lock' ? 'padlock' : 'Pause button'} sits only shows the controls`, async ({ page }) => {
      const spots = await runningWithControlsHidden(page)
      await touch(page, spots[spot])
      await expect(page.getByTestId('controls')).toBeVisible()
      await expect(page.getByTestId('pause')).toBeAttached() // still running
      await expect(page.getByTestId('exit-confirm')).toHaveCount(0)
      await expect(page.getByTestId('lock')).toBeVisible() // not locked
      await expectTime(page, '14:55 left')
      await touch(page, spots.pause) // the very next tap works normally
      await expect(page.getByTestId('play')).toBeAttached()
    })
  }

  test('locked, a long press where Pause sits unlocks and only shows the controls (it paused the timer on c18efb0)', async ({ page }) => {
    const spots = await runningWithControlsHidden(page)
    await touch(page, spots.lock) // shows the controls
    await touch(page, spots.lock) // the padlock itself
    await settle(page) // the fade-out runs on the paused fake clock
    await expect(page.getByTestId('controls')).toHaveCount(0)
    await touch(page, spots.pause) // locked: only the hint
    await expect(page.getByTestId('hint')).toHaveText('Hold to unlock')
    await expect(page.getByTestId('controls')).toHaveCount(0)
    await touch(page, spots.pause, 600)
    await expect(page.getByTestId('controls')).toBeVisible()
    await expect(page.getByTestId('pause')).toBeAttached() // still running
  })

  test('unlocked, a long press where Pause sits only shows the controls', async ({ page }) => {
    const spots = await runningWithControlsHidden(page)
    await touch(page, spots.pause, 600)
    await expect(page.getByTestId('controls')).toBeVisible()
    await expect(page.getByTestId('pause')).toBeAttached()
    await expect(digits(page)).toBeVisible()
    await page.clock.runFor(MIN)
    await expectTime(page, '13:54 left')
  })
})
