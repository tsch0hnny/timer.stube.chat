import { expect, test, type Page } from '@playwright/test'
import { START, T0, expectTime, longPress, mockWakeLock, settle, tapStage } from './helpers'

/** "Tap to show controls": while running, a short tap brings the hidden controls back. */

async function openApp(page: Page, tapControls: boolean) {
  await mockWakeLock(page, 'grant')
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await expect(page.getByTestId('presets')).toBeVisible()
  await page.clock.pauseAt(START)
  if (tapControls) await page.getByTestId('tap-controls').check()
}
/** Opens 15:00, starts it and waits until the controls have faded; returns where each control sat. */
async function runningWithControlsHidden(page: Page) {
  await page.getByTestId('preset-15').click()
  await page.getByTestId('play').click()
  const centre = async (id: string) => {
    const b = (await page.getByTestId(id).boundingBox())!
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
  }
  const spots = { pause: await centre('pause'), plus: await centre('step-plus'), exit: await centre('exit') }
  await page.clock.runFor(5500)
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
  return spots
}

test('off by default: a tap shows the hint, as before', async ({ page }) => {
  await openApp(page, false)
  await expect(page.getByTestId('tap-controls')).not.toBeChecked()
  await runningWithControlsHidden(page)
  await tapStage(page)
  await expect(page.getByTestId('hint')).toHaveText('Hold to show controls')
  await expect(page.getByTestId('controls')).toHaveCount(0)
})

test('on: a tap shows the controls, the next tap hides them; a long press still works; remembered', async ({ page }) => {
  await openApp(page, true)
  await page.reload()
  await expect(page.getByTestId('tap-controls')).toBeChecked()
  await runningWithControlsHidden(page)
  await tapStage(page)
  await expect(page.getByTestId('controls')).toBeVisible()
  await expect(page.getByTestId('hint')).toHaveCount(0)
  await tapStage(page)
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
  await longPress(page)
  await expect(page.getByTestId('controls')).toBeVisible()
  await page.clock.runFor(5500) // and they fade again as usual
  await settle(page)
  await expect(page.getByTestId('controls')).toHaveCount(0)
})

// Real touch input (Chromium's DevTools protocol): after a tap the browser delivers a click where the
// finger was. The controls appear under that finger, so that click must not press the control that
// has just appeared there.
test.describe('with real touch input', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'touch injection is Chromium-only')

  async function touchTap(page: Page, p: { x: number; y: number }) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [p] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(400) // real time for the browser's own click to arrive
  }

  test('a long press where Pause sits only shows the controls (it paused the timer on c18efb0)', async ({ page }) => {
    await openApp(page, false)
    const spots = await runningWithControlsHidden(page)
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [spots.pause] })
    await page.clock.runFor(600) // the page's long-press timer
    await page.waitForTimeout(900) // the browser's own long-press time
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(400)
    await expect(page.getByTestId('controls')).toBeVisible()
    await expect(page.getByTestId('pause')).toBeAttached() // still running
    await touchTap(page, spots.pause) // the next tap works normally
    await expect(page.getByTestId('play')).toBeAttached()
  })

  for (const spot of ['pause', 'plus', 'exit'] as const) {
    test(`a tap where ${spot === 'plus' ? '+1 min' : spot === 'exit' ? '✕' : 'Pause'} sits only shows the controls`, async ({ page }) => {
      await openApp(page, true)
      const spots = await runningWithControlsHidden(page)
      await expectTime(page, '14:55 left') // 5.5 s in
      await touchTap(page, spots[spot])
      await expect(page.getByTestId('controls')).toBeVisible()
      await expect(page.getByTestId('pause')).toBeAttached() // still running
      await expect(page.getByTestId('exit-confirm')).toHaveCount(0)
      await expectTime(page, '14:55 left') // no minute added
      await page.clock.runFor(1000)
      await expectTime(page, '14:54 left')
      // The very next tap works normally.
      await touchTap(page, spots.pause)
      await expect(page.getByTestId('play')).toBeAttached()
    })
  }
})
