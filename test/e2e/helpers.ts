import { expect, type Page } from '@playwright/test'

export const T0 = new Date('2026-11-14T20:00:00Z')
export const MIN = 60_000

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
