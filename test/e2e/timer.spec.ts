import { expect, test } from '@playwright/test'
import { MIN, START, digits, expectOnScreen, expectTime, longPress, openPreset, settle, tapStage, turnToLandscape } from './helpers'

test.describe('countdown on the real build, driven by a fake clock', () => {
  test('a full 60:00 runs to zero and crosses into overtime in red', async ({ page }) => {
    await openPreset(page, 60)
    await expectTime(page, '60:00 left')
    await page.getByTestId('play').click()
    await page.clock.runFor(1000)
    await expectTime(page, '59:59 left')
    await page.clock.runFor(30 * MIN - 1000)
    await expectTime(page, '30:00 left')
    await page.clock.runFor(30 * MIN - 1000)
    await expectTime(page, '00:01 left')
    await expect(digits(page)).not.toHaveClass(/negative/)
    await page.clock.runFor(1000)
    await expectTime(page, '00:00 over') // shown as −00:00: the minus appears at zero
    await expect(digits(page)).toHaveClass(/negative/)
    await expect(digits(page)).toHaveCSS('color', 'rgb(255, 69, 58)')
    await page.clock.runFor(2 * MIN + 15_000)
    await expectTime(page, '02:15 over')
    expect(await page.getByTestId('cell').first().textContent()).toBe('-') // MINUS_GLYPH: the owner's short bar
  })

  test('reload during overtime comes back in overtime with the right value', async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('play').click()
    await page.clock.runFor(15 * MIN + 5000)
    await expectTime(page, '00:05 over')
    await page.reload()
    await expect(page.getByTestId('timer-view')).toBeVisible()
    await expect(page.getByTestId('presets')).toHaveCount(0)
    await expect(digits(page)).toHaveClass(/negative/)
    await expectTime(page, '00:05 over')
    await page.clock.runFor(60_000)
    await expectTime(page, '01:05 over')
  })

  test('pause for 10 minutes and resume keeps the remaining time', async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('play').click()
    await page.clock.runFor(MIN)
    await expectTime(page, '14:00 left')
    await longPress(page) // controls fade after 5 s while running
    await page.getByTestId('pause').click()
    await page.clock.runFor(10 * MIN)
    await expectTime(page, '14:00 left')
    await page.getByTestId('play').click()
    await page.clock.runFor(1000)
    await expectTime(page, '13:59 left')
  })

  test('opens offline and restores a running timer from storage', async ({ page, context }) => {
    await openPreset(page, 30)
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state), { timeout: 15_000 }).toBe('activated')
    await page.getByTestId('play').click()
    await page.clock.runFor(5 * MIN)
    await expectTime(page, '25:00 left')
    await page.reload() // now controlled by the SW
    await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByTestId('timer-view')).toBeVisible()
    await page.clock.runFor(MIN)
    await expectTime(page, '24:00 left') // exact: the paused fake clock survives reloads
    await context.setOffline(false)
  })

  test('± steps while paused and running, across zero in both directions', async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('step-plus').click()
    await expectTime(page, '16:00 left')
    await page.getByTestId('step-minus').click()
    await page.getByTestId('step-minus').click()
    await expectTime(page, '14:00 left')
    await page.getByTestId('play').click()
    await page.clock.runFor(13 * MIN + 30_000) // 00:30 left
    await longPress(page)
    await page.getByTestId('step-minus').click()
    await expectTime(page, '00:30 over')
    await expect(digits(page)).toHaveClass(/negative/)
    await page.getByTestId('step-plus').click()
    await expectTime(page, '00:30 left')
    await expect(digits(page)).not.toHaveClass(/negative/)
  })

  test('hold − or + to pick the step; both buttons follow and it is remembered', async ({ page }) => {
    await openPreset(page, 45)
    const plus = page.getByTestId('step-plus')
    const b = (await plus.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.clock.runFor(500)
    await expect(page.getByTestId('step-strip')).toBeVisible()
    await expectOnScreen(page, 'step-strip') // also waits for it to finish growing before measuring
    const ten = (await page.getByTestId('step-choice-10').boundingBox())!
    await page.mouse.move(ten.x + ten.width / 2, ten.y + ten.height / 2, { steps: 4 })
    await page.mouse.up()
    await settle(page)
    await expect(page.getByTestId('step-strip')).toHaveCount(0)
    await expect(plus).toHaveText('+10 min')
    await expect(page.getByTestId('step-minus')).toHaveText('−10 min')
    await expectTime(page, '45:00 left') // picking does not step
    await plus.click()
    await expectTime(page, '55:00 left')
    await page.reload()
    await expect(page.getByTestId('step-plus')).toHaveText('+10 min')
  })

  // On the iPhone the strip opened from 15 hung below the button and off the screen (device check
  // of e625305): the + button sits near the bottom edge. Each pick opens the strip from the last step.
  test('the step strip opens fully on screen from every step, rotated and in a landscape viewport', async ({ page }) => {
    await openPreset(page, 45)
    const plus = page.getByTestId('step-plus')
    const pick = async (to: number) => {
      const b = (await plus.boundingBox())!
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
      await page.mouse.down()
      await page.clock.runFor(500)
      await expect(page.getByTestId('step-strip')).toBeVisible()
      await expectOnScreen(page, 'step-strip')
      const c = (await page.getByTestId(`step-choice-${to}`).boundingBox())!
      await page.mouse.move(c.x + c.width / 2, c.y + c.height / 2, { steps: 4 })
      await page.mouse.up()
      await settle(page)
      await expect(plus).toHaveText(`+${to} min`)
    }
    for (const to of [5, 10, 15, 1]) await pick(to)
    await turnToLandscape(page)
    for (const to of [15, 10, 5, 1]) await pick(to)
    await expectTime(page, '45:00 left') // picking never steps the time
  })

  test('holding + and releasing without sliding keeps the step', async ({ page }) => {
    await openPreset(page, 45)
    const plus = page.getByTestId('step-plus')
    const b = (await plus.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
    await page.mouse.down()
    await page.clock.runFor(500)
    await expect(page.getByTestId('step-strip')).toBeVisible()
    await page.mouse.move(b.x + b.width / 2 + 3, b.y + b.height / 2 + 2) // a resting finger wobbles
    await page.mouse.up()
    await settle(page)
    await expect(plus).toHaveText('+1 min')
    await expectTime(page, '45:00 left')
  })

  test('controls: shown while paused, fade 5 s after play, tap shows the hint, long press brings them back', async ({ page }) => {
    await openPreset(page, 15)
    await expect(page.getByTestId('controls')).toBeVisible()
    await page.clock.runFor(10_000)
    await expect(page.getByTestId('controls')).toBeVisible() // paused: stay
    await page.getByTestId('play').click()
    await page.clock.runFor(4000)
    await expect(page.getByTestId('controls')).toBeVisible()
    await page.clock.runFor(1500)
    await settle(page)
    await expect(page.getByTestId('controls')).toHaveCount(0)
    await tapStage(page)
    await expect(page.getByTestId('hint')).toHaveText('Hold to show controls')
    await expect(page.getByTestId('controls')).toHaveCount(0)
    await longPress(page)
    await expect(page.getByTestId('controls')).toBeVisible()
    await tapStage(page) // tap outside the controls hides them
    await settle(page)
    await expect(page.getByTestId('controls')).toHaveCount(0)
  })

  test('✕ while running needs a second tap on End; paused goes straight back', async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('play').click()
    await page.getByTestId('exit').click()
    await expect(page.getByTestId('exit-confirm')).toBeVisible()
    await page.clock.runFor(3100)
    await settle(page)
    await expect(page.getByTestId('exit-confirm')).toHaveCount(0)
    await expect(page.getByTestId('timer-view')).toBeVisible()
    await page.getByTestId('exit').click()
    await page.getByTestId('exit-confirm-end').click()
    await expect(page.getByTestId('presets')).toBeVisible()
    await page.getByTestId('preset-30').click()
    await page.getByTestId('exit').click()
    await expect(page.getByTestId('presets')).toBeVisible()
  })

  test('a refused wake lock is shown on screen; a held one shows nothing', async ({ browser }) => {
    for (const mode of ['deny', 'grant'] as const) {
      const ctx = await browser.newContext()
      const page = await ctx.newPage()
      await openPreset(page, 15, { wakeLock: mode })
      if (mode === 'deny') await expect(page.getByTestId('pill-wakelock')).toHaveText('Tap once to keep the screen on')
      else await expect(page.getByTestId('pill-wakelock')).toHaveCount(0)
      await ctx.close()
    }
  })

  test('the debug overlay opens with 5 taps on the version and shows the stored end time', async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('play').click()
    await longPress(page)
    for (let i = 0; i < 5; i++) await page.getByTestId('version').click()
    await expect(page.getByTestId('debug')).toBeVisible()
    await expect(page.getByTestId('debug-stored')).toContainText(`endAt ${new Date(START.getTime() + 15 * MIN).toISOString()}`)
    await expect(page.getByTestId('debug-wake-lock')).toContainText('held')
    const vp = page.viewportSize()!
    await expect(page.getByTestId('debug-stage')).toContainText(`${vp.width}×${vp.height} at 0,0`) // the stage fills the screen
    await expect(page.getByTestId('debug-units')).toContainText(`vh/dvh/svh/lvh ${vp.height} / ${vp.height} / ${vp.height} / ${vp.height} · --app-h unset (100dvh)`)
    await page.getByTestId('debug-close').click()
    await expect(page.getByTestId('debug')).toHaveCount(0)
  })

  // Only the wiring can be tested here: emulated browsers have no short iOS viewport, so lvh equals
  // the viewport. The 797 → 844 case is covered by test/unit/appHeight.test.ts and the device.
  test('in the iOS home-screen app the views take --app-h; elsewhere 100dvh', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { configurable: true, value: true }))
    await openPreset(page, 15)
    const vp = page.viewportSize()!
    const measure = () => page.evaluate(() => ({
      appH: document.documentElement.style.getPropertyValue('--app-h'),
      stage: Math.round(document.querySelector('[data-testid="timer-view"]')!.getBoundingClientRect().height),
    }))
    expect(await measure()).toEqual({ appH: `${vp.height}px`, stage: vp.height })
    await page.setViewportSize({ width: vp.height, height: vp.width })
    await expect.poll(measure).toEqual({ appH: `${vp.width}px`, stage: vp.width })
  })
})

