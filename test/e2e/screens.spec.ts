import { writeFileSync } from 'node:fs'
import { test } from '@playwright/test'
import { MIN, longPress, openPreset } from './helpers'

// Visual record for review (attached to the HTML report and kept as CI artifacts): every key state,
// portrait (CSS-rotated landscape) and a physically landscape viewport, per engine.
test('screens: presets, paused, running, overtime, picker, wake-lock pill', async ({ page }, info) => {
  const shot = async (name: string) => {
    await page.clock.runFor(50) // flush Vue's rAF-driven transition classes (fake clock is paused)
    await page.waitForTimeout(350) // CSS transitions themselves run on real time
    const path = info.outputPath(`${name}.png`)
    await page.screenshot({ path })
    await info.attach(name, { path, contentType: 'image/png' })
    // Rendered DOM with its CSS inlined, so `impeccable detect` can check states a URL scan never reaches.
    const html = await page.evaluate(() => {
      const css = [...document.styleSheets].map((sheet) => { try { return [...sheet.cssRules].map((r) => r.cssText).join('\n') } catch { return '' } }).join('\n')
      const clone = document.documentElement.cloneNode(true) as HTMLElement
      clone.querySelectorAll('script, link[rel="stylesheet"], link[rel="modulepreload"], link[rel="prefetch"]').forEach((n) => n.remove())
      const style = document.createElement('style')
      style.textContent = css
      clone.querySelector('head')!.appendChild(style)
      return `<!doctype html>\n${clone.outerHTML}`
    })
    writeFileSync(info.outputPath(`${name}.html`), html)
  }
  await openPreset(page, 60, { wakeLock: 'deny' })
  await shot('2-paused-wakelock-refused')
  await page.getByTestId('exit').click()
  await shot('1-presets')
  await page.getByTestId('preset-90').click()
  await page.getByTestId('play').click()
  await page.clock.runFor(6000)
  await shot('3-running-hours-format')
  await longPress(page)
  await shot('4-running-controls')
  const plus = (await page.getByTestId('step-plus').boundingBox())!
  await page.mouse.move(plus.x + plus.width / 2, plus.y + plus.height / 2)
  await page.mouse.down()
  await page.clock.runFor(500)
  await shot('5-step-picker')
  await page.mouse.up()
  await page.clock.runFor(90 * MIN + 2 * MIN)
  await shot('6-overtime')
  const vp = page.viewportSize()!
  await page.setViewportSize({ width: vp.height, height: vp.width })
  await shot('7-overtime-landscape-viewport')
})
