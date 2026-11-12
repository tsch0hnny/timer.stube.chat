import { expect, test } from '@playwright/test'

test.describe('installable, offline PWA', () => {
  test('links a manifest with the StageTimer name and icons', async ({ page, request }) => {
    await page.goto('/')
    const href = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(href).toBeTruthy()
    const manifest = await (await request.get(href!)).json()
    expect(manifest).toMatchObject({ name: 'StageTimer', short_name: 'StageTimer', display: 'standalone', background_color: '#000000' })
    for (const icon of manifest.icons) expect((await request.get(icon.src)).status()).toBe(200)
    await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png')
    await expect(page.locator('meta[name="viewport"]')).toHaveAttribute('content', /viewport-fit=cover/)
  })

  test('opens offline after the first load, served by the service worker', async ({ page, context }) => {
    await page.goto('/')
    await expect(page.getByTestId('app-shell')).toBeVisible()
    // Prompt mode does not claim the first page; the next load is controlled.
    // (expect.poll, not waitForFunction: the latter treats an async predicate's Promise as truthy.)
    await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.active?.state), { timeout: 15_000 }).toBe('activated')
    await page.reload()
    await page.waitForFunction(() => !!navigator.serviceWorker.controller)

    await context.setOffline(true)
    await page.reload()
    await expect(page.getByTestId('app-shell')).toBeVisible()
    expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
    await context.setOffline(false)
  })

  test('the page background is pure black from the first paint', async ({ page }) => {
    await page.goto('/')
    const bg = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
    expect(bg).toBe('rgb(0, 0, 0)')
  })
})