test.describe('reset (top right, like the ✕)', () => {
  test('greyed out at the full length; resets at once while paused', async ({ page }) => {
    await openPreset(page, 45)
    await expect(page.getByTestId('reset')).toBeDisabled()
    await page.getByTestId('step-plus').click()
    await expectTime(page, '46:00 left')
    await page.getByTestId('reset').click()
    await expectTime(page, '45:00 left')
    await expect(page.getByTestId('reset-confirm')).toHaveCount(0)
  })

  test('while running it asks first; the question lapses after 3 s; Reset goes back to full, paused', async ({ page }) => {
    await openPreset(page, 45)
    await page.getByTestId('play').click()
    await page.clock.runFor(10_000)
    await longPress(page)
    await page.getByTestId('reset').click()
    await expect(page.getByTestId('reset-confirm')).toContainText('Reset timer?')
    await page.clock.runFor(3100)
    await settle(page) // the fade-out runs on the fake clock's frames
    await expect(page.getByTestId('reset-confirm')).toHaveCount(0)
    await expectTime(page, '44:46 left') // still running, untouched
    await page.getByTestId('reset').click()
    await page.getByTestId('reset-confirm-reset').click()
    await expectTime(page, '45:00 left')
    await settle(page) // the Pause → Start cross-fade
    await expect(page.getByTestId('play')).toHaveText('Start')
    await page.clock.runFor(5000)
    await expectTime(page, '45:00 left') // paused
  })

  test('from overtime it comes back to the full length, not negative', async ({ page }) => {
    await openPreset(page, 15)
    await page.getByTestId('play').click()
    await page.clock.runFor(15 * MIN + 20_000)
    await expectTime(page, '00:20 over')
    await longPress(page)
    await page.getByTestId('reset').click()
    await page.getByTestId('reset-confirm-reset').click()
    await expectTime(page, '15:00 left')
    await expect(digits(page)).not.toHaveClass(/negative/)
  })
})
