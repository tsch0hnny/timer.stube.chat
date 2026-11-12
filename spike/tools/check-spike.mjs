// Drives the spike in Playwright WebKit (iPhone 13 Pro emulation) and Chromium (Pixel 7):
// load without JS errors, SW takes control, stage view fills the viewport in portrait (CSS-rotated)
// and landscape (auto: no rotation), a stored countdown survives a reload, and an offline reload
// is served from the SW cache. Emulation only: wake lock, safe areas and install need the phones.
// Usage: node spike/tools/check-spike.mjs [url] [outDir]
import { chromium, webkit, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const URL = process.argv[2] ?? 'http://127.0.0.1:8089/'
const OUT = process.argv[3] ?? 'spike-shots'
mkdirSync(OUT, { recursive: true })

const targets = [
  ['webkit-iphone13pro', webkit, devices['iPhone 13 Pro']],
  ['chromium-pixel7', chromium, devices['Pixel 7']],
]
let failed = 0
const check = (name, ok, detail = '') => { console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`); if (!ok) failed++ }

for (const [name, engine, device] of targets) {
  console.log(`\n${name} (${engine.name()} ${device.viewport.width}×${device.viewport.height})`)
  const browser = await engine.launch()
  const ctx = await browser.newContext({ ...device })
  const page = await ctx.newPage()
  // Uncaught exceptions always count. Failed requests count unless they are the deliberate
  // offline probe (/ping.txt); the browser's matching "Failed to load resource" console line is
  // covered by the requestfailed check instead.
  const errors = []
  page.on('pageerror', (e) => errors.push(`exception: ${e.message}`))
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push(`console: ${m.text()}`) })
  page.on('requestfailed', (r) => { if (!new globalThis.URL(r.url()).pathname.endsWith('/ping.txt')) errors.push(`request failed: ${r.url()}`) })

  await page.goto(URL)
  await page.waitForFunction(() => !!navigator.serviceWorker?.controller, null, { timeout: 15000 })
  check('service worker controls the page after first load', true)
  const r1 = await page.evaluate(() => JSON.parse(buildReport()))
  console.log(`  info  wake lock: supported=${r1.wakeLock.supported} results=${JSON.stringify(r1.wakeLock.results)}`)
  console.log(`  info  digits: tabular 0-9 widths ${JSON.stringify(Object.values(r1.digits.tab).slice(0, 10))}`)
  check('tabular digits 0–9 all the same width', new Set(Object.values(r1.digits.tab).slice(0, 10)).size === 1)
  await page.screenshot({ path: `${OUT}/${name}-1-report.png` })

  // Start a 10-minute countdown, then open the stage view (default rotation: clockwise).
  await page.click('button[data-cd="600000"]')
  await page.click('#btnStage')
  await page.waitForTimeout(200)
  const portrait = await page.evaluate(() => vp()['stage rect'])
  check('portrait: rotated stage fills the viewport', portrait.includes('(fills viewport)'), portrait)
  await page.screenshot({ path: `${OUT}/${name}-2-stage-portrait-rotated.png` })

  // Phone physically turned with rotation lock off: viewport becomes landscape, "auto" must not rotate.
  await page.evaluate(() => { state.rot = 'auto'; render() })
  await page.setViewportSize({ width: device.viewport.height, height: device.viewport.width })
  await page.waitForTimeout(200)
  const land = await page.evaluate(() => vp()['stage rect'])
  check('landscape viewport + auto: no rotation, fills viewport', land.includes('rot=none') && land.includes('(fills viewport)'), land)
  await page.screenshot({ path: `${OUT}/${name}-3-stage-landscape-auto.png` })
  await page.setViewportSize(device.viewport)

  // Reload: countdown must come back from localStorage with the same end time.
  const before = await page.evaluate(() => countdown().endAt)
  await page.reload()
  const after = await page.evaluate(() => countdown()?.endAt)
  check('countdown end time survives reload', before === after, new Date(after).toISOString())

  // Offline reload: page must come from the SW cache, and the network probe must fail.
  await ctx.setOffline(true)
  await page.reload()
  await page.waitForFunction(() => /FAILED/.test(state.ping.result), null, { timeout: 10000 })
  const r2 = await page.evaluate(() => JSON.parse(buildReport()))
  check('offline reload renders from the SW cache', r2.sw.controlledAtLoad === true && r2.loadCount >= 3, `controlledAtLoad=${r2.sw.controlledAtLoad} ping=${r2.sw.ping.result}`)
  await page.screenshot({ path: `${OUT}/${name}-4-offline-stage.png` })
  await ctx.setOffline(false)

  check('no exceptions, no failed requests except the offline probe', errors.length === 0, errors.join(' | '))
  await browser.close()
}
console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed')
process.exit(failed ? 1 : 0)
