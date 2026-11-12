import { expect, type Page } from '@playwright/test'

export const T0 = new Date('2026-11-14T20:00:00Z')
export const MIN = 60_000
/** The fake clock is paused here once the app has loaded; after that only runFor() moves time. */
export const START = new Date(T0.getTime() + 5000)

/** Fake wake lock: 'grant' resolves with a sentinel, 'deny' rejects like WebKit without a tap. */
export async function mockWakeLock(page: Page, mode: 'grant' | 'deny') {
  await page.addInitScript((m) => {
    const req = async () => {
      if (m === 'deny') throw new DOMException('Permission was denied', 'NotAllowedError')
      const t = new EventTarget() as EventTarget & { released: boolean; type: string; release(): Promise<void> }
      t.released = false
      t.type = 'screen'
      t.release = async () => { t.released = true; t.dispatchEvent(new Event('release')) }
      return t
    }
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: req } })
  }, mode)
}

/** Installs the fake clock, loads the app and opens a preset (paused, controls showing). */
export async function openPreset(page: Page, minutes: number, opts: { wakeLock?: 'grant' | 'deny' } = {}) {
  await mockWakeLock(page, opts.wakeLock ?? 'grant')
  await page.clock.install({ time: T0 })
  await page.goto('/')
  await expect(page.getByTestId('presets')).toBeVisible()
  // install() lets fake time flow at real speed; on a slow CI runner that fires the 5 s auto-hide
  // mid-test. Paused, time only moves through runFor(), so every timing window is deterministic.
  await page.clock.pauseAt(START)
  await page.getByTestId(`preset-${minutes}`).click()
  await expect(page.getByTestId('timer-view')).toBeVisible()
}

export const digits = (page: Page) => page.getByTestId('digits')
export async function expectTime(page: Page, label: string) {
  await expect(digits(page)).toHaveAttribute('aria-label', label)
}

/** Long press in the middle of the stage, away from any control. */
export async function longPress(page: Page, ms = 600) {
  const box = (await page.getByTestId('digits').boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.clock.runFor(ms)
  await page.mouse.up()
}
export async function tapStage(page: Page) {
  const box = (await page.getByTestId('digits').boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}
/**
 * The element lies wholly inside the viewport once its CSS transitions have finished (they run in
 * real time, not on the fake clock). getBoundingClientRect includes transforms, so this also holds
 * for the CSS-rotated stage.
 */
export async function expectOnScreen(page: Page, testId: string) {
  const sel = `[data-testid="${testId}"]`
  await expect.poll(() => page.evaluate((s) => document.querySelector(s)!
    .getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length, sel)).toBe(0)
  const box = await page.evaluate((s) => {
    const b = document.querySelector(s)!.getBoundingClientRect()
    return { left: Math.round(b.left), top: Math.round(b.top), right: Math.round(b.right), bottom: Math.round(b.bottom), vw: innerWidth, vh: innerHeight }
  }, sel)
  expect(box.left >= 0 && box.top >= 0 && box.right <= box.vw && box.bottom <= box.vh, `${testId} ${JSON.stringify(box)}`).toBe(true)
}

/** Turns the viewport to landscape and waits until the timer view has dropped its CSS rotation. */
export async function turnToLandscape(page: Page) {
  const v = page.viewportSize()!
  await page.setViewportSize({ width: Math.max(v.width, v.height), height: Math.min(v.width, v.height) })
  await expect(page.getByTestId('timer-view')).toHaveAttribute('data-rot', 'none')
}

/** Lets Vue's leave transitions finish (they wait on rAF and a timeout, both on the paused fake clock). */
export async function settle(page: Page, ms = 400) {
  await page.clock.runFor(ms)
}

/**
 * Vertical centre of each cell's ink in the digit line, in em from the line's top, read from a
 * screenshot of the line (decoded in the page, so no image library is needed). Upright text only:
 * use a landscape viewport, where the stage is not rotated.
 */
export async function inkMids(page: Page) {
  const line = page.locator('[data-testid="digits"] .line')
  const png = (await line.screenshot()).toString('base64')
  return page.evaluate(async (png) => {
    const img = new Image()
    img.src = `data:image/png;base64,${png}`
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const d = ctx.getImageData(0, 0, c.width, c.height).data
    const host = document.querySelector('[data-testid="digits"] .line')!
    const hb = host.getBoundingClientRect()
    const scale = img.width / hb.width
    const em = parseFloat(getComputedStyle(host).fontSize)
    return [...host.querySelectorAll('[data-testid="cell"]')].map((cell) => {
      const r = cell.getBoundingClientRect()
      const x0 = Math.round((r.left - hb.left) * scale), x1 = Math.round((r.right - hb.left) * scale)
      let top = -1, bottom = -1
      for (let y = 0; y < c.height; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * c.width + x) * 4
          if (Math.max(d[i]!, d[i + 1]!, d[i + 2]!) > 128) { if (top < 0) top = y; bottom = y; break }
        }
      }
      return { ch: cell.textContent, mid: (top + bottom) / 2 / scale / em }
    })
  }, png)
}
